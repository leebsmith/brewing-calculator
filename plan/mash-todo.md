# Mash Card — Design Interview (No Code Until Complete)

**Status:** In progress — do not write code until every question below is resolved.

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

## Open Questions

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

Dough-in is the first rest. The **only user-editable field is the dough-in "use" temperature**; the strike water temperature is derived from it (see formula below). Strike water volume and mash thickness are *not* solver-derived — the solver ignores rests entirely (see Q7). They are computed frontend-side from the grain bill and equipment profile, which are already available on the batch.

**Strike water temperature formula** (frontend, in the Mash Card):

```
T_strike = T_target + (mash_thickness_ratio) * (T_target − T_grain)
```

where:
- `T_target` = dough-in "use" temperature (user-editable)
- `T_grain` = grain temperature (from equipment profile / ambient; default 20 °C if unset)
- `mash_thickness_ratio` = `mash_thickness` (L/kg) — the same value shown in the summary table

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

Per-rest rows (name with "→" on dough-in, use temp, duration, purpose) in ascending temperature order, plus derived strike water temp and total mash time. Total water, first-runnings gravity, and mash pH deferred to solver/water-chemistry modules.

### 7. Relationship to the solver — RESOLVED

Purely frontend-side schedule for now. Does not feed `BatchSolverRequest`; the solver ignores rests. Rests affect fermentability and mash pH, not extract mass balance, and neither model exists yet. Schedule lives in the `manifest` and is used only for display and strike-water-temp derivation. Promotion into the solver request deferred until a fermentability/pH model is built.

### 8. Units — RESOLVED

Temperatures (°C ↔ °F), strike volume (L ↔ gal), and mash thickness (L/kg ↔ qt/lb) toggle. Durations do not.

**New `UNIT_REGISTRY` domain required:** `mash_thickness`. Mash thickness is a ratio (volume per mass), not a `mass` field, and the existing `toDisplay(domain, baseValue, fieldKey)` signature takes a single domain and a single scalar — it cannot express "volume per mass." Add a `mash_thickness` domain with its own conversion pair (L/kg ↔ qt/lb). Temperatures and strike volume map onto the existing `temperature` and `volume` domains.

### 9. Validation — RESOLVED

**Soft warn.** When a rest's "use" temperature falls outside its recommended range, show an inline amber note next to the field. Do not block. Ranges are advisory; experienced brewers intentionally step outside them (e.g., a 70 °C "beta" rest for a dextrinous beer). The warning clears when the value returns to range.

### 10. Persistence — RESOLVED

**Manifest-scoped, saved with the batch.** The mash schedule lives inside the `manifest` alongside the rest of the recipe. It is not equipment-profile-scoped. (Consistent with Q7.)

### 11. UI shape — RESOLVED

Three-part card, modeled on the grain bill editor:

1. **Style dropdown** — selecting a preset checks the corresponding rests in a table showing each rest's key characteristics.
2. **"Configure Rests" button** — opens a modal. The modal markup lives in a new partial under `frontend/src/partials/` (e.g. `frontend/src/partials/mash-rests-modal.html`) and is pulled in via the existing partial-include mechanism used by the rest of the frontend. The modal shows a fuller table: low temp range, "use" temperature, high temp range, duration, purpose. The user populates the "use" temperature and duration for each rest and clicks OK. The dough-in rest (first one) is marked with "→".
3. **Summary table on the base card** — after OK, the modal's edits are recapitulated in a complete read-only table on the main card. Once the dough-in "use" temperature is set, the summary table computes and displays the strike water temperature.

### 12. Step sequencing in the wizard — RESOLVED

The Mash Card sits **after the grain bill and after equipment selection**. It depends on both: the grain bill supplies grain temperature and total grain mass (for strike-water-temp derivation), and the equipment profile supplies mash thickness defaults. Placing it earlier would force the user to backtrack.

## Resolution Log

_(Record answers here as we resolve each question. Do not begin implementation until all twelve are closed.)_

- **Q2 (Preset list):** Seven canonical rests (added Beta/Alpha-Amylase Rest, 62–72 °C, as the "single infusion" rest). Six named presets + Custom. Dough-in is the first rest (always present). Mash-out is a separate always-present step at 168–170 °F. Preset matrix recorded above.
- **Q4 (Mash-out fields):** Target temp (constrained to 168–170 °F), duration, and a true-mash-out vs. hold flag.
- **Q1 (Alpha-Amylase Rest range):** 68–72 °C (154–162 °F). Target: alpha-amylase. Objective: dextrinization — body and reduced fermentability.
- **Q3 (Dough-in fields):** Only strike water temp is user-editable; everything else is solver-derived. Dough-in is the first rest, marked with "→".
- **Q11 (UI shape):** Three-part card — style dropdown + rest checkbox table, "Configure Rests" modal (via `<load>` include) for editing use-temp/duration, and a summary table on the base card that recapitulates the modal and computes strike water temp.
- **Q5 (Ordering & constraints):** Rests always displayed in ascending temperature order. Enforced, not arbitrary. No manual reordering — sort is derived from each rest's "use" temperature.
- **Q6 (Summary readout):** Per-rest rows (name with "→" on dough-in, use temp, duration, purpose) in ascending temperature order, plus derived strike water temp and total mash time. Total water, first-runnings gravity, and mash pH deferred to solver/water-chemistry modules.
- **Q7 (Relationship to the solver):** Purely frontend-side schedule for now. Does not feed `BatchSolverRequest`; the solver ignores rests. Rests affect fermentability and mash pH, not extract mass balance, and neither model exists yet. Schedule lives in the `manifest` and is used only for display and strike-water-temp derivation. Promotion into the solver request deferred until a fermentability/pH model is built.
- **Q8 (Units):** Temperatures (°C ↔ °F), strike volume (L ↔ gal), and mash thickness (L/kg ↔ qt/lb) toggle. Durations do not. **New `UNIT_REGISTRY` domain required: `mash_thickness`** (volume-per-mass ratio; the existing single-domain `toDisplay` signature cannot express it). Temperatures and strike volume map onto existing `temperature` and `volume` domains.
- **Q9 (Validation):** Soft warn — inline amber note when a rest's "use" temperature is outside its recommended range. Non-blocking; clears when back in range.
- **Q10 (Persistence):** Manifest-scoped, saved with the batch. Not equipment-profile-scoped. (Consistent with Q7.)
- **Q12 (Step sequencing):** Mash Card sits after the grain bill and after equipment selection — it depends on both.
- **Q5 (Tiebreaker):** Equal "use" temperatures are ordered by canonical rest order (Q2's numbered list). Sort is stable and deterministic.
- **Q2 (Custom preset):** Selecting Custom clears all checkboxes; manually editing checks after a named preset auto-flips the dropdown to Custom.
- **Q3 (Strike water temp formula):** `T_strike = T_target + (mash_thickness_ratio) * (T_target − T_grain)`. Strike volume and mash thickness are frontend-computed from grain bill + equipment profile, not solver-derived.
- **Q11 (Modal include):** Modal markup lives in a new partial under `frontend/src/partials/` and is pulled in via the existing partial-include mechanism.
