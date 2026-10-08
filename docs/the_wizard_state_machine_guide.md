# Understanding the Wizard State Machine

This guide explains how the `@frontend/index.html` file and `@frontend/script.js` interact to track and manage the application's multi-step wizard state machine.

---

## 1. How `script.js` Tracks the State Machine Steps

The `"step-card"` elements in `frontend/index.html` are dynamically controlled by an Alpine.js component named `wizard`, whose state machine logic is defined in `frontend/script.js` via the `createWizardNavigation` function.

### Key Tracking Mechanisms:

1. **Alpine.js `wizard` Component**  
   The main container `div` holding all the step cards in `index.html` is initialized with `x-data="wizard"`, which manages the overall state.

2. **State Machine Logic (`createWizardNavigation`)**  
   * **`activeStep`**: Tracks the currently displayed step.
   * **`completedSteps`**: An array storing the numbers of successfully completed steps.
   * **`highWaterMark`**: Indicates the furthest step number reached, acting as a navigation gate.
   * **`setActiveStep(stepNumber)`**: Navigates to a specific step if permitted by the high-water mark or expansion mode.
   * **`markStepComplete(stepNumber)`**: Marks a step as complete, updates the high-water mark, and automatically advances to the next step.

3. **HTML Bindings**  
   * **Conditional Display (`x-show`)**: Each step body uses `x-show="activeStep === stepNumber"` to show only the active step.
   * **Dynamic Styling (`:class`)**: Applies CSS classes dynamically (e.g., `'is-active'`, `'is-completed'`) based on the active and completed states.
   * **User Interaction (`@click`)**: Triggers methods like `markStepComplete()` or `setActiveStep()` via buttons.

---

## 2. Where are the State Machine "Rules" Defined?

The "rules" for the state machine—including its states, transitions, and logic for managing `activeStep`, `completedSteps`, and `highWaterMark`—are defined inside the **`createWizardNavigation`** function located in **`frontend/script.js`**.

---

## 3. Features of the `createWizardNavigation` Function

`createWizardNavigation` is a factory function returning an object that governs user progression through structured steps.

### Breakdown of Features:

1. **State Management**  
   * `activeStep`, `completedSteps`, `highWaterMark`, `dirtySteps` (flags stale data), and `expansionMode` (`'exclusive'` vs. `'concurrent'`).
2. **Navigation Control**  
   * `setActiveStep(stepNumber)` and `markStepComplete(stepNumber)`.
3. **Status Indication**  
   * `getStepStatusLabel(stepNum)` and `getStepStatusClass(stepNum)` provide descriptive labels and CSS classes.
4. **Invalidation Mechanism**  
   * `invalidateDownstream(fromStepNumber)` manages step dependencies when earlier steps change.
5. **Mode Toggling**  
   * `toggleExpansionMode()` switches accordion expansion behavior.

---

## 3a. Current Step Roster

The wizard currently implements the following steps (as of the yeast step card addition):

| Step | Partial | Purpose |
| :--- | :--- | :--- |
| 1 | `step-equipment-profile.html` | Equipment Profile (vessel capacities, losses) |
| 2 | `step-batch-metadata.html` | Batch Metadata & Boil Solver (2-DOF pill selector) |
| 3 | `step-yeast-selection.html` | Yeast Selection (strain, attenuation, manufacturer filter) |
| 4 | `step-fermentables.html` | Fermentables (Two-Tier Grist + Hamilton allocator) |
| 5 | `step-mash-profile.html` | Mash Profile (temperature rests) |

Steps 6–12 (Master Solver, Water Chemistry, Hops, Fermentation Schedule, Dry Hops, Ledger) are specified in `plans/master-frontend-ui-requirements.md` §4 but not yet implemented as partials.

## 4. Modifying Steps: Adding or Reordering

### Adding a New Step
* **In `frontend/index.html`**:
  1. Add a new `div.step-card` with a unique step number.
  2. Update Alpine.js directives (`:class`, `x-show`, `@click`, `aria-controls`, and `id`).
* **In `frontend/script.js`**:
  1. Update the `manifest` object if new data fields are needed.
  2. Add step-specific validation inside `markStepComplete`.
  3. Update `invalidateDownstream` if downstream effects apply.

#### Worked Example: Step 3 (Yeast Selection)

The yeast step demonstrates the full pattern:

* **Manifest fields:** `manifest.yeast_id` and `manifest.yeast_attenuation_pct`.
* **Validation in `markStepComplete(3)`:** Rejects progression if `yeast_id` is null, or if `yeast_attenuation_pct` falls outside the selected strain's `low_attenuation` / `high_attenuation` bounds (surfacing `MSG_YEAST_REQUIRED` or `MSG_YEAST_ATTENUATION_RANGE` via `$store.ui.add`).
* **Catalog dependency:** Reads from `$store.catalog.yeasts`, populated by `fetchCatalog()` on auth state change.
* **Filtering getters:** `filteredYeasts` and `yeastManufacturers` are computed getters on the `wizard` component, not stored state.
* **Bounded rendering:** The table iterates `visibleYeasts` (a `slice(0, MAX_VISIBLE_YEASTS)` of `filteredYeasts`, capped at 25) rather than the full filtered set. The full count is surfaced via `yeastResultCount` and an `aria-live="polite"` counter above the table. This bounds both DOM node count and accordion panel height while preserving the filter/search discovery UX.

### Changing the Order of Existing Steps
* Requires comprehensive renumbering across **all** HTML directives (`x-data`, `:class`, `x-show`, `@click`) and JavaScript validation checks inside `frontend/script.js`.
* **Important Considerations**: Consistency is critical; test thoroughly to prevent broken flows.

---

## 5. Advanced Mechanics and Architecture

1. **Decoupled Architecture & Factory Pattern**  
   `createWizardNavigation` is a reusable factory, keeping core navigation logic decoupled from Alpine.js and the DOM.
2. **Centralized Data (`manifest`)**  
   All recipe-related configuration data is held in a single reactive `manifest` object within the wizard component.
3. **Event-Driven Recalculations**  
   Custom events like `recipe:recalculate` and `wizard:invalidate` trigger background calculations (e.g., via `ThermodynamicSolver`) when data changes.
4. **Integration with Global Stores**  
   Interacts with `$store.units`, `$store.equipment`, and `$store.auth` for unit conversion, equipment profiles, and authentication gating.
5. **Validation and Safety**  
   The `markStepComplete` method enforces data validation before progression, rendering error alerts via `$store.ui.add` if checks fail.
