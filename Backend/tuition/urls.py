from django.urls import path

from .views import (
    TuitionClassSlotUpdateView,
    TuitionNoteDetailView,
    TuitionNoteListCreateView,
    TuitionStartNewMonthView,
    TuitionStudentDetailView,
    TuitionStudentListCreateView,
    TuitionSyncBatchView,
)

urlpatterns = [
    path('students/', TuitionStudentListCreateView.as_view(), name='tuition-student-list-create'),
    path('students/<str:pk>/', TuitionStudentDetailView.as_view(), name='tuition-student-detail'),
    path('students/<str:student_pk>/slots/<int:order>/', TuitionClassSlotUpdateView.as_view(), name='tuition-slot-update'),
    path('students/<str:student_pk>/start-new-month/', TuitionStartNewMonthView.as_view(), name='tuition-start-new-month'),
    path('students/<str:student_pk>/notes/', TuitionNoteListCreateView.as_view(), name='tuition-note-list-create'),
    path('students/<str:student_pk>/notes/<str:pk>/', TuitionNoteDetailView.as_view(), name='tuition-note-detail'),
    path('sync/', TuitionSyncBatchView.as_view(), name='tuition-sync-batch'),
]
