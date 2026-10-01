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
* The frontend has no Node.js or `npm` build toolchain. Do not introduce `package.json`, `npm`, `npx`, or frontend bundlers.
* When running git commands in the agentic CLI, prepend GIT_PAGER=cat (e.g., GIT_PAGER=cat git diff or GIT_PAGER=cat git log -n 3) to stream output non-interactively without tripping flag-security filters or affecting your normal terminal pager settings.
* **No Combined Git Flags or File Path Arguments:** Never chain multiple git commands or flags together with `&&` or complex flag combinations (like `git diff --stat HEAD`), and avoid passing flag arguments to `git add` in shell calls to prevent false positive security warnings.

## 3. Frontend Architecture & Conventions
The frontend is a lightweight, zero-build static application hosted via Firebase Hosting. It pairs **Alpine.js** for reactive UI state with **modular Vanilla CSS** (`tokens.css` and `style.css`) for tokenized styling, native dark mode, and zero build tools.

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
  * **Perimeter Interactivity Gating:** Form containers must wrap inputs in native `<fieldset :disabled="!$store.<domain>.isReady || $store.<domain>.isSaving">` blocks.

