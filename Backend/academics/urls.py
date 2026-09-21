from django.urls import path

from .views import (
    AcademicResultImportView,
    AcademicResultView,
    AssessmentAttachmentDeleteView,
    AssessmentAttachmentSyncDriveView,
    AssessmentAttachmentUploadView,
    AssessmentDetailView,
    AssessmentListCreateView,
    CourseDetailView,
    CourseListCreateView,
    CourseSyncRoutineView,
    GoogleCalendarConnectView,
    GoogleCalendarStatusView,
    GoogleCalendarSyncView,
    RoutineClearView,
    RoutineDetailView,
    RoutineImageImportView,
    RoutineListCreateView,
)


urlpatterns = [
    path('courses/', CourseListCreateView.as_view(), name='course-list'),
    path('courses/sync-routine/', CourseSyncRoutineView.as_view(), name='course-sync-routine'),
    path('courses/<str:pk>/', CourseDetailView.as_view(), name='course-detail'),
    path('routines/', RoutineListCreateView.as_view(), name='routine-list'),
    path('routines/clear/', RoutineClearView.as_view(), name='routine-clear'),
    path('routines/import-image/', RoutineImageImportView.as_view(), name='routine-import-image'),
    path('routines/<str:pk>/', RoutineDetailView.as_view(), name='routine-detail'),
    path('results/', AcademicResultView.as_view(), name='academic-results'),
    path('results/import/', AcademicResultImportView.as_view(), name='academic-results-import'),
    path('calendar/status/', GoogleCalendarStatusView.as_view(), name='google-calendar-status'),
    path('calendar/sync/', GoogleCalendarSyncView.as_view(), name='google-calendar-sync'),
    # Assessment CRUD
    path('assessments/', AssessmentListCreateView.as_view(), name='assessment-list'),
    path('assessments/<str:pk>/', AssessmentDetailView.as_view(), name='assessment-detail'),
    path('assessments/<str:pk>/attachments/', AssessmentAttachmentUploadView.as_view(), name='assessment-attachments'),
    path('attachments/<str:pk>/', AssessmentAttachmentDeleteView.as_view(), name='attachment-delete'),
    path('attachments/<str:pk>/sync-drive/', AssessmentAttachmentSyncDriveView.as_view(), name='attachment-sync-drive'),
    # Google Calendar connect
    path('google/calendar/connect/', GoogleCalendarConnectView.as_view(), name='google-calendar-connect'),
]
