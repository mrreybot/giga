from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CreateUserView, 
    UserProfileView,
    UserDetailView,  # YENİ
    ChangePasswordView,
    MissionViewSet, 
    AssignableUsersView, 
    OrganizationChartView
)

# Router for ViewSets
router = DefaultRouter()
router.register(r'missions', MissionViewSet, basename='mission')

urlpatterns = [
    # User endpoints
    path('user/register/', CreateUserView.as_view(), name='register'),
    path('user/profile/', UserProfileView.as_view(), name='profile'),
    path('user/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('user/<int:pk>/', UserDetailView.as_view(), name='user-detail'),  # YENİ: Kullanıcı güncelleme ve silme
    
    # Organization endpoints
    path('users/assignable_users/', AssignableUsersView.as_view(), name='assignable-users-1'),
    path('users/assignable/', AssignableUsersView.as_view(), name='assignable-users-2'),
    path('users/organization/', OrganizationChartView.as_view(), name='organization-chart-1'),
    path('users/organization_chart/', OrganizationChartView.as_view(), name='organization-chart-2'),
    
    # Mission endpoints (router'dan geliyor)
    path('', include(router.urls)),
]