# Implementation Plan: Malt Entry Table & Hamilton Proportional Allocation Engine

## Objective
Implement the complete **Malt Entry Table UI & Proportional Allocation Engine** for Step 3 of the brewing calculator wizard, complying strictly with our three foundational ADRs (`adr-grain-bill-segregation.md`, `adr-parts-to-percentage-hamilton.md`, `adr-malt-entry-table.md`) and the master frontend UI requirements.

---

## Key Files & Context
* **`frontend/index.html`**: Markup for the collapsed wizard card, popped-out modal editor, main grid workspace, and contextual utility drawer.
* **`frontend/script.js`**: Alpine.js store/data component managing the draft store, Hamilton normalization algorithm, 2.0% trace floor validation, row mutation lifecycle, and slide-out drawer state machine.
* **`frontend/style.css` & `frontend/tokens.css`**: Modular Vanilla CSS styling for fixed-layout tables, validation status badges, color swatches, and slide-out drawer transitions.
* **`frontend/constants.js`**: Centralized constants and validation error strings.

---

## Phased Implementation Plan

### Phase 1: Alpine State Machine & Hamilton Allocation Engine (`frontend/script.js`)
* Implement draft store isolation (cloning committed grain bill on modal open).
* Implement the **Hamilton Largest Remainder normalization pipeline**:
  * Sum total parts.
  * Compute raw proportions (`(parts / total) * 1000`).
  * Floor scaled values and rank fractional remainders.
  * Distribute `+1` residual bumps using deterministic tie-breakers (largest raw part input, then array index).
  * Divide by 10 to yield exact 100.0% percentages.
* Implement row validation logic enforcing the **2.0% trace floor** (flagging rows $< 2.0\%$ for relocation to trace additions).
* Implement row mutation actions (Add, Clone & Edit, Remove with confirmation).

### Phase 2: UI Templates & Modal Workspace (`frontend/index.html`)
* **Collapsed Wizard Card:**
  * Summary read-only table.
  * Dynamic status validation badge (`100.0% Balanced` (Green), `Deficit` (Amber), `Surplus` (Red), `Unconfigured` (Gray)).
  * "Configure Malts" launch button.
* **Modal Editor Workspace:**
  * 2-zone spatial layout (Main Grid Workspace + Contextual Utility Drawer).
  * Fixed-layout table (`table-layout: fixed`) adhering to the 7-column budget (Name, Category, SRM, Potential, Parts, Malt %, Actions).
* **Contextual Utility Drawer:**
  * Search/Catalog browser mode and Row Inspector mode (`drawer_mode: null | 'search' | 'inspect'`).
  * Escape key listener to dismiss drawer without closing the modal.

### Phase 3: Modular CSS Styling (`frontend/style.css`)
* Styling rules for fixed-layout tables, validation badges, color swatches, trace-floor warnings (red styling, cross icon, helper text), and slide-out drawer transitions.

---

## Verification & Testing
1. Verify parts input instantly triggers Hamilton normalization, guaranteeing total percentages sum to exactly 100.0% with zero floating-point drift.
2. Verify row allocations $< 2.0\%$ correctly trigger trace-floor warnings and block downstream progression.
3. Verify modal state isolation (canceling discards draft edits; saving commits to master state).
4. Verify unit formatting responds correctly to global `$store.units` changes.
