from django.urls import path
from .views import RegisterView, LoginView, LogoutView
from rest_framework import permissions


urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),  # Connexion
    path('logout/', LogoutView.as_view(), name='logout'),  # Nouvelle route pour la déconnexion

]