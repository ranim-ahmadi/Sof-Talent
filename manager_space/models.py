from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class UploadedFile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_files')
    file = models.FileField(upload_to='manager_space_uploads/')
    uploaded_at = models.DateTimeField(auto_now_add=True, null=True)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    is_job_description = models.BooleanField(default=False)
    matching_results = models.JSONField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.file_name and self.file:
            self.file_name = self.file.name
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.file_name} uploadé par {self.user.username}"