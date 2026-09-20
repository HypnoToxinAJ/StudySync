import calendar
from datetime import datetime

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    TuitionClassSlot,
    TuitionMonthClassDate,
    TuitionMonthSnapshot,
    TuitionNote,
    TuitionStudent,
)
from .serializers import (
    TuitionClassSlotSerializer,
    TuitionNoteSerializer,
    TuitionStudentSerializer,
)


class TuitionStudentListCreateView(APIView):
    """
    List all tuition students for the authenticated user, or create a new student.
    Endpoint: /api/v1/tuition/students/
    """

    def get(self, request):
        students = (
            TuitionStudent.objects.filter(user=request.user)
            .prefetch_related('class_slots', 'notes', 'month_history__class_dates')
            .order_by('student_name')
        )
        serializer = TuitionStudentSerializer(
            students, many=True, context={'request': request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @transaction.atomic
    def post(self, request):
        serializer = TuitionStudentSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        student = serializer.save()
        result = TuitionStudentSerializer(student, context={'request': request}).data
        return Response(result, status=status.HTTP_201_CREATED)


class TuitionStudentDetailView(APIView):
    """
    Retrieve, update, or delete a tuition student.
    Endpoint: /api/v1/tuition/students/<str:pk>/
    """

    def _get_student(self, request, pk):
        try:
            return (
                TuitionStudent.objects.prefetch_related(
                    'class_slots', 'notes', 'month_history__class_dates'
                ).get(pk=pk, user=request.user)
            )
        except TuitionStudent.DoesNotExist:
            return None

    def get(self, request, pk):
        student = self._get_student(request, pk)
        if not student:
            return Response(
                {'detail': 'Tuition student not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = TuitionStudentSerializer(student, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @transaction.atomic
    def patch(self, request, pk):
        student = self._get_student(request, pk)
        if not student:
            return Response(
                {'detail': 'Tuition student not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = TuitionStudentSerializer(
            student, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        student = serializer.save()
        result = TuitionStudentSerializer(student, context={'request': request}).data
        return Response(result, status=status.HTTP_200_OK)

    def put(self, request, pk):
        return self.patch(request, pk)

    @transaction.atomic
    def delete(self, request, pk):
        student = self._get_student(request, pk)
        if not student:
            return Response(
                {'detail': 'Tuition student not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        student.delete()
        return Response(
            {'detail': 'Tuition student deleted successfully.'},
            status=status.HTTP_200_OK,
        )


class TuitionClassSlotUpdateView(APIView):
    """
    Update or clear a specific class slot date for a student.
    Endpoint: /api/v1/tuition/students/<str:student_pk>/slots/<int:order>/
    """

    def patch(self, request, student_pk, order):
        try:
            student = TuitionStudent.objects.get(pk=student_pk, user=request.user)
        except TuitionStudent.DoesNotExist:
            return Response(
                {'detail': 'Tuition student not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        slot, created = TuitionClassSlot.objects.get_or_create(
            user=request.user,
            student=student,
            order=order,
            defaults={'completed': False},
        )

        date_val = request.data.get('date')
        if date_val in ('', None):
            slot.date = None
            slot.completed = False
        else:
            slot.date = date_val
            slot.completed = request.data.get('completed', True)

        slot.save(update_fields=['date', 'completed', 'updated_at'])
        student.save(update_fields=['updated_at'])

        # Return updated student so frontend has full synced progress
        updated_student = (
            TuitionStudent.objects.prefetch_related(
                'class_slots', 'notes', 'month_history__class_dates'
            ).get(pk=student_pk, user=request.user)
        )
        return Response(
            TuitionStudentSerializer(updated_student, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class TuitionStartNewMonthView(APIView):
    """
    Close the current month into a month snapshot and reset class slots for a new month.
    Endpoint: /api/v1/tuition/students/<str:student_pk>/start-new-month/
    """

    @transaction.atomic
    def post(self, request, student_pk):
        try:
            student = (
                TuitionStudent.objects.prefetch_related('class_slots')
                .get(pk=student_pk, user=request.user)
            )
        except TuitionStudent.DoesNotExist:
            return Response(
                {'detail': 'Tuition student not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        current_active = student.active_month or timezone.localdate().strftime('%Y-%m')

        # Determine target month
        target_month = request.data.get('targetMonth')
        if not target_month:
            try:
                y, m = map(int, current_active.split('-'))
                m += 1
                if m > 12:
                    m = 1
                    y += 1
                target_month = f'{y:04d}-{m:02d}'
            except Exception:
                target_month = timezone.localdate().strftime('%Y-%m')

        # Calculate snapshot stats from current month's completed slots
        completed_classes = student.class_slots.filter(completed=True).count()
        planned = student.monthly_planned_classes or 12
        salary = student.monthly_salary or 0
        earned = round((float(salary) / planned) * completed_classes, 2) if planned > 0 else 0
        progress = min(100, int((completed_classes / planned) * 100)) if planned > 0 else 0

        try:
            y_int, m_int = map(int, current_active.split('-'))
            month_name = calendar.month_name[m_int]
            year_val = y_int
        except Exception:
            month_name = 'Month'
            year_val = timezone.localdate().year

        # Snapshot current active month
        snapshot, _ = TuitionMonthSnapshot.objects.update_or_create(
            user=request.user,
            student=student,
            active_month=current_active,
            defaults={
                'month': month_name,
                'year': year_val,
                'planned_classes': planned,
                'completed_classes': completed_classes,
                'monthly_salary': salary,
                'earned_amount': earned,
                'last_paid_date': student.last_paid_date,
                'progress_percent': progress,
                'closed_at': timezone.now(),
            },
        )

        # Snapshot class dates
        snapshot.class_dates.all().delete()
        dated_slots = student.class_slots.filter(completed=True, date__isnull=False).order_by('order')
        TuitionMonthClassDate.objects.bulk_create([
            TuitionMonthClassDate(
                user=request.user,
                snapshot=snapshot,
                order=slot.order,
                date=slot.date,
            )
            for slot in dated_slots
        ])

        # Reset student state for target new month
        student.active_month = target_month
        student.payment_status = TuitionStudent.PaymentStatus.PENDING
        student.last_paid_date = None
        student.save(update_fields=['active_month', 'payment_status', 'last_paid_date', 'updated_at'])

        # Reset all slot dates and completion
        student.class_slots.all().update(date=None, completed=False)

        refreshed = (
            TuitionStudent.objects.prefetch_related(
                'class_slots', 'notes', 'month_history__class_dates'
            ).get(pk=student_pk, user=request.user)
        )
        return Response(
            TuitionStudentSerializer(refreshed, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class TuitionNoteListCreateView(APIView):
    """
    List or create notes for a tuition student.
    Endpoint: /api/v1/tuition/students/<str:student_pk>/notes/
    """

    def get(self, request, student_pk):
        try:
            student = TuitionStudent.objects.get(pk=student_pk, user=request.user)
        except TuitionStudent.DoesNotExist:
            return Response(
                {'detail': 'Tuition student not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        notes = student.notes.all().order_by('-created_at')
        return Response(
            TuitionNoteSerializer(notes, many=True, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request, student_pk):
        try:
            student = TuitionStudent.objects.get(pk=student_pk, user=request.user)
        except TuitionStudent.DoesNotExist:
            return Response(
                {'detail': 'Tuition student not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        content = (request.data.get('content') or '').strip()
        if not content:
            return Response(
                {'detail': 'Note content cannot be empty.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        note_id = request.data.get('id')
        note_kwargs = {'user': request.user, 'student': student, 'content': content}
        if note_id:
            note_kwargs['id'] = str(note_id)

        note = TuitionNote.objects.create(**note_kwargs)
        student.save(update_fields=['updated_at'])
        return Response(
            TuitionNoteSerializer(note, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class TuitionNoteDetailView(APIView):
    """
    Update or delete an individual tuition note.
    Endpoint: /api/v1/tuition/students/<str:student_pk>/notes/<str:pk>/
    """

    def patch(self, request, student_pk, pk):
        try:
            note = TuitionNote.objects.get(
                pk=pk, student__pk=student_pk, user=request.user
            )
        except TuitionNote.DoesNotExist:
            return Response(
                {'detail': 'Tuition note not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        content = (request.data.get('content') or '').strip()
        if not content:
            return Response(
                {'detail': 'Note content cannot be empty.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        note.content = content
        note.save(update_fields=['content', 'updated_at'])
        return Response(
            TuitionNoteSerializer(note, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )

    def delete(self, request, student_pk, pk):
        try:
            note = TuitionNote.objects.get(
                pk=pk, student__pk=student_pk, user=request.user
            )
        except TuitionNote.DoesNotExist:
            return Response(
                {'detail': 'Tuition note not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        note.delete()
        return Response(
            {'detail': 'Tuition note deleted.'},
            status=status.HTTP_200_OK,
        )


class TuitionSyncBatchView(APIView):
    """
    Batch synchronize a list of students from client storage to Supabase PostgreSQL.
    Endpoint: /api/v1/tuition/sync/
    """

    @transaction.atomic
    def post(self, request):
        raw_students = request.data.get('students', request.data)
        if not isinstance(raw_students, list):
            return Response(
                {'detail': 'Expected a list of students under "students" or request body.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_students = {
            s.pk: s for s in TuitionStudent.objects.filter(user=request.user)
        }

        saved_students = []
        for item in raw_students:
            if not isinstance(item, dict):
                continue
            item_data = dict(item)
            item_id = item_data.get('id')

            instance = existing_students.get(item_id) if item_id else None
            serializer = TuitionStudentSerializer(
                instance, data=item_data, partial=bool(instance), context={'request': request}
            )
            if serializer.is_valid():
                student = serializer.save()
                saved_students.append(student)
            else:
                # If validation fails on partial fields, try basic fields
                try:
                    fallback_data = {
                        'studentName': item_data.get('studentName') or item_data.get('name') or 'Student',
                        'subject': item_data.get('subject') or 'General',
                        'classGrade': item_data.get('classGrade') or item_data.get('grade') or '',
                        'monthlyPlannedClasses': item_data.get('monthlyPlannedClasses') or 12,
                        'monthlySalary': item_data.get('monthlySalary') or 8000,
                        'startDate': item_data.get('startDate') or timezone.localdate().isoformat(),
                        'paymentStatus': item_data.get('paymentStatus') or 'pending',
                        'cardColor': item_data.get('cardColor') or '#4F46E5',
                        'currency': item_data.get('currency') or 'BDT',
                    }
                    if item_id:
                        fallback_data['id'] = str(item_id)
                    fallback_ser = TuitionStudentSerializer(
                        instance, data=fallback_data, partial=bool(instance), context={'request': request}
                    )
                    if fallback_ser.is_valid():
                        student = fallback_ser.save()
                        saved_students.append(student)
                except Exception:
                    pass

        # Return full updated student list for the user
        all_students = (
            TuitionStudent.objects.filter(user=request.user)
            .prefetch_related('class_slots', 'notes', 'month_history__class_dates')
            .order_by('student_name')
        )
        return Response(
            TuitionStudentSerializer(all_students, many=True, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )
