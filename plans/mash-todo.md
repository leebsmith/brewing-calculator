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

### 5. Ordering & constraints
- Are rests always displayed in ascending temperature order, or in the order the user enabled them?
- Can the user reorder?
- Do we enforce monotonically increasing temperature across enabled rests, or allow arbitrary order?

### 6. Summary readout
What should it show? Candidates: total mash time, total water used (strike + infusions), strike water temp, predicted first-runnings gravity, mash pH estimate. Which matter?

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

### 9. Validation
Should we warn (soft) or block (hard) when a rest temp is outside its recommended range? E.g., user sets Beta-Amylase to 70 °C — warn, block, or allow silently?

### 10. Persistence
Does the mash schedule live inside the `manifest` (part of the recipe, saved with the batch), or is it equipment-profile-scoped?

### 11. UI shape — RESOLVED

Three-part card, modeled on the grain bill editor:

1. **Style dropdown** — selecting a preset checks the corresponding rests in a table showing each rest's key characteristics.
2. **"Configure Rests" button** — opens a modal (to be placed in a `<load>` include). The modal shows a fuller table: low temp range, "use" temperature, high temp range, duration, purpose. The user populates the "use" temperature and duration for each rest and clicks OK. The dough-in rest (first one) is marked with "→".
3. **Summary table on the base card** — after OK, the modal's edits are recapitulated in a complete read-only table on the main card. Once the dough-in "use" temperature is set, the summary table computes and displays the strike water temperature.

### 12. Step sequencing in the wizard
Where does the Mash Card sit relative to the existing steps? Before or after the grain bill? Before or after equipment selection?

## Resolution Log

_(Record answers here as we resolve each question. Do not begin implementation until all twelve are closed.)_

- **Q2 (Preset list):** Seven canonical rests (added Beta/Alpha-Amylase Rest, 62–72 °C, as the "single infusion" rest). Six named presets + Custom. Dough-in is the first rest (always present). Mash-out is a separate always-present step at 168–170 °F. Preset matrix recorded above.
- **Q4 (Mash-out fields):** Target temp (constrained to 168–170 °F), duration, and a true-mash-out vs. hold flag.
- **Q1 (Alpha-Amylase Rest range):** 68–72 °C (154–162 °F). Target: alpha-amylase. Objective: dextrinization — body and reduced fermentability.
- **Q3 (Dough-in fields):** Only strike water temp is user-editable; everything else is solver-derived. Dough-in is the first rest, marked with "→".
- **Q11 (UI shape):** Three-part card — style dropdown + rest checkbox table, "Configure Rests" modal (via `<load>` include) for editing use-temp/duration, and a summary table on the base card that recapitulates the modal and computes strike water temp.
