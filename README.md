# Full-Stack Mono-Repo: FastAPI + Firebase (Cloud Run MWE)

A minimal working example and low-friction cloneable template for building applications with a static frontend and a Python backend.

This project enforces strict architectural boundaries using Tach and utilizes uv for lightning-fast dependency and environment management.

---

## Toolchain

* **Frontend:** Vanilla HTML/JS augmented with Alpine.js and HTMX, deployed via Firebase Hosting.
* **Backend:** Python 3.12+ with FastAPI, deployed via Google Cloud Run.
* **Authentication:** Firebase Authentication (Google SSO) using short-lived Bearer tokens.
* **Networking:** Hybrid Single-Origin Pattern via Firebase Hosting rewrites (`/api/**` to Cloud Run in production; dev CORS locally).
* **Environment Management:** uv (Replaces pip and venv).
* **Architecture Linting:** Tach (Enforces clean dependency injection and boundaries).
* **Local Dev:** Firebase Local Emulator Suite (Firestore, Auth, Hosting).

---

## Architecture

The backend follows a strict Clean Architecture dependency flow, enforced at the module level:
`main` (Router) → `auth` (Verification) / `service` (Business Logic) → `repositories` (Data Access) → `schemas` (Data Models)

* **No direct database access** in the service layer.
* **No external framework imports** in the repository or schema layers.
* **Authentication isolation:** Token verification is isolated in `app.auth` and injected via FastAPI dependencies in `app.main`.
* **Dependency Injection** passes verified user context and the database client from `main` downwards.
* **Boundary Rules:** Custom architecture constraints and module maps are defined locally in `backend/tach.toml`.

### Hybrid Networking Pattern
* **Production:** Firebase Hosting rewrites `/api/**` to Cloud Run (`api-backend`), providing a unified single-origin domain. CORS is eliminated and all client-side calls use clean relative paths (`/api/...`).
* **Local Development:** Frontend assets run on `http://127.0.0.1:5000` while FastAPI runs natively on `http://127.0.0.1:8000` with local dev CORS enabled.

---

## Prerequisites

1. Install uv:
    curl -LsSf https://astral.sh/uv/install.sh | sh

2. Install the Firebase CLI:
    npm install -g firebase-tools

3. Install the Google Cloud CLI (gcloud):
    Follow instructions at: https://cloud.google.com/sdk/docs/install

---

## Repository Structure & Hygiene

The mono-repo is organized to separate frontend static assets, backend application code, and local workspace artifacts:

    .
    ├── backend/              # Python FastAPI service, tests, and configuration
    ├── frontend/             # Static HTML, CSS, and client-side JavaScript
    ├── firebase.json         # Firebase project configuration and emulator settings
    └── README.md             # Project documentation

*Note on Artifact Hygiene:* Transient build artifacts like `__pycache__/` directories and local debugging logs (`firebase-debug.log`, `firestore-debug.log`, `ui-debug.log`) are generated during local execution. Ensure these are kept out of version control via your `.gitignore` configuration.

---

## Local Development

Local development relies on the Firebase Local Emulator Suite paired with the FastAPI backend. You do not need Google Cloud credentials to run this stack locally.

### 1. Start the Emulators (Terminal 1 - Repository Root)

From the root of the repository, start the Firestore, Auth, and Hosting emulators with data import and export persistence enabled:

    firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data

*Note:* On your initial run, the Firebase CLI will skip importing if `./emulator-data` does not yet exist. When you shut down the emulators with `Ctrl+C`, it will automatically export and populate the directory for subsequent sessions.

* **Frontend:** http://127.0.0.1:5000
* **Emulator UI Dashboard:** http://127.0.0.1:4000
* **Auth Emulator:** http://127.0.0.1:9099
* **Firestore Emulator:** http://127.0.0.1:8080

### 2. Start the Backend (Terminal 2 - Backend Directory)

Navigate to the backend directory and start FastAPI. The injected environment variables ensure the Firebase Admin SDK connects to the local emulators instead of production:

    cd backend
    FIRESTORE_EMULATOR_HOST="127.0.0.1:8080" FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099" uv run fastapi dev app/main.py

* **API Docs (Swagger UI):** http://127.0.0.1:8000/docs
* **Direct Backend API:** http://127.0.0.1:8000

---

## Testing & Linting

Because uv manages the virtual environment automatically, you can run tests and linting directly without manual activation. Always execute these commands from within the `backend/` directory.

**Run the Boundary Linter:**

    cd backend
    uv run tach check

**Run the Test Suite:**
The test suite utilizes dependency_overrides to mock the Firestore client, allowing tests to run entirely offline without the emulator:

    cd backend
    uv run pytest

---

## Project Creation & Live Deployment

To deploy this stack to the public internet, you must create a Firebase project, configure a database, and link the frontend and backend.

### 1. Project & Database Setup

1. Go to the Firebase Console and create a new project (Tip: You can toggle off Google Analytics during creation to bypass the analytics account requirement).
2. Upgrade the project to the "Blaze" (Pay-as-you-go) plan. Cloud Run requires a billing account.
3. In the left sidebar, click Firestore Database and click Create database (accept the default location and start in Production mode).

### 2. Authenticate & Link Local CLI

Authenticate your local tools and link them to your new Project ID:

    gcloud auth login
    firebase login

    gcloud config set project YOUR_PROJECT_ID
    firebase use YOUR_PROJECT_ID

### 3. Configure IAM Policies for Cloud Build

New Google Cloud projects do not automatically grant the default compute service account the necessary permissions to build containers from source. Run these commands to dynamically fetch your project number and grant the required Storage and Artifact Registry roles:

    PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

    gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
      --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
      --role="roles/storage.admin"

    gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
      --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
      --role="roles/artifactregistry.writer"

### 4. Deploy Backend (Google Cloud Run)

Google Cloud Run can build your Dockerfile directly from source and deploy it in one command. Run this from inside the `backend/` directory:

    cd backend
    gcloud run deploy api-backend --source . --region us-east4 --allow-unauthenticated

*Verification Note:* Visiting the root URL may display a `{"detail": "Not Found"}` JSON response. This is a standard FastAPI 404 error indicating no endpoint is explicitly defined for the root path (`/`). Append `/docs` to your new URL to view the interactive Swagger UI, which confirms your Python backend is successfully containerized, deployed, and serving traffic.

### 5. Deploy Frontend (Firebase Hosting)

With the hybrid networking configuration in `firebase.json`, Firebase Hosting rewrites `/api/**` requests to your deployed Cloud Run service automatically under your single hosting origin. No hardcoded backend URLs or CORS configurations are needed in production frontend code.

Deploy the static assets by running the following command from the repository root:


---

## Authentication & Project Management FAQ

### I am getting "Error: An unexpected error has occurred" when running firebase commands.
This is often caused by a timeout during the Firebase CLI's automated telemetry ping. Disable usage tracking to fix this:
```bash
# Disable usage tracking permanently
sed -i 's/"usage": true/"usage": false/' ~/.config/configstore/firebase-tools.json
```

### How do I switch Firebase/GCloud accounts?
The CLI tools are separate. Use the following commands to manage accounts:

* **Google Cloud (gcloud):**
  ```bash
  gcloud auth login                # Log in as a new user
  gcloud auth list                 # View all accounts
  gcloud config set account <email> # Switch active account
  ```

* **Firebase CLI:**
  ```bash
  firebase login:add               # Authorize additional account
  firebase login:list              # List authorized accounts
  firebase login:use <email>       # Switch active account
  ```

### How do I ensure I'm using the right project?
To list all projects you have access to, and set the default for your current directory:
```bash
firebase projects:list
firebase use <project-id>
```
Your current project is also stored in `.firebaserc`. Ensure the `default` key matches your target `project-id`.