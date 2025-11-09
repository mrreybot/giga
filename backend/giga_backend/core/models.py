from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    unvan = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.unvan})" if self.unvan else self.username

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
    
    # Görevi oluşturan kullanıcı (opsiyonel, tracking için)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_missions"
    )
    
    # Görev tamamlandı mı?
    completed = models.BooleanField(default=False)
    
    # Oluşturulma tarihi (otomatik)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Mission {self.id}: {self.description[:50] if self.description else 'No description'}"

    class Meta:
        verbose_name = "Mission"
        verbose_name_plural = "Missions"
        ordering = ['-created_at']