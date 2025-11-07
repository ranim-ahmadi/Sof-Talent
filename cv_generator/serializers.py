from rest_framework import serializers
from .models import CV, Experience
from django.contrib.auth import get_user_model
import json

class ExperienceSerializer(serializers.ModelSerializer):
    missions = serializers.CharField(default="")
    technologies = serializers.CharField(default="")

    def to_internal_value(self, data):
        data = data.copy()
        if 'missions' in data:
            missions = data['missions']
            if isinstance(missions, list):
                data['missions'] = '\n'.join(str(m) for m in missions)
            elif isinstance(missions, str):
                data['missions'] = missions.strip()
        if 'technologies' in data:
            technologies = data['technologies']
            if isinstance(technologies, list):
                data['technologies'] = '\n'.join(str(t) for t in technologies)
            elif isinstance(technologies, str):
                data['technologies'] = technologies.strip()
        return super().to_internal_value(data)

    class Meta:
        model = Experience
        fields = ['employeur', 'position', 'missions', 'technologies', 'date_debut', 'date_fin']

class CVSerializer(serializers.ModelSerializer):
    experiences = ExperienceSerializer(many=True, required=False)
    utilisateur = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.all(),
        required=False
    )
    skills = serializers.JSONField(default="[]")
    languages = serializers.JSONField(default="[]")
    certifications = serializers.JSONField(default="[]")
    created_at = serializers.DateTimeField(read_only=True)
    email = serializers.EmailField(required=False)  # Retiré read_only=True
    username = serializers.CharField(required=False)  # Retiré read_only=True
    managed_by = serializers.SerializerMethodField()

    class Meta:
        model = CV
        fields = ['id', 'utilisateur', 'title', 'matricule', 'poste_actuel', 'annees_experience', 'overview',
                  'skills', 'languages', 'certifications', 'email', 'username', 'experiences', 'file_path', 'file_path_en',
                  'seniority', 'created_at', 'managed_by']

    def get_managed_by(self, obj):
        return obj.utilisateur.manager.username if obj.utilisateur.manager else None

    def create(self, validated_data):
        experiences_data = validated_data.pop('experiences', [])
        for field in ['skills', 'languages', 'certifications']:
            validated_data[field] = json.dumps(validated_data.get(field, []))
        cv = CV.objects.create(**validated_data)
        for exp_data in experiences_data:
            Experience.objects.create(cv=cv, **exp_data)
        return cv

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if rep.get('utilisateur') is None:
            rep.pop('utilisateur')
        for field in ['skills', 'languages', 'certifications']:
            value = getattr(instance, field)
            if isinstance(value, str):
                rep[field] = json.loads(value) if value else []
            elif isinstance(value, list):
                rep[field] = value
            else:
                rep[field] = []
        if 'experiences' in rep:
            for exp in rep['experiences']:
                if isinstance(exp['missions'], str):
                    exp['missions'] = [line.strip() for line in exp['missions'].split('\n') if line.strip()]
                if isinstance(exp['technologies'], str):
                    exp['technologies'] = [line.strip() for line in exp['technologies'].split('\n') if line.strip()]
        return rep

    def update(self, instance, validated_data):
        experiences_data = validated_data.pop('experiences', [])
        for field, value in validated_data.items():
            if field != 'utilisateur':
                if field in ['skills', 'languages', 'certifications']:
                    setattr(instance, field, json.dumps(value))
                else:
                    setattr(instance, field, value)
        instance.save()
        instance.experiences.all().delete()
        for exp_data in experiences_data:
            Experience.objects.create(cv=instance, **exp_data)
        return instance