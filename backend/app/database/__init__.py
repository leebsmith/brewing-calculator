import firebase_admin
from firebase_admin import firestore
from functools import lru_cache
from typing import Any

@lru_cache(maxsize=1)
def get_db() -> Any:
    """Initializes Firebase and returns the Firestore client."""
    if not firebase_admin._apps:
        # When using emulators, initialize with project ID to bypass credentials
        firebase_admin.initialize_app(options={"projectId": "mono-repo-default"})
    
    return firestore.client()
