# Water TODO

Open work items related to water accounting, the HLT water budget, and the
water-facing UI. Excludes salt chemistry (tracked separately).

See `plans/vessel-loss-model.md` for the canonical loss/debt taxonomy and the
HLT water budget math (§4.4).

---

## 1. Backend

### 1.1 Enforce the `hlt_starting_volume_l <= max_hlt_volume_l` invariant

`hlt_starting_volume_l` is batch-level and `max_hlt_volume_l` is
equipment-level, so the invariant cannot be checked inside the solver (which
is equipment-agnostic). It belongs at the API layer, where the equipment
profile is resolved.

- [x] Add a validation gate in `solve_batch_endpoint` that rejects
      `hlt_starting_volume_l > max_hlt_volume_l` with a structured error code
      (`HLT_OVERFILLED`). Implemented at the API layer (not a Pydantic
      `model_validator`) so the structured `{"code", "message"}` detail reaches
      the frontend's `solveBatch()` handler.
- [x] Add the corresponding `MSG_SOLVER_ERRORS` entry in
      `frontend/constants.js`.

### 1.2 Salt dosing (deferred — tracked here for completeness)

Documented in `plans/vessel-loss-model.md` §4.5 but not implemented. Excluded
from the current scope; listed so it is not forgotten.

- [ ] Compute `V_sparge_salted = V_hlt_after_strike + V_hlt_top_up`.
- [ ] Dose sparge salts against `V_sparge_salted`, not the pre-strike HLT
      volume.

---

## 2. Frontend

### 2.1 Remove `hlt_starting_volume_l` from the equipment drawer

`hlt_starting_volume_l` is now batch-level, but the equipment drawer still
carries it. This is redundant and misleading.

- [x] Remove `hlt_starting_volume_l` from `drawerForm` in
      `createEquipmentManager`.
- [x] Remove it from `startCreateProfile`, `editProfile`, and `selectProfile`.
- [x] Remove it from the `isCustomModified` comparison.
- [x] Remove `step1_hlt_starting_volume_l` from `FIELD_REGISTRY`.
- [x] Keep `DEFAULT_HLT_STARTING_VOLUME_L` in `BREW_CONSTANTS`. **Resolved:**
      keep it. It serves as the manifest's initial value before a profile
      loads, so the manifest is never in an undefined state on first render.
      `selectProfile` overwrites it from `max_hlt_volume_l` once profiles are
      available, but the constant remains the safe pre-load default.

### 2.2 Add a Step 5 input for `hlt_starting_volume_l`

The batch-level HLT starting volume needs a user-facing input, pre-filled from
`manifest.equipment.max_hlt_volume_l`.

- [x] Add the input to the Step 5 partial, bound to
      `manifest.hlt_starting_volume_l`.
- [x] Pre-fill from `max_hlt_volume_l` when the equipment profile changes.
- [x] Decide: plain number input (chosen; a slider is deferred).
- [x] Wire the `step5_hlt_starting_volume_l` unit domain (already registered).

### 2.3 Display the derived HLT outputs

The solver response now carries `v_hlt_debt`, `v_hlt_after_strike`,
`v_hlt_top_up`, and `v_sparge_deliverable`. None are shown yet.

- [x] Decide which to surface: `v_hlt_top_up` and `v_sparge_deliverable` (the
      brewer-actionable values); `v_hlt_debt` and `v_hlt_after_strike` are
      treated as internal.
- [x] Add rows to the Step 5 results table (Water Plan section).
- [x] `step5_v_hlt_top_up` and `step5_v_sparge_deliverable` are already
      registered in `FIELD_REGISTRY`.

### 2.4 Surface `HLT_TOO_SMALL`

- [x] Add `MSG_SOLVER_ERRORS.HLT_TOO_SMALL` (done).
- [x] Verify the 422 handler in `solveBatch()` picks it up (it keys off
      `detail.code`, so it should).
- [x] Consider suggesting a fix in the message. **Resolved:** the message
      already names both levers ("Use a larger HLT or reduce the batch size").
      The exact shortfall is visible in the Water Plan table (`HLT Top-Up`,
      `Sparge Deliverable`) and the equipment drawer (`max_hlt_volume_l`), so
      no additional context is surfaced in the error string. Surfacing the
      numeric shortfall would require either backend changes (to include the
      values in `detail`) or a `MSG_SOLVER_ERRORS` shape change; deferred as
      not worth the churn for a rare error path.

### 2.5 Water-plan summary step (resolved — inline panel)

The solver now produces a complete water budget. Resolved as an inline "Water
Plan" section within the Step 5 results panel, rather than a dedicated wizard
step. A new step would have required renumbering the contiguous step roster
(`WIZARD_STEPS`) and would only re-render values Step 5 already holds.

- [x] Decide: inline panel in Step 5 (not a dedicated step).

### 2.6 Surplus sparge display (resolved — shown as footnote)

When the HLT is over-filled, `v_sparge_deliverable > v_sparge_demand`. Resolved
as a footnote on the "Sparge Deliverable" row, labeled "surplus sparge
capacity" to make clear it is excess *deliverable capacity*, not the liquor
left in the HLT after the sparge.

- [x] Decide: show as a footnote on the deliverable row.

### 2.7 Sparge volume override (resolved — no override)

The solver computes `v_sparge` from the cascade. There is currently no way for
the brewer to override it, and there should not be.

`v_strike` and `v_sparge` are *derived* extensive outputs, not independent
knobs: they fall out of the mass balance once the grist mass, the intensive
constraint, and the pre-boil volume are fixed. Overriding them would break the
extract balance (they feed `s_run2` and `sg_pre_boil`), so the solver would
have to either ignore the override or produce a pre-boil gravity inconsistent
with the grain bill.

The intended levers are the *intensive* constraints the solver is built
around:

- **Mash thickness (`R_L:G`)** — sets `v_strike = R_L:G * M_grist`.
- **Runoff ratio (`r`)** — sets the `v_run1` / `v_run2` split, hence
  `v_sparge`.
- **Batch size** (via `v_ferm` + losses + boil-off) — sets the total.

The HLT budget is the intended surface for expressing a *water* constraint:
if the HLT cannot deliver the computed sparge, the brewer lowers
`hlt_starting_volume_l` (or the batch size) and receives `HLT_TOO_SMALL`.

- [x] Decide: **no override.** `v_strike` and `v_sparge` remain derived
      outputs; the intensive constraints and batch size are the levers.

---

## 3. Documentation

- [x] Reframe HLT undeliverable volume as "debt" in
      `plans/vessel-loss-model.md` §3.5 and §4.4.
- [x] Record the `hlt_transfer_loss_l` permanent-debt resolution in §8.
- [x] Update §8 to record the §2.5 (inline Water Plan panel), §2.6 (surplus
      sparge capacity footnote), and §2.7 (no sparge-volume override)
      resolutions.

---

## 4. Tests

- [x] `test_solve_batch_hlt_budget_is_consistent` (orchestration).
- [x] `test_solve_batch_raises_hlt_too_small` (orchestration).
- [x] HLT assertions in `test_solve_batch_anchors_are_physically_plausible`.
- [x] `test_solve_batch_rejects_hlt_overfilled` (endpoint) — asserts the
      structured 422 with `code == "HLT_OVERFILLED"`.
