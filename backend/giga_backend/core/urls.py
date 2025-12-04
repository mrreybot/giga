from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MissionViewSet, AssignableUsersView, OrganizationChartView

router = DefaultRouter()
router.register(r'missions', MissionViewSet, basename='mission')

urlpatterns = [
    path('', include(router.urls)),
    path('users/assignable_users/', AssignableUsersView.as_view(), name='assignable-users'),
    path('users/organization_chart/', OrganizationChartView.as_view(), name='organization-chart'),
]