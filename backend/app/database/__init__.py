import os
import firebase_admin
from firebase_admin import firestore
from functools import lru_cache
from typing import Any

@lru_cache(maxsize=1)
def get_db() -> Any:
    """Initializes Firebase and returns the Firestore client."""
    if not firebase_admin._apps:
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "batch-brewing-calculator")
        # When using emulators, initialize with project ID to bypass credentials
        firebase_admin.initialize_app(options={"projectId": project_id})
    
    return firestore.client()
