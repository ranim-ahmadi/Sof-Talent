# cv_generator/migrations/0002_alter_experience_missions.py
from django.db import migrations, models  # Ajoute 'models' ici
import json

def convert_text_to_json(apps, schema_editor):
    Experience = apps.get_model('cv_generator', 'Experience')
    for exp in Experience.objects.all():
        if isinstance(exp.missions, str) and exp.missions:  # Vérifie que missions est une chaîne non vide
            # Convertit la chaîne en une liste JSON avec un seul élément
            exp.missions = json.dumps([exp.missions])
        else:
            # Si missions est vide ou déjà un JSON, le laisser tel quel ou mettre une liste vide
            exp.missions = json.dumps([])
        # Sauvegarde avec le bon type pour PostgreSQL
        exp.save(update_fields=['missions'])

def reverse_convert_json_to_text(apps, schema_editor):
    Experience = apps.get_model('cv_generator', 'Experience')
    for exp in Experience.objects.all():
        if isinstance(exp.missions, str):  # Si c'est déjà une chaîne JSON
            missions_list = json.loads(exp.missions)
            exp.missions = missions_list[0] if missions_list else ''
        exp.save(update_fields=['missions'])

class Migration(migrations.Migration):
    dependencies = [
        ('cv_generator', '0001_initial'),  # Vérifie que cette dépendance correspond à ta migration initiale
    ]

    operations = [
        migrations.RunPython(convert_text_to_json, reverse_convert_json_to_text),
        migrations.AlterField(
            model_name='experience',
            name='missions',
            field=models.JSONField(verbose_name='Missions'),  # Maintenant résolu avec l'import
        ),
    ]