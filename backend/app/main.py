from typing import Any
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.database import get_db
from app.service import logic
from app.auth import get_current_user
from app.schemas.models import PingResponse, AuthenticatedUser

app = FastAPI(title="Mono-Repo MWE")

# Development CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5000",
        "http://localhost:5000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/ping", response_model=PingResponse)
@app.get("/ping", response_model=PingResponse)
def ping_endpoint(
    message: str = "Hello Cloud Run",
    db: Any = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Protected entry route.
    FastAPI resolves `get_db` and `get_current_user`, passing the verified user's uid
    and database client to the service layer.
    """
    return logic.process_ping(db, message, user_id=current_user.uid)
