from datetime import datetime, timedelta, timezone
import jwt
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import TuitionClassSlot, TuitionMonthSnapshot, TuitionNote, TuitionStudent


@override_settings(
    SUPABASE_JWT_SECRET='test-only-supabase-secret-with-sufficient-length',
    SUPABASE_JWT_ISSUER='https://test-project.supabase.co/auth/v1',
    SUPABASE_JWT_AUDIENCE='authenticated',
    SUPABASE_JWT_ALGORITHMS=('HS256',),
)
class TuitionApiTests(APITestCase):
    def make_token(self, email='teacher@example.com', subject='22222222-2222-4222-8222-222222222222'):
        now = datetime.now(timezone.utc)
        return jwt.encode(
            {
                'iss': 'https://test-project.supabase.co/auth/v1',
                'aud': 'authenticated',
                'sub': subject,
                'email': email,
                'role': 'authenticated',
                'iat': now,
                'exp': now + timedelta(minutes=10),
                'app_metadata': {'provider': 'google'},
                'user_metadata': {'full_name': 'Private Tutor'},
            },
            'test-only-supabase-secret-with-sufficient-length',
            algorithm='HS256',
        )

    def authenticate(self, **kwargs):
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {self.make_token(**kwargs)}'
        )

    def test_student_list_create_and_slots(self):
        self.authenticate()

        # Create student
        payload = {
            'studentName': 'Jeet',
            'subject': 'Physics & Mathematics',
            'classGrade': 'Class 10 (SSC)',
            'monthlyPlannedClasses': 12,
            'monthlySalary': 8000,
            'currency': 'BDT',
            'startDate': '2026-03-01',
            'cardColor': '#4F46E5',
            'activeMonth': '2026-03',
        }
        res = self.client.post('/api/v1/tuition/students/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data['studentName'], 'Jeet')
        self.assertEqual(data['monthlySalary'], 8000.0)
        self.assertEqual(len(data['classSlots']), 12)
        student_id = data['id']

        # List students
        res_list = self.client.get('/api/v1/tuition/students/')
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.json()), 1)
        self.assertEqual(res_list.json()[0]['id'], student_id)

    def test_class_slot_update(self):
        self.authenticate()

        # Create student
        payload = {
            'studentName': 'Jeet',
            'subject': 'Math',
            'monthlyPlannedClasses': 10,
            'monthlySalary': 6000,
            'startDate': '2026-03-01',
        }
        res = self.client.post('/api/v1/tuition/students/', payload, format='json')
        student_id = res.json()['id']

        # Update slot 1
        slot_res = self.client.patch(
            f'/api/v1/tuition/students/{student_id}/slots/1/',
            {'date': '2026-03-05', 'completed': True},
            format='json',
        )
        self.assertEqual(slot_res.status_code, 200)
        updated_student = slot_res.json()
        slot_1 = next(s for s in updated_student['classSlots'] if s['order'] == 1)
        self.assertEqual(slot_1['date'], '2026-03-05')
        self.assertTrue(slot_1['completed'])
        self.assertEqual(updated_student['completedClasses'], 1)

        # Clear slot 1
        clear_res = self.client.patch(
            f'/api/v1/tuition/students/{student_id}/slots/1/',
            {'date': None, 'completed': False},
            format='json',
        )
        self.assertEqual(clear_res.status_code, 200)
        slot_1_cleared = next(s for s in clear_res.json()['classSlots'] if s['order'] == 1)
        self.assertIsNone(slot_1_cleared['date'])
        self.assertFalse(slot_1_cleared['completed'])

    def test_tuition_notes_crud(self):
        self.authenticate()

        res = self.client.post(
            '/api/v1/tuition/students/',
            {'studentName': 'Alex', 'subject': 'English', 'monthlyPlannedClasses': 8},
            format='json',
        )
        student_id = res.json()['id']

        # Add note
        note_res = self.client.post(
            f'/api/v1/tuition/students/{student_id}/notes/',
            {'content': 'Completed Chapter 3 exercises.'},
            format='json',
        )
        self.assertEqual(note_res.status_code, 201)
        note_id = note_res.json()['id']
        self.assertEqual(note_res.json()['content'], 'Completed Chapter 3 exercises.')

        # List notes
        list_res = self.client.get(f'/api/v1/tuition/students/{student_id}/notes/')
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(len(list_res.json()), 1)

        # Update note
        edit_res = self.client.patch(
            f'/api/v1/tuition/students/{student_id}/notes/{note_id}/',
            {'content': 'Completed Chapter 3 and 4 exercises.'},
            format='json',
        )
        self.assertEqual(edit_res.status_code, 200)
        self.assertEqual(edit_res.json()['content'], 'Completed Chapter 3 and 4 exercises.')

        # Delete note
        del_res = self.client.delete(
            f'/api/v1/tuition/students/{student_id}/notes/{note_id}/'
        )
        self.assertEqual(del_res.status_code, 200)
        list_after = self.client.get(f'/api/v1/tuition/students/{student_id}/notes/')
        self.assertEqual(len(list_after.json()), 0)

    def test_start_new_month_snapshot(self):
        self.authenticate()

        create_res = self.client.post(
            '/api/v1/tuition/students/',
            {
                'studentName': 'Jeet',
                'subject': 'Physics',
                'monthlyPlannedClasses': 12,
                'monthlySalary': 12000,
                'activeMonth': '2026-03',
                'startDate': '2026-03-01',
            },
            format='json',
        )
        student_id = create_res.json()['id']

        # Mark 3 classes
        for order, day in [(1, '2026-03-02'), (2, '2026-03-04'), (3, '2026-03-06')]:
            self.client.patch(
                f'/api/v1/tuition/students/{student_id}/slots/{order}/',
                {'date': day, 'completed': True},
                format='json',
            )

        # Rollover to next month
        rollover_res = self.client.post(
            f'/api/v1/tuition/students/{student_id}/start-new-month/',
            {'targetMonth': '2026-04'},
            format='json',
        )
        self.assertEqual(rollover_res.status_code, 200)
        data = rollover_res.json()
        self.assertEqual(data['activeMonth'], '2026-04')
        self.assertEqual(data['completedClasses'], 0)
        self.assertEqual(len(data['monthHistory']), 1)

        history_item = data['monthHistory'][0]
        self.assertEqual(history_item['activeMonth'], '2026-03')
        self.assertEqual(history_item['completedClasses'], 3)
        self.assertEqual(history_item['plannedClasses'], 12)
        self.assertEqual(len(history_item['classDates']), 3)

    def test_batch_sync(self):
        self.authenticate()

        local_students = [
            {
                'id': 'local-jeet-uuid-12345',
                'studentName': 'Jeet',
                'subject': 'Physics & Mathematics',
                'classGrade': 'Class 10 (SSC)',
                'monthlyPlannedClasses': 12,
                'monthlySalary': 8000,
                'currency': 'BDT',
                'startDate': '2026-03-01',
                'cardColor': '#4F46E5',
                'activeMonth': '2026-03',
                'classSlots': [
                    {'order': 1, 'date': '2026-03-02', 'completed': True},
                    {'order': 2, 'date': '2026-03-05', 'completed': True},
                    {'order': 3, 'date': None, 'completed': False},
                ],
                'notes': [
                    {'id': 'note-1', 'content': 'First mock test on Saturday.'}
                ],
            }
        ]

        sync_res = self.client.post(
            '/api/v1/tuition/sync/',
            {'students': local_students},
            format='json',
        )
        self.assertEqual(sync_res.status_code, 200)
        synced_data = sync_res.json()
        self.assertEqual(len(synced_data), 1)
        self.assertEqual(synced_data[0]['studentName'], 'Jeet')
        self.assertEqual(synced_data[0]['completedClasses'], 2)
        self.assertEqual(len(synced_data[0]['notes']), 1)
        self.assertEqual(synced_data[0]['notes'][0]['content'], 'First mock test on Saturday.')

    def test_user_isolation(self):
        # Teacher A
        self.authenticate(email='teacher_a@example.com', subject='33333333-3333-4333-8333-333333333333')
        res_a = self.client.post(
            '/api/v1/tuition/students/',
            {'studentName': 'Student A', 'subject': 'Bio'},
            format='json',
        )
        id_a = res_a.json()['id']

        # Teacher B
        self.authenticate(email='teacher_b@example.com', subject='44444444-4444-4444-8444-444444444444')
        res_b_list = self.client.get('/api/v1/tuition/students/')
        self.assertEqual(len(res_b_list.json()), 0)

        # Teacher B cannot access Teacher A's student
        res_b_get = self.client.get(f'/api/v1/tuition/students/{id_a}/')
        self.assertEqual(res_b_get.status_code, 404)
