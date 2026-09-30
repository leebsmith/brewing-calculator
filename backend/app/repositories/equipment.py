import json
import os
from pathlib import Path
from app.schemas.templates import EquipmentProfile
from app.seeds import load_seed_equipment_profiles

# Custom profiles storage file path (can be overridden via environment variable)
DATA_DIR = Path(os.environ.get("EQUIPMENT_DATA_DIR", Path(__file__).resolve().parent.parent / "seeds"))
CUSTOM_PROFILES_FILE = DATA_DIR / "custom_equipment_profiles.json"


def _read_custom_profiles() -> dict[str, EquipmentProfile]:
    """Reads custom equipment profiles from local JSON storage."""
    if not CUSTOM_PROFILES_FILE.exists():
        return {}
    try:
        with open(CUSTOM_PROFILES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {item["id"]: EquipmentProfile(**item) for item in data}
    except (json.JSONDecodeError, OSError):
        return {}


def _write_custom_profiles(profiles: dict[str, EquipmentProfile]) -> None:
    """Writes custom equipment profiles to local JSON storage."""
    CUSTOM_PROFILES_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CUSTOM_PROFILES_FILE, "w", encoding="utf-8") as f:
        json.dump([p.model_dump() for p in profiles.values()], f, indent=2)


def list_equipment_profiles() -> list[EquipmentProfile]:
    """
    Returns all equipment profiles, starting with canonical seeds,
    followed by user-created custom profiles.
    """
    seeds = load_seed_equipment_profiles()
    custom_map = _read_custom_profiles()
    
    # Filter out any custom profile that might share an id with seeds (overridden)
    custom_profiles = [p for p in custom_map.values() if not any(s.id == p.id for s in seeds)]
    return seeds + custom_profiles


def get_equipment_profile(profile_id: str) -> EquipmentProfile | None:
    """Finds an equipment profile by id, checking custom profiles first, then seeds."""
    custom_map = _read_custom_profiles()
    if profile_id in custom_map:
        return custom_map[profile_id]

    for seed in load_seed_equipment_profiles():
        if seed.id == profile_id:
            return seed

    return None


def save_equipment_profile(profile: EquipmentProfile) -> EquipmentProfile:
    """
    Saves or updates a custom equipment profile in local JSON storage.
    Enforces `is_custom=True`.
    """
    profile_to_save = profile.model_copy(update={"is_custom": True})
    custom_map = _read_custom_profiles()
    custom_map[profile_to_save.id] = profile_to_save
    _write_custom_profiles(custom_map)
    return profile_to_save


def delete_equipment_profile(profile_id: str) -> bool:
    """
    Deletes a custom equipment profile.
    Returns True if deleted, False if profile was not found or is a protected seed.
    """
    seeds = load_seed_equipment_profiles()
    if any(s.id == profile_id for s in seeds):
        # Cannot delete canonical seeds
        return False

    custom_map = _read_custom_profiles()
    if profile_id in custom_map:
        del custom_map[profile_id]
        _write_custom_profiles(custom_map)
        return True

    return False
