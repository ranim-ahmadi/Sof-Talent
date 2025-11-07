from django.urls import path
from . import views


urlpatterns = [
path('user-info/', views.user_info, name='user_info'),  # Ajout de l'endpoint user-info
    path('dashboard/', views.dashboard, name='admin_dashboard'),  # Vue pour afficher les utilisateurs
    path('user/<int:user_id>/update/', views.user_crud, name='user_crud_update'),  # Vue pour mettre à jour un utilisateur
    path('user/<int:user_id>/delete/', views.delete_user, name='delete_user'),  # Vue pour supprimer un utilisateur

]