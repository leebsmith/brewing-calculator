from enum import Enum
from pydantic import BaseModel, Field


class MaltCategory(str, Enum):
    BASE = "BASE"
    CRYSTAL = "CRYSTAL"
    ROASTED = "ROASTED"
    ACID = "ACID"


class HopForm(str, Enum):
    PELLET = "PELLET"
    WHOLE = "WHOLE"
    CRYO = "CRYO"
    EXTRACT = "EXTRACT"


class MaltPrimitive(BaseModel):
    id: str
    name: str
    category: MaltCategory
    potential_sg: float = Field(..., description="Extract potential in SG, e.g., 1.037")
    potential_dry_basis: float = Field(..., description="Decimal yield, e.g., 0.80")
    color_srm: float
    moisture_pct: float = 0.04
    di_ph: float | None = None
    buffer_index: float | None = None
    notes: str | None = None


class HopPrimitive(BaseModel):
    id: str
    name: str
    alpha_acid_pct: float
    form: HopForm = HopForm.PELLET
    notes: str | None = None


class YeastPrimitive(BaseModel):
    id: str
    name: str
    attenuation_pct: float
    flocculation: str
    alcohol_tolerance_abv: float
    notes: str | None = None


class SugarPrimitive(BaseModel):
    id: str
    name: str
    potential_sg: float
    color_srm: float
    notes: str | None = None
