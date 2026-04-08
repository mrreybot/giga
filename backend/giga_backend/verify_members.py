import os
import django
import sys
import json

# Setup Django environment
sys.path.append('/Users/reyhanimece/giga/backend/giga_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'giga_backend.settings')
django.setup()

from core.models import Project, CustomUser, ProjectMember
from rest_framework.test import APIRequestFactory
from core.views import ProjectViewSet

def run_test():
    print("--- Starting Project Member Management Test ---")
    
    # 1. Setup Data
    admin_user, _ = CustomUser.objects.get_or_create(username='proj_admin', defaults={'email': 'admin@tuca.gov.tr', 'role': 'CEO'})
    invited_user, _ = CustomUser.objects.get_or_create(username='proj_inv_user', defaults={'email': 'invited@tuca.gov.tr', 'department': 'IT'})
    
    project = Project.objects.create(title="Test Project", description="Test Desc", created_by=admin_user)
    ProjectMember.objects.create(project=project, user=admin_user, role='ADMIN')
    
    print(f"Created Project: {project.title} (ID: {project.id})")
    print(f"Created Admin: {admin_user.username} (ID: {admin_user.id})")
    print(f"Created User to Invite: {invited_user.username} (ID: {invited_user.id})")
    
    from rest_framework.test import force_authenticate
    factory = APIRequestFactory()
    view = ProjectViewSet.as_view({'post': 'invite_member'})
    
    # 2. Test Invite by ID
    print("\n--- Testing Invite by ID ---")
    request = factory.post(f'/api/projects/{project.id}/invite_member/', {'user_id': invited_user.id}, format='json')
    force_authenticate(request, user=admin_user)
    response = view(request, pk=project.id)
    
    if response.status_code == 201:
        print("✅ Invite sent successfully.")
        # Auto-accept for test purposes (simulate acceptance or just check invite existence)
        # Actually API creates an invite. User needs to accept.
        # But wait, the previous code for invites created ProjectInvite.
        # A ProjectMember is only created when accepted.
        # Let's verify invite exists.
        invite = project.invites.filter(invited_user=invited_user).first()
        if invite:
             print("✅ Invite object found in DB.")
             # Manually accept to test removal next
             ProjectMember.objects.create(project=project, user=invited_user, role='MEMBER')
             invite.status = 'ACCEPTED'
             invite.save()
             print("   (Manually accepted invite for removal test)")
        else:
             print("❌ Invite object NOT found.")
    else:
        print(f"❌ Invite failed. Status: {response.status_code}, Data: {response.data}")

    # 3. Test Remove Member
    print("\n--- Testing Remove Member ---")
    member_to_remove = ProjectMember.objects.get(project=project, user=invited_user)
    
    remove_view = ProjectViewSet.as_view({'post': 'remove_member'})
    request = factory.post(f'/api/projects/{project.id}/remove_member/', {'member_id': member_to_remove.id}, format='json')
    force_authenticate(request, user=admin_user)
    response = remove_view(request, pk=project.id)
    
    if response.status_code == 200:
        print("✅ Remove response successful.")
        if not ProjectMember.objects.filter(id=member_to_remove.id).exists():
             print("✅ Member successfully removed from DB.")
        else:
             print("❌ Member still exists in DB.")
    else:
        print(f"❌ Remove failed. Status: {response.status_code}, Data: {response.data}")

    # Cleanup
    project.delete()
    # Users kept for re-run potential
    print("\nTest cleanup done.")

if __name__ == '__main__':
    run_test()
