from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
<<<<<<< HEAD
    unvan = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.unvan})"
    



class Mission(models.Model):
    task_id = models.CharField(max_length=100, unique=True)
=======
    ROLE_CHOICES = [
        ('CEO', 'CEO'),
        ('MANAGER', 'Manager'),
        ('EMPLOYEE', 'Employee'),
    ]
    
    unvan = models.CharField(max_length=100, blank=True, null=True, verbose_name="Ünvan")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='EMPLOYEE', verbose_name="Rol")
    
    # Yeni alanlar
    department = models.CharField(max_length=100, blank=True, null=True, verbose_name="Departman")
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Telefon")
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True, verbose_name="Profil Fotoğrafı")
    
    # Bildirim ayarları
    email_notifications = models.BooleanField(default=True, verbose_name="E-posta Bildirimleri")
    task_reminders = models.BooleanField(default=True, verbose_name="Görev Hatırlatıcıları")
    deadline_alerts = models.BooleanField(default=True, verbose_name="Termin Uyarıları")
    notification_email = models.EmailField(blank=True, null=True, verbose_name="Bildirim E-posta")

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})" if self.role else self.username

    class Meta:
        verbose_name = "Kullanıcı"
        verbose_name_plural = "Kullanıcılar"


class MissionAttachment(models.Model):
    mission = models.ForeignKey(
        'Mission',
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file = models.FileField(upload_to='mission_files/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file.name
    

class Mission(models.Model):
>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced
    description = models.TextField(blank=True, null=True)
    assigned_date = models.DateField()
    end_date = models.DateField()
    from_to = models.CharField(max_length=255, blank=True, null=True)
<<<<<<< HEAD

    # Burayı değiştirdik 👇
=======
    
    # Görevin atandığı kullanıcılar (ManyToMany)
>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced
    due_to = models.ManyToManyField(
        CustomUser,
        related_name="assigned_missions",
        blank=True
    )

<<<<<<< HEAD
    def __str__(self):
        return f"{self.task_id}"

    class Meta:
        verbose_name = "Mission"
        verbose_name_plural = "Missions"
=======
    # Yeni Alanlar
    PRIORITY_CHOICES = [
        ('LOW', 'Düşük'),
        ('MEDIUM', 'Orta'),
        ('HIGH', 'Yüksek'),
    ]
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM', verbose_name="Öncelik")
    department = models.CharField(max_length=100, blank=True, null=True, verbose_name="İlgilenen Departman")

    STATUS_CHOICES = [
        ('PENDING', 'Yapılacak'),
        ('IN_PROGRESS', 'Devam Ediyor'),
        ('COMPLETED', 'Tamamlandı'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', verbose_name="Durum")

    # Proje (Optional)
    project = models.ForeignKey(
        'Project',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='missions',
        verbose_name="Proje"
    )
    
    # Görevi oluşturan kullanıcı
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_missions"
    )
    
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.status == 'COMPLETED':
            self.completed = True
        elif self.completed and self.status != 'COMPLETED':
             # Fallback if only completed is set
             self.status = 'COMPLETED'
        else:
            self.completed = False
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Mission {self.id}: {self.description[:50] if self.description else 'No description'}"

    class Meta:
        verbose_name = "Mission"
        verbose_name_plural = "Missions"
        ordering = ['-created_at']
    
    # ============ YETKİ KONTROL METODları ============
    
    def can_view(self, user):
        """Kullanıcı bu görevi görebilir mi?"""
        # Görevi oluşturan kişi görebilir
        if self.created_by == user:
            return True
        # Görev kendisine atanmışsa görebilir
        if self.due_to.filter(id=user.id).exists():
            return True
        return False
    
    def can_edit(self, user):
        """Kullanıcı bu görevi düzenleyebilir mi?"""
        # Sadece görevi oluşturan kişi düzenleyebilir
        return self.created_by == user
    
    def can_complete(self, user):
        """Kullanıcı bu görevi tamamlayabilir mi?"""
        # 1. Görev kendisine atanmışsa
        if self.due_to.filter(id=user.id).exists():
            return True
        # 2. Görevi oluşturan kişiyse
        if self.created_by == user:
            return True
        # 3. Proje yöneticisiyse
        if self.project and self.project.members.filter(user=user, role='ADMIN').exists():
            return True
            
        return False
    
class MissionFeedback(models.Model):
    mission = models.ForeignKey(
        'Mission',
        on_delete=models.CASCADE,
        related_name='feedbacks'
    )
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='mission_feedbacks'
    )
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        user_name = f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username
        return f"Feedback #{self.id} by {user_name} on Mission {self.mission.id}"


class Project(models.Model):
    title = models.CharField(max_length=200, verbose_name="Proje Adı")
    description = models.TextField(blank=True, null=True, verbose_name="Açıklama")
    topic = models.CharField(max_length=200, blank=True, null=True, verbose_name="Konu")
    department = models.CharField(max_length=100, blank=True, null=True, verbose_name="Departman")
    start_date = models.DateField(blank=True, null=True, verbose_name="Başlangıç Tarihi")
    end_date = models.DateField(blank=True, null=True, verbose_name="Bitiş Tarihi")

    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='created_projects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class ProjectMember(models.Model):
    ROLE_CHOICES = [
        ('ADMIN', 'Yönetici'),
        ('MEMBER', 'Üye'),
    ]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='project_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='MEMBER')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('project', 'user')

class ProjectInvite(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Bekliyor'),
        ('ACCEPTED', 'Kabul Edildi'),
        ('REJECTED', 'Reddedildi'),
    ]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='invites')
    invited_user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='project_invites', null=True, blank=True)
    email = models.EmailField(blank=True, null=True, verbose_name="Davet Edilen E-posta") # Eğer user yoksa
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    invited_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sent_invites')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.project.title} - {self.email or self.invited_user.username}"


class ProjectComment(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='project_comments')
    content = models.TextField(verbose_name="Yorum")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.username} - {self.project.title}"


class Notification(models.Model):
    TYPE_CHOICES = [
        ('MISSION_ASSIGN', 'Görev Ataması'),
        ('PROJECT_INVITE', 'Proje Daveti'),
        ('PROJECT_COMMENT', 'Yeni Yorum'),
        ('MISSION_COMPLETE', 'Görev Tamamlandı'),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    message = models.TextField()
    related_id = models.IntegerField(null=True, blank=True) # ID of related object (Mission, Project, etc.)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.type}"
>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced
