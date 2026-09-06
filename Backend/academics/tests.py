from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from .gemini_routine import ExtractedClass, ExtractedSchedule, merge_contiguous_classes
from .models import (
    AcademicResult,
    AttendanceRecord,
    Course,
    CourseAssessment,
    Routine,
    RoutineImport,
    Semester,
    SemesterCourse,
)


@override_settings(
    SUPABASE_JWT_SECRET='test-only-supabase-secret-with-sufficient-length',
    SUPABASE_JWT_ISSUER='https://test-project.supabase.co/auth/v1',
    SUPABASE_JWT_AUDIENCE='authenticated',
    SUPABASE_JWT_ALGORITHMS=('HS256',),
    GEMINI_API_KEY='test-gemini-key',
)
class RoutineApiTests(APITestCase):
    def make_token(self, email='student@example.com', subject='11111111-1111-4111-8111-111111111111'):
        now = datetime.now(timezone.utc)
        return jwt.encode(
            {
                'iss': 'https://test-project.supabase.co/auth/v1',
                'aud': 'authenticated',
                'sub': subject,
                'email': email,
                'role': 'authenticated',
                'iat': now,
                'exp': now + timedelta(minutes=5),
                'app_metadata': {'provider': 'google'},
                'user_metadata': {'full_name': 'Routine Student'},
            },
            'test-only-supabase-secret-with-sufficient-length',
            algorithm='HS256',
        )

    def authenticate(self, **kwargs):
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {self.make_token(**kwargs)}'
        )

    @staticmethod
    def image_file(content_type='image/png'):
        return SimpleUploadedFile(
            'routine.png',
            b'\x89PNG\r\n\x1a\n' + b'valid-test-image-bytes',
            content_type=content_type,
        )

    def test_routine_endpoints_require_authentication(self):
        response = self.client.get('/api/v1/academics/routines/')
        self.assertEqual(response.status_code, 401)

    @patch('academics.views.extract_schedule')
    def test_image_import_bulk_creates_user_owned_routines(self, mocked_extract):
        mocked_extract.return_value = [
            ExtractedClass(
                day_of_week='SUNDAY',
                course_code='CSE-311',
                course_title='Database Management Systems',
                credit='3.0',
                teacher_name='Dr. Example Teacher',
                start_time='09:00 AM',
                end_time='09:50 AM',
                room='Room 304',
            ),
            ExtractedClass(
                day_of_week='THURSDAY',
                course_code='CSE-312',
                course_title='Database Sessional Lab',
                credit='1.5',
                teacher_name='Lab Instructor',
                start_time='02:00 PM',
                end_time='04:30 PM',
                room='Software Lab',
            ),
        ]
        self.authenticate()

        response = self.client.post(
            '/api/v1/academics/routines/import-image/',
            {'file': self.image_file(), 'subgroup': 'B2'},
            format='multipart',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['created'], 2)
        self.assertEqual(Routine.objects.count(), 2)
        self.assertEqual(RoutineImport.objects.count(), 1)
        sunday = Routine.objects.get(day_of_week='Sunday')
        self.assertEqual(sunday.course_code, 'CSE-311')
        self.assertEqual(sunday.room, 'Room 304')
        self.assertEqual(sunday.teacher_name, 'Dr. Example Teacher')
        self.assertEqual(str(sunday.credit), '3.00')
        self.assertEqual(sunday.group, 'B2')
        self.assertEqual(sunday.section, 'B')
        self.assertEqual(sunday.source, Routine.Source.OCR_IMPORT)
        self.assertEqual(sunday.user.email, 'student@example.com')
        lab = Routine.objects.get(day_of_week='Thursday')
        self.assertEqual(lab.class_type, Routine.ClassType.SESSIONAL)
        imported = RoutineImport.objects.get()
        self.assertEqual(imported.selected_group, 'B2')
        self.assertEqual(imported.section, 'B')
        mocked_extract.assert_called_once()
        self.assertEqual(mocked_extract.call_args.args[2:], ('B2', 'B'))

    @patch('academics.views.extract_schedule')
    def test_new_import_replaces_only_previous_ai_rows(self, mocked_extract):
        mocked_extract.return_value = [
            ExtractedClass(
                day_of_week='MONDAY',
                course_code='EEE-201',
                course_title='Circuits',
                credit='3.0',
                teacher_name='Dr. Circuit Teacher',
                start_time='10:00 AM',
                end_time='10:50 AM',
                room='',
            )
        ]
        self.authenticate()
        first = self.client.post(
            '/api/v1/academics/routines/import-image/',
            {'file': self.image_file(), 'subgroup': 'A1'},
            format='multipart',
        )
        user_id = Routine.objects.get().user_id
        Routine.objects.create(
            user_id=user_id,
            course_code='MAN 100',
            course_title='Manual class',
            day_of_week='Tuesday',
            start_time='11:00:00',
            end_time='11:50:00',
            source=Routine.Source.MANUAL,
        )

        second = self.client.post(
            '/api/v1/academics/routines/import-image/',
            {'file': self.image_file(), 'subgroup': 'A1'},
            format='multipart',
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(Routine.objects.filter(source=Routine.Source.OCR_IMPORT).count(), 1)
        self.assertTrue(Routine.objects.filter(course_code='MAN 100').exists())

    def test_list_is_scoped_to_the_authenticated_user(self):
        self.authenticate()
        first_user = self.client.get('/api/v1/auth/me/').wsgi_request.user
        Routine.objects.create(
            user=first_user,
            course_code='CSE 100',
            course_title='Visible class',
            day_of_week='Sunday',
            start_time='08:00:00',
            end_time='08:50:00',
        )
        self.authenticate(
            email='other@example.com',
            subject='22222222-2222-4222-8222-222222222222',
        )

        response = self.client.get('/api/v1/academics/routines/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_import_rejects_non_image_upload(self):
        self.authenticate()
        invalid = SimpleUploadedFile('routine.txt', b'not-an-image', content_type='text/plain')
        response = self.client.post(
            '/api/v1/academics/routines/import-image/',
            {'file': invalid, 'subgroup': 'B2'},
            format='multipart',
        )
        self.assertEqual(response.status_code, 415)

    def test_import_requires_valid_dynamic_subgroup(self):
        self.authenticate()
        missing = self.client.post(
            '/api/v1/academics/routines/import-image/',
            {'file': self.image_file()},
            format='multipart',
        )
        invalid = self.client.post(
            '/api/v1/academics/routines/import-image/',
            {'file': self.image_file(), 'subgroup': 'Section B'},
            format='multipart',
        )

        self.assertEqual(missing.status_code, 400)
        self.assertEqual(invalid.status_code, 400)

    def test_routine_clear_clears_attendance_and_ct_marks(self):
        self.authenticate()
        user = self.client.get('/api/v1/auth/me/').wsgi_request.user
        course = Course.objects.create(
            user=user,
            course_id='CSE-311',
            course_title='Database Systems',
            credit=3.0,
            course_type='theory',
            missed_classes=2,
            attended_classes=8,
            total_classes=10,
        )
        AttendanceRecord.objects.create(
            user=user,
            course=course,
            date='2026-06-12',
            status='missed',
            class_type='theory',
        )
        CourseAssessment.objects.create(
            user=user,
            course=course,
            name='CT 1',
            assessment_type='CT',
            total_marks=20,
            obtained_marks=18,
            date='2026-06-10',
        )
        Routine.objects.create(
            user=user,
            course=course,
            course_code='CSE-311',
            course_title='Database Systems',
            day_of_week='Sunday',
            start_time='08:00:00',
            end_time='08:50:00',
        )

        response = self.client.delete('/api/v1/academics/routines/clear/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(Routine.objects.filter(user=user).count(), 0)
        self.assertEqual(AttendanceRecord.objects.filter(user=user).count(), 0)
        self.assertEqual(CourseAssessment.objects.filter(user=user).count(), 0)

        course.refresh_from_db()
        self.assertEqual(course.missed_classes, 0)
        self.assertEqual(course.attended_classes, 0)
        self.assertEqual(course.total_classes, 0)

    def test_course_update_automates_ct_and_routine_sync(self):
        self.authenticate()
        user = self.client.get('/api/v1/auth/me/').wsgi_request.user
        course = Course.objects.create(
            user=user,
            course_id='CSE-311',
            course_title='Database Systems',
            credit=3.0,
            course_type='theory',
        )
        routine = Routine.objects.create(
            user=user,
            course=course,
            course_code='CSE-311',
            course_title='Database Systems',
            credit=3.0,
            course_type='theory',
            day_of_week='Monday',
            start_time='08:00:00',
            end_time='08:50:00',
        )

        # Update credit to 2.0 -> CT bestAssessmentCount should automatically become 2
        response = self.client.patch(
            f'/api/v1/academics/courses/{course.id}/',
            {'credit': 2.0, 'courseTitle': 'Advanced Database Systems'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['bestAssessmentCount'], 2)
        self.assertTrue(response.data['assessmentApplicable'])

        course.refresh_from_db()
        self.assertEqual(course.best_assessment_count, 2)
        self.assertEqual(course.course_title, 'Advanced Database Systems')

        # Matching routine slot should automatically update
        routine.refresh_from_db()
        self.assertEqual(routine.course_title, 'Advanced Database Systems')
        self.assertEqual(float(routine.credit), 2.0)

        # Update course type to Lab -> CT assessmentApplicable should automatically become False
        response2 = self.client.patch(
            f'/api/v1/academics/courses/{course.id}/',
            {'courseType': 'LAB'},
            format='json',
        )
        self.assertEqual(response2.status_code, 200)
        self.assertFalse(response2.data['assessmentApplicable'])
        self.assertEqual(response2.data['bestAssessmentCount'], 0)

        routine.refresh_from_db()
        self.assertEqual(routine.class_type, Routine.ClassType.LAB)

    def test_course_upsert_and_flexible_id_lookup(self):
        self.authenticate()
        user = self.client.get('/api/v1/auth/me/').wsgi_request.user
        course = Course.objects.create(
            user=user,
            course_id='CSE-317',
            course_title='Artificial Intelligence',
            credit=3.0,
            course_type='theory',
        )

        # Update using course_id instead of PK UUID
        response = self.client.patch(
            '/api/v1/academics/courses/CSE-317/',
            {'faculty': 'Dr. AI Professor'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        course.refresh_from_db()
        self.assertEqual(course.faculty, 'Dr. AI Professor')

        # Upsert: POST with same course_id should update rather than fail with duplicate error
        post_response = self.client.post(
            '/api/v1/academics/courses/',
            {
                'courseId': 'CSE-317',
                'courseTitle': 'AI & Machine Learning',
                'credit': 4.0,
                'courseType': 'THEORY',
            },
            format='json',
        )
        self.assertEqual(post_response.status_code, 200)
        course.refresh_from_db()
        self.assertEqual(course.course_title, 'AI & Machine Learning')
        self.assertEqual(float(course.credit), 4.0)
        self.assertEqual(course.best_assessment_count, 4)

    def test_course_ct_marks_and_attendance_sync(self):
        self.authenticate()
        user = self.client.get('/api/v1/auth/me/').wsgi_request.user
        course = Course.objects.create(
            user=user,
            course_id='CSE-313',
            course_title='Computer Networks',
            credit=3.0,
            course_type='theory',
        )

        # Send CT mark without expectedMarks and attendance record with status 'ABSENT'
        update_data = {
            'assessments': [
                {
                    'name': 'CT 1',
                    'type': 'CT',
                    'totalMarks': 20,
                    'obtainedMarks': 19,
                    'date': '2026-09-01',
                }
            ],
            'history': [
                {
                    'date': '2026-09-02',
                    'status': 'ABSENT',
                    'classType': 'THEORY',
                    'reason': 'Fever',
                }
            ],
        }
        res = self.client.patch(
            f'/api/v1/academics/courses/{course.id}/',
            update_data,
            format='json',
        )
        self.assertEqual(res.status_code, 200, res.data)
        course.refresh_from_db()
        self.assertEqual(course.assessments.count(), 1)
        self.assertEqual(course.history.count(), 1)
        self.assertEqual(course.missed_classes, 1)
        self.assertEqual(course.total_classes, 1)
        ast = course.assessments.first()
        self.assertEqual(float(ast.total_marks), 20.0)
        self.assertEqual(float(ast.expected_marks), 20.0)
        self.assertEqual(float(ast.obtained_marks), 19.0)
        self.assertEqual(ast.assessment_type, 'CT')

    def test_course_deletion_cleans_attendance_ct_and_routine(self):
        from .models import AttendanceRecord, CourseAssessment, AssessmentEvent, Routine
        from core.models import SyncDocument
        self.authenticate()
        user = self.client.get('/api/v1/auth/me/').wsgi_request.user
        course = Course.objects.create(
            user=user,
            course_id='CSE-399',
            course_title='Test Deletion Course',
            credit=3.0,
            course_type='theory',
        )
        # Create AttendanceRecord
        AttendanceRecord.objects.create(
            user=user,
            course=course,
            date='2026-09-01',
            status='attended',
            class_type='theory',
        )
        # Create CourseAssessment
        CourseAssessment.objects.create(
            user=user,
            course=course,
            name='CT-1',
            date='2026-09-02',
            total_marks=20,
            expected_marks=20,
            obtained_marks=18,
            assessment_type='CT',
        )
        # Create Routine
        Routine.objects.create(
            user=user,
            course=course,
            course_code='CSE-399',
            course_title='Test Deletion Course',
            credit=3.0,
            day_of_week='MONDAY',
            start_time='08:00',
            end_time='08:50',
        )
        # Create SyncDocument items
        SyncDocument.objects.create(
            user=user,
            key='studysync_courses',
            data=[{'id': course.id, 'courseId': 'CSE-399', 'courseTitle': 'Test Deletion Course'}],
        )
        SyncDocument.objects.create(
            user=user,
            key='studysync_assessments',
            data=[{'id': 'ast-1', 'courseId': 'CSE-399', 'name': 'CT-1'}],
        )
        SyncDocument.objects.create(
            user=user,
            key='studysync_routines',
            data=[{'id': 'rt-1', 'courseId': 'CSE-399'}],
        )

        # Send DELETE request
        res = self.client.delete(f'/api/v1/academics/courses/{course.id}/')
        self.assertEqual(res.status_code, 204)

        # Course should be deleted
        self.assertFalse(Course.objects.filter(id=course.id).exists())
        # AttendanceRecord should be deleted
        self.assertFalse(AttendanceRecord.objects.filter(course=course).exists())
        # CourseAssessment should be deleted
        self.assertFalse(CourseAssessment.objects.filter(course=course).exists())
        # Routine should be deleted
        self.assertFalse(Routine.objects.filter(course_code='CSE-399').exists())
        # SyncDocuments should be cleaned
        c_doc = SyncDocument.objects.filter(user=user, key='studysync_courses').first()
        self.assertEqual(len(c_doc.data), 0)
        a_doc = SyncDocument.objects.filter(user=user, key='studysync_assessments').first()
        self.assertEqual(len(a_doc.data), 0)
        r_doc = SyncDocument.objects.filter(user=user, key='studysync_routines').first()
        self.assertEqual(len(r_doc.data), 0)




class RoutineExtractionSchemaTests(APITestCase):
    @staticmethod
    def extracted(start_time, end_time):
        return ExtractedClass(
            day_of_week='THURSDAY',
            course_code='CSE-312',
            course_title='Computer Networks (Sessional)',
            credit='1.5',
            teacher_name='Dr. Example',
            start_time=start_time,
            end_time=end_time,
            room='Network Lab',
        )

    def test_schema_requires_strict_time_format_and_supported_day(self):
        with self.assertRaises(ValueError):
            ExtractedSchedule.model_validate(
                [
                    {
                        'day_of_week': 'FRIDAY',
                        'course_code': 'CSE-311',
                        'course_title': 'Computer Networks',
                        'credit': '3.0',
                        'teacher_name': 'Dr. Example',
                        'start_time': '9:00 AM',
                        'end_time': '09:50 AM',
                        'room': '',
                    }
                ]
            )

    def test_schema_rejects_end_before_start(self):
        with self.assertRaises(ValueError):
            ExtractedSchedule.model_validate(
                [
                    {
                        'day_of_week': 'SUNDAY',
                        'course_code': 'CSE-311',
                        'course_title': 'Computer Networks',
                        'credit': '3.0',
                        'teacher_name': 'Dr. Example',
                        'start_time': '10:00 AM',
                        'end_time': '09:00 AM',
                        'room': '',
                    }
                ]
            )

    def test_contiguous_periods_are_merged_into_one_class(self):
        merged = merge_contiguous_classes(
            [
                self.extracted('10:45 AM', '11:30 AM'),
                self.extracted('11:30 AM', '12:15 PM'),
                self.extracted('12:15 PM', '01:00 PM'),
            ]
        )

        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0].start_time, '10:45 AM')
        self.assertEqual(merged[0].end_time, '01:00 PM')


class AcademicResultApiTests(RoutineApiTests):
    def test_get_results_returns_404_when_empty(self):
        self.authenticate()
        response = self.client.get('/api/v1/academics/results/')
        self.assertEqual(response.status_code, 204)

    def test_post_and_get_academic_results(self):
        self.authenticate()
        payload = {
            'student': {
                'studentId': '1904055',
                'name': 'Sayed Mohammad Rezwan',
                'department': 'Computer Science & Engineering',
                'batch': "'19",
            },
            'overall': {
                'cgpa': 3.82,
                'calculatedCgpa': 3.82,
                'completedCredits': 19.5,
                'attemptedCredits': 19.5,
                'qualityPoints': 74.49,
                'highestGpa': 3.82,
                'totalSemesters': 1,
                'failedCoursesCount': 0,
                'clearedCoursesCount': 2,
            },
            'semesters': [
                {
                    'id': 'sem-L1T1',
                    'name': 'Level 1 - Term I',
                    'term': 'Level 1 - Term I',
                    'gpa': 3.82,
                    'calculatedGpa': 3.82,
                    'attemptedCredits': 19.5,
                    'completedCredits': 19.5,
                    'courses': [
                        {
                            'courseCode': 'CSE-141',
                            'courseTitle': 'Structured Programming Language',
                            'credit': 3.0,
                            'letterGrade': 'A+',
                            'gradePoint': 4.0,
                            'qualityPoints': 12.0,
                            'status': 'Passed',
                            'isRepeated': False,
                            'courseType': 'Theory',
                            'source': 'cuet',
                        },
                        {
                            'courseCode': 'CSE-142',
                            'courseTitle': 'Structured Programming Sessional',
                            'credit': 1.5,
                            'letterGrade': 'A+',
                            'gradePoint': 4.0,
                            'qualityPoints': 6.0,
                            'status': 'Passed',
                            'isRepeated': False,
                            'courseType': 'Lab',
                            'source': 'cuet',
                        },
                    ],
                }
            ],
            'failedCourses': [],
            'fetchedAt': '2026-09-05T12:00:00Z',
            'source': 'CUET Result Portal',
            'schemaVersion': '1.0.0',
            'isSavedCopy': False,
        }

        # 1. POST to create/update
        create_res = self.client.post(
            '/api/v1/academics/results/',
            payload,
            format='json',
        )
        self.assertEqual(create_res.status_code, 201)
        self.assertEqual(create_res.data['student']['studentId'], '1904055')
        self.assertEqual(len(create_res.data['semesters']), 1)
        self.assertEqual(len(create_res.data['semesters'][0]['courses']), 2)

        # 2. GET to fetch
        get_res = self.client.get('/api/v1/academics/results/')
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.data['student']['name'], 'Sayed Mohammad Rezwan')
        self.assertEqual(float(get_res.data['overall']['cgpa']), 3.82)
        self.assertEqual(get_res.data['semesters'][0]['courses'][0]['courseCode'], 'CSE-141')

    def test_delete_academic_results(self):
        self.authenticate()
        payload = {
            'student': {'studentId': '1904055', 'name': 'Sayed'},
            'overall': {
                'cgpa': 3.8,
                'calculatedCgpa': 3.8,
                'completedCredits': 3.0,
                'attemptedCredits': 3.0,
                'qualityPoints': 12.0,
                'highestGpa': 3.8,
                'totalSemesters': 1,
                'failedCoursesCount': 0,
                'clearedCoursesCount': 1,
            },
            'semesters': [],
            'fetchedAt': '2026-09-05T12:00:00Z',
            'schemaVersion': '1.0.0',
        }
        self.client.post('/api/v1/academics/results/', payload, format='json')

        # DELETE
        del_res = self.client.delete('/api/v1/academics/results/')
        self.assertEqual(del_res.status_code, 204)

        # GET should now return 204 (empty)
        get_res = self.client.get('/api/v1/academics/results/')
        self.assertEqual(get_res.status_code, 204)


class AcademicResultImportApiTests(RoutineApiTests):
    """Tests for the new zero-password AcademicResultImportView (/api/v1/academics/results/import/)."""

    def test_import_normalized_results_with_repeated_courses(self):
        self.authenticate()

        # Student took:
        # L1T1: CSE 1101 (3.0, A), CSE 1102 (1.5, A+)
        # L1T1: MATH 1101 (3.0, F)
        # L1T2: MATH 1101 (3.0, B) -> repeated attempt, replaces F!
        # L1T2: CSE 1201 (3.0, A-)
        payload = {
            'student': {
                'studentId': '1904001',
                'name': 'Jeet Saha',
                'department': 'Computer Science & Engineering',
                'batch': "'19",
            },
            'results': [
                {
                    'course_code': 'CSE 1101',
                    'course_title': 'Structured Programming',
                    'credit': 3.0,
                    'term': 'Level 1 - Term I',
                    'grade': 'A',
                    'course_type': 'theory',
                },
                {
                    'course_code': 'CSE 1102',
                    'course_title': 'Structured Programming Lab',
                    'credit': 1.5,
                    'term': 'Level 1 - Term I',
                    'grade': 'A+',
                    'course_type': 'lab',
                },
                {
                    'course_code': 'MATH 1101',
                    'course_title': 'Differential Calculus',
                    'credit': 3.0,
                    'term': 'Level 1 - Term I',
                    'grade': 'F',
                    'course_type': 'theory',
                },
                {
                    'course_code': 'MATH 1101',
                    'course_title': 'Differential Calculus',
                    'credit': 3.0,
                    'term': 'Level 1 - Term II',
                    'grade': 'B',
                    'course_type': 'theory',
                },
                {
                    'course_code': 'CSE 1201',
                    'course_title': 'Object Oriented Programming',
                    'credit': 3.0,
                    'term': 'Level 1 - Term II',
                    'grade': 'A-',
                    'course_type': 'theory',
                },
            ]
        }

        res = self.client.post('/api/v1/academics/results/import/', payload, format='json')
        self.assertEqual(res.status_code, 201)

        data = res.data
        self.assertEqual(data['student']['studentId'], '1904001')
        self.assertEqual(data['student']['name'], 'Jeet Saha')
        self.assertEqual(len(data['semesters']), 2)

        # Semester 1 (L1T1) courses check
        sem1 = data['semesters'][0]
        self.assertEqual(sem1['name'], 'Level 1 - Term I')
        math_sem1 = next(c for c in sem1['courses'] if c['courseCode'] == 'MATH 1101')
        self.assertEqual(math_sem1['letterGrade'], 'F')
        self.assertTrue(math_sem1['isRepeated'])  # superseded by B in L1T2!
        self.assertEqual(math_sem1['status'], 'Repeated')

        # Semester 2 (L1T2) courses check
        sem2 = data['semesters'][1]
        self.assertEqual(sem2['name'], 'Level 1 - Term II')
        math_sem2 = next(c for c in sem2['courses'] if c['courseCode'] == 'MATH 1101')
        self.assertEqual(math_sem2['letterGrade'], 'B')
        self.assertFalse(math_sem2['isRepeated'])
        self.assertEqual(math_sem2['status'], 'Passed')

        # Active failed courses should be 0 because MATH 1101 was cleared!
        self.assertEqual(len(data['failedCourses']), 0)
        self.assertEqual(data['overall']['failedCoursesCount'], 0)

        # Completed credits: 3.0 (CSE 1101) + 1.5 (CSE 1102) + 3.0 (MATH 1101) + 3.0 (CSE 1201) = 10.5
        self.assertEqual(float(data['overall']['completedCredits']), 10.5)

        # Overall CGPA calculation:
        # CSE 1101: 3.0 * 3.75 = 11.25
        # CSE 1102: 1.5 * 4.00 = 6.00
        # MATH 1101: 3.0 * 3.00 = 9.00
        # CSE 1201: 3.0 * 3.50 = 10.50
        # Total points = 36.75 / 10.5 credits = 3.50
        self.assertEqual(float(data['overall']['calculatedCgpa']), 3.50)

    def test_import_unresolved_failed_courses_deduplication(self):
        self.authenticate()

        # Student failed ME 1101 twice across two terms without passing
        payload = {
            'results': [
                {
                    'course_code': 'ME 1101',
                    'credit': 3.0,
                    'term': 'Level 1 - Term I',
                    'grade': 'F',
                },
                {
                    'course_code': 'ME 1101',
                    'credit': 3.0,
                    'term': 'Level 1 - Term II',
                    'grade': 'F',
                },
            ]
        }

        res = self.client.post('/api/v1/academics/results/import/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        data = res.data

        # Must be deduplicated: exactly 1 active failed course in list!
        self.assertEqual(len(data['failedCourses']), 1)
        self.assertEqual(data['failedCourses'][0]['courseCode'], 'ME 1101')
        self.assertEqual(data['failedCourses'][0]['attemptsCount'], 2)
        self.assertEqual(data['overall']['failedCoursesCount'], 1)

    def test_delete_academic_results_removes_all_database_records(self):
        self.authenticate()

        payload = {
            'results': [
                {
                    'course_code': 'CSE 1101',
                    'credit': 3.0,
                    'term': 'Level 1 - Term I',
                    'grade': 'A',
                },
                {
                    'course_code': 'CSE 1102',
                    'credit': 1.5,
                    'term': 'Level 1 - Term I',
                    'grade': 'A+',
                },
            ]
        }

        # Import results first
        import_res = self.client.post('/api/v1/academics/results/import/', payload, format='json')
        self.assertEqual(import_res.status_code, 201)

        # Verify records exist in database
        self.assertTrue(AcademicResult.objects.exists())
        self.assertTrue(Semester.objects.exists())
        self.assertTrue(SemesterCourse.objects.exists())

        # Reset / delete results
        delete_res = self.client.delete('/api/v1/academics/results/')
        self.assertEqual(delete_res.status_code, 204)

        # Verify completely deleted from database
        self.assertFalse(AcademicResult.objects.exists())
        self.assertFalse(Semester.objects.exists())
        self.assertFalse(SemesterCourse.objects.exists())


