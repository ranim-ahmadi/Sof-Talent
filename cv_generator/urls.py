from django.urls import path
from .views import GenerateCVView, CVDownloadView, CVPreviewView, CvRetrieveUpdateAPIView, CvUserAPIView, CVDeleteView, \
    SearchAllCVsAPIView

urlpatterns = [
    path('generate/', GenerateCVView.as_view(), name='generate_cv'),
    path('generate/<int:id>/download/', CVDownloadView.as_view(), name='download_cv'),
    path('<int:id>/preview/', CVPreviewView.as_view(), name='preview_cv'),
    path('cv/<int:id>/', CvRetrieveUpdateAPIView.as_view(), name='cv-detail-update'),
    path('cv/user/', CvUserAPIView.as_view(), name='cv-user'),
    path('cv/<int:id>/delete/', CVDeleteView.as_view(), name='delete_cv'),
    path('search-all/', SearchAllCVsAPIView.as_view(), name='search-all-cvs'),
    path('search-and-access/', SearchAllCVsAPIView.as_view(), name='search-and-access-cvs'),
]