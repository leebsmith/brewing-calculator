from typing import Any
from app.schemas.models import FermentablesCatalogResponse, PingResponse
from app.schemas.templates import EquipmentProfile, EquipmentProfilesResponse
from app.repositories import (
    firestore,
    get_fermentables_catalog as fetch_fermentables_catalog,
    list_equipment_profiles as fetch_equipment_profiles,
    get_equipment_profile as fetch_equipment_profile,
    save_equipment_profile as persist_equipment_profile,
    delete_equipment_profile as remove_equipment_profile,
)


def process_ping(db: Any, message: str, user_id: str | None = None) -> PingResponse:
    """
    Business logic layer. 
    Enforces rules (e.g., uppercase conversion) before persisting.
    """
    processed_message = message.strip().upper()
    
    # Delegate persistence to the repository
    return firestore.save_ping(db, processed_message, user_id=user_id)


def get_fermentables_catalog(db: Any = None) -> FermentablesCatalogResponse:
    """
    Business logic layer for fermentables catalog retrieval.
    Coordinates validation and repository access.
    """
    return fetch_fermentables_catalog(db=db)


def get_equipment_profiles() -> EquipmentProfilesResponse:
    """
    Business logic layer for equipment profiles retrieval.
    Returns all canonical seeds and custom equipment profiles.
    """
    profiles = fetch_equipment_profiles()
    return EquipmentProfilesResponse(profiles=profiles)


def get_equipment_profile_by_id(profile_id: str) -> EquipmentProfile | None:
    """Retrieves an equipment profile by id."""
    return fetch_equipment_profile(profile_id)


def save_equipment_profile(profile: EquipmentProfile) -> EquipmentProfile:
    """
    Validates and persists a custom equipment profile.
    """
    return persist_equipment_profile(profile)


def delete_equipment_profile(profile_id: str) -> bool:
    """
    Deletes a custom equipment profile.
    Returns False if profile cannot be deleted (e.g. seed or not found).
    """
    return remove_equipment_profile(profile_id)

