Combining Vanilla CSS with Alpine.js creates the optimal architecture for a data-dense wizard. It provides a strict separation of concerns: Alpine manages the Finite State Machine (FSM) logic and DOM reactivity, while CSS handles the visual design system, theming, and hardware-accelerated animations.

Here is the architectural strategy for integrating color, typography, and state management using this stack.

## 1. The FSM State Engine (Alpine.js + CSS Classes)

Alpine is perfectly suited to manage the DAG/Sequential workflow of the wizard, but it shouldn't be used to apply direct inline styles. Instead, Alpine computes the state and applies semantic CSS classes, allowing your stylesheet to drive the visual feedback.

* **State Tracking (`x-data`):** Your Alpine component maintains the FSM state, tracking the `activeStep`, an array of `completedSteps`, and any validation flags.
* **Semantic Class Binding (`:class`):** You bind the Alpine state directly to the accordion wrapper using semantic class names. For example: `:class="{ 'is-active': activeStep === 2, 'is-locked': !completedSteps.includes(1) }"`.
* **The CSS Response:** Your CSS watches for these classes to apply the design system tokens. An `.is-locked` card automatically gets `opacity: 0.5` and `pointer-events: none`, while `.is-active` triggers your primary brand borders and elevation shadows.

## 2. Color and Theming Strategy (CSS Custom Properties)

Because you are managing nested UI elements (a table inside an accordion inside a wizard), theming must be systemic. You define your color palette using CSS Custom Properties (variables) in the `:root` pseudo-class, avoiding hardcoded hex values in your components.

* **Semantic Tokens:** Map your colors to their UI purpose. Define variables like `--surface-default`, `--surface-elevated` (for the active accordion step), `--border-subtle` (for data table rows), and `--color-primary`.
* **Native Dark Mode:** Theming requires zero JavaScript. You simply use a `@media (prefers-color-scheme: dark)` query to redefine your `:root` variables. For example, `--surface-elevated` changes from pure white (`#ffffff`) in light mode to a mid-gray (`#1f2937`) in dark mode. The browser repaints the entire wizard instantly.
* **State-Driven Colors:** Tie your Alpine state classes to these tokens. When an accordion gets the `.is-active` class, CSS applies `border-left-color: var(--color-primary);`. When it gets `.is-error`, it applies `border-color: var(--color-destructive);`.

## 3. Typography Hierarchy

To keep the UI legible, the macro-hierarchy (the wizard instructions) must remain visually distinct from the micro-hierarchy (the nested data tables).

* **Fluid Macro Typography:** Use the CSS `clamp()` function for the accordion headers. A rule like `font-size: clamp(1.125rem, 2vw, 1.25rem);` ensures the step titles shrink elegantly on mobile devices without relying on JavaScript window listeners or complex media queries.
* **Micro Typography for Density:** For the nested tables, step the font size down to `0.875rem` and apply a muted text color variable (`var(--text-secondary)`).
* **Tabular Numerals:** Apply `font-variant-numeric: tabular-nums;` strictly to the table cells containing financial data, IDs, or dates. This forces proportional fonts to align their decimal points perfectly down the column, which is critical when Alpine dynamically sorts or filters the table rows.

## 4. Animation and Layout Integration

This stack removes the hardest parts of responsive table management and accordion animations by utilizing the strengths of both technologies.

* **Handling the Accordion Height (`x-collapse`):** CSS cannot easily animate to an unknown `auto` height when a table is dynamically populated. Alpine's `x-collapse` directive solves this completely. When Alpine changes the `activeStep`, `x-collapse` calculates the necessary DOM scroll height and transitions the container smoothly, while your CSS handles the cross-fading of colors and opacities.
* **Responsive Tables (Native CSS):** The horizontal scroll requirement is handled entirely by CSS. The table is wrapped in a container with `overflow-x: auto;`. To keep the user oriented, the first column of the table uses `position: sticky; left: 0; background-color: var(--surface-elevated);`.
* **Decoupled Sorting UI:** Because the table scrolls horizontally, sorting via column headers becomes problematic on mobile. You can use Alpine to render a `<select>` dropdown above the table containing the sortable columns. When the user changes the dropdown, Alpine reacts, sorts the internal data array, and natively updates the DOM—while the CSS sticky positioning ensures the layout never breaks.
