from django.db import migrations, models

def add_matricule_column(apps, schema_editor):
    # Ajouter la colonne matricule avec une valeur par défaut
    CustomUser = apps.get_model('authentication', 'CustomUser')
    db_alias = schema_editor.connection.alias
    with schema_editor.connection.cursor() as cursor:
        cursor.execute('ALTER TABLE authentication_customuser ADD COLUMN matricule VARCHAR(10);')

class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0003_add_role_column'),
    ]

    operations = [
        migrations.RunPython(add_matricule_column),
    ]
