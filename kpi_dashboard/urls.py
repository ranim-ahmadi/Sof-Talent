from django.urls import path
from . import views

urlpatterns = [
    path('analytics/', views.SeniorityAnalyticsAPIView.as_view(), name='seniority_analytics'),
]