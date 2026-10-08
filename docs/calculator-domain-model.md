# Brewing Calculator Domain Model & Architecture Specification

## 1. Overview & Architectural Foundations

This document unifies the foundational architectural pillars, physical mass-balance formulas, water chemistry pipelines, and data models for the brewing calculator. It synthesizes the requirements from:
1. **Master Architecture Specification** (`calculator-design-spec.pdf`)
2. **Master Batch Sparge Equation** (`master-sugar-equation-for-batch-sparging.pdf`)
3. **Water Chemistry & Mash pH Specification** (`good-enough-chemistry-calculator-spec.pdf`)
4. **Physical HERMS Operations & Equipment Constraints** (Single-vessel refill and HLT coverage)

---

## 2. Core Architectural Pillars

### 2.1 Atomic Data Units (The Library)
Raw ingredients (Primitives) and proportional recipes (Templates) exist as normalized, isolated records independent of specific brew batches.

### 2.2 Relational Compositor (The Assembler)
During recipe formulation, a **Batch** is a lightweight manifest containing target values (Target OG, Target Volume, Target IBU) and foreign key pointers to Library entities.

### 2.3 Directed Acyclic Graph (DAG) Math Pipeline
The physics of brewing are strictly sequenced to eliminate circular dependency loops:
1. Late sugars are deducted from Target OG to establish adjusted mash gravity.
2. The mass-balance root-finder resolves total grain mass and strike/sparge runnings.
3. Resolved grain masses and runnings volumes feed the water chemistry and pH engine.
4. Pre-boil volume and gravity feed the hop utilization (Tinseth) engine.

### 2.4 Finite State Machine (FSM) Accordion
The UI presents a progressive 12-step accordion enforcing the DAG. Upstream changes invalidate downstream calculations, transitioning dependent cards into a "dirty" state until recalculated.

### 2.5 Historical Immutability (The Vault)
When a batch transitions from `Planning` to `Brewing` or `Completed`, all foreign key pointers to global templates are permanently severed. The system executes a copy-on-write snapshot, freezing active template values and resolved masses/volumes into an immutable ledger to ensure recipe evolution never mutates historical brew logs.

### 2.6 Recipe Lineage & Forking
Completed batches cannot be mutated. Users iterate by cloning a batch into a new `Draft`, recording the `parent_batch_id` to maintain a genealogical tree.

### 2.7 Data Normalization & Unit Presentation Layer
All internal mathematical solvers and persistent database fields operate strictly in standardized metric base units:
* **Mass:** Kilograms ($kg$)
* **Volume:** Liters ($L$)
* **Extract / Gravity:** Specific Gravity ($SG$) or Plato ($^\circ P$), and dry-basis extract yield fractions ($0.0 - 1.0$)
* **Temperature:** Celsius ($^\circ C$)
* **Ion Concentration:** Parts per million ($ppm$ or $mg/L$)

User-facing display preferences (Gallons, Ounces, Pounds, Fahrenheit) are resolved exclusively at the UI boundary via a `UnitInput` wrapper component.

---

## 3. Mathematical Foundations: The Mass-Balance & Sugar Engine

### 3.1 Master Batch Sparge Equation
The Step 6 solver derives the required grain mass $M$ to satisfy the target extract collected in the boil kettle ($S_{\text{kettle}}$). The equation models two distinct physical phases: total sugar converted during the mash and lauter extraction efficiency:

$$S_{\text{kettle}} = (P \times M \times C_e) \times \left[ 1 - \left( \frac{\text{Loss}_{\text{equip}} + (M \times A_f)}{V_{\text{strike}} + \frac{M \times \text{moisture}\%}{\rho_{\text{water}}}} \right) \times \left( \frac{\text{Loss}_{\text{equip}} + (M \times A_f)}{\text{Loss}_{\text{equip}} + (M \times A_f) + V_2} \right) \right]$$

#### Variable Definitions:
* $S_{\text{kettle}}$: Total extract mass required in the kettle ($kg$), derived from adjusted Target OG and pre-boil volume.
* $P$: Composite extract potential of the grain bill ($kg\text{ extract} / kg\text{ malt}$), weighted across all grain bill fractions.
* $M$: Total mass of the grain bill ($kg$).
* $C_e$: Mechanical conversion efficiency of the mash ($0.90 - 1.00$).
* $\text{Loss}_{\text{equip}}$: Mash tun dead space and plumbing retention ($L$).
* $A_f$: Grain absorption factor ($L/kg$, typically $0.8 - 1.0\text{ L/kg}$).
* $\text{moisture}\%$: Inherent moisture of raw grain (default $\approx 4\%$).
* $\rho_{\text{water}}$: Density of water ($1.0\text{ kg/L}$).
* $V_{\text{strike}}$: Initial strike water volume ($L$).
* $V_1$: First runnings volume collected in the kettle ($L$).
* $V_2$: Second runnings (sparge) volume collected in the kettle ($L$).
* $V_{\text{wort}}$: Total pre-boil wort volume collected ($V_1 + V_2$).

### 3.2 Root-Finding Formulation
To solve for grain mass $M$, the master equation is rearranged as $f(M) = 0$:

$$f(M) = (P \times M \times C_e) \times \left[ 1 - \text{Loss}_1(M) \times \text{Loss}_2(M) \right] - S_{\text{kettle}} = 0$$

The engine supports two formulation modes to constrain $V_{\text{strike}}$ and $V_2$:

1. **Path 1: Known Liquor-to-Grist Ratio (LGR)**
   * $V_{\text{strike}} = \text{LGR} \times M$
   * $V_1 = V_{\text{strike}} + \frac{M \times \text{moisture}\%}{\rho_{\text{water}}} - [\text{Loss}_{\text{equip}} + (M \times A_f)]$
   * $V_2 = V_{\text{wort}} - V_1$

2. **Path 2: Known Runnings Ratio (e.g., 50/50 Equal Volume Split)**
   * $V_1 = V_{\text{wort}} \times \text{TargetFraction}$
   * $V_2 = V_{\text{wort}} - V_1$
   * $V_{\text{strike}} = V_1 + [\text{Loss}_{\text{equip}} + (M \times A_f)] - \frac{M \times \text{moisture}\%}{\rho_{\text{water}}}$
   * $\text{LGR} = \frac{V_{\text{strike}}}{M}$

In both modes, $f(M)$ is strictly monotonic over $M > 0$. The backend service layer executes root convergence using `scipy.optimize.root_scalar` (Brent's method).

### 3.3 Bidirectional Volume Solving & Backfitting
The relationship between pre-boil kettle volume and final packaged volume is:

$$V_{\text{pre-boil, hot}} = \left(V_{\text{target, cold}} \times (1 + \text{shrinkage})\right) + \text{Loss}_{\text{trub}} + (\text{Rate}_{\text{boil-off}} \times t_{\text{boil}})$$

* **Forward Mode:** Computes required $V_{\text{pre-boil}}$ from target batch volume and equipment boil-off constants.
* **Direct Entry / Backfit Mode:** Allows the brewer to specify a fixed pre-boil volume (e.g., kettle brim limit or measured volume) and backfits $V_{\text{target}}$ or equipment loss parameters.

### 3.4 Adaptive $C_e$ Calibration Loop
Post-brewday, measured pre-boil volume and gravity establish actual extract collected:
$$E_{\text{kettle, actual}} = \frac{S_{\text{kettle, actual}}}{P \times M}$$
$$C_{e, \text{observed}} = C_{e, \text{active}} \times \left(\frac{E_{\text{kettle, actual}}}{E_{\text{kettle, theoretical}}}\right)$$

Equipment profiles store a history of observed $C_e$ data points to track brewery performance over time.

---

## 4. Water Chemistry & Mash pH Engine

### 4.1 Process Volumes vs. Vessel Treatment Volumes (HERMS Workflow)
Brewing water chemistry distinguishes between the liquid entering the kettle and the liquid treated in the vessels:

| Category | Parameter | Purpose |
| :--- | :--- | :--- |
| **Process Runoff** | $V_1, V_2$ | Wort mass-balance, kettle gravity, and extract rinsing. |
| **Strike Treatment** | $V_{\text{treat, strike}} = V_{\text{strike}}$ | Mash liquor treated with minerals and acid. Drawdown is 100%. |
| **Sparge Treatment** | $V_{\text{treat, sparge}} = \max(V_2, \text{HLT}_{\text{min\_volume}})$ | Refilled HLT liquor covering the HERMS heat exchanger coil. |
| **Residual Liquor** | $V_{\text{residual}} = V_{\text{treat, sparge}} - V_2$ | Surplus treated water remaining in HLT, flagged for CIP/cleaning. |

### 4.2 Grist Buffering & Malt Categories
All malts are categorized into four aggregate buckets with standardized deionized water pH ($pH_{DI}$) and buffer capacities ($\beta$ in $\text{mEq/kg/pH}$):
1. **Base Malts:** $pH_{DI} \approx 5.75$, $\beta \approx 45\text{ mEq/kg/pH}$
2. **Crystal / Caramel Malts:** $pH_{DI} \approx 5.00$, $\beta \approx 30\text{ mEq/kg/pH}$
3. **Roasted Malts:** $pH_{DI} \approx 4.70$, $\beta \approx 15\text{ mEq/kg/pH}$
4. **Acid Malt:** $pH_{DI} \approx 3.80$, $\beta \approx 35\text{ mEq/kg/pH}$ (incorporating intrinsic lactic acid contribution)

### 4.3 Mineral Salt Optimization (`scipy.optimize.nnls`)
* **Target Ions:** Calcium ($Ca^{2+}$), Magnesium ($Mg^{2+}$), Sodium ($Na^+$), Sulfate ($SO_4^{2-}$), Chloride ($Cl^-$), Alkalinity.
* **Ratio Constraint:** Given a target Sulfate-to-Chloride ratio $R$:
  $$Cl_{\text{target}} = \frac{\text{Total Anion Target}}{R + 1}, \quad SO_{4, \text{target}} = R \times Cl_{\text{target}}$$
* **Optimization:** Solves non-negative least-squares ($\mathbf{x} \ge 0$) against the source water baseline (RO or Tap) while enforcing a strict calcium floor ($Ca \ge 50\text{ ppm}$) evaluated over $V_{\text{treat, strike}}$ (and $V_{\text{treat, sparge}}$ if proportional).
* **Salt Prioritization:** Prioritizes flavor salts (Gypsum, $\text{CaCl}_2$, Epsom) for mineral profiling.

### 4.4 Residual Alkalinity & Automated pH Mitigation
1. **Residual Alkalinity ($RA_1$):**
   $$RA_1 = \text{Alkalinity}_1 - \left( \frac{Ca_1}{1.4} + \frac{Mg_1}{1.7} \right)$$
2. **Predicted Mash pH:**
   $$\text{Predicted } pH = pH_{DI, \text{weighted}} + \frac{RA_1 \times V_1 - \text{Liquid Acid Equivalent}}{\sum (m_{\text{grist}, i} \times \beta_i)}$$
3. **Automated Prescription:**
   * **If $\text{Predicted } pH > pH_{\text{target}}$:** Calculates required liquid acid ($mL$ of 88% Lactic or 10% Phosphoric) to reach target pH (typically 5.4).
   * **If $\text{Predicted } pH < pH_{\text{target}}$:** Prescribes user's preferred alkalizing agent (Baking Soda $\text{NaHCO}_3$, Pickling Lime $\text{Ca(OH)}_2$, or Chalk $\text{CaCO}_3$).

### 4.5 Sparge Protection & Lautering Acidification
To prevent polyphenol/tannin extraction when sparge runnings approach $pH > 5.8$, tap water with non-zero alkalinity used for $V_{\text{treat, sparge}}$ receives an automated sparge acidification prescription to neutralize $RA_2$. (Bypassed if 100% RO/distilled water is used).

---

## 5. Domain Models & Schemas

```
app/schemas/
├── common.py           # Metric primitives, Enums, Unit types
├── primitives.py       # Tier 1: Malt, Hop, Yeast, Sugar
├── templates.py        # Tier 2: EquipmentProfile, WaterProfile, GrainBillTemplate, etc.
├── batch.py            # Batch manifest (Draft) & BrewDaySnapshot (Vault)
├── solver_mash.py      # Step 6 Master Solver Request/Response DTOs
├── solver_water.py     # Step 7 Water Chemistry Request/Response DTOs
└── user_profile.py     # User settings, tap water baseline, unit preferences
```

### 5.1 Tier 1: Primitives (`primitives.py`)
```python
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
    color_lovibond: float
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
    manufacturer: str
    attenuation_pct: float
    low_attenuation: float
    high_attenuation: float
    flocculation: str
    alcohol_tolerance_abv: float
    notes: str | None = None

class SugarPrimitive(BaseModel):
    id: str
    name: str
    potential_sg: float
    color_lovibond: float
    notes: str | None = None
```
````

docs/calculator-domain-model.md
````markdown
<<<<<<< SEARCH
### 5.2 Tier 2: Templates (`templates.py`)
```python
from pydantic import BaseModel, Field

class EquipmentProfile(BaseModel):
    id: str
    name: str
    mash_dead_space_l: float
    grain_absorption_factor_l_per_kg: float = 0.96
    conversion_efficiency: float = 0.95
    boil_off_rate_l_per_hr: float
    trub_loss_l: float
    shrinkage_pct: float = 0.04
    hlt_min_volume_l: float = 0.0  # HERMS coil submersion volume floor
    max_kettle_volume_l: float

class GrainBillItem(BaseModel):
    malt_id: str
    percentage: float  # Proportional fraction (sum = 100%)

class GrainBillTemplate(BaseModel):
    id: str
    name: str
    items: list[GrainBillItem]

class WaterProfile(BaseModel):
    id: str
    name: str
    calcium_ppm: float
    magnesium_ppm: float
    sodium_ppm: float
    sulfate_ppm: float
    chloride_ppm: float
    bicarbonate_ppm: float
    alkalinity_caco3_ppm: float
```

### 5.2 Tier 2: Templates (`templates.py`)
```python
from pydantic import BaseModel, Field

class EquipmentProfile(BaseModel):
    id: str
    name: str
    mash_dead_space_l: float
    grain_absorption_factor_l_per_kg: float = 0.96
    conversion_efficiency: float = 0.95
    boil_off_rate_l_per_hr: float
    trub_loss_l: float
    shrinkage_pct: float = 0.04
    hlt_min_volume_l: float = 0.0  # HERMS coil submersion volume floor
    max_kettle_volume_l: float

class GrainBillItem(BaseModel):
    malt_id: str
    percentage: float  # Proportional fraction (sum = 100%)

class GrainBillTemplate(BaseModel):
    id: str
    name: str
    items: list[GrainBillItem]

class WaterProfile(BaseModel):
    id: str
    name: str
    calcium_ppm: float
    magnesium_ppm: float
    sodium_ppm: float
    sulfate_ppm: float
    chloride_ppm: float
    bicarbonate_ppm: float
    alkalinity_caco3_ppm: float
```

### 5.3 Step 6 Solver DTOs (`solver_mash.py`)
```python
from enum import Enum
from pydantic import BaseModel, Field

class SolverPath(str, Enum):
    KNOWN_LGR = "KNOWN_LGR"
    KNOWN_RUNNINGS_RATIO = "KNOWN_RUNNINGS_RATIO"

class MasterSolverRequest(BaseModel):
    target_og: float
    target_volume_l: float
    boil_time_min: float
    grain_bill_percentages: dict[str, float]  # malt_id -> percentage
    equipment: EquipmentProfile
    late_addition_gravity_points: float = 0.0
    solver_path: SolverPath = SolverPath.KNOWN_LGR
    lgr: float | None = Field(default=3.0, description="Liters per kg")
    runnings_target_fraction: float | None = Field(default=0.5, description="First runnings fraction")

class MasterSolverResponse(BaseModel):
    total_grain_mass_kg: float
    grain_weights: dict[str, float]  # malt_id -> kg
    grist_buckets_kg: dict[str, float]  # BASE, CRYSTAL, ROASTED, ACID -> kg
    v_strike_l: float
    v1_first_runnings_l: float
    v2_sparge_l: float
    v_pre_boil_l: float
    pre_boil_gravity: float
    conversion_efficiency: float
    predicted_lauter_efficiency: float
    predicted_kettle_efficiency: float
```

### 5.4 Step 7 Water Chemistry DTOs (`solver_water.py`)
```python
from enum import Enum
from pydantic import BaseModel

class SaltDistribution(str, Enum):
    MASH_ONLY = "MASH_ONLY"
    PROPORTIONAL = "PROPORTIONAL"

class AcidMedium(str, Enum):
    LACTIC_88 = "LACTIC_88"
    PHOSPHORIC_10 = "PHOSPHORIC_10"

class AlkalineAgent(str, Enum):
    BAKING_SODA = "BAKING_SODA"
    PICKLING_LIME = "PICKLING_LIME"
    CHALK = "CHALK"

class WaterChemistryRequest(BaseModel):
    v1_mash_l: float
    v2_sparge_l: float
    v_treat_strike_l: float
    v_treat_sparge_l: float
    grist_buckets_kg: dict[str, float]
    source_water: WaterProfile
    target_water: WaterProfile | None = None
    target_sulfate_to_chloride_ratio: float | None = None
    target_mash_ph: float = 5.4
    salt_distribution: SaltDistribution = SaltDistribution.MASH_ONLY
    acid_medium: AcidMedium = AcidMedium.LACTIC_88
    preferred_alkaline_agent: AlkalineAgent = AlkalineAgent.PICKLING_LIME

class WaterPrescription(BaseModel):
    mash_gypsum_g: float = 0.0
    mash_cacl2_g: float = 0.0
    mash_epsom_g: float = 0.0
    mash_baking_soda_g: float = 0.0
    mash_chalk_g: float = 0.0
    mash_pickling_lime_g: float = 0.0
    mash_acid_ml: float = 0.0
    sparge_gypsum_g: float = 0.0
    sparge_cacl2_g: float = 0.0
    sparge_epsom_g: float = 0.0
    sparge_acid_ml: float = 0.0
    residual_hlt_water_l: float = 0.0
    predicted_mash_ph: float
    mash_ph_status: str  # OPTIMAL (5.2-5.6), LOW, HIGH
    sparge_tannin_warning: bool
```

### 5.5 Batch Manifest & Immutable Vault (`batch.py`)
```python
from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field

class BatchStatus(str, Enum):
    PLANNING = "PLANNING"
    BREWING = "BREWING"
    COMPLETED = "COMPLETED"

class BatchManifest(BaseModel):
    """Mutable recipe manifest during PLANNING stage."""
    target_og: float
    target_volume_l: float
    target_ibu: float
    boil_time_min: float
    equipment_profile_id: str
    grain_bill_template_id: str
    hop_schedule_template_id: str
    water_profile_id: str
    mash_profile_id: str
    fermentation_schedule_id: str

class BrewDaySnapshot(BaseModel):
    """Immutable ledger frozen at brew time (The Vault)."""
    frozen_at: datetime
    equipment_snapshot: dict
    resolved_grain_bill: list[dict]  # Absolute weights in kg
    resolved_hop_schedule: list[dict]  # Absolute weights in g & boil timings
    resolved_water_recipe: dict  # Total liquor, treatment volumes, salt & acid prescriptions
    v_strike_l: float
    v_sparge_treat_l: float
    residual_cleaning_water_l: float
    measured_pre_boil_volume_l: float | None = None
    measured_pre_boil_gravity: float | None = None
    calibrated_conversion_efficiency: float | None = None

class BatchRecord(BaseModel):
    id: str
    user_id: str
    name: str
    parent_batch_id: str | None = None
    status: BatchStatus = BatchStatus.PLANNING
    manifest: BatchManifest
    snapshot: BrewDaySnapshot | None = None
    created_at: datetime
    updated_at: datetime
```

---

## 6. Execution Lifecycle

```
[UI: Steps 1-5 Inputs]
         │
         ▼
[Step 6 Master Solver] ──(scipy.optimize.root_scalar)──► [M, V_strike, V1, V2, V_wort, Pre-boil OG]
         │                                                            │
         ▼                                                            ▼
[HERMS Volume Resolution] ──────────────────────────► [V_treat_strike, V_treat_sparge, V_residual]
         │                                                            │
         ▼                                                            ▼
[Step 7 Water Chemistry] ──(scipy.optimize.nnls)───────► [Salts (g), Acid (mL), pH, Cleaning Water Flag]
         │
         ▼
[Steps 8-11: Wet Hops, Yeast, Fermentation, Dry Hops]
         │
         ▼
[Step 12: Brew Day Ledger]
         │
    (Transition)
         ▼
[The Vault: Copy-on-Write Freeze] ────────────────────► [Sever foreign keys, freeze snapshot into BatchRecord]
```
