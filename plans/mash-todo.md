# Mash Card — Design Interview (No Code Until Complete)

**Status:** Complete — all twelve questions resolved. Ready for implementation planning.

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

Dough-in is the first rest. Almost everything about it is pre-determined by the solver (strike water volume, mash thickness, target dough-in temp). The **only user-editable field is strike water temperature**, which is derived from the dough-in "use" temperature once the user sets it.

The dough-in rest is visually marked with a "→" in the rest table.

### 4. Mash-out step fields — RESOLVED

Mash-out is a separate always-present step at 168–170 °F (75.5–76.7 °C). It exposes:

- **Target temp** — constrained to the 168–170 °F range.
- **Duration** — user-editable hold time.
- **Mash-out type flag** — whether it's a true mash-out (infusion/decoction to raise temp) or just a hold.

### 5. Ordering & constraints — RESOLVED

**Display order: always ascending by "use" temperature.** This matches how brewers think about a mash schedule (stepping up through the temperature range) and makes the summary table read like a real mash program. Dough-in naturally sits at the top (lowest temp), mash-out at the bottom (highest temp).

**No user reordering.** Since the display is temperature-sorted, a manual reorder control would be meaningless — the sort would immediately override it. No drag handles.

**No hard monotonic enforcement.** A user might legitimately want two rests at the same temperature (e.g., a combined beta/alpha rest alongside a separate beta rest for a step-mash experiment), or a "use" temp slightly outside the canonical range. Blocking would be hostile.

- **Ties** (two enabled rests at the same "use" temp): allowed. Sort is stable; ties broken by **canonical rest order** (Phytase → Ferulic → Beta-Glucan → Protein → Beta-Amylase → Alpha-Amylase → Beta/Alpha). Deterministic and matches the reference table.
- **Out-of-range "use" temp**: soft warning only (see Q9), never a block.
- **Non-monotonic intended sequence**: not a concept from the user's perspective — since we sort by temp anyway, we silently sort and do not warn. Skipped.

**Dough-in and mash-out are pinned bookends.** Dough-in is always first (lowest temp by construction), mash-out is always last (highest temp by construction). They are not part of the sortable set.

### 6. Summary readout — RESOLVED

The summary table on the base card shows, for each enabled rest (in ascending temperature order):

- **Rest name** (with "→" prefix on the dough-in rest)
- **Use temperature** (user-set, unit-aware)
- **Duration** (user-set)
- **Purpose** (short description from the reference table)

Below the rest table, the summary shows derived values:

- **Strike water temperature** — computed from the dough-in "use" temperature once it is set.
- **Total mash time** — sum of all enabled rest durations plus the mash-out duration.

Other candidates (total water used, predicted first-runnings gravity, mash pH estimate) are **deferred** — they belong to the solver/water-chemistry modules, not the Mash Card summary.

### 6b. Limit of Attenuation — RESOLVED

The summary readout includes an informational **Limit of Attenuation (LOA)** field, computed from the mash schedule using the Braukaiser model.

- **Gated on a single saccharification rest** at 63–70 °C. When the schedule has exactly one enabled saccharification rest whose "use" temp falls in that window, LOA is computed and displayed.
- **Informational only** — it does not feed the solver (consistent with Q7) and does not block anything.
- **Hidden when the gate is not met** (zero or multiple sacch rests, or a single sacch rest outside 63–70 °C). No warning, no placeholder — the field simply does not appear.
- **Unit-aware** — displayed as a percentage; no unit toggle needed.
- **Deferred:** promoting LOA into the solver once a fermentability model exists (same deferral as Q7).

### 7. Relationship to the solver — RESOLVED

The Mash Card's rest schedule is **purely a frontend-side schedule** for now. It does **not** feed into `BatchSolverRequest`, and the backend solver does not need to know about rests.

Rationale:

- The current solver is a 2-DOF boil/extract solver. It consumes grain mass, extract potential, and the intensive constraints (`R_L:G` / `r`), and produces `V_strike`, `V1`, `V2`, and the boil cascade. Rest temperatures and durations do not enter any of those equations.
- Rest temperatures affect *fermentability* (beta vs. alpha amylase balance) and *mash pH* (phytase/acid rest), not extract mass balance. Modeling those effects requires a separate fermentability model and a mash pH model, neither of which exists yet.
- Adding rests to `BatchSolverRequest` now would force the backend to accept fields it cannot yet use, creating a schema that lies about what the solver actually computes.

The Mash Card therefore stores its schedule in the `manifest` (see Q10) and the frontend uses it only for display and for computing the derived strike water temperature (Q6). When a fermentability or mash pH model is built, the schedule can be promoted into the solver request at that time.

**Deferred:** promoting the rest schedule into `BatchSolverRequest` once a fermentability/pH model exists.

### 8. Units — RESOLVED

Unit toggling applies to the following fields:

- **Temperatures** (°C ↔ °F) — every rest's "use" temperature, the mash-out target temp, and the derived strike water temperature. Uses the existing `temperature` domain in `UNIT_REGISTRY`.
- **Strike volume** (L ↔ gal) — the derived strike water volume shown in the summary. Uses the existing `volume` domain.
- **Mash thickness** (L/kg ↔ qt/lb) — the mash thickness input. Uses the existing `mass` and `volume` domains composed as a ratio; no new domain needed.

**No toggle** for durations (minutes only).

**No new `UNIT_REGISTRY` domains are required.** All fields map onto existing domains (`temperature`, `volume`, `mass`). The mash thickness ratio is presented as a compound field (volume-per-mass) built from the existing `volume` and `mass` domains, consistent with the existing `compoundDisplay` / `setCompoundDisplay` pattern.

### 9. Validation — RESOLVED

**Soft warning only, never a block.** Amber styling, no red/error styling (red is reserved for hard validation failures like missing required fields or non-numeric input).

- **In the Configure Rests modal:** when the user types a "use" temp outside the rest's recommended range, show an inline amber warning next to the field (e.g., "Outside recommended range 62–65 °C"). The field remains editable and the OK button remains enabled.
- **In the summary table on the base card:** if any enabled rest is out of range, show a single amber banner above the table (e.g., "1 rest is outside its recommended temperature range") with the offending rest(s) highlighted. Does not block saving or wizard advancement.
- **Warning text names the canonical range explicitly** (e.g., "Outside recommended range 62–65 °C") — more useful, costs nothing.
- **Both surfaces warn:** inline in the modal (editing moment) and aggregated banner on the base card (at-a-glance state).
- **No warning for dough-in or mash-out** beyond their own range constraints (mash-out is already constrained to 168–170 °F per Q4; dough-in has no canonical range since it is solver-derived).

Rationale: brewers legitimately push outside canonical ranges (experimentation, thermometer miscalibration); canonical ranges are guidelines, not physics (enzyme activity falls off on a curve, not a cliff); consistent with Q5's soft-warning decision for out-of-range "use" temps.

### 10. Persistence — RESOLVED

The mash schedule lives inside the `manifest`, **recipe-scoped** (saved with the batch), not equipment-profile-scoped.

Rationale:

- The mash schedule is a recipe decision, not an equipment decision. Two brewers with identical rigs will run different mash programs for a Hefeweizen vs. an IPA; the same brewer will run different programs on the same rig for different styles.
- Consistent with the grain bill, which is already in the `manifest`. Equipment profiles hold *capabilities* (max kettle volume, max HLT volume, dead space), not *choices*.
- Equipment profiles are shared across batches. If the schedule lived on the profile, editing it for one batch would silently change every other batch using that profile.
- Q7 already assumes manifest-scoped storage; Q10 confirms it.

**Concrete shape:**

```
manifest.mash = {
  preset_id: 'custom' | 'belgian_saison' | 'german_pils' | ... ,
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

- **Canonical storage unit is Celsius** for temperatures, consistent with the rest of the codebase (the solver uses metric internally; the units store handles display conversion). Durations are stored in minutes.
- **`rest_id` is the stable key.** The canonical rest order (Q5) is derived from a fixed list, not from array position, so the array can be stored in any order and the display sort is applied at render time.
- **`enabled` is explicit** rather than "present in array = enabled." This makes preset switching idempotent: applying a preset just flips `enabled` flags and sets `use_temp_c` / `duration_min` to the preset's defaults, without adding/removing array entries. It also preserves the user's custom temps when they toggle a rest off and back on.
- **`preset_id` is stored** so the dropdown can show the current selection. When the user edits any rest after applying a preset, `preset_id` flips to `'custom'` (same pattern as the grain bill's `is_custom` flag).
- **Dough-in and mash-out are always present** in the array with `enabled: true` (they're bookends, not toggles). Dough-in's `use_temp_c` is solver-derived and may be `null` until the solver runs; mash-out is constrained to 75.5–76.7 °C per Q4.

### 11. UI shape — RESOLVED

Three-part card, modeled on the grain bill editor:

1. **Style dropdown** — selecting a preset checks the corresponding rests in a table showing each rest's key characteristics.
2. **"Configure Rests" button** — opens a modal (to be placed in a `<load>` include). The modal shows a fuller table: low temp range, "use" temperature, high temp range, duration, purpose. The user populates the "use" temperature and duration for each rest and clicks OK. The dough-in rest (first one) is marked with "→".
3. **Summary table on the base card** — after OK, the modal's edits are recapitulated in a complete read-only table on the main card. Once the dough-in "use" temperature is set, the summary table computes and displays the strike water temperature.

### 12. Step sequencing in the wizard — RESOLVED

The Mash Card sits **after the Batch Sparge Solver** step in the wizard.

- **Placement:** immediately following the Batch Sparge Solver. The solver produces the strike water volume and dough-in temperature that the Mash Card's dough-in rest depends on (Q3), so the Mash Card must come after it.
- **The placeholder step is deleted.** The existing placeholder in that slot is removed and replaced by the Mash Card.
- **Required step.** The Mash Card is a required wizard step, not skippable.
- **Pre-populated default.** On first entry, the Mash Card is pre-populated with a default schedule (the "Custom" preset with the combined Beta/Alpha-Amylase Rest enabled, plus the always-present dough-in and mash-out bookends) so the user is never presented with an empty card.

## Resolution Log

_(Record answers here as we resolve each question. Do not begin implementation until all twelve are closed.)_

- **Q2 (Preset list):** Seven canonical rests (added Beta/Alpha-Amylase Rest, 62–72 °C, as the "single infusion" rest). Six named presets + Custom. Dough-in is the first rest (always present). Mash-out is a separate always-present step at 168–170 °F. Preset matrix recorded above.
- **Q4 (Mash-out fields):** Target temp (constrained to 168–170 °F), duration, and a true-mash-out vs. hold flag.
- **Q1 (Alpha-Amylase Rest range):** 68–72 °C (154–162 °F). Target: alpha-amylase. Objective: dextrinization — body and reduced fermentability.
- **Q3 (Dough-in fields):** Only strike water temp is user-editable; everything else is solver-derived. Dough-in is the first rest, marked with "→".
- **Q11 (UI shape):** Three-part card — style dropdown + rest checkbox table, "Configure Rests" modal (via `<load>` include) for editing use-temp/duration, and a summary table on the base card that recapitulates the modal and computes strike water temp.
- **Q5 (Ordering & constraints):** Ascending-temperature display, no manual reorder, no hard monotonic enforcement. Ties allowed, broken by canonical rest order. Out-of-range temps are soft warnings (Q9). Non-monotonic-sequence warning skipped. Dough-in and mash-out are pinned bookends outside the sortable set.
- **Q9 (Validation):** Soft warning only, never a block. Amber styling (red reserved for hard failures). Inline warning in the Configure Rests modal naming the canonical range (e.g., "Outside recommended range 62–65 °C"); aggregated amber banner on the base card when any enabled rest is out of range. Both surfaces warn. No warning for dough-in or mash-out beyond their own range constraints.
- **Q10 (Persistence):** Manifest-scoped, recipe-scoped (not equipment-profile-scoped). Shape: `manifest.mash = { preset_id, rests: [{ rest_id, enabled, use_temp_c, duration_min, is_true_mash_out? }] }`. Celsius canonical for temps, minutes for durations. `rest_id` is the stable key; `enabled` is explicit (preset switching is idempotent and preserves custom temps across toggles). `preset_id` flips to `'custom'` on any edit, matching the grain bill's `is_custom` pattern. Dough-in and mash-out are always present with `enabled: true`; dough-in's `use_temp_c` may be `null` until the solver runs.
- **Q6b (Limit of Attenuation):** Informational LOA field in the summary readout, computed via the Braukaiser model. Gated on a single enabled saccharification rest at 63–70 °C; hidden otherwise (no warning, no placeholder). Informational only — does not feed the solver. Unit-aware (percentage, no toggle). Deferred: promoting LOA into the solver once a fermentability model exists.
- **Q12 (Step sequencing):** Mash Card sits immediately after the Batch Sparge Solver step (the solver produces the strike water volume and dough-in temp the card depends on). The existing placeholder step is deleted and replaced by the Mash Card. Required step, not skippable. Pre-populated with a default schedule (Custom preset + combined Beta/Alpha-Amylase Rest, plus dough-in and mash-out bookends) so the user never sees an empty card.
