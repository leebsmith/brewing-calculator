# Full-Stack Mono-Repo: FastAPI + Firebase (Cloud Run MWE)

A minimal working example and low-friction cloneable template for building applications with a static frontend and a Python backend.

This project enforces strict architectural boundaries using Tach and utilizes uv for lightning-fast dependency and environment management.

## Toolchain

* **Frontend:** Vanilla HTML/JS (ready for Alpine/HTMX), deployed via Firebase Hosting.
* **Backend:** Python 3.12+ with FastAPI, deployed via Google Cloud Run.
* **Environment Management:** uv (Replaces pip and venv).
* **Architecture Linting:** Tach (Enforces clean dependency injection and boundaries).
* **Local Dev:** Firebase Local Emulator Suite.

## 🏗️ Architecture

The backend follows a strict Clean Architecture dependency flow, enforced at the module level:
`main` (Router) → `service` (Business Logic) → `repositories` (Data Access) → `schemas` (Data Models)

* **No direct database access** in the service layer.
* **No external framework imports** in the repository or schema layers.
* **Dependency Injection** passes the database client from `main` downwards.

## ⚙️ Prerequisites

1. Install uv:
curl -LsSf [https://astral.sh/uv/install.sh](https://astral.sh/uv/install.sh?utm_source=gemini) | sh
2. Install the Firebase CLI:
npm install -g firebase-tools
3. Install the Google Cloud CLI (gcloud):
Follow instructions at: [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install?utm_source=gemini)

## 🚀 Local Development

Local development relies on the Firebase Local Emulator Suite. You do not need Google Cloud credentials to run this stack locally.

### 1. Start the Emulators (Terminal 1)

From the root of the repository, start the Firestore and Hosting emulators in demo mode:

```
firebase emulators:start

```

* **Emulator UI:** [http://127.0.0.1:4000](https://www.google.com/search?q=http://127.0.0.1:4000&utm_source=gemini)
* **Frontend:** [http://127.0.0.1:5000](http://127.0.0.1:5000?utm_source=gemini)

### 2. Start the Backend (Terminal 2)

Navigate to the backend directory and start FastAPI. The injected environment variable ensures the Firebase Admin SDK connects to the local emulator instead of production.

```
cd backend
FIRESTORE_EMULATOR_HOST="127.0.0.1:8080" uv run fastapi dev app/main.py

```

* **API Docs (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs?utm_source=gemini)

## 🧪 Testing & Linting

Because uv manages the virtual environment automatically, you can run tests and linting directly without manual activation.

**Run the Boundary Linter:**

```
cd backend
uv run tach check

```

**Run the Test Suite:**
The test suite utilizes `dependency_overrides` to mock the Firestore client, allowing tests to run entirely offline without the emulator.

```
cd backend
uv run pytest

```

## 🌍 Project Creation & Live Deployment

To deploy this stack to the public internet, you must create a Firebase project, configure a database, and link the frontend and backend.

### 1. Project & Database Setup

1. Go to the Firebase Console and create a new project. (Tip: You can toggle off Google Analytics during creation to bypass the analytics account requirement).
2. Upgrade the project to the "Blaze" (Pay-as-you-go) plan. Cloud Run requires a billing account.
3. In the left sidebar, click **Firestore Database** and click **Create database** (accept the default location and start in Production mode).

### 2. Authenticate & Link Local CLI

Authenticate your local tools and link them to your new Project ID:

```
gcloud auth login
firebase login

gcloud config set project YOUR_PROJECT_ID
firebase use YOUR_PROJECT_ID

```

### 3. Configure IAM Policies for Cloud Build

New Google Cloud projects do not automatically grant the default compute service account the necessary permissions to build containers from source. Run these commands to dynamically fetch your project number and grant the required Storage and Artifact Registry roles:

```
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

```

### 4. Deploy Backend (Google Cloud Run)

Google Cloud Run can build your `Dockerfile` directly from source and deploy it in one command.

```
cd backend
gcloud run deploy api-backend --source . --region us-east4 --allow-unauthenticated

```

*When this finishes, the terminal will output your live backend URL (e.g., `[https://api-backend-xyz.a.run.app](https://api-backend-xyz.a.run.app)`).*

### 5. Connect & Deploy Frontend (Firebase Hosting)

Before deploying the frontend, you must tell it where the live backend is.

1. Open `frontend/script.js`.
2. Change the `fetch()` URL from `[http://127.0.0.1:8000](http://127.0.0.1:8000)` to your new Cloud Run URL.
3. Deploy the frontend:
firebase deploy --only hosting

### 6. Deploy Backend (Google Cloud Run)
Google Cloud Run can build your `Dockerfile` directly from source and deploy it in one command.

    cd backend
    gcloud run deploy api-backend --source . --region us-east4 --allow-unauthenticated

*When this finishes, the terminal will output your live backend URL (e.g., `https://api-backend-xyz.a.run.app`).*

**Verification Note:** Visiting the root URL may display a `{"detail": "Not Found"}` JSON response. This is a standard FastAPI 404 error indicating no endpoint is explicitly defined for the root path (`/`). Append `/docs` to your new URL to view the interactive Swagger UI, which confirms your Python backend is successfully containerized, deployed, and serving traffic.

### 7. Connect & Deploy Frontend (Firebase Hosting)
Before deploying the frontend, you must tell it where the live backend is. 

1. Open your frontend JavaScript file (e.g., `frontend/script.js`).
2. Update the `fetch()` base URL from the local emulator (`http://127.0.0.1:8000`) to your new Cloud Run URL.
3. Deploy the static assets by running the following command from your terminal:

    firebase deploy --only hosting
