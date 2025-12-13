import os
import django
import sys

# Setup Django environment
sys.path.append('/Users/reyhanimece/giga/backend/giga_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'giga_backend.settings')
django.setup()

from core.models import Mission, CustomUser, Project
from core.serializers import MissionSerializer
from rest_framework.test import APIRequestFactory, force_authenticate
from core.views import MissionViewSet

def run_test():
    print("--- Starting Mission Edit Permission Test ---")
    
    # 1. Setup Users
    creator, _ = CustomUser.objects.get_or_create(username='mission_creator', defaults={'email': 'mcreator@tuca.gov.tr'})
    other, _ = CustomUser.objects.get_or_create(username='mission_other', defaults={'email': 'mother@tuca.gov.tr'})
    
    # 2. Setup Project
    project = Project.objects.create(title="Edit Mission Test Project", created_by=creator)
    
    # 3. Create Mission
    mission = Mission.objects.create(
        project=project,
        description="Original Description",
        priority="LOW",
        created_by=creator,
        status="PENDING",
        assigned_date="2024-01-01",
        end_date="2024-01-02"
    )
    print(f"Created Mission: {mission.description} (ID: {mission.id}) by {creator.username}")

    factory = APIRequestFactory()
    view = MissionViewSet.as_view({'patch': 'partial_update'})

    # 4. Test Edit as Creator (Should Succeed)
    print("\n--- Testing Edit by Creator ---")
    payload = {'description': 'Updated Description', 'priority': 'HIGH'}
    request = factory.patch(f'/api/missions/{mission.id}/', payload, format='json')
    force_authenticate(request, user=creator)
    response = view(request, pk=mission.id)
    
    if response.status_code == 200:
        print("✅ Creator update successful.")
        mission.refresh_from_db()
        if mission.description == "Updated Description" and mission.priority == "HIGH":
            print("✅ Data correctly updated in DB.")
        else:
            print(f"❌ Data mismatch. Desc: {mission.description}, Priority: {mission.priority}")
    else:
        print(f"❌ Creator update failed. Status: {response.status_code}, Data: {response.data}")

    # 5. Test Edit as Other (Should Fail)
    print("\n--- Testing Edit by Other User ---")
    # Reset mission partially
    payload_fail = {'description': 'Hacker Update'}
    request = factory.patch(f'/api/missions/{mission.id}/', payload_fail, format='json')
    force_authenticate(request, user=other)
    response = view(request, pk=mission.id)
    
    # Expectation: 403 Forbidden or simply filtered out if not visible?
    # MissionViewSet usually filters queryset. Can 'other' see it?
    # If other is not in project, they might get 404.
    # If in project/can see, but not creator -> checking `can_edit_mission` logic?
    # MissionViewSet update checks `can_edit`? 
    # Wait, existing `update` method relies on `get_object`.
    # `perform_update` isn't overridden with strict check but `get_queryset` might filter visibility.
    # But `can_edit` is a serializer field. Does View enforce it?
    # Let's check `views.py` `update` or `partial_update` permissions.
    # Actually, `ModelViewSet` allows update if you can get the object.
    # Does `get_queryset` restrict? Usually visibility yes.
    # But permission to *modify* might need explicit check if not just visibility.
    # The requirement is "if I assigned it".
    # Let's run and see if it is currently allowed (SECURITY CHECK).
    
    if response.status_code in [403, 404]:
        print(f"✅ Other user prevented (Status: {response.status_code}).")
    else:
        print(f"⚠️ Other user got status: {response.status_code}. Checking if data changed...")
        mission.refresh_from_db()
        if mission.description == "Hacker Update":
             print("❌ SECURITY FLAW: Other user updated the mission!")
        else:
             print("✅ Data did not change (maybe serializer ignored it?).")

    # Cleanup
    project.delete() # CASCADES missions
    print("\nTest cleanup done.")

if __name__ == '__main__':
    run_test()
