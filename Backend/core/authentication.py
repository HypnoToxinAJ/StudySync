import hashlib
import json
from functools import lru_cache
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from jwt import PyJWKClient
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError, PyJWKClientError
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from .models import UserProfile


@lru_cache(maxsize=1)
def get_jwks_client():
    return PyJWKClient(
        settings.SUPABASE_JWKS_URL,
        cache_keys=True,
        cache_jwk_set=True,
        lifespan=settings.SUPABASE_JWKS_CACHE_SECONDS,
        timeout=settings.SUPABASE_JWKS_TIMEOUT_SECONDS,
    )


class SupabaseJWTAuthentication(BaseAuthentication):
    """Authenticate DRF requests using a Supabase Auth access token."""

    keyword = 'Bearer'

    def authenticate(self, request):
        authorization = get_authorization_header(request).split()
        if not authorization:
            return None

        if authorization[0].lower() != self.keyword.lower().encode():
            return None
        if len(authorization) != 2:
            raise AuthenticationFailed('Invalid Authorization header.')

        try:
            token = authorization[1].decode('utf-8')
        except UnicodeDecodeError as exc:
            raise AuthenticationFailed('Invalid bearer token encoding.') from exc

        payload = self._decode_token(token)
        if payload.get('role') != 'authenticated':
            raise AuthenticationFailed('The Supabase token is not an authenticated user token.')
        email = str(payload.get('email') or '').strip().lower()
        if not email:
            raise AuthenticationFailed('The Supabase token does not contain an email address.')
        subject = str(payload.get('sub') or '').strip()
        if not subject:
            raise AuthenticationFailed('The Supabase token does not contain a user ID.')

        user = self._get_or_create_user(subject, email, payload)
        if not user.is_active:
            raise AuthenticationFailed('This user account is inactive.')
        return user, payload

    def _decode_token(self, token):
        try:
            algorithm = jwt.get_unverified_header(token).get('alg')
        except InvalidTokenError as exc:
            raise AuthenticationFailed('Malformed Supabase access token.') from exc

        if algorithm not in settings.SUPABASE_JWT_ALGORITHMS:
            raise AuthenticationFailed('Unsupported Supabase JWT signing algorithm.')

        decode_kwargs = {
            'algorithms': [algorithm],
            'audience': settings.SUPABASE_JWT_AUDIENCE,
            'issuer': settings.SUPABASE_JWT_ISSUER,
            'leeway': settings.SUPABASE_JWT_LEEWAY_SECONDS,
            'options': {
                'require': ['exp', 'iat', 'sub', 'aud', 'iss'],
                'verify_signature': True,
                'verify_exp': True,
                'verify_iat': True,
                'verify_aud': True,
                'verify_iss': True,
            },
        }

        try:
            if algorithm == 'HS256':
                if settings.SUPABASE_JWT_SECRET:
                    return jwt.decode(token, settings.SUPABASE_JWT_SECRET, **decode_kwargs)
                return self._verify_legacy_token_with_supabase(token, decode_kwargs)

            signing_key = get_jwks_client().get_signing_key_from_jwt(token)
            return jwt.decode(token, signing_key.key, **decode_kwargs)
        except AuthenticationFailed:
            raise
        except ExpiredSignatureError as exc:
            raise AuthenticationFailed('Supabase access token has expired.') from exc
        except PyJWKClientError as exc:
            raise AuthenticationFailed('Unable to resolve the Supabase signing key.') from exc
        except InvalidTokenError as exc:
            raise AuthenticationFailed('Invalid Supabase access token.') from exc

    @staticmethod
    def _verify_legacy_token_with_supabase(token, decode_kwargs):
        """Verify legacy HS256 tokens through Supabase when no JWT secret is configured."""

        if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
            raise AuthenticationFailed(
                'SUPABASE_JWT_SECRET or Supabase Auth API configuration is required.'
            )

        claims_options = dict(decode_kwargs['options'])
        claims_options['verify_signature'] = False
        try:
            payload = jwt.decode(
                token,
                algorithms=decode_kwargs['algorithms'],
                audience=decode_kwargs['audience'],
                issuer=decode_kwargs['issuer'],
                leeway=decode_kwargs['leeway'],
                options=claims_options,
            )
        except ExpiredSignatureError as exc:
            raise AuthenticationFailed('Supabase access token has expired.') from exc
        except InvalidTokenError as exc:
            raise AuthenticationFailed('Invalid Supabase access token.') from exc

        request = Request(
            f'{settings.SUPABASE_URL}/auth/v1/user',
            headers={
                'Accept': 'application/json',
                'apikey': settings.SUPABASE_ANON_KEY,
                'Authorization': f'Bearer {token}',
            },
            method='GET',
        )
        try:
            with urlopen(request, timeout=settings.SUPABASE_AUTH_TIMEOUT_SECONDS) as response:
                remote_user = json.loads(response.read().decode('utf-8'))
        except HTTPError as exc:
            if exc.code in (401, 403):
                raise AuthenticationFailed('Invalid Supabase access token.') from exc
            raise AuthenticationFailed('Supabase Auth is temporarily unavailable.') from exc
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise AuthenticationFailed('Supabase Auth is temporarily unavailable.') from exc

        remote_subject = str(remote_user.get('id') or '')
        if not remote_subject or remote_subject != str(payload.get('sub') or ''):
            raise AuthenticationFailed('Supabase returned a different user identity.')

        payload['email'] = remote_user.get('email') or payload.get('email')
        payload['role'] = remote_user.get('role') or payload.get('role')
        payload['app_metadata'] = remote_user.get('app_metadata') or payload.get('app_metadata') or {}
        payload['user_metadata'] = (
            remote_user.get('user_metadata') or payload.get('user_metadata') or {}
        )
        return payload

    @staticmethod
    def _username_for_email(email):
        user_model = get_user_model()
        max_length = user_model._meta.get_field(user_model.USERNAME_FIELD).max_length or 150
        if len(email) <= max_length:
            return email
        digest = hashlib.sha256(email.encode('utf-8')).hexdigest()[:16]
        return f'{email[: max_length - len(digest) - 1]}-{digest}'

    def _get_or_create_user(self, subject, email, payload):
        user_model = get_user_model()
        normalized_email = user_model.objects.normalize_email(email).lower()
        metadata = payload.get('user_metadata') or {}
        app_metadata = payload.get('app_metadata') or {}
        full_name = str(metadata.get('full_name') or metadata.get('name') or '').strip()
        first_name, _, last_name = full_name.partition(' ')
        username = self._username_for_email(normalized_email)

        with transaction.atomic():
            existing_profile = (
                UserProfile.objects.select_for_update()
                .select_related('user')
                .filter(supabase_user_id=subject)
                .first()
            )
            if existing_profile:
                user = existing_profile.user
            else:
                matching_users = list(
                    user_model.objects.select_for_update()
                    .filter(email__iexact=normalized_email)
                    .order_by('pk')[:2]
                )
                if len(matching_users) > 1:
                    raise AuthenticationFailed('Multiple Django users share this email address.')
                if matching_users:
                    user = matching_users[0]
                    linked_profile = UserProfile.objects.filter(user=user).first()
                    if linked_profile and linked_profile.supabase_user_id != subject:
                        raise AuthenticationFailed(
                            'This email is linked to a different Supabase identity.'
                        )
                else:
                    user, created = user_model.objects.get_or_create(
                        **{user_model.USERNAME_FIELD: username},
                        defaults={
                            'email': normalized_email,
                            'first_name': first_name[:150],
                            'last_name': last_name[:150],
                        },
                    )
                    if not created and user.email.lower() != normalized_email:
                        raise AuthenticationFailed(
                            'This login conflicts with an existing Django user.'
                        )
                    if created:
                        user.set_unusable_password()
                        user.save(update_fields=['password'])

                existing_profile, _created = UserProfile.objects.get_or_create(
                    user=user,
                    defaults={'supabase_user_id': subject},
                )

            user_changes = []
            if user.email.lower() != normalized_email:
                if user_model.objects.filter(email__iexact=normalized_email).exclude(pk=user.pk).exists():
                    raise AuthenticationFailed('This email belongs to another Django user.')
                user.email = normalized_email
                user_changes.append('email')
            if first_name and user.first_name != first_name[:150]:
                user.first_name = first_name[:150]
                user_changes.append('first_name')
            if last_name and user.last_name != last_name[:150]:
                user.last_name = last_name[:150]
                user_changes.append('last_name')
            if user_changes:
                user.save(update_fields=user_changes)

            profile_changes = []
            profile_values = {
                'provider': str(app_metadata.get('provider') or ''),
                'name': full_name,
                'avatar_url': str(
                    metadata.get('avatar_url') or metadata.get('picture') or ''
                ),
                'onboarded': metadata.get('onboarded') is True,
            }
            for field, value in profile_values.items():
                if value and getattr(existing_profile, field) != value:
                    setattr(existing_profile, field, value)
                    profile_changes.append(field)
            if profile_changes:
                profile_changes.append('updated_at')
                existing_profile.save(update_fields=profile_changes)
        return user

    def authenticate_header(self, request):
        return self.keyword
