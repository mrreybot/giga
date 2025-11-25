from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.db.models import Q  # ✅ ÖNEMLİ: Bu satırı ekledik!
from .models import Mission
from .serializers import CustomUserSerializer, MissionSerializer

User = get_user_model()


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = CustomUserSerializer
    permission_classes = [AllowAny]


class MissionViewSet(viewsets.ModelViewSet):
    serializer_class = MissionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Kullanıcının görebildiği görevleri getir"""
        user = self.request.user
        # Kullanıcının oluşturduğu veya kendisine atanan görevler
        return Mission.objects.filter(
            Q(created_by=user) | Q(due_to=user)
        ).distinct()
    
    def get_serializer_context(self):
        """Serializer'a request context'i gönder (permissions için gerekli)"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        """Yeni görev oluştururken created_by'ı set et"""
        serializer.save(created_by=self.request.user)
    
    def update(self, request, *args, **kwargs):
        """Sadece created_by düzenleyebilir"""
        mission = self.get_object()
        if not mission.can_edit(request.user):
            return Response(
                {"detail": "Bu görevi düzenleme yetkiniz yok."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        """Sadece created_by düzenleyebilir"""
        mission = self.get_object()
        if not mission.can_edit(request.user):
            return Response(
                {"detail": "Bu görevi düzenleme yetkiniz yok."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().partial_update(request, *args, **kwargs)
    
    @action(detail=True, methods=['patch'])
    def toggle_complete(self, request, pk=None):
        """Görevi tamamla/tamamlanmadı olarak işaretle"""
        mission = self.get_object()
        
        # Sadece görev atananlar complete edebilir
        if not mission.can_complete(request.user):
            return Response(
                {"detail": "Bu görevi tamamlama yetkiniz yok. Sadece size atanan görevleri tamamlayabilirsiniz."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        mission.completed = not mission.completed
        mission.save()
        
        serializer = self.get_serializer(mission)
        return Response(serializer.data)


class AssignableUsersView(generics.ListAPIView):
    """Görev atanabilecek kullanıcıları listele"""
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return User.objects.all().order_by('role', 'username')


class OrganizationChartView(generics.ListAPIView):
    """Organizasyon yapısını getir (CEO, Manager, Employee)"""
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request, *args, **kwargs):
        users = User.objects.all().order_by('role', 'username')
        
        # Role'lere göre grupla
        org_chart = {
            'CEO': [],
            'MANAGER': [],
            'EMPLOYEE': []
        }
        
        for user in users:
            serializer = self.get_serializer(user)
            org_chart[user.role].append(serializer.data)
        
        return Response(org_chart)