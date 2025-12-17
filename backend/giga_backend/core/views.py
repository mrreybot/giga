from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser,JSONParser
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import (
    CustomUser, Mission, MissionAttachment, MissionFeedback,
    Project, ProjectMember, ProjectInvite, ProjectComment, Notification
)
from .serializers import (
    CustomUserSerializer, UserRegisterSerializer,
    MissionSerializer, MissionAttachmentSerializer, MissionFeedbackSerializer,
    ProjectSerializer, ProjectMemberSerializer, ProjectInviteSerializer,
    ProjectCommentSerializer, NotificationSerializer
)
import os
from django.utils import timezone
User = get_user_model()


# ============ USER VIEWS ============

class CreateUserView(generics.CreateAPIView):
    """Kullanıcı kayıt endpoint'i - Herkes erişebilir"""
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
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
    parser_classes = [MultiPartParser, FormParser,JSONParser]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Kullanıcı detay, güncelleme ve silme - Sadece CEO erişebilir"""
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated]
    queryset = User.objects.all()
    parser_classes = [MultiPartParser, FormParser,JSONParser]
    
    def get_object(self):
        """URL'den gelen ID'ye göre kullanıcı getir"""
        user_id = self.kwargs.get('pk')
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None
    
    def update(self, request, *args, **kwargs):
        """Kullanıcı güncelleme - Sadece CEO yapabilir"""
        if request.user.role != 'CEO':
            return Response(
                {"detail": "Sadece CEO kullanıcı bilgilerini güncelleyebilir."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance = self.get_object()
        if not instance:
            return Response(
                {"detail": "Kullanıcı bulunamadı."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        partial = kwargs.pop('partial', True)  # PATCH için partial=True
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Kullanıcı silme - Sadece CEO yapabilir"""
        if request.user.role != 'CEO':
            return Response(
                {"detail": "Sadece CEO kullanıcı silebilir."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance = self.get_object()
        if not instance:
            return Response(
                {"detail": "Kullanıcı bulunamadı."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Kendi hesabını silmeye çalışıyorsa engelle
        if instance.id == request.user.id:
            return Response(
                {"detail": "Kendi hesabınızı silemezsiniz."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        username = instance.username
        self.perform_destroy(instance)
        
        return Response(
            {"message": f"Kullanıcı '{username}' başarıyla silindi."},
            status=status.HTTP_204_NO_CONTENT
        )


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
        
        if not user.check_password(old_password):
            return Response(
                {"detail": "Mevcut şifre yanlış."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(new_password)
        user.save()
        
        return Response(
            {"message": "Şifre başarıyla güncellendi."},
            status=status.HTTP_200_OK
        )


# ============ MISSION VIEWSET (ROLE-BASED) ============

class MissionViewSet(viewsets.ModelViewSet):
    serializer_class = MissionSerializer
    permission_classes = [IsAuthenticated]
    @action(detail=True, methods=['patch'], url_path='toggle_complete')
    def toggle_complete(self, request, pk=None):
        """
        Görevi completed <-> uncompleted yapar.
        Hem oluşturucu hem assigned kullanıcı kullanabilir.
        """
        mission = self.get_object()
        user = request.user

        # Sadece görevi görüntüleyebilen kullanıcılar tamamlayabilir/geri alabilir
        if not mission.can_complete(user):
            return Response(
                {"detail": "Bu görevi tamamlama/geri alma yetkiniz yok."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Toggle işlemi
        mission.completed = not mission.completed
        
        # Status senkronizasyonu
        if mission.completed:
            mission.status = 'COMPLETED'
        else:
            mission.status = 'PENDING' # Varsayılan olarak PENDING'e dön
            
        mission.save()

        serializer = self.get_serializer(mission, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def get_queryset(self):
        """Kullanıcının görebildiği görevleri getir"""
        user = self.request.user
        
        # 1. Kullanıcının oluşturduğu veya atandığı görevler
        # 2. Kullanıcının üye olduğu projelerin görevleri
        queryset = Mission.objects.filter(
            Q(created_by=user) | 
            Q(due_to=user) |
            Q(project__members__user=user)
        ).distinct()
        
        # Proje filtresi
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
            
        return queryset
    
    def get_serializer_context(self):
        """Serializer'a request context'i gönder"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def create(self, request, *args, **kwargs):
        """Yeni görev oluştur - Herkes oluşturabilir (role bazlı atama kısıtlaması var)"""
        user = request.user
        due_to_ids = request.data.getlist('due_to') if hasattr(request.data, 'getlist') else request.data.get('due_to', [])
        
        if due_to_ids:
            assigned_users = User.objects.filter(id__in=due_to_ids)
            
            
            if user.role == 'EMPLOYEE':
                invalid_users = assigned_users.exclude(role='EMPLOYEE')
                if invalid_users.exists():
                    invalid_names = [u.username for u in invalid_users]
                    return Response(
                        {
                            "detail": f"Çalışanlar sadece diğer çalışanlara görev atayabilir. Geçersiz kullanıcılar: {', '.join(invalid_names)}",
                            "invalid_users": invalid_names
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            
            elif user.role == 'MANAGER':
                invalid_users = assigned_users.exclude(role__in=['EMPLOYEE', 'MANAGER'])
                if invalid_users.exists():
                    invalid_names = [u.username for u in invalid_users]
                    return Response(
                        {
                            "detail": f"Yöneticiler sadece çalışanlara görev atayabilir. Geçersiz kullanıcılar: {', '.join(invalid_names)}",
                            "invalid_users": invalid_names
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            
        
        # Görev oluştur
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def perform_create(self, serializer):
        """Görevi oluştururken created_by'ı set et"""
        serializer.save(created_by=self.request.user)
    
    def update(self, request, *args, **kwargs):
        """Görevi güncelle - Sadece created_by + role bazlı atama kontrolü"""
        mission = self.get_object()
        user = request.user
        
        # Düzenleme yetkisi kontrolü
        if not mission.can_edit(user):
            return Response(
                {"detail": "Bu görevi düzenleme yetkiniz yok. Sadece oluşturduğunuz görevleri düzenleyebilirsiniz."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Role bazlı atama kontrolü
        due_to_ids = request.data.getlist('due_to') if hasattr(request.data, 'getlist') else request.data.get('due_to', [])
        if due_to_ids:
            assigned_users = User.objects.filter(id__in=due_to_ids)
            
            # EMPLOYEE ise sadece EMPLOYEE'lere atayabilir
            if user.role == 'EMPLOYEE':
                invalid_users = assigned_users.exclude(role='EMPLOYEE')
                if invalid_users.exists():
                    invalid_names = [u.username for u in invalid_users]
                    return Response(
                        {
                            "detail": f"Çalışanlar sadece diğer çalışanlara görev atayabilir. Geçersiz kullanıcılar: {', '.join(invalid_names)}",
                            "invalid_users": invalid_names
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # MANAGER ise sadece EMPLOYEE'lere atayabilir
            elif user.role == 'MANAGER':
                invalid_users = assigned_users.exclude(role='EMPLOYEE')
                if invalid_users.exists():
                    invalid_names = [u.username for u in invalid_users]
                    return Response(
                        {
                            "detail": f"Yöneticiler sadece çalışanlara görev atayabilir. Geçersiz kullanıcılar: {', '.join(invalid_names)}",
                            "invalid_users": invalid_names
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        """Kısmi güncelleme - Sadece created_by + role bazlı atama kontrolü"""
        mission = self.get_object()
        user = request.user
        
        if not mission.can_edit(user):
            return Response(
                {"detail": "Bu görevi düzenleme yetkiniz yok."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Role bazlı atama kontrolü
        due_to_ids = request.data.getlist('due_to') if hasattr(request.data, 'getlist') else request.data.get('due_to', [])
        if due_to_ids:
            assigned_users = User.objects.filter(id__in=due_to_ids)
            
            # EMPLOYEE ise sadece EMPLOYEE'lere atayabilir
            if user.role == 'EMPLOYEE':
                invalid_users = assigned_users.exclude(role='EMPLOYEE')
                if invalid_users.exists():
                    invalid_names = [u.username for u in invalid_users]
                    return Response(
                        {
                            "detail": f"Çalışanlar sadece diğer çalışanlara görev atayabilir.",
                            "invalid_users": invalid_names
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # MANAGER ise sadece EMPLOYEE'lere atayabilir
            elif user.role == 'MANAGER':
                invalid_users = assigned_users.exclude(role='EMPLOYEE')
                if invalid_users.exists():
                    invalid_names = [u.username for u in invalid_users]
                    return Response(
                        {
                            "detail": f"Yöneticiler sadece çalışanlara görev atayabilir.",
                            "invalid_users": invalid_names
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        return super().partial_update(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def complete_with_feedback(self, request, pk=None):
        """
        Görevi tamamla ve opsiyonel yorum ekle.
        Body: { "comment": "İstersen yorum" }
        """
        mission = self.get_object()
        user = request.user

        # Sadece atanan kullanıcı tamamlayabilir
        if not mission.can_complete(user):
            return Response({"detail": "Bu görevi tamamlama yetkiniz yok."}, status=status.HTTP_403_FORBIDDEN)

        comment = (request.data.get('comment') or '').strip()

        if comment:
            MissionFeedback.objects.create(mission=mission, user=user, comment=comment)

        # completed toggle yerine **tamamla** (senin modelde toggle var; burada tamamla olarak ayarlıyorum)
        mission.completed = True
        mission.save()

        serializer = self.get_serializer(mission, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def add_feedback(self, request, pk=None):
        """Sadece yorum ekle (tamamlamayı etkilemez)."""
        mission = self.get_object()
        user = request.user

        # Yalnızca görevi görebilenler yorum yazsın (isAssigned veya creator)
        if not mission.can_view(user):
            return Response({"detail": "Bu görevi görüntüleme/yorum yazma yetkiniz yok."}, status=status.HTTP_403_FORBIDDEN)

        comment = request.data.get('comment', '').strip()
        if not comment:
            return Response({"detail": "Yorum boş olamaz."}, status=status.HTTP_400_BAD_REQUEST)

        fb = MissionFeedback.objects.create(mission=mission, user=user, comment=comment)
        serializer = MissionFeedbackSerializer(fb, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ============ ASSIGNABLE USERS (ROLE-BASED FILTERING) ============

class AssignableUsersView(generics.ListAPIView):
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # 1. HİYERARŞİK ROL FİLTRELEMESİ (Queryset'i tanımla)
        if user.role == 'CEO':
            # CEO herkesi görür
            queryset = User.objects.filter(is_active=True)
        elif user.role == 'MANAGER':
            # MANAGER sadece kendi ve alt seviyesini görür
            queryset = User.objects.filter(role__in=['MANAGER', 'EMPLOYEE'], is_active=True)
        elif user.role == 'EMPLOYEE':
            # EMPLOYEE sadece kendi seviyesini görür
            queryset = User.objects.filter(role='EMPLOYEE', is_active=True)
        else:
            # Rol yoksa veya bilinmiyorsa boş küme döndür
            return User.objects.none()

        # 2. PROJE BAZLI FİLTRELEME (Queryset'i daralt)
        project_id = self.request.query_params.get('project_id')
        if project_id:
            try:
                # DÜZELTME: İlişki alan adını doğru kullan (Many-to-Many veya FK üzerinden)
                # Burası daha önceki kodun doğru versiyonudur:
                queryset = queryset.filter(project_memberships__project_id=project_id)
            except Exception as e:
                 # Hata yakalama: Eğer bir NameError veya model ilişki hatası olursa
                 print(f"Proje filtrelemesi hatası: {e}")
                 return User.objects.none()


        # 3. SONUÇ DÖNDÜRME
        return queryset.order_by('role', 'username').distinct()
    
    # list metodu aynı kalır...
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
# ============ ORGANIZATION CHART ============

class OrganizationChartView(generics.ListAPIView):
    """Organizasyon yapısını getir - Herkes görebilir"""
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
# ============ PROJECT VIEWS ============

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Kullanıcının üye olduğu veya oluşturduğu projeler
        return Project.objects.filter(members__user=self.request.user).distinct()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        if project.created_by != request.user:
            return Response({"detail": "Sadece projeyi oluşturan kişi silebilir."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def invite_member(self, request, pk=None):
        project = self.get_object()
        
        # Herkes davet edebilir (IsAuthenticated zaten genel permission olarak var)
        # if not project.members.filter(user=request.user, role='ADMIN').exists():
        #     return Response({"detail": "Sadece yöneticiler davet gönderebilir."}, status=status.HTTP_403_FORBIDDEN)
        
        email = request.data.get('email')
        user_id = request.data.get('user_id')

        if not email and not user_id:
            return Response({"detail": "E-posta veya kullanıcı seçimi gereklidir."}, status=status.HTTP_400_BAD_REQUEST)
            
        invited_user = None

        if user_id:
             try:
                 invited_user = User.objects.get(id=user_id)
                 email = invited_user.email # Use user's email
             except User.DoesNotExist:
                 return Response({"detail": "Seçilen kullanıcı bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        # Kullanıcı sistemde var mı? (Email ile geldiyse)
        if not invited_user and email:
            try:
                invited_user = User.objects.get(email=email)
            except User.DoesNotExist:
                invited_user = None

        if invited_user:
             # Zaten üye mi?
            if project.members.filter(user=invited_user).exists():
                return Response({"detail": "Bu kullanıcı zaten projede ekli."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Zaten davet edilmiş mi?
        if ProjectInvite.objects.filter(project=project, email=email, status='PENDING').exists():
             return Response({"detail": "Bu e-postaya zaten bekleyen bir davet var."}, status=status.HTTP_400_BAD_REQUEST)

        invite = ProjectInvite.objects.create(
            project=project,
            invited_user=invited_user,
            email=email,
            invited_by=request.user
        )
        
        serializer = ProjectInviteSerializer(invite)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        """Projeden üye çıkarma endpointi"""
        project = self.get_object()
        
        # Sadece adminler üye çıkarabilir
        if not project.members.filter(user=request.user, role='ADMIN').exists():
            return Response({"detail": "Sadece yöneticiler üye çıkarabilir."}, status=status.HTTP_403_FORBIDDEN)

        member_id = request.data.get('member_id')
        user_id = request.data.get('user_id')

        member_to_remove = None
        
        if member_id:
             member_to_remove = project.members.filter(id=member_id).first()
        elif user_id:
             member_to_remove = project.members.filter(user_id=user_id).first()

        if not member_to_remove:
            return Response({"detail": "Üye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        
        # Admin kendini çıkaramaz (veya son admin çıkamaz mantığı eklenebilir ama şimdilik basit tutalım)
        if member_to_remove.user == request.user:
             return Response({"detail": "Kendinizi projeden çıkaramazsınız."}, status=status.HTTP_400_BAD_REQUEST)

        member_to_remove.delete()
        return Response({"message": "Üye projeden çıkarıldı."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        project = self.get_object()
        members = project.members.all()
        serializer = ProjectMemberSerializer(members, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        project = self.get_object()
        content = request.data.get('content')
        if not content:
            return Response({"detail": "Yorum içeriği gereklidir."}, status=status.HTTP_400_BAD_REQUEST)
        
        comment = ProjectComment.objects.create(
            project=project,
            user=request.user,
            content=content
        )
        serializer = ProjectCommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProjectInviteView(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def my_invites(self, request):
        # Bana gelen davetler (email eşleşmesi veya user eşleşmesi)
        invites = ProjectInvite.objects.filter(
            (Q(invited_user=request.user) | Q(email=request.user.email)),
            status='PENDING'
        )
        serializer = ProjectInviteSerializer(invites, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """Davete yanıt ver: status=ACCEPTED veya REJECTED"""
        try:
            invite = ProjectInvite.objects.get(pk=pk)
        except ProjectInvite.DoesNotExist:
             return Response({"detail": "Davet bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        # Davet bu kullanıcıya mı ait?
        if invite.invited_user != request.user and invite.email != request.user.email:
             return Response({"detail": "Bu davet size ait değil."}, status=status.HTTP_403_FORBIDDEN)
             
        response_status = request.data.get('status')
        if response_status not in ['ACCEPTED', 'REJECTED']:
            return Response({"detail": "Geçersiz durum."}, status=status.HTTP_400_BAD_REQUEST)
            
        invite.status = response_status
        invite.save()
        
        if response_status == 'ACCEPTED':
            ProjectMember.objects.create(
                project=invite.project,
                user=request.user,
                role='MEMBER'
            )
            
        return Response({"message": f"Davet {response_status} olarak işaretlendi."})


# ========================
# NOTIFICATION API
# ========================
class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'ok'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': 'ok'})

    @action(detail=False, methods=['post'])
    def clear_all(self, request):
        self.get_queryset().delete()
        return Response({'status': 'ok'})

