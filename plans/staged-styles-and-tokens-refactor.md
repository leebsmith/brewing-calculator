### Role & Objective
You are a senior frontend architect executing a synchronized, two-file refactoring across `tokens.css` and `style.css`[cite: 1, 2]. Your objective is to achieve clean semantic design-token separation, eliminate primitive token leaks, enforce upstream dark-mode theming, and optimize selector performance while guaranteeing 100% visual parity and zero changes to existing HTML markup or Alpine.js bindings[cite: 1, 2].

Execute the work sequentially across the three distinct stages below. Do not proceed to Stage 2 until Stage 1 is fully defined.

---

### Invariants & Non-Negotiable Constraints

* **Zero Markup Breaking Changes:** Do not rename, add, or delete any selectors, IDs, or element hooks referenced in HTML templates or Alpine.js directives (`x-data`, `x-cloak`, `x-show`, `:class`)[cite: 1].
* **File Separation:** Maintain `tokens.css` strictly for values (primitives, semantic aliases, and theme switching) and `style.css` strictly for visual structure and layout[cite: 1, 2].
* **No Preprocessors or Build Tooling:** Output strictly valid modern Vanilla CSS without Sass, PostCSS, or utility frameworks[cite: 1].

---

### Stage 1: Upstream Token Foundation (`tokens.css`)

Update `tokens.css` to define the necessary layout, filter, and semantic state tokens so downstream component styles never require ad-hoc overrides[cite: 2]:

1. **Sub-Scale Spacing & Dimensional Tokens:**
   Add the following variables to Section 2 (Spacing Scale) or Section 4 (Layout Dimensions):
   * `--space-0-25: 0.0625rem;` (1px, replaces hardcoded `0.1rem` dot margins)[cite: 1, 2]
   * `--space-unit-badge-x: 0.35rem;` (replaces hardcoded horizontal badge padding)[cite: 1]
   * `--size-indicator-sm: 1.75rem;` (standardizes `.user-avatar` and `.accordion-step-num`)[cite: 1]
   * `--width-ledger-label: 5.5rem;` (standardizes `.ledger-label`)[cite: 1]

2. **Standardized Backdrop Blur Filters:**
   Add to Section 8 (Transitions & Timing):
   * `--sys-backdrop-blur-subtle: blur(2px);` (scrims, slide-over backdrops)[cite: 1]
   * `--sys-backdrop-blur: blur(4px);` (primary modal backdrops)[cite: 1]

3. **Semantic Selection & Neutral Status Tokens (Light Mode - Section 9):**
   * `--sys-surface-selected: var(--color-indigo-50);`[cite: 1, 2]
   * `--sys-border-selected: var(--sys-color-action-primary);`[cite: 1, 2]
   * `--sys-color-neutral-surface: var(--color-slate-100);`[cite: 1, 2]
   * `--sys-color-neutral-border: var(--color-slate-200);`[cite: 2]
   * `--sys-color-neutral-text: var(--color-slate-500);`[cite: 2]

4. **Semantic Selection & Neutral Status Tokens (Dark Mode - Media Query):**
   Within `@media (prefers-color-scheme: dark) { :root { ... } }`, provide the dark equivalents[cite: 2]:
   * `--sys-surface-selected: var(--sys-color-action-subtle);`[cite: 1, 2]
   * `--sys-border-selected: var(--sys-color-action-primary);`[cite: 2]
   * `--sys-color-neutral-surface: rgba(148, 163, 184, 0.15);`[cite: 1]
   * `--sys-color-neutral-border: rgba(148, 163, 184, 0.25);`
   * `--sys-color-neutral-text: var(--color-slate-400);`[cite: 1, 2]

**Stage 1 Deliverable:** The modified `tokens.css` file[cite: 2].

---

### Stage 2: Component Refactoring & Token Binding (`style.css`)

Using the expanded token set from Stage 1, refactor `style.css` to eliminate token leaks and ad-hoc values[cite: 1]:

1. **Eliminate Primitive Token Escapes:**
   * Replace `var(--color-indigo-50)` on `.data-table tr.is-selected` and `.profile-card-item.is-selected` with `var(--sys-surface-selected)`[cite: 1].
   * Refactor `.accordion-status-*` badges:
     * `.accordion-status-active`: `background-color: var(--sys-color-action-subtle); color: var(--sys-color-action-subtle-text);`[cite: 1, 2]
     * `.accordion-status-complete`: `background-color: var(--sys-color-success-surface); color: var(--sys-color-success-text);`[cite: 1, 2]
     * `.accordion-status-locked`: `background-color: var(--sys-color-neutral-surface); color: var(--sys-color-neutral-text);`[cite: 1]
   * In Section 11, refactor `.badge-muted` to use `var(--sys-color-neutral-surface)`, `var(--sys-color-neutral-border)`, and `var(--sys-color-neutral-text)`[cite: 1].

2. **Normalize Dimension Literals & Blurs:**
   * On `.unit-badge`, replace `padding: 0.05rem 0.35rem` with `padding: var(--space-0-5) var(--space-unit-badge-x)`[cite: 1].
   * On `.unit-badge-customized::after`, replace `margin-left: 0.1rem` with `margin-left: var(--space-0-25)`[cite: 1].
   * On `.ledger-label`, replace `width: 5.5rem` with `width: var(--width-ledger-label)`[cite: 1].
   * Standardize `.user-avatar`, `.user-avatar-placeholder`, and `.accordion-step-num` to use `width: var(--size-indicator-sm); height: var(--size-indicator-sm);`[cite: 1].
   * Normalize backdrop filters: apply `var(--sys-backdrop-blur)` on `.modal-backdrop`, and `var(--sys-backdrop-blur-subtle)` on `.modal-drawer-scrim` and `.drawer-backdrop`[cite: 1].

3. **Scope Transitions (Eliminate `transition: all`):**
   * Change `transition: all var(--transition-fast)` on `.tri-state-pill`, `.unit-badge`, and `.segmented-control-item` to explicit transitions:
     `transition: background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);`[cite: 1]

4. **De-duplicate Chained Selectors:**
   * Simplify lines 582–588: Replace compound selectors (`.data-table th.text-right`, `.data-table td.align-right`, etc.) with clean utility classes (`.text-right`, `.align-right`)[cite: 1].

**Stage 2 Deliverable:** The refactored sections of `style.css`[cite: 1].

---

### Stage 3: Theming Inversion Removal & Final Audit

1. **Delete Section 20:**
   * Completely remove Section 20 (`/* 20. Theme Overrides: Dark Mode */`, lines 699–717) from `style.css`[cite: 1].
   * Confirm that `.data-table tr.is-selected`, `.profile-card-item.is-selected`, and all `.accordion-status-*` variants inherit dark styles automatically via `tokens.css` without requiring component-level media queries[cite: 1, 2].

2. **Final Parity Audit:**
   Verify:
   - [ ] Zero primitive colors (`--color-indigo-*`, `--color-emerald-*`, `--color-slate-*`) are referenced directly inside `style.css` (except within semantic fallbacks, if any)[cite: 1].
   - [ ] No raw `rgba(...)` declarations exist in `style.css`[cite: 1].
   - [ ] No `transition: all` declarations remain[cite: 1].
   - [ ] The full cascade and container-query behaviors remain functionally identical[cite: 1].

**Stage 3 Deliverable:** The final consolidated `style.css` file accompanied by an audit checklist confirming full visual parity[cite: 1].