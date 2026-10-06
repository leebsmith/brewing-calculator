from pydantic import BaseModel, Field
from app.core.constants import (
    DEFAULT_CONVERSION_EFFICIENCY,
    DEFAULT_GRAIN_ABSORPTION_L_PER_KG,
    DEFAULT_HLT_MIN_VOLUME_L,
    DEFAULT_MASH_DEAD_SPACE_L,
    DEFAULT_KETTLE_DEAD_SPACE_L,
    DEFAULT_SHRINKAGE_PCT,
    DEFAULT_TRUB_LOSS_L,
)


class EquipmentProfile(BaseModel):
    """Immutable template representing a physical brewing system's characteristics."""
    id: str = Field(..., description="Unique slug identifier")
    name: str = Field(..., description="Human-readable equipment profile name")
    description: str | None = Field(default=None, description="Optional profile description")
    max_kettle_volume_l: float = Field(..., gt=0, description="Maximum capacity of the boil kettle in liters")
    max_mash_tun_volume_l: float = Field(..., gt=0, description="Maximum capacity of mash tun in liters")
    max_hlt_volume_l: float = Field(..., gt=0, description="Maximum capacity of HLT in liters")
    mash_dead_space_l: float = Field(default=DEFAULT_MASH_DEAD_SPACE_L, ge=0, description="Unrecoverable volume in mash tun/plumbing in liters")
    kettle_dead_space_l: float = Field(default=DEFAULT_KETTLE_DEAD_SPACE_L, ge=0, description="Unrecoverable volume in boil kettle/plumbing in liters")
    trub_loss_l: float = Field(default=DEFAULT_TRUB_LOSS_L, ge=0, description="Kettle bottom trub sediment loss in liters")
    boil_off_rate_l_per_hr: float = Field(..., gt=0, description="Evaporation rate in liters per hour")
    grain_absorption_factor_l_per_kg: float = Field(default=DEFAULT_GRAIN_ABSORPTION_L_PER_KG, gt=0, description="Grain absorption constant in L/kg")
    conversion_efficiency: float = Field(default=DEFAULT_CONVERSION_EFFICIENCY, gt=0, le=1.0, description="Mash starch conversion efficiency fraction (0.0 to 1.0)")
    shrinkage_pct: float = Field(default=DEFAULT_SHRINKAGE_PCT, ge=0, le=0.20, description="Wort cooling shrinkage contraction percentage fraction")
    hlt_min_volume_l: float = Field(default=DEFAULT_HLT_MIN_VOLUME_L, ge=0, description="Minimum volume floor to submerge HERMS coil in liters")
    is_custom: bool = Field(default=False, description="Flag indicating user-created custom profile")


class EquipmentProfilesResponse(BaseModel):
    profiles: list[EquipmentProfile]
