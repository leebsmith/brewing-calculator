import pytest
from pydantic import ValidationError
from app.schemas.primitives import (
    MaltCategory,
    MaltPrimitive,
    HopForm,
    HopPrimitive,
    YeastPrimitive,
    SugarPrimitive,
)


def test_malt_primitive_defaults_notes_to_none():
    malt = MaltPrimitive(
        id="malt_2row",
        name="Briess 2-Row",
        category=MaltCategory.BASE,
        potential_sg=1.037,
        potential_dry_basis=0.80,
        color_lovibond=1.8,
    )
    assert malt.notes is None
    assert malt.moisture_pct == 0.04
    assert malt.di_ph is None
    assert malt.buffer_index is None
    assert malt.model_dump()["notes"] is None


def test_malt_primitive_accepts_custom_notes():
    malt = MaltPrimitive(
        id="malt_pilsner",
        name="Weyermann Bohemian Pilsner",
        category=MaltCategory.BASE,
        potential_sg=1.038,
        potential_dry_basis=0.81,
        color_lovibond=1.7,
        notes="Clean, bready, traditional floor-malted character.",
    )
    assert malt.notes == "Clean, bready, traditional floor-malted character."

    dumped = malt.model_dump()
    assert dumped["notes"] == "Clean, bready, traditional floor-malted character."


def test_malt_primitive_requires_mandatory_fields():
    with pytest.raises(ValidationError):
        # Missing potential_sg and potential_dry_basis
        MaltPrimitive(
            id="bad_malt",
            name="Incomplete Malt",
            category=MaltCategory.CRYSTAL,
            color_lovibond=40.0,
        )


def test_hop_primitive_notes_and_form_defaults():
    hop_default = HopPrimitive(
        id="hop_cascade",
        name="Cascade",
        alpha_acid_pct=6.5,
    )
    assert hop_default.form == HopForm.PELLET
    assert hop_default.notes is None

    hop_custom = HopPrimitive(
        id="hop_citra",
        name="Citra",
        alpha_acid_pct=12.5,
        form=HopForm.CRYO,
        notes="High passion fruit and lychee notes for dry hopping.",
    )
    assert hop_custom.form == HopForm.CRYO
    assert hop_custom.notes == "High passion fruit and lychee notes for dry hopping."


def test_yeast_primitive_notes():
    yeast = YeastPrimitive(
        id="wlp001",
        name="California Ale Yeast",
        attenuation_pct=0.76,
        flocculation="Medium",
        alcohol_tolerance_abv=15.0,
        notes="Neutral profile, highlights malt and hops.",
    )
    assert yeast.notes == "Neutral profile, highlights malt and hops."
    assert yeast.attenuation_pct == 0.76


def test_sugar_primitive_notes():
    sugar = SugarPrimitive(
        id="dextrose",
        name="Corn Sugar (Dextrose)",
        potential_sg=1.046,
        color_lovibond=0.0,
        notes="100% fermentable simple sugar for priming or kettle additions.",
    )
    assert sugar.notes == "100% fermentable simple sugar for priming or kettle additions."
    assert sugar.potential_sg == 1.046
