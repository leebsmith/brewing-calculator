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
* Implement catalog drawer filtering pipeline:
  * Reactive state: `catalogSearchQuery: ''`, `selectedCategories: ['BASE', 'CRYSTAL', 'ROASTED', 'ACID']`.
  * Computed getter pipeline: excludes malts present in active grist (`draftMajorMalts`), filters by category union, and executes case-insensitive match on `name` and `notes`.
  * Reset lifecycle: `openSearchDrawer()` resets query string and restores all four categories to active.

### Phase 2: UI Templates & Modal Workspace (`frontend/index.html`)
* **Collapsed Wizard Card:**
  * Summary read-only table.
  * Dynamic status validation badge (`100.0% Balanced` (Green), `Deficit` (Amber), `Surplus` (Red), `Unconfigured` (Gray)).
  * "Configure Malts" launch button.
* **Modal Editor Workspace:**
  * 2-zone spatial layout (Main Grid Workspace + Contextual Utility Drawer).
  * Fixed-layout table (`table-layout: fixed`) adhering to the 7-column budget (Name, Category, SRM, Potential, Parts, Malt %, Actions).
* **Contextual Utility Drawer:**
  * **Search/Catalog Browser Mode:**
    * Full-width search input with inline clear action button (`✕`).
    * Category binary toggle pills (`BASE`, `CRYSTAL`, `ROASTED`, `ACID`) using `.filter-pill` and `aria-pressed`.
    * Dedicated live result counter (`aria-live="polite"`, e.g., `"Showing X available malts"`).
    * Filtered item card list with descriptive empty-state messaging.
  * **Row Inspector Mode:** Specialized physical and chemistry attribute editor for active row.
  * Escape key listener dedicated to dismissing the drawer without closing the parent modal.

### Phase 3: Modular CSS Styling (`frontend/style.css`)
* Styling rules for fixed-layout tables, validation badges, color swatches, trace-floor warnings (red styling, cross icon, helper text), and slide-out drawer transitions.
* New `.filter-pill` component styles with `.is-active` / `[aria-pressed="true"]` state variants, adhering strictly to design tokens and verified via `scripts/audit-tokens.sh`.

---

## Verification & Testing
1. Verify parts input instantly triggers Hamilton normalization, guaranteeing total percentages sum to exactly 100.0% with zero floating-point drift.
2. Verify row allocations $< 2.0\%$ correctly trigger trace-floor warnings and block downstream progression.
3. Verify modal state isolation (canceling discards draft edits; saving commits to master state).
4. Verify unit formatting responds correctly to global `$store.units` changes.
5. Verify catalog drawer search input filters across both malt `name` and sensory `notes` in real time, with the inline `✕` clearing the query.
6. Verify category toggle pills screen malts via additive OR logic, with all categories unselected producing an empty list and live counter updating accurately.
7. Verify catalog items already in `draftMajorMalts` are excluded from search results and re-enabled upon row deletion.
8. Verify pressing `Esc` dismisses the drawer while preserving parent modal state.
