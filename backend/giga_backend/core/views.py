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






from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Mission
from .serializers import MissionSerializer

@api_view(['GET', 'POST'])
def task_list(request):
    if request.method == 'GET':
        tasks = Mission.objects.all().order_by('-id')
        serializer = MissionSerializer(tasks, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = MissionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PATCH'])
def task_detail(request, pk):
    try:
        task = Mission.objects.get(pk=pk)
    except Mission.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    serializer = MissionSerializer(task, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

