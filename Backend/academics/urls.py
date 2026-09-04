from django.urls import path

from .views import (
    CourseDetailView,
    CourseListCreateView,
    GoogleCalendarStatusView,
    GoogleCalendarSyncView,
    RoutineClearView,
    RoutineDetailView,
    RoutineImageImportView,
    RoutineListCreateView,
)


urlpatterns = [
    path('courses/', CourseListCreateView.as_view(), name='course-list'),
    path('courses/<str:pk>/', CourseDetailView.as_view(), name='course-detail'),
    path('routines/', RoutineListCreateView.as_view(), name='routine-list'),
    path('routines/clear/', RoutineClearView.as_view(), name='routine-clear'),
    path('routines/import-image/', RoutineImageImportView.as_view(), name='routine-import-image'),
    path('routines/<str:pk>/', RoutineDetailView.as_view(), name='routine-detail'),
    path('calendar/status/', GoogleCalendarStatusView.as_view(), name='google-calendar-status'),
    path('calendar/sync/', GoogleCalendarSyncView.as_view(), name='google-calendar-sync'),
]
