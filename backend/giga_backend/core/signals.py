from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from .models import Mission, ProjectInvite, ProjectComment, Notification, ProjectMember

# 1. Mission Assignment Notification
@receiver(m2m_changed, sender=Mission.due_to.through)
def notify_mission_assignment(sender, instance, action, pk_set, **kwargs):
    if action == "post_add":
        print(f"DEBUG: Mission assignment signal triggered for mission {instance.id}")
        for user_id in pk_set:
            # 1. Create DB Notification
            print(f"DEBUG: Creating notification for user {user_id}")
            notification = Notification.objects.create(
                user_id=user_id,
                type='MISSION_ASSIGN',
                message=f"Yeni bir görev atandı: {(instance.description or '')[:30]}...",
                related_id=instance.id
            )
            
            # 2. Send Email
            user = notification.user
            print(f"DEBUG: User {user.username} - Email Pref: {user.email_notifications}")
            if user.email_notifications:
                target_email = user.notification_email or user.email
                print(f"DEBUG: Target email: {target_email}")
                if target_email:
                    try:
                        print(f"DEBUG: Attempting to send email to {target_email}")
                        send_mail(
                            subject=f"Yeni Görev Atandı: #{instance.id}",
                            message=f"Merhaba {user.username},\n\n"
                                    f"Size yeni bir görev atandı:\n\n"
                                    f"Açıklama: {instance.description}\n"
                                    f"Son Tarih: {instance.end_date}\n\n"
                                    f"İyi çalışmalar,\nGIGA Yönetim Sistemi",
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[target_email],
                            fail_silently=False  # CHANGED TO FALSE FOR DEBUGGING
                        )
                        print("DEBUG: Email sent successfully!")
                    except Exception as e:
                        print(f"ERROR: Mail sending failed (Mission): {e}")
                else:
                    print("DEBUG: No target email found for user.")


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
    if created:
        # 1. Send Email (Always first for invitations)
        target_email = instance.email
        if instance.invited_user:
            target_email = instance.invited_user.notification_email or instance.invited_user.email
            
            # Create DB Notification for existing user
            Notification.objects.create(
                user=instance.invited_user,
                type='PROJECT_INVITE',
                message=f"{instance.project.title} projesine davet edildiniz.",
                related_id=instance.project.id
            )

        if target_email:
            try:
                invite_link = "http://localhost:5173/dashboard" # Adjust production URL
                send_mail(
                    subject=f"Proje Daveti: {instance.project.title}",
                    message=f"Merhaba,\n\n"
                            f"{instance.invited_by.username} sizi '{instance.project.title}' projesine davet etti.\n\n"
                            f"Daveti görüntülemek için sistemi ziyaret edin: {invite_link}\n\n"
                            f"İyi çalışmalar,\nGIGA Yönetim Sistemi",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[target_email],
                    fail_silently=True
                )
            except Exception as e:
                print(f"Mail gönderme hatası (Invite): {e}")

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
