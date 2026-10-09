# Plans

This directory serves as the centralized repository for architectural proposals, design documents, and feature implementation plans.

## Canonical Specifications (living documents)
* [Master Frontend UI Requirements](master-frontend-ui-requirements.md) - Unified frontend UI/UX requirements specification bridging `calculator-design-spec.pdf` with the Compositor Wizard and modular Vanilla CSS design system. **Note:** the 12-step accordion and Step 2 Batch Metadata sections predate the current 1–5 step renumbering; treat the step roster as illustrative.
* [Vessel Loss Model](vessel-loss-model.md) - Canonical taxonomy of liquid losses per vessel and their propagation through the process chain.

## Active Work
* [Refactor Malt Color Key](refactor-malt-color-key.md) - Rename `color_srm` → `color_lovibond`. Backend (`malts.json`, `primitives.py`) is done; frontend (`script.js` `addMajorMalt`, `modal-grain-bill-editor.html` inspector) is not.

## Completed (kept for historical reference)
* [Finish Frontend Solver Refactor](finish-frontend-solver-refactor.md) - Frontend half of the batch-sparge solver migration. All ten work items implemented; both frontend test suites green. The Batch Metadata step was retired (its partial is a zero-byte orphan).
* [Unit System Architecture & Refactor Plan](archive/unit-system-refactor.md) - Binary mode invariant, `FIELD_REGISTRY`, tri-state header pills, symmetrical toggle engine. All four phases implemented. Its Phase 1 field list still names `step2_*` entries that were subsequently pruned.
* [Malt Entry Table Implementation](archive/malt-entry-table-implementation.md) - Hamilton proportional allocation, draft isolation, 2.0% trace floor, catalog search drawer with category pills and live counter. Implemented.

## Obsolete (superseded)
* [Generalized 2-DOF Boil Solver](archive/generalized-2dof-boil-solver.md) - Described a frontend `ThermodynamicSolver.solve2DOF` and 6-pill solver toolbar. Superseded by the backend `batch_solver.py` four-phase pipeline and the Step 5 partial; the frontend solver was explicitly deleted by `finish-frontend-solver-refactor.md` item 6.

## Session Notes
* [Friday Resume](friday-resume.md) - Point-in-time resume note. Its "Next action" is complete; its Deferred section remains accurate.
