from datetime import datetime, timedelta, timezone
import json
from unittest.mock import patch

import jwt
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIRequestFactory

from .authentication import SupabaseJWTAuthentication
from .models import SyncDocument, UserProfile


@override_settings(
    SUPABASE_JWT_SECRET='test-only-supabase-secret-with-sufficient-length',
    SUPABASE_JWT_ISSUER='https://test-project.supabase.co/auth/v1',
    SUPABASE_JWT_AUDIENCE='authenticated',
    SUPABASE_JWT_ALGORITHMS=('HS256',),
)
class SupabaseJWTAuthenticationTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.authentication = SupabaseJWTAuthentication()

    def make_token(self, **overrides):
        now = datetime.now(timezone.utc)
        payload = {
            'iss': 'https://test-project.supabase.co/auth/v1',
            'aud': 'authenticated',
            'sub': '4d1c1bf0-04ba-4a64-a8ae-05ec31eeacbf',
            'email': 'student@example.com',
            'role': 'authenticated',
            'iat': now,
            'exp': now + timedelta(minutes=5),
            'user_metadata': {'full_name': 'Study Sync'},
            **overrides,
        }
        return jwt.encode(
            payload,
            'test-only-supabase-secret-with-sufficient-length',
            algorithm='HS256',
        )

    def authenticate(self, token):
        request = self.factory.get('/', HTTP_AUTHORIZATION=f'Bearer {token}')
        return self.authentication.authenticate(request)

    def test_missing_header_leaves_request_unauthenticated(self):
        request = self.factory.get('/')
        self.assertIsNone(self.authentication.authenticate(request))

    def test_valid_token_creates_django_user_with_unusable_password(self):
        user, payload = self.authenticate(self.make_token())

        self.assertEqual(user.email, 'student@example.com')
        self.assertEqual(user.username, 'student@example.com')
        self.assertEqual(user.first_name, 'Study')
        self.assertEqual(user.last_name, 'Sync')
        self.assertFalse(user.has_usable_password())
        self.assertEqual(payload['role'], 'authenticated')
        self.assertEqual(get_user_model().objects.count(), 1)
        self.assertTrue(
            UserProfile.objects.filter(
                user=user,
                supabase_user_id='4d1c1bf0-04ba-4a64-a8ae-05ec31eeacbf',
            ).exists()
        )

    def test_reuses_existing_user_by_case_insensitive_email(self):
        existing = get_user_model().objects.create_user(
            username='existing-student', email='Student@Example.com'
        )
        user, _ = self.authenticate(self.make_token(email='student@example.com'))
        self.assertEqual(user.pk, existing.pk)

    def test_expired_token_is_rejected(self):
        expired = datetime.now(timezone.utc) - timedelta(minutes=1)
        with self.assertRaisesMessage(AuthenticationFailed, 'expired'):
            self.authenticate(self.make_token(exp=expired))

    def test_wrong_audience_is_rejected(self):
        with self.assertRaisesMessage(AuthenticationFailed, 'Invalid Supabase access token'):
            self.authenticate(self.make_token(aud='service_role'))

    def test_non_authenticated_role_is_rejected(self):
        with self.assertRaisesMessage(AuthenticationFailed, 'not an authenticated user token'):
            self.authenticate(self.make_token(role='anon'))

    def test_missing_email_is_rejected(self):
        with self.assertRaisesMessage(AuthenticationFailed, 'does not contain an email'):
            self.authenticate(self.make_token(email=''))

    def test_same_supabase_identity_survives_an_email_change(self):
        original, _payload = self.authenticate(self.make_token())
        updated, _payload = self.authenticate(self.make_token(email='new-address@example.com'))

        self.assertEqual(updated.pk, original.pk)
        self.assertEqual(updated.email, 'new-address@example.com')
        self.assertEqual(get_user_model().objects.count(), 1)

    @override_settings(
        SUPABASE_JWT_SECRET='',
        SUPABASE_URL='https://test-project.supabase.co',
        SUPABASE_ANON_KEY='test-public-anon-key',
        SUPABASE_AUTH_TIMEOUT_SECONDS=2,
    )
    @patch('core.authentication.urlopen')
    def test_legacy_token_can_be_verified_by_supabase_auth(self, mocked_urlopen):
        remote_response = mocked_urlopen.return_value.__enter__.return_value
        remote_response.read.return_value = json.dumps(
            {
                'id': '4d1c1bf0-04ba-4a64-a8ae-05ec31eeacbf',
                'email': 'student@example.com',
                'role': 'authenticated',
                'app_metadata': {'provider': 'google'},
                'user_metadata': {'full_name': 'Remote Student'},
            }
        ).encode('utf-8')

        user, payload = self.authenticate(self.make_token())

        self.assertEqual(user.email, 'student@example.com')
        self.assertEqual(payload['app_metadata']['provider'], 'google')
        self.assertEqual(user.studysync_profile.name, 'Remote Student')
        mocked_urlopen.assert_called_once()

    def test_auth_me_creates_and_returns_the_profile(self):
        token = self.make_token(
            app_metadata={'provider': 'google'},
            user_metadata={
                'full_name': 'Google Student',
                'avatar_url': 'https://example.com/avatar.png',
            },
        )
        response = self.client.get(
            '/api/v1/auth/me/',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['email'], 'student@example.com')
        self.assertEqual(response.data['name'], 'Google Student')
        self.assertEqual(response.data['provider'], 'google')
        self.assertTrue(response.data['isLoggedIn'])
        self.assertEqual(UserProfile.objects.count(), 1)

    def test_sync_documents_are_created_and_versioned(self):
        token = self.make_token()
        authorization = f'Bearer {token}'
        first = self.client.put(
            '/api/v1/sync/',
            {
                'documents': {
                    'studysync_courses': {
                        'data': [{'courseId': 'CSE-101'}],
                        'baseRevision': 0,
                    }
                }
            },
            content_type='application/json',
            HTTP_AUTHORIZATION=authorization,
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data['documents']['studysync_courses']['revision'], 1)
        self.assertEqual(SyncDocument.objects.count(), 1)

        second = self.client.put(
            '/api/v1/sync/',
            {
                'documents': {
                    'studysync_courses': {
                        'data': [{'courseId': 'CSE-102'}],
                        'baseRevision': 1,
                    }
                }
            },
            content_type='application/json',
            HTTP_AUTHORIZATION=authorization,
        )
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data['documents']['studysync_courses']['revision'], 2)

        fetched = self.client.get(
            '/api/v1/sync/',
            HTTP_AUTHORIZATION=authorization,
        )
        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(
            fetched.data['documents']['studysync_courses']['data'][0]['courseId'],
            'CSE-102',
        )

    def test_sync_rejects_stale_revisions(self):
        token = self.make_token()
        authorization = f'Bearer {token}'
        SyncDocument.objects.create(
            user=self.authenticate(token)[0],
            key='studysync_courses',
            data=[],
            revision=3,
        )

        response = self.client.put(
            '/api/v1/sync/',
            {
                'documents': {
                    'studysync_courses': {'data': [], 'baseRevision': 2}
                }
            },
            content_type='application/json',
            HTTP_AUTHORIZATION=authorization,
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['conflicts']['studysync_courses']['actual'], 3)
