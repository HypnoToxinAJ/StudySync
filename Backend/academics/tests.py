from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from .gemini_routine import ExtractedClass, ExtractedSchedule
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
                course_name='CSE 311 Database Management Systems',
                start_time='09:00:00',
                end_time='09:50:00',
                room='Room 304',
            ),
            ExtractedClass(
                day_of_week='THURSDAY',
                course_name='CSE 312 Database Sessional Lab',
                start_time='14:00:00',
                end_time='16:30:00',
                room='Software Lab',
            ),
        ]
        self.authenticate()

        response = self.client.post(
            '/api/v1/academics/routines/import-image/',
            {'image': self.image_file()},
            format='multipart',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['created'], 2)
        self.assertEqual(Routine.objects.count(), 2)
        self.assertEqual(RoutineImport.objects.count(), 1)
        sunday = Routine.objects.get(day_of_week='Sunday')
        self.assertEqual(sunday.course_code, 'CSE 311')
        self.assertEqual(sunday.room, 'Room 304')
        self.assertEqual(sunday.source, Routine.Source.OCR_IMPORT)
        self.assertEqual(sunday.user.email, 'student@example.com')
        lab = Routine.objects.get(day_of_week='Thursday')
        self.assertEqual(lab.class_type, Routine.ClassType.SESSIONAL)

    @patch('academics.views.extract_schedule')
    def test_new_import_replaces_only_previous_ai_rows(self, mocked_extract):
        mocked_extract.return_value = [
            ExtractedClass(
                day_of_week='MONDAY',
                course_name='EEE 201 Circuits',
                start_time='10:00:00',
                end_time='10:50:00',
                room='',
            )
        ]
        self.authenticate()
        first = self.client.post(
            '/api/v1/academics/routines/import-image/',
            {'image': self.image_file()},
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
            {'image': self.image_file()},
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
            {'image': invalid},
            format='multipart',
        )
        self.assertEqual(response.status_code, 415)


class RoutineExtractionSchemaTests(APITestCase):
    def test_schema_requires_strict_time_format_and_supported_day(self):
        with self.assertRaises(ValueError):
            ExtractedSchedule.model_validate(
                [
                    {
                        'day_of_week': 'FRIDAY',
                        'course_name': 'CSE 311',
                        'start_time': '9:00 AM',
                        'end_time': '09:50:00',
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
                        'course_name': 'CSE 311',
                        'start_time': '10:00:00',
                        'end_time': '09:00:00',
                        'room': '',
                    }
                ]
            )
