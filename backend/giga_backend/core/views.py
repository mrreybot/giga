from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import Mission
from .serializers import CustomUserSerializer, MissionSerializer, UserRegisterSerializer

User = get_user_model()

User = get_user_model()


class CreateUserView(generics.CreateAPIView):
    """Kullanıcı kayıt endpoint'i - Herkes erişebilir"""
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer  # Özel register serializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            "message": "Kullanıcı başarıyla oluşturuldu!",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "department": user.department,
                "phone": user.phone
            }
        }, status=status.HTTP_201_CREATED)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """Kullanıcının kendi profilini görüntüleme ve güncelleme"""
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)


class ChangePasswordView(generics.GenericAPIView):
    """Şifre değiştirme endpoint'i"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        if not old_password or not new_password:
            return Response(
                {"detail": "Eski ve yeni şifre gereklidir."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Eski şifreyi kontrol et
        if not user.check_password(old_password):
            return Response(
                {"detail": "Mevcut şifre yanlış."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Yeni şifreyi set et
        user.set_password(new_password)
        user.save()
        
        return Response(
            {"message": "Şifre başarıyla güncellendi."},
            status=status.HTTP_200_OK
        )


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
    
    # Bu metodu ekle - direkt array dönmesi için
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)  # Direkt array döner


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