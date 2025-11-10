from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MissionViewSet, UserViewSet


router = DefaultRouter()
router.register(r'missions', MissionViewSet, basename='mission')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
]
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
