from typing import Final

from pydantic import BaseModel, Field

# Default equipment profile parameters & physical constants.
DEFAULT_CONVERSION_EFFICIENCY: Final[float] = 0.90
DEFAULT_GRAIN_ABSORPTION_L_PER_KG: Final[float] = 0.96
DEFAULT_SHRINKAGE_PCT: Final[float] = 0.04
DEFAULT_MASH_DEAD_SPACE_L: Final[float] = 0.946          # 0.25 gal false-bottom loss
DEFAULT_MASH_TRANSFER_LOSS_L: Final[float] = 0.946       # 0.25 gal hose/pump loss
DEFAULT_KETTLE_DEAD_SPACE_L: Final[float] = 1.249        # 0.33 gal unrecoverable kettle wort
DEFAULT_KETTLE_TRANSFER_LOSS_L: Final[float] = 0.946     # 0.25 gal hose/pump loss
DEFAULT_HLT_DEAD_SPACE_L: Final[float] = 0.946           # 0.25 gal hose/pump loss
DEFAULT_HLT_TRANSFER_LOSS_L: Final[float] = 0.946        # 0.25 gal hose/pump loss
DEFAULT_TRUB_LOSS_L: Final[float] = 1.5
DEFAULT_HLT_COIL_FLOOR_L: Final[float] = 0.0
DEFAULT_HLT_STARTING_VOLUME_L: Final[float] = 35.0


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
    trub_loss_l: float = Field(default=DEFAULT_TRUB_LOSS_L, ge=0, description="Kettle bottom trub sediment loss in liters")
    # --- HLT water accounting (NOT extract losses) ---
    # The HLT holds water, not wort, so the fields below never enter the wort
    # mass balance (Loss_preboil / Loss_postboil). They constrain how much
    # liquor the HLT can actually deliver as sparge water. The `_loss_l` suffix
    # is retained for naming consistency with the other vessels; see
    # plans/vessel-loss-model.md section 3.5.
    hlt_dead_space_l: float = Field(default=DEFAULT_HLT_DEAD_SPACE_L, ge=0, description="Liquor trapped below the HLT drain port in liters (water accounting, not an extract loss)")
    hlt_transfer_loss_l: float = Field(default=DEFAULT_HLT_TRANSFER_LOSS_L, ge=0, description="Liquor retained in HLT hose and pump in liters (water accounting, not an extract loss)")
    boil_off_rate_l_per_hr: float = Field(..., gt=0, description="Evaporation rate in liters per hour")
    grain_absorption_factor_l_per_kg: float = Field(default=DEFAULT_GRAIN_ABSORPTION_L_PER_KG, gt=0, description="Grain absorption constant in L/kg")
    conversion_efficiency: float = Field(default=DEFAULT_CONVERSION_EFFICIENCY, gt=0, le=1.0, description="Mash starch conversion efficiency fraction (0.0 to 1.0)")
    shrinkage_pct: float = Field(default=DEFAULT_SHRINKAGE_PCT, ge=0, le=0.20, description="Wort cooling shrinkage contraction percentage fraction")
    hlt_coil_floor_l: float = Field(default=DEFAULT_HLT_COIL_FLOOR_L, ge=0, description="Minimum volume floor to submerge HERMS coil in liters (constraint, not a loss)")
    hlt_starting_volume_l: float = Field(default=DEFAULT_HLT_STARTING_VOLUME_L, ge=0, description="Volume of liquor in the HLT at the start of the brew day in liters (batch-level parameter)")
    is_custom: bool = Field(default=False, description="Flag indicating user-created custom profile")


class EquipmentProfilesResponse(BaseModel):
    profiles: list[EquipmentProfile]
