import os
import django
import sys
from datetime import date

# Set up Django environment
sys.path.append('/Users/reyhanimece/giga/backend/giga_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'giga_backend.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from core.models import Mission, CustomUser, Project
from core.serializers import MissionSerializer

print("--- STARTING SERIALIZER POST DEBUG ---")

try:
    # Get a user for context
    user = CustomUser.objects.first()
    if not user:
        user = CustomUser.objects.create(username='debug_user', role='CEO')
    print(f"Using user: {user.username}")

    # Mock Request
    factory = APIRequestFactory()
    request = factory.post('/')
    request.user = user

    # Data to simulate frontend POST
    data = {
        "description": "Debug Post Mission",
        "assigned_date": date.today().isoformat(),
        "end_date": date.today().isoformat(),
        "priority": "HIGH",
        "department": "Software",
        "due_to": [user.id], 
        "status": "PENDING"
    }
    
    # Initialize Serializer with data
    print(f"Initializing Serializer with data: {data}")
    serializer = MissionSerializer(data=data, context={'request': request})

    # Validate
    if serializer.is_valid():
        print("Serializer is valid.")
        # Save (calls create)
        print("Attempting serializer.save()...")
        mission = serializer.save(created_by=user) # MissionViewSet.perform_create calls save(created_by=user)
        print(f"Mission created successfully: {mission.id}")
        print("Serialized Data:", serializer.data)
    else:
        print("Serializer Invalid!")
        print(serializer.errors)

except Exception as e:
    print("\n!!! EXCEPTION CAUGHT !!!")
    import traceback
    traceback.print_exc()

print("--- END DEBUG ---")
