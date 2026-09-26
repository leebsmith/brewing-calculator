# Gemini Context & Assistant Guidelines

This project is a mono-repo containing a vanilla HTML/JS frontend and a FastAPI/Python backend, designed for Firebase Hosting and Google Cloud Run. Read and adhere to these rules before suggesting modifications.

## 1. Interaction Style & Code Generation
* When asked "how to achieve" a programming task or solve a problem, DO NOT automatically generate code.
* Take an interview approach. Theorize on the request, ask clarifying questions, and establish review checkpoints before writing the implementation.
* Only generate code when explicitly requested.

## 2. Toolchain & Environments
* Do not suggest commands using `pip`, `venv`, or `virtualenv`.
* This project exclusively uses `uv` for dependency and environment management.
* Always formulate commands as `uv run <command>`, `uv add <package>`, or `uv sync`.

## 3. Backend Architecture & Tach Rules
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

## 4. Hybrid Networking & CORS Rules
* **Production:** Firebase Hosting rewrites `/api/**` to Cloud Run, operating under a unified single origin (`https://<project>.web.app`). CORS is eliminated; all client requests must use relative paths (e.g., `/api/...`).
* **Local Development:** The frontend runs on the Hosting emulator (`http://127.0.0.1:5000`) and the backend runs natively (`http://127.0.0.1:8000`). FastAPI enables development-scoped `CORSMiddleware` for port 5000 origins.

## 5. Local Emulation & Testing
* By default, the backend expects the Firebase Emulator Suite. Connections should assume `FIRESTORE_EMULATOR_HOST` (e.g., `127.0.0.1:8080`) and `FIREBASE_AUTH_EMULATOR_HOST` (e.g., `127.0.0.1:9099`) may be set in the environment. Do not suggest generating GCP service account keys for local dev.
* Unit tests must utilize FastAPI's `dependency_overrides` in `conftest.py` to mock both the Firestore client (`get_db`) and authentication (`get_current_user`), ensuring tests execute entirely offline.

## 6. Documentation & Planning
* Centralized planning documents, design proposals, and task roadmaps reside in the `plans/` directory.
* General project documentation and operational guides reside in the `docs/` directory.