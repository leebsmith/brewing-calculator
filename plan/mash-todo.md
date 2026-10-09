# Mash Card — Design Interview (Complete)

**Status:** Complete — all twelve questions resolved. Implementation may proceed.

## Context

The Mash Card is **primarily an input card**, with an optional summary readout.

- Contains **two fixed bookend steps**: Dough-in and Mash-out (both configurable).
- Contains **six optional rests** the user can toggle on/off:
  1. Phytase / Acid Rest (35–52 °C)
  2. Ferulic Acid Rest (43–45 °C)
  3. Beta-Glucan Rest (45–50 °C)
  4. Protein Rest (50–54 °C)
  5. Beta-Amylase Rest / Sacch. Part 1 (62–65 °C)
  6. Alpha-Amylase Rest / Sacch. Part 2 (range TBD — see Q1)
- Each enabled rest exposes **editable temperature and duration**.
- A **preset dropdown** (Belgian, German, etc.) can pre-populate a common combination of rests.

### Reference: Common Rests

| Rest Name | Temperature Range | Primary Target | Objective / Main Benefit |
|---|---|---|---|
| Phytase / Acid Rest | 35–52 °C (95–126 °F) | Phytase enzyme | Lowers mash pH naturally (rarely used today; replaced by modern brewing acids). |
| Ferulic Acid Rest | 43–45 °C (109–113 °F) | Ferulic acid esterase | Releases ferulic acid to create the clove-like aroma in German Hefeweizens. |
| Beta-Glucan Rest | 45–50 °C (113–122 °F) | Beta-glucanase | Breaks down gums in sticky, high-viscosity grains like oats, rye, and unmalted wheat. |
| Protein Rest | 50–54 °C (122–129 °F) | Protease & Peptidase | Breaks down complex proteins to improve yeast health and reduce chill haze in under-modified malts. |
| Beta-Amylase Rest (Saccharification Part 1) | 62–65 °C (144–149 °F) | Beta-amylase enzyme | Creates highly fermentable sugars (maltose) for a dry, clean-finishing beer with high alcohol conversion. |
| Alpha-Amylase Rest (Saccharification Part 2) | 68–72 °C (154–162 °F) | Alpha-amylase enzyme | Breaks down remaining starches into unfermentable dextrins, adding body and reducing fermentability. |
| Beta/Alpha-Amylase Rest (Combined Saccharification) | 62–72 °C (144–162 °F) | Beta- and alpha-amylase enzymes | Simultaneous beta- and alpha-amylase activity for balanced everyday brewing. Used as the "single infusion" rest. |

## Resolved Questions

### 1. Alpha-Amylase Rest range — RESOLVED

68–72 °C (154–162 °F). Primary target: alpha-amylase enzyme. Objective: breaks down remaining starches into unfermentable dextrins, adding body and reducing fermentability.

### 2. Preset list — RESOLVED

**Canonical rest vocabulary (7 atomic rests):**
1. Phytase / Acid Rest (35–52 °C)
2. Ferulic Acid Rest (43–45 °C)
3. Beta-Glucan Rest (45–50 °C)
4. Protein Rest (50–54 °C)
5. Beta-Amylase Rest (62–65 °C)
6. Alpha-Amylase Rest (68–72 °C)
7. Beta/Alpha-Amylase Rest (62–72 °C) — combined saccharification, used as "single infusion"

**Presets are combinations of the canonical rests.** Dough-in is the *first rest* (always present, not preset-controlled). Mash-out is a separate step (always present, 168–170 °F / 75.5–76.7 °C).

**Custom-preset behavior:**
- Selecting **Custom** clears all rest checkboxes (the user picks freely from scratch).
- If the user manually edits any checkbox after selecting a named preset, the dropdown **automatically flips to "Custom"**. Named presets are read-only snapshots; any manual divergence means the schedule is no longer that preset.

**Preset matrix:**

| Preset | Rests (in order) |
|---|---|
| Belgian Saison / Bière de Garde | Beta-Glucan, Protein, Beta-Amylase |
| Belgian Tripel / Dubbel / Golden Strong | Beta-Amylase |
| German Pils / Dortmunder (Hochkurz) | Beta-Amylase, Alpha-Amylase |
| Traditional Berliner Weisse | Phytase/Acid, Beta/Alpha-Amylase |
| English Brown / Mild / Oatmeal Stout | Alpha-Amylase |
| American Pale / IPA / Porter / Standard Ale | Beta/Alpha-Amylase |
| Custom | (none — user picks freely) |

**Dough-in:** always present as the first rest; not part of the preset toggle set.
**Mash-out:** always present as a separate step; not part of the preset toggle set. Range 168–170 °F (75.5–76.7 °C).

### 3. Dough-in step fields — RESOLVED

Dough-in is the first rest. Almost everything about it is pre-determined by the solver (strike water volume, mash thickness, target dough-in temp). The only user-editable field is strike water temperature, which is derived from the dough-in "use" temperature once the user sets it.

**Strike water temperature formula** (frontend, in the Mash Card):

The canonical storage unit is metric. The codebase stores temperatures in Celsius and the solver uses metric internally, so the formula the editor engineer implements is the metric one:

```
T_strike_c = T_target_c + (0.41 / mash_thickness_L_per_kg) * (T_target_c - T_grain_c)
```

where:
- `T_target_c` = dough-in "use" temperature, in °C (user-editable)
- `T_grain_c` = grain temperature, in °C (user-editable, batch-specific; see below)
- `mash_thickness_L_per_kg` = mash thickness in L/kg — the same value shown in the summary table. (Use the name `mash_thickness` consistently; do not introduce a separate `mash_thickness_ratio` variable.)
- `0.41` = specific heat of dry malted barley in kcal/(kg·°C), which is the metric constant because water's specific heat is 1.0 kcal/(kg·°C) and its density is 1 kg/L

**Display conversion is handled by the units store.** The formula runs in metric; the units store converts `T_strike_c` to °F for display when the user's temperature preference is imperial. The editor engineer should **not** implement the imperial formula separately — that would duplicate logic and risk drift. One formula, metric, converted at the display boundary.

**`T_grain_c` source:** grain temperature is a **batch-specific, user-editable field** on the Mash Card. It is stored in the manifest alongside the rest schedule (see Q10) as `manifest.mash.grain_temp_c`. Default value on first entry is `20.0` °C. It is unit-aware (toggles with the temperature domain, °C ↔ °F) and is displayed in the summary readout alongside the derived strike water temperature. It is **not** sourced from the equipment profile — grain temperature varies batch-to-batch (grain stored in a cold garage vs. a warm kitchen), so it belongs with the recipe, not the rig.

**Equipment thermal mass offset is deferred.** The advanced `T_tun` correction (heat absorbed by the mash tun walls) is out of scope for v1. If it is added later, it is an additive offset applied after the base formula. Do not implement it now.

The dough-in rest is visually marked with a "→" in the rest table.

### 4. Mash-out step fields — RESOLVED

Mash-out is a separate always-present step at 168–170 °F (75.5–76.7 °C). It exposes:

- **Target temp** — constrained to the 168–170 °F range.
- **Duration** — user-editable hold time.
- **Mash-out type flag** — whether it's a true mash-out (infusion/decoction to raise temp) or just a hold.

### 5. Ordering & constraints — RESOLVED

Rests are **always displayed in ascending temperature order**. The order is **enforced**, not arbitrary. The user **cannot reorder** rests manually — the sort is derived from the "use" temperature of each enabled rest.

**Tiebreaker:** when two enabled rests share the same "use" temperature, they are ordered by **canonical rest order** (the numbered list in Q2: Phytase/Acid → Ferulic Acid → Beta-Glucan → Protein → Beta-Amylase → Alpha-Amylase → Beta/Alpha-Amylase). The sort is therefore stable and deterministic.

This means the dough-in rest (first, marked "→") and the mash-out step (last) are naturally bookends, and any enabled rests fall between them in temperature order.

### 6. Summary readout — RESOLVED

Per-rest rows (name with "→" on dough-in, use temp, duration, purpose) in ascending temperature order, plus derived strike water temp, grain temperature (user-editable input), and total mash time. Total water, first-runnings gravity, and mash pH deferred to solver/water-chemistry modules.

### 6b. Limit of Attenuation (LOA) — RESOLVED

Informational only — it does not feed the solver (consistent with Q7). Computed **frontend-side** from the mash schedule using the Braukaiser model. The Braukaiser implementation lives in the frontend alongside the rest of the mash-schedule logic (same module that derives strike water temp); it is not part of the solver. Displayed as a read-only readout on the summary table.

### 7. Relationship to the solver — RESOLVED

The solver pre-determines the dough-in step's strike water volume, mash thickness, and target dough-in temperature (see Q3). The rest schedule itself does not feed `BatchSolverRequest`; rests affect fermentability and mash pH, not extract mass balance, and neither model exists yet. Schedule lives in the `manifest` and is used for display and strike-water-temp derivation. Promotion of the rest schedule into the solver request deferred until a fermentability/pH model is built.

### 8. Units — RESOLVED

Temperatures (°C ↔ °F) — including every rest's "use" temperature, the mash-out target temp, the derived strike water temperature, **and the grain temperature input** — strike volume (L ↔ gal), and mash thickness (L/kg ↔ qt/lb) toggle. Durations do not.

**New `UNIT_REGISTRY` domain required:** `mash_thickness`. Mash thickness is a ratio (volume per mass), not a `mass` field, and the existing `toDisplay(domain, baseValue, fieldKey)` signature takes a single domain and a single scalar — it cannot express "volume per mass." Add a `mash_thickness` domain with its own conversion pair (L/kg ↔ qt/lb). Temperatures and strike volume map onto the existing `temperature` and `volume` domains.

### 9. Validation — RESOLVED

**Soft warn.** When a rest's "use" temperature falls outside its recommended range, show an inline amber note next to the field. Do not block. Ranges are advisory; experienced brewers intentionally step outside them (e.g., a 70 °C "beta" rest for a dextrinous beer). The warning clears when the value returns to range.

### 10. Persistence — RESOLVED

**Manifest-scoped, saved with the batch.** The mash schedule lives inside the `manifest` alongside the rest of the recipe. It is not equipment-profile-scoped. (Consistent with Q7.)

Concrete shape:

```
manifest.mash = {
  preset_id: 'custom' | 'belgian_saison' | 'german_pils' | ...,
  grain_temp_c: <number>,   // batch-specific, user-editable, default 20.0
  rests: [
    {
      rest_id: 'dough_in' | 'phytase' | 'ferulic' | 'beta_glucan' | 'protein' | 'beta_amylase' | 'alpha_amylase' | 'beta_alpha_amylase' | 'mash_out',
      enabled: true | false,
      use_temp_c: <number | null>,   // canonical storage unit: Celsius
      duration_min: <number | null>,
      // mash_out only:
      is_true_mash_out: true | false
    },
    ...
  ]
}
```

Notes on the shape:

- Canonical storage unit is Celsius for temperatures, consistent with the rest of the codebase (the solver uses metric internally; the units store handles display conversion). Durations are stored in minutes.
- `grain_temp_c` is batch-specific and user-editable. It is **not** part of the equipment profile. Default on first entry is `20.0`.
- `rest_id` is the stable key. The canonical rest order (Q5) is derived from a fixed list, not from array position, so the array can be stored in any order and the display sort is applied at render time.
- `enabled` is explicit rather than "present in array = enabled." This makes preset switching idempotent: applying a preset just flips enabled flags and sets `use_temp_c` / `duration_min` to the preset's defaults, without adding/removing array entries. It also preserves the user's custom temps when they toggle a rest off and back on.
- `preset_id` is stored so the dropdown can show the current selection. When the user edits any rest after applying a preset, `preset_id` flips to `'custom'` (same pattern as the grain bill's `is_custom` flag).
- Dough-in and mash-out are always present in the array with `enabled: true` (they're bookends, not toggles). Dough-in's `use_temp_c` is solver-derived and may be null until the solver runs; mash-out is constrained to 75.5–76.7 °C per Q4.

### 11. UI shape — RESOLVED

Three-part card, modeled on the grain bill editor:

1. **Style dropdown** — selecting a preset checks the corresponding rests in a table showing each rest's key characteristics.
2. **"Configure Rests" button** — opens a modal. The modal markup lives in a new partial under `frontend/src/partials/` (e.g. `frontend/src/partials/mash-rests-modal.html`) and is pulled in via the existing partial-include mechanism used by the rest of the frontend. The modal shows a fuller table: low temp range, "use" temperature, high temp range, duration, purpose. The user populates the "use" temperature and duration for each rest and clicks OK. The dough-in rest (first one) is marked with "→".
3. **Summary table on the base card** — after OK, the modal's edits are recapitulated in a complete read-only table on the main card. Once the dough-in "use" temperature is set, the summary table computes and displays the strike water temperature.

### 12. Step sequencing in the wizard — RESOLVED

**Placement:** immediately following the Batch Sparge Solver. The solver pre-determines the dough-in step's strike water volume, mash thickness, and target dough-in temperature (Q3), so the Mash Card must come after it. The Mash Card also sits after the grain bill and after equipment selection: the grain bill supplies total grain mass (for strike-water-temp derivation), and the equipment profile supplies mash thickness defaults. Grain temperature is **not** sourced from the grain bill or equipment profile — it is a batch-specific input on the Mash Card itself (Q3). Placing the card earlier would force the user to backtrack.

## Resolution Log

- **Q1 (Alpha-Amylase Rest range):** 68–72 °C (154–162 °F). Target: alpha-amylase. Objective: dextrinization — body and reduced fermentability.
- **Q2 (Preset list):** Seven canonical rests (added Beta/Alpha-Amylase Rest, 62–72 °C, as the "single infusion" rest). Six named presets + Custom. Dough-in is the first rest (always present). Mash-out is a separate always-present step at 168–170 °F. Preset matrix recorded above. Selecting Custom clears all checkboxes; manually editing checks after a named preset auto-flips the dropdown to Custom.
- **Q3 (Dough-in fields):** Dough-in is the first rest, marked with "→". Almost everything about it is pre-determined by the solver (strike water volume, mash thickness, target dough-in temp). The only user-editable field on the dough-in rest itself is strike water temperature, which is derived from the dough-in "use" temperature via the metric formula `T_strike_c = T_target_c + (0.41 / mash_thickness_L_per_kg) * (T_target_c - T_grain_c)`. `T_grain_c` is a **batch-specific, user-editable field** on the Mash Card (stored as `manifest.mash.grain_temp_c`, default `20.0` °C, unit-aware). It is not sourced from the equipment profile. The `T_tun` equipment thermal-mass offset is deferred. Display conversion to °F is handled by the units store at the display boundary; no separate imperial formula is implemented.
- **Q4 (Mash-out fields):** Target temp (constrained to 168–170 °F), duration, and a true-mash-out vs. hold flag.
- **Q5 (Ordering & constraints):** Rests always displayed in ascending temperature order. Enforced, not arbitrary. No manual reordering — sort is derived from each rest's "use" temperature. Equal "use" temperatures are ordered by canonical rest order (Q2's numbered list); the sort is stable and deterministic.
- **Q6 (Summary readout):** Per-rest rows (name with "→" on dough-in, use temp, duration, purpose) in ascending temperature order, plus derived strike water temp, grain temperature (user-editable input), and total mash time. Total water, first-runnings gravity, and mash pH deferred to solver/water-chemistry modules.
- **Q6b (Limit of Attenuation):** Informational only; does not feed the solver (consistent with Q7). Computed frontend-side from the mash schedule using the Braukaiser model, in the same frontend module that derives strike water temp. Displayed as a read-only readout on the summary table.
- **Q7 (Relationship to the solver):** The solver pre-determines the dough-in step's strike water volume, mash thickness, and target dough-in temperature (see Q3). The rest schedule itself does not feed `BatchSolverRequest`; rests affect fermentability and mash pH, not extract mass balance, and neither model exists yet. Schedule lives in the `manifest` and is used for display and strike-water-temp derivation. Promotion of the rest schedule into the solver request deferred until a fermentability/pH model is built.
- **Q8 (Units):** Temperatures (°C ↔ °F) — including every rest's "use" temperature, the mash-out target temp, the derived strike water temperature, and the grain temperature input — strike volume (L ↔ gal), and mash thickness (L/kg ↔ qt/lb) toggle. Durations do not. **New `UNIT_REGISTRY` domain required: `mash_thickness`** (volume-per-mass ratio; the existing single-domain `toDisplay` signature cannot express it). Temperatures and strike volume map onto existing `temperature` and `volume` domains.
- **Q9 (Validation):** Soft warn — inline amber note when a rest's "use" temperature is outside its recommended range. Non-blocking; clears when back in range.
- **Q10 (Persistence):** Manifest-scoped, saved with the batch. Not equipment-profile-scoped. (Consistent with Q7.) Shape: `manifest.mash = { preset_id, grain_temp_c, rests: [{ rest_id, enabled, use_temp_c, duration_min, is_true_mash_out? }] }`. `grain_temp_c` is batch-specific, user-editable, default `20.0`. Celsius canonical for temps, minutes for durations. `rest_id` is the stable key; `enabled` is explicit (preset switching is idempotent and preserves custom temps across toggles). `preset_id` flips to `'custom'` on any edit, matching the grain bill's `is_custom` pattern. Dough-in and mash-out are always present with `enabled: true`; dough-in's `use_temp_c` may be null until the solver runs.
- **Q11 (UI shape):** Three-part card — style dropdown + rest checkbox table, "Configure Rests" modal for editing use-temp/duration, and a summary table on the base card that recapitulates the modal and computes strike water temp. Modal markup lives in a new partial under `frontend/src/partials/` (e.g. `frontend/src/partials/mash-rests-modal.html`) and is pulled in via the existing partial-include mechanism.
- **Q12 (Step sequencing):** Mash Card sits immediately following the Batch Sparge Solver, and after the grain bill and after equipment selection — it depends on all three. The solver pre-determines the dough-in step's strike water volume, mash thickness, and target dough-in temperature (Q3); the grain bill supplies total grain mass; the equipment profile supplies mash thickness defaults. Grain temperature is a batch-specific input on the Mash Card itself (Q3), not sourced from the grain bill or equipment profile.
