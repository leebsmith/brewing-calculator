# Seed Catalogs & Ingestion Pipeline Specification

This directory contains the canonical, static seed datasets and in-memory loader utilities for brewing ingredient primitives.

---

## 1. Architectural Role & Storage Strategy

* **In-Memory Catalog Shim:** Serves as the immediate source of truth for ingredient reference data without requiring local database instances, active emulator seeding, or Cloud Firestore read overhead.
* **Storage Independence:** Exposes typed domain schemas via Python accessor functions (`app.seeds`). The repository layer (`app.repositories`) consumes these loaders today and will seamlessly transition to Firestore queries without altering upstream business logic or API contracts.
* **Zero Runtime Overhead:** All raw data scraping, parsing, and enrichment occur out-of-band in developer scripts (`scripts/`). Cloud Run container images bundle these static JSON artifacts without runtime scraping dependencies.

---

## 2. Provenance of Current Seed Datasets

### 2.1 Malts & Grains (`malts.json`)
* **Source:** Scraped from [Beer Analytics Fermentables Catalog](https://www.beer-analytics.com/fermentables/).
* **Ingestion Script:** `scripts/build_fermentables.py`.
* **Record Count:** 115 unique grain and malt records.
* **Filtering Criteria:**
  * Retained: Base malts, crystal/caramel malts, roasted malts/grains, toasted/specialty grains, and unmalted adjuncts (flaked barley, oats, wheat).
  * Excluded: Fruits, fruit purees, spices, herbs, flavor extracts, and non-brewing adjuncts.
* **Enrichment & Scientific Defaults:**
  * **Category Mapping:** Mapped to `MaltCategory` enum (`BASE`, `CRYSTAL`, `ROASTED`, `ACID`). Acidulated malt is specifically assigned `ACID`.
  * **Extract Potentials:** Specific gravity potential ($P_{\text{SG}}$) and dry-basis extract percentage calibrated against ASBC/EBC standards.
  * **Deionized Water pH ($pH_{\text{DI}}$) & Buffering Index ($\beta$):** Assigned according to the Troester/Palmer buffering models defined in `docs/calculator-domain-model.md`:
    * `BASE`: $pH_{\text{DI}} = 5.75$, $\beta = 45.0\text{ mEq/kg/pH}$
    * `CRYSTAL`: $pH_{\text{DI}} = 5.00$, $\beta = 30.0\text{ mEq/kg/pH}$
    * `ROASTED`: $pH_{\text{DI}} = 4.70$, $\beta = 15.0\text{ mEq/kg/pH}$
    * `ACID`: $pH_{\text{DI}} = 3.80$, $\beta = 35.0\text{ mEq/kg/pH}$
  * **Moisture Content:** Standardized to $4.0\%$ ($0.04$) default for raw dry grain mass-balance calculations.

### 2.2 Kettle Sugars & Syrups (`sugars.json`)
* **Source:** Scraped from [Beer Analytics Fermentables Catalog](https://www.beer-analytics.com/fermentables/).
* **Ingestion Script:** `scripts/build_fermentables.py`.
* **Record Count:** 17 validated kettle sugar records.
* **Filtering Criteria:** Pure fermentable sugars, candi syrups, honey, molasses, and dry sugar adjuncts added directly to the boil or whirlpool.
* **Enrichment & Defaults:** Extract potential calibrated to 100% dry yield equivalents (e.g., Dextrose: 1.046 SG, Sucrose: 1.046 SG, Candi Syrup: 1.032 SG).

### 2.3 Brewing Yeasts (`yeasts.json`)
* **Source:** Curated from [Beer Analytics Yeast Catalog](https://www.beer-analytics.com/yeasts/) across eight commercial yeast labs (Wyeast, White Labs, Imperial Yeast, Lallemand, Fermentis, Omega Yeast, Bootleg Biology, East Coast Yeast).
* **Ingestion Script:** `scripts/build_yeasts.py`.
* **Record Count:** 200+ validated yeast strain records.
* **Filtering Criteria:** Commercially available brewing strains only. Includes *Saccharomyces* (ale, lager, kveik, saison, Belgian), *Brettanomyces*, and lactic acid bacteria (*Lactobacillus*) blends.
* **Enrichment & Defaults:**
  * **Apparent Attenuation:** Strain-specific `attenuation_pct` sourced from the `YEAST_SPECS` lookup table, with manufacturer-based fallback (75.0% for liquid labs, 76.0% for dry yeast labs).
  * **Attenuation Bounds:** `low_attenuation` and `high_attenuation` derived as ±7% deviation from the stated `attenuation_pct`, defining the valid override envelope enforced by Step 3's validation contract.
  * **Flocculation:** Categorical character (`Low`, `Medium-Low`, `Medium`, `Medium-High`, `High`).
  * **Alcohol Tolerance:** Strain-specific ABV ceiling (`alcohol_tolerance_abv`), ranging from 5.0% (LAB) to 25.0% (super high-gravity strains).
  * **Sensory Notes:** Strain-specific flavor descriptors (e.g., "banana and clove phenolics", "horsey, smoky, and cherry-pie phenolics").

---

## 3. Generic Ingestion Protocol for Future Seed Data

When building new ingredient catalogs (such as Hops, Yeasts, or Water Profiles), follow this standardized five-stage protocol to maintain architectural symmetry and data integrity.

### Stage 1: Provenance & Attribution
* Identify an open, reliable, or scrapeable catalog source (e.g., Beer Analytics, YCH Hops, Fermentis, White Labs, Lallemand).
* Document the extraction URL, snapshot timestamp, and licensing terms in the builder script header.

### Stage 2: Standalone Builder Utility (`scripts/`)
* Create a dedicated builder script adhering to the naming standard: `scripts/build_<primitive_type>.py` (e.g., `scripts/build_hops.py`, `scripts/build_yeasts.py`).
* Structure the script as a standalone CLI tool executable via:
  ```bash
  uv run python scripts/build_<primitive_type>.py
  ```
* Do not introduce scraping libraries (e.g., `beautifulsoup4`, `httpx`) into the core backend dependencies (`pyproject.toml`); run scripts using `uv run --with <package>`.

### Stage 3: Filtering & Domain Normalization
* Define strict inclusion and exclusion rules (e.g., exclude experimental unnamed strains unless widely commercially available).
* Normalize all numerical metrics to standardized metric base units:
  * Mass: grams ($g$) or kilograms ($kg$).
  * Temperature: Celsius ($^\circ\text{C}$).
  * Proportions: Decimals between $0.0$ and $1.0$ (e.g., Alpha Acid percentage $12.5\%$ mapped to decimal or standard float).
* Derive unique, stable kebab-case slug identifiers for each record (e.g., `cascade-us`, `safale-us-05`).

### Stage 4: Pydantic Validation & Output Formatting
* Instantiate and validate each record against the authoritative domain schema defined in `backend/app/schemas/primitives.py` (e.g., `HopPrimitive`, `YeastPrimitive`).
* Emit clean, formatted JSON with 2-space indentation directly into `backend/app/seeds/<primitive_type>.json`.

### Stage 5: Loader Helpers & Test Verification
* Add cached loader functions in `backend/app/seeds/__init__.py`:
  * `load_seed_<primitive>() -> list[<PrimitiveClass>]` (decorated with `@lru_cache(maxsize=1)`).
  * `get_seed_<primitive>_by_id(id: str) -> <PrimitiveClass> | None`.
* **Reference implementations:** `load_seed_malts` / `get_seed_malt_by_id`, `load_seed_sugars` / `get_seed_sugar_by_id`, `load_seed_yeasts` / `get_seed_yeast_by_id`, and `load_seed_equipment_profiles` / `get_seed_equipment_profile_by_id` all follow this pattern.
* Add comprehensive test assertions in `backend/tests/test_seeds.py`:
  * Minimum expected entity count.
  * Uniqueness of all identifier slugs (`seen_ids`).
  * Range validations for critical brewing metrics.
  * Absence of excluded categories or corrupt fields.
* Validate module boundaries with Tach:
  ```bash
  uv run tach check
  ```
