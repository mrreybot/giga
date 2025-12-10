from rest_framework import serializers
from .models import CustomUser, Mission, MissionAttachment, MissionFeedback


# =======================
# USER SERIALIZER
# =======================
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
        read_only_fields = ['id', 'full_name', 'role']
        extra_kwargs = {'password': {'write_only': True}}

    def get_full_name(self, obj):
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        if obj.first_name:
            return obj.first_name
        if obj.last_name:
            return obj.last_name
        return obj.username

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        validated_data['role'] = 'EMPLOYEE'
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=password or 'temporary_password_123',
            unvan=validated_data.get('unvan', ''),
            role='EMPLOYEE',
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            department=validated_data.get('department', ''),
            phone=validated_data.get('phone', '')
        )
        return user

    def update(self, instance, validated_data):
        validated_data.pop('role', None)
        validated_data.pop('password', None)
        return super().update(instance, validated_data)


# =======================
# USER REGISTER SERIALIZER
# =======================
class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField(required=True)

    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'password',
            'first_name', 'last_name',
            'department', 'phone', 'role'
        ]

    def validate_email(self, value):
        if not value.endswith('@tuca.gov.tr'):
            raise serializers.ValidationError("Lütfen @tuca.gov.tr ile biten e-posta girin.")
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("Bu e-posta zaten kullanılıyor.")
        return value

    def validate_username(self, value):
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("Bu kullanıcı adı zaten kullanılıyor.")
        return value

    def create(self, validated_data):
        validated_data['role'] = validated_data.get('role', 'EMPLOYEE')
        validated_data['notification_email'] = validated_data['email']
        return CustomUser.objects.create_user(**validated_data)


# =======================
# ATTACHMENTS
# =======================
class MissionAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MissionAttachment
        fields = ['id', 'file', 'uploaded_at']


# =======================
# FEEDBACK
# =======================
class MissionFeedbackSerializer(serializers.ModelSerializer):
    user = CustomUserSerializer(read_only=True)

    class Meta:
        model = MissionFeedback
        fields = ['id', 'user', 'comment', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


# =======================
# MISSION
# =======================
class MissionSerializer(serializers.ModelSerializer):
    attachments = MissionAttachmentSerializer(many=True, read_only=True)
    feedbacks = MissionFeedbackSerializer(many=True, read_only=True)

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

    can_edit = serializers.SerializerMethodField()
    can_complete = serializers.SerializerMethodField()

    class Meta:
        model = Mission
        fields = [
            'id', 'description', 'assigned_date', 'end_date',
            'from_to', 'due_to', 'due_to_details',
            'attachments', 'feedbacks',
            'created_by', 'created_by_details',
            'completed', 'created_at', 'updated_at',
            'new_attachments', 'can_edit', 'can_complete'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_can_edit(self, obj):
        request = self.context.get('request')
        return obj.can_edit(request.user) if request else False

    def get_can_complete(self, obj):
        request = self.context.get('request')
        return obj.can_complete(request.user) if request else False

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
        rep = super().to_representation(instance)

        rep['assigned_users'] = rep.pop('due_to_details', [])
        rep['created_by_info'] = rep.pop('created_by_details', None)
        rep.pop('due_to', None)

        return rep
