# Late Additions — TODO / Gap-Fill Plan

> Status: **AGREED — ready for implementation.**
> Scope confirmed via interview. This document is the contract for the
> implementation work; no code should be written that contradicts it.

## Purpose

Track work items that were identified *after* the initial batch-solver and
wizard implementation, so they are not lost. Each item records:

* **What** the gap is (behavior, formula, UI affordance, validation, etc.).
* **Where** it lives (backend solver, API schema, frontend store, UI partial).
* **Why** it matters (correctness, physical plausibility, UX, parity).
* **Acceptance criteria** (tests, invariants, round-trip properties).

---

## 1. Domain Definition: Late Additions

**Late additions** are fermentables (sugars) added to the **boil kettle**, not
the mash tun. They:

* Come from the **sugars store** (`SugarPrimitive` / `load_seed_sugars()`).
* Directly influence the **end-of-boil gravity** and are incorporated directly
  in the boil solver.
* Have a unit of **mass (weight)**.
* Are a **prerequisite to the solver** (the solver cannot run without them).
* Are **separate from the mash** because grain ratios there are determined by
  part-to-percentage, not weight. The solver ultimately determines the grain
  bill weight; late-addition weight is irrelevant to the mash.
* May be **multiple per batch**; their contributions **sum**.

### Why a separate Step Card

The mash step determines grain ratios by parts-to-percentage. Late additions
are weight-based and feed the boil solver directly. Mixing them into the mash
card would conflate two different input models.

---

## 2. The Math (Agreed)

### 2.1 Sugar mass -> extract mass (temporary conversion)

`SugarPrimitive.potential_sg` is stored as a specific gravity (e.g. `1.032`).
The temporary conversion to a fractional yield is:

```text
yield_fraction = (potential_sg - 1) * 1000 / SUCROSE_POTENTIAL_PPG
extract_mass_kg = sugar_mass_kg * yield_fraction
```

where `SUCROSE_POTENTIAL_PPG = 46.21` (already defined in `constants.js`).

**This is a stopgap.** The future fix is a **key and value change** in
`sugars.json` (e.g. `potential_sg` -> `yield_fraction`) plus a change in the
script that generates the field. See section 7.

### 2.2 Multiple sugars

Contributions sum:

```text
s_late_add = sum_i (sugar_mass_kg_i * yield_fraction_i)
```

### 2.3 Volume

The volume displacement of added sugars is **ignored**. Only the extract mass
contribution matters.

### 2.4 Solver integration

`s_late_add` is already threaded through `batch_solver.py` as an **extract mass
in kg**:

* `pre_boil_volume`: `... - v_bar * S_late_add` (displacement volume).
* `grist_mass_bracket` / `grist_mass_residual`: `delta_s = S_post_boil_target - S_late_add`.

**No backend solver math changes are required.** The gap is purely that the
frontend hardcodes `s_late_add: 0.0`.

---

## 3. API Contract

**No new API field is required.** `BatchSolverRequest.s_late_add` already
exists (`float = Field(0.0, ge=0, ...)`). The frontend sums all late-addition
contributions into this single scalar before POSTing.

---

## 4. Step Ordering & Renumbering

Late additions must come **BEFORE the boil solver**, since their weight is a
solver input. This requires a **full renumbering** of the wizard:

| New # | Step | Old # |
|---|---|---|
| 1 | Equipment Profile | 1 |
| 2 | Yeast Selection | 2 |
| 3 | Fermentables (Grain Bill) | 3 |
| **4** | **Late Additions** | **- (new)** |
| 5 | Batch Sparge Solver | 4 |
| 6 | Mash Profile | 5 |

### 4.1 Files touched by renumbering

* `frontend/constants.js`:
  * `WIZARD_STEPS: [1, 2, 3, 4, 5]` -> `[1, 2, 3, 4, 5, 6]`
  * `WIZARD_DOWNSTREAM_STEPS: [6, 7, 8, 9, 10, 11]` -> `[7, 8, 9, 10, 11, 12]`
  * `FIELD_REGISTRY`: rename `step4_*` -> `step5_*` (batch solver),
    `step5_*` -> `step6_*` (mash), and add new `step4_*` keys for late additions.
* `frontend/index.html`: update `<load>` order and any step-number references.
* `frontend/script.js`: update `markStepComplete` validation branches, all
  `step4_*` / `step5_*` field-key references, and `FIELD_REGISTRY` lookups.
* `frontend/src/partials/step-batch-solver.html`: step number 4 -> 5.
* `frontend/src/partials/step-mash.html`: step number 5 -> 6.
* `frontend/src/partials/step-fermentables.html`: unchanged (still Step 3).

### 4.2 Acceptance criteria

* `markStepComplete(N)` advances to `N+1` with no gaps.
* Every `#step-panel-N` has a matching trigger and partial.
* No `step4_*` field key refers to the batch solver after the change.

---

## 5. Frontend Implementation

### 5.1 New Step Card: `frontend/src/partials/step-late-additions.html`

Mirrors `step-fermentables.html`:

* Summary table of added sugars (name, category, mass, contribution).
* "Configure Late Additions" button opening the editor modal.
* Footer summary card showing total extract contribution.
* Step action button gated on validity.

### 5.2 New Editor/Picker: `frontend/src/partials/modal-late-additions-editor.html`

Mirrors the grain-bill editor:

* Search/filter over `Alpine.store('catalog').sugars`.
* Add/remove rows; each row carries `sugar_id`, `name`, `mass_kg`,
  `potential_sg`, `color_lovibond`.
* Mass is unit-aware (mass domain: kg/lb).
* Live total contribution readout.

### 5.3 New Store: `Alpine.store('lateAdditions', ...)`

* `additions: []` - the working list.
* `draftAdditions: []` - modal draft.
* `modalOpen`, `openModal()`, `saveModal()`, `cancelModal()`.
* `get totalExtractMassKg()` - sums `mass_kg * yield_fraction`.
* `get totalContributionDisplay()` - unit-aware display.
* `yieldFractionFor(sugar)` - the temporary `(SG-1)*1000/SUCROSE_POTENTIAL_PPG`
  conversion.

### 5.4 `script.js` wiring

* `manifest.late_additions` already exists; bind it to the store.
* In `solveBatch()`, replace `s_late_add: 0.0` with
  `s_late_add: Alpine.store('lateAdditions').totalExtractMassKg`.
* Add `markStepComplete(4)` validation: at least one late addition OR an
  explicit "none" acknowledgement (TBD - see section 8).

### 5.5 `pureFunctions.js`

Add a pure helper:

```text
export function sugarPotentialSgToYieldFraction(potentialSg) { ... }
```

Mirrors the validation style of `grainYieldToImperialGallonPointsPerPound`.

---

## 6. Backend Implementation

**Minimal.** Confirmed:

* `batch_solver.py`: no math changes; `s_late_add` already consumed correctly.
* `models.py`: no new field; `s_late_add` already present.
* `logic.py`: no changes; it passes the request through.
* `primitives.py`: no changes for this gap-fill (see section 7 for the future
  migration).

The only backend-adjacent work is **tests** (section 9).

---

## 7. Future Item: `sugars.json` Yield Migration

**Not in scope for this gap-fill.** Recorded here so it is not lost.

* Change `sugars.json` key `potential_sg` -> `yield_fraction` (value becomes a
  fraction, e.g. `0.692` instead of `1.032`).
* Update the script that generates the field.
* Update `SugarPrimitive` in `primitives.py`.
* Update `sugarPotentialSgToYieldFraction` call sites (the helper becomes
  unnecessary).
* Update any frontend display that reads `potential_sg`.

---

## 8. Open Questions (to resolve during implementation)

1. **Step 4 completion gate** - Must the user add at least one late addition,
   or is an empty list valid (i.e., "no late additions")? The solver accepts
   `s_late_add = 0.0`, so an empty list is physically valid. Proposal: allow
   empty, but show a "No late additions" summary state.
2. **Sugar color contribution** - Should late-addition sugars contribute to the
   grist color readout, or is color out of scope for this gap-fill? Proposal:
   out of scope; note as a future item.
3. **Persistence** - `manifest.late_additions` is in-memory only for now
   (consistent with the rest of the manifest). Confirm no Firestore work is
   expected in this gap-fill.

---

## 9. Tests

### 9.1 Frontend (`frontend/tests/`)

* `sugarPotentialSgToYieldFraction` unit tests (known values, invalid inputs).
* `lateAdditions` store: sum of multiple sugars, empty list, unit conversion.

### 9.2 Backend (`backend/tests/`)

* `test_solve_batch_endpoint.py`: add a case with non-zero `s_late_add` and
  assert the grist mass decreases relative to the zero case.
* Confirm `s_late_add` reduces `v_pre_boil` by `v_bar * s_late_add`.

---

## 10. Proposed Future Item: String Step IDs

**Out of scope for this gap-fill.** Recorded here per the interview.

Replace integer step numbers with **string step IDs** (e.g. `"equipment"`,
`"yeast"`, `"fermentables"`, `"late_additions"`, `"batch_solver"`, `"mash"`)
plus an ordered array (`WIZARD_STEP_ORDER`) that defines display sequence.

Benefits:

* Reordering steps = reordering the array only; no source-code churn.
* Self-documenting IDs.
* Eliminates the `markStepComplete(N) -> N+1` contiguity assumption.

This is a larger refactor and should be its own plan.

---

## Resolved Items

* **2026-10-09** - Scope agreed via interview. Late additions defined as
  kettle sugars feeding the boil solver via the existing `s_late_add` scalar.
  Full wizard renumbering approved. String step IDs deferred to a future plan.
