from typing import Any
from app.schemas.models import YeastCatalogResponse
from app.seeds import load_seed_yeasts


def get_yeasts_catalog(db: Any = None) -> YeastCatalogResponse:
    """
    Retrieves the canonical yeast catalog from seed data.
    The `db` parameter is accepted for interface symmetry with other
    repositories but is currently unused (yeasts are seed-only).
    """
    return YeastCatalogResponse(yeasts=load_seed_yeasts())
