from rest_framework import serializers
from .models import CustomUser, Mission, MissionAttachment


class CustomUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'password', 'unvan', 'role', 
            'first_name', 'last_name', 'full_name', 'department', 'phone',
            'profile_photo', 'email_notifications', 'task_reminders',
            'deadline_alerts', 'notification_email'
        ]
        read_only_fields = ['id', 'full_name', 'role']  # role sadece admin değiştirebilir
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }
    
    def get_full_name(self, obj):
        """Full name hesapla"""
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        elif obj.first_name:
            return obj.first_name
        elif obj.last_name:
            return obj.last_name
        return obj.username
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        # Role'u EMPLOYEE olarak zorla
        validated_data['role'] = 'EMPLOYEE'
        
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=password if password else 'temporary_password_123',
            unvan=validated_data.get('unvan', ''),
            role='EMPLOYEE',
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            department=validated_data.get('department', ''),
            phone=validated_data.get('phone', '')
        )
        return user
    
    def update(self, instance, validated_data):
        """Kullanıcı güncelleme - role ve password değiştirilemez"""
        validated_data.pop('role', None)  # role değiştirilemez
        validated_data.pop('password', None)  # password ayrı endpoint'ten değişir
        return super().update(instance, validated_data)


class UserRegisterSerializer(serializers.ModelSerializer):
    """Sadece kayıt için kullanılan özel serializer"""
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    department = serializers.CharField(required=False, allow_blank=True, max_length=100)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    
    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'password', 
            'first_name', 'last_name', 
            'department', 'phone'
        ]
    
    def validate_email(self, value):
        """Email doğrulama - @gmail.com kontrolü"""
        if not value.endswith('@gmail.com'):
            raise serializers.ValidationError("Lütfen geçerli bir Gmail adresi girin (@gmail.com)")
        
        # Email'in daha önce kullanılmadığını kontrol et
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("Bu e-posta adresi zaten kullanılıyor.")
        
        return value
    
    def validate_username(self, value):
        """Username'in unique olduğunu kontrol et"""
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("Bu kullanıcı adı zaten kullanılıyor.")
        return value
    
    def create(self, validated_data):
        """Yeni kullanıcı oluştur - Her zaman EMPLOYEE rolüyle"""
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            department=validated_data.get('department', ''),
            phone=validated_data.get('phone', ''),
            role='EMPLOYEE',  # Varsayılan rol - sadece admin değiştirebilir
            notification_email=validated_data['email']  # Bildirim email'i olarak da set et
        )
        return user


class MissionAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MissionAttachment
        fields = ['id', 'file', 'uploaded_at']


class MissionSerializer(serializers.ModelSerializer):
    attachments = MissionAttachmentSerializer(many=True, read_only=True)
    new_attachments = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False
    )

    due_to_details = CustomUserSerializer(source='due_to', many=True, read_only=True)
    created_by_details = CustomUserSerializer(source='created_by', read_only=True)
    
    due_to = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    
    # YETKİ ALANLARI (Frontend için)
    can_edit = serializers.SerializerMethodField()
    can_complete = serializers.SerializerMethodField()
    
    class Meta:
        model = Mission
        fields = [
            'id',
            'description',
            'assigned_date',
            'end_date',
            'from_to',
            'due_to',
            'due_to_details',
            'attachments',
            'created_by',
            'created_by_details',
            'completed',
            'created_at',
            'updated_at',
            'new_attachments',
            'can_edit',
            'can_complete',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_can_edit(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.can_edit(request.user)
        return False
    
    def get_can_complete(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.can_complete(request.user)
        return False
    
    def create(self, validated_data):
        due_to_users = validated_data.pop('due_to', [])
        new_files = validated_data.pop('new_attachments', [])
        mission = Mission.objects.create(**validated_data)
        if due_to_users:
            mission.due_to.set(due_to_users)
        for f in new_files:
            MissionAttachment.objects.create(mission=mission, file=f)
        return mission
    
    def update(self, instance, validated_data):
        due_to_users = validated_data.pop('due_to', None)
        new_files = validated_data.pop('new_attachments', [])
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if due_to_users is not None:
            instance.due_to.set(due_to_users)
        for f in new_files:
            MissionAttachment.objects.create(mission=instance, file=f)
        return instance
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['assigned_users'] = representation.pop('due_to_details', [])
        representation['created_by_info'] = representation.pop('created_by_details', None)
        representation.pop('due_to', None)
        return representation