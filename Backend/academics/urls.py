from django.urls import path

from .views import RoutineDetailView, RoutineImageImportView, RoutineListCreateView


urlpatterns = [
    path('routines/', RoutineListCreateView.as_view(), name='routine-list'),
    path('routines/import-image/', RoutineImageImportView.as_view(), name='routine-import-image'),
    path('routines/<str:pk>/', RoutineDetailView.as_view(), name='routine-detail'),
]
