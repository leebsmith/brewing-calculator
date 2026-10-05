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

## 4. Modifying Steps: Adding or Reordering

### Adding a New Step
* **In `frontend/index.html`**:
  1. Add a new `div.step-card` with a unique step number.
  2. Update Alpine.js directives (`:class`, `x-show`, `@click`, `aria-controls`, and `id`).
* **In `frontend/script.js`**:
  1. Update the `manifest` object if new data fields are needed.
  2. Add step-specific validation inside `markStepComplete`.
  3. Update `invalidateDownstream` if downstream effects apply.

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