from django.contrib import admin
from django.contrib.auth.views import LogoutView
from django.urls import path, include
from django.shortcuts import redirect
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from cv_generator.views import GenerateCVView, CVDownloadView, CVPreviewView, CvRetrieveUpdateAPIView
# main_project/urls.py



from authentication.views import RegisterView, LoginView
from dashboardAdmin import views
#from formCV.views import CvCreateAPIView, CvRetrieveUpdateAPIView


urlpatterns = [
    path('admin/', admin.site.urls),  # Administration Django
    path('api/', include('authentication.urls')),  # API pour l'authentification
    path('login/', LoginView.as_view(), name='login'),  # Connexion
    path('register/', RegisterView.as_view(), name='register'),
    path('logout/', LogoutView.as_view(), name='logout'),# Inscription
    path('dashboard/', views.dashboard, name='admin_dashboard'),
    path('dashboard/', include('dashboardAdmin.urls')),  # Tableau de bord avec la liste des utilisateurs
    path('user-info/', views.user_info, name='user_info'),  # Ajout de l'endpoint user-info
    path('user/<int:user_id>/update/', views.user_crud, name='user_crud_update'),
    # Vue pour mettre à jour un utilisateur
    path('user/<int:user_id>/delete/', views.delete_user, name='delete_user'),  # Vue pour supprimer un utilisateur
    path('api/cv/', include('cv_generator.urls')),
    path('', lambda request: redirect('/dashboard/')),  # Redirection par défaut vers la page d'enregistrement
    path('api/kpi/', include('kpi_dashboard.urls')),
    path('api/cv/cvfilter/', include('cvfilter.urls')),  # URLs pour cvfilter
    path('api/fiche-poste/', include('fiche_poste_generator.urls', namespace='fiche_poste_generator')),
    path('api/manager-space/', include('manager_space.urls')),
    path('api/matching/', include('matching.urls', namespace='matching')),  # Ajout
path('', include('notification.urls')),
]