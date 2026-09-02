import uuid

from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


def generate_id():
    return uuid.uuid4().hex


def current_month():
    return timezone.localdate().strftime('%Y-%m')


month_validator = RegexValidator(
    regex=r'^\d{4}-(0[1-9]|1[0-2])$',
    message='Use YYYY-MM format.',
)
color_validator = RegexValidator(
    regex=r'^#[0-9A-Fa-f]{6}$',
    message='Use a six-digit hexadecimal color such as #4F46E5.',
)


class UserOwnedModel(models.Model):
    id = models.CharField(primary_key=True, max_length=128, default=generate_id)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='%(app_label)s_%(class)s_records',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TuitionStudent(UserOwnedModel):
    class PaymentStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PARTIAL = 'partial', 'Partially paid'
        PAID = 'paid', 'Paid'
        OVERDUE = 'overdue', 'Overdue'

    student_name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    class_grade = models.CharField(max_length=150, blank=True)
    guardian_contact = models.CharField(max_length=255, blank=True)
    monthly_planned_classes = models.PositiveSmallIntegerField(default=12)
    monthly_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=8000,
        validators=[MinValueValidator(0)],
    )
    currency = models.CharField(max_length=3, default='BDT')
    start_date = models.DateField()
    last_paid_date = models.DateField(null=True, blank=True)
    payment_status = models.CharField(
        max_length=10,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    card_color = models.CharField(max_length=7, default='#4F46E5', validators=[color_validator])
    description = models.TextField(blank=True)
    active_month = models.CharField(max_length=7, default=current_month, validators=[month_validator])

    class Meta:
        ordering = ['student_name']
        constraints = [
            models.CheckConstraint(
                condition=Q(monthly_planned_classes__gte=1),
                name='tuition_planned_classes_positive',
            ),
            models.CheckConstraint(
                condition=Q(monthly_salary__gte=0),
                name='tuition_salary_nonnegative',
            ),
        ]
        indexes = [models.Index(fields=['user', 'payment_status', 'student_name'])]

    def __str__(self):
        return f'{self.student_name} - {self.subject}'


class TuitionClassSlot(UserOwnedModel):
    student = models.ForeignKey(
        TuitionStudent,
        on_delete=models.CASCADE,
        related_name='class_slots',
    )
    order = models.PositiveSmallIntegerField()
    date = models.DateField(null=True, blank=True)
    completed = models.BooleanField(default=False)

    class Meta:
        ordering = ['order']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'student', 'order'],
                name='tuition_unique_student_slot_order',
            ),
            models.CheckConstraint(
                condition=Q(order__gte=1),
                name='tuition_slot_order_positive',
            ),
        ]

    def __str__(self):
        return f'{self.student.student_name} - class {self.order}'


class TuitionNote(UserOwnedModel):
    student = models.ForeignKey(TuitionStudent, on_delete=models.CASCADE, related_name='notes')
    content = models.TextField()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Note for {self.student.student_name}'


class TuitionMonthSnapshot(UserOwnedModel):
    student = models.ForeignKey(
        TuitionStudent,
        on_delete=models.CASCADE,
        related_name='month_history',
    )
    active_month = models.CharField(max_length=7, validators=[month_validator])
    month = models.CharField(max_length=12)
    year = models.PositiveSmallIntegerField()
    planned_classes = models.PositiveSmallIntegerField()
    completed_classes = models.PositiveSmallIntegerField()
    monthly_salary = models.DecimalField(max_digits=12, decimal_places=2)
    earned_amount = models.DecimalField(max_digits=12, decimal_places=2)
    last_paid_date = models.DateField(null=True, blank=True)
    progress_percent = models.PositiveSmallIntegerField(default=0)
    closed_at = models.DateTimeField()

    class Meta:
        ordering = ['-active_month']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'student', 'active_month'],
                name='tuition_unique_student_month_snapshot',
            ),
            models.CheckConstraint(
                condition=Q(completed_classes__lte=models.F('planned_classes')),
                name='tuition_snapshot_completed_lte_planned',
            ),
            models.CheckConstraint(
                condition=Q(progress_percent__gte=0) & Q(progress_percent__lte=100),
                name='tuition_snapshot_progress_valid',
            ),
        ]

    def __str__(self):
        return f'{self.student.student_name} - {self.active_month}'


class TuitionMonthClassDate(UserOwnedModel):
    snapshot = models.ForeignKey(
        TuitionMonthSnapshot,
        on_delete=models.CASCADE,
        related_name='class_dates',
    )
    order = models.PositiveSmallIntegerField()
    date = models.DateField()

    class Meta:
        ordering = ['order']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'snapshot', 'order'],
                name='tuition_unique_snapshot_class_order',
            ),
        ]

    def __str__(self):
        return f'{self.snapshot.active_month} - class {self.order}'


class TuitionPayment(UserOwnedModel):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PARTIAL = 'partial', 'Partially paid'
        PAID = 'paid', 'Paid'
        OVERDUE = 'overdue', 'Overdue'
        REFUNDED = 'refunded', 'Refunded'

    student = models.ForeignKey(
        TuitionStudent,
        on_delete=models.CASCADE,
        related_name='payments',
    )
    billing_month = models.CharField(max_length=7, validators=[month_validator])
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField(null=True, blank=True)
    paid_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField(max_length=100, blank=True)
    reference = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-billing_month', '-paid_date']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'student', 'billing_month'],
                name='tuition_unique_student_billing_month',
            ),
            models.CheckConstraint(
                condition=Q(amount__gte=0),
                name='tuition_payment_amount_nonnegative',
            ),
        ]

    def __str__(self):
        return f'{self.student.student_name} - {self.billing_month} ({self.status})'
