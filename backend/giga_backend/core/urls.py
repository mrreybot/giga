from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CreateUserView, 
    UserProfileView,
    UserDetailView,  # YENİ
    ChangePasswordView,
    MissionViewSet, 
    AssignableUsersView, 
    OrganizationChartView,
    ProjectViewSet,
    ProjectInviteView,
    NotificationViewSet
)

# Router for ViewSets
router = DefaultRouter()
router.register(r'missions', MissionViewSet, basename='mission')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    # User endpoints
    path('user/register/', CreateUserView.as_view(), name='register'),
    path('user/profile/', UserProfileView.as_view(), name='profile'),
    path('user/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('user/<int:pk>/', UserDetailView.as_view(), name='user-detail'),  # YENİ: Kullanıcı güncelleme ve silme
    path('invites/', ProjectInviteView.as_view({'get': 'my_invites'}), name='my-invites'),
    path('invites/<int:pk>/respond/', ProjectInviteView.as_view({'post': 'respond'}), name='respond-invite'),
    
    # Organization endpoints
    path('users/assignable_users/', AssignableUsersView.as_view(), name='assignable-users-1'),
    path('users/assignable/', AssignableUsersView.as_view(), name='assignable-users-2'),
    path('users/organization/', OrganizationChartView.as_view(), name='organization-chart-1'),
    path('users/organization_chart/', OrganizationChartView.as_view(), name='organization-chart-2'),
    
    # Mission endpoints (router'dan geliyor)
    path('', include(router.urls)),
]