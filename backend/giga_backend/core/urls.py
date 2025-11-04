# urls.py
from django.urls import path
from .views import task_list, task_detail

urlpatterns = [
    path('missions/', task_list, name='task_list'),
    path('missions/<int:pk>/', task_detail, name='task_detail'),
]