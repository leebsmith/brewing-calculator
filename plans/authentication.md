# Design & Implementation Plan: Google SSO & Hybrid Networking

## 1. Overview & Objective

This document defines the architectural blueprint and phased implementation plan for adding **Google Single Sign-On (SSO)** authentication and establishing a **Hybrid Networking Pattern** across the mono-repo.

* **Frontend:** Zero-build static architecture with **Alpine.js** (reactive state & global stores) and **Tailwind CSS** (Play CDN).
* **Backend:** **FastAPI** (Python 3.12+, managed with `uv`) operating as a strictly typed JSON API.
* **Authentication:** **Firebase Authentication (Google Provider)** issuing short-lived Firebase ID Tokens (Bearer JWTs).
* **Networking & Routing:** **Hybrid Pattern** — Firebase Hosting rewrites (`/api/**`) in production for zero-CORS single-origin requests, paired with a local development server on port 8000 with scoped CORS.
* **Architecture Enforcement:** Strict layered boundaries enforced via **Tach**.

---

## 2. Core Architectural Decisions

### 2.1 Google SSO via Firebase Auth Web SDK
* The client web application imports the Firebase Auth Web SDK via CDN.
* Sign-in is initiated via `signInWithPopup(auth, googleProvider)`.
* Firebase manages token lifecycles, local persistence in IndexedDB, and automatic background refreshing of the ID token before expiration.

### 2.2 Global State via `Alpine.store('auth')` & Centralized `apiFetch()`
* **Global Auth Store:** Authentication is inherently cross-cutting. An `Alpine.store('auth')` instance manages:
  * `user`: Decoded user profile (`uid`, `displayName`, `email`, `photoURL`) or `null`.
  * `loading`: Initializing status while Firebase checks existing session.
  * `signIn()` / `signOut()`: Actions callable anywhere across the DOM via `$store.auth.signIn()`.
* **Token Attachment via `apiFetch()` Helper:**
  * Instead of library-specific interceptors, a centralized `apiFetch(path, options)` utility in `frontend/script.js` wraps standard `fetch()`.
  * Calls `auth.currentUser?.getIdToken()` on-demand, ensuring Firebase automatically provides a refreshed token if the previous one expired.
  * Injects the authorization header:
    ```http
    Authorization: Bearer <firebase_id_token>
    ```
  * Resolves target URLs dynamically: `http://127.0.0.1:8000${path}` for local dev (Hosting emulator on `:5000`) and relative `${path}` (rewritten to Cloud Run via `/api/**`) in production.
  * Catches HTTP 401 responses centrally, providing a single hook to reset session state or notify the user.

### 2.3 Hybrid Networking & CORS Strategy
* **Production Environment:**
  * `firebase.json` defines a rewrite rule mapping `/api/**` to Cloud Run service `api-backend`.
  * The frontend and backend share an identical origin (`https://<project>.web.app`).
  * CORS is completely bypassed; browser preflight (`OPTIONS`) requests are eliminated.
  * All frontend API calls use relative paths (e.g., `/api/ping`).
* **Local Development Environment:**
  * Frontend assets are served by the Firebase Hosting emulator on `http://127.0.0.1:5000`.
  * Backend runs natively via `uv run fastapi dev app/main.py --port 8000` to preserve instant hot-reloading and clear terminal log output.
  * FastAPI registers `CORSMiddleware` restricted to local development origins (`http://127.0.0.1:5000` and `http://localhost:5000`).
  * In production, because requests arrive under the same origin, the CORS middleware remains dormant.

### 2.4 Module Boundaries & Tach Enforcement (`app.auth`)
To uphold Clean Architecture:
* Create a dedicated module: `app.auth`.
* **Allowed Dependencies in `tach.toml`:**
  * `app.auth` may depend ONLY on `app.schemas` and standard/external libraries (`firebase_admin.auth`, `fastapi`).
  * `app.auth` MUST NOT import from `app.service`, `app.repositories`, or `app.database`.
  * `app.main` may import from `app.auth`, `app.service`, `app.schemas`, and `app.database`.
  * `app.service` and `app.repositories` MUST NOT import from `app.auth`.

```
                  ┌──────────────┐
                  │   app.main   │
                  └──┬───┬────┬──┘
          ┌──────────┘   │    └──────────┐
          ▼              ▼               ▼
   ┌────────────┐ ┌─────────────┐ ┌─────────────┐
   │  app.auth  │ │ app.service │ │app.database │
   └──────┬─────┘ └──────┬──────┘ └─────────────┘
          │              ▼
          │       ┌──────────────┐
          │       │app.repositor.│
          │       └──────┬───────┘
          ▼              ▼
   ┌────────────────────────────┐
   │        app.schemas         │
   └────────────────────────────┘
```

### 2.5 Local Emulation & Testing
* **Auth Emulator:** Added to `firebase.json` on port 9099.
* **Environment Variable:** `FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"` directs `firebase_admin.auth` to validate tokens against the local emulator.
* **Offline Unit Tests:** In `backend/tests/conftest.py`, a `mock_current_user` fixture overrides the `get_current_user` dependency in `app.main`, allowing 100% offline, deterministic execution without running the Firebase Auth emulator.

### 2.6 Multi-Page Expansion & Client-Side Route Guard (`requireAuth`)
While starting as a single-page app (`index.html`), the architecture supports scaling to a multi-page static site (e.g. `dashboard.html`, `settings.html`) served from Firebase Hosting:
* **The Route Guard Lifecycle:**
  * When a protected static page is loaded, `$store.auth.loading` starts as `true`.
  * The page markup prevents flash of unauthenticated content (FOUC) using `x-cloak` and conditional visibility:
    ```html
    <body x-data x-init="$store.auth.requireAuth()" x-cloak x-show="!$store.auth.loading && $store.auth.user">
    ```
  * Once Firebase Auth inspects `IndexedDB` and fires `onAuthStateChanged`:
    * **Authenticated:** `$store.auth.loading` flips to `false` and protected content displays.
    * **Unauthenticated:** `$store.auth.requireAuth()` immediately executes `window.location.replace('/index.html')` to redirect visitors back to the home/login page.

---

## 3. Data Contracts & Interfaces

### 3.1 Domain Schemas (`app/schemas/models.py`)

```python
class AuthenticatedUser(BaseModel):
    uid: str
    email: str | None = None
    name: str | None = None
    picture: str | None = None

class PingResponse(BaseModel):
    id: str
    message: str
    timestamp: int
    user_id: str | None = None
```

### 3.2 Authentication Module (`app/auth/__init__.py` & `app/auth/security.py`)

* **Security Scheme:** `HTTPBearer(auto_error=False)` or standard bearer token extractor.
* **Dependency:** `get_current_user(credentials = Depends(security)) -> AuthenticatedUser`:
  * Extracts raw Bearer token from the `Authorization` header.
  * Calls `firebase_admin.auth.verify_id_token(token)`.
  * Maps decoded claims into `AuthenticatedUser(uid=claims["uid"], email=claims.get("email"), ...)`.
  * Raises `HTTPException(status_code=401, detail="Invalid or expired authentication token")` upon validation failure.

### 3.3 Root Router Configuration (`app/main.py`)

```python
app = FastAPI(title="Mono-Repo MWE")

# Development CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5000",
        "http://localhost:5000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/ping", response_model=PingResponse)
def ping_endpoint(
    message: str = "Hello Cloud Run",
    db: Any = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    return logic.process_ping(db, message, user_id=current_user.uid)
```

---

## 4. Step-by-Step Implementation Roadmap

### Phase 1: Configuration & Emulators
1. **`firebase.json`**:
   * Add `"auth": { "port": 9099 }` under `"emulators"`.
   * Add Hosting rewrite rule:
     ```json
     "rewrites": [
       {
         "source": "/api/**",
         "run": {
           "serviceId": "api-backend",
           "region": "us-east4"
         }
       }
     ]
     ```
2. **`backend/tach.toml`**:
   * Register `app.auth` module with `depends_on = ["app.schemas"]`.
   * Update `app.main` with `depends_on = ["app.service", "app.schemas", "app.database", "app.auth"]`.

### Phase 2: Backend Implementation
1. **`app/schemas/models.py`**:
   * Implement `AuthenticatedUser` model.
   * Add optional `user_id` field to `PingResponse`.
2. **`app/auth/security.py`**:
   * Implement token extraction, verification via `firebase_admin.auth.verify_id_token`, and user mapping.
3. **`app/service/logic.py` & `app/repositories/firestore.py`**:
   * Update `process_ping` and `save_ping` to accept and persist `user_id`.
4. **`app/main.py`**:
   * Prefix API routes with `/api/` (matching the rewrite pattern).
   * Register local development `CORSMiddleware`.
   * Inject `get_current_user` into protected routes.

### Phase 3: Testing & Boundary Verification
1. **`backend/tests/conftest.py`**:
   * Create `mock_user` fixture returning a mock `AuthenticatedUser`.
   * Add dependency override in `client` fixture for `get_current_user`.
2. **`backend/tests/test_logic.py` & `test_auth.py`**:
   * Add tests verifying unauthorized requests (401) when token is missing/invalid.
   * Add tests verifying authorized requests succeed and persist `user_id`.
3. **Run Tach check**:
   * Execute `uv run tach check` to ensure zero boundary violations.
4. **Run Pytest**:
   * Execute `uv run pytest` to ensure all tests pass offline.

### Phase 4: Frontend Implementation
1. **`frontend/index.html`**:
   * Include Tailwind Play CDN and Alpine.js via CDN script tags.
   * Include Firebase v10/v11 Web SDK (modular or compat scripts via CDN).
   * Provide reactive UI components:
     * Header with Google Sign-in button or user profile banner (display name, email, avatar, Sign-out button) bound to `$store.auth`.
     * Ping form using `Alpine.data('app', ...)` invoking `apiFetch('/api/ping')`.
2. **`frontend/script.js`**:
   * Initialize Firebase Auth SDK (with emulator detection if running on `127.0.0.1:5000`).
   * Register `Alpine.store('auth')` managing `user`, `loading`, `signIn()`, `signOut()`, and `requireAuth(redirectUrl = '/index.html')`.
   * Listen to Firebase `onAuthStateChanged` to reactively update `$store.auth.user` and `$store.auth.loading`.
   * Implement `apiFetch(path, options)` helper to retrieve `auth.currentUser.getIdToken()`, inject Bearer header, and route appropriately.

---

## 5. Verification Checklist

- [ ] `uv run tach check` reports valid module architecture with no boundary violations.
- [ ] `uv run pytest` executes cleanly without requiring network access or emulator services.
- [ ] Firebase emulator starts with Auth (`:9099`), Firestore (`:8080`), and Hosting (`:5000`).
- [ ] Local web client signs in with Google on the Auth emulator.
- [ ] API request to `/api/ping` via `apiFetch()` succeeds with valid Bearer token and displays user information in the UI.
- [ ] API request without token fails with HTTP 401.
- [ ] Client-side route guard (`requireAuth()`) redirects unauthenticated users to `/index.html` when visiting a protected page.
