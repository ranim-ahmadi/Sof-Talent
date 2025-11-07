from django.db import models
from django.conf import settings
from cv_generator.models import CV
from django.utils import timezone
from datetime import timedelta

class Notification(models.Model):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    related_cv = models.ForeignKey(CV, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"Notification for {self.recipient.username} - {self.message[:50]}"

    @property
    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(days=7)