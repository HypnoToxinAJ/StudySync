from django.db import transaction
from rest_framework import serializers

from .models import (
    TuitionClassSlot,
    TuitionMonthClassDate,
    TuitionMonthSnapshot,
    TuitionNote,
    TuitionPayment,
    TuitionStudent,
)


class NumberDecimalField(serializers.DecimalField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('coerce_to_string', False)
        super().__init__(*args, **kwargs)


class NullableDateField(serializers.DateField):
    def to_internal_value(self, value):
        if value in ('', None) and self.allow_null:
            return None
        return super().to_internal_value(value)


class UserOwnedModelSerializer(serializers.ModelSerializer):
    id = serializers.CharField(required=False)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    def _request_user(self):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            raise serializers.ValidationError('An authenticated user is required.')
        return user

    def validate(self, attrs):
        user = self._request_user()
        if self.instance is not None and self.instance.user_id != user.pk:
            raise serializers.ValidationError('This object belongs to another user.')
        return attrs

    def create(self, validated_data):
        validated_data['user'] = self._request_user()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('user', None)
        return super().update(instance, validated_data)


def sync_nested(parent, relation_name, model, items, parent_field):
    manager = getattr(parent, relation_name)
    existing = {str(item.pk): item for item in manager.all()}
    for raw_attrs in items:
        attrs = dict(raw_attrs)
        item_id = str(attrs.pop('id', '') or '')
        instance = existing.pop(item_id, None) if item_id else None
        attrs.update(user=parent.user, **{parent_field: parent})
        if instance is None:
            if item_id:
                attrs['id'] = item_id
            model.objects.create(**attrs)
        else:
            for field, value in attrs.items():
                setattr(instance, field, value)
            instance.save()
    if existing:
        model.objects.filter(pk__in=existing).delete()


class TuitionClassSlotSerializer(UserOwnedModelSerializer):
    class Meta:
        model = TuitionClassSlot
        fields = ['id', 'order', 'date', 'completed', 'createdAt', 'updatedAt']

    def validate(self, attrs):
        attrs = super().validate(attrs)
        date = attrs.get('date', getattr(self.instance, 'date', None))
        attrs['completed'] = bool(date)
        return attrs


class TuitionNoteSerializer(UserOwnedModelSerializer):
    class Meta:
        model = TuitionNote
        fields = ['id', 'content', 'createdAt', 'updatedAt']


class TuitionMonthClassDateSerializer(UserOwnedModelSerializer):
    class Meta:
        model = TuitionMonthClassDate
        fields = ['id', 'order', 'date', 'createdAt', 'updatedAt']


class TuitionMonthSnapshotSerializer(UserOwnedModelSerializer):
    activeMonth = serializers.CharField(source='active_month')
    plannedClasses = serializers.IntegerField(source='planned_classes')
    completedClasses = serializers.IntegerField(source='completed_classes')
    classDates = TuitionMonthClassDateSerializer(
        source='class_dates', many=True, required=False
    )
    monthlySalary = NumberDecimalField(
        source='monthly_salary', max_digits=12, decimal_places=2
    )
    earnedAmount = NumberDecimalField(source='earned_amount', max_digits=12, decimal_places=2)
    lastPaidDate = NullableDateField(
        source='last_paid_date', required=False, allow_null=True
    )
    progressPercent = serializers.IntegerField(source='progress_percent')
    closedAt = serializers.DateTimeField(source='closed_at')

    class Meta:
        model = TuitionMonthSnapshot
        fields = [
            'id',
            'activeMonth',
            'month',
            'year',
            'plannedClasses',
            'completedClasses',
            'classDates',
            'monthlySalary',
            'earnedAmount',
            'lastPaidDate',
            'progressPercent',
            'closedAt',
            'createdAt',
            'updatedAt',
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        planned = attrs.get('planned_classes', getattr(self.instance, 'planned_classes', 0))
        completed = attrs.get('completed_classes', getattr(self.instance, 'completed_classes', 0))
        if completed > planned:
            raise serializers.ValidationError(
                {'completedClasses': 'Cannot exceed plannedClasses.'}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        class_dates = validated_data.pop('class_dates', [])
        snapshot = super().create(validated_data)
        sync_nested(
            snapshot,
            'class_dates',
            TuitionMonthClassDate,
            class_dates,
            'snapshot',
        )
        return snapshot

    @transaction.atomic
    def update(self, instance, validated_data):
        class_dates = validated_data.pop('class_dates', None)
        snapshot = super().update(instance, validated_data)
        if class_dates is not None:
            sync_nested(
                snapshot,
                'class_dates',
                TuitionMonthClassDate,
                class_dates,
                'snapshot',
            )
        return snapshot


class TuitionPaymentSerializer(UserOwnedModelSerializer):
    studentId = serializers.CharField(source='student_id')
    billingMonth = serializers.CharField(source='billing_month')
    amount = NumberDecimalField(max_digits=12, decimal_places=2)
    dueDate = NullableDateField(source='due_date', required=False, allow_null=True)
    paidDate = NullableDateField(source='paid_date', required=False, allow_null=True)
    paymentMethod = serializers.CharField(
        source='payment_method', required=False, allow_blank=True
    )

    class Meta:
        model = TuitionPayment
        fields = [
            'id',
            'studentId',
            'billingMonth',
            'amount',
            'dueDate',
            'paidDate',
            'status',
            'paymentMethod',
            'reference',
            'notes',
            'createdAt',
            'updatedAt',
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        student_id = attrs.get('student_id')
        if student_id:
            student = TuitionStudent.objects.filter(pk=student_id).first()
            if student and student.user_id != self._request_user().pk:
                raise serializers.ValidationError({'studentId': 'Invalid tuition student.'})
        return attrs

    def create(self, validated_data):
        user = self._request_user()
        try:
            student = TuitionStudent.objects.get(
                pk=validated_data.pop('student_id'), user=user
            )
        except TuitionStudent.DoesNotExist as exc:
            raise serializers.ValidationError({'studentId': 'Invalid tuition student.'}) from exc
        validated_data['student'] = student
        return super().create(validated_data)


class TuitionStudentSerializer(UserOwnedModelSerializer):
    studentName = serializers.CharField(source='student_name')
    classGrade = serializers.CharField(source='class_grade', required=False, allow_blank=True)
    academicLevel = serializers.CharField(source='class_grade', read_only=True)
    guardianContact = serializers.CharField(
        source='guardian_contact', required=False, allow_blank=True
    )
    monthlyPlannedClasses = serializers.IntegerField(source='monthly_planned_classes')
    monthlyClasses = serializers.IntegerField(source='monthly_planned_classes', read_only=True)
    monthlySalary = NumberDecimalField(
        source='monthly_salary', max_digits=12, decimal_places=2
    )
    startDate = serializers.DateField(source='start_date')
    lastPaidDate = NullableDateField(
        source='last_paid_date', required=False, allow_null=True
    )
    paymentStatus = serializers.CharField(source='payment_status')
    cardColor = serializers.CharField(source='card_color')
    activeMonth = serializers.CharField(source='active_month', required=False)
    classSlots = TuitionClassSlotSerializer(source='class_slots', many=True, required=False)
    notes = TuitionNoteSerializer(many=True, required=False)
    monthHistory = TuitionMonthSnapshotSerializer(
        source='month_history', many=True, required=False
    )

    class Meta:
        model = TuitionStudent
        fields = [
            'id',
            'studentName',
            'subject',
            'classGrade',
            'academicLevel',
            'guardianContact',
            'monthlyPlannedClasses',
            'monthlyClasses',
            'monthlySalary',
            'currency',
            'startDate',
            'lastPaidDate',
            'paymentStatus',
            'cardColor',
            'description',
            'activeMonth',
            'classSlots',
            'notes',
            'monthHistory',
            'createdAt',
            'updatedAt',
        ]

    def to_internal_value(self, data):
        data = data.copy()
        if not data.get('classGrade') and data.get('academicLevel'):
            data['classGrade'] = data['academicLevel']
        if not data.get('monthlyPlannedClasses') and data.get('monthlyClasses'):
            data['monthlyPlannedClasses'] = data['monthlyClasses']
        return super().to_internal_value(data)

    def _sync_slots_for_count(self, student):
        planned = student.monthly_planned_classes
        student.class_slots.filter(order__gt=planned).delete()
        existing_orders = set(student.class_slots.values_list('order', flat=True))
        TuitionClassSlot.objects.bulk_create(
            [
                TuitionClassSlot(user=student.user, student=student, order=order)
                for order in range(1, planned + 1)
                if order not in existing_orders
            ]
        )

    def _sync_month_history(self, student, snapshots):
        existing = {str(item.pk): item for item in student.month_history.all()}
        for raw_attrs in snapshots:
            attrs = dict(raw_attrs)
            class_dates = attrs.pop('class_dates', [])
            snapshot_id = str(attrs.pop('id', '') or '')
            snapshot = existing.pop(snapshot_id, None) if snapshot_id else None
            attrs.update(user=student.user, student=student)
            if snapshot is None:
                if snapshot_id:
                    attrs['id'] = snapshot_id
                snapshot = TuitionMonthSnapshot.objects.create(**attrs)
            else:
                for field, value in attrs.items():
                    setattr(snapshot, field, value)
                snapshot.save()
            sync_nested(
                snapshot,
                'class_dates',
                TuitionMonthClassDate,
                class_dates,
                'snapshot',
            )
        if existing:
            TuitionMonthSnapshot.objects.filter(pk__in=existing).delete()

    @transaction.atomic
    def create(self, validated_data):
        class_slots = validated_data.pop('class_slots', None)
        notes = validated_data.pop('notes', [])
        month_history = validated_data.pop('month_history', [])
        student = super().create(validated_data)
        if class_slots is None:
            self._sync_slots_for_count(student)
        else:
            sync_nested(student, 'class_slots', TuitionClassSlot, class_slots, 'student')
        sync_nested(student, 'notes', TuitionNote, notes, 'student')
        self._sync_month_history(student, month_history)
        return student

    @transaction.atomic
    def update(self, instance, validated_data):
        class_slots = validated_data.pop('class_slots', None)
        notes = validated_data.pop('notes', None)
        month_history = validated_data.pop('month_history', None)
        student = super().update(instance, validated_data)
        if class_slots is None:
            self._sync_slots_for_count(student)
        else:
            sync_nested(student, 'class_slots', TuitionClassSlot, class_slots, 'student')
        if notes is not None:
            sync_nested(student, 'notes', TuitionNote, notes, 'student')
        if month_history is not None:
            self._sync_month_history(student, month_history)
        return student
