from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    unvan = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.unvan})"
    



class Mission(models.Model):
    task_id = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    assigned_date = models.DateField()
    end_date = models.DateField()
    from_to = models.CharField(max_length=255, blank=True, null=True)

    # Burayı değiştirdik 👇
    due_to = models.ManyToManyField(
        CustomUser,
        related_name="assigned_missions",
        blank=True
    )

    def __str__(self):
        return f"{self.task_id}"

    class Meta:
        verbose_name = "Mission"
        verbose_name_plural = "Missions"