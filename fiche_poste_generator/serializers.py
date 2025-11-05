# fiche_poste_generator/serializers.py
from rest_framework import serializers
from .models import JobDescription

class JobDescriptionSerializer(serializers.ModelSerializer):
    technical_skills = serializers.ListField(child=serializers.CharField(), allow_empty=False)
    personal_qualities = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    main_tasks = serializers.ListField(child=serializers.CharField(), allow_empty=False)  # Changé en ListField
    missions = serializers.CharField(allow_blank=True, required=False)  # Rendu optionnel
    profile = serializers.CharField(allow_blank=False)
    keywords = serializers.ListField(child=serializers.CharField(), allow_empty=True)

    class Meta:
        model = JobDescription
        fields = [
            'id', 'title', 'missions', 'main_tasks', 'profile',
            'technical_skills', 'personal_qualities', 'keywords'
        ]
        read_only_fields = ['id']

    def validate_main_tasks(self, value):
        if not value:
            raise serializers.ValidationError("Les tâches principales ne peuvent pas être vides.")
        return value

    def validate_profile(self, value):
        if not value.strip():
            raise serializers.ValidationError("Le profil ne peut pas être vide.")

        # Vérifier les sections "Formation:" et "Expérience:"
        if "Formation:" not in value or "Expérience:" not in value:
            raise serializers.ValidationError(
                "Le profil doit contenir les sections 'Formation:' et 'Expérience:' séparées par un retour à la ligne."
            )

        # Vérifier que les sections ne sont pas vides
        profile_parts = value.split('\n')
        formation = next((part for part in profile_parts if part.startswith("Formation:")), None)
        experience = next((part for part in profile_parts if part.startswith("Expérience:")), None)

        if not formation or not formation.replace("Formation: ", "").strip():
            raise serializers.ValidationError("La section 'Formation:' ne peut pas être vide.")
        if not experience or not experience.replace("Expérience: ", "").strip():
            raise serializers.ValidationError("La section 'Expérience:' ne peut pas être vide.")

        return value

    def validate_keywords(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Les mots-clés doivent être une liste.")
        for keyword in value:
            if not isinstance(keyword, str) or not keyword.strip():
                raise serializers.ValidationError("Chaque mot-clé doit être une chaîne non vide.")
        return [keyword.strip() for keyword in value]