from django.shortcuts import render
from .models import CustomUser
from rest_framework.permissions import AllowAny
from rest_framework import generics
from .serializers import CustomUserSerializer

# Create your views here.
class CreateUserView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer
    permission_classes = [AllowAny]






from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Mission, CustomUser
from .serializers import MissionSerializer

class MissionViewSet(viewsets.ModelViewSet):
    """
    Mission CRUD işlemleri
    - List: Sadece giriş yapan kullanıcıya atanan görevleri göster
    - Create: Yeni görev oluştur
    - Update/Delete: Görev güncelle/sil
    """
    serializer_class = MissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Giriş yapan kullanıcıya atanan görevleri filtrele
        """
        user = self.request.user
        # Kullanıcıya atanan tüm görevler
        return Mission.objects.filter(due_to=user).distinct().prefetch_related('due_to', 'created_by')
    
    def perform_create(self, serializer):
        """
        Görev oluştururken created_by alanını otomatik doldur
        """
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['patch'])
    def toggle_complete(self, request, pk=None):
        """
        Görevin tamamlanma durumunu değiştir
        """
        mission = self.get_object()
        mission.completed = not mission.completed
        mission.save()
        serializer = self.get_serializer(mission)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_missions(self, request):
        """
        Giriş yapan kullanıcının görevlerini getir
        """
        missions = self.get_queryset()
        serializer = self.get_serializer(missions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def all_missions(self, request):
        """
        Tüm görevleri getir (admin/yönetici için)
        Sadece staff kullanıcılar erişebilir
        """
        if not request.user.is_staff:
            return Response(
                {"detail": "Bu işlem için yetkiniz yok."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        missions = Mission.objects.all().prefetch_related('due_to', 'created_by')
        serializer = self.get_serializer(missions, many=True)
        return Response(serializer.data)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Kullanıcı listesi (sadece okuma)
    Görev atamak için kullanılacak
    """
    queryset = CustomUser.objects.filter(is_active=True)
    serializer_class = CustomUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def assignable_users(self, request):
        """
        Görev atanabilecek aktif kullanıcılar
        """
        users = CustomUser.objects.filter(is_active=True).order_by('username')
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Giriş yapan kullanıcının bilgileri
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)