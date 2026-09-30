from typing import Any
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.database import get_db
from app.service import logic
from app.auth import get_current_user
from app.schemas.models import PingResponse, AuthenticatedUser, FermentablesCatalogResponse
from app.core.constants import ERR_CANNOT_DELETE_PRESET
from app.schemas.templates import EquipmentProfile, EquipmentProfilesResponse

app = FastAPI(title="Batch Brewing Calculator")

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


