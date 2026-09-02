from django.db import transaction
from rest_framework import serializers

from .models import (
    AcademicResult,
    ArchivedRoutineEvent,
    AssessmentAttachment,
    AssessmentEvent,
    AssessmentLink,
    AttendanceRecord,
    Course,
    CourseAssessment,
    Routine,
    RoutineImport,
    Semester,
    SemesterCourse,
)


class FrontendTimeField(serializers.TimeField):
    def __init__(self, **kwargs):
        kwargs.setdefault('format', '%H:%M')
        kwargs.setdefault('input_formats', ['%H:%M', '%H:%M:%S'])
        super().__init__(**kwargs)

    def to_internal_value(self, value):
        if value in ('', None) and self.allow_null:
            return None
        return super().to_internal_value(value)


class FrontendDateField(serializers.DateField):
    def to_internal_value(self, value):
        if value in ('', None) and self.allow_null:
            return None
        return super().to_internal_value(value)


class FrontendDateTimeField(serializers.DateTimeField):
    def to_internal_value(self, value):
        if value in ('', None) and self.allow_null:
            return None
        return super().to_internal_value(value)


class NumberDecimalField(serializers.DecimalField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('coerce_to_string', False)
        super().__init__(*args, **kwargs)


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
    """Upsert an authoritative nested list and remove omitted child rows."""
    manager = getattr(parent, relation_name)
    existing = {str(item.pk): item for item in manager.all()}

    for raw_attrs in items:
        attrs = dict(raw_attrs)
        item_id = str(attrs.pop('id', '') or '')
        instance = existing.pop(item_id, None) if item_id else None
        attrs['user'] = parent.user
        attrs[parent_field] = parent

        if instance is None:
            if item_id:
                attrs['id'] = item_id
            model.objects.create(**attrs)
            continue

        for field, value in attrs.items():
            setattr(instance, field, value)
        instance.save()

    if existing:
        model.objects.filter(pk__in=existing).delete()


class AttendanceRecordSerializer(UserOwnedModelSerializer):
    courseId = serializers.CharField(source='course_id', read_only=True)
    classType = serializers.CharField(source='class_type')

    class Meta:
        model = AttendanceRecord
        fields = [
            'id',
            'courseId',
            'date',
            'status',
            'classType',
            'reason',
            'createdAt',
            'updatedAt',
        ]


class CourseAssessmentSerializer(UserOwnedModelSerializer):
    type = serializers.CharField(source='assessment_type')
    totalMarks = NumberDecimalField(source='total_marks', max_digits=7, decimal_places=2)
    expectedMarks = NumberDecimalField(source='expected_marks', max_digits=7, decimal_places=2)
    obtainedMarks = NumberDecimalField(source='obtained_marks', max_digits=7, decimal_places=2)
    isMissed = serializers.BooleanField(source='is_missed')

    class Meta:
        model = CourseAssessment
        fields = [
            'id',
            'name',
            'type',
            'totalMarks',
            'expectedMarks',
            'obtainedMarks',
            'date',
            'isMissed',
            'notes',
            'createdAt',
            'updatedAt',
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        total = attrs.get('total_marks', getattr(self.instance, 'total_marks', None))
        expected = attrs.get('expected_marks', getattr(self.instance, 'expected_marks', None))
        obtained = attrs.get('obtained_marks', getattr(self.instance, 'obtained_marks', None))
        if total is not None and expected is not None and expected > total:
            raise serializers.ValidationError({'expectedMarks': 'Cannot exceed total marks.'})
        if total is not None and obtained is not None and obtained > total:
            raise serializers.ValidationError({'obtainedMarks': 'Cannot exceed total marks.'})
        if attrs.get('is_missed'):
            attrs['obtained_marks'] = 0
        return attrs


class CourseSerializer(UserOwnedModelSerializer):
    courseId = serializers.CharField(source='course_id')
    courseTitle = serializers.CharField(source='course_title')
    credit = NumberDecimalField(max_digits=5, decimal_places=2)
    courseType = serializers.CharField(source='course_type')
    missedClasses = serializers.IntegerField(source='missed_classes', required=False)
    totalClasses = serializers.IntegerField(source='total_classes', required=False)
    attendedClasses = serializers.IntegerField(source='attended_classes', required=False)
    assessmentApplicable = serializers.BooleanField(source='assessment_applicable', required=False)
    bestAssessmentCount = serializers.IntegerField(source='best_assessment_count', required=False)
    requiresReview = serializers.BooleanField(source='requires_review', required=False)
    importId = serializers.CharField(source='import_id', required=False, allow_blank=True)
    history = AttendanceRecordSerializer(many=True, required=False)
    assessments = CourseAssessmentSerializer(many=True, required=False)

    class Meta:
        model = Course
        fields = [
            'id',
            'courseId',
            'courseTitle',
            'credit',
            'courseType',
            'faculty',
            'semester',
            'group',
            'section',
            'color',
            'missedClasses',
            'totalClasses',
            'attendedClasses',
            'assessmentApplicable',
            'bestAssessmentCount',
            'requiresReview',
            'source',
            'importId',
            'history',
            'assessments',
            'createdAt',
            'updatedAt',
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        course_type = attrs.get('course_type', getattr(self.instance, 'course_type', 'theory'))
        credit = attrs.get('credit', getattr(self.instance, 'credit', 0))
        if course_type == Course.CourseType.THEORY and credit not in (2, 3):
            raise serializers.ValidationError({'credit': 'Theory courses must have 2.00 or 3.00 credits.'})
        if course_type in (Course.CourseType.LAB, Course.CourseType.SESSIONAL) and credit not in (0.75, 1.5):
            raise serializers.ValidationError(
                {'credit': 'Lab and sessional courses must have 0.75 or 1.50 credits.'}
            )
        if course_type != Course.CourseType.THEORY:
            attrs['assessment_applicable'] = False
            attrs['best_assessment_count'] = 0
        else:
            attrs.setdefault('assessment_applicable', True)
            attrs.setdefault('best_assessment_count', 2 if credit == 2 else 3)
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        history = validated_data.pop('history', [])
        assessments = validated_data.pop('assessments', [])
        course = super().create(validated_data)
        sync_nested(course, 'history', AttendanceRecord, history, 'course')
        sync_nested(course, 'assessments', CourseAssessment, assessments, 'course')
        if history:
            course.missed_classes = course.history.filter(status=AttendanceRecord.Status.MISSED).count()
            course.save(update_fields=['missed_classes', 'updated_at'])
        return course

    @transaction.atomic
    def update(self, instance, validated_data):
        history = validated_data.pop('history', None)
        assessments = validated_data.pop('assessments', None)
        course = super().update(instance, validated_data)
        if history is not None:
            sync_nested(course, 'history', AttendanceRecord, history, 'course')
            course.missed_classes = course.history.filter(status=AttendanceRecord.Status.MISSED).count()
            course.save(update_fields=['missed_classes', 'updated_at'])
        if assessments is not None:
            sync_nested(course, 'assessments', CourseAssessment, assessments, 'course')
        return course


class CourseLinkedSerializer(UserOwnedModelSerializer):
    def _attach_course(self, validated_data):
        user = self._request_user()
        course_code = validated_data.get('course_code')
        if course_code:
            validated_data['course'] = (
                Course.objects.filter(user=user, course_id=course_code)
                .order_by('-created_at')
                .first()
            )
        return validated_data

    def create(self, validated_data):
        return super().create(self._attach_course(validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, self._attach_course(validated_data))

    class Meta:
        abstract = True


class RoutineSerializer(CourseLinkedSerializer):
    courseId = serializers.CharField(source='course_code')
    courseTitle = serializers.CharField(source='course_title')
    teacherName = serializers.CharField(source='teacher_name', required=False, allow_blank=True)
    credit = NumberDecimalField(max_digits=5, decimal_places=2, required=False)
    courseType = serializers.CharField(source='course_type', required=False)
    classType = serializers.CharField(source='class_type')
    dayOfWeek = serializers.CharField(source='day_of_week')
    startTime = FrontendTimeField(source='start_time')
    endTime = FrontendTimeField(source='end_time')
    isCommon = serializers.BooleanField(source='is_common', required=False)
    repeatWeekly = serializers.BooleanField(source='repeat_weekly', required=False)
    effectiveStartDate = FrontendDateField(
        source='effective_start_date', required=False, allow_null=True
    )
    effectiveEndDate = FrontendDateField(
        source='effective_end_date', required=False, allow_null=True
    )
    importId = serializers.CharField(source='import_id', required=False, allow_blank=True)
    manuallyEdited = serializers.BooleanField(source='manually_edited', required=False)

    class Meta:
        model = Routine
        fields = [
            'id',
            'courseId',
            'courseTitle',
            'faculty',
            'teacherName',
            'credit',
            'courseType',
            'classType',
            'dayOfWeek',
            'startTime',
            'endTime',
            'room',
            'building',
            'group',
            'section',
            'isCommon',
            'repeatWeekly',
            'effectiveStartDate',
            'effectiveEndDate',
            'color',
            'notes',
            'source',
            'importId',
            'manuallyEdited',
            'createdAt',
            'updatedAt',
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        start = attrs.get('start_time', getattr(self.instance, 'start_time', None))
        end = attrs.get('end_time', getattr(self.instance, 'end_time', None))
        if start and end and end <= start:
            raise serializers.ValidationError({'endTime': 'Must be later than startTime.'})
        effective_start = attrs.get(
            'effective_start_date', getattr(self.instance, 'effective_start_date', None)
        )
        effective_end = attrs.get(
            'effective_end_date', getattr(self.instance, 'effective_end_date', None)
        )
        if effective_start and effective_end and effective_end < effective_start:
            raise serializers.ValidationError(
                {'effectiveEndDate': 'Must be on or after effectiveStartDate.'}
            )
        teacher = attrs.get('teacher_name') or attrs.get('faculty')
        if teacher:
            attrs.setdefault('teacher_name', teacher)
            attrs.setdefault('faculty', teacher)
        return attrs


class AssessmentAttachmentSerializer(UserOwnedModelSerializer):
    type = serializers.CharField(source='mime_type', required=False, allow_blank=True)

    class Meta:
        model = AssessmentAttachment
        fields = ['id', 'name', 'size', 'type', 'createdAt', 'updatedAt']


class AssessmentLinkSerializer(UserOwnedModelSerializer):
    type = serializers.CharField(source='link_type', required=False, allow_blank=True)

    class Meta:
        model = AssessmentLink
        fields = ['id', 'label', 'url', 'type', 'createdAt', 'updatedAt']


class AssessmentEventSerializer(CourseLinkedSerializer):
    courseId = serializers.CharField(source='course_code')
    courseTitle = serializers.CharField(source='course_title')
    type = serializers.CharField(source='assessment_type')
    date = FrontendDateField(required=False, allow_null=True)
    startTime = FrontendTimeField(source='start_time', required=False, allow_null=True)
    endTime = FrontendTimeField(source='end_time', required=False, allow_null=True)
    startAt = FrontendDateTimeField(source='start_at', required=False, allow_null=True)
    endAt = FrontendDateTimeField(source='end_at', required=False, allow_null=True)
    deadlineDate = FrontendDateField(source='deadline_date', required=False, allow_null=True)
    deadlineTime = FrontendTimeField(source='deadline_time', required=False, allow_null=True)
    deadlineAt = FrontendDateTimeField(source='deadline_at', required=False, allow_null=True)
    marks = NumberDecimalField(max_digits=7, decimal_places=2, required=False, allow_null=True)
    submissionMethod = serializers.CharField(
        source='submission_method', required=False, allow_blank=True
    )
    reminderTime = serializers.CharField(source='reminder_time')
    attachments = AssessmentAttachmentSerializer(many=True, required=False)
    links = AssessmentLinkSerializer(many=True, required=False)

    class Meta:
        model = AssessmentEvent
        fields = [
            'id',
            'courseId',
            'courseTitle',
            'title',
            'type',
            'date',
            'startTime',
            'endTime',
            'startAt',
            'endAt',
            'deadlineDate',
            'deadlineTime',
            'deadlineAt',
            'syllabus',
            'details',
            'marks',
            'submissionMethod',
            'priority',
            'reminderTime',
            'notes',
            'attachments',
            'links',
            'createdAt',
            'updatedAt',
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        assessment_type = attrs.get(
            'assessment_type', getattr(self.instance, 'assessment_type', None)
        )
        if assessment_type == CourseAssessment.AssessmentType.ASSIGNMENT:
            if not attrs.get('deadline_date', getattr(self.instance, 'deadline_date', None)):
                raise serializers.ValidationError({'deadlineDate': 'Required for assignments.'})
            if not attrs.get('deadline_time', getattr(self.instance, 'deadline_time', None)):
                raise serializers.ValidationError({'deadlineTime': 'Required for assignments.'})
            if not attrs.get('details', getattr(self.instance, 'details', '')):
                raise serializers.ValidationError({'details': 'Required for assignments.'})
        else:
            date = attrs.get('date', getattr(self.instance, 'date', None))
            start = attrs.get('start_time', getattr(self.instance, 'start_time', None))
            end = attrs.get('end_time', getattr(self.instance, 'end_time', None))
            if not date:
                raise serializers.ValidationError({'date': 'Required for tests and examinations.'})
            if not start or not end:
                raise serializers.ValidationError({'startTime': 'Start and end times are required.'})
            if end <= start:
                raise serializers.ValidationError({'endTime': 'Must be later than startTime.'})
            if not attrs.get('syllabus', getattr(self.instance, 'syllabus', '')):
                raise serializers.ValidationError({'syllabus': 'Required for tests and examinations.'})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        attachments = validated_data.pop('attachments', [])
        links = validated_data.pop('links', [])
        assessment = super().create(validated_data)
        sync_nested(
            assessment,
            'attachments',
            AssessmentAttachment,
            attachments,
            'assessment',
        )
        sync_nested(assessment, 'links', AssessmentLink, links, 'assessment')
        return assessment

    @transaction.atomic
    def update(self, instance, validated_data):
        attachments = validated_data.pop('attachments', None)
        links = validated_data.pop('links', None)
        assessment = super().update(instance, validated_data)
        if attachments is not None:
            sync_nested(
                assessment,
                'attachments',
                AssessmentAttachment,
                attachments,
                'assessment',
            )
        if links is not None:
            sync_nested(assessment, 'links', AssessmentLink, links, 'assessment')
        return assessment


class SemesterCourseSerializer(UserOwnedModelSerializer):
    courseId = serializers.CharField(source='course_code')
    title = serializers.CharField(source='course_title')
    grade = serializers.CharField(source='letter_grade', required=False, allow_blank=True)
    courseCode = serializers.CharField(source='course_code', read_only=True)
    courseTitle = serializers.CharField(source='course_title', read_only=True)
    letterGrade = serializers.CharField(source='letter_grade', read_only=True)
    credit = NumberDecimalField(max_digits=5, decimal_places=2)
    gradePoint = NumberDecimalField(source='grade_point', max_digits=4, decimal_places=2)
    qualityPoints = NumberDecimalField(
        source='quality_points', max_digits=8, decimal_places=2, required=False
    )
    isRepeated = serializers.BooleanField(source='is_repeated', required=False)
    courseType = serializers.CharField(source='course_type', required=False)

    class Meta:
        model = SemesterCourse
        fields = [
            'id',
            'courseId',
            'title',
            'grade',
            'courseCode',
            'courseTitle',
            'letterGrade',
            'credit',
            'gradePoint',
            'qualityPoints',
            'status',
            'isRepeated',
            'courseType',
            'source',
            'createdAt',
            'updatedAt',
        ]

    def to_internal_value(self, data):
        data = data.copy()
        data.setdefault('courseId', data.get('courseCode', ''))
        data.setdefault('title', data.get('courseTitle', ''))
        data.setdefault('grade', data.get('letterGrade', ''))
        return super().to_internal_value(data)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        credit = attrs.get('credit', getattr(self.instance, 'credit', 0))
        grade_point = attrs.get('grade_point', getattr(self.instance, 'grade_point', 0))
        attrs.setdefault('quality_points', credit * grade_point)
        letter_grade = attrs.get('letter_grade', getattr(self.instance, 'letter_grade', ''))
        if letter_grade == 'F':
            attrs['status'] = SemesterCourse.Status.FAILED
        return attrs


class SemesterSerializer(UserOwnedModelSerializer):
    gpa = NumberDecimalField(max_digits=4, decimal_places=2, required=False, allow_null=True)
    calculatedGpa = NumberDecimalField(
        source='calculated_gpa',
        max_digits=4,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    attemptedCredits = NumberDecimalField(
        source='attempted_credits', max_digits=8, decimal_places=2, required=False
    )
    completedCredits = NumberDecimalField(
        source='completed_credits', max_digits=8, decimal_places=2, required=False
    )
    sortOrder = serializers.IntegerField(source='sort_order', required=False)
    courses = SemesterCourseSerializer(many=True, required=False)

    class Meta:
        model = Semester
        fields = [
            'id',
            'name',
            'completed',
            'term',
            'level',
            'year',
            'gpa',
            'calculatedGpa',
            'attemptedCredits',
            'completedCredits',
            'sortOrder',
            'courses',
            'createdAt',
            'updatedAt',
        ]

    @transaction.atomic
    def create(self, validated_data):
        courses = validated_data.pop('courses', [])
        semester = super().create(validated_data)
        sync_nested(semester, 'courses', SemesterCourse, courses, 'semester')
        return semester

    @transaction.atomic
    def update(self, instance, validated_data):
        courses = validated_data.pop('courses', None)
        semester = super().update(instance, validated_data)
        if courses is not None:
            sync_nested(semester, 'courses', SemesterCourse, courses, 'semester')
        return semester


class ResultStudentSerializer(serializers.Serializer):
    studentId = serializers.CharField(source='student_id')
    name = serializers.CharField(source='student_name')
    department = serializers.CharField(required=False, allow_blank=True)
    batch = serializers.CharField(required=False, allow_blank=True)


class ResultOverallSerializer(serializers.Serializer):
    cgpa = NumberDecimalField(
        source='overall_cgpa', max_digits=4, decimal_places=2, required=False, allow_null=True
    )
    calculatedCgpa = NumberDecimalField(
        source='calculated_cgpa', max_digits=4, decimal_places=2
    )
    completedCredits = NumberDecimalField(
        source='completed_credits', max_digits=8, decimal_places=2
    )
    attemptedCredits = NumberDecimalField(
        source='attempted_credits', max_digits=8, decimal_places=2
    )
    qualityPoints = NumberDecimalField(source='quality_points', max_digits=10, decimal_places=2)
    highestGpa = NumberDecimalField(source='highest_gpa', max_digits=4, decimal_places=2)
    totalSemesters = serializers.IntegerField(source='total_semesters')
    failedCoursesCount = serializers.IntegerField(source='failed_courses_count')
    clearedCoursesCount = serializers.IntegerField(source='cleared_courses_count')


class AcademicResultSerializer(UserOwnedModelSerializer):
    student = ResultStudentSerializer(source='*')
    semesters = SemesterSerializer(many=True, required=False)
    overall = ResultOverallSerializer(source='*')
    failedCourses = serializers.JSONField(source='failed_courses', required=False)
    fetchedAt = FrontendDateTimeField(source='fetched_at')
    schemaVersion = serializers.CharField(source='schema_version')
    isSavedCopy = serializers.BooleanField(source='is_saved_copy', required=False)

    class Meta:
        model = AcademicResult
        fields = [
            'id',
            'student',
            'semesters',
            'overall',
            'failedCourses',
            'fetchedAt',
            'source',
            'schemaVersion',
            'isSavedCopy',
            'createdAt',
            'updatedAt',
        ]

    def _sync_semesters(self, result, semesters):
        existing = {str(item.pk): item for item in result.semesters.all()}
        for raw_attrs in semesters:
            attrs = dict(raw_attrs)
            courses = attrs.pop('courses', [])
            semester_id = str(attrs.pop('id', '') or '')
            semester = existing.pop(semester_id, None) if semester_id else None
            attrs.update(user=result.user, academic_result=result)
            if semester is None:
                if semester_id:
                    attrs['id'] = semester_id
                semester = Semester.objects.create(**attrs)
            else:
                for field, value in attrs.items():
                    setattr(semester, field, value)
                semester.save()
            sync_nested(semester, 'courses', SemesterCourse, courses, 'semester')
        if existing:
            Semester.objects.filter(pk__in=existing).delete()

    @transaction.atomic
    def create(self, validated_data):
        semesters = validated_data.pop('semesters', [])
        result = super().create(validated_data)
        self._sync_semesters(result, semesters)
        return result

    @transaction.atomic
    def update(self, instance, validated_data):
        semesters = validated_data.pop('semesters', None)
        result = super().update(instance, validated_data)
        if semesters is not None:
            self._sync_semesters(result, semesters)
        return result


class ArchivedRoutineEventSerializer(UserOwnedModelSerializer):
    semesterId = serializers.CharField(source='semester_id')
    readOnly = serializers.BooleanField(source='read_only', required=False)
    archivedAt = FrontendDateTimeField(source='archived_at')
    courseId = serializers.CharField(source='course_id')
    courseTitle = serializers.CharField(source='course_title')
    classType = serializers.CharField(source='class_type')
    dayOfWeek = serializers.CharField(source='day_of_week')
    startTime = FrontendTimeField(source='start_time')
    endTime = FrontendTimeField(source='end_time')

    class Meta:
        model = ArchivedRoutineEvent
        fields = [
            'id',
            'source',
            'readOnly',
            'semesterId',
            'archivedAt',
            'courseId',
            'courseTitle',
            'classType',
            'date',
            'dayOfWeek',
            'startTime',
            'endTime',
            'room',
            'building',
            'faculty',
            'color',
            'createdAt',
            'updatedAt',
        ]


class SourceFileSerializer(serializers.Serializer):
    name = serializers.CharField(source='source_file_name')
    type = serializers.CharField(source='source_file_type', required=False, allow_blank=True)
    pageCount = serializers.IntegerField(source='source_file_page_count', min_value=1)


class RoutineImportSerializer(UserOwnedModelSerializer):
    importId = serializers.CharField(source='import_id')
    sourceFile = SourceFileSerializer(source='*')
    detectedGroups = serializers.JSONField(source='detected_groups', required=False)
    rawTextReference = serializers.CharField(
        source='raw_text_reference', required=False, allow_null=True, allow_blank=True
    )
    selectedGroup = serializers.CharField(source='selected_group', required=False, allow_blank=True)
    createdRoutineIds = serializers.JSONField(source='created_routine_ids', required=False)
    createdCourseIds = serializers.JSONField(source='created_course_ids', required=False)
    replacedRoutines = serializers.JSONField(source='replaced_routines', required=False)
    replacedCourses = serializers.JSONField(source='replaced_courses', required=False)
    undoneAt = FrontendDateTimeField(source='undone_at', required=False, allow_null=True)

    class Meta:
        model = RoutineImport
        fields = [
            'id',
            'importId',
            'sourceFile',
            'detectedGroups',
            'warnings',
            'rawTextReference',
            'selectedGroup',
            'section',
            'createdRoutineIds',
            'createdCourseIds',
            'replacedRoutines',
            'replacedCourses',
            'createdAt',
            'updatedAt',
            'undoneAt',
        ]
