from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
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
    description = models.TextField(blank=True, null=True)
    assigned_date = models.DateField()
    end_date = models.DateField()
    from_to = models.CharField(max_length=255, blank=True, null=True)
    
    # Görevin atandığı kullanıcılar (ManyToMany)
    due_to = models.ManyToManyField(
        CustomUser,
        related_name="assigned_missions",
        blank=True
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
        # Sadece görev kendisine atanmışsa complete edebilir
        return self.due_to.filter(id=user.id).exists()