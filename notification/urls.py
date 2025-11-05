from django.urls import path
from .views import NotificationListAPIView

urlpatterns = [
    path('notifications/<int:user_id>/', NotificationListAPIView.as_view(), name='notification-list'),
]