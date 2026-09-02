import hashlib
import logging
import re
import uuid
from datetime import time

from django.conf import settings
from django.db import transaction
from django.db.models import Case, IntegerField, Value, When
from google.genai import errors as genai_errors
from pydantic import ValidationError as PydanticValidationError
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .gemini_routine import extract_schedule
from .models import Routine, RoutineImport
from .serializers import RoutineSerializer


logger = logging.getLogger(__name__)

SUPPORTED_IMAGE_TYPES = {
    'image/jpeg': b'\xff\xd8\xff',
    'image/png': b'\x89PNG\r\n\x1a\n',
    'image/webp': b'RIFF',
}
DAY_MAP = {
    'SUNDAY': Routine.DayOfWeek.SUNDAY,
    'MONDAY': Routine.DayOfWeek.MONDAY,
    'TUESDAY': Routine.DayOfWeek.TUESDAY,
    'WEDNESDAY': Routine.DayOfWeek.WEDNESDAY,
    'THURSDAY': Routine.DayOfWeek.THURSDAY,
}
COURSE_CODE_PATTERN = re.compile(r'\b[A-Z]{2,6}\s*[-–]?\s*\d{2,4}[A-Z]?\b')
ROUTINE_COLORS = (
    '#4F46E5',
    '#06B6D4',
    '#10B981',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#F97316',
)


def weekday_ordering():
    return Case(
        *[
            When(day_of_week=day, then=Value(index))
            for index, day in enumerate(DAY_MAP.values())
        ],
        default=Value(99),
        output_field=IntegerField(),
    )


def infer_course_code(course_name):
    match = COURSE_CODE_PATTERN.search(course_name.upper())
    if match:
        return re.sub(r'\s+', ' ', match.group(0).replace('–', '-')).strip()[:32]
    words = re.sub(r'[^A-Za-z0-9 -]', '', course_name).split()
    return ' '.join(words[:3])[:32] or 'Imported class'


def infer_class_type(course_name):
    normalized = course_name.lower()
    if 'sessional' in normalized:
        return Routine.ClassType.SESSIONAL
    if 'lab' in normalized or 'laboratory' in normalized:
        return Routine.ClassType.LAB
    if 'tutorial' in normalized:
        return Routine.ClassType.TUTORIAL
    return Routine.ClassType.THEORY


def color_for_course(course_name):
    digest = hashlib.sha256(course_name.lower().encode('utf-8')).digest()
    return ROUTINE_COLORS[digest[0] % len(ROUTINE_COLORS)]


def validate_image(upload):
    if upload is None:
        return 'Select an image to import.', status.HTTP_400_BAD_REQUEST
    if upload.size <= 0:
        return 'The uploaded image is empty.', status.HTTP_400_BAD_REQUEST
    if upload.size > settings.ROUTINE_IMAGE_MAX_BYTES:
        return 'The image must be 10 MB or smaller.', status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
    if upload.content_type not in SUPPORTED_IMAGE_TYPES:
        return 'Use a PNG, JPG/JPEG, or WEBP image.', status.HTTP_415_UNSUPPORTED_MEDIA_TYPE

    header = upload.read(12)
    upload.seek(0)
    expected = SUPPORTED_IMAGE_TYPES[upload.content_type]
    valid = header.startswith(expected)
    if upload.content_type == 'image/webp':
        valid = valid and header[8:12] == b'WEBP'
    if not valid:
        return 'The file content does not match its image type.', status.HTTP_400_BAD_REQUEST
    return None


class RoutineListCreateView(generics.ListCreateAPIView):
    serializer_class = RoutineSerializer

    def get_queryset(self):
        return (
            Routine.objects.filter(user=self.request.user)
            .annotate(_weekday_order=weekday_ordering())
            .order_by('_weekday_order', 'start_time', 'course_code')
        )


class RoutineDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RoutineSerializer

    def get_queryset(self):
        return Routine.objects.filter(user=self.request.user)


class RoutineImageImportView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get('image') or request.FILES.get('file')
        image_error = validate_image(upload)
        if image_error:
            message, response_status = image_error
            return Response({'detail': message}, status=response_status)
        if not settings.GEMINI_API_KEY:
            return Response(
                {'detail': 'Gemini routine import is not configured.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            extracted = extract_schedule(upload.read(), upload.content_type)
        except PydanticValidationError:
            logger.warning('Gemini routine response failed schema validation.', exc_info=True)
            return Response(
                {'detail': 'Gemini returned an invalid class schedule. Try a clearer image.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except genai_errors.APIError as exc:
            logger.warning('Gemini routine extraction failed: %s', exc)
            response_status = (
                status.HTTP_429_TOO_MANY_REQUESTS
                if getattr(exc, 'code', None) == 429
                else status.HTTP_502_BAD_GATEWAY
            )
            return Response(
                {'detail': 'Gemini could not analyze the image. Please try again.'},
                status=response_status,
            )
        except (RuntimeError, ValueError):
            logger.warning('Routine extraction failed.', exc_info=True)
            return Response(
                {'detail': 'No valid Sunday–Thursday classes were found.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        except Exception:
            logger.exception('Unexpected Gemini routine import failure.')
            return Response(
                {'detail': 'Routine analysis is temporarily unavailable.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        import_id = f'gemini-{uuid.uuid4().hex}'
        seen = set()
        records = []
        for item in extracted:
            signature = (
                item.day_of_week,
                item.start_time,
                item.end_time,
                item.course_name.casefold(),
                item.room.casefold(),
            )
            if signature in seen:
                continue
            seen.add(signature)
            course_code = infer_course_code(item.course_name)
            class_type = infer_class_type(item.course_name)
            records.append(
                Routine(
                    user=request.user,
                    course_code=course_code,
                    course_title=item.course_name,
                    course_type=(
                        'lab' if class_type == Routine.ClassType.LAB else class_type
                    ),
                    class_type=class_type,
                    day_of_week=DAY_MAP[item.day_of_week],
                    start_time=time.fromisoformat(item.start_time),
                    end_time=time.fromisoformat(item.end_time),
                    room=item.room,
                    color=color_for_course(item.course_name),
                    source=Routine.Source.OCR_IMPORT,
                    import_id=import_id,
                )
            )

        if not records:
            return Response(
                {'detail': 'No valid classes were found in the image.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        replace_existing = str(
            request.data.get('replaceExistingImports', 'true')
        ).lower() not in ('false', '0', 'no')
        with transaction.atomic():
            replaced_count = 0
            if replace_existing:
                replaced_count, _details = Routine.objects.filter(
                    user=request.user,
                    source=Routine.Source.OCR_IMPORT,
                ).delete()
            created = Routine.objects.bulk_create(records)
            RoutineImport.objects.create(
                user=request.user,
                import_id=import_id,
                source_file_name=upload.name[:255],
                source_file_type=upload.content_type,
                source_file_page_count=1,
                created_routine_ids=[record.pk for record in created],
                warnings=[],
            )

        payload = RoutineSerializer(created, many=True, context={'request': request}).data
        return Response(
            {
                'importId': import_id,
                'created': len(created),
                'replaced': replaced_count,
                'routines': payload,
            },
            status=status.HTTP_201_CREATED,
        )
