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
    # Okuma sırasında kullanıcı detaylarını göster
    due_to_details = CustomUserSerializer(source='due_to', many=True, read_only=True)
    created_by_details = CustomUserSerializer(source='created_by', read_only=True)
    
    # Yazma sırasında sadece ID'leri al
    due_to = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Mission
        fields = [
            'id',
            'description',
            'assigned_date',
            'end_date',
            'from_to',
            'due_to',  # Yazma için
            'due_to_details',  # Okuma için
            'created_by',
            'created_by_details',
            'completed',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def create(self, validated_data):
        # due_to listesini çıkar
        due_to_users = validated_data.pop('due_to', [])
        
        # Mission'ı oluştur
        mission = Mission.objects.create(**validated_data)
        
        # Kullanıcıları ekle
        if due_to_users:
            mission.due_to.set(due_to_users)
        
        return mission
    
    def update(self, instance, validated_data):
        # due_to güncellemesi
        due_to_users = validated_data.pop('due_to', None)
        
        # Diğer alanları güncelle
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Kullanıcıları güncelle
        if due_to_users is not None:
            instance.due_to.set(due_to_users)
        
        return instance
    
    def to_representation(self, instance):
        """Response'ta due_to yerine due_to_details göster"""
        representation = super().to_representation(instance)
        # due_to_details'i due_to olarak değiştir (frontend için daha kolay)
        representation['assigned_users'] = representation.pop('due_to_details', [])
        representation['created_by_info'] = representation.pop('created_by_details', None)
        representation.pop('due_to', None)  # Write-only field'ı kaldır
        return representation