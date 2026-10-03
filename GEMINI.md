# Gemini Context & Assistant Guidelines

This project is a mono-repo containing vanilla JavaScript with Alpine.js and pure CSS static frontend and a FastAPI/Python backend, designed for Firebase Hosting and Google Cloud Run. Read and adhere to these rules before suggesting modifications.

## 1. Interaction Style & Code Generation

* When asked "how to achieve" a programming task or solve a problem, DO NOT automatically generate code.
* Take an interview approach. Theorize on the request, ask clarifying questions, and establish review checkpoints before writing the implementation.
* Only generate code when explicitly requested.

## 2. Toolchain & Environments

* Do not suggest commands using `pip`, `venv`, or `virtualenv`.
* This project exclusively uses `uv` for backend dependency and environment management.
* Always formulate backend commands as `uv run <command>`, `uv add <package>`, or `uv sync`.
* The frontend utilizes Node.js, npm/npx, and Vite for its build toolchain. Package management is handled by npm, and build scripts are defined in `package.json` and orchestrated via a Makefile.
* When running git commands in the agentic CLI, **prefer** prepending `GIT_PAGER=cat` (e.g., `GIT_PAGER=cat git diff` or `GIT_PAGER=cat git log -n 3`) to stream output non-interactively and safely.
* If `GIT_PAGER=cat` encounters environmental execution issues, use specific, non-paginating flags where available (e.g., `git diff --staged --no-ext-diff`) to achieve similar results.
* **For committing complex messages:** To avoid shell interpretation issues with multi-line strings and special characters, **always** use the pattern `printf "Your commit message..." | git commit -F - <files>`. This method safely pipes the message content to Git's standard input. Avoid direct `git commit -m "..."` when messages contain newlines or extensive special characters. **NEVER use command substitution (`$(...)` or backticks) to create temporary files for commit messages.**
* **No Combined Git Flags or File Path Arguments:** Never chain multiple git commands or flags together with `&&` or complex flag combinations (like `git diff --stat HEAD`), and avoid passing flag arguments to `git add` in shell calls to prevent false positive security warnings.

## 3. Frontend Architecture & Conventions

The frontend is a static application with a build process managed by Vite, hosted via Firebase Hosting. It pairs **Alpine.js** for reactive UI state with **modular CSS** (`tokens.css` and `style.css`) for tokenized styling, native dark mode, and a defined build toolchain.

**Key Conventions:**

* **Authoritative UI Blueprint:** All frontend templates, stylesheets, components, and state machines MUST strictly implement the patterns defined in `plans/master-frontend-ui-requirements.md`.
* **Async API Interactions & App State (`Alpine.data`):** Core application state, async `fetch` requests to the FastAPI backend, response handling, and error states belong in `frontend/script.js` encapsulated within `Alpine.data(...)` components.
* **Clean, Declarative Templates:** `frontend/index.html` stays focused on layout, structure, binding to component state via Alpine directives (`x-bind`, `x-on`, `x-model`, `x-text`).
* **Ephemeral DOM Toggles:** Presentation-only UI state (such as dropdown visibility, modal toggles, or expandable menus) may use lightweight inline `x-data="{ open: false }"` attributes directly in markup.
* **Headless Decoupling:** The frontend remains fully decoupled from the backend. The FastAPI service is a headless JSON API and must not return HTML partials or Jinja2 templates.

## 4. Backend Architecture & Tach Rules

The Python backend enforces strict module boundaries using `Tach`. You MUST respect these rules when generating or modifying Python code.

**The Module Hierarchy:**

1. `app.main`: The entry point and FastAPI router.
2. `app.auth`: Token verification and authentication dependencies.
3. `app.service`: Business logic and orchestration.
4. `app.repositories`: Data access layer (Firestore).
5. `app.schemas`: Pydantic data transfer objects.
6. `app.database`: Firebase client initialization.

**Strict Import Rules (Tach Contracts):**

* `app.main` MAY ONLY import from `app.auth`, `app.service`, `app.schemas`, `app.database`, and standard libraries/frameworks. It injects dependencies into route handlers.
* `app.auth` MAY ONLY import from `app.schemas`, `firebase_admin`, and standard/framework libraries. It MUST NOT import from `app.main`, `app.service`, `app.repositories`, or `app.database`.
* `app.service` MAY ONLY import from `app.repositories`, `app.schemas`, and standard libraries. It MUST NOT import from `app.auth`, `app.database`, or `firebase_admin`.
* `app.repositories` MAY ONLY import from `app.schemas`, `firebase_admin`, and standard libraries. It MUST NOT import from `app.main`, `app.auth`, `app.service`, or `app.database`.
* `app.database` MAY ONLY import `firebase_admin` and standard libraries. It MUST NOT import internal modules.
* `app.schemas` MUST NOT import from ANY other internal module.

## 5. Hybrid Networking & CORS Rules

* **Production:** Firebase Hosting rewrites `/api/**` to Cloud Run, operating under a unified single origin (`https://<project>.web.app`). CORS is eliminated; all client requests must use relative paths (e.g., `/api/...`).
* **Local Development:** The frontend runs on the Hosting emulator (`http://127.0.0.1:5000`) and the backend runs natively (`http://127.0.0.1:8000`). FastAPI enables development-scoped `CORSMiddleware` for port 5000 origins.

## 6. Local Emulation & Testing

* By default, the backend expects the Firebase Emulator Suite. Connections should assume `FIRESTORE_EMULATOR_HOST` (e.g., `127.0.0.1:8080`) and `FIREBASE_AUTH_EMULATOR_HOST` (e.g., `127.0.0.1:9099`) may be set in the environment. Do not suggest generating GCP service account keys for local dev.
* Unit tests must utilize FastAPI's `dependency_overrides` in `conftest.py` to mock both the Firestore client (`get_db`) and authentication (`get_current_user`), ensuring tests execute entirely offline.

## 7. Documentation & Planning

* Centralized planning documents, design proposals, and task roadmaps reside in the `plans/` directory.
* General project documentation and operational guides reside in the `docs/` directory.
* **Frontend UI Single Source of Truth:** `plans/master-frontend-ui-requirements.md` is the definitive, globally authoritative, and exhaustive single source of truth for the entire frontend UI/UX architecture, design token system, responsive table implementations, 12-step FSM sequence, unit normalization engine, and accessibility standards.

  * Historical foundational documents in `docs/` (such as `calculator-design-spec.pdf`, `SPA Wizard UI Design Plan - Google Docs.md`, and `docs/design_requirements/*`) are strictly supplemental background context.
  * Treat `plans/master-frontend-ui-requirements.md` as exhaustive. If an edge case or detail is unspecified or conflicts with older historical files, DO NOT assume the historical documentation overrides the master plan; stop and ask the user for clarification.
* **Documentation Synchronization Mandate:** Any code modifications that introduce, modify, or remove wizard steps, field names, domain parameters, or calculation formulas MUST be kept strictly in sync by updating `plans/master-frontend-ui-requirements.md` in the same work cycle.

## 8. Constants & Configuration Conventions

* **No Magic Numbers or Strings:** Hardcoded domain strings, error messages, and physical calculation defaults (e.g., default conversion efficiency, grain absorption, shrinkage) MUST be centralized in `backend/app/core/constants.py` and `frontend/constants.js`.
* **Profile-Specific Data Exception:** Equipment-specific profile capacities and vessel measurements (e.g., preset kettle volumes, mash tun sizes, HLT minimums for 30L/50L HERMS or BIAB) belong strictly in equipment profile seed/storage files (e.g., `equipment_profiles.json`), not in general constants.

## 9. Frontend Hydration & Persistence Architecture (Coordinator Pattern)

* **Mandatory Store Design:** All current and future Alpine.js stores (`Alpine.store(...)`) MUST implement the **Bi-directional Hydration Coordinator** pattern detailed in `docs/bi-directional-hydration-spec.md`.
* **Core Requirements:**

  * **Atomic State Commit:** Inbound data retrieval (`hydrate()`) must stage payloads out-of-band, sanitize them against declared schemas, and commit them in a single synchronous execution tick.
  * **Non-Destructive Failure:** Persistence or network errors must be caught safely (`error.message`), discarding invalid payloads without altering existing reactive state or locking out form interactions.
  * **Adapter Decoupling:** Persistence mechanisms (`localStorage`, REST endpoints, Firestore) must be encapsulated behind agnostic asynchronous provider and writer adapter functions.
  * **Perimeter Interactivity Gating:** Form containers must wrap inputs in native `<fieldset :disabled="!$store.<domain>.isReady \vert{}\vert{}$store.<domain>.isSaving">` blocks.

## 10. CSS Architecture & Styling Governance

* **STRICT PROHIBITION (Zero Tailwind/Utility Frameworks):** Do not use, reference, import, or assume Tailwind CSS or any utility framework. Never generate utility classes (`flex`, `grid`, `p-*`, `m-*`, `text-*`, `bg-*`, `items-*`, `justify-*`), arbitrary bracket syntax (`w-[100px]`), or directives (`@tailwind`, `@apply`, `@layer`). Assume zero build-time CSS processors exist.
* **Two-File Separation of Concerns:**

  * `frontend/tokens.css` manages **values and theming only**[cite: 6, 7]. It defines the multi-tiered token taxonomy (primitives -> semantic `--sys-*` roles -> layout dimensions) and handles all light/dark mode switching at the `:root` level.
  * `frontend/style.css` manages **structure and component rules**[cite: 5, 7]. It consumes semantic tokens without regard for color schemes.
* **Upstream Theming Invariance (No Dark-Mode in style.css):** `frontend/style.css` MUST NEVER contain `@media (prefers-color-scheme: dark)` blocks or theme-override selectors. All components must bind to semantic `--sys-*` tokens that adapt upstream inside `tokens.css`[cite: 5, 6].
* **Strict Semantic Tiering (No Primitive Escapes):** Selectors in `frontend/style.css` must exclusively consume semantic `--sys-*` tokens or generic scales (`--space-*`, `--radius-*`, `--text-*`)[cite: 5, 7]. Direct references to primitive palette tokens (`var(--color-indigo-*)`, `var(--color-slate-*)`, etc.) and raw color literals (hex, rgb, rgba, hsl) are strictly prohibited[cite: 5, 7].
* **Transition Performance (No transition: all):** Never declare `transition: all`. Always explicitly enumerate target properties (e.g., `transition: background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);`) to prevent layout and composite thrashing.
* **Spacing Scale Ordinal Purity:** Section 2 of `tokens.css` must remain strictly ordinal and generic (`--space-0` through `--space-12`). Component-specific widths, heights, and ad-hoc horizontal dimensions belong in Section 4 (Layout Dimensions & Sizing) under descriptive semantic names (e.g., `--size-indicator-sm`, `--width-parts-input`, `--space-unit-badge-x`).
* **Reuse-First Component Hierarchy:** Always favor existing classes in `style.css` (`.btn`, `.form-group`, `.card`, `.badge-*`, `.data-table`) over introducing new selectors[cite: 5, 7]. New classes require explicit justification, must use semantic BEM-style or functional names, and must be synchronized in `plans/master-frontend-ui-requirements.md`.
* **Token Audit Verification Gate:** Any suggested modifications to `frontend/style.css` or `frontend/tokens.css` MUST pass `scripts/audit-tokens.sh frontend/style.css` with zero violations.
