Modern Vanilla CSS has evolved to the point where utility frameworks are no longer strictly necessary for complex, systematic designs. You can achieve all of your design objectives—theming, fluid typography, FSM state management, and responsive layouts—using pure CSS and Alpine.js.

Here is how the architecture shifts when you drop Tailwind.

## 1. CSS Custom Properties (Variables) Replace Theming Configuration

Instead of a `tailwind.config.js` file, your design system lives entirely inside the `:root` selector of your CSS.

By defining strict variables for your semantic colors and modular typography, you guarantee consistency across the wizard. Dark mode becomes trivial: you simply write a `@media (prefers-color-scheme: dark)` block that redefines those exact variables.

## 2. Semantic State Classes Replace Utility Strings

When using Tailwind, an active accordion header might have 10 utility classes applied dynamically by your FSM (e.g., `border-blue-500 ring-1 ring-blue-500 bg-white shadow`). This makes inspecting the DOM chaotic.

With Vanilla CSS, your FSM only needs to toggle a single semantic class: `.is-active`, `.is-locked`, or `.is-completed`.

* **The HTML:** `<div :class="{ 'is-active': activeStep === 2 }">`
* **The CSS:** `.step-card.is-active { border-left-color: var(--color-primary); box-shadow: var(--shadow-active); }`

This creates a clean separation of concerns: Alpine handles the state logic, and CSS handles the visual representation of that state.

## 3. Native Fluid Typography and Tabular Data

You can implement the micro and macro typography hierarchies natively. CSS's `clamp(minimum, preferred, maximum)` function handles responsive font scaling without needing breakpoint utilities. For your data tables, `font-variant-numeric: tabular-nums;` is a standard CSS property that works uniformly across all modern browsers.

## 4. The Alpine Synergy Remains

You do not have to give up Alpine's `x-collapse` plugin. It operates independently of your CSS framework. It reads the DOM node's `scrollHeight` and animates the `max-height` inline. Your staggered FSM animation loop remains exactly the same.

