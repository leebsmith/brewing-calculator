from fastapi import FastAPI, Depends
from typing import Any
from app.database import get_db
from app.service import logic
from app.schemas.models import PingResponse

app = FastAPI(title="Mono-Repo MWE")

@app.get("/ping", response_model=PingResponse)
def ping_endpoint(message: str = "Hello Cloud Run", db: Any = Depends(get_db)):
    """
    Entry route.
    FastAPI resolves `get_db` and passes the client into this function,
    which then passes it to the service layer.
    """
    return logic.process_ping(db, message)
