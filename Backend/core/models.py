from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    """Application profile and stable link to a Supabase Auth identity."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='studysync_profile',
    )
    supabase_user_id = models.CharField(max_length=255, unique=True, db_index=True)
    provider = models.CharField(max_length=50, blank=True)
    name = models.CharField(max_length=255, blank=True)
    avatar_url = models.URLField(max_length=2048, blank=True)
    university = models.CharField(max_length=255, blank=True)
    department = models.CharField(max_length=255, blank=True)
    semester = models.CharField(max_length=100, blank=True)
    student_id = models.CharField(max_length=100, blank=True)
    currency = models.CharField(max_length=10, default='BDT')
    theme_preference = models.CharField(max_length=30, blank=True)
    weekly_class_days = models.JSONField(default=list, blank=True)
    academic_goals = models.TextField(blank=True)
    avatar = models.CharField(max_length=100, blank=True)
    custom_avatar_image = models.TextField(blank=True)
    onboarded = models.BooleanField(default=False)
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['user_id']

    def __str__(self):
        return self.name or self.user.email or str(self.user)


class SyncDocument(models.Model):
    """Versioned JSON document used by the current React local-first store."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sync_documents',
    )
    key = models.CharField(max_length=128)
    data = models.JSONField(default=dict)
    revision = models.PositiveBigIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['key']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'key'],
                name='core_unique_sync_document_per_user',
            ),
        ]

    def __str__(self):
        return f'{self.user_id}:{self.key}@{self.revision}'
