from django.db import models
from django.conf import settings

class JobDescription(models.Model):
    user = models.ForeignKey(
        'authentication.CustomUser',
        on_delete=models.CASCADE,
        related_name='job_descriptions',
        verbose_name="Utilisateur",
        null=True,
    )
    file_name = models.CharField(
        max_length=255,
        verbose_name="Nom du fichier",
        blank=True,
        default=""
    )
    title = models.CharField(
        max_length=255,
        verbose_name="Titre du poste",
        blank=False,
        null=False
    )
    missions = models.TextField(
        verbose_name="Missions",
        blank=False,
        null=False
    )
    main_tasks = models.TextField(
        verbose_name="Activités principales",
        blank=False,
        null=False
    )
    profile = models.TextField(
        verbose_name="Profil",
        blank=False,
        null=False
    )
    technical_skills = models.JSONField(
        verbose_name="Compétences techniques",
        default=list,
        blank=False,
        null=False
    )
    personal_qualities = models.JSONField(
        verbose_name="Qualités personnelles",
        default=list,
        blank=True,
        null=True
    )
    keywords = models.JSONField(
        verbose_name="Mots-clés",
        default=list,
        blank=False,
        null=False
    )

    class Meta:
        verbose_name = "Fiche de poste"
        verbose_name_plural = "Fiches de poste"

    def __str__(self):
        return self.title or self.file_name