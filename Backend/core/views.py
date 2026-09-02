import json

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SyncDocument, UserProfile
from .serializers import SyncRequestSerializer, UserProfileSerializer


def profile_for_request(request):
    metadata = request.auth.get('user_metadata') or {}
    app_metadata = request.auth.get('app_metadata') or {}
    defaults = {
        'provider': str(app_metadata.get('provider') or ''),
        'name': str(metadata.get('full_name') or metadata.get('name') or ''),
        'avatar_url': str(metadata.get('avatar_url') or metadata.get('picture') or ''),
        'onboarded': metadata.get('onboarded') is True,
    }
    profile, _created = UserProfile.objects.get_or_create(
        user=request.user,
        defaults={
            'supabase_user_id': str(request.auth['sub']),
            **defaults,
        },
    )
    changed = []
    for field, value in defaults.items():
        if value and getattr(profile, field) != value:
            setattr(profile, field, value)
            changed.append(field)
    profile.last_login_at = timezone.now()
    changed.extend(['last_login_at', 'updated_at'])
    profile.save(update_fields=list(dict.fromkeys(changed)))
    return profile


class CurrentUserView(APIView):
    """Create/synchronize and return the signed-in StudySync user."""

    def get(self, request):
        profile = profile_for_request(request)
        return Response(UserProfileSerializer(profile).data)

    def patch(self, request):
        profile = profile_for_request(request)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SyncView(APIView):
    """Synchronize versioned per-user JSON documents."""

    @staticmethod
    def serialize_documents(documents):
        return {
            document.key: {
                'data': document.data,
                'revision': document.revision,
                'updatedAt': document.updated_at.isoformat(),
            }
            for document in documents
        }

    def get(self, request):
        documents = SyncDocument.objects.filter(user=request.user)
        return Response({'documents': self.serialize_documents(documents)})

    @transaction.atomic
    def put(self, request):
        serializer = SyncRequestSerializer(
            data=request.data,
            context={'max_documents': settings.SYNC_MAX_DOCUMENTS_PER_REQUEST},
        )
        serializer.is_valid(raise_exception=True)
        requested = serializer.validated_data['documents']

        encoded_size = len(
            json.dumps(requested, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
        )
        if encoded_size > settings.SYNC_MAX_REQUEST_BYTES:
            raise ValidationError(
                {'documents': 'The synchronization payload is too large.'}
            )

        existing = {
            document.key: document
            for document in SyncDocument.objects.select_for_update().filter(
                user=request.user,
                key__in=requested,
            )
        }
        conflicts = {}
        for key, payload in requested.items():
            current = existing.get(key)
            expected = payload['baseRevision']
            actual = current.revision if current else 0
            if expected != actual:
                conflicts[key] = {'expected': expected, 'actual': actual}

        if conflicts:
            return Response(
                {
                    'detail': 'One or more documents changed on another client.',
                    'conflicts': conflicts,
                },
                status=status.HTTP_409_CONFLICT,
            )

        updated = []
        for key, payload in requested.items():
            document = existing.get(key)
            if document is None:
                document = SyncDocument.objects.create(
                    user=request.user,
                    key=key,
                    data=payload['data'],
                    revision=1,
                )
            else:
                document.data = payload['data']
                document.revision += 1
                document.save(update_fields=['data', 'revision', 'updated_at'])
            updated.append(document)

        return Response({'documents': self.serialize_documents(updated)})

    def delete(self, request):
        SyncDocument.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
