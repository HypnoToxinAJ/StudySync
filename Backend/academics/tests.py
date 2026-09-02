from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from .gemini_routine import ExtractedClass, ExtractedSchedule, merge_contiguous_classes
from .models import Routine, RoutineImport


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
