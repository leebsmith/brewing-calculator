# Batch Brewing Calculator: Server & Emulator Initialization Guide

This guide describes how to run and test the full application stack locally, detailing the orchestrator workflow and the required startup environment variables.

---

## 1. Quick Start: Orchestrated Development (`make local-dev`)

The simplest and recommended method to run all services concurrently is using the project `Makefile`:

```bash
make local-dev
```

This target uses `concurrently` to launch three services simultaneously:

* **Vite Frontend Dev Server:** Runs on `http://localhost:5173`.
* **Firebase Emulator Suite:** Runs Auth (`127.0.0.1:9099`), Firestore (`127.0.0.1:8080`), and Hosting (`127.0.0.1:5000`).
* **FastAPI Backend:** Runs on `http://127.0.0.1:8000` via `uv run uvicorn`.

To cleanly terminate all running services and free allocated ports, run:

```bash
make clean
```

---

## 2. Startup Environment Variables

The backend relies on key environment variables to operate in local emulator mode rather than attempting to connect to production Google Cloud services.

### Environment Variable Matrix

| Variable | Local Value | Purpose |
| :--- | :--- | :--- |
| `FIREBASE_AUTH_EMULATOR_HOST` | `127.0.0.1:9099` | Instructs the `firebase_admin.auth` SDK to decode and verify JWT ID tokens against the local Auth Emulator instead of Google production servers. |
| `FIRESTORE_EMULATOR_HOST` | `127.0.0.1:8080` | Directs the `google-cloud-firestore` SDK to connect to the local Firestore database emulator. |
| `GOOGLE_CLOUD_PROJECT` | `batch-brewing-calculator` | Identifies the project ID for Firebase Admin SDK initialization when credentials are bypassed locally. |

### How Variables Are Applied

1. **Makefile Orchestration:**
   The `local-dev` target explicitly injects `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST` into the backend process:
   ```bash
   cd backend && FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 uv run uvicorn app.main:app --reload --port 8000
   ```

2. **Backend Lifespan In-Process Fallback (`app.database.init_firebase`):**
   If the backend is launched directly without environment flags (e.g. `uv run uvicorn app.main:app --reload --port 8000`), the application lifespan invokes `init_firebase()`, which applies `os.environ.setdefault()` for both `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST` before any request is handled.

---

## 3. Manual Multi-Terminal Workflow

If you prefer running services in separate terminal tabs instead of `make local-dev`:

### Terminal 1: Firebase Emulators
From the repository root:

```bash
npx firebase emulators:start
```

* **Auth Emulator:** `http://127.0.0.1:9099`
* **Firestore Emulator:** `http://127.0.0.1:8080`
* **Hosting Emulator:** `http://127.0.0.1:5000`
* **Emulator UI:** `http://127.0.0.1:4000`

### Terminal 2: FastAPI Backend
From the `backend/` directory, provide the emulator variables:

```bash
cd backend
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 uv run uvicorn app.main:app --reload --port 8000
```

* **API Docs (Swagger UI):** `http://127.0.0.1:8000/docs`

### Terminal 3: Frontend Dev Server
From the `frontend/` directory:

```bash
cd frontend
npm run dev
```

* **Frontend Application:** `http://localhost:5173`
