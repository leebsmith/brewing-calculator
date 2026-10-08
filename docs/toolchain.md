# Toolchain

External tools used by the project, grouped by concern.

## Frontend

- **Vite 5** — bundler + dev server (port 5173)
- **vite-plugin-html-inject** — resolves `<load src="...">` partials at build time
- **Alpine.js 3.14** + **@alpinejs/collapse** — reactive UI framework
- **Firebase Web SDK (compat) 10.13** — auth (loaded from CDN)
- **Node built-in test runner** (`node --test`) — frontend tests
- **ESLint 9** (flat config) + **@html-eslint** + **eslint-plugin-alpinejs** — linting
- **PurgeCSS 8** — orphaned CSS detection
- **concurrently** — dev process orchestration

## Backend

- **Python ≥ 3.12**
- **uv** — package manager + runner
- **FastAPI** (`[standard]` extras) — web framework
- **Uvicorn** — ASGI server
- **Pydantic v2** — validation
- **firebase-admin** — ID token verification
- **SciPy** (`brentq`) — root-finding for inverse fermentation solvers
- **pytest** + **httpx2** — testing
- **tach** — Python module boundary enforcement

## Infrastructure

- **Firebase Hosting** — static SPA + `/api/**` rewrites
- **Cloud Run** (`us-east4`) — backend compute
- **Firestore** — persistence
- **Firebase Auth** — identity provider
- **Firebase Emulator Suite** — local Auth (9099), Firestore (8080), Hosting (5000), UI (4000)
- **gcloud CLI** — Cloud Run deploys
- **Firebase CLI** — Hosting deploys + emulators
- **Git** — version control (with a pre-commit hook)

## Build / Deploy Orchestration

- **Make** — `local-dev`, `seeds`, `deploy`, `clean`, `destroy`
- **npm** — frontend package management
- **PEP 723** — inline script dependencies for `build_fermentables.py`
