from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Mission, MissionAttachment

# Eğer daha önce kayıt varsa, önce unregister et
try:
    admin.site.unregister(CustomUser)
except admin.sites.NotRegistered:
    pass

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """
    Django'nun built-in UserAdmin'ini kullan - şifre hash'leme otomatik
    """
    list_display = ['username', 'email', 'role', 'unvan', 'is_staff', 'is_active']
    list_filter = ['role', 'is_staff', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['role', 'username']
    
    # Mevcut kullanıcı düzenleme formu
    fieldsets = UserAdmin.fieldsets + (
        ('Ek Bilgiler', {
            'fields': ('role', 'unvan')
        }),
    )
    
    # Yeni kullanıcı ekleme formu
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Ek Bilgiler', {
            'fields': ('email', 'first_name', 'last_name', 'role', 'unvan')
        }),
    )


@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    list_display = ['id', 'description_short', 'created_by', 'assigned_date', 'end_date', 'completed', 'created_at']
    list_filter = ['completed', 'created_at', 'assigned_date']
    search_fields = ['description', 'from_to', 'created_by__username']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    filter_horizontal = ['due_to']  # Çoktan çoğa ilişki için güzel UI
    
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Görev Bilgileri', {
            'fields': ('description', 'from_to')
        }),
        ('Tarihler', {
            'fields': ('assigned_date', 'end_date')
        }),
        ('Atama', {
            'fields': ('created_by', 'due_to', 'completed')
        }),
        ('Zaman Damgaları', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)  # Varsayılan olarak kapalı
        }),
    )
    
    def description_short(self, obj):
        """Açıklamayı kısalt"""
        if obj.description:
            return obj.description[:50] + "..." if len(obj.description) > 50 else obj.description
        return "-"
    description_short.short_description = "Açıklama"


@admin.register(MissionAttachment)
class MissionAttachmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'mission', 'file_name', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['mission__description', 'file']
    date_hierarchy = 'uploaded_at'
    ordering = ['-uploaded_at']
    
    readonly_fields = ['uploaded_at']
    
    def file_name(self, obj):
        """Dosya adını göster"""
        return obj.file.name.split('/')[-1] if obj.file else "-"
    file_name.short_description = "Dosya Adı"