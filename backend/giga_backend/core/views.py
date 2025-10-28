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