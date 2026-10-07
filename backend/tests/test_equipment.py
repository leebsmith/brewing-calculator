import pytest
import tempfile
from pathlib import Path
from unittest.mock import patch
from app.schemas.templates import EquipmentProfile
from app.seeds import get_seed_equipment_profile_by_id, load_seed_equipment_profiles
from app.repositories import equipment as equipment_repo


def test_seed_equipment_profiles_valid():
    """Verifies that canonical equipment profile seeds conform to the schema."""
    seeds = load_seed_equipment_profiles()
    assert len(seeds) >= 4
    
    ids = [s.id for s in seeds]
    assert "herms-30l" in ids
    assert "herms-50l" in ids
    assert "biab-35l" in ids
    assert "cooler-mash-20l" in ids

    for profile in seeds:
        assert isinstance(profile, EquipmentProfile)
        assert profile.max_kettle_volume_l > 0
        assert profile.max_mash_tun_volume_l > 0
        assert profile.max_hlt_volume_l >= 0
        assert profile.boil_off_rate_l_per_hr > 0
        assert profile.mash_dead_space_l >= 0
        assert profile.mash_transfer_loss_l >= 0
        assert profile.kettle_dead_space_l >= 0
        assert profile.kettle_transfer_loss_l >= 0
        assert profile.hlt_dead_space_l >= 0
        assert profile.hlt_transfer_loss_l >= 0
        assert profile.trub_loss_l >= 0
        assert profile.hlt_coil_floor_l >= 0
        assert profile.hlt_starting_volume_l >= 0
        assert 0.80 <= profile.conversion_efficiency <= 1.0
        assert profile.is_custom is False


def test_get_seed_equipment_profile_by_id():
    """Verifies profile lookup by id."""
    herms30 = get_seed_equipment_profile_by_id("herms-30l")
    assert herms30 is not None
    assert herms30.name == "30L 3-Vessel HERMS"
    assert herms30.max_kettle_volume_l == 38.0

    assert get_seed_equipment_profile_by_id("non-existent-id") is None


def test_get_equipment_profiles_endpoint(client):
    """Verifies GET /api/equipment-profiles returns canonical seed profiles."""
    response = client.get("/api/equipment-profiles")
    assert response.status_code == 200
    data = response.json()
    assert "profiles" in data
    assert len(data["profiles"]) >= 4
    
    profile_names = [p["name"] for p in data["profiles"]]
    assert "30L 3-Vessel HERMS" in profile_names


def test_get_equipment_profiles_unauthenticated(unauthenticated_client):
    """Verifies unauthorized requests are rejected."""
    response = unauthenticated_client.get("/api/equipment-profiles")
    assert response.status_code in (401, 403)


def test_get_equipment_profiles_with_valid_token(unauthenticated_client):
    """
    Verifies that requests with a valid Bearer token succeed on /api/equipment-profiles
    without needing the get_db dependency.
    """
    mock_claims = {
        "uid": "verified_uid_456",
        "email": "alice@example.com",
        "name": "Alice Example",
        "picture": "https://example.com/alice.png",
    }
    with patch("firebase_admin.auth.verify_id_token", return_value=mock_claims):
        response = unauthenticated_client.get(
            "/api/equipment-profiles",
            headers={"Authorization": "Bearer valid_jwt_token"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "profiles" in data
        assert len(data["profiles"]) >= 4


def test_custom_profile_crud_lifecycle(client, monkeypatch):
    """
    Verifies creating, listing, and deleting a custom equipment profile
    in an isolated temporary file environment.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        temp_file = Path(tmpdir) / "custom_equipment_profiles.json"
        monkeypatch.setattr(equipment_repo, "CUSTOM_PROFILES_FILE", temp_file)

        # 1. Post a new custom profile
        custom_payload = {
            "id": "my-custom-nano-70l",
            "name": "My Custom 70L Nano",
            "description": "Custom test rig",
            "max_kettle_volume_l": 80.0,
            "max_mash_tun_volume_l": 80.0,
            "max_hlt_volume_l": 80.0,
            "mash_dead_space_l": 2.5,
            "mash_transfer_loss_l": 0.946,
            "kettle_dead_space_l": 2.5,
            "kettle_transfer_loss_l": 0.946,
            "hlt_dead_space_l": 0.946,
            "hlt_transfer_loss_l": 0.946,
            "trub_loss_l": 3.5,
            "boil_off_rate_l_per_hr": 5.0,
            "grain_absorption_factor_l_per_kg": 0.96,
            "conversion_efficiency": 0.94,
            "shrinkage_pct": 0.04,
            "hlt_coil_floor_l": 20.0,
            "hlt_starting_volume_l": 80.0,
            "is_custom": False  # Should be forced to True by backend
        }
        res_post = client.post("/api/equipment-profiles", json=custom_payload)
        assert res_post.status_code == 201
        created = res_post.json()
        assert created["id"] == "my-custom-nano-70l"
        assert created["is_custom"] is True
        assert created["max_kettle_volume_l"] == 80.0
        assert created["hlt_coil_floor_l"] == 20.0
        assert created["hlt_starting_volume_l"] == 80.0
        assert created["mash_transfer_loss_l"] == 0.946
        assert created["kettle_transfer_loss_l"] == 0.946

        # 2. Get all profiles, verifying the custom profile is included
        res_get = client.get("/api/equipment-profiles")
        assert res_get.status_code == 200
        profiles = res_get.json()["profiles"]
        custom_found = next((p for p in profiles if p["id"] == "my-custom-nano-70l"), None)
        assert custom_found is not None
        assert custom_found["name"] == "My Custom 70L Nano"

        # 3. Attempt to delete a protected seed profile (should fail)
        res_del_seed = client.delete("/api/equipment-profiles/herms-30l")
        assert res_del_seed.status_code == 400

        # 4. Delete the custom profile
        res_del = client.delete("/api/equipment-profiles/my-custom-nano-70l")
        assert res_del.status_code == 200
        assert res_del.json()["success"] is True

        # 5. Verify it is no longer returned
        res_get2 = client.get("/api/equipment-profiles")
        profiles2 = res_get2.json()["profiles"]
        assert not any(p["id"] == "my-custom-nano-70l" for p in profiles2)
