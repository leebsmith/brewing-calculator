from app.seeds import (
    get_seed_malt_by_id,
    get_seed_sugar_by_id,
    load_seed_malts,
    load_seed_sugars,
)
from app.schemas.primitives import MaltCategory, MaltPrimitive, SugarPrimitive


def test_load_seed_malts_returns_valid_catalog():
    malts = load_seed_malts()
    assert len(malts) >= 100

    seen_ids = set()
    for malt in malts:
        assert isinstance(malt, MaltPrimitive)
        assert malt.id not in seen_ids, f"Duplicate malt ID: {malt.id}"
        seen_ids.add(malt.id)

        assert isinstance(malt.category, MaltCategory)
        assert 1.000 <= malt.potential_sg <= 1.045
        assert 0.0 <= malt.potential_dry_basis <= 0.90
        assert malt.color_srm >= 0.0
        assert malt.notes is not None and len(malt.notes) > 10


def test_load_seed_sugars_returns_valid_catalog():
    sugars = load_seed_sugars()
    assert len(sugars) >= 15

    seen_ids = set()
    for sugar in sugars:
        assert isinstance(sugar, SugarPrimitive)
        assert sugar.id not in seen_ids, f"Duplicate sugar ID: {sugar.id}"
        seen_ids.add(sugar.id)

        assert 1.025 <= sugar.potential_sg <= 1.048
        assert sugar.color_srm >= 0.0
        assert sugar.notes is not None and len(sugar.notes) > 10


def test_excluded_categories_are_absent():
    malts = load_seed_malts()
    sugars = load_seed_sugars()

    all_ids = {m.id for m in malts} | {s.id for s in sugars}

    # Verify fruits and spices/herbs are excluded
    excluded_samples = [
        "lemon",
        "guava",
        "blackberry",
        "orange-peel",
        "cinnamon",
        "coriander",
        "cardamom",
    ]
    for excluded in excluded_samples:
        assert excluded not in all_ids, f"Found excluded item in seed data: {excluded}"


def test_get_seed_by_id_lookups():
    maris_otter = get_seed_malt_by_id("maris-otter-malt")
    assert maris_otter is not None
    assert maris_otter.name == "Maris Otter Malt"
    assert maris_otter.category == MaltCategory.BASE
    assert maris_otter.potential_sg == 1.038

    acidulated = get_seed_malt_by_id("acidulated-malt")
    assert acidulated is not None
    assert acidulated.category == MaltCategory.ACID
    assert acidulated.di_ph == 3.80

    corn_sugar = get_seed_sugar_by_id("corn-sugar")
    assert corn_sugar is not None
    assert corn_sugar.potential_sg == 1.046

    assert get_seed_malt_by_id("non-existent-id") is None
    assert get_seed_sugar_by_id("non-existent-id") is None
