# Unit System and Override Governance Specification

## 1. Executive Summary & Core Philosophy

The brewing calculator strictly isolates underlying physical calculations from user presentation. While all calculations, formulas, and persistence models operate exclusively in normalized metric base units (liters, kilograms, Celsius, and dimensionless yield fractions), the presentation layer provides an adaptable, unit-system-aware interface.

This document establishes the authoritative architecture for:

* The binary **Global Mode Invariant** ($0 = \text{Metric}$, $1 = \text{Imperial}$).
* The **Universal Field Registry** (`FIELD_REGISTRY`) governing unit-aware controls.
* The **Derived State Machine** governing tri-state mode buttons (Solid, Tinted, Ghost).
* The **Symmetric Bit-Flip Lifecycle** eliminating cycle degradation and preset amnesia.

---

## 2. Mathematical State Model

### 2.1 The Global Mode Bit ($g$)
The global unit mode is strictly binary:

* $g = 0$: Metric System (Default)
* $g = 1$: Imperial System

The global unit mode is never assigned a `'custom'` or tri-state value. It serves as the immutable ground-truth anchor for the active brewing environment.

### 2.2 Field State Bits ($b_i$)
Each unit-aware control declared in the `FIELD_REGISTRY` holds a display state bit:

* $b_i = 0$: Unit 0 (Metric mapping)
* $b_i = 1$: Unit 1 (Imperial mapping)

### 2.3 Pure vs. Mixed Posture (Derived Status)
The posture of the entire application is dynamically derived from the Hamming distance between the active field bits and the global mode bit:

$$\text{overrides} = \{ f \in \text{FIELD\_REGISTRY} \mid b_f \neq g \}$$

$$\text{toggle\_tracker} = |\text{overrides}|$$

* **Pure Mode ($\text{toggle\_tracker} = 0$):** All field controls mirror the global mode bit ($b_i = g$ for all fields).
* **Mixed Mode ($\text{toggle\_tracker} > 0$):** One or more field controls deviate from the global mode bit.

---

## 3. Canonical Domain Duality Matrix

Unit-aware domains map to ordered binary tuples `[Unit 0, Unit 1]`:

| Domain | Key | Index 0 (Metric, $g=0$) | Index 1 (Imperial, $g=1$) | Storage Base |
| :--- | :--- | :--- | :--- | :--- |
| **Volume** | `volume` | `L` | `gal` | Liters ($L$) |
| **Grain Mass** | `mass` | `kg` | `lb` | Kilograms ($kg$) |
| **Hop Mass** | `hopMass` | `g` | `oz` | Kilograms ($kg$) |
| **Temperature** | `temperature` | `C` | `F` | Celsius ($^\circ C$) |
| **Gravity** | `gravity` | `Plato` | `SG` | Specific Gravity ($SG$) |
| **Compound (Absorption)** | `compound` | `L/kg` | `qt/lb` | Liters per Kilogram ($L/kg$) |
| **Extract Potential** | `extract_potential` | `L·°/kg` | `gal·°/lb` | Mass Fraction ($0.0 - 1.0$) |
| **Color** | `color` | `EBC` | `SRM` | SRM |

### 3.1 The Percentage Exception (`%` vs `fraction`)
Percentages represent a unique presentation domain in brewing science:

* **Default (Untoggled / Pure):** `%`
* **Override (Toggled / Mixed):** `fraction`

Because brewers universally work with percentages regardless of whether they brew in Metric or Imperial units, `%` is the baseline default under both presets. Toggling a percentage control to `fraction` immediately marks that control as an override, contributing $+1$ to `toggle_tracker`. Toggling back to `%` returns it to baseline.

### 3.2 Extract Potential Persistence Standard
Extract potential (grain yield) is persisted and computed strictly as a dimensionless mass fraction (e.g., $0.80$ for $80\%$ DBFG). When presented to the user:

* Under Metric ($0$): Rendered as $\text{L}\cdot^\circ/\text{kg}$.
* Under Imperial ($1$): Rendered as $\text{gal}\cdot^\circ/\text{lb}$ (or points per pound per gallon - PPG).
* Because the underlying stored value is always the pure decimal fraction, toggling between display units is lossless and eliminates floating-point drift.

---

## 4. Mode Button Mechanics & Tri-State Visuals

The header presents a mutually exclusive (XOR) pair of mode buttons: **Metric (L)** and **Imperial (gal)**. While the underlying logical state is binary, each button renders using one of three visual states:

```
[ Solid ]   -> Active Global Mode, Pure (toggle_tracker == 0)
[ Tinted ]  -> Active Global Mode, Mixed (toggle_tracker > 0)
[ Ghost ]   -> Inactive Global Mode
```

### 4.1 Interaction Matrix

* **Case A: Clicking the Solid Active Button**
  * **Precondition:** The clicked button matches the active global mode, and `toggle_tracker == 0`.
  * **Action:** No-op. The application is already pure.

* **Case B: Clicking the Tinted Active Button**
  * **Precondition:** The clicked button matches the active global mode, and `toggle_tracker > 0`.
  * **Action:** Deterministic Reset. Clears all field overrides, forcing all registered fields to match the active global mode. The active button immediately transitions from **Tinted** to **Solid**.

* **Case C: Clicking the Ghost Inactive Button**
  * **Precondition:** The clicked button represents the inactive global mode.
  * **Action:** Deterministic Switch. Flips the global mode bit ($g \leftarrow 1 - g$) and clears all field overrides. All registered fields are forced to match the new global mode. The clicked button becomes **Solid**, and the previous mode button becomes **Ghost**.
  * **Modal Elimination:** Ambiguous confirmation dialogs are eliminated completely. Switching modes is instant, predictable, and clean.

---

## 5. Universal Field Registry (`FIELD_REGISTRY`)

To maintain architectural integrity, avoid arbitrary override sprawl, and decouple templates from domain lookup knowledge, all unit-aware fields must be registered in `frontend/constants.js`.

### 5.1 Scope Guardrail: Supported Fields Allowlist
Override controls (`.unit-badge`) are strictly limited to the **14 fields** currently implemented across Steps 1 and 2. To enhance maintainability and trace origin, each field key is prefixed with its associated accordion step (e.g., `step1_`, `step2_`):

#### Step 1: Equipment Profile (10 Badges)
1. `step1_max_kettle_volume_l`: `volume`
2. `step1_max_mash_tun_volume_l`: `volume`
3. `step1_max_hlt_volume_l`: `volume`
4. `step1_hlt_min_volume_l`: `volume`
5. `step1_mash_dead_space_l`: `volume`
6. `step1_trub_loss_l`: `volume`
7. `step1_boil_off_rate_l_per_hr`: `volume`
8. `step1_grain_absorption`: `compound`
9. `step1_conversion_efficiency`: `percentage`
10. `step1_shrinkage_pct`: `percentage`

#### Step 2: Batch Metadata & Boil Solver (4 Badges)
11. `step2_preboil_volume_l`: `volume`
12. `step2_preboil_gravity`: `gravity`
13. `step2_postboil_volume_l`: `volume`
14. `step2_target_volume_l`: `volume`

*(Note: Invariant quantities such as `boil_time_min` remain locked to minutes without unit override controls.)*

### 5.2 Template API Simplification
Templates interact with the store using single-parameter calls:

* **Toggle Action:** `@click="$store.units.toggle('step2_preboil_volume_l')"`
* **Customized Styling Flag:** `:class="{ 'unit-badge-customized': $store.units.isCustomized('step2_preboil_volume_l') }"`
* **Label Text:** `x-text="$store.units.getLabel('step2_preboil_volume_l')"`

The store looks up the field key in `FIELD_REGISTRY`, determines its domain, inspects its current state bit, and executes the operation.

---

## 6. Persistence Model (Sparse Exceptions)

To prevent state rot from orphaned keys or version migrations, `localStorage` persists only the global mode bit and active exceptions:

```json
{
  "globalMode": 0,
  "overrides": {
    "step2_preboil_gravity": 1
  }
}
```

* If all fields match the global mode, the `overrides` map is empty (`{}`).
* When loading, any key in `overrides` that is not present in `FIELD_REGISTRY` is automatically discarded during sanitization.
