from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from .models import Mission, ProjectInvite, ProjectComment, Notification, ProjectMember

# 1. Mission Assignment Notification
@receiver(m2m_changed, sender=Mission.due_to.through)
def notify_mission_assignment(sender, instance, action, pk_set, **kwargs):
    if action == "post_add":
        for user_id in pk_set:
            Notification.objects.create(
                user_id=user_id,
                type='MISSION_ASSIGN',
                message=f"Yeni bir görev atandı: {(instance.description or '')[:30]}...",
                related_id=instance.id
            )

# 2. Mission Completion Notification
@receiver(post_save, sender=Mission)
def notify_mission_completion(sender, instance, created, **kwargs):
    if not created and instance.completed:
        # Notify the creator
        if instance.created_by and instance.created_by != instance.due_to.first():
             Notification.objects.create(
                user=instance.created_by,
                type='MISSION_COMPLETE',
                message=f"Oluşturduğunuz görev tamamlandı: {(instance.description or '')[:30]}...",
                related_id=instance.id
            )

# 3. Project Invite Notification
@receiver(post_save, sender=ProjectInvite)
def notify_project_invite(sender, instance, created, **kwargs):
    if created and instance.invited_user:
        Notification.objects.create(
            user=instance.invited_user,
            type='PROJECT_INVITE',
            message=f"{instance.project.title} projesine davet edildiniz.",
            related_id=instance.project.id
        )

# 4. Project Comment Notification
@receiver(post_save, sender=ProjectComment)
def notify_project_comment(sender, instance, created, **kwargs):
    if created:
        project = instance.project
        members = ProjectMember.objects.filter(project=project)
        for member in members:
            # Don't notify the commenter themselves
            if member.user != instance.user:
                Notification.objects.create(
                    user=member.user,
                    type='PROJECT_COMMENT',
                    message=f"{instance.user.username}, {project.title} projesine yorum yaptı.",
                    related_id=project.id
                )
