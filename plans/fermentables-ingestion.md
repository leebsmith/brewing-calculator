# Implementation Plan: Fermentables Ingestion & Seed Catalog

## 1. Objective

Establish an automated data pipeline to scrape and curate our foundational catalog of brewing fermentables from [Beer Analytics](https://www.beer-analytics.com/fermentables/) (filtering out fruits, spices, and herbs), enrich them with industry-standard brewing science parameters (potential SG, dry yield, color SRM, moisture, DI water pH, buffering index, and sensory notes), and serialize them into validated, typed seed files in the backend.

---

## 2. Architectural Decisions & Key Context

* **Source of Record:** `https://www.beer-analytics.com/fermentables/` provides the canonical catalog of 132 brewing fermentables (excluding fruits, spices, and herbs) along with popularity metrics and categorization.
* **Storage Location & Architecture:**
  * **Generator Script:** `scripts/build_fermentables.py` (a standalone developer utility).
  * **Canonical Seed Datasets:**
    * `backend/app/seeds/malts.json`: Validated instances of `MaltPrimitive`.
    * `backend/app/seeds/sugars.json`: Validated instances of `SugarPrimitive`.
  * **Clean Architecture & Tach Rules:** `app.schemas` defines the models; `scripts/` runs out-of-band to generate static seed artifacts without introducing runtime web scraping dependencies into Cloud Run.
* **Category & Schema Mapping:**
  * **Base Malts, Toasted, Other Malts, Adjunct Malts, Unmalted Adjuncts, Malt Extract:** Mapped to `MaltPrimitive` with `category=MaltCategory.BASE` (except `Acidulated Malt` which maps to `MaltCategory.ACID`).
  * **Caramel/Crystal Malts:** Mapped to `MaltPrimitive` with `category=MaltCategory.CRYSTAL`.
  * **Roasted Malts & Grains:** Mapped to `MaltPrimitive` with `category=MaltCategory.ROASTED`.
  * **Sugars:** Mapped to `SugarPrimitive`.
* **Brewing Parameter Synthesis & Standard Defaults:**
  * Standard extract potentials ($P$ and $\text{SG}$) based on ASBC/EBC dry-basis standards (e.g., Base: 1.036–1.038 / 78–82%; Crystal: 1.033–1.035 / 72–75%; Roasted: 1.025–1.030 / 55–65%; Sugars: 1.042–1.046 / 95–100%).
  * Standard SRM colors extracted from descriptions or calibrated by grain type (e.g., Pilsner 1.6 SRM, Pale Ale 3.0 SRM, Caramel 10L..150L, Chocolate 350 SRM, Black Malt 500 SRM, Roasted Barley 450 SRM).
  * Grist buffering and deionized water pH ($pH_{DI}$) based on Palmer, Troester, and domain spec Section 4.2:
    * `BASE`: $pH_{DI} = 5.75$, $\beta = 45\text{ mEq/kg/pH}$
    * `CRYSTAL`: $pH_{DI} = 5.00$, $\beta = 30\text{ mEq/kg/pH}$
    * `ROASTED`: $pH_{DI} = 4.70$, $\beta = 15\text{ mEq/kg/pH}$
    * `ACID`: $pH_{DI} = 3.80$, $\beta = 35\text{ mEq/kg/pH}$

---

## 3. Data Contracts & File Structure

### 3.1 Schemas Utilized (`backend/app/schemas/primitives.py`)

* `MaltPrimitive`:
  * `id`: Unique kebab-case slug (e.g. `maris-otter-malt`, `caramel-crystal-malt-60l`).
  * `name`: Clean display name (e.g. `"Maris Otter Malt"`).
  * `category`: `MaltCategory` enum (`BASE`, `CRYSTAL`, `ROASTED`, `ACID`).
  * `potential_sg`: Float specific gravity potential (e.g. `1.038`).
  * `potential_dry_basis`: Decimal extract yield (e.g. `0.81`).
  * `color_srm`: Float Lovibond/SRM rating (e.g. `3.0`).
  * `moisture_pct`: Raw grain moisture, default `0.04`.
  * `di_ph`: Theoretical DI mash pH (e.g. `5.75`).
  * `buffer_index`: Buffering capacity $\beta$ (e.g. `45.0`).
  * `notes`: Sensory notes, flavor descriptors, and maltster usage notes.

* `SugarPrimitive`:
  * `id`: Unique kebab-case slug (e.g. `corn-sugar`).
  * `name`: Clean display name (e.g. `"Corn Sugar (Dextrose)"`).
  * `potential_sg`: Float specific gravity potential (e.g. `1.046`).
  * `color_srm`: Float SRM color rating (e.g. `0.0`).
  * `notes`: Sensory and brewing application notes.

### 3.2 Output File Layout

```
brewing-calculator/
├── scripts/
│   └── build_fermentables.py    # Scraping, enrichment, and validation generator
└── backend/
    └── app/
        └── seeds/
            ├── __init__.py      # Seed loader helpers
            ├── malts.json       # Array of validated MaltPrimitive records
            └── sugars.json      # Array of validated SugarPrimitive records
```

---

## 4. Implementation Steps

### Phase 1: Ingestion Script Development (`scripts/build_fermentables.py`)
1. Create `scripts/build_fermentables.py`.
2. Implement HTTP scraping using Python `urllib` / `httpx` to fetch `https://www.beer-analytics.com/fermentables/`.
3. Parse HTML sections using standard regex / HTML parser to extract all items across categories:
   * Keep: `Grain`, `Base Malt`, `Caramel/Crystal Malt`, `Toasted`, `Roasted`, `Other Malt`, `Adjunct Malt`, `Unmalted Adjunct`, `Sugar`, `Malt Extract`.
   * Skip: `Fruit`, `Spices & Herbs`.
4. Build a domain enrichment dictionary mapping fermentable names/slugs to brewing metrics:
   * Color (SRM/Lovibond) derived from name numbers (e.g., "60L" -> `60.0`, "Carafa III" -> `525.0`) or industry maltster specs.
   * Potential extract SG and Dry Basis extract yield.
   * Default category assignment (`BASE`, `CRYSTAL`, `ROASTED`, `ACID`).
   * Default DI pH and buffering capacity based on category.
   * Descriptive sensory and usage notes.
5. Validate every single object against `backend.app.schemas.primitives.MaltPrimitive` and `SugarPrimitive`.
6. Write formatted, indented JSON to `backend/app/seeds/malts.json` and `backend/app/seeds/sugars.json`.

### Phase 2: Seed Module & Loader (`backend/app/seeds/`)
1. Create directory `backend/app/seeds/`.
2. Create `backend/app/seeds/__init__.py` providing convenient accessor functions:
   * `load_seed_malts() -> list[MaltPrimitive]`
   * `load_seed_sugars() -> list[SugarPrimitive]`
   * `get_seed_malt_by_id(malt_id: str) -> MaltPrimitive | None`
3. Update `backend/tach.toml` to register `app.seeds` module:
   * `app.seeds` depends on `app.schemas`.
   * `app.repositories` and `app.service` may depend on `app.seeds`.

### Phase 3: Automated Testing & Validation
1. Add `backend/tests/test_seeds.py`:
   * Test that `load_seed_malts()` loads successfully and returns > 100 valid `MaltPrimitive` models.
   * Test that `load_seed_sugars()` loads successfully and returns > 15 valid `SugarPrimitive` models.
   * Verify all IDs are unique across malts and sugars.
   * Verify all categories match valid `MaltCategory` enums.
   * Verify potential SG and dry basis values fall within realistic brewing ranges ($1.020 \le \text{SG} \le 1.047$).
   * Verify all items have populated `notes`.
2. Run `uv run pytest` and `uv run tach check`.

---

## 5. Verification Checklist

- [ ] `scripts/build_fermentables.py` runs cleanly via `uv run python scripts/build_fermentables.py` and regenerates seed files.
- [ ] `backend/app/seeds/malts.json` contains complete, valid records without syntax or typing errors.
- [ ] `backend/app/seeds/sugars.json` contains complete, valid records without syntax or typing errors.
- [ ] No items from `Fruit` or `Spices & Herbs` are present in either dataset.
- [ ] Every entry has an informative `notes` field.
- [ ] `uv run tach check` passes with 0 violations.
- [ ] `uv run pytest` passes 100% offline.
