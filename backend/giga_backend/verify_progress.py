import os
import django
import sys

# Setup Django environment
sys.path.append('/Users/reyhanimece/giga/backend/giga_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'giga_backend.settings')
django.setup()

from core.models import Project, CustomUser, Mission, ProjectMember
from core.serializers import ProjectSerializer
from core.views import ProjectViewSet
from rest_framework.test import APIRequestFactory, force_authenticate

def run_test():
    print("--- Starting Project Progress & Deletion Test ---")
    
    # 1. Setup Users
    creator, _ = CustomUser.objects.get_or_create(username='test_creator', defaults={'email': 'creator@tuca.gov.tr'})
    other, _ = CustomUser.objects.get_or_create(username='test_other', defaults={'email': 'other@tuca.gov.tr'})
    
    # 2. Create Project
    project = Project.objects.create(title="Progress Test Project", description="Test Desc", created_by=creator)
    ProjectMember.objects.create(project=project, user=creator, role='ADMIN') # Creator is admin
    ProjectMember.objects.create(project=project, user=other, role='ADMIN')   # Other is also admin (to test permission strictly on creator check)
    
    print(f"Created Project: {project.title} (ID: {project.id})")
    
    # 3. Add Missions (Total 4, Completed 3 -> 75%)
    Mission.objects.create(project=project, description="Task 1", assigned_date="2024-01-01", end_date="2024-01-02", status='COMPLETED', completed=True, created_by=creator)
    Mission.objects.create(project=project, description="Task 2", assigned_date="2024-01-01", end_date="2024-01-02", status='COMPLETED', completed=True, created_by=creator)
    Mission.objects.create(project=project, description="Task 3", assigned_date="2024-01-01", end_date="2024-01-02", status='COMPLETED', completed=True, created_by=creator)
    Mission.objects.create(project=project, description="Task 4", assigned_date="2024-01-01", end_date="2024-01-02", status='PENDING', completed=False, created_by=creator)
    
    # 4. Verify Progress Calculation via Serializer
    print("\n--- Verifying Progress Calculation ---")
    factory = APIRequestFactory()
    request = factory.get('/')
    request.user = creator
    
    serializer = ProjectSerializer(project, context={'request': request})
    progress = serializer.data['progress']
    print(f"Calculated Progress: {progress}%")
    
    if progress == 75:
        print("✅ Progress calculation correct (75%).")
    else:
        print(f"❌ Progress calculation incorrect. Expected 75, got {progress}.")

    # 5. Verify Am I Creator
    am_i_creator = serializer.data['am_i_creator']
    if am_i_creator:
         print("✅ am_i_creator correct for creator.")
    else:
         print("❌ am_i_creator incorrect for creator.")

    # 6. Test Deletion Permission (As Other)
    print("\n--- Testing Deletion as Non-Creator ---")
    view = ProjectViewSet.as_view({'delete': 'destroy'})
    request = factory.delete(f'/api/projects/{project.id}/')
    force_authenticate(request, user=other)
    response = view(request, pk=project.id)
    
    if response.status_code == 403:
        print("✅ Non-creator cannot delete project (403 Forbidden).")
    else:
        print(f"❌ Non-creator delete failed check. Status: {response.status_code}")

    # 7. Test Deletion Permission (As Creator)
    print("\n--- Testing Deletion as Creator ---")
    request = factory.delete(f'/api/projects/{project.id}/')
    force_authenticate(request, user=creator)
    response = view(request, pk=project.id)
    
    if response.status_code == 204:
         print("✅ Creator successfully deleted project.")
         if not Project.objects.filter(id=project.id).exists():
             print("✅ Project removed from DB.")
    else:
         print(f"❌ Creator delete failed. Status: {response.status_code}")

    print("\nTest cleanup done.")

if __name__ == '__main__':
    run_test()
