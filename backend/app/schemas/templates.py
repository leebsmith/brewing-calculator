from pydantic import BaseModel, Field


class EquipmentProfile(BaseModel):
    id: str = Field(..., description="Unique slug identifier")
    name: str = Field(..., description="Human-readable equipment profile name")
    description: str | None = Field(default=None, description="Optional profile description")
    max_kettle_volume_l: float = Field(..., gt=0, description="Maximum capacity of the boil kettle in liters")
    max_mash_tun_volume_l: float = Field(..., gt=0, description="Maximum capacity of mash tun in liters")
    max_hlt_volume_l: float = Field(..., gt=0, description="Maximum capacity of HLT in liters")
    mash_dead_space_l: float = Field(default=0.0, ge=0, description="Unrecoverable volume in mash tun/plumbing in liters")
    trub_loss_l: float = Field(default=0.0, ge=0, description="Kettle bottom trub sediment loss in liters")
    boil_off_rate_l_per_hr: float = Field(..., gt=0, description="Evaporation rate in liters per hour")
    grain_absorption_factor_l_per_kg: float = Field(default=0.96, gt=0, description="Grain absorption constant in L/kg")
    conversion_efficiency: float = Field(default=0.95, gt=0, le=1.0, description="Mash starch conversion efficiency fraction (0.0 to 1.0)")
    shrinkage_pct: float = Field(default=0.04, ge=0, le=0.20, description="Wort cooling shrinkage contraction percentage fraction")
    hlt_min_volume_l: float = Field(default=0.0, ge=0, description="Minimum volume floor to submerge HERMS coil in liters")
    is_custom: bool = Field(default=False, description="Flag indicating user-created custom profile")


class EquipmentProfilesResponse(BaseModel):
    profiles: list[EquipmentProfile]
