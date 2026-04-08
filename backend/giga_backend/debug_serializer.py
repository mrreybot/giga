import os
import django
import sys

# Set up Django environment
sys.path.append('/Users/reyhanimece/giga/backend/giga_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'giga_backend.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from core.models import Mission, CustomUser
from core.serializers import MissionSerializer

print("--- STARTING SERIALIZER DEBUG ---")

try:
    # Get a user for context
    user = CustomUser.objects.first()
    if not user:
        print("No users found! creating one...")
        user = CustomUser.objects.create(username='debug_user', role='CEO')

    print(f"Using user: {user.username}")

    # Create a dummy mission if none exist (to ensure we test serialization)
    if Mission.objects.count() == 0:
        print("No missions found. Creating a dummy mission...")
        from datetime import date
        Mission.objects.create(
            description="Debug Mission",
            assigned_date=date.today(),
            end_date=date.today(),
            created_by=user
        )

    # Fetch missions
    missions = Mission.objects.all()
    print(f"Found {missions.count()} missions.")

    # Mock Request
    factory = APIRequestFactory()
    request = factory.get('/')
    request.user = user

    # Attempt Initialization
    print("Initializing Serializer...")
    serializer = MissionSerializer(missions, many=True, context={'request': request})

    # Attempt Serialization (accessing .data triggers the process)
    print("Accessing serializer.data...")
    data = serializer.data
    print("Serialization Successful!")

except Exception as e:
    print("\n!!! EXCEPTION CAUGHT !!!")
    import traceback
    traceback.print_exc()

print("--- END DEBUG ---")
