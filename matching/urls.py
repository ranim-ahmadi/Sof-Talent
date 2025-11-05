# matching/urls.py
from django.urls import path
from .views import cv_match_view

app_name = 'matching'

urlpatterns = [
    path('job/<int:job_id>/match/', cv_match_view, name='cv_match'),
]