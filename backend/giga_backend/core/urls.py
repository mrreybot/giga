from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MissionViewSet, UserViewSet

router = DefaultRouter()
router.register(r'missions', MissionViewSet, basename='mission')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
]