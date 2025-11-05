from django.contrib.auth import get_user_model
from rest_framework import serializers

class RegisterSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(write_only=True)  # Champ de confirmation du mot de passe

    class Meta:
        model = get_user_model()
        fields = ['email', 'username', 'matricule', 'password', 'password2']  # Ajoutez les champs nécessaires

    def validate(self, data):
        # Vérification que les mots de passe correspondent
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas.")
        return data

    def create(self, validated_data):
        # Enlève password2 car il n'est pas nécessaire pour la création de l'utilisateur
        validated_data.pop('password2')
        user = get_user_model().objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            matricule=validated_data['matricule'],
            password=validated_data['password'],
        )
        return user