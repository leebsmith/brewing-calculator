# Git Hooks & CSS Styling Governance

This repository enforces comprehensive static analysis, code quality, and styling governance through a CLI-native zero-build linting stack orchestrated by version-controlled Git hooks located in `scripts/hooks/`.

## Local Setup

Configure Git to read repository hooks from `scripts/hooks`:

```bash
git config core.hooksPath scripts/hooks
```

## Zero-Build Pre-Commit Linting Pipeline

The pre-commit hook automatically intercepts the Git commit lifecycle, inspecting staged files and executing a rigorous multi-stage static analysis pipeline:

1. **CSS Authorization Gate (`CSS_APPROVED=1`)**:
   - Staged modifications to `frontend/style.css` or `frontend/tokens.css` are gated by default to prevent unauthorized style drift.
   - To commit authorized design changes, invoke commit with:
     ```bash
     CSS_APPROVED=1 git commit -m "style: description of approved change"
     ```

2. **JavaScript & HTML Analysis (ESLint)**:
   - Executes ESLint (`eslint.config.mjs`) across staged JS and HTML files.
   - Enforces code quality, validates Alpine.js reactive directive constructs, and mathematically bans imperative DOM queries (`querySelector`, `getElementById`, `innerHTML`) via `no-restricted-syntax` AST rules to protect Alpine's reactivity model.

3. **Style Token Enforcement (Stylelint)**:
   - Executes Stylelint (`.stylelintrc.json`) across staged stylesheets.
   - Cross-references all custom property usages against `:root` definitions in `tokens.css` (`stylelint-value-no-unknown-custom-properties`) and enforces strict design token values (`stylelint-declaration-strict-value`).

4. **Dead Code Elimination (PurgeCSS)**:
   - Executes a programmatic PurgeCSS analysis script (`purgecss-linter.js`) to detect and report orphaned CSS selectors.
