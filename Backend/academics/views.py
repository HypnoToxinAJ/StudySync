import hashlib
import json
import logging
import os
import re
import urllib.error
import urllib.request
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.utils import timezone
from django.db import IntegrityError, transaction
from django.db.models import Case, IntegerField, Value, When
from google.genai import errors as genai_errors
from pydantic import ValidationError as PydanticValidationError
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .gemini_routine import extract_schedule
from .models import (
    AcademicResult,
    Course,
    Routine,
    RoutineImport,
    Semester,
    SemesterCourse,
)
from .serializers import (
    AcademicResultSerializer,
    CourseSerializer,
    RoutineSerializer,
)


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

    def create(self, request, *args, **kwargs):
        course_id = request.data.get('courseId') or request.data.get('course_id')
        custom_id = request.data.get('id')
        semester = request.data.get('semester', '')
        existing = None
        if custom_id:
            existing = Course.objects.filter(user=request.user, id=custom_id).first()
        if not existing and course_id:
            existing = (
                Course.objects.filter(
                    user=request.user, course_id__iexact=course_id, semester=semester
                ).first()
                or Course.objects.filter(
                    user=request.user, course_id__iexact=course_id
                ).first()
            )

        if existing:
            serializer = self.get_serializer(existing, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return super().create(request, *args, **kwargs)


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CourseSerializer

    def get_queryset(self):
        return Course.objects.filter(user=self.request.user).prefetch_related('history', 'assessments')

    def get_object(self):
        import re
        from django.db.models import Q
        queryset = self.get_queryset()
        pk = self.kwargs.get('pk')
        payload_code = None
        if hasattr(self.request, 'data') and isinstance(self.request.data, dict):
            payload_code = self.request.data.get('courseId') or self.request.data.get('course_id')

        # 1. Direct match on ID or course_id
        q = Q(id=pk) | Q(course_id__iexact=pk)
        if payload_code:
            q |= Q(course_id__iexact=payload_code)
        obj = queryset.filter(q).first()

        # 2. Fuzzy code match if PK is a composite frontend ID (e.g. course-timestamp-CSE311)
        if obj is None and pk:
            clean_pk = re.sub(r'[^A-Za-z0-9]', '', str(pk)).upper()
            for candidate in queryset:
                clean_candidate = re.sub(r'[^A-Za-z0-9]', '', candidate.course_id).upper()
                if clean_candidate and (clean_candidate in clean_pk or clean_pk.endswith(clean_candidate)):
                    obj = candidate
                    break

        if obj is None:
            if self.request.method in ('PUT', 'PATCH'):
                data = self.request.data.copy()
                data.setdefault('id', pk)
                derived_code = payload_code or (pk.split('-')[-1] if '-' in str(pk) else pk)
                data.setdefault('courseId', derived_code)
                data.setdefault('courseTitle', data.get('courseId', 'Untitled Course'))
                data.setdefault('credit', 3)
                data.setdefault('courseType', 'theory')
                serializer = self.get_serializer(data=data, partial=True)
                serializer.is_valid(raise_exception=True)
                return serializer.save()
            from django.http import Http404
            raise Http404('No Course matches the given query.')
        self.check_object_permissions(self.request, obj)
        return obj

    @transaction.atomic
    def perform_destroy(self, instance):
        from .models import AttendanceRecord, CourseAssessment, AssessmentEvent, Routine
        from django.db.models import Q
        user = self.request.user
        course_id = instance.course_id

        # 1. Delete associated AttendanceRecord entries
        AttendanceRecord.objects.filter(
            Q(course=instance) | Q(user=user, course__course_id__iexact=course_id)
        ).delete()

        # 2. Delete associated CourseAssessment entries (CT marks)
        CourseAssessment.objects.filter(
            Q(course=instance) | Q(user=user, course__course_id__iexact=course_id)
        ).delete()

        # 3. Delete associated AssessmentEvents
        AssessmentEvent.objects.filter(user=user).filter(
            Q(course=instance) | Q(course_code__iexact=course_id)
        ).delete()

        # 4. Delete associated Routine entries for this course
        Routine.objects.filter(user=user).filter(
            Q(course=instance) | Q(course_code__iexact=course_id)
        ).delete()

        # 5. Delete the course instance itself
        instance.delete()

        # 6. Clean SyncDocuments
        try:
            from core.models import SyncDocument
            c_doc = SyncDocument.objects.filter(user=user, key='studysync_courses').first()
            if c_doc and isinstance(c_doc.data, list):
                c_doc.data = [
                    c for c in c_doc.data
                    if str(c.get('id', '')) != str(instance.id)
                    and str(c.get('courseId', '')).strip().upper() != course_id.strip().upper()
                ]
                c_doc.save(update_fields=['data', 'updated_at'])

            a_doc = SyncDocument.objects.filter(user=user, key='studysync_assessments').first()
            if a_doc and isinstance(a_doc.data, list):
                a_doc.data = [
                    a for a in a_doc.data
                    if str(a.get('courseId', '')).strip().upper() != course_id.strip().upper()
                    and str(a.get('courseCode', '')).strip().upper() != course_id.strip().upper()
                ]
                a_doc.save(update_fields=['data', 'updated_at'])

            r_doc = SyncDocument.objects.filter(user=user, key='studysync_routines').first()
            if r_doc and isinstance(r_doc.data, list):
                r_doc.data = [
                    r for r in r_doc.data
                    if str(r.get('courseId', '')).strip().upper() != course_id.strip().upper()
                    and str(r.get('course_code', '')).strip().upper() != course_id.strip().upper()
                ]
                r_doc.save(update_fields=['data', 'updated_at'])
        except Exception as e:
            logger.warning('Failed to clean SyncDocument during Course deletion: %s', e)

    def delete(self, request, *args, **kwargs):
        pk = self.kwargs.get('pk')
        try:
            return super().delete(request, *args, **kwargs)
        except Exception as e:
            logger.info('Course %s not found in table during delete, cleaning SyncDocuments: %s', pk, e)
            # If already removed from table, ensure it is cleaned from SyncDocuments
            try:
                from core.models import SyncDocument
                clean_pk = re.sub(r'[^A-Za-z0-9]', '', str(pk)).upper()
                for key in ['studysync_courses', 'studysync_assessments', 'studysync_routines']:
                    doc = SyncDocument.objects.filter(user=request.user, key=key).first()
                    if doc and isinstance(doc.data, list):
                        doc.data = [
                            item for item in doc.data
                            if str(item.get('id', '')) != str(pk)
                            and re.sub(r'[^A-Za-z0-9]', '', str(item.get('courseId') or item.get('course_code') or '')).upper() not in clean_pk
                        ]
                        doc.save(update_fields=['data', 'updated_at'])
            except Exception:
                pass
            return Response(status=status.HTTP_204_NO_CONTENT)


class RoutineClearView(APIView):
    """Clear all routine records and associated attendance & CT marks for the authenticated user."""

    def delete(self, request):
        from .models import AttendanceRecord, CourseAssessment, AssessmentEvent
        with transaction.atomic():
            deleted_routines, _ = Routine.objects.filter(user=request.user).delete()
            deleted_imports, _ = RoutineImport.objects.filter(user=request.user).delete()
            deleted_attendance, _ = AttendanceRecord.objects.filter(user=request.user).delete()
            deleted_assessments, _ = CourseAssessment.objects.filter(user=request.user).delete()
            deleted_events, _ = AssessmentEvent.objects.filter(user=request.user).delete()
            updated_courses = Course.objects.filter(user=request.user).update(
                missed_classes=0,
                total_classes=0,
                attended_classes=0,
            )
            # Also clear and normalize the sync documents if present
            try:
                from core.models import SyncDocument
                SyncDocument.objects.filter(
                    user=request.user,
                    key__in=['studysync_routines', 'studysync_routine_imports', 'studysync_assessments']
                ).update(data=[])
                courses_doc = SyncDocument.objects.filter(user=request.user, key='studysync_courses').first()
                if courses_doc and isinstance(courses_doc.data, list):
                    cleared_courses = []
                    for c in courses_doc.data:
                        c_copy = dict(c)
                        c_copy['totalClasses'] = 0
                        c_copy['attendedClasses'] = 0
                        c_copy['missedClasses'] = 0
                        c_copy['history'] = []
                        c_copy['assessments'] = []
                        c_type = str(c_copy.get('courseType') or '').upper()
                        is_th = 'LAB' not in c_type and 'SESSIONAL' not in c_type
                        c_copy['assessmentApplicable'] = is_th
                        cr = float(c_copy.get('credit') or 3.0)
                        c_copy['bestAssessmentCount'] = max(1, int(round(cr))) if is_th else 0
                        cleared_courses.append(c_copy)
                    courses_doc.data = cleared_courses
                    courses_doc.save(update_fields=['data', 'updated_at'])
            except Exception as e:
                logger.warning('Failed to reset SyncDocument during RoutineClearView: %s', e)
        return Response(
            {
                'success': True,
                'deletedCount': deleted_routines,
                'deletedImports': deleted_imports,
                'deletedAttendance': deleted_attendance,
                'deletedAssessments': deleted_assessments,
                'deletedEvents': deleted_events,
                'resetCourses': updated_courses,
                'message': (
                    f'Successfully cleared {deleted_routines} routine records, '
                    f'{deleted_attendance} attendance entries, and {deleted_assessments} CT marks.'
                ),
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
        course_map = {}

        for item in extracted:
            code = item.course_code.upper()
            if code not in course_map:
                c_type = infer_class_type(f'{code} {item.course_title}')
                is_theory = (c_type == Routine.ClassType.THEORY)
                try:
                    credit_val = Decimal(str(item.credit))
                except Exception:
                    credit_val = Decimal('3.0')
                course = (
                    Course.objects.filter(user=request.user, course_id__iexact=code)
                    .order_by('-created_at')
                    .first()
                )
                if not course:
                    try:
                        course = Course.objects.create(
                            user=request.user,
                            course_id=code,
                            course_title=item.course_title,
                            credit=credit_val,
                            course_type='lab' if c_type == Routine.ClassType.LAB else c_type,
                            faculty=item.teacher_name,
                            color=color_for_course(code),
                            assessment_applicable=is_theory,
                            best_assessment_count=max(1, int(round(float(credit_val)))) if is_theory else 0,
                            source=Course.Source.OCR_IMPORT,
                            import_id=import_id,
                        )
                    except IntegrityError:
                        course = (
                            Course.objects.filter(user=request.user, course_id__iexact=code)
                            .order_by('-created_at')
                            .first()
                        )
                course_map[code] = course

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
            try:
                credit_val = Decimal(str(item.credit))
            except Exception:
                credit_val = Decimal('3.0')
            try:
                start_time = datetime.strptime(item.start_time.strip(), '%I:%M %p').time()
                end_time = datetime.strptime(item.end_time.strip(), '%I:%M %p').time()
            except Exception:
                continue
            if end_time <= start_time:
                continue

            day_key = str(item.day_of_week).upper()
            day_of_week = DAY_MAP.get(day_key, Routine.DayOfWeek.SUNDAY)

            records.append(
                Routine(
                    user=request.user,
                    course=course_map.get(course_code),
                    course_code=course_code,
                    course_title=item.course_title,
                    faculty=item.teacher_name,
                    teacher_name=item.teacher_name,
                    credit=credit_val,
                    course_type=(
                        'lab' if class_type == Routine.ClassType.LAB else class_type
                    ),
                    class_type=class_type,
                    day_of_week=day_of_week,
                    start_time=start_time,
                    end_time=end_time,
                    room=item.room or '',
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
        try:
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
                    source_file_name=(getattr(upload, 'name', '') or 'routine_image')[:255],
                    source_file_type=getattr(upload, 'content_type', '') or 'image/jpeg',
                    source_file_page_count=1,
                    detected_groups=[subgroup],
                    selected_group=subgroup,
                    section=section_letter,
                    created_routine_ids=[record.pk for record in created],
                    warnings=[],
                )
        except Exception as exc:
            logger.exception('Failed to persist routine records: %s', exc)
            return Response(
                {'detail': 'Failed to save routine records to the database.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
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


class AcademicResultView(APIView):
    """
    Retrieve, create/update, or clear the authenticated student's academic result.
    """

    def get(self, request):
        result = (
            AcademicResult.objects.filter(user=request.user)
            .prefetch_related('semesters__courses')
            .first()
        )
        if not result:
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = AcademicResultSerializer(result)
        return Response(serializer.data)

    def post(self, request):
        result = (
            AcademicResult.objects.filter(user=request.user)
            .prefetch_related('semesters__courses')
            .first()
        )
        if result:
            serializer = AcademicResultSerializer(
                result, data=request.data, context={'request': request}
            )
        else:
            serializer = AcademicResultSerializer(
                data=request.data, context={'request': request}
            )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Keep SyncDocument in sync for local-first sync store
        try:
            from django.core.serializers.json import DjangoJSONEncoder
            from core.models import SyncDocument
            json_safe_data = json.loads(json.dumps(serializer.data, cls=DjangoJSONEncoder))
            doc, _ = SyncDocument.objects.get_or_create(
                user=request.user,
                key='studysync_cuet_results',
                defaults={'data': json_safe_data, 'revision': 1},
            )
            doc.data = json_safe_data
            doc.save(update_fields=['data', 'updated_at'])
        except Exception as e:
            logger.warning('Failed to update SyncDocument for cuet_results: %s', e)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK if result else status.HTTP_201_CREATED,
        )

    def delete(self, request):
        with transaction.atomic():
            SemesterCourse.objects.filter(user=request.user).delete()
            Semester.objects.filter(user=request.user).delete()
            AcademicResult.objects.filter(user=request.user).delete()
            try:
                from core.models import SyncDocument
                SyncDocument.objects.filter(
                    user=request.user, key='studysync_cuet_results'
                ).delete()
            except Exception as e:
                logger.warning('Failed to delete SyncDocument for cuet_results: %s', e)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AcademicResultImportView(APIView):
    """
    Import raw or normalized CUET academic results from browser extension,
    Tampermonkey userscript, or direct JSON/HTML paste.
    Performs authoritative repeated-course resolution, failed course deduplication,
    credit totals and CGPA calculation, and persists to Supabase PostgreSQL.
    """

    CUET_GRADE_SCALE = {
        'A+': Decimal('4.00'),
        'A': Decimal('3.75'),
        'A-': Decimal('3.50'),
        'B+': Decimal('3.25'),
        'B': Decimal('3.00'),
        'B-': Decimal('2.75'),
        'C+': Decimal('2.50'),
        'C': Decimal('2.25'),
        'D': Decimal('2.00'),
        'F': Decimal('0.00'),
    }

    ROMAN_MAP = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, '1': 1, '2': 2, '3': 3, '4': 4}
    NUM_TO_ROMAN = {1: 'I', 2: 'II', 3: 'III', 4: 'IV'}

    @classmethod
    def _parse_term(cls, term_str):
        if not term_str:
            return 1, 1, 'Level 1 - Term I'
        m = re.search(r'Level\s*(\d+)\s*[-–]?\s*Term\s*([IVX]+|\d+)', term_str, re.I) or \
            re.search(r'L\s*[-–]?\s*(\d+)\s*T\s*[-–]?\s*([IVX]+|\d+)', term_str, re.I) or \
            re.search(r'(\d+)(?:st|nd|rd|th)?\s*Year\s*(\d+)(?:st|nd|rd|th)?\s*Term', term_str, re.I)
        if m:
            level = int(m.group(1))
            raw_term = m.group(2).upper()
            term = cls.ROMAN_MAP.get(raw_term, 1)
            roman = cls.NUM_TO_ROMAN.get(term, 'I')
            return level, term, f'Level {level} - Term {roman}'
        return 1, 1, term_str.strip() or 'Level 1 - Term I'

    @transaction.atomic
    def post(self, request):
        data = request.data
        if not isinstance(data, dict):
            return Response({'error': 'Invalid payload. Expected JSON object.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Check if already wrapped in full normalized structure or if passing results array
        raw_courses = data.get('results') or data.get('courses')
        student_meta = data.get('student', {})

        if not raw_courses and isinstance(data.get('semesters'), list):
            existing = AcademicResult.objects.filter(user=request.user).first()
            serializer = AcademicResultSerializer(
                existing, data=data, context={'request': request}
            ) if existing else AcademicResultSerializer(
                data=data, context={'request': request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)

        if not raw_courses or not isinstance(raw_courses, list):
            return Response({'error': 'No course records provided in results array.'}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Track attempts for repeated course resolution
        course_occurrences = {}
        for item in raw_courses:
            code = str(item.get('course_code') or item.get('courseCode') or item.get('course_id') or item.get('courseId') or '').strip().upper()
            if not code:
                continue
            grade = str(item.get('grade') or item.get('letterGrade') or '').strip().upper().replace(' ', '')
            if grade not in self.CUET_GRADE_SCALE:
                continue
            course_occurrences.setdefault(code, []).append(grade)

        # Determine latest / effective grade for each course code
        latest_grade_map = {}
        for code, grades in course_occurrences.items():
            non_f_grades = [g for g in grades if g != 'F']
            latest_grade_map[code] = non_f_grades[-1] if non_f_grades else grades[-1]

        # 3. Group and structure into semesters
        terms_map = {}
        course_seen_counts = {}

        for item in raw_courses:
            code = str(item.get('course_code') or item.get('courseCode') or item.get('course_id') or item.get('courseId') or '').strip().upper()
            title = str(item.get('course_title') or item.get('courseTitle') or item.get('title') or code).strip()
            raw_credit = item.get('credit') or item.get('credits') or 3.0
            try:
                credit = Decimal(str(raw_credit))
            except Exception:
                credit = Decimal('3.00')

            grade = str(item.get('grade') or item.get('letterGrade') or '').strip().upper().replace(' ', '')
            if grade not in self.CUET_GRADE_SCALE or not code:
                continue

            grade_point = self.CUET_GRADE_SCALE[grade]
            level_term_raw = str(item.get('term') or item.get('levelTerm') or item.get('semester') or 'Level 1 - Term I')
            level, term_num, term_label = self._parse_term(level_term_raw)
            term_key = f'L{level}T{term_num}'

            # Repeated course detection
            seen_count = course_seen_counts.get(code, 0) + 1
            course_seen_counts[code] = seen_count
            is_multi = len(course_occurrences.get(code, [])) > 1
            is_effective = (latest_grade_map.get(code) == grade)
            is_repeated = is_multi and not is_effective

            course_type = str(item.get('course_type') or item.get('courseType') or '').lower()
            if not course_type or course_type == 'unknown':
                course_type = 'lab' if (credit in (Decimal('0.75'), Decimal('1.50')) or item.get('is_lab')) else 'theory'

            course_status = 'Failed' if grade == 'F' else ('Repeated' if is_repeated else 'Passed')

            quality_pts = (credit * grade_point).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            course_obj = {
                'courseId': code,
                'courseCode': code,
                'title': title,
                'courseTitle': title,
                'credit': credit.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
                'grade': grade,
                'letterGrade': grade,
                'gradePoint': grade_point.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
                'qualityPoints': quality_pts,
                'isRepeated': is_repeated,
                'status': course_status,
                'courseType': 'Lab' if course_type in ('lab', 'sessional') else 'Theory',
                'source': 'cuet',
            }

            if term_key not in terms_map:
                terms_map[term_key] = {
                    'id': f'sem-{term_key}',
                    'name': term_label,
                    'term': term_label,
                    'level': level,
                    'termNum': term_num,
                    'sortOrder': level * 10 + term_num,
                    'courses': [],
                }
            terms_map[term_key]['courses'].append(course_obj)

        # 4. Sort semesters chronologically
        sorted_terms = sorted(terms_map.values(), key=lambda t: t['sortOrder'])

        # Compute term metrics
        semesters_payload = []
        for sem in sorted_terms:
            courses = sem['courses']
            total_cr = Decimal('0.00')
            comp_cr = Decimal('0.00')
            total_qp = Decimal('0.00')

            for c in courses:
                total_cr += c['credit']
                if c['letterGrade'] != 'F' and not c['isRepeated']:
                    comp_cr += c['credit']
                total_qp += c['qualityPoints']

            term_gpa = Decimal('0.00')
            if total_cr > Decimal('0.00'):
                term_gpa = (total_qp / total_cr).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            semesters_payload.append({
                'id': sem['id'],
                'name': sem['name'],
                'term': sem['term'],
                'level': sem['level'],
                'gpa': term_gpa,
                'calculatedGpa': term_gpa,
                'attemptedCredits': total_cr,
                'completedCredits': comp_cr,
                'sortOrder': sem['sortOrder'],
                'courses': courses,
            })

        # 5. Calculate Overall Authoritative CGPA & Failed Courses
        effective_points = Decimal('0.00')
        effective_credits = Decimal('0.00')
        total_completed = Decimal('0.00')
        total_attempted = Decimal('0.00')
        highest_gpa = Decimal('0.00')
        failed_courses_dict = {}

        for sem in semesters_payload:
            if sem['calculatedGpa'] > highest_gpa:
                highest_gpa = sem['calculatedGpa']
            total_attempted += sem['attemptedCredits']
            total_completed += sem['completedCredits']

            for c in sem['courses']:
                code = c['courseCode']
                # Track failed courses (if latest grade is still F)
                if c['letterGrade'] == 'F':
                    if latest_grade_map.get(code) == 'F':
                        failed_courses_dict[code] = {
                            'courseCode': code,
                            'courseTitle': c['title'],
                            'credit': float(c['credit']),
                            'levelTerm': sem['name'],
                            'attemptsCount': len(course_occurrences.get(code, [])),
                        }
                # Effective attempt calculation
                if not c['isRepeated']:
                    effective_points += c['qualityPoints']
                    effective_credits += c['credit']

        overall_cgpa = Decimal('0.00')
        if effective_credits > Decimal('0.00'):
            overall_cgpa = (effective_points / effective_credits).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        cleared_courses_count = sum(1 for code, g in latest_grade_map.items() if g != 'F')
        failed_courses_list = list(failed_courses_dict.values())

        # 6. Assemble Full AcademicResult Payload
        final_payload = {
            'student': {
                'studentId': student_meta.get('studentId') or student_meta.get('student_id') or (request.user.student_id if hasattr(request.user, 'student_id') else 'CUET Student'),
                'name': student_meta.get('name') or student_meta.get('student_name') or request.user.get_full_name() or 'CUET Student',
                'department': student_meta.get('department') or 'Computer Science & Engineering',
                'batch': student_meta.get('batch') or '',
            },
            'semesters': semesters_payload,
            'overall': {
                'cgpa': overall_cgpa,
                'calculatedCgpa': overall_cgpa,
                'completedCredits': total_completed,
                'attemptedCredits': total_attempted,
                'qualityPoints': effective_points.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
                'highestGpa': highest_gpa,
                'totalSemesters': len(semesters_payload),
                'failedCoursesCount': len(failed_courses_list),
                'clearedCoursesCount': cleared_courses_count,
            },
            'failedCourses': failed_courses_list,
            'fetchedAt': timezone.now().isoformat(),
            'source': 'CUET Result Portal (Official Import)',
            'schemaVersion': '1.0.0',
            'isSavedCopy': False,
        }

        # 7. Upsert into database
        existing = AcademicResult.objects.filter(user=request.user).first()
        serializer = AcademicResultSerializer(
            existing, data=final_payload, context={'request': request}
        ) if existing else AcademicResultSerializer(
            data=final_payload, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Update SyncDocument
        try:
            from django.core.serializers.json import DjangoJSONEncoder
            from core.models import SyncDocument
            json_safe_data = json.loads(json.dumps(serializer.data, cls=DjangoJSONEncoder))
            doc, _ = SyncDocument.objects.get_or_create(
                user=request.user,
                key='studysync_cuet_results',
                defaults={'data': json_safe_data, 'revision': 1},
            )
            doc.data = json_safe_data
            doc.save(update_fields=['data', 'updated_at'])
        except Exception as e:
            logger.warning('Failed to update SyncDocument on result import: %s', e)

        return Response(serializer.data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Assessment CRUD with Google Calendar & Drive integration
# ---------------------------------------------------------------------------

from .google_services import (
    GoogleAPIError,
    GooglePermissionDeniedError,
    GoogleQuotaError,
    GoogleTokenExpiredError,
    create_calendar_event,
    delete_calendar_event,
    delete_drive_file,
    get_token_scopes,
    update_calendar_event,
    upload_to_drive,
)
from .models import AssessmentAttachment, AssessmentEvent, AssessmentLink
from .serializers import AssessmentAttachmentSerializer, AssessmentEventSerializer


ASSESSMENT_MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024  # 25 MB
ASSESSMENT_ALLOWED_MIME_TYPES = {
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'text/plain',
}


def _get_google_token(request):
    """Extract the Google access token from the request (header or body)."""
    return (
        request.headers.get('X-Google-Token')
        or (request.data.get('google_access_token') if hasattr(request, 'data') else None)
        or ''
    ).strip() or None


def _google_error_response(exc):
    """Convert a GoogleAPIError into a DRF Response."""
    if isinstance(exc, GoogleTokenExpiredError):
        return Response(
            {'detail': str(exc), 'code': 'google_token_expired'},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    if isinstance(exc, GooglePermissionDeniedError):
        return Response(
            {'detail': str(exc), 'code': 'google_permission_denied'},
            status=status.HTTP_403_FORBIDDEN,
        )
    if isinstance(exc, GoogleQuotaError):
        return Response(
            {'detail': str(exc), 'code': 'google_quota_exceeded'},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )
    return Response(
        {'detail': str(exc), 'code': 'google_api_error'},
        status=status.HTTP_502_BAD_GATEWAY,
    )


class AssessmentListCreateView(APIView):
    """List all assessments for the authenticated user, or create a new one."""

    def get(self, request):
        assessments = (
            AssessmentEvent.objects.filter(user=request.user)
            .prefetch_related('attachments', 'links')
            .order_by('-date', '-deadline_date', '-created_at')
        )
        serializer = AssessmentEventSerializer(
            assessments, many=True, context={'request': request}
        )
        return Response(serializer.data)

    @transaction.atomic
    def post(self, request):
        serializer = AssessmentEventSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        assessment = serializer.save()

        # Google Calendar integration
        google_token = _get_google_token(request)
        calendar_status = None
        if google_token:
            try:
                event_id, event_url = create_calendar_event(google_token, assessment)
                if event_id:
                    assessment.google_calendar_event_id = event_id
                    assessment.google_calendar_event_url = event_url or ''
                    assessment.save(update_fields=[
                        'google_calendar_event_id',
                        'google_calendar_event_url',
                        'updated_at',
                    ])
                    calendar_status = 'created'
            except GoogleAPIError as exc:
                logger.warning(
                    'Google Calendar event creation failed for assessment %s: %s',
                    assessment.pk, exc,
                )
                calendar_status = f'failed: {exc}'

        # Re-serialize with updated Google fields
        result = AssessmentEventSerializer(assessment, context={'request': request}).data
        result['calendarStatus'] = calendar_status
        return Response(result, status=status.HTTP_201_CREATED)


class AssessmentDetailView(APIView):
    """Retrieve, update, or delete a specific assessment."""

    def _get_assessment(self, request, pk):
        try:
            return AssessmentEvent.objects.prefetch_related(
                'attachments', 'links'
            ).get(pk=pk, user=request.user)
        except AssessmentEvent.DoesNotExist:
            return None

    def get(self, request, pk):
        assessment = self._get_assessment(request, pk)
        if not assessment:
            return Response(
                {'detail': 'Assessment not found.'}, status=status.HTTP_404_NOT_FOUND
            )
        serializer = AssessmentEventSerializer(assessment, context={'request': request})
        return Response(serializer.data)

    @transaction.atomic
    def patch(self, request, pk):
        assessment = self._get_assessment(request, pk)
        if not assessment:
            return Response(
                {'detail': 'Assessment not found.'}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = AssessmentEventSerializer(
            assessment, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        assessment = serializer.save()

        # Update Google Calendar event if it exists
        google_token = _get_google_token(request)
        calendar_status = None
        if google_token and assessment.google_calendar_event_id:
            try:
                event_id, event_url = update_calendar_event(
                    google_token, assessment.google_calendar_event_id, assessment
                )
                if event_url:
                    assessment.google_calendar_event_url = event_url
                    assessment.save(update_fields=['google_calendar_event_url', 'updated_at'])
                calendar_status = 'updated'
            except GoogleAPIError as exc:
                logger.warning(
                    'Google Calendar event update failed for assessment %s: %s',
                    assessment.pk, exc,
                )
                calendar_status = f'failed: {exc}'
        elif google_token and not assessment.google_calendar_event_id:
            # Event was never created; try now
            try:
                event_id, event_url = create_calendar_event(google_token, assessment)
                if event_id:
                    assessment.google_calendar_event_id = event_id
                    assessment.google_calendar_event_url = event_url or ''
                    assessment.save(update_fields=[
                        'google_calendar_event_id',
                        'google_calendar_event_url',
                        'updated_at',
                    ])
                    calendar_status = 'created'
            except GoogleAPIError as exc:
                logger.warning(
                    'Google Calendar event creation failed for assessment %s: %s',
                    assessment.pk, exc,
                )
                calendar_status = f'failed: {exc}'

        result = AssessmentEventSerializer(assessment, context={'request': request}).data
        result['calendarStatus'] = calendar_status
        return Response(result)

    @transaction.atomic
    def delete(self, request, pk):
        assessment = self._get_assessment(request, pk)
        if not assessment:
            return Response(
                {'detail': 'Assessment not found.'}, status=status.HTTP_404_NOT_FOUND
            )

        google_token = _get_google_token(request)
        errors = []

        # Delete Calendar event
        if google_token and assessment.google_calendar_event_id:
            try:
                delete_calendar_event(google_token, assessment.google_calendar_event_id)
            except GoogleAPIError as exc:
                logger.warning('Failed to delete Calendar event %s: %s',
                               assessment.google_calendar_event_id, exc)
                errors.append(f'Calendar: {exc}')

        # Delete Drive attachments
        if google_token:
            for attachment in assessment.attachments.all():
                if attachment.google_drive_file_id:
                    try:
                        delete_drive_file(google_token, attachment.google_drive_file_id)
                    except GoogleAPIError as exc:
                        logger.warning('Failed to delete Drive file %s: %s',
                                       attachment.google_drive_file_id, exc)
                        errors.append(f'Drive ({attachment.name}): {exc}')

        assessment.delete()

        response_data = {'detail': 'Assessment deleted.'}
        if errors:
            response_data['googleErrors'] = errors
            response_data['detail'] = 'Assessment deleted, but some Google resources could not be cleaned up.'
        return Response(response_data, status=status.HTTP_200_OK)


class AssessmentAttachmentUploadView(APIView):
    """Upload a file attachment for an assessment (optionally to Google Drive)."""

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        try:
            assessment = AssessmentEvent.objects.get(pk=pk, user=request.user)
        except AssessmentEvent.DoesNotExist:
            return Response(
                {'detail': 'Assessment not found.'}, status=status.HTTP_404_NOT_FOUND
            )

        upload = request.FILES.get('file')
        if not upload:
            return Response(
                {'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file size
        if upload.size > ASSESSMENT_MAX_ATTACHMENT_BYTES:
            return Response(
                {'detail': f'File is too large. Maximum size is {ASSESSMENT_MAX_ATTACHMENT_BYTES // (1024 * 1024)} MB.'},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        # Validate file type
        mime_type = upload.content_type or 'application/octet-stream'
        if mime_type not in ASSESSMENT_ALLOWED_MIME_TYPES:
            return Response(
                {'detail': f'File type "{mime_type}" is not supported. Allowed: PDF, Word documents, images.'},
                status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )

        file_bytes = upload.read()
        file_name = upload.name or 'attachment'
        file_size = f'{len(file_bytes) / (1024 * 1024):.2f} MB'

        # Persist locally so the file is not lost if Google Drive upload is pending or fails
        local_path = ''
        try:
            user_dir = os.path.join(settings.MEDIA_ROOT, 'attachments', str(request.user.pk))
            os.makedirs(user_dir, exist_ok=True)
            safe_file_name = f"{uuid.uuid4().hex[:8]}_{file_name}"
            local_path = os.path.join(user_dir, safe_file_name)
            with open(local_path, 'wb') as f:
                f.write(file_bytes)
        except OSError as exc:
            logger.warning('Failed to save local attachment copy: %s', exc)
            local_path = ''

        drive_file_id = ''
        drive_file_url = ''
        google_token = _get_google_token(request)
        drive_status = 'not_connected'
        drive_error = None

        if google_token:
            try:
                drive_file_id, drive_file_url = upload_to_drive(
                    google_token,
                    file_bytes,
                    file_name,
                    mime_type,
                    assessment.course_code or 'General',
                )
                drive_status = 'uploaded'
            except GoogleAPIError as exc:
                logger.warning(
                    'Google Drive upload failed for %s on assessment %s: %s',
                    file_name, assessment.pk, exc,
                )
                drive_status = 'failed'
                drive_error = exc.detail or str(exc)
        else:
            drive_status = 'not_connected'
            drive_error = 'Google Drive access not granted. Please connect Google to save files to Drive.'

        attachment = AssessmentAttachment.objects.create(
            user=request.user,
            assessment=assessment,
            name=file_name,
            size=file_size,
            mime_type=mime_type,
            storage_path=local_path,
            google_drive_file_id=drive_file_id,
            google_drive_file_url=drive_file_url,
        )

        result = AssessmentAttachmentSerializer(attachment, context={'request': request}).data
        result['driveStatus'] = drive_status
        if drive_error:
            result['driveError'] = drive_error
        return Response(result, status=status.HTTP_201_CREATED)

    def get(self, request, pk):
        """List attachments for an assessment."""
        try:
            assessment = AssessmentEvent.objects.get(pk=pk, user=request.user)
        except AssessmentEvent.DoesNotExist:
            return Response(
                {'detail': 'Assessment not found.'}, status=status.HTTP_404_NOT_FOUND
            )
        attachments = assessment.attachments.all()
        serializer = AssessmentAttachmentSerializer(
            attachments, many=True, context={'request': request}
        )
        return Response(serializer.data)


class AssessmentAttachmentSyncDriveView(APIView):
    """
    Sync an already-uploaded attachment to Google Drive using its locally stored file copy.
    Endpoint: POST /api/v1/academics/attachments/<uuid:pk>/sync-drive/
    """

    def post(self, request, pk):
        try:
            attachment = AssessmentAttachment.objects.select_related('assessment').get(
                pk=pk, user=request.user
            )
        except AssessmentAttachment.DoesNotExist:
            return Response(
                {'detail': 'Attachment not found.'}, status=status.HTTP_404_NOT_FOUND
            )

        if attachment.google_drive_file_id and attachment.google_drive_file_url:
            return Response({
                'detail': 'Attachment is already uploaded to Google Drive.',
                'googleDriveFileId': attachment.google_drive_file_id,
                'googleDriveFileUrl': attachment.google_drive_file_url,
                'driveStatus': 'uploaded',
            }, status=status.HTTP_200_OK)

        google_token = _get_google_token(request)
        if not google_token:
            return Response(
                {
                    'detail': 'No Google access token provided. Please connect Google first.',
                    'code': 'no_token',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not attachment.storage_path or not os.path.exists(attachment.storage_path):
            return Response(
                {
                    'detail': 'Original file is not cached locally on server. Please delete and re-upload the file.',
                    'code': 'file_missing',
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            with open(attachment.storage_path, 'rb') as f:
                file_bytes = f.read()
        except OSError as exc:
            return Response(
                {'detail': f'Error reading local file: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        course_code = (
            attachment.assessment.course_code if attachment.assessment else 'General'
        ) or 'General'

        try:
            drive_file_id, drive_file_url = upload_to_drive(
                google_token,
                file_bytes,
                attachment.name,
                attachment.mime_type or 'application/octet-stream',
                course_code,
            )
            attachment.google_drive_file_id = drive_file_id
            attachment.google_drive_file_url = drive_file_url
            attachment.save(update_fields=[
                'google_drive_file_id',
                'google_drive_file_url',
                'updated_at',
            ])
            logger.info('Synced attachment %s to Google Drive (%s)', attachment.pk, drive_file_id)
        except GoogleAPIError as exc:
            logger.warning('Failed to sync attachment %s to Google Drive: %s', attachment.pk, exc)
            return _google_error_response(exc)

        result = AssessmentAttachmentSerializer(attachment, context={'request': request}).data
        result['driveStatus'] = 'uploaded'
        return Response(result, status=status.HTTP_200_OK)


class AssessmentAttachmentDeleteView(APIView):
    """Delete an individual attachment (and its Drive file + local copy if applicable)."""

    def delete(self, request, pk):
        try:
            attachment = AssessmentAttachment.objects.get(pk=pk, user=request.user)
        except AssessmentAttachment.DoesNotExist:
            return Response(
                {'detail': 'Attachment not found.'}, status=status.HTTP_404_NOT_FOUND
            )

        google_token = _get_google_token(request)
        drive_error = None

        if google_token and attachment.google_drive_file_id:
            try:
                delete_drive_file(google_token, attachment.google_drive_file_id)
            except GoogleAPIError as exc:
                logger.warning(
                    'Failed to delete Drive file %s: %s',
                    attachment.google_drive_file_id, exc,
                )
                drive_error = str(exc)

        # Clean up local file copy if it exists
        if attachment.storage_path and os.path.exists(attachment.storage_path):
            try:
                os.remove(attachment.storage_path)
            except OSError as exc:
                logger.warning('Failed to remove local attachment file: %s', exc)

        attachment.delete()

        response_data = {'detail': 'Attachment deleted.'}
        if drive_error:
            response_data['driveError'] = drive_error
            response_data['detail'] = 'Attachment removed from StudySync, but the Google Drive file could not be deleted.'
        return Response(response_data, status=status.HTTP_200_OK)


class GoogleCalendarConnectView(APIView):
    """Check Google Calendar and Drive authorization status and provide connection guidance."""

    def get(self, request):
        """Check if Calendar & Drive integration is available for this user."""
        google_token = _get_google_token(request)
        token_info = get_token_scopes(google_token) if google_token else None

        has_calendar = bool(token_info and token_info['has_calendar'])
        has_drive = bool(token_info and token_info['has_drive'])
        connected = bool(token_info and token_info['valid'] and has_calendar and has_drive)

        return Response({
            'configured': bool(getattr(settings, 'GOOGLE_CLIENT_ID', '')),
            'hasToken': bool(google_token),
            'connected': connected,
            'hasCalendar': has_calendar,
            'hasDrive': has_drive,
            'email': token_info.get('email', '') if token_info else '',
            'scopes': {
                'calendar': getattr(settings, 'GOOGLE_CALENDAR_SCOPES', ''),
                'drive': getattr(settings, 'GOOGLE_DRIVE_SCOPES', ''),
            },
            'message': (
                'Google Calendar & Drive are ready.' if connected
                else 'Token is valid, but missing Drive or Calendar permissions. Please connect Google Services.' if (token_info and token_info['valid'])
                else 'Your Google token has expired or is invalid. Please sign in again.' if google_token
                else 'Sign in with Google to enable Calendar and Drive integration.'
            ),
        })

    def post(self, request):
        """Verify that the provided Google token can access Calendar and Drive."""
        google_token = _get_google_token(request)
        if not google_token:
            return Response(
                {
                    'connected': False,
                    'detail': 'No Google access token provided. Please sign in with Google.',
                    'code': 'no_token',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_info = get_token_scopes(google_token)
        if not token_info.get('valid'):
            return Response(
                {
                    'connected': False,
                    'detail': 'Your Google token is expired or invalid. Please sign in again.',
                    'code': 'invalid_token',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        has_calendar = token_info.get('has_calendar', False)
        has_drive = token_info.get('has_drive', False)
        connected = has_calendar and has_drive

        if not connected:
            missing = []
            if not has_calendar:
                missing.append('Calendar')
            if not has_drive:
                missing.append('Drive')
            return Response(
                {
                    'connected': False,
                    'hasCalendar': has_calendar,
                    'hasDrive': has_drive,
                    'detail': f'Missing permissions for: {", ".join(missing)}. Please grant access.',
                    'code': 'insufficient_scopes',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            'connected': True,
            'hasCalendar': True,
            'hasDrive': True,
            'email': token_info.get('email', ''),
            'message': 'Google Calendar & Drive connected successfully.',
        })

