# Documentation

This directory contains technical documentation, system architecture overviews, developer guides, and operational references for the project.

## Documentation Currency Index

Every document in this directory is classified by how well it matches the
current codebase. **When in doubt, trust the code over the docs.** The
classification below is a guide to which documents are safe to rely on for
implementation work, and which are retained only for historical context.

| Status | Meaning |
| :--- | :--- |
| **Current** | Matches the code. Safe to rely on for implementation. |
| **Aspirational** | Specifies behavior that is designed but not yet implemented. Safe to build against; do not assume it reflects shipped code. |
| **Partially Stale** | Directionally correct, but has drifted from the code in specific, identifiable ways. Read with the noted caveats. |
| **Reference** | Rationale, principles, or decision records. Not a spec, and not subject to drift — these describe *why*, not *what*. |
| **Historical** | Describes an earlier design state that has been superseded. Retained for derivation rationale only. Do not use for implementation. |

### Current

| Document | Scope |
| :--- | :--- |
| [Calculator Domain Model & Architecture Specification](calculator-domain-model.md) | Backend schemas, mass-balance formulas, solver DTO contracts. §5.1–5.2 reconciled against `primitives.py` / `templates.py`. §5.3–5.5 describe not-yet-implemented schemas as target state. |
| [Understanding the Wizard State Machine](the_wizard_state_machine_guide.md) | `createWizardNavigation`, `createEquipmentManager`, the `wizard` orchestrator, `WIZARD_STEPS`, and the step roster. |
| [Vessel Loss Model](../plans/vessel-loss-model.md) | Canonical loss taxonomy. Matches `templates.py` and `ThermodynamicSolver` loss helpers. |
| [Malt Entry Table Implementation Plan](../plans/malt-entry-table-implementation.md) | Matches `$store.maltGrid` — Hamilton allocator, `MAX_MAJOR_MALTS`, `filteredCatalog`, drawer state machine. |
### Aspirational

Specifies behavior that is designed but not yet implemented. Safe to build
against; do not assume it reflects shipped code. The `ThermodynamicSolver`
currently implements only the boil-side thermodynamics (2-DOF solver, loss
helpers, packaged-volume bridge). The master batch-sparge equation, retention
kinetics, lauter efficiency, and 1D root-finding for grist mass are specified
here but not yet built.

| Document | Scope |
| :--- | :--- |
| [Batch Sparging Mathematics: Canonical Mass and Volume Balance](batch-math/unified-treatment.md) | Canonical batch-sparge math. Target spec for the unimplemented Step 6 Master Solver. |
| [Inputs and Outputs](batch-math/inputs-and-outputs.md) | Prerequisite inputs, physical constants, and constraint topology for the batch-sparge pipeline. |

### Partially Stale

| Document | Drift |
| :--- | :--- |
| [Master Frontend UI Requirements](../plans/master-frontend-ui-requirements.md) | §4.2 Step 1 lists `hlt_min_volume` (renamed to `hlt_coil_floor_l`) and single `mash_dead_space` / `kettle_dead_space` (now per-vessel loss pairs). §4.2 Step 2 describes an Option A/B toggle (now a generalized 6-pill 2-DOF solver; `setBoilSolverMode` survives only as a legacy shim). §7.1's `manifest` snippet omits `equipment`, `preboil_*` / `postboil_*`, `boil_solver_mode`, and `yeast_attenuation_pct`. §4's DAG diagram and §4.2's step headings disagree on whether Step 10 or Step 11 is "Dry Hops." |
| [Brewing Calculator Architecture & Design Specification](calculator_design_spec.md) | §5 lists Step 3 as "Grain Bill," Step 4 as "Late Additions," Step 9 as "Yeast Selection," Step 11 as "Dry Hops." The actual wizard has Step 3 = Yeast, Step 4 = Fermentables, Step 5 = Mash Profile. §2.1 says "Color (Lovibond/SRM)" — the schema uses `color_lovibond` only. |

### Reference

Rationale, principles, and decision records. These describe *why* the system
is built the way it is, not *what* it currently does. They do not drift with
the code and should not be treated as specs.

| Document | Scope |
| :--- | :--- |
| [ADR: Segregation of Major and Minor Grain Bill Components](adr-grain-bill-segregation.md) | Decision record for the two-tier grist architecture (proportional majors + absolute-mass traces). Implemented in `$store.maltGrid`. |
| [Design Requirements: Color Theming and Typography](design_requirements/color_theming_and_typography.md) | Rationale for the semantic token architecture, 60-30-10 rule, dark-mode elevation, and modular type scale. Realized in `tokens.css` / `style.css`. |
| [Design Requirements: General Accordion Principles](design_requirements/general_accordion_principles.md) | Rationale for accordion affordances, hit targets, expansion models, and a11y semantics. Realized in the step-card accordion. |

### Historical (Archived)

Retained for derivation rationale and audit trail. Superseded by the Current
documents above. All files in this tier have been moved to
[`docs/archive/`](archive/) to keep the active documentation directory
uncluttered.

| Document | Superseded By |
| :--- | :--- |
| [Foundational Architecture Report — Reverse Engineering and Audit](archive/Foundational-Architecture-Report-Reverse-Engineering-and-Aud.md) | `calculator-domain-model.md`, `vessel-loss-model.md` |
| [Master Batch Sparge Equation](archive/master_batch_sparge_eqn.md) | `batch-math/unified-treatment.md` |
| [Canonical Batch Sparge Equation](archive/canonical-batch-sparge-equation.md) | `batch-math/unified-treatment.md` |
| [Calculations Cascade](archive/calculations-cascade.md) | `batch-math/unified-treatment.md` §5 |
| [Optimal Constraint Topology](archive/optimal-constraint-topology.md) | `batch-math/unified-treatment.md` §3 |
| [Top-Down Recipe Formulation Workflow](archive/top-down-recipe-formulation-workflow.md) | `batch-math/unified-treatment.md` §5 |
| [Bi-Directional Hydration Spec](archive/bi-directional-hydration-spec.md) | `$store.units.hydrate` / `commit` / `sanitize` (binary-invariant redesign) |
| [Calculator Design Spec (PDF)](archive/calculator-design-spec.pdf) | `calculator_design_spec.md`, `calculator-domain-model.md` |
| [Good Enough Chemistry Calculator Spec (PDF)](archive/good-enough-chemistry-calculator-spec.pdf) | `calculator-domain-model.md` §4 |
| [SPA Wizard UI Design Plan](archive/SPA%20Wizard%20UI%20Design%20Plan%20-%20Google%20Docs.md) | `plans/master-frontend-ui-requirements.md` |

### Operational Guides

These are not architectural specs and are not subject to the currency
classification above. They document local development and tooling.

| Document | Scope |
| :--- | :--- |
| [Server & Emulator Initialization Guide](server-startup-gulde.md) | Local development orchestration via `make local-dev`; emulator environment variables (`FIREBASE_AUTH_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST`). |
| [Git Hooks & CSS Styling Governance](git_hooks_and_css_governance.md) | Version-controlled Git hooks (`scripts/hooks/`) and the two-stage pre-commit gate protecting `frontend/style.css`. |
| [Vite Inject Instructions](vite-inject-instructions.md) | Vite build-time HTML injection conventions. |

## Documentation Hierarchy & Precedence

When documents conflict, resolve in this order:

1. **The code.** `frontend/script.js`, `frontend/constants.js`, `backend/app/schemas/*.py`, and the test suite are the ultimate source of truth.
2. **Current documents** (above). These are maintained in lockstep with the code.
3. **Aspirational documents.** Safe to build against, but describe unimplemented behavior. Do not assume they reflect shipped code.
4. **Partially Stale documents.** Read with the noted caveats; prefer the code where they disagree.
5. **Reference documents.** Consult for rationale and decision history, not for current behavior.
6. **Historical documents** (in `docs/archive/`). Do not use for implementation. Consult only for derivation rationale.

Within the Current tier, the following precedence applies:

* **Authoritative Frontend Blueprint:** [Master Frontend UI Requirements](../plans/master-frontend-ui-requirements.md) is the primary, globally authoritative, and exhaustive single source of truth for all frontend UI/UX architecture, modular Vanilla CSS design tokens, Alpine.js reactive FSM state, and WCAG accessibility standards. *(Note: currently Partially Stale — see the drift column above.)*
* **Domain Engine Specification:** [Calculator Domain Model & Architecture Specification](calculator-domain-model.md) defines backend schemas, mass-balance formulas, and solver DTO contracts.
* **Vessel Loss Taxonomy:** [Vessel Loss Model](../plans/vessel-loss-model.md) defines the canonical loss taxonomy and its application points in the solver pipeline.
