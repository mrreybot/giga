from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Mission


# ==============================
# 🔸 CustomUser Admin
# ==============================
@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('username', 'email', 'first_name', 'last_name', 'unvan', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_active', 'unvan')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'unvan')
    ordering = ('username',)

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Kişisel Bilgiler', {'fields': ('first_name', 'last_name', 'email', 'unvan')}),
        ('İzinler', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Tarih Bilgileri', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'unvan', 'is_active', 'is_staff'),
        }),
    )


# ==============================
# 🔸 Mission Admin
# ==============================
@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'description_short', 'assigned_date', 'end_date', 'completed', 'created_by')
    list_filter = ('completed', 'assigned_date', 'end_date', 'created_by')
    search_fields = ('description', 'from_to', 'created_by__username')
    date_hierarchy = 'assigned_date'
    filter_horizontal = ('due_to',)
    ordering = ('-created_at',)

    # Kısa açıklama görünümü
    def description_short(self, obj):
        return (obj.description[:50] + '...') if obj.description and len(obj.description) > 50 else obj.description
    description_short.short_description = "Açıklama"