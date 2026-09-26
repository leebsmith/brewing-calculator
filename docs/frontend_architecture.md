# Frontend Architecture & Conventions

## 1. Overview & Context

This document captures the architectural decisions, trade-offs, and conventions governing the frontend for this mono-repo.

The application uses:
* **Tailwind CSS (Play CDN)** for utility-first styling.
* **Alpine.js (CDN)** for declarative client-side reactivity.
* **Firebase Hosting** for static asset delivery at the edge.
* **FastAPI (Cloud Run)** strictly as a headless JSON REST API.

---

## 2. Architectural Evaluation: Decoupled SPA vs. HAT Stack (SSR)

During architectural planning, we evaluated adopting the **HAT stack (HTMX, Alpine.js, Tailwind CSS)** paired with server-side rendered **FastAPI + Jinja2 pages and partials**.

### Key Findings & Trade-offs:

1. **Hosting Topology & Latency:**
   * *HAT Stack / SSR:* Requires Cloud Run to render initial pages or HTML partials. Firebase Hosting acts merely as a proxy/CDN rewrite layer, introducing cold-start latency to initial page loads.
   * *Decoupled Static Shell:* Firebase Hosting serves static HTML/JS/CSS directly from global CDN edge caches with zero compute cost, near-instant initial render times, and high reliability.

2. **Authentication Flow:**
   * *HAT Stack / SSR:* Standard browser page navigation relies on cookies. Firebase Hosting strips all cookies except `__session`, requiring server-side session cookie management and token verification middleware on every HTML route.
   * *Decoupled Static Shell:* Firebase Auth client SDK manages token lifecycles in IndexedDB and passes standard `Authorization: Bearer <token>` headers to backend JSON endpoints.

3. **Backend Boundaries & Simplicity:**
   * *HAT Stack / SSR:* Merges presentation concerns into FastAPI, complicating the strict Tach module hierarchy (`app.main`, `app.service`, `app.repositories`, `app.schemas`).
   * *Decoupled Static Shell:* Keeps the backend strictly focused on data schemas, business rules, and Firestore persistence, completely free of HTML/presentation logic.

### Decision:
To preserve the operational simplicity, zero-maintenance posture, and clean separation of concerns, the **decoupled architecture was retained**. Rather than adopting HTMX and Jinja2 server rendering, we adopted **Alpine.js + Tailwind CSS** directly on the static frontend.

---

## 3. Frontend Conventions & Implementation Guidelines

### 3.1 Zero-Build Toolchain (CDN Delivery)
To maintain rapid development and eliminate local toolchain bloat (such as `package.json`, `node_modules`, or frontend bundlers):
* **Tailwind CSS** is loaded via the Play CDN:
  ```html
  <script src="https://cdn.tailwindcss.com"></script>
  ```
* **Alpine.js** is loaded via CDN with the `defer` attribute:
  ```html
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  ```

### 3.2 State Management & Separation of Concerns

We enforce a three-part separation:

1. **Async API Interactions & App State (`Alpine.data`):**
   * All asynchronous `fetch()` requests to the FastAPI backend, data models, error handling, and business state must be encapsulated inside `Alpine.data(...)` components defined in `frontend/script.js`.
   * Components register cleanly on the `alpine:init` lifecycle event:
     ```javascript
     document.addEventListener('alpine:init', () => {
       Alpine.data('app', () => ({
         // state properties
         // async methods
       }));
     });
     ```

2. **Clean, Declarative Markup (`frontend/index.html`):**
   * `frontend/index.html` focuses exclusively on structure and Tailwind utility styling.
   * DOM elements bind to `Alpine.data` components via directives (`x-data="app"`, `@click="fetchData"`, `x-text="message"`, `x-show="loading"`).

3. **Ephemeral DOM Toggles:**
   * Presentation-only UI state that does not communicate with the backend or manage persistent data (such as modal open/close toggles, mobile navigation menus, or accordion disclosures) may use inline `x-data="{ open: false }"` directly in the HTML.

### 3.4 Global Notification System (Toasts)
For user feedback, we use a global `Alpine.store('ui')` instance that manages a transient list of notifications.

* **Usage:** Trigger toasts from any Alpine component using `$store.ui.add(message, type)`:
  ```javascript
  // Trigger from an async handler in Alpine.data('app')
  Alpine.store('ui').add('Operation successful', 'success');
  Alpine.store('ui').add('An error occurred', 'error');
  ```
* **Supported Categories:** `success` (green), `error` (red), and `info` (indigo/default).
* **Implementation:** The toasts are automatically managed and removed by the store after a timeout (default 4s). The container is a fixed-position div in `index.html` using `x-for` to render the notification queue.

