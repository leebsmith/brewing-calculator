# Generalized 2-DOF Kettle Thermodynamic Solver

## 1. Executive Summary & Problem Formulation

In Step 2 of the recipe calculation pipeline (Batch Metadata & Kettle Dynamics), the phase-change and solute conservation physics during the boil are governed by 6 core physical variables:

* V1: Pre-Boil Volume (L or gal)
* G1: Pre-Boil Extract Gravity Points ((SG - 1.0) * 1000 or degrees Plato)
* V2: Post-Boil Hot Volume (L or gal)
* G2: Post-Boil Hot Gravity Points ((SG - 1.0) * 1000 or degrees Plato)
* R_boil: Evaporation / Boil-Off Rate (L/hr or gal/hr)
* t: Boil Duration (hr or min)

Historically, brewing calculators hardcode a binary choice:
* Option A: Fix V1, G1, V2, G2, t -> Solve for R_boil.
* Option B: Fix V1, G1, R_boil, t -> Solve for V2, G2.

This document defines the architecture for a generalized 2-Degree-of-Freedom (2-DOF) solver. With 6 variables and 2 governing physical conservation equations, the system has exactly 6 - 2 = 4 independent degrees of freedom. The user selects any 2 variables to solve for, constraining the remaining 4 variables as inputs.

---

## 2. Governing Equations & Mathematical Framework

The boil kettle is modeled as an open thermodynamic system with non-volatile solute (sugars) and volatile solvent (water vapor):

### Equation 1: Volumetric Evaporative Balance
Assuming constant density of boiling liquid over duration t:
V1 - V2 = R_boil * t

### Equation 2: Solute / Extract Mass Conservation
Total dissolved sugar mass is strictly conserved during evaporation:
V1 * G1 = V2 * G2

---

## 3. Reference Validation Implementation

The following reference implementation provides the structural validation logic to identify degenerate or rank-deficient systems:

```javascript
// Define standard variable identifiers
const VALID_VARIABLES = new Set(['V1', 'G1', 'V2', 'G2', 'R_boil', 't']);

// Pairs that result in a structurally singular (degenerate/underdetermined) system
const INVALID_PAIRS = new Set([
    'R_boil:t', 't:R_boil',
    'G1:G2', 'G2:G1'
]);

function validateOutputPair(var1, var2) {
    if (!VALID_VARIABLES.has(var1) || !VALID_VARIABLES.has(var2)) {
        throw new Error('Unknown variable identifier.');
    }
    if (var1 === var2) {
        return { valid: false, reason: 'Cannot select the same variable twice.' };
    }
    
    // Create a normalized key (sorted alphabetically to catch both orders)
    const key = [var1, var2].sort().join(':');
    
    // Check against invalid blacklist
    if (INVALID_PAIRS.has(key)) {
        return { 
            valid: false, 
            reason: 'Invalid system: results in a singular matrix (underdetermined or degenerate).' 
        };
    }
    
    return { valid: true, reason: 'Valid independent output pair.' };
}

// Example usage:
console.log(validateOutputPair('V2', 'G2')); // { valid: true, ... }
console.log(validateOutputPair('R_boil', 't')); // { valid: false, ... }
```

---

## 4. Analysis of Singularities & Degeneracies

Choosing 2 output variables from 6 yields 15 potential configurations (6 choose 2). Exactly 2 configurations produce rank-deficient Jacobian matrices:

### 1. The R_boil : t Singularity (Underdetermined Evaporative Pair)

* Mathematical Cause: Neither R_boil nor t appears in the solute conservation equation (V1 * G1 = V2 * G2). In the volumetric balance equation, they appear exclusively as the product R_boil * t = Delta V.
* Deficiency: Given fixed V1, G1, V2, G2, any pair of (R_boil, t) lying on the hyperbola R_boil * t = V1 - V2 satisfies the balance. The system is infinitely underdetermined. Furthermore, specifying all four of V1, G1, V2, G2 overdetermines the extract balance (V1 * G1 != V2 * G2), introducing physical contradictions.

### 2. The G1 : G2 Singularity (Underdetermined Solute Pair)

* Mathematical Cause: Neither G1 nor G2 appears in the volumetric balance equation (V1 - V2 = R_boil * t). In the solute equation, they only specify the proportional concentration ratio G2 / G1 = V1 / V2.
* Deficiency: With no absolute extract anchor, infinite gravity pairs satisfy the ratio. The system has no unique solution.

---

## 5. Complete Closed-Form Solution Matrix (13 Solvable Pairs)

For all 13 valid pairs, the system admits deterministic, closed-form algebraic solutions:

| # | Solved Outputs | Fixed Inputs | Analytical Solutions | Singular / Invalid Conditions |
|---|---|---|---|---|
| 1 | (V2, G2) (Default / Option B) | V1, G1, R_boil, t | V2 = V1 - (R_boil * t)<br>G2 = (V1 * G1) / V2 | V2 <= 0 (R_boil * t >= V1) |
| 2 | (R_boil, G2) (Option A) | V1, G1, V2, t | R_boil = (V1 - V2) / t<br>G2 = (V1 * G1) / V2 | t <= 0, V2 <= 0, V1 <= V2 |
| 3 | (t, G2) | V1, G1, V2, R_boil | t = (V1 - V2) / R_boil<br>G2 = (V1 * G1) / V2 | R_boil <= 0, V2 <= 0, V1 <= V2 |
| 4 | (V1, G1) (Reverse Runoff Solver) | V2, G2, R_boil, t | V1 = V2 + (R_boil * t)<br>G1 = (V2 * G2) / V1 | V1 <= 0 |
| 5 | (R_boil, G1) | V1, V2, G2, t | R_boil = (V1 - V2) / t<br>G1 = (V2 * G2) / V1 | t <= 0, V1 <= 0, V1 <= V2 |
| 6 | (t, G1) | V1, V2, G2, R_boil | t = (V1 - V2) / R_boil<br>G1 = (V2 * G2) / V1 | R_boil <= 0, V1 <= 0, V1 <= V2 |
| 7 | (V1, V2) (Dilution & Concentration) | G1, G2, R_boil, t | V1 = (G2 * R_boil * t) / (G2 - G1)<br>V2 = (G1 * R_boil * t) / (G2 - G1) | G1 >= G2 (no boil concentration) |
| 8 | (V1, R_boil) | G1, V2, G2, t | V1 = (V2 * G2) / G1<br>R_boil = (V1 - V2) / t | G1 <= 0, t <= 0, G1 >= G2 |
| 9 | (V1, t) | G1, V2, G2, R_boil | V1 = (V2 * G2) / G1<br>t = (V1 - V2) / R_boil | G1 <= 0, R_boil <= 0, G1 >= G2 |
| 10 | (V2, R_boil) | V1, G1, G2, t | V2 = (V1 * G1) / G2<br>R_boil = (V1 - V2) / t | G2 <= 0, t <= 0, G1 >= G2 |
| 11 | (V2, t) | V1, G1, G2, R_boil | V2 = (V1 * G1) / G2<br>t = (V1 - V2) / R_boil | G2 <= 0, R_boil <= 0, G1 >= G2 |
| 12 | (V1, G2) | G1, V2, R_boil, t | V1 = V2 + (R_boil * t)<br>G2 = (V1 * G1) / V2 | V2 <= 0 |
| 13 | (V2, G1) | V1, G2, R_boil, t | V2 = V1 - (R_boil * t)<br>G1 = (V2 * G2) / V1 | V1 <= 0, V1 <= R_boil * t |

---

## 6. UI/UX Specification: The 6-Pill Interaction Model

### 6.1 Pill Component Architecture
Step 2 displays a dedicated solver toolbar containing 6 selectable pills:
```
[ V1: Pre-Boil Vol ]  [ G1: Pre-Boil Grav ]  [ V2: Post-Boil Vol ]
[ G2: Post-Boil Grav ] [ R_boil: Boil-Off ]   [ t: Duration ]
```

### 6.2 State & Proactive Gating Engine
To ensure a zero-error user experience, the UI uses proactive gating rather than reactive error alerts:

1. Initial / Unselected State (n = 0):

   * All 6 pills are enabled in their default state.
2. Single Selection (n = 1):

   * The selected pill displays an active state (.pill-selected).
   * If R_boil is selected, t is immediately disabled (disabled, .pill-disabled) with tooltip: "Cannot solve simultaneously with Duration (underdetermined system)".
   * If t is selected, R_boil is disabled.
   * If G1 is selected, G2 is disabled with tooltip: "Cannot solve simultaneously with Post-Boil Gravity (infinite proportional ratios)".
   * If G2 is selected, G1 is disabled.
   * The remaining 4 pills remain clickable.
3. Dual Selection (n = 2):

   * Both selected pills display .pill-selected.
   * The remaining 4 unselected pills transition to inactive/frozen (disabled).
   * Clicking an active pill deselects it (n -> 1).
4. Default Preset:

   * On initial load or recipe reset, the system defaults to:
     Selected Pair = (V2, G2)
   * This retains 100% backward compatibility with traditional recipe planning (the legacy Option B).

### 6.3 Form Field Affordances (Input vs. Solved Output)

The 6 form fields in Step 2 dynamically adapt based on the active selection:

* Unselected (4 variables):

  * Rendered as standard `<input class="form-input">` controls with active unit badges (`$store.units.toggle(...)`).
  * Changes trigger immediate reactive re-solving of the 2 target variables.
* Selected / Solved (2 variables):

  * Tagged with `readonly` (or rendered as non-editable synthesized badges).
  * Styled with `.form-input-solved`:
    * Subtle accent background (`var(--sys-color-surface-container)`).
    * Monospace/tabular numerical emphasis.
    * An inline indicator icon/badge: `⚙️ Solved`.
    * Unit badge remains clickable to toggle display unit without modifying underlying base storage.

---

## 7. Downstream Propagation & Chilling Bridge

Once (V2, G2) are determined (either directly entered or calculated by the solver), the downstream chilling bridge executes automatically:

1. Total Kettle Loss:
   Loss_kettle = trub_loss_l + kettle_dead_space_l
2. Thermal Contraction & Packaged Volume:
   V_target = max(0, (V2 - Loss_kettle) * (1.0 - shrinkage_pct))
3. Concentration & Target OG:
   Extract_Points_total = V1 * G1
   Target_OG = 1.0 + (Extract_Points_total / (V_target * 1000))
4. Synthesized Kettle Extract (S_kettle):
   S_kettle = V2 * G2
   This value feeds directly into Step 3 to determine total required malt grist mass.

---

## 8. Implementation Roadmap

1. Phase 1: Pure Solver Core (ThermodynamicSolver)
   * Implement `ThermodynamicSolver.solve2DOF(manifest, var1, var2)`.
   * Add automated unit tests covering all 13 valid pairs and division-by-zero boundaries.
2. Phase 2: Alpine Store & Reactive State
   * Add `solverOutputs: ['V2', 'G2']` to the Step 2 Alpine component state.
   * Add `toggleSolverPill(varKey)` with proactive singular pair masking.
3. Phase 3: Template & Tokenized CSS
   * Replace binary radio toggles in `step-batch-metadata.html` with the 6-pill toolbar.
   * Bind field `readonly` and visual styling to `solverOutputs.includes(...)`.
   * Pass token audit gate (`scripts/audit-tokens.sh`).
4. Phase 4: Documentation Sync
   * Update `plans/master-frontend-ui-requirements.md` to deprecate the legacy Option A/B toggle and reference this generalized 2-DOF specification.
