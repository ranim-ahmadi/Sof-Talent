# manager_space/urls.py
from django.urls import path
from . import views
from .views import view_uploaded_file, job_history

urlpatterns = [
    path('team-cvs/', views.team_cvs, name='team_cvs'),
    path('upload/', views.upload_file, name='upload_file'),
    path('subordinates-files/', views.subordinates_files, name='subordinates_files'),
    path('view-file/<int:file_id>/', view_uploaded_file, name='view_uploaded_file'),
    path('job-history/', job_history, name='job_history'),
]