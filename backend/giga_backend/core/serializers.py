from rest_framework import serializers
from .models import CustomUser, Mission

# ---------------------------
# CustomUser Serializer
# ---------------------------
# serializers.py

class CustomUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password', 'unvan']
        read_only_fields = ['id']
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            unvan=validated_data.get('unvan', '')
        )
        return user

# ---------------------------
# Mission Serializer
# ---------------------------
class MissionSerializer(serializers.ModelSerializer):
    # ManyToMany alanını nested serializer ile gösterebiliriz
    due_to = CustomUserSerializer(many=True, read_only=True)

    class Meta:
        model = Mission
        fields = ['id', 'task_id', 'description', 'assigned_date', 'end_date', 'from_to', 'due_to']
        read_only_fields = ['id']