from django import forms
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

"""class UserCreationForm(forms.ModelForm):
    password2 = forms.CharField(label="Confirmer le mot de passe", widget=forms.PasswordInput)

    class Meta:
        model = get_user_model()
        fields = ['email', 'password', 'role']  # Champs pour le formulaire

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        password2 = cleaned_data.get('password2')

        # Vérification si les mots de passe correspondent
        if password != password2:
            raise forms.ValidationError("Les mots de passe ne correspondent pas.")
        return cleaned_data

    def save(self, commit=True):
        # Sauvegarde du mot de passe haché
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password'])
        if commit:
            user.save()
        return user"""


class UserUpdateForm(forms.ModelForm):
    class Meta:
        model = get_user_model()
        fields = ['email', 'role','matricule', 'username']  # Champs que l'admin peut modifier

    def clean_role(self):
        role = self.cleaned_data.get('role')

        # Validation du rôle, en utilisant les rôles définis dans le modèle
        valid_roles = dict(get_user_model().ROLE_CHOICES)  # On récupère les choix de rôles définis dans le modèle
        if role not in valid_roles:
            raise ValidationError("Le rôle sélectionné est invalide.")
        return role

    def save(self, commit=True):
        # Sauvegarde sans modifier le mot de passe
        user = super().save(commit=False)
        if commit:
            user.save()
        return user