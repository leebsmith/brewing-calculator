# Documentation

This directory contains technical documentation, system architecture overviews, developer guides, and operational references for the project.

## Documentation Hierarchy & Precedence

* **Authoritative Frontend Blueprint:** [Master Frontend UI Requirements](../plans/master-frontend-ui-requirements.md) is the primary, globally authoritative, and exhaustive single source of truth for all frontend UI/UX architecture, modular Vanilla CSS design tokens, Alpine.js reactive FSM state, and WCAG accessibility standards.
* **Domain Engine Specification:** [Calculator Domain Model & Architecture Specification](calculator-domain-model.md) defines backend schemas, mass-balance formulas, and solver DTO contracts.
* **Server & Emulator Initialization Guide:** [Server & Emulator Initialization Guide](server-startup-gulde.md) documents local development orchestration via `make local-dev` and required emulator environment variables (`FIREBASE_AUTH_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST`).
* **Git Hooks & CSS Styling Governance:** [Git Hooks & CSS Styling Governance](git_hooks_and_css_governance.md) defines the version-controlled Git hooks (`scripts/hooks/`) and the two-stage pre-commit gate protecting `frontend/style.css`.

* **Supplemental Historical Documents:** The documents below (and the topical files in `design_requirements/`) are retained for historical context and technical derivation, but are superseded by the Master Requirements for all implementation tasks:
  * `calculator-design-spec.pdf` - Foundational architecture & 12-step sequence.
  * `SPA Wizard UI Design Plan - Google Docs.md` - Initial Compositor Wizard specification and research notes.
  * `good-enough-chemistry-calculator-spec.pdf` - Water chemistry equations and pH mitigation models.
  * `master-sugar-equation-for-batch-sparging.pdf` - Mass-balance sugar and runoff derivation.
  * `docs/design_requirements/` - Topical design notes (color, accordion principles, responsive tables).
