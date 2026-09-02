from django.urls import path

from .views import CurrentUserView, SyncView


urlpatterns = [
    path('auth/me/', CurrentUserView.as_view(), name='current-user'),
    path('sync/', SyncView.as_view(), name='sync'),
]
