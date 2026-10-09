# Finish Frontend Solver Refactor

**Status:** COMPLETE. All ten work items are implemented and both frontend
test suites are green. The backend half was already complete.

**Priority:** Resolved. Step 5 (Batch Sparge Solver) is functional
end-to-end. See "Why this was urgent" below for the historical context.

## Why this was urgent

`frontend/script.js`'s `solveBatch()` read `this.manifest.v_ferm` and
`this.manifest.target_abv`, but neither field exists on the manifest literal.
Both fall back to `BREW_CONSTANTS.DEFAULT_V_FERM_L` and
`BREW_CONSTANTS.DEFAULT_TARGET_ABV`, which are also undefined in
`frontend/constants.js`. The result is that `solveBatch()` sends
`v_ferm: NaN` and `target_abv: NaN` to `POST /api/solve-batch`, which fails
Pydantic validation (`gt=0`) and returns HTTP 422.

Meanwhile, the legacy `ThermodynamicSolver` is still fully present in
`script.js` and still wired into `runBoilSolver()`, which is called from
`init()`, `onBatchMetaChange()`, and the `recipe:recalculate` listener. So the
frontend is in a half-migrated state: the new code path is broken, and the old
code path is still running but is no longer the one `solveBatch()` calls.

## What is already done (backend)

- `StageCascade` has `v_post_boil`, computed via the hot-side kettle balance
  `V_pre_boil - delta_v_evap` (`backend/app/core/batch_solver.py`).
- `StageCascadeModel` exposes `v_post_boil` (`backend/app/schemas/models.py`).
- `POST /api/solve-batch` threads `v_post_boil` into the response
  (`backend/app/main.py`).
- `BatchSolverRequest` accepts `v_ferm` and `target_abv` with `gt=0` validators.
- `backend/tests/test_batch_solver_phase4.py` asserts on `v_post_boil`.
- Wizard steps are renumbered contiguously 1–5 (`frontend/index.html`,
  `frontend/constants.js` `WIZARD_STEPS`).

## What was done (frontend)

Work items in dependency order. Each was a discrete, verifiable action.

### 1. Add missing constants to `frontend/constants.js`

- `DEFAULT_V_FERM_L` — default cold fermenter volume (suggest `20.0`, matching
  the retired `DEFAULT_TARGET_VOLUME_L`).
- `DEFAULT_TARGET_ABV` — default ABV target percentage (suggest `5.5`).

### 2. Add missing FIELD_REGISTRY entries to `frontend/constants.js`

- `step5_v_ferm` → `volume`
- `step5_v_post_boil` → `volume`
- `step5_target_og` → `gravity`

### 3. Add `v_ferm` and `target_abv` to the manifest in `frontend/script.js`

Both are user inputs on Step 5. Add them to the manifest literal alongside the
existing solver inputs (`target_og`, `preboil_volume_l`, etc.), with comments
explaining that `v_ferm` is the canonical packaged-volume field (per
`docs/batch-math/unified-treatment.md` §3) and that `target_abv` is always a
percentage (no unit toggle).

### 4. Add the two input fields to `frontend/src/partials/step-batch-solver.html`

At the top of `step-card-content`, above the existing Constraint Topology
block:

- `V_ferm` input, routed through `volDisplay` / `setVolDisplay` with field key
  `step5_v_ferm`.
- `target_abv` input, plain number (no unit toggle), bound to
  `manifest.target_abv`.

### 5. Update `solveBatch()` in `frontend/script.js`

- Write `this.manifest.v_post_boil = result.cascade.v_post_boil` alongside the
  existing writes to `preboil_volume_l`, `preboil_gravity`, `postboil_volume_l`,
  `postboil_gravity`, and `target_og`.
- Confirm the payload's `v_ferm` and `target_abv` now resolve to real numbers
  (not `NaN`).

### 6. Remove the legacy `ThermodynamicSolver` integration from `frontend/script.js`

Delete:

- `runBoilSolver()` and all its call sites (`init()`, `onBatchMetaChange()`,
  `setVolDisplay`, `setGravityDisplay`, `toggleSolverPill`,
  `setBoilSolverMode`, the `recipe:recalculate` listener).
- `solverOutputs`, `solverError`, `solverVariables`.
- `isSolverOutput()`, `isSolverPillDisabled()`, `solverPillDisabledReason()`,
  `toggleSolverPill()`, `setBoilSolverMode()`.
- `targetOgPoints`, `targetKettleExtract`, `targetKettleExtractDisplay`,
  `targetKettleExtractUnit` getters.
- Any remaining references to `ThermodynamicSolver`.

Note: `volDisplay` / `setVolDisplay` / `massDisplay` / `setMassDisplay` /
`gravityDisplay` / `setGravityDisplay` / `compoundDisplay` /
`setCompoundDisplay` / `percentageDisplay` / `setPercentageDisplay` are still
needed by the step partials — keep them, but strip the `runBoilSolver()` calls
from the setters.

### 7. Remove the `SOLVER_*` block from `frontend/constants.js`

Delete:

- `SOLVER_VARIABLES`
- `SOLVER_VALID_VARIABLES`
- `SOLVER_INVALID_PAIRS`
- `SOLVER_DEFAULT_OUTPUTS`
- `MSG_SOLVER_SINGULAR_PAIR`
- `MSG_SOLVER_SAME_VARIABLE`
- `MSG_SOLVER_UNKNOWN_VARIABLE`

Rationale: these were consumed only by the retired `ThermodynamicSolver`.
`SOLVER_VARIABLES` also referenced `step2_boil_time_min` as a `fieldKey`, which
was never in `FIELD_REGISTRY` — a latent bug that becomes moot on removal.

### 8. Prune stale entries from `frontend/constants.js`

- `step2_*` FIELD_REGISTRY entries (`step2_preboil_volume_l`,
  `step2_postboil_volume_l`, `step2_target_volume_l`, `step2_preboil_gravity`,
  `step2_postboil_gravity`) — the Batch Metadata step was retired. Confirmed:
  `frontend/src/partials/step-batch-metadata.html` is a zero-byte orphan and
  `frontend/index.html` no longer loads it.
- `DEFAULT_TARGET_VOLUME_L` — replaced by `DEFAULT_V_FERM_L`.
- `MSG_BATCH_NAME_REQUIRED`, `MSG_TARGET_VOLUME_REQUIRED`,
  `MSG_TARGET_OG_REQUIRED` — unused since Step 2 was retired.

Keep `step2_yeast_attenuation_pct` — it is still used by Step 2 (Yeast
Selection).

### 9. Run the frontend test suites

```
cd frontend && node --test tests/unitsStore.test.js
cd frontend && node --test tests/maltGridStore.test.js
```

Both must be green. The test harness `eval`s `script.js` after stripping ESM
imports/exports, so any reference to an undefined constant introduced by the
refactor will surface here at load time.

### 10. Run the backend test suite

```
cd backend && uv run pytest -v
```

Must be green. The backend was already green before this refactor; this step
guards against accidental regressions.

## Acceptance criteria

- `frontend/script.js` contains no references to `ThermodynamicSolver`,
  `runBoilSolver`, `solverOutputs`, `toggleSolverPill`, `setBoilSolverMode`,
  `targetOgPoints`, `targetKettleExtract`, or `targetKettleExtractDisplay`.
- `frontend/constants.js` contains no `SOLVER_*` or `MSG_SOLVER_*` symbols, and
  no `step2_*` FIELD_REGISTRY entries other than
  `step2_yeast_attenuation_pct`.
- `frontend/constants.js` contains `DEFAULT_V_FERM_L`, `DEFAULT_TARGET_ABV`,
  and the `step5_v_ferm` / `step5_v_post_boil` / `step5_target_og`
  FIELD_REGISTRY entries.
- `frontend/src/partials/step-batch-solver.html` has `V_ferm` and `target_abv`
  inputs at the top of `step-card-content`.
- `solveBatch()` reads `v_ferm` and `target_abv` from the manifest and writes
  `v_post_boil` from `result.cascade.v_post_boil`.
- Step 5 solves end-to-end in the browser: `cd frontend && npm run dev`, sign
  in, configure Steps 1–3, open Step 5, click "Solve Batch", and confirm the
  Derived Anchors and Stage Cascade tables populate without a 422.
- Both frontend test suites and the backend test suite are green.

## Out of scope

The following are genuinely deferred and are tracked in
`plans/friday-resume.md`'s Deferred section, not here:

- ASBC coefficient reconciliation between `batch_solver.py` and `utils.py`.
- Integration test hitting the real `/api/solve-batch` route with mocked auth.
- HLT water accounting (top-up, sparge salt dosing).
- Row Inspector `color_lovibond` / `color_srm` field-name mismatch in
  `modal-grain-bill-editor.html`.
