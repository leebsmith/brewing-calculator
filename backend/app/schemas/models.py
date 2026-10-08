from pydantic import BaseModel, Field
from app.schemas.primitives import MaltPrimitive, SugarPrimitive, YeastPrimitive

class AuthenticatedUser(BaseModel):
    uid: str
    email: str | None = None
    name: str | None = None
    picture: str | None = None

class PingResponse(BaseModel):
    id: str
    message: str
    timestamp: int
    user_id: str | None = None

class FermentablesCatalogResponse(BaseModel):
    malts: list[MaltPrimitive]
    sugars: list[SugarPrimitive]

class YeastCatalogResponse(BaseModel):
    yeasts: list[YeastPrimitive]


class GrainBillEntryModel(BaseModel):
    w_i: float = Field(..., description="Normalized mass fraction (sum = 1.0)")
    dbfg_i: float = Field(..., description="Dry-basis fine-grind potential (0..1)")
    mc_i: float = Field(..., description="As-is moisture content (0..1)")


class BatchSolverRequest(BaseModel):
    target_abv: float = Field(..., gt=0, description="Target ABV percentage")
    apparent_attenuation: float = Field(
        ..., gt=0, le=1, description="Apparent attenuation fraction"
    )
    v_ferm: float = Field(..., gt=0, description="Cold fermenter volume (L)")
    topology: str = Field(
        ..., description="'r_l_to_g' or 'runoff_ratio'"
    )
    intensive_value: float = Field(
        ..., gt=0, description="R_L:G (L/kg) or r (dimensionless)"
    )
    grain_bill: list[GrainBillEntryModel]
    s_late_add: float = Field(0.0, ge=0, description="Late-addition extract (kg)")
    v_kettle_dead: float = Field(0.0, ge=0, description="Kettle dead space (L)")
    delta_v_evap: float = Field(0.0, ge=0, description="Boil-off volume (L)")
    v_dead: float = Field(0.0, ge=0, description="Mash tun dead space (L)")
    eta_conv: float = Field(..., gt=0, le=1, description="Conversion efficiency")
    f_shrink: float = Field(0.04, ge=0, lt=1, description="Thermal contraction")


class StageCascadeModel(BaseModel):
    v_strike: float
    v_run1: float
    v_run2: float
    v_sparge: float
    s_run1: float
    s_run2: float
    sg_pre_boil: float
    v_post_boil: float


class BatchSolverResponse(BaseModel):
    sg_post_boil: float
    v_pre_boil: float
    s_post_boil_target: float
    m_grist: float
    cascade: StageCascadeModel
