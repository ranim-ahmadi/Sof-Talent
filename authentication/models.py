from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('L\'email est requis')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

class CustomUser(AbstractBaseUser):
    ROLE_CHOICES = (
        ('manager', 'Manager'),
        ('employee', 'Employee'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='employee')
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150)
    matricule = models.IntegerField(unique=True)

    # Ajout du champ pour stocker le matricule du manager
    manager_matricule = models.IntegerField(null=True, blank=True)

    # Ajout du champ manager (relation ForeignKey vers un autre CustomUser)
    manager = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subordinates',
        limit_choices_to={'role': 'manager'}
    )

    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    is_superuser = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'matricule']

    objects = CustomUserManager()

    def __str__(self):
        return self.username

    def save(self, *args, **kwargs):
        if self.manager_matricule:
            try:
                manager = CustomUser.objects.get(matricule=self.manager_matricule, role='manager')
                self.manager = manager
            except CustomUser.DoesNotExist:
                self.manager = None
        else:
            self.manager = None
        super().save(*args, **kwargs)

    def get_all_team_members(self, visited=None):
        if visited is None:
            visited = set()

        if self.id in visited:
            return set()
        visited.add(self.id)

        direct_members = self.subordinates.all()
        all_members = set(direct_members)

        for member in direct_members:
            if member.role == 'manager':
                sub_members = member.get_all_team_members(visited)
                all_members.update(sub_members)

        return all_members