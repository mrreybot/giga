from rest_framework import serializers
from .models import CustomUser, Mission, MissionAttachment, MissionFeedback, Project, ProjectMember, ProjectInvite, ProjectComment, Notification


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
# PROJECT SERIALIZERS
# =======================
class ProjectMemberSerializer(serializers.ModelSerializer):
    user = CustomUserSerializer(read_only=True)
    
    class Meta:
        model = ProjectMember
        fields = ['id', 'user', 'role', 'joined_at']

class ProjectInviteSerializer(serializers.ModelSerializer):
    invited_by_name = serializers.CharField(source='invited_by.username', read_only=True)
    project_name = serializers.CharField(source='project.title', read_only=True)

    class Meta:
        model = ProjectInvite
        fields = ['id', 'project', 'project_name', 'email', 'status', 'invited_by', 'invited_by_name', 'created_at']
        read_only_fields = ['id', 'invited_by', 'created_at', 'status', 'project_name']

class ProjectCommentSerializer(serializers.ModelSerializer):
    user_details = CustomUserSerializer(source='user', read_only=True)

    class Meta:
        model = ProjectComment
        fields = ['id', 'project', 'user', 'user_details', 'content', 'created_at']
        read_only_fields = ['id', 'user', 'created_at', 'project']

class ProjectSerializer(serializers.ModelSerializer):
    members = ProjectMemberSerializer(many=True, read_only=True)
    created_by_details = CustomUserSerializer(source='created_by', read_only=True)
    comments = ProjectCommentSerializer(many=True, read_only=True)
    is_member = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    am_i_creator = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ['id', 'title', 'description', 'topic', 'department', 'start_date', 'end_date', 'created_by', 'created_by_details', 'created_at', 'updated_at', 'members', 'comments', 'is_member', 'my_role', 'progress', 'am_i_creator']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_is_member(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.members.filter(user=request.user).exists()
        return False
    
    def get_my_role(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            member = obj.members.filter(user=request.user).first()
            return member.role if member else None
        return None

    def get_progress(self, obj):
        total_missions = obj.missions.count()
        if total_missions == 0:
            return 0
        completed_missions = obj.missions.filter(completed=True).count()
        return int((completed_missions / total_missions) * 100)

    def get_am_i_creator(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.created_by == request.user
        return False

    def create(self, validated_data):
        user = self.context['request'].user
        project = Project.objects.create(created_by=user, **validated_data)
        # Oluşturan kişiyi admin olarak ekle
        ProjectMember.objects.create(project=project, user=user, role='ADMIN')
        return project


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
    project_title = serializers.CharField(source='project.title', read_only=True)

    due_to = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        many=True,
        write_only=True,
        required=False
    )

    can_view = serializers.SerializerMethodField()
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
            'new_attachments', 'can_view', 'can_edit', 'can_complete',
            'project', 'project_title', 'priority', 'department', 'status'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_can_view(self, obj):
        request = self.context.get('request')
        return obj.can_view(request.user) if request else False

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

        # Sync 'completed' flag with 'status'
        if 'status' in validated_data and validated_data['status'] != 'COMPLETED':
            instance.completed = False

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
        return rep

# =======================
# NOTIFICATION SERIALIZER
# =======================
class NotificationSerializer(serializers.ModelSerializer):
    created_at_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = ['id', 'user', 'type', 'message', 'related_id', 'is_read', 'created_at', 'created_at_formatted']
        read_only_fields = ['id', 'user', 'created_at', 'type', 'message', 'related_id']

    def get_created_at_formatted(self, obj):
        return obj.created_at.strftime("%d.%m.%Y %H:%M")
