from django.urls import path
from . import views

urlpatterns = [
    path('filter/', views.FilterCVsAPIView.as_view(), name='filter-cvs'),
]