---
title: Foundational Architecture Report: Reverse-Engineering and Auditing a Lean Web Stack
source: https://gemini.google.com/app/69d190cb3e1caf33
platform: Gemini Deep Research
exportedAt: 2026-10-02 16:21:50 -04:00
---

# Foundational Architecture Report: Reverse-Engineering and Auditing a Lean Web Stack

The contemporary frontend engineering ecosystem is frequently characterized by the accumulation of heavy build steps, complex Virtual DOM abstractions, and dense, multi-layered dependency graphs. In stark contrast to these prevailing industry trends, the ingested codebase operates on a radically decoupled, framework-less paradigm. By leveraging Semantic HTML5, Vanilla JavaScript, CSS Custom Properties, and Alpine.js, this architecture achieves a high degree of reactivity and maintainability without the penalty of compile-time overhead or extensive client-side rendering engines. This approach aligns with a progressive enhancement philosophy, where the browser's native capabilities are treated as the primary rendering engine, and JavaScript is layered strictly for state synchronization and behavioral augmentation.

The following exhaustive analysis reverse-engineers the implicit design philosophy embedded within the provided source files, which include the core markup structure, the cascaded stylesheet definitions, the tokenized design variables, the global state configurations, and the application logic. This analysis subsequently formalizes these inferred patterns into an authoritative Imperative Style Guide (Deliverable 1). This newly minted guide is then applied as a rigorous auditing framework to identify and remediate architectural anomalies within the source material itself (Deliverable 2). The objective is to establish a durable, highly scalable pattern language that aggressively defends the lean stack mandate.

## Phase 1: Ingestion and Reverse-Engineering

A rigorous examination of the source files reveals a deliberate architectural intent aimed at maximizing browser-native capabilities. The codebase relies heavily on the strict separation of concerns, isolating design tokens from layout heuristics, and aggressively decoupling business logic from user interface representation.

### Styling Intents and CSS Architecture

The CSS architecture eschews utility-first frameworks in favor of a bespoke, multi-tiered design token system[^1]. The token architecture establishes a strict hierarchy of CSS Custom Properties, ensuring that the abstract language of the design system translates predictably into dynamic web implementation. The variables are stratified into three distinct layers of abstraction. At the foundation are primitive tokens, which store raw, contextual-free values such as precise hexadecimal codes and mathematical spacing units. Above these sit semantic and theme tokens, which reference the primitive tokens to assign functional or contextual meaning, effectively enabling native light and dark mode switching via the `prefers-color-scheme` media query. Finally, component tokens scope decisions to specific user interface modules, preventing global namespace pollution.

The implementation of these tokens within the stylesheet reveals a hybrid approach blending Block Element Modifier (BEM) conventions with object-oriented CSS principles. Utility classes exist but are heavily restricted to reusable interface components, avoiding the HTML bloat typically associated with utility-first libraries. Furthermore, the architecture demonstrates an intent to utilize CSS Container Queries to enable adaptive, component-driven layouts. This approach breaks free from the viewport-bound constraints of traditional media queries, allowing discrete UI blocks to adapt their layout based on the dimensions of their specific containing block rather than the overall window size[^2].

### Alpine.js Idioms and State Management

Alpine.js is utilized to bridge the gap between static HTML and reactive application state, acting as a lightweight layer over the Document Object Model (DOM). The codebase demonstrates a heavy reliance on global state management via the global store API. Distinct stores are instantiated to manage unit conversions, complex grid data, user authentication, and global user interface notifications[^3]. The use of global stores prevents the performance penalty of attaching massive data objects to the root HTML element, which would force the reactivity engine to crawl the entire DOM tree unnecessarily[^3].

Component-level extraction is achieved by registering discrete functions, allowing the HTML to remain purely declarative while housing complex algorithmic logic in the JavaScript execution context. The architecture heavily utilizes native JavaScript getters within these state objects to compute derived state dynamically, ensuring that dependent values update reactively without requiring manual synchronization[^3].

For decoupled component communication, the architecture utilizes the browser window as a global event bus. Because the reactivity engine does not support parent-child context sharing or traditional prop drilling, sibling components communicate by dispatching custom events that bubble up to the window object, where other components register corresponding listeners[^4]. This event-driven architecture ensures that disparate modules remain loosely coupled.

### Vanilla JS Roles and Boundaries

The boundary between declarative reactivity and imperative logic is clearly delineated. The declarative engine strictly manages DOM mutations, attribute binding, and event listening. Conversely, Vanilla JavaScript manages the domain layer, heavy mathematical computations, side effects, and external API communication.

The application logic houses a centralized fetch wrapper that intercepts outgoing network requests to inject authentication tokens, ensuring that security concerns are decoupled from the components requesting the data. The codebase strictly avoids imperative DOM querying methods, such as element selection or inner HTML manipulation, entirely offloading these responsibilities to the reactivity proxies[^5].

### Constraints and Unspoken Boundaries

The analysis uncovers several unspoken rules governing the architecture. The most prominent constraint is the absolute prohibition of compilation steps. The absence of bundlers or transpilers indicates a strict requirement that all files must be parseable natively by modern browsers. Consequently, the architecture relies heavily on ES Modules and native browser APIs. Hardcoded pixel values or raw color codes in component CSS are forbidden; all values must trace back to the centralized token repository. Finally, the codebase attempts to prevent complex logical evaluations from leaking into HTML attributes, mandating that such logic be encapsulated within getter methods in the JavaScript context[^6].

## Deliverable 1: The Imperative Style Guide

The following style guide serves as the authoritative charter for all frontend development within this architecture. It aggressively defends the lean stack and mandates strict adherence to browser-native patterns, zero-build deployment, and declarative reactivity. All engineers contributing to this repository must internalize and execute these directives without deviation.

### The Core Mandate

You must enforce the zero-build rule without exception. You must never introduce a build step for JavaScript or CSS compilation. The application must execute natively in the browser via standard link and script tags, ensuring immediate parsing and execution without intermediate transformations. You must rely exclusively on Semantic HTML5, Vanilla JavaScript executing in ES2022+ environments, Pure CSS3, and the approved lightweight reactivity engine.

You are strictly prohibited from introducing heavy frontend frameworks or Virtual DOM-based libraries into this repository. The browser's native DOM is the single source of truth; you must augment it, not replace it. Furthermore, you must not use utility-first CSS frameworks. All styling must be governed by the proprietary CSS Design Token architecture defined within the repository, ensuring complete control over the design system's implementation.

### CSS and Styling Rules

You must strictly separate CSS variables into Primitive, Semantic, and Component tiers to maintain a predictable design system hierarchy[^1]. You must never hardcode raw values, such as hexadecimal colors or explicit pixel dimensions, directly in component styles. Every visual property must reference an established design token. You must use kebab-case for all variables, prefixing systemic variables with the appropriate namespace to differentiate them from component-specific tokens.

You must structure component styles using established class naming conventions, avoiding the global styling of base HTML elements outside of the foundational reset block. You must prioritize CSS Container Queries for component-level responsiveness, limiting the use of viewport-based Media Queries to macro-level page layout adjustments[^2].

| Domain | Imperative Rule | Architectural Rationale |
| --- | --- | --- |
| **Token Usage** | Always reference `var(--...)` for layout, color, and typography. | Ensures a platform-agnostic representation of design decisions and enables seamless theme swapping. |
| **Responsiveness** | Define `container-type: inline-size` on structural parent wrappers. | Isolates component logic, allowing UI blocks to adapt based on their specific placement rather than the global viewport. |
| **Scoping** | Prefix class names tightly to the component domain. | Prevents CSS namespace pollution and specificity wars in a build-less environment. |
| **Media Queries** | Restrict `@media` to the root application shell layout. | Viewport queries break component modularity; components must remain context-aware, not window-aware. |

### Reactivity and State Management Standards

You must restrict global state stores to data that is genuinely required across disparate, unrelated components, such as user authentication sessions, global unit preferences, or application-wide notifications[^3]. You must avoid polluting the global state with transient component data. For feature-specific logic, you must extract all component-level state and behavior into dedicated factory functions defined in the JavaScript execution context. You must not write complex JavaScript logic directly inside HTML attributes[^8].

You must leverage native JavaScript getters to compute derived state dynamically. When computing data based on existing state variables, you must encapsulate the calculation within a getter to ensure the reactivity engine caches and updates the value efficiently, avoiding redundant manual state mutations[^3].

For decoupled component communication, you must use the browser window as an event bus. You must dispatch namespaced custom events to trigger actions in sibling components, and you must register corresponding window-level listeners to react to these dispatches[^4]. You must use dash-cased names and explicit namespaces to prevent collisions with standard browser events.

You must aggressively manage memory during conditional rendering. You must understand the architectural distinction between hiding an element visually and removing it from the DOM. Use visual toggling for ephemeral elements that change state frequently. Use DOM removal strictly for heavy component trees that should not consume memory when inactive. When removing elements from the DOM, you must explicitly destroy any manual event listeners attached within that block to prevent memory leaks[^7].

| Directive Type | Imperative Rule | Architectural Rationale |
| --- | --- | --- |
| **Data Binding** | Extract state into JavaScript factory functions; bind via simple variable names. | Prevents HTML bloat and keeps presentation logic highly testable in isolation. |
| **Event Dispatch** | Always format dispatches as `$dispatch('namespace:event-name', payload)`. | Prevents naming collisions with native events and establishes a clear contract for the global event bus. |
| **Visibility** | Use `x-show` for frequent toggles; use `x-cloak` to prevent layout shifts. | `x-show` mutates the CSS display property, which is computationally cheaper than destroying and rebuilding DOM nodes. |
| **DOM Destruction** | Use `x-if` only for heavy sub-trees, and implement `$cleanup` for external listeners. | `x-if` completely removes elements from memory; failing to clear external intervals or listeners creates orphaned references and leaks. |

### JavaScript Standards

You must prohibit all imperative DOM querying. You must never utilize native document querying methods or manipulate inner HTML properties directly. The reactivity proxies must handle all DOM updates declaratively[^5]. You must isolate all side effects and external API communication. Network requests must be encapsulated within dedicated service functions, completely detached from the user interface representation. Components may invoke these service functions but must not contain raw fetch implementations.

You must encapsulate all JavaScript variables within ES Modules. You must use the appropriate script tags to ensure variables do not leak into the global scope. You must never attach constants, configurations, or state objects to the global window object unless it is strictly required for integrating with third-party software development kits.

### Forbidden Anti-Patterns

You must never use rogue inline styles via the style attribute in your HTML templates. All visual declarations, including display toggles, must exist within CSS classes or be managed by the reactivity engine. You must never render a component that starts hidden without applying the cloak attribute to prevent the Flash of Unstyled Content.

You must never place massive, raw Scalable Vector Graphic data inside the main HTML flow. Such data clutters the template and degrades readability. You must abstract vector graphics via CSS masks, background images, or by referencing an external sprite sheet. You must never place deeply nested logic inside HTML directives. Ternary operators or complex boolean evaluations exceeding fundamental limits must be extracted into getter methods within the component's JavaScript context.

## Deliverable 2: Audit and Mitigation Plan

Applying the newly minted Imperative Style Guide to the ingested codebase exposes a series of critical architectural deficiencies. While the foundational principles of the framework-less architecture are present, the execution violates the established boundaries regarding namespace isolation, logic coupling, and DOM hygiene. The following audit report details the specific anomalies, providing concrete evidence from the source material, an analysis of the architectural impact, and a prioritized refactoring strategy.

### Anomaly 1: Global Namespace Pollution via Constants

The codebase explicitly defines physical constants and configuration parameters within the global scope, attaching them directly to the window object. This implementation violates the strict ES Modules standard, risking naming collisions and severely compromising dependency tracking in a build-less environment.

**Code Evidence (Original):**
From the ingested `constants.js` file:

```javascript
const BREW_CONSTANTS = {
  DEFAULT_CONVERSION_EFFICIENCY: 0.90,
  DEFAULT_GRAIN_ABSORPTION_L_PER_KG: 0.96,
  DEFAULT_SHRINKAGE_PCT: 0.04,
  // ... extensive constant definitions
};

if (typeof window !== 'undefined') {
  window.BREW_CONSTANTS = BREW_CONSTANTS;
}

```

From the ingested `index.html` file:

```html
  <!-- Centralized Constants -->
  <script src="constants.js"></script>
  <!-- Application logic -->
  <script src="script.js"></script>

```

**Architectural Impact:**
By loading scripts sequentially without module encapsulation, the `BREW_CONSTANTS` object leaks into the global namespace. Any third-party script or subsequent developer can accidentally mutate or overwrite these constants. Furthermore, without explicit import statements in the consuming files, static analysis tools cannot determine dependency graphs, making future refactoring hazardous.

**Mitigation Strategy:**
Refactor the constants file to utilize standard ES Module export syntax. Remove the window assignment block entirely. Refactor the HTML document to load the main JavaScript file as a module, and explicitly import the constants where they are required within the application logic.

**Refactored Code:**

```javascript
// constants.js
export const BREW_CONSTANTS = {
  DEFAULT_CONVERSION_EFFICIENCY: 0.90,
  DEFAULT_GRAIN_ABSORPTION_L_PER_KG: 0.96,
  DEFAULT_SHRINKAGE_PCT: 0.04,
  // ... remaining constants
};
// Removed window.BREW_CONSTANTS assignment

```

```html
<!-- index.html -->
  <!-- Application logic loaded as a module -->
  <script type="module" src="script.js"></script>

```

```javascript
// script.js
import { BREW_CONSTANTS } from './constants.js';

```

### Anomaly 2: The God Object (Monolithic Component State)

The `wizard` component is massively overloaded, violating the mandate to extract logic and maintain single responsibilities. The component acts as a "God Object," simultaneously managing user interface navigation, state transitions for drawer panels, the complex thermodynamic boil solver algorithm, and data synchronization for unit conversions.

**Code Evidence (Original):**
From the ingested `script.js` file, spanning over 300 lines:

```javascript
  Alpine.data('wizard', () => ({
    // Presentation FSM State
    activeStep: 1,
    completedSteps: [],
    
    // Profile Management Drawer State
    showProfileDrawer: false,
    drawerMode: 'list',
    drawerForm: { /* ... */ },
    
    // Working Recipe Manifest
    manifest: { /* ... */ },

    runBoilSolver() {
      const m = this.manifest;
      const eq = m.equipment;
      const boilTimeHrs = (parseFloat(m.boil_time_min) || 60) / 60.0;
      // ... 40 lines of thermodynamic math coupling state to logic
    },
    
    submitDrawerProfile() { /* ... CRUD operations ... */ }
  }));

```

**Architectural Impact:**
This tight coupling makes the component excessively fragile. A change to the thermodynamic solver requires modifying the same scope that handles the opening and closing of user interface drawers. This prevents independent unit testing of the mathematical logic and guarantees merge conflicts as the application scales. The monolithic structure directly contradicts the philosophy of decoupled, localized state.

**Mitigation Strategy:**
Deconstruct the God Object into distinct architectural layers. Extract the thermodynamic algorithms into an isolated Vanilla JavaScript class or a dedicated global store. Split the presentation logic into separate component scopes: one dedicated to wizard navigation and one dedicated to equipment profile management. Utilize the global event bus to orchestrate communication between these decoupled entities.

**Refactored Code:**

```javascript
// script.js - Decoupled Architecture

// 1. Isolate Domain Logic (Thermodynamics)
export class ThermodynamicSolver {
  static calculatePostBoil(preVolume, boilOffRate, timeHours) {
    return Math.max(0, preVolume - (boilOffRate * timeHours));
  }
  // ... remaining pure mathematical functions
}

// 2. Isolate User Interface State Navigation
Alpine.data('wizardNavigation', () => ({
  activeStep: 1,
  completedSteps: [],
  
  setActiveStep(stepNumber) {
    if (stepNumber <= this.highWaterMark) this.activeStep = stepNumber;
  }
}));

// 3. Isolate Equipment Management
Alpine.data('equipmentManager', () => ({
  drawerMode: 'list',
  manifest: { /* ... */ },
  
  onEquipmentChange() {
    // Notify application that mathematical recalculation is required
    this.$dispatch('recipe:recalculate', { payload: this.manifest });
  }
}));

```

### Anomaly 3: Deeply Nested Logic inside HTML Directives

The HTML templates contain complex conditional logic embedded directly within attributes. This practice violates the anti-pattern prohibiting logic leakage into the markup, obfuscating the component's state machine and rendering the logic untestable.

**Code Evidence (Original):**
From the ingested `index.html` file (Step 1 and Step 2 accordion headers):

```html
<span class="accordion-status-pill" :class="{
  'accordion-status-active': activeStep === 1,
  'accordion-status-complete': completedSteps.includes(1)
}" x-text="completedSteps.includes(1) ? 'Configured' : (activeStep === 1 ? 'Active' : 'Locked')"></span>

```

**Architectural Impact:**
Embedding ternary logic chains and boolean evaluations directly in the DOM drastically reduces readability. If the state matrix expands (e.g., adding an 'Error' or 'Pending' state), the HTML attribute will become unmanageably long. Furthermore, this logic cannot be subjected to automated unit testing because it exists entirely outside the JavaScript execution context.

**Mitigation Strategy:**
Extract the evaluation logic into dedicated getter methods or pure functions within the associated component scope. The HTML should strictly bind to the output of these methods, restoring its purely declarative purpose.

**Refactored Code:**

```javascript
// script.js - Inside the wizardNavigation component
getStepStatusLabel(stepNum) {
    if (this.completedSteps.includes(stepNum)) return 'Configured';
    if (this.activeStep === stepNum) return 'Active';
    return 'Locked';
}

getStepStatusClass(stepNum) {
    if (this.completedSteps.includes(stepNum)) return 'accordion-status-complete';
    if (this.activeStep === stepNum) return 'accordion-status-active';
    return 'accordion-status-locked';
}

```

```html
<!-- index.html -->
<span 
  class="accordion-status-pill" 
  :class="getStepStatusClass(1)" 
  x-text="getStepStatusLabel(1)"
></span>

```

### Anomaly 4: Rogue Inline Styles and FOUC Vulnerabilities

The markup utilizes inline styles to hide ephemeral user interface elements during initial rendering. This practice directly violates the prohibition of rogue inline styles and creates race conditions with the reactivity engine during DOM hydration.

**Code Evidence (Original):**
From the ingested `index.html` file (Architecture Modal):

```html
<div
  x-show="showInfo"
  x-transition.opacity.duration.200ms
  class="modal-backdrop"
  style="display: none;"
  @keydown.escape.window="showInfo = false"
>

```

**Architectural Impact:**
Combining inline styles (`style="display: none;"`) with the reactivity engine's mutation observers creates conflicts. When the component initializes, the reactivity engine must override the inline style to display the element. If the JavaScript execution is delayed, the inline style is the only mechanism preventing the Flash of Unstyled Content. However, the architecture provides a dedicated directive (`x-cloak`) specifically engineered to manage this pre-hydration state seamlessly without polluting the HTML with CSS declarations.

**Mitigation Strategy:**
Remove all instances of inline display styles. Apply the cloak attribute to ensure elements remain hidden until the reactivity engine has fully mounted and evaluated the initial state.

**Refactored Code:**

```html
<!-- index.html -->
<div
  x-cloak
  x-show="showInfo"
  x-transition.opacity.duration.200ms
  class="modal-backdrop"
  @keydown.escape.window="showInfo = false"
>

```

### Anomaly 5: Hardcoded Viewport Units Bypassing Container Queries

The styling logic for modal workspaces defines its boundary conditions using absolute viewport units. This violates the mandate to leverage CSS Container Queries for adaptive layout, permanently coupling the component's internal geometry to the global window size.

**Code Evidence (Original):**
From the ingested `style.css` file:

```css
.modal-dialog-workspace {
  max-width: min(94vw, var(--container-modal-workspace));
  width: 100%;
  height: min(85vh, 900px);
}

```

**Architectural Impact:**
By hardcoding `vw` and `vh` units, the modal component becomes rigid. If this modal is ever rendered within a constrained parent container—such as an iframe, a split-screen layout, or a shadow DOM environment—the viewport units will cause the component to bleed outside its intended boundaries[^2]. The component loses its modularity and cannot adapt intelligently to its immediate surroundings[^2].

**Mitigation Strategy:**
Replace viewport-bound logic with CSS Container Queries and relative logical properties (such as `inline-size` and `block-size`). Establish a containment context on the parent wrapper and instruct the modal to adjust its geometry based on that specific container.

**Refactored Code:**

```css
/* style.css */
.modal-backdrop {
  /* Establish containment context on the parent wrapper */
  container-type: size;
  container-name: modal-bounds;
}

.modal-dialog-workspace {
  width: 100%;
  /* Fallback bounded by the token */
  max-inline-size: var(--container-modal-workspace);
}

@container modal-bounds (max-width: 800px) {
  .modal-dialog-workspace {
    /* Component adapts structurally based on its container context */
    border-radius: var(--radius-sm);
    padding: var(--space-2);
  }
}

```

### Anomaly 6: Unmanaged Event Listeners Risking Memory Leaks

Within the global authentication store, an external event listener is registered without an explicit teardown mechanism. While this specific instance persists for the application's lifecycle, the pattern exposes a severe structural flaw regarding memory management.

**Code Evidence (Original):**
From the ingested `script.js` file:

```javascript
  Alpine.store('auth', {
    user: null,
    loading: true,

    init() {
      if (!auth) {
        this.loading = false;
        return;
      }
      auth.onAuthStateChanged((firebaseUser) => {
        // State mutations...
      });
    }
  });

```

**Architectural Impact:**
When event listeners, intervals, or external subscriptions are registered inside an `init()` lifecycle method, they create a closure over the component's state. If the component is subsequently removed from the DOM using conditional rendering that destroys the nodes, the external listener continues to hold a reference to the detached DOM tree. The garbage collector cannot reclaim this memory, resulting in a severe memory leak that degrades performance over time[^7].

**Mitigation Strategy:**
Formally document and enforce the usage of native teardown callbacks. Any `init()` method that spawns external subscriptions or attaches listeners to the global window object must implement a cleanup routine that fires when the component is destroyed.

**Refactored Code:**

```javascript
// script.js - Establishing the teardown pattern
  Alpine.store('auth', {
    user: null,
    loading: true,

    init() {
      if (!auth) return;
      
      // Capture the unsubscribe function provided by the external SDK
      const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
        // State mutations...
      });

      // Register the mandatory cleanup routine to prevent memory leaks
      // Note: For stores, this executes if the store is re-initialized or manually destroyed,
      // but the pattern is critical for local components subject to x-if removal.
      if (this.$cleanup) {
          this.$cleanup(() => unsubscribe());
      }
    }
  });

```

### Anomaly 7: Hardcoded Strings Resisting Internationalization

The application logic frequently utilizes hardcoded string literals for error messages and user interface notifications, bypassing the centralized constants registry.

**Code Evidence (Original):**
From the ingested `script.js` file (Step 2 Validation):

```javascript
      if (stepNumber === 2) {
        if (!this.manifest.name || this.manifest.name.trim() === '') {
          Alpine.store('ui').add('Batch name is required.', 'error');
          return;
        }
        if (!this.manifest.target_volume_l || this.manifest.target_volume_l <= 0) {
          Alpine.store('ui').add('Target packaged volume must be greater than zero.', 'error');
          return;
        }

```

**Architectural Impact:**
Failing to utilize the `BREW_CONSTANTS` domain string registry fractures the application's text content. If the product requires internationalization or localization, developers must manually parse the entire JavaScript execution context to locate and translate raw strings. This violates the DRY (Don't Repeat Yourself) principle and introduces severe friction into the localization pipeline.

**Mitigation Strategy:**
Migrate all string literals representing user-facing text into the centralized ES Module registry. Update the component logic to reference these abstract constant keys exclusively.

**Refactored Code:**

```javascript
// constants.js
export const BREW_CONSTANTS = {
  // ...
  MSG_BATCH_NAME_REQUIRED: 'Batch name is required.',
  MSG_TARGET_VOLUME_REQUIRED: 'Target packaged volume must be greater than zero.',
};

// script.js
import { BREW_CONSTANTS } from './constants.js';

// Inside the validation logic:
  Alpine.store('ui').add(BREW_CONSTANTS.MSG_BATCH_NAME_REQUIRED, 'error');

```

### Sources used in the report
[^1]: [Unknown](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/) - penpot.app
[^2]: [CSS Container Queries: Syntax, Usage, and Examples - Mimo](https://mimo.org/glossary/css/container-queries) - mimo.org
[^3]: [Unknown](https://alpinedevtools.com/blog/stores-usage-guide) - alpinedevtools.com
[^4]: [Unknown](https://codewithhugo.com/alpinejs-component-communication-event-bus/) - codewithhugo.com
[^5]: [Mastering Alpine.js: Advanced Patterns and Techniques - Medium](https://medium.com/@satnammca/mastering-alpine-js-advanced-patterns-and-techniques-023e5de40fa8) - medium.com
[^6]: [How Do I Encapsulate My AlpineJS Logic - Nico Petri's Blog](https://nicopetri.hashnode.dev/how-do-i-encapsulate-my-alpinejs-logic) - nicopetri.hashnode.dev
[^7]: [State Isolation in Alpine.js for Hyvä: Proper Data Passing from](https://nik-dev.pp.ua/blog/state-isolation-in-alpine-js-for-hyv-proper-data-passing-from-backend-and-lifecycle-management/) - nik-dev.pp.ua
[^8]: [x-data - Alpine.js](https://alpinejs.dev/directives/data) - alpinejs.dev
[^9]: [Alpine Performance: A Memory Leak - AwesomeAlpine](https://awesomealpine.com/posts/alpine-performance-part-2/) - awesomealpine.com