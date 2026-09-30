from typing import Any
from app.schemas.models import FermentablesCatalogResponse
from app.seeds import load_seed_malts, load_seed_sugars


def get_fermentables_catalog(db: Any = None) -> FermentablesCatalogResponse:
    """
    Retrieves the full catalog of fermentable primitives (malts and sugars).
    Acts as an in-memory repository shim by delegating to app.seeds.
    Future iterations can query Firestore when `db` is provided.
    """
    malts = load_seed_malts()
    sugars = load_seed_sugars()
    return FermentablesCatalogResponse(malts=malts, sugars=sugars)
