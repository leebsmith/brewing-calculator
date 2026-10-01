# Architecture Decision Record: Segregation of Major and Minor Grain Bill Components

## Context
To calculate brewing targets (original gravity, total mass, strike/sparge volumes), the system must evaluate the grain bill's weighted extract potential. Treating all grain additions (both major structural malts and trace functional malts) as percentages in a single 100% pool creates several systemic issues:

* **Circular Dependencies:** Defining a trace ingredient by absolute physical weight (e.g., ounces) requires knowing the total grist mass to determine its percentage. However, total mass cannot be calculated without first knowing the weighted extract potential of the complete percentage pool.
* **Rounding Distortion (Zero-Erasure):** Trace additions (often 0.5% to 2.0% of the grist) are highly susceptible to rounding errors. A Largest Remainder algorithm can easily round a 0.5% addition down to 0% (erasing it) or up to 1% (doubling its impact), radically shifting color or mash pH predictions.
* **Extreme Scale Disparity:** Apportionment algorithms break down when distributing fractional remainders across items with massive magnitude differences (e.g., a 90% base malt vs. a 0.5% debittered roast).

## Decision
We will segregate the grain bill processing into a two-stage pipeline that cleanly separates proportional formulation (dimensionless) from bill of materials assembly (physical mass).

**Stage 1: Non-Trace Formulation (Dimensionless Space)**
The initial grain bill grid (Table 1) handles only major structural malts (base and character malts).

* Inputs are strictly percentages.
* The table normalizes to exactly 100.0%.
* A standard Largest Remainder (Hamilton) algorithm handles rounding, as the narrow dynamic range (components rarely below 3%) prevents zero-erasure and scale distortion.
* Output: The composite weighted extract potential ($\bar{P}_{major}$).

**Stage 2: The Sugar Kernel (Mass Derivation)**
The master sugar equation takes $\bar{P}_{major}$, target original gravity, batch volume, and brewhouse efficiency to solve for the primary grist dry mass ($M_{major}$).

**Stage 3: Physical Assembly (Mass Space)**
The final grain bill grid (Table 2) materializes the components.

* Major grains are converted to absolute weights ($x_i \cdot M_{major}$).
* Trace additions (e.g., color caps, acidulated malt) are appended directly in physical mass units (grams/ounces).
* Output: Total physical mass ($M_{total} = M_{major} + \sum m_{trace}$).

## Rationale
This architecture severs the circular dependency by isolating the master sugar equation from fixed-weight additions. It eliminates the need for complex polymorphic UI columns (handling both % and weight) in the formulation grid. Furthermore, it accurately reflects the physical reality of brewing: trace malts are measured functionally by weight for color/pH, and their contribution to the extract potential is functionally negligible (below the readability threshold of standard instrumentation).

## Implications
Adopting this dual-entry architecture enforces specific downstream behavior:

* **Negligible Trace Gravity:** The system treats the fermentable extract contribution of trace items as zero. This acknowledges that 4 oz of trace grain in a 5-gallon batch contributes < 0.002 SG, which is below the margin of error for standard hydrometers/refractometers.
* **Downstream Volume Resolution:** Because trace grains contribute physical cellulose mass, they absorb water. Strike and sparge volume algorithms must evaluate absorption against $M_{total}$ (Stage 3), not $M_{major}$, to prevent slight liquor shortages.
* **Downstream Color Resolution:** Sensory calculations like SRM must be deferred until Stage 3, where absolute weights for both major and trace malts are fully resolved against the kettle volume.
