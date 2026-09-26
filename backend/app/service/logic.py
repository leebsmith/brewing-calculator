from typing import Any
from app.schemas.models import PingResponse
from app.repositories import firestore

def process_ping(db: Any, message: str, user_id: str | None = None) -> PingResponse:
    """
    Business logic layer. 
    Enforces rules (e.g., uppercase conversion) before persisting.
    """
    processed_message = message.strip().upper()
    
    # Delegate persistence to the repository
    return firestore.save_ping(db, processed_message, user_id=user_id)
