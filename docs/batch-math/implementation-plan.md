# Batch Solver Implementation Plan

Staged, resumable plan for implementing the batch-sparging solver described in
`unified-treatment.md`. Each stage is a self-contained, testable increment that
ends with a green test run and a commit.

## 0. Design Constraints

* All solver math lives in `backend/app/core/batch_solver.py` as **pure
  functions**: same inputs -> same outputs, no I/O, no argument mutation, no
  hidden state.
* Composite constants are computed exactly once (Stage 1.0) and composed by the
  phase functions. No phase re-derives them.
* Metric units internally. Constants: `GAMMA_METRIC = 385.5`,
  `V_BAR_METRIC = 0.625`, `K_ABS_TRUE_METRIC = 1.67`,
  `RHO_WATER_METRIC = 1.00`, `F_SHRINK_DEFAULT = 0.04`.
* Typed validation failures raise `SolverValidationError(code, message)`.
* Tests run via `cd backend && uv run pytest ...`.
* Commit at stage boundaries.

## 1. Stage Breakdown

### Stage 1.0 — Shared Pure Helpers (DONE)

Composite constants and stage-volume helpers: `composite_extract_potential`,
`composite_moisture_fraction`, `composite_volumetric_expansion`,
`retained_volume`, `moisture_volume`, `solute_displacement_volume`,
`converted_extract`, plus the `GrainBillEntry` dataclass and
`SolverValidationError`.

Tests: `backend/tests/test_batch_solver_helpers.py`.

### Stage 1.1 — Phase 1: Cold-Side Inverse Resolution (DONE)

`asbc_plato_to_sg`, `asbc_sg_to_plato`, `cutaia_abv`,
`solve_sg_post_boil_from_abv`. Isolates the post-boil SG required to hit a
target ABV at a given apparent attenuation.

Tests: `backend/tests/test_batch_solver_phase1.py`.

### Stage 1.2 — Phase 2: Volumetric Reversal & Extract Targeting (DONE)

Bridges the application input state (`V_ferm`) to the solver constraint
topology (`V_pre_boil`). Functions:

* `kettle_cold_volume(v_ferm, v_kettle_dead, f_shrink)` —
  `V_kettle_cold = V_ferm + V_kettle_dead * (1 - f_shrink)`.
* `post_boil_extract_target(sg_post_boil, v_kettle_cold, gamma)` —
  `S_post_boil_target = 1000 * (SG - 1) * V_kettle_cold / gamma`.
* `pre_boil_volume(v_ferm, v_kettle_dead, delta_v_evap, s_late_add, v_bar, f_shrink)` —
  `V_pre_boil = V_ferm / (1 - f_shrink) + V_kettle_dead + delta_v_evap - v_bar * S_late_add`.
* `resolve_volumetric_reversal(...)` — orchestrator that runs the validation
  gate (`S_post_boil_target - S_late_add > 0`) and returns a frozen
  `VolumetricReversal` result.

Validation codes: `INVALID_FERM_VOLUME`, `INVALID_SHRINKAGE`,
`EXTRACT_TARGET_NON_POSITIVE`.

Tests: `backend/tests/test_batch_solver_phase2.py`.

### Stage 1.3 — Phase 3: Grist Mass Resolution (1D Root-Finding)

Brent's method on the cubic residual `P(M_grist)` over the bracketing interval
`[a, b]` from `unified-treatment.md` §4. Consumes the derived
`{V_pre_boil, R_L:G}` or `{V_pre_boil, r}` pair.

### Stage 1.4 — Phase 4: Stage Volume & Gravity Cascade

Post-convergence volume cascade for both constraint topologies, plus
`calculate_sg_pre_boil` (pre-boil gravity assembly).

### Stage 1.5 — Orchestration & API Wiring

Top-level `solve_batch(...)` entry point composing Phases 1-4, plus the API
schema and route.

## 2. Stage Status

| Stage | Scope | Status |
|-------|-------|--------|
| 1.0 | Shared pure helpers | DONE |
| 1.1 | Phase 1: cold-side inverse | DONE |
| 1.2 | Phase 2: volumetric reversal | DONE |
| 1.3 | Phase 3: grist mass root-finding | TODO |
| 1.4 | Phase 4: stage volume & gravity cascade | TODO |
| 1.5 | Orchestration & API wiring | TODO |
