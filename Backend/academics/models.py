import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.db.models import F, Q


def generate_id():
    """Return a client-safe string identifier while accepting legacy frontend IDs."""
    return uuid.uuid4().hex


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


class Course(UserOwnedModel):
    class CourseType(models.TextChoices):
        THEORY = 'theory', 'Theory'
        LAB = 'lab', 'Lab'
        SESSIONAL = 'sessional', 'Sessional'
        TUTORIAL = 'tutorial', 'Tutorial'

    class Source(models.TextChoices):
        MANUAL = 'manual', 'Manual'
        OCR_IMPORT = 'ocr-import', 'OCR import'
        CUET = 'cuet', 'CUET result portal'

    course_id = models.CharField(max_length=32)
    course_title = models.CharField(max_length=255)
    credit = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=3,
        validators=[MinValueValidator(0)],
    )
    course_type = models.CharField(
        max_length=16,
        choices=CourseType.choices,
        default=CourseType.THEORY,
    )
    faculty = models.CharField(max_length=255, blank=True)
    semester = models.CharField(max_length=100, blank=True)
    group = models.CharField(max_length=32, blank=True)
    section = models.CharField(max_length=32, blank=True)
    color = models.CharField(max_length=7, default='#4F46E5', validators=[color_validator])
    missed_classes = models.PositiveIntegerField(default=0)
    total_classes = models.PositiveIntegerField(default=0)
    attended_classes = models.PositiveIntegerField(default=0)
    assessment_applicable = models.BooleanField(default=True)
    best_assessment_count = models.PositiveSmallIntegerField(default=3)
    requires_review = models.BooleanField(default=False)
    source = models.CharField(max_length=16, choices=Source.choices, default=Source.MANUAL)
    import_id = models.CharField(max_length=128, blank=True)

    class Meta:
        ordering = ['course_id', 'course_title']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'course_id', 'semester'],
                name='academic_unique_user_course_semester',
            ),
            models.CheckConstraint(
                condition=Q(credit__gte=0),
                name='academic_course_credit_nonnegative',
            ),
            models.CheckConstraint(
                condition=Q(attended_classes__lte=F('total_classes')),
                name='academic_course_attended_lte_total',
            ),
        ]
        indexes = [models.Index(fields=['user', 'semester', 'course_id'])]

    def __str__(self):
        return f'{self.course_id} - {self.course_title}'


class AttendanceRecord(UserOwnedModel):
    class Status(models.TextChoices):
        ATTENDED = 'attended', 'Attended'
        MISSED = 'missed', 'Missed'

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='history')
    date = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices)
    class_type = models.CharField(
        max_length=16,
        choices=Course.CourseType.choices,
        default=Course.CourseType.THEORY,
    )
    reason = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [models.Index(fields=['user', 'course', '-date'])]

    def __str__(self):
        return f'{self.course.course_id}: {self.status} on {self.date}'


class CourseAssessment(UserOwnedModel):
    class AssessmentType(models.TextChoices):
        CLASS_TEST = 'CT', 'Class test'
        ASSIGNMENT = 'assignment', 'Assignment'
        EXAMINATION = 'examination', 'Examination'

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='assessments')
    name = models.CharField(max_length=255)
    assessment_type = models.CharField(
        max_length=16,
        choices=AssessmentType.choices,
        default=AssessmentType.CLASS_TEST,
    )
    total_marks = models.DecimalField(max_digits=7, decimal_places=2, default=20)
    expected_marks = models.DecimalField(max_digits=7, decimal_places=2, default=20)
    obtained_marks = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    date = models.DateField()
    is_missed = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['date', 'created_at']
        constraints = [
            models.CheckConstraint(
                condition=Q(total_marks__gte=0)
                & Q(expected_marks__gte=0)
                & Q(obtained_marks__gte=0),
                name='academic_course_marks_nonnegative',
            ),
            models.CheckConstraint(
                condition=Q(expected_marks__lte=F('total_marks')),
                name='academic_expected_marks_lte_total',
            ),
            models.CheckConstraint(
                condition=Q(obtained_marks__lte=F('total_marks')),
                name='academic_obtained_marks_lte_total',
            ),
        ]

    def __str__(self):
        return f'{self.course.course_id} - {self.name}'


class Routine(UserOwnedModel):
    class DayOfWeek(models.TextChoices):
        SUNDAY = 'Sunday', 'Sunday'
        MONDAY = 'Monday', 'Monday'
        TUESDAY = 'Tuesday', 'Tuesday'
        WEDNESDAY = 'Wednesday', 'Wednesday'
        THURSDAY = 'Thursday', 'Thursday'
        FRIDAY = 'Friday', 'Friday'
        SATURDAY = 'Saturday', 'Saturday'

    class ClassType(models.TextChoices):
        LECTURE = 'lecture', 'Lecture'
        THEORY = 'theory', 'Theory'
        LAB = 'lab', 'Lab'
        SESSIONAL = 'sessional', 'Sessional'
        TUTORIAL = 'tutorial', 'Tutorial'

    class Source(models.TextChoices):
        MANUAL = 'manual', 'Manual'
        OCR_IMPORT = 'ocr-import', 'OCR import'

    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        related_name='routine_slots',
        null=True,
        blank=True,
    )
    course_code = models.CharField(max_length=32)
    course_title = models.CharField(max_length=255)
    faculty = models.CharField(max_length=255, blank=True)
    teacher_name = models.CharField(max_length=255, blank=True)
    credit = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    course_type = models.CharField(
        max_length=16,
        choices=Course.CourseType.choices,
        default=Course.CourseType.THEORY,
    )
    class_type = models.CharField(
        max_length=16,
        choices=ClassType.choices,
        default=ClassType.LECTURE,
    )
    day_of_week = models.CharField(max_length=9, choices=DayOfWeek.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(max_length=100, blank=True)
    building = models.CharField(max_length=150, blank=True)
    group = models.CharField(max_length=32, blank=True)
    section = models.CharField(max_length=32, blank=True)
    is_common = models.BooleanField(default=False)
    repeat_weekly = models.BooleanField(default=True)
    effective_start_date = models.DateField(null=True, blank=True)
    effective_end_date = models.DateField(null=True, blank=True)
    color = models.CharField(max_length=7, default='#4F46E5', validators=[color_validator])
    notes = models.TextField(blank=True)
    source = models.CharField(max_length=16, choices=Source.choices, default=Source.MANUAL)
    import_id = models.CharField(max_length=128, blank=True)
    manually_edited = models.BooleanField(default=False)

    class Meta:
        ordering = ['day_of_week', 'start_time', 'course_code']
        constraints = [
            models.CheckConstraint(
                condition=Q(end_time__gt=F('start_time')),
                name='academic_routine_end_after_start',
            ),
            models.CheckConstraint(
                condition=Q(effective_start_date__isnull=True)
                | Q(effective_end_date__isnull=True)
                | Q(effective_end_date__gte=F('effective_start_date')),
                name='academic_routine_effective_dates_valid',
            ),
        ]
        indexes = [models.Index(fields=['user', 'day_of_week', 'start_time'])]

    def __str__(self):
        return f'{self.course_code} on {self.day_of_week} at {self.start_time:%H:%M}'


class AssessmentEvent(UserOwnedModel):
    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'

    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        related_name='assessment_events',
        null=True,
        blank=True,
    )
    course_code = models.CharField(max_length=32)
    course_title = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    assessment_type = models.CharField(max_length=16, choices=CourseAssessment.AssessmentType.choices)
    date = models.DateField(null=True, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    start_at = models.DateTimeField(null=True, blank=True)
    end_at = models.DateTimeField(null=True, blank=True)
    deadline_date = models.DateField(null=True, blank=True)
    deadline_time = models.TimeField(null=True, blank=True)
    deadline_at = models.DateTimeField(null=True, blank=True)
    syllabus = models.TextField(blank=True)
    details = models.TextField(blank=True)
    marks = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    submission_method = models.CharField(max_length=255, blank=True)
    priority = models.CharField(max_length=8, choices=Priority.choices, default=Priority.MEDIUM)
    reminder_time = models.CharField(max_length=20, default='24h')
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['date', 'deadline_date', 'start_time']
        constraints = [
            models.CheckConstraint(
                condition=Q(marks__isnull=True) | Q(marks__gte=0),
                name='academic_event_marks_nonnegative',
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'assessment_type', 'date']),
            models.Index(fields=['user', 'deadline_date']),
        ]

    def __str__(self):
        return f'{self.course_code} - {self.title}'


class AssessmentAttachment(UserOwnedModel):
    assessment = models.ForeignKey(
        AssessmentEvent,
        on_delete=models.CASCADE,
        related_name='attachments',
    )
    name = models.CharField(max_length=255)
    size = models.CharField(max_length=40, blank=True)
    mime_type = models.CharField(max_length=255, blank=True)
    storage_path = models.CharField(max_length=1024, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return self.name


class AssessmentLink(UserOwnedModel):
    assessment = models.ForeignKey(
        AssessmentEvent,
        on_delete=models.CASCADE,
        related_name='links',
    )
    label = models.CharField(max_length=255)
    url = models.URLField(max_length=2048)
    link_type = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return self.label


class AcademicResult(UserOwnedModel):
    student_id = models.CharField(max_length=64)
    student_name = models.CharField(max_length=255)
    department = models.CharField(max_length=255, blank=True)
    batch = models.CharField(max_length=32, blank=True)
    overall_cgpa = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(4)],
    )
    calculated_cgpa = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(4)],
    )
    completed_credits = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    attempted_credits = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    quality_points = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    highest_gpa = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    total_semesters = models.PositiveSmallIntegerField(default=0)
    failed_courses_count = models.PositiveSmallIntegerField(default=0)
    cleared_courses_count = models.PositiveSmallIntegerField(default=0)
    failed_courses = models.JSONField(default=list, blank=True)
    fetched_at = models.DateTimeField()
    source = models.CharField(max_length=100, default='CUET Result Portal')
    schema_version = models.CharField(max_length=20, default='1.0.0')
    is_saved_copy = models.BooleanField(default=False)

    class Meta:
        ordering = ['-fetched_at']
        constraints = [
            models.CheckConstraint(
                condition=Q(calculated_cgpa__gte=0) & Q(calculated_cgpa__lte=4),
                name='academic_result_cgpa_valid',
            ),
        ]

    def __str__(self):
        return f'{self.student_id} - {self.calculated_cgpa}'


class Semester(UserOwnedModel):
    academic_result = models.ForeignKey(
        AcademicResult,
        on_delete=models.CASCADE,
        related_name='semesters',
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=150)
    completed = models.BooleanField(default=True)
    term = models.CharField(max_length=100, blank=True)
    level = models.CharField(max_length=50, blank=True)
    year = models.CharField(max_length=20, blank=True)
    gpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    calculated_gpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    attempted_credits = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    completed_credits = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'created_at']
        constraints = [
            models.CheckConstraint(
                condition=(Q(gpa__isnull=True) | (Q(gpa__gte=0) & Q(gpa__lte=4)))
                & (
                    Q(calculated_gpa__isnull=True)
                    | (Q(calculated_gpa__gte=0) & Q(calculated_gpa__lte=4))
                ),
                name='academic_semester_gpa_valid',
            ),
        ]

    def __str__(self):
        return self.name


class SemesterCourse(UserOwnedModel):
    class Status(models.TextChoices):
        PASSED = 'Passed', 'Passed'
        FAILED = 'Failed', 'Failed'
        INCOMPLETE = 'Incomplete', 'Incomplete'
        REPEATED = 'Repeated', 'Repeated'

    class ResultCourseType(models.TextChoices):
        THEORY = 'Theory', 'Theory'
        LAB = 'Lab', 'Lab'

    class Source(models.TextChoices):
        MANUAL = 'manual', 'Manual'
        CUET = 'cuet', 'CUET result portal'

    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='courses')
    course_code = models.CharField(max_length=32)
    course_title = models.CharField(max_length=255)
    credit = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    letter_grade = models.CharField(max_length=4, blank=True)
    grade_point = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    quality_points = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PASSED)
    is_repeated = models.BooleanField(default=False)
    course_type = models.CharField(
        max_length=10,
        choices=ResultCourseType.choices,
        default=ResultCourseType.THEORY,
    )
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.MANUAL)

    class Meta:
        ordering = ['course_code']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'semester', 'course_code'],
                name='academic_unique_semester_course',
            ),
            models.CheckConstraint(
                condition=Q(credit__gte=0)
                & Q(grade_point__gte=0)
                & Q(grade_point__lte=4)
                & Q(quality_points__gte=0),
                name='academic_semester_course_values_valid',
            ),
        ]

    def __str__(self):
        return f'{self.course_code} ({self.letter_grade or "ungraded"})'


class ArchivedRoutineEvent(UserOwnedModel):
    semester_id = models.CharField(max_length=128, default='Previous Semester')
    source = models.CharField(max_length=32, default='archived-routine')
    read_only = models.BooleanField(default=True)
    archived_at = models.DateTimeField()
    course_id = models.CharField(max_length=32)
    course_title = models.CharField(max_length=255)
    class_type = models.CharField(max_length=16, choices=Routine.ClassType.choices)
    date = models.DateField()
    day_of_week = models.CharField(max_length=9, choices=Routine.DayOfWeek.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(max_length=100, blank=True)
    building = models.CharField(max_length=150, blank=True)
    faculty = models.CharField(max_length=255, blank=True)
    color = models.CharField(max_length=7, default='#64748B', validators=[color_validator])

    class Meta:
        ordering = ['-date', 'start_time']
        indexes = [models.Index(fields=['user', 'semester_id', '-date'])]

    def __str__(self):
        return f'{self.course_id} archived on {self.date}'


class RoutineImport(UserOwnedModel):
    import_id = models.CharField(max_length=128)
    source_file_name = models.CharField(max_length=255)
    source_file_type = models.CharField(max_length=255, blank=True)
    source_file_page_count = models.PositiveIntegerField(default=1)
    detected_groups = models.JSONField(default=list, blank=True)
    warnings = models.JSONField(default=list, blank=True)
    raw_text_reference = models.CharField(max_length=1024, null=True, blank=True)
    selected_group = models.CharField(max_length=32, blank=True)
    section = models.CharField(max_length=32, blank=True)
    created_routine_ids = models.JSONField(default=list, blank=True)
    created_course_ids = models.JSONField(default=list, blank=True)
    replaced_routines = models.JSONField(default=list, blank=True)
    replaced_courses = models.JSONField(default=list, blank=True)
    undone_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'import_id'],
                name='academic_unique_user_routine_import',
            ),
        ]

    def __str__(self):
        return f'{self.source_file_name} ({self.import_id})'
