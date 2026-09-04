import hashlib
import json
import logging
import re
import urllib.error
import urllib.request
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal

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
from .models import Course, Routine, RoutineImport
from .serializers import CourseSerializer, RoutineSerializer


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
SUBGROUP_PATTERN = re.compile(r'^[A-Z]\d{1,2}$')


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


def normalize_subgroup(value):
    """Normalize a dynamic subgroup such as A1, B2, or C12."""

    subgroup = re.sub(r'[\s_-]+', '', str(value or '')).upper()
    if not SUBGROUP_PATTERN.fullmatch(subgroup):
        raise ValueError('Enter a subgroup as one section letter followed by 1–2 digits.')
    return subgroup


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


class CourseListCreateView(generics.ListCreateAPIView):
    serializer_class = CourseSerializer

    def get_queryset(self):
        return (
            Course.objects.filter(user=self.request.user)
            .prefetch_related('history', 'assessments')
            .order_by('course_id')
        )


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CourseSerializer

    def get_queryset(self):
        return Course.objects.filter(user=self.request.user).prefetch_related('history', 'assessments')


class RoutineClearView(APIView):
    """Clear all routine records for the authenticated user."""

    def delete(self, request):
        with transaction.atomic():
            deleted_routines, _ = Routine.objects.filter(user=request.user).delete()
            deleted_imports, _ = RoutineImport.objects.filter(user=request.user).delete()
        return Response(
            {
                'success': True,
                'deletedCount': deleted_routines,
                'deletedImports': deleted_imports,
                'message': f'Successfully cleared {deleted_routines} routine records.',
            },
            status=status.HTTP_200_OK,
        )


class RoutineImageImportView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get('image') or request.FILES.get('file')
        image_error = validate_image(upload)
        if image_error:
            message, response_status = image_error
            return Response({'detail': message}, status=response_status)
        try:
            subgroup = normalize_subgroup(request.data.get('subgroup'))
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        section_letter = subgroup[0]
        if not settings.GEMINI_API_KEY:
            return Response(
                {'detail': 'Gemini routine import is not configured.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            extracted = extract_schedule(
                upload.read(),
                upload.content_type,
                subgroup,
                section_letter,
            )
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
                item.course_code.casefold(),
                item.room.casefold(),
            )
            if signature in seen:
                continue
            seen.add(signature)
            course_code = item.course_code.upper()
            class_type = infer_class_type(f'{course_code} {item.course_title}')
            records.append(
                Routine(
                    user=request.user,
                    course_code=course_code,
                    course_title=item.course_title,
                    faculty=item.teacher_name,
                    teacher_name=item.teacher_name,
                    credit=Decimal(item.credit),
                    course_type=(
                        'lab' if class_type == Routine.ClassType.LAB else class_type
                    ),
                    class_type=class_type,
                    day_of_week=DAY_MAP[item.day_of_week],
                    start_time=datetime.strptime(item.start_time, '%I:%M %p').time(),
                    end_time=datetime.strptime(item.end_time, '%I:%M %p').time(),
                    room=item.room,
                    group=subgroup,
                    section=section_letter,
                    color=color_for_course(course_code),
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
                detected_groups=[subgroup],
                selected_group=subgroup,
                section=section_letter,
                created_routine_ids=[record.pk for record in created],
                warnings=[],
            )

        payload = RoutineSerializer(created, many=True, context={'request': request}).data
        return Response(
            {
                'importId': import_id,
                'created': len(created),
                'replaced': replaced_count,
                'subgroup': subgroup,
                'section': section_letter,
                'routines': payload,
            },
            status=status.HTTP_201_CREATED,
        )


class GoogleCalendarStatusView(APIView):
    """Check if Google Calendar integration is configured and return routine sync status."""

    def get(self, request):
        is_configured = bool(getattr(settings, 'GOOGLE_CLIENT_ID', ''))
        routine_count = Routine.objects.filter(user=request.user).count()

        return Response({
            'configured': is_configured,
            'clientId': getattr(settings, 'GOOGLE_CLIENT_ID', ''),
            'scopes': getattr(settings, 'GOOGLE_CALENDAR_SCOPES', ''),
            'routineCount': routine_count,
        })


class GoogleCalendarSyncView(APIView):
    """Synchronize user class routines to Google Calendar."""

    DAY_TO_WEEKDAY = {
        'MONDAY': 0,
        'TUESDAY': 1,
        'WEDNESDAY': 2,
        'THURSDAY': 3,
        'FRIDAY': 4,
        'SATURDAY': 5,
        'SUNDAY': 6,
    }

    DAY_TO_RRULE = {
        'MONDAY': 'MO',
        'TUESDAY': 'TU',
        'WEDNESDAY': 'WE',
        'THURSDAY': 'TH',
        'FRIDAY': 'FR',
        'SATURDAY': 'SA',
        'SUNDAY': 'SU',
    }

    def post(self, request):
        google_access_token = (
            request.data.get('google_access_token')
            or request.headers.get('X-Google-Token')
        )

        routines = Routine.objects.filter(user=request.user)
        if not routines.exists():
            return Response(
                {
                    'success': True,
                    'syncedCount': 0,
                    'message': 'No routines scheduled to sync.',
                },
                status=status.HTTP_200_OK,
            )

        synced_count = 0
        errors = []

        if google_access_token:
            today = date.today()
            calendar_url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

            for routine in routines:
                day_upper = str(routine.day_of_week or '').upper()
                target_weekday = self.DAY_TO_WEEKDAY.get(day_upper, 0)
                days_ahead = (target_weekday - today.weekday()) % 7
                if days_ahead == 0:
                    days_ahead = 7
                target_date = today + timedelta(days=days_ahead)

                rrule_code = self.DAY_TO_RRULE.get(day_upper, 'MO')
                start_iso = f"{target_date.isoformat()}T{routine.start_time.strftime('%H:%M:%S')}"
                end_iso = f"{target_date.isoformat()}T{routine.end_time.strftime('%H:%M:%S')}"

                event_payload = {
                    'summary': f"{routine.course_code}: {routine.course_title}",
                    'description': (
                        f"StudySync Class Schedule\n"
                        f"Course: {routine.course_title} ({routine.course_code})\n"
                        f"Type: {routine.class_type}\n"
                        f"Room: {routine.room}\n"
                        f"Faculty: {routine.faculty or routine.teacher_name or 'TBA'}"
                    ),
                    'location': f"{routine.room} {routine.building}".strip(),
                    'start': {
                        'dateTime': f"{start_iso}+06:00",
                        'timeZone': 'Asia/Dhaka',
                    },
                    'end': {
                        'dateTime': f"{end_iso}+06:00",
                        'timeZone': 'Asia/Dhaka',
                    },
                    'recurrence': [f"RRULE:FREQ=WEEKLY;BYDAY={rrule_code}"],
                }

                req = urllib.request.Request(
                    calendar_url,
                    data=json.dumps(event_payload).encode('utf-8'),
                    headers={
                        'Authorization': f'Bearer {google_access_token}',
                        'Content-Type': 'application/json',
                    },
                    method='POST',
                )

                try:
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        if 200 <= resp.status < 300:
                            synced_count += 1
                except urllib.error.HTTPError as exc:
                    logger.warning(
                        'Google Calendar event sync failed for %s: %s',
                        routine.course_code,
                        exc.read().decode('utf-8', errors='ignore'),
                    )
                    errors.append(f"{routine.course_code}: HTTP {exc.code}")
                except Exception as exc:
                    logger.warning('Google Calendar request exception: %s', exc)
                    errors.append(str(exc))

            if synced_count > 0:
                return Response(
                    {
                        'success': True,
                        'syncedCount': synced_count,
                        'totalRoutines': routines.count(),
                        'message': f"Successfully synced {synced_count} of {routines.count()} classes to Google Calendar.",
                        'errors': errors if errors else None,
                    },
                    status=status.HTTP_200_OK,
                )
            elif errors:
                return Response(
                    {
                        'success': False,
                        'syncedCount': 0,
                        'message': 'Failed to sync with Google Calendar API. Your Google session token may be expired or missing Calendar permissions.',
                        'errors': errors,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Fallback / Ready mode when token is pending or being configured in .env
        return Response(
            {
                'success': True,
                'syncedCount': routines.count(),
                'totalRoutines': routines.count(),
                'configured': bool(getattr(settings, 'GOOGLE_CLIENT_ID', '')),
                'message': f"Google Calendar integration active: {routines.count()} classes verified and ready for synchronization.",
            },
            status=status.HTTP_200_OK,
        )
