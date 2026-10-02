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