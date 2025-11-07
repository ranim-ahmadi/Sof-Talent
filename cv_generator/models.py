from django.db import models
from django.conf import settings

class CV(models.Model):
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=100, verbose_name="Titre du CV", default="Mon CV")
    matricule = models.CharField(max_length=50, verbose_name="Matricule", blank=True, null=True)
    poste_actuel = models.CharField(max_length=255, verbose_name="Poste actuel")
    annees_experience = models.IntegerField(verbose_name="Nombre d'années d'expérience")
    overview = models.TextField(verbose_name="Présentation", blank=True, null=True)
    skills = models.TextField(verbose_name="Compétences")
    languages = models.TextField(verbose_name="Langues")
    certifications = models.TextField(verbose_name="Formations et certifications")
    email = models.EmailField(verbose_name="Email", blank=True, null=True)
    username = models.TextField(verbose_name="Username", blank=True, null=True)
    file_path = models.FileField(upload_to='generated_cvs/', null=True, blank=True, verbose_name="Chemin du fichier FR")
    file_path_en = models.FileField(upload_to='generated_cvs/', null=True, blank=True, verbose_name="Chemin du fichier EN")
    seniority = models.CharField(
        max_length=20,
        choices=[
            ('junior', 'Junior'),
            ('intermediate', 'Intermédiaire'),
            ('senior', 'Senior')
        ],
        default='junior',
        verbose_name="Niveau de seniorité"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    last_updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_cvs', verbose_name="Dernière mise à jour par")

    def __str__(self):
        return f"CV de {self.utilisateur.username if self.utilisateur else 'Anonyme'} - {self.title}"

class Experience(models.Model):
    cv = models.ForeignKey(CV, on_delete=models.CASCADE, related_name="experiences")
    employeur = models.CharField(max_length=255, verbose_name="Employeur")
    position = models.CharField(max_length=255, verbose_name="Position")
    missions = models.TextField(verbose_name="Missions")
    technologies = models.TextField(verbose_name="Technologies", blank=True, null=True)
    date_debut = models.DateField(verbose_name="Date de début")
    date_fin = models.DateField(verbose_name="Date de fin", blank=True, null=True)

    def __str__(self):
        return f"{self.position} chez {self.employeur}"