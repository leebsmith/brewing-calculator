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

- [ ] Remove `hlt_starting_volume_l` from `drawerForm` in
      `createEquipmentManager`.
- [ ] Remove it from `startCreateProfile`, `editProfile`, and `selectProfile`.
- [ ] Remove it from the `isCustomModified` comparison.
- [ ] Remove `step1_hlt_starting_volume_l` from `FIELD_REGISTRY`.
- [ ] Remove `DEFAULT_HLT_STARTING_VOLUME_L` from `BREW_CONSTANTS` (or keep it
      as the Step 5 default; decide).

### 2.2 Add a Step 5 input for `hlt_starting_volume_l`

The batch-level HLT starting volume needs a user-facing input, pre-filled from
`manifest.equipment.max_hlt_volume_l`.

- [ ] Add the input to the Step 5 partial, bound to
      `manifest.hlt_starting_volume_l`.
- [ ] Pre-fill from `max_hlt_volume_l` when the equipment profile changes.
- [ ] Decide: plain number input, or slider bounded by `max_hlt_volume_l`?
- [ ] Wire the `step5_hlt_starting_volume_l` unit domain (already registered).

### 2.3 Display the derived HLT outputs

The solver response now carries `v_hlt_debt`, `v_hlt_after_strike`,
`v_hlt_top_up`, and `v_sparge_deliverable`. None are shown yet.

- [ ] Decide which to surface. Recommendation: `v_hlt_top_up` and
      `v_sparge_deliverable` (the brewer-actionable values); treat
      `v_hlt_debt` and `v_hlt_after_strike` as internal.
- [ ] Add rows to the Step 5 results table.
- [ ] `step5_v_hlt_top_up` and `step5_v_sparge_deliverable` are already
      registered in `FIELD_REGISTRY`.

### 2.4 Surface `HLT_TOO_SMALL`

- [x] Add `MSG_SOLVER_ERRORS.HLT_TOO_SMALL` (done).
- [ ] Verify the 422 handler in `solveBatch()` picks it up (it keys off
      `detail.code`, so it should).
- [ ] Consider suggesting a fix in the message (e.g. "reduce batch size").

### 2.5 Water-plan summary step (open question)

The solver now produces a complete water budget. Decide whether to add a
dedicated summary showing strike volume, sparge volume, HLT top-up, and total
water used — or leave the values scattered across existing steps.

- [ ] Decide: dedicated step, inline panel, or no summary.

### 2.6 Surplus sparge display (open question)

When the HLT is over-filled, `v_sparge_deliverable > v_sparge_demand`. Decide
whether to show the surplus, warn about it, or ignore it.

- [ ] Decide.

### 2.7 Sparge volume override (open question)

The solver computes `v_sparge` from the cascade. There is currently no way for
the brewer to override it. Decide whether that is intended.

- [ ] Decide.

---

## 3. Documentation

- [x] Reframe HLT undeliverable volume as "debt" in
      `plans/vessel-loss-model.md` §3.5 and §4.4.
- [x] Record the `hlt_transfer_loss_l` permanent-debt resolution in §8.
- [ ] Update §8 if any of the open UI questions above are resolved.

---

## 4. Tests

- [x] `test_solve_batch_hlt_budget_is_consistent` (orchestration).
- [x] `test_solve_batch_raises_hlt_too_small` (orchestration).
- [x] HLT assertions in `test_solve_batch_anchors_are_physically_plausible`.
- [x] `test_solve_batch_rejects_hlt_overfilled` (endpoint) — asserts the
      structured 422 with `code == "HLT_OVERFILLED"`.
