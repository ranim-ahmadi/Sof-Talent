from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # Définir les choix pour les rôles d'utilisateur
    ROLE_CHOICES = [
        ('employee', 'Employee'),
        ('manager', 'Manager'),
    ]

    # Ajouter un champ pour le rôle
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='employee')

    # Le champ email doit être unique pour chaque utilisateur
    email = models.EmailField(unique=True)

    # Ajouter un champ matricule unique pour chaque utilisateur
    matricule = models.CharField(max_length=50)

    # Si tu veux modifier le champ username, tu peux le faire ici.
    username = models.CharField(max_length=150)

    # Utilisation de la méthode __str__ pour afficher l'email
    def __str__(self):
        return self.username  # Affiche le nom d'utilisateur dans l'interface admin
