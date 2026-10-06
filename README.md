# Full-Stack Monorepo: Vite Frontend + FastAPI Backend

This repository is a modern template for building applications with a bundled Vite frontend and a FastAPI Python backend, leveraging a monorepo structure for efficient development and management.

## Architecture Overview

This project embraces a decoupled, monorepo architecture for enhanced maintainability and scalability:

*   **Frontend:** Built with **Vite** as the development server and build tool, utilizing **npm** (or `pnpm`/`yarn` workspaces) for package management. **Alpine.js** is integrated for reactive UI elements, and the **Firebase Web SDK v10** (modular) is used for client-side Firebase interactions.
*   **Backend:** Developed with **FastAPI**, a high-performance Python web framework. **`uv`** is employed for lightning-fast package and environment management. **`tach`** enforces strict module boundaries and architectural governance.
*   **Deployment & Infrastructure:**
    *   **Firebase Hosting:** Serves the static Vite frontend assets and provides a unified origin. It is configured to proxy API requests (`/api/**`) to the backend.
    *   **Google Cloud Run:** Hosts the containerized FastAPI backend service, enabling scalable, serverless execution.
*   **Local Development:** A streamlined workflow using Vite\'s dev server, FastAPI\'s `uvicorn`, and the Firebase Emulators suite, with `firebase.json` configured for local API proxying.

## Toolchain

*   **Frontend:**
    *   Build Tool: Vite
    *   Package Manager: npm (or pnpm/yarn workspaces)
    *   JavaScript Framework: Alpine.js
    *   Firebase Integration: Firebase Web SDK v10 (modular)
*   **Backend:**
    *   Framework: FastAPI (Python)
    *   Package/Environment Manager: `uv`
    *   Architecture Governance: `tach`
    *   Testing: `pytest`
*   **Infrastructure & Deployment:**
    *   Hosting: Firebase Hosting
    *   Backend Compute: Google Cloud Run
    *   Local Emulation: Firebase Emulator Suite

## Prerequisites

Before you begin, ensure you have the following installed globally on your system:

1.  **Node.js and npm:** Required for frontend development with Vite. (Install from [nodejs.org](https://nodejs.org/)).
2.  **Python 3.11+:** For the FastAPI backend. (Install from [python.org](https://www.python.org/)).
3.  **`uv`:** A fast Python package installer and virtual environment manager.
    ```bash
    curl -LsSf https://astral.sh/uv/install.sh | sh
    ```
4.  **Firebase CLI:** For deploying to Firebase Hosting and running local emulators.
    ```bash
    npm install -g firebase-tools
    ```
5.  **Google Cloud CLI (gcloud):** For deploying the backend to Cloud Run.
    Follow instructions at: [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)

## Local Development Workflow

This setup requires running multiple services concurrently for a seamless development experience.

### 1. Initialize Project & Install Dependencies

Navigate to your project directory.

\`\`\`bash
# If cloning for the first time:
# git clone <repository_url>
# cd <repository_name>

# Install backend dependencies using uv
cd backend
uv sync --python-version 3.11 # Specify Python version if needed, or omit to use system default
# If you have a pyproject.toml and uv.lock, uv sync is sufficient.
# Otherwise, you might need uv install or uv add <packages> initially.

# Install frontend dependencies using npm (or pnpm/yarn)
cd ../frontend # Adjust path if frontend is in a different monorepo structure
npm install # or pnpm install or yarn install
\`\`\`

### 2. Start Services

**Recommended: All-in-One Orchestration (`Makefile`)**

Run all services concurrently using the Makefile:

\`\`\`bash
make local-dev
\`\`\`

This automatically starts Vite (`:5173`), Firebase Emulators (Auth `:9099`, Firestore `:8080`, Hosting `:5000`), and FastAPI (`:8000`) with `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` and `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` pre-configured.

**Alternative: Manual Multi-Terminal Workflow**

If running services in separate terminals:

**Terminal 1: Start Firebase Emulators**
From the repository root:
\`\`\`bash
firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data
\`\`\`

*   **Hosting UI:** \`http://localhost:5000\` (or \`4000\`)
*   **Auth Emulator:** \`http://localhost:9099\`
*   **Firestore Emulator:** \`http://localhost:8080\`

**Terminal 2: Start Backend API**
From the \`backend/\` directory (ensure emulator variables are set):
\`\`\`bash
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 uv run uvicorn app.main:app --reload --port 8000
\`\`\`

*   **API Docs (Swagger UI):** \`http://localhost:8000/docs\`

**Terminal 3: Start Frontend Dev Server**
From the \`frontend/\` directory:
\`\`\`bash
npm run dev
\`\`\`

*   **Frontend App:** Usually \`http://localhost:5173\` (Vite default)


### 3. Accessing the Application

Your frontend application will be served by Vite on its port. API requests from the frontend (e.g., to \`/api/users\`) will be intercepted by the Firebase Hosting emulator. Due to the \`firebase.json\` rewrite rules, these requests will be forwarded to your locally running FastAPI backend on \`http://localhost:8000\`.

---

## Frontend Architecture & Conventions

The frontend is managed as a Vite project within the monorepo.

*   **Structure:** (\`frontend/\`)
    *   \`index.html\`: Main entry point.
    *   \`vite.config.js\`: Vite configuration.
    *   \`package.json\`: npm package management.
    *   \`src/\`: Source files including components, stores, and utilities.
    *   \`dist/\`: Build output.
*   **Alpine.js Integration:** Alpine.js directives can be used directly in HTML templates. Ensure Alpine.js is imported and initialized in your main JavaScript entry point (e.g., \`src/main.js\`).
*   **Firebase SDK:** Use modular imports for Firebase services (e.g., \`import { getAuth } from \'firebase/auth\';\`).

---

## Backend Architecture & Tach Rules

The backend adheres to strict architectural boundaries enforced by `tach`.

*   **Structure:** (\`backend/app/\`)
    *   \`main.py\`: FastAPI entry point and router.
    *   \`auth/\`: Authentication and token verification.
    *   \`service/\`: Business logic.
    *   \`repositories/\`: Data access layer.
    *   \`schemas/\`: Pydantic data models.
    *   \`database/\`: Firebase client initialization.
*   **`uv` Management:** All Python dependencies are managed via \`pyproject.toml\` and \`uv.lock\`. Use \`uv sync\` to install/update dependencies and \`uv run <command>\` to execute Python scripts within the managed environment.
*   **Tach Contracts:** Strictly adhere to the import rules defined in \`backend/tach.toml\` to maintain module integrity.

---

## Deployment

### 1. Prepare for Deployment

*   **Firebase Project:** Ensure you have a Firebase project created and linked (\`firebase use <project-id>\`).
*   **Cloud Run Service:** Deploy your FastAPI backend to Google Cloud Run. This typically involves creating a \`Dockerfile\` and using \`gcloud run deploy\`.
*   **Firebase Hosting Configuration:** Update \`firebase.json\` to point API rewrites (\`/api/**\`) to your Cloud Run service ID and region.

### 2. Deploy Backend to Cloud Run

You can deploy directly using the Makefile from the project root:
```bash
make deploy-backend
```

Or manually run `gcloud` from the `backend/` directory:
```bash
# Build and deploy to Cloud Run
gcloud run deploy batch-brewing-calculator-backend --source . --region us-east4 --allow-unauthenticated
```
*Note: The `Dockerfile` in the `backend/` directory should be set up to serve the application using `uvicorn` on the port specified by the `PORT` environment variable.*

### 3. Deploy Frontend to Firebase Hosting

From the repository root:
\`\`\`bash
firebase deploy --only hosting
\`\`\`
Firebase Hosting will serve your Vite build artifacts and proxy API requests to your deployed Cloud Run service.

---

## Repository Structure & Hygiene

The monorepo is organized to separate frontend static assets, backend application code, and local workspace artifacts:

    .
    ├── backend/              # Python FastAPI service, tests, and configuration
    ├── frontend/             # Static HTML, CSS, and client-side JavaScript
    ├── emulator-data/        # Firebase emulator data persistence
    ├── firebase.json         # Firebase project configuration and emulator settings
    └── README.md             # Project documentation

*Note on Artifact Hygiene:* Transient build artifacts like \`__pycache__/\` directories and local debugging logs (\`firebase-debug.log\`, etc.) are generated during local execution. Ensure these are kept out of version control via your \`.gitignore\` configuration.

---

## Testing & Linting

*   **Backend:**
    *   **Boundary Linter:** Run \`cd backend && uv run tach check\`.
    *   **Test Suite:** Run \`cd backend && uv run pytest\`. Tests are designed to run offline by mocking dependencies.
*   **Frontend:** (If applicable, specify linting/formatting commands, e.g., \`npm run lint\` or \`prettier --check .\`)

---

## Authentication & Project Management FAQ

### I am getting "Error: An unexpected error has occurred" when running firebase commands.
This is often caused by a timeout during the Firebase CLI\'s automated telemetry ping. Disable usage tracking to fix this:
\`\`\`bash
# Disable usage tracking permanently
sed -i \'s/\"usage\": true/\"usage\": false/\' ~/.config/configstore/firebase-tools.json
\`\`\`

### How do I switch Firebase/GCloud accounts?
The CLI tools are separate. Use the following commands to manage accounts:

*   **Google Cloud (gcloud):**
    \`\`\`bash
    gcloud auth login                # Log in as a new user
    gcloud auth list                 # View all accounts
    gcloud config set account <email> # Switch active account
    \`\`\`

*   **Firebase CLI:**
    \`\`\`bash
    firebase login:add               # Authorize additional account
    firebase login:list              # List authorized accounts
    firebase login:use <email>       # Switch active account
    \`\`\`

### How do I ensure I\'m using the right project?
To list all projects you have access to, and set the default for your current directory:
\`\`\`bash
firebase projects:list
firebase use <project-id>
\`\`\`
Your current project is also stored in \`.firebaserc\`. Ensure the \`default\` key matches your target \`project-id\`.
