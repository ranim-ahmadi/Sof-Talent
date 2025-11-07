# fiche_poste_generator/urls.py
from django.urls import path
from .views import JobDescriptionCreateView

app_name = 'fiche_poste_generator'

urlpatterns = [
    path('create/', JobDescriptionCreateView.as_view(), name='create_job_description'),
]