from rest_framework import serializers
from .models import CustomUser, Mission, MissionAttachment


class CustomUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password', 'unvan', 'role', 
                  'first_name', 'last_name', 'full_name']
        read_only_fields = ['id', 'full_name']
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
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=password if password else 'temporary_password_123',
            unvan=validated_data.get('unvan', ''),
            role=validated_data.get('role', 'EMPLOYEE'),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
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