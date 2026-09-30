import json
from functools import lru_cache
from pathlib import Path
from app.schemas.primitives import MaltPrimitive, SugarPrimitive

SEEDS_DIR = Path(__file__).resolve().parent


@lru_cache(maxsize=1)
def load_seed_malts() -> list[MaltPrimitive]:
    """Loads and caches the canonical list of MaltPrimitive seed records."""
    file_path = SEEDS_DIR / "malts.json"
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [MaltPrimitive(**item) for item in data]


@lru_cache(maxsize=1)
def load_seed_sugars() -> list[SugarPrimitive]:
    """Loads and caches the canonical list of SugarPrimitive seed records."""
    file_path = SEEDS_DIR / "sugars.json"
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [SugarPrimitive(**item) for item in data]


def get_seed_malt_by_id(malt_id: str) -> MaltPrimitive | None:
    """Finds a seed malt by its unique slug ID."""
    for malt in load_seed_malts():
        if malt.id == malt_id:
            return malt
    return None


def get_seed_sugar_by_id(sugar_id: str) -> SugarPrimitive | None:
    """Finds a seed sugar by its unique slug ID."""
    for sugar in load_seed_sugars():
        if sugar.id == sugar_id:
            return sugar
    return None


__all__ = [
    "load_seed_malts",
    "load_seed_sugars",
    "get_seed_malt_by_id",
    "get_seed_sugar_by_id",
]
