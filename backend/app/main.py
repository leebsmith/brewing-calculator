from contextlib import asynccontextmanager
from typing import Any
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.database import get_db, init_firebase
from app.service import logic
from app.auth import get_current_user
from app.schemas.models import PingResponse, AuthenticatedUser, FermentablesCatalogResponse
from app.core.constants import ERR_CANNOT_DELETE_PRESET
from app.schemas.templates import EquipmentProfile, EquipmentProfilesResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_firebase()
    yield

app = FastAPI(title="Batch Brewing Calculator", lifespan=lifespan)


# CORS configuration for development and production
# In production, Firebase Hosting acts as a proxy, so requests appear to originate from the same origin.
# However, explicitly configuring CORS is a good security practice.
# For local development, we allow Vite's default dev server port and the Firebase emulator port.
# For production, we allow the Firebase Hosting domain(s).

# NOTE: Replace '<your-firebase-project-id>' with your actual Firebase project ID.
# The production Firebase domain is typically '<your-firebase-project-id>.web.app' or '<your-firebase-project-id>.firebaseapp.com'.
# If using custom domains, those should also be added here.
PRODUCTION_FIREBASE_DOMAINS = [
    "https://batch-brewing-calculator.web.app",
    "https://batch-brewing-calculator.firebaseapp.com",
    # Add any custom domains here if applicable
    # "https://your-custom-domain.com"
]

# Combine development and production origins. Using a set to avoid duplicates.
ALL_ALLOWED_ORIGINS = list(set([
    "http://localhost:5173",  # Vite default dev server port
    "http://127.0.0.1:5173",  # Vite default dev server port (alternative)
    "http://localhost:5000",  # Firebase emulator port (for Hosting)
    "http://127.0.0.1:5000",  # Firebase emulator port (for Hosting)
    "http://localhost:8000",  # FastAPI backend dev server port
    "http://127.0.0.1:8000",  # FastAPI backend dev server port (alternative)
    *PRODUCTION_FIREBASE_DOMAINS
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALL_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"], # Allowing OPTIONS for preflight requests
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


@app.get("/api/fermentables", response_model=FermentablesCatalogResponse)
def get_fermentables_endpoint(
    db: Any = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Protected entry route for fermentables catalog (malts and sugars).
    Requires valid Firebase ID token authentication.
    """
    return logic.get_fermentables_catalog(db)


@app.get("/api/equipment-profiles", response_model=EquipmentProfilesResponse)
def get_equipment_profiles_endpoint(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Protected entry route for equipment profiles.
    Returns canonical seeds alongside user-saved custom profiles.
    """
    return logic.get_equipment_profiles()


@app.post("/api/equipment-profiles", response_model=EquipmentProfile, status_code=status.HTTP_201_CREATED)
def save_equipment_profile_endpoint(
    profile: EquipmentProfile,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Protected entry route to save or update a custom equipment profile.
    """
    return logic.save_equipment_profile(profile)


@app.delete("/api/equipment-profiles/{profile_id}")
def delete_equipment_profile_endpoint(
    profile_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Protected entry route to delete a custom equipment profile.
    Cannot delete canonical seed profiles.
    """
    success = logic.delete_equipment_profile(profile_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERR_CANNOT_DELETE_PRESET,
        )
    return {"success": True, "deleted_id": profile_id}


