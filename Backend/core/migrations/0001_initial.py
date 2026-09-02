# Generated for StudySync's Supabase identity and local-first synchronization layer.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('supabase_user_id', models.CharField(db_index=True, max_length=255, unique=True)),
                ('provider', models.CharField(blank=True, max_length=50)),
                ('name', models.CharField(blank=True, max_length=255)),
                ('avatar_url', models.URLField(blank=True, max_length=2048)),
                ('university', models.CharField(blank=True, max_length=255)),
                ('department', models.CharField(blank=True, max_length=255)),
                ('semester', models.CharField(blank=True, max_length=100)),
                ('student_id', models.CharField(blank=True, max_length=100)),
                ('currency', models.CharField(default='BDT', max_length=10)),
                ('theme_preference', models.CharField(blank=True, max_length=30)),
                ('weekly_class_days', models.JSONField(blank=True, default=list)),
                ('academic_goals', models.TextField(blank=True)),
                ('avatar', models.CharField(blank=True, max_length=100)),
                ('custom_avatar_image', models.TextField(blank=True)),
                ('onboarded', models.BooleanField(default=False)),
                ('last_login_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='studysync_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['user_id']},
        ),
        migrations.CreateModel(
            name='SyncDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(max_length=128)),
                ('data', models.JSONField(default=dict)),
                ('revision', models.PositiveBigIntegerField(default=1)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sync_documents', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['key'],
                'constraints': [models.UniqueConstraint(fields=('user', 'key'), name='core_unique_sync_document_per_user')],
            },
        ),
    ]
