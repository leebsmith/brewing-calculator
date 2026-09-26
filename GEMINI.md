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
2. `app.service`: Business logic and orchestration.
3. `app.repositories`: Data access layer (Firestore).
4. `app.schemas`: Pydantic data transfer objects.
5. `app.database`: Firebase client initialization.

**Strict Import Rules (Tach Contracts):**
* `app.main` MAY ONLY import from `app.service`, `app.schemas`, `app.database`, and standard libraries/frameworks. It injects the db client into services.
* `app.service` MAY ONLY import from `app.repositories`, `app.schemas`, and standard libraries. It MUST NOT import from `app.database` or `firebase_admin`.
* `app.repositories` MAY ONLY import from `app.schemas`, `firebase_admin`, and standard libraries. It MUST NOT import from `app.main`, `app.service`, or `app.database`.
* `app.database` MAY ONLY import `firebase_admin` and standard libraries. It MUST NOT import internal modules.
* `app.schemas` MUST NOT import from ANY other internal module.

## 4. Local Emulation & Testing
* By default, the backend expects the Firebase Emulator Suite. Database connections should assume `FIRESTORE_EMULATOR_HOST` may be set in the environment. Do not suggest generating GCP service account keys for local dev.
* Unit tests must utilize FastAPI's `dependency_overrides` in `conftest.py` to mock the Firestore client, ensuring tests execute entirely offline.