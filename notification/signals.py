from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from notification.models import Notification
from cv_generator.models import CV  # Ajustez selon votre app
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone

User = get_user_model()

@receiver(post_save, sender=CV)
def create_notification_on_cv_update(sender, instance, created, **kwargs):
    if not created:  # Modification d'un CV existant
        user = instance.last_updated_by
        if user and user.role == 'manager' and instance.utilisateur != user:
            collaborator = instance.utilisateur
            message = f"Votre manager {user.username} a modifié votre CV '{instance.title}' le {timezone.now().strftime('%Y-%m-%d %H:%M')}."
            notification = Notification.objects.create(
                recipient=collaborator,
                message=message,
                related_cv=instance
            )
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'notifications_{collaborator.id}',
                {
                    'type': 'send_notification',
                    'message': message
                }
            )

@receiver(post_delete, sender=CV)
def create_notification_on_cv_delete(sender, instance, **kwargs):
    user = instance.last_updated_by
    if user and user.role == 'manager' and instance.utilisateur != user:
        collaborator = instance.utilisateur
        message = f"Votre manager {user.username} a supprimé votre CV '{instance.title}' le {timezone.now().strftime('%Y-%m-%d %H:%M')}."
        notification = Notification.objects.create(
            recipient=collaborator,
            message=message
        )
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{collaborator.id}',
            {
                'type': 'send_notification',
                'message': message
            }
        )