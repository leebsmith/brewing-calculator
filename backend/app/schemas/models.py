from pydantic import BaseModel
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
