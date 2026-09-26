import firebase_admin
from firebase_admin import credentials, firestore
from functools import lru_cache
from typing import Any

@lru_cache(maxsize=1)
def get_db() -> Any:
    """Initializes Firebase and returns the Firestore client."""
    # Check if app is already initialized to prevent errors during local hot-reloads
    if not firebase_admin._apps:
        # ApplicationDefault automatically uses local emulator if FIRESTORE_EMULATOR_HOST is set
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred)
    
    return firestore.client()
