import time
from typing import Any
from app.schemas.models import PingResponse

def save_ping(db: Any, message: str) -> PingResponse:
    """Writes a ping record to Firestore and returns the mapped schema."""
    collection_ref = db.collection("pings")
    
    # Let Firestore generate the ID
    doc_ref = collection_ref.document()
    
    timestamp = int(time.time())
    data = {
        "id": doc_ref.id,
        "message": message,
        "timestamp": timestamp
    }
    
    # Execute the write
    doc_ref.set(data)
    
    # Return validated domain model
    return PingResponse(**data)
