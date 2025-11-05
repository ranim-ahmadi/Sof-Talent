from django.db import migrations


def add_role_column(apps, schema_editor):
    # Cette fonction ne fait rien, mais elle indique que la colonne "role" a été ajoutée manuellement.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0002_alter_customuser_options_alter_customuser_managers_and_more'),
    ]

    operations = [
        migrations.RunPython(add_role_column),  # Ajoute cette opération vide
    ]
