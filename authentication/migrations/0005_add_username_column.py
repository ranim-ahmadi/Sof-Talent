from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0004_add_matricule_column'),  # Assure-toi que cette dépendance correspond à la migration correcte
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='username',
            field=models.CharField(max_length=255, unique=True, null=True),
        ),
    ]
