from pydantic import BaseModel, Field
from app.core.constants import (
    DEFAULT_CONVERSION_EFFICIENCY,
    DEFAULT_GRAIN_ABSORPTION_L_PER_KG,
    DEFAULT_HLT_COIL_FLOOR_L,
    DEFAULT_HLT_DEAD_SPACE_L,
    DEFAULT_HLT_STARTING_VOLUME_L,
    DEFAULT_HLT_TRANSFER_LOSS_L,
    DEFAULT_MASH_DEAD_SPACE_L,
    DEFAULT_MASH_TRANSFER_LOSS_L,
    DEFAULT_KETTLE_DEAD_SPACE_L,
    DEFAULT_KETTLE_TRANSFER_LOSS_L,
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
    mash_dead_space_l: float = Field(default=DEFAULT_MASH_DEAD_SPACE_L, ge=0, description="Unrecoverable volume trapped below the mash tun false bottom in liters")
    mash_transfer_loss_l: float = Field(default=DEFAULT_MASH_TRANSFER_LOSS_L, ge=0, description="Wort retained in mash tun drain hose and pump in liters")
    kettle_dead_space_l: float = Field(default=DEFAULT_KETTLE_DEAD_SPACE_L, ge=0, description="Unrecoverable volume trapped below the boil kettle drain port in liters")
    kettle_transfer_loss_l: float = Field(default=DEFAULT_KETTLE_TRANSFER_LOSS_L, ge=0, description="Wort retained in boil kettle drain hose and pump in liters")
    hlt_dead_space_l: float = Field(default=DEFAULT_HLT_DEAD_SPACE_L, ge=0, description="Liquor trapped below the HLT drain port in liters")
    hlt_transfer_loss_l: float = Field(default=DEFAULT_HLT_TRANSFER_LOSS_L, ge=0, description="Liquor retained in HLT hose and pump in liters")
    trub_loss_l: float = Field(default=DEFAULT_TRUB_LOSS_L, ge=0, description="Kettle bottom trub sediment loss in liters")
    boil_off_rate_l_per_hr: float = Field(..., gt=0, description="Evaporation rate in liters per hour")
    grain_absorption_factor_l_per_kg: float = Field(default=DEFAULT_GRAIN_ABSORPTION_L_PER_KG, gt=0, description="Grain absorption constant in L/kg")
    conversion_efficiency: float = Field(default=DEFAULT_CONVERSION_EFFICIENCY, gt=0, le=1.0, description="Mash starch conversion efficiency fraction (0.0 to 1.0)")
    shrinkage_pct: float = Field(default=DEFAULT_SHRINKAGE_PCT, ge=0, le=0.20, description="Wort cooling shrinkage contraction percentage fraction")
    hlt_coil_floor_l: float = Field(default=DEFAULT_HLT_COIL_FLOOR_L, ge=0, description="Minimum volume floor to submerge HERMS coil in liters (not a loss)")
    hlt_starting_volume_l: float = Field(default=DEFAULT_HLT_STARTING_VOLUME_L, ge=0, description="Volume of liquor in the HLT at the start of the brew day in liters")
    is_custom: bool = Field(default=False, description="Flag indicating user-created custom profile")


class EquipmentProfilesResponse(BaseModel):
    profiles: list[EquipmentProfile]
