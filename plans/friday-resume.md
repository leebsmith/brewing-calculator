# Resume: brewing-calculator, branch v2-dag-engine

Repo: brewing-calculator, branch v2-dag-engine.

## Status

**Backend solver (Stages 1.0–1.5): DONE and green.** All stages committed per
`docs/batch-math/implementation-plan.md`. The Stage Status table correctly
shows all stages DONE.

**Frontend solver refactor: DONE and green.** All ten work items in
`plans/finish-frontend-solver-refactor.md` are implemented. The legacy
`ThermodynamicSolver` integration has been removed from `frontend/script.js`,
the `SOLVER_*` block has been removed from `frontend/constants.js`, and
`DEFAULT_V_FERM_L` / `DEFAULT_TARGET_ABV` plus the `step5_*` FIELD_REGISTRY
entries are in place. `frontend/src/partials/step-batch-solver.html` has the
`v_ferm` / `target_abv` inputs, and `solveBatch()` reads both from the manifest
and writes `v_post_boil` from `result.cascade.v_post_boil`. Step 5 is
functional end-to-end.

Test suites confirmed green:

- `cd frontend && node --test tests/unitsStore.test.js` — 8 passed.
- `cd frontend && node --test tests/maltGridStore.test.js` — 10 passed.
- `cd backend && uv run pytest -v` — 114 passed.

## Next action

None. The frontend solver refactor is complete. See the Deferred / future work
section below for non-blocking follow-ups.

## Key conventions

- All solver math is pure functions in `backend/app/core/batch_solver.py`.
- Metric units internally; `GAMMA_METRIC = 385.5`, `V_BAR_METRIC = 0.625`,
  `K_ABS_TRUE_METRIC = 1.67`, `RHO_WATER_METRIC = 1.00`,
  `F_SHRINK_DEFAULT = 0.04`.
- `SolverValidationError(code, message)` for typed validation failures; the API
  maps it to HTTP 422 with `detail: {code, message}`.
- Backend tests run via `cd backend && uv run pytest ...`.
- Frontend tests run via `cd frontend && node --test tests/<file>.test.js`.
- Commit at stage boundaries.
- **MANDATORY:** never suggest a commit while any test is failing. Always run
  the full backend suite *and* both frontend suites and confirm green before
  proposing a commit command.
- Frontend unit handling: every numeric field routes through
  `Alpine.store('units')` with a `FIELD_REGISTRY` entry; use
  `volDisplay`/`setVolDisplay`, `massDisplay`/`setMassDisplay`,
  `gravityDisplay`/`setGravityDisplay`,
  `percentageDisplay`/`setPercentageDisplay`,
  `compoundDisplay`/`setCompoundDisplay`.

## Files to add to the new chat

The frontend refactor is complete, so the frontend files are no longer needed
for that work. The list below is retained for the remaining deferred items
(ASBC reconciliation, integration test, HLT water accounting).

- `backend/app/core/batch_solver.py`
- `backend/app/core/utils.py`
- `backend/app/main.py`
- `backend/app/schemas/models.py`
- `backend/tests/test_batch_solver_phase4.py`
- `docs/batch-math/implementation-plan.md`
- `docs/batch-math/unified-treatment.md`
- `plans/vessel-loss-model.md`
- `plans/finish-frontend-solver-refactor.md`
- `frontend/script.js`
- `frontend/constants.js`
- `frontend/index.html`
- `frontend/src/partials/step-batch-solver.html`
- `frontend/src/partials/step-equipment-profile.html`
- `frontend/src/partials/step-yeast-selection.html`
- `frontend/src/partials/step-fermentables.html`
- `frontend/src/partials/step-mash-profile.html`
- `frontend/src/partials/modal-grain-bill-editor.html`
- `frontend/tests/unitsStore.test.js`
- `frontend/tests/maltGridStore.test.js`

## Deferred / future work

Not blocking. Tracked here rather than in the work plan because none of these
are required to make Step 5 functional.

- **Stage 5: reconcile ASBC coefficients.** `batch_solver.py` and `utils.py`
  implement the same conversions with slightly different coefficients:
  - `batch_solver.py`: `plato_to_sg` uses
    `1.0 + 0.0038661*p + 1.34e-5*p² + 4.3e-8*p³`; `sg_to_plato` uses
    `-463.37 + 668.72*sg - 205.35*sg²`.
  - `utils.py`: `plato_to_sg` uses
    `1.0000131 + 0.00386777*p + 1.27447e-5*p² + 6.34964e-8*p³`; `sg_to_plato`
    uses `((135.997*sg - 630.272)*sg + 1111.14)*sg - 616.868`.
  - `docs/batch-math/unified-treatment.md` §6 is the authoritative spec for
    the new solver; `batch_solver.py`'s header flags the divergence.
- **Integration test** hitting the real `/api/solve-batch` route with a mocked
  auth dependency.
- **HLT water accounting** — `plans/vessel-loss-model.md` §4.4/§4.5 describes
  HLT top-up and sparge salt dosing, not yet implemented in the UI.
- **Row Inspector field-name mismatch** — RESOLVED / no longer present. The
  inspector in `modal-grain-bill-editor.html` binds
  `x-model.number="row.color_lovibond"`, and every row-producing path in
  `frontend/script.js` (`addMajorMalt()`, the default row literal,
  `maltColorDisplay()`, `weightedSrm`) uses `color_lovibond`. There are zero
  occurrences of `color_srm` in the codebase, so the field names agree. This
  entry is retained only as a historical note; no action is required.
