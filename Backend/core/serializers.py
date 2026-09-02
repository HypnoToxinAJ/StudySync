from rest_framework import serializers

from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='supabase_user_id', read_only=True)
    djangoUserId = serializers.IntegerField(source='user_id', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    avatarUrl = serializers.URLField(
        source='avatar_url', required=False, allow_blank=True
    )
    studentId = serializers.CharField(
        source='student_id', required=False, allow_blank=True
    )
    themePreference = serializers.CharField(
        source='theme_preference', required=False, allow_blank=True
    )
    weeklyClassDays = serializers.ListField(
        source='weekly_class_days',
        child=serializers.CharField(max_length=20),
        required=False,
    )
    academicGoals = serializers.CharField(
        source='academic_goals', required=False, allow_blank=True
    )
    customAvatarImage = serializers.CharField(
        source='custom_avatar_image', required=False, allow_blank=True
    )
    isLoggedIn = serializers.SerializerMethodField()
    lastLoginAt = serializers.DateTimeField(source='last_login_at', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'djangoUserId',
            'email',
            'username',
            'name',
            'avatarUrl',
            'provider',
            'university',
            'department',
            'semester',
            'studentId',
            'currency',
            'themePreference',
            'weeklyClassDays',
            'academicGoals',
            'avatar',
            'customAvatarImage',
            'onboarded',
            'isLoggedIn',
            'lastLoginAt',
            'createdAt',
            'updatedAt',
        ]
        read_only_fields = ['provider', 'onboarded']

    @staticmethod
    def get_isLoggedIn(_obj):
        return True


class SyncDocumentInputSerializer(serializers.Serializer):
    data = serializers.JSONField()
    baseRevision = serializers.IntegerField(min_value=0, default=0)


class SyncRequestSerializer(serializers.Serializer):
    documents = serializers.DictField(
        child=SyncDocumentInputSerializer(),
        allow_empty=True,
    )

    def validate_documents(self, value):
        max_documents = self.context['max_documents']
        if len(value) > max_documents:
            raise serializers.ValidationError(
                f'At most {max_documents} documents may be synchronized at once.'
            )
        for key in value:
            if not key or len(key) > 128 or not key.startswith('studysync_'):
                raise serializers.ValidationError(f'Invalid document key: {key!r}.')
        return value
