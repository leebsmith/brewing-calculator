---
title: Architectural Migration Directive: Transitioning from Zero-Build Alpine.js and Vanilla JS to a Vite-Powered Firebase and FastAPI Monorepo
source: https://gemini.google.com/app/f42c46ec9749d74f
platform: Gemini Deep Research
exportedAt: 2026-10-03 09:39:36 -04:00
---

# Architectural Migration Directive: Transitioning from Zero-Build Alpine.js and Vanilla JS to a Vite-Powered Firebase and FastAPI Monorepo

## Executive Summary and Architectural Context

The evolution of frontend architectures frequently necessitates a transition from zero-build, Content Delivery Network (CDN)-reliant setups to robust, bundled module ecosystems. The analysis presented herein details a comprehensive architectural migration for a decoupled web application. The legacy architecture relies on a zero-build frontend utilizing Vanilla HTML and Cascading Style Sheets (CSS), the Firebase Web SDK (compat versions) delivered via CDN, and Alpine.js (Core + Collapse plugin). This frontend communicates with a headless FastAPI backend deployed via Google Cloud Run.

The primary catalyst for this migration is an intractable race condition inherent to the zero-build setup, wherein Alpine.js fails to reliably access state stores during the Document Object Model (DOM) initialization phase[^1]. The legacy system mixes classic deferred scripts with ECMAScript (ES) modules, leading to execution order unpredictability and critical application failures. The target architecture resolves these lifecycle mechanics by introducing Vite, a modern frontend build tool that leverages native ES modules during development and Rollup for production bundling[^2].

The migration centralizes dependency management via the Node Package Manager (NPM), implements the Firebase v10 modular Web SDK to enable tree-shaking, establishes secure Cross-Origin Resource Sharing (CORS) boundaries for the FastAPI backend, and utilizes Firebase Hosting's advanced rewrite capabilities to route Application Programming Interface (API) traffic directly to Cloud Run containers while preserving Single Page Application (SPA) fallback routing[^5]. Furthermore, this document provides highly specific Command Line Interface (CLI) prompt directives designed for advanced Large Language Model (LLM) agents, enabling automated, programmatic execution of the codebase refactoring[^9].

## Deconstructing the Legacy Race Condition

The legacy application exhibits severe initialization errors, specifically throwing `ReferenceError: Alpine is not defined` and `Alpine Expression Error: Cannot read properties of undefined` during page load[^1]. These errors stem directly from the interplay between browser DOM parsing, script fetching mechanisms, and the Web Hypertext Application Technology Working Group (WHATWG) HTML specification governing script execution orders.

In the original markup, Alpine.js and its Collapse plugin are loaded via CDN using the `defer` attribute[^1]. Concurrently, the application logic is loaded as an ES module via a script tag with `type="module"`[^1]. The WHATWG HTML specification dictates that classic scripts with the `defer` attribute are fetched in parallel with HTML parsing but execute only after the document has been fully parsed, in the exact order they appear in the markup[^12]. Conversely, scripts declared with `type="module"` are implicitly deferred by default, meaning the `defer` attribute is technically redundant and properly ignored by validators[^13]. The browser continues parsing HTML while it fetches the module and recursively fetches its entire dependency graph over the network[^13]. Only when the entire dependency graph is resolved does the module execute.

The race condition manifests because the browser executes the CDN-delivered `defer` scripts as soon as HTML parsing completes. Alpine.js immediately initializes, evaluates the DOM, and fires the `alpine:init` event on the global `document` object[^20]. However, because the ES module containing the application logic must wait for its dependency graph to resolve over the network, its execution is frequently delayed until after Alpine has already initialized[^13]. Consequently, when Alpine scans the DOM and attempts to evaluate expressions bound to HTML attributes, the application module has not yet registered the necessary state stores[^1]. The variables remain undefined in the global execution context, triggering fatal expression errors.

### The Failure of Zero-Build Mitigation Attempts

Previous attempts to resolve this within the zero-build paradigm failed due to a fundamental misunderstanding of the browser's execution stack and the event loop. Moving the ES module script tag before or after the classic deferred script tags does not guarantee execution order[^1]. While classic deferred scripts execute in source order relative to each other, the execution interleaving of classic deferred scripts and ES modules depends entirely on network latency and dependency resolution speeds[^13]. If the module relies on external files, the module's execution is guaranteed to be pushed down the event queue, operating as a distinct macrotask that resolves only after the Alpine.js initialization microtasks have cleared[^18].

Furthermore, attempting to register the Alpine.js Collapse plugin via an inline script listening for `alpine:init` failed because inline scripts without `type="module"` execute synchronously, blocking HTML parsing[^1]. If placed after deferred scripts, the inline script executes before the deferred scripts run, meaning the global Alpine object is undefined. If the inline script uses `defer` without a `src` attribute, the `defer` attribute is ignored by modern browsers per the HTML specification, resulting in immediate, synchronous execution that similarly fails[^12].

To clarify the exact browser handling of these script directives, the following table summarizes the execution timing enforced by the WHATWG specification:

| Script Tag Configuration | Fetching Behavior | Execution Timing | Execution Order Guarantee |
| --- | --- | --- | --- |
| `<script src="...">` | Blocks HTML parsing | Synchronous, immediately upon fetch | Source order |
| `<script defer src="...">` | Parallel to HTML parsing | After HTML parsing, before `DOMContentLoaded` | Source order (relative to other `defer` scripts) |
| `<script async src="...">` | Parallel to HTML parsing | As soon as fetched, pausing HTML parsing | None |
| `<script type="module" src="...">` | Parallel (including dependency graph) | After HTML parsing, implicitly deferred | Source order (relative to other modules) |
| `<script type="module" async>` | Parallel (including dependency graph) | As soon as graph is resolved | None |
| Inline `<script>` | Blocks HTML parsing | Synchronous | Source order |
| Inline `<script defer>` | Blocks HTML parsing (`defer` ignored) | Synchronous | Source order |

The only canonical resolution to this initialization race condition is to abandon the mixed-mode execution context. Transitioning to a fully bundled architecture ensures that dependency injection and initialization sequences are strictly controlled by a module bundler, mathematically eliminating asynchronous race conditions during the initial page load.

## Frontend Build System Migration: Vite Integration

Transitioning to Vite resolves execution timing discrepancies by encapsulating all dependencies into a unified dependency graph processed via Rollup for production and native ES modules during development[^2]. Vite is a modern frontend build tool providing a faster and leaner development experience, utilizing esbuild for dependency pre-bundling[^2].

### Vite Project Initialization and Dependency Resolution

To establish the Vite build system, the frontend directory must be initialized as an NPM project using the standard Vite scaffolding command. The vanilla template provides the leanest foundation, omitting unnecessary framework overhead while establishing the required configuration files and directory structures[^4]. The legacy system relied on unversioned or loosely versioned CDN links, which introduces security risks and unpredictable cache invalidation. The new architecture dictates strict versioning via a `package.json` manifest. The required dependencies include Alpine.js, its official plugins, and the Firebase modular SDK[^5].

Installing these packages locally allows the bundler to analyze the import graph and apply tree-shaking algorithms, ensuring that only the executable code paths utilized by the application are included in the final production payload[^2]. This represents a significant performance optimization over the legacy CDN approach, which forced the browser to parse and compile the entirety of the libraries regardless of usage.

### Establishing the Deterministic Initialization Sequence

In a Vite-powered application, the entry point explicitly controls the execution stack. To guarantee that stores and plugins are registered before the DOM is evaluated, the initialization must occur synchronously before invoking the Alpine start method[^20]. The previous architectural reliance on the `alpine:init` event listener is an anti-pattern in bundled environments[^1]. When Alpine is imported as an ES module and bundled, the developer must manually orchestrate the plugin registration and store definition rather than relying on browser-dispatched events[^22].

The main entry file must sequentially import the core Alpine library and its required plugins. Following the imports, the plugins must be registered via the `Alpine.plugin()` Application Programming Interface (API)[^20]. Crucially, the application's state stores and component data definitions must be imported and registered synchronously. Only after all dependencies, stores, and plugins are loaded into memory should the application execute `Alpine.start()`[^31].

By decoupling the store logic into dedicated modular files and importing them synchronously into the main bundle, the race condition is eliminated. Vite guarantees that the start invocation occurs only after the entire module tree has been resolved, parsed, and executed[^2]. Furthermore, exposing the Alpine instance to the global window object remains a recommended practice for developer experience and debugging, although it is no longer strictly required for internal application routing[^31].

### Store Refactoring and Modularization

The legacy application contained a monolithic declaration of stores within a single file[^19]. This must be refactored into isolated modules. Each store must be exported as a standard JavaScript object or factory function. This modularization enforces separation of concerns, improves testability, and allows Vite to optimize the bundling process. Pure functions handling unit conversions and business logic can be safely imported into these isolated stores without risking global namespace pollution or execution delays[^18].

The transition from a zero-build paradigm to a bundled architecture introduces several fundamental shifts in how the application is constructed and delivered. The following table highlights the architectural differences between the two paradigms:

| Architectural Component | Legacy Zero-Build Setup | Modern Vite Bundled Setup |
| --- | --- | --- |
| Dependency Management | Remote CDN `<script>` tags | Local NPM `package.json` |
| Execution Order | Unpredictable (Network/Spec dependent) | Deterministic (Module Graph) |
| Alpine.js Initialization | Triggered via `alpine:init` event | Manual invocation of `Alpine.start()` |
| Code Splitting | Manual or non-existent | Automated via Rollup |
| Payload Size | Full library parsed | Tree-shaken (Only used code bundled) |
| Environment Variables | Hardcoded or injected globally | Abstracted via `import.meta.env` |

## Firebase Web SDK v10 Modularization

The legacy architecture utilized the Firebase compat libraries via CDN[^1]. These libraries are built around a namespaced API that loads the entire Firebase payload into memory, bloating the global namespace and significantly degrading the Time to Interactive (TTI) metrics of the application. The migration demands the implementation of the Firebase v10 modular API, which is explicitly designed to integrate with module bundlers like Vite to facilitate aggressive tree-shaking[^5].

### ESM Import Refactoring

The implementation requires replacing global namespace calls with specific functional imports. Instead of initializing the application through a global object, the code must import the `initializeApp` function from the core module[^5]. Similarly, authentication services must be initialized using the `getAuth` function, and specific authentication providers or actions must be imported individually[^39]. This functional approach ensures that the Vite bundler can statically analyze the imports and discard any unused Firebase modules from the final build[^5].

### Environment Variable Management in Vite

Securely managing backend secrets and configuration variables is a critical component of the architectural migration. Vite handles environment variables by exposing them through the `import.meta.env` object, statically replacing them at build time[^33]. To prevent the accidental leakage of sensitive backend secrets into the client-facing JavaScript payload, Vite enforces a strict prefixing policy. Only variables explicitly prefixed with a designated identifier (defaulting to `VITE_`) are exposed to the client-side source code[^33].

The Firebase configuration object must be populated using these securely injected variables rather than hardcoding them into the repository. To enable strict typing and IntelliSense for these variables within the development environment, a TypeScript declaration file should be generated within the source directory[^33]. This declaration file extends the `ImportMetaEnv` interface, mapping the expected environment variables to their respective string types, thereby providing compile-time safety and preventing runtime errors caused by missing configurations.

The security and visibility contexts of environment variables within the Vite ecosystem are detailed in the table below:

| Variable Prefix | Build-Time Accessibility | Client-Side Accessibility | Primary Use Case |
| --- | --- | --- | --- |
| `VITE_` | Yes | Yes (Statically replaced) | Public API keys, Firebase Config |
| No Prefix | Yes | No (Undefined at runtime) | Secret keys, Database Passwords |
| `NODE_ENV` | Yes | Exposed as `PROD` or `DEV` | Environment-specific logic branching |

## Backend Integration and API Routing Configuration

The application architecture utilizes a Python FastAPI backend that must securely validate JSON Web Tokens (JWTs) passed from the Vite frontend. A critical architectural hurdle in decoupled monorepos is managing Cross-Origin Resource Sharing (CORS) boundaries during both local development and production deployment[^6]. Browsers enforce the Same-Origin Policy, a security mechanism that restricts how a document or script loaded from one origin can interact with a resource from another origin[^6].

### Local Development: Vite Dev Server Proxy

During local development, the Vite frontend typically runs on a specific port (e.g., 5173), while the FastAPI backend runs on a different port (e.g., 8000)[^46]. Because the ports differ, the browser treats requests between them as cross-origin requests, blocking them unless explicit CORS headers are present[^6]. Instead of loosening backend CORS policies for local development, the optimal architectural pattern is to utilize the Vite development server as a reverse proxy[^27].

This configuration is established in the Vite configuration file. By intercepting requests made to specific API paths and forwarding them directly to the FastAPI server, the proxy effectively masks the cross-origin nature of the request from the browser[^27]. The browser perceives the request as originating from the same domain serving the frontend assets, bypassing the Same-Origin Policy entirely. Furthermore, URL rewriting rules can be applied within the proxy configuration to strip specific path prefixes before forwarding the request to the backend, aligning the local development environment with the production routing topology[^27].

### Production Security: FastAPI CORS Middleware

In the production environment, the frontend is deployed to Firebase Hosting, and the backend is deployed as a stateless Google Cloud Run container[^7]. While Firebase Hosting can proxy requests, it is an architectural best practice to implement a robust defense-in-depth strategy by configuring FastAPI's CORS middleware to explicitly reject unauthorized origins at the application layer[^52].

When a browser executes a cross-origin request involving custom headers, such as authorization tokens, it automatically issues a preflight `OPTIONS` request to the server[^6]. The FastAPI middleware intercepts this preflight request and evaluates the origin against its configured allowlist. The backend must strictly define the allowed origins based on the deployment environment, including the assigned Firebase subdomains and any associated custom domains[^52].

This configuration ensures that the `Access-Control-Allow-Origin` and `Access-Control-Allow-Headers` response headers are dynamically generated and returned to the browser only if the requesting origin matches the authorized list[^6]. Additionally, the middleware must be configured to allow specific HTTP methods and enable credential transmission if cookies or authorization headers are utilized[^52].

To fully define the backend security posture, the following parameters must be configured within the FastAPI middleware:

| Configuration Parameter | Purpose in Architectural Context | Security Implication |
| --- | --- | --- |
| `allow_origins` | Defines exact domains permitted to communicate with the API. | Prevents unauthorized frontend applications from making cross-origin data requests. |
| `allow_credentials` | Permits the browser to include credentials (cookies, auth headers). | Required for authenticated endpoints; cannot be used in conjunction with a wildcard (`*`) origin. |
| `allow_methods` | Specifies permitted HTTP verbs (GET, POST, OPTIONS, etc.). | Restricts the types of operations a remote origin can command the backend to perform. |
| `allow_headers` | Whitelists specific custom headers requested by the client. | Ensures malicious or unexpected headers are stripped or rejected during the preflight phase. |

## Firebase Hosting Configuration: Cloud Run Rewrites and SPA Routing

Firebase Hosting serves as the global ingress for the application. It acts simultaneously as an edge caching layer and a reverse proxy. To achieve a seamless integration between the static frontend assets generated by Vite and the dynamic API served by Cloud Run, the Firebase configuration file must specify exact routing rules via the rewrites array[^7].

A critical consideration in this configuration is rule ordering. Firebase Hosting evaluates rewrite rules sequentially from top to bottom; the first matching rule is executed[^55]. Therefore, highly specific routes must precede generalized catch-all routes[^7].

### Rule 1: Cloud Run API Proxy

Requests targeting the backend API path must be seamlessly intercepted and routed to the Cloud Run container[^7]. By defining a rewrite rule that maps the API source path to the specific Cloud Run service ID and region, Firebase Hosting acts as an API gateway[^51]. This architectural pattern circumvents CORS limitations entirely in production because the browser perceives the API request as originating from the same domain serving the HTML[^7]. The configuration requires the exact service name and deployment region to successfully establish the proxy connection[^51].

### Rule 2: Single Page Application (SPA) Fallback

Vite compiles the frontend into a single HTML entry point alongside hashed JavaScript and CSS bundles. If a user directly navigates to a deep link within the application, the Firebase origin server will attempt to locate a corresponding HTML file matching that specific path[^59]. When this file is not found, the server defaults to returning a 404 error[^8].

To support HTML5 History API-based client-side routing, a fallback rewrite rule must catch all unhandled routes and serve the root HTML file[^8]. This ensures that the frontend application loads and the client-side router takes over to render the appropriate view based on the URL path[^59]. This rule must be placed at the end of the rewrites array to ensure it does not intercept API traffic intended for the Cloud Run backend[^7].

### Cache-Control Header Tuning

Optimal performance requires precise cache management at the CDN edge. The Firebase configuration allows for custom headers to be injected based on URL path matching[^55]. Static assets generated by Vite contain content hashes in their filenames, making them immutable and highly cacheable. These assets should be configured with aggressive caching headers, instructing both the browser and the CDN to cache them for a maximum duration[^62].

However, the main HTML entry point must never be cached by the browser, ensuring users receive the latest application bundle references immediately upon deployment[^66]. The Cache-Control directive must explicitly forbid caching of this file. Similarly, responses from the Cloud Run API should explicitly define caching policies using shared cache directives for the CDN and standard maximum age directives for the browser, alleviating backend load while ensuring data freshness[^56].

The priority order for how Firebase evaluates incoming requests and applies configurations is outlined below to ensure architectural correctness:

| Evaluation Phase | Configuration Element | Action Performed |
| --- | --- | --- |
| Phase 1 | Reserved URLs (`/__/*`) | Firebase specific namespace services (Auth, internal routing). |
| Phase 2 | Configured Redirects | Evaluates 301/302 redirects defined in `firebase.json`. |
| Phase 3 | Exact-Match Static Content | Serves physical files existing in the public directory (e.g., hashed CSS/JS). |
| Phase 4 | Configured Rewrites (Sequential) | Evaluates rewrites top-to-bottom. Routes `/api` to Cloud Run, then `**` to `index.html`. |
| Phase 5 | Custom 404 Page | Serves `404.html` if no previous phases resolve the request. |

## Monorepo Structure and Deployment Orchestration

The integration of frontend and backend environments mandates a rigorous monorepo structure. Isolating dependencies and build pipelines ensures continuous integration and deployment stability while mitigating cross-contamination of node modules or Python virtual environments.

### Repository Hierarchy and Build Pipeline Adjustments

The file system architecture must separate the Vite application and the FastAPI application into distinct directories[^71]. By default, Vite outputs bundled files to a directory named `dist` within its project root[^72]. To streamline deployment with Firebase Hosting, the Vite configuration is instructed to output its compiled assets directly to a designated public folder at the root of the monorepo[^73].

Because the target output directory resides outside Vite's immediate project root, the configuration requires an explicit directive to empty the output directory prior to building[^72]. This prevents the accumulation of stale assets and ensures that Firebase Hosting deploys a clean payload.

The deployment orchestration follows a bifurcated approach. The frontend is built within its designated directory, populating the root public folder. The Firebase CLI then pushes these static assets and the routing configuration to the edge network[^7]. Conversely, the FastAPI backend is containerized via Docker and submitted to a container registry, followed by a deployment to Cloud Run using the Google Cloud CLI[^7].

## Gemini CLI Prompt Directives for Automated Code Generation

To execute this complex architectural migration efficiently, Artificial Intelligence (AI)-assisted code generation can be utilized. The following section provides highly specific system prompt instructions designed for an advanced reasoning agent operating in a command-line interface context[^77].

This directive leverages best practices for interacting with language models, specifically enforcing a strict sequential workflow consisting of understanding, planning, implementing, and verifying code changes[^9]. It demands absolute file paths, enforces tool execution for build verification, and suppresses conversational preamble to ensure direct, actionable outputs[^9].

### LLM Execution Prompt Template

The user should supply the following exhaustive prompt to their chosen CLI agent to initiate the migration:

# MISSION DIRECTIVE: Zero-Build to Vite Monorepo Architecture Migration

## Core Objective

Execute a complete architectural migration of the current repository. Convert a legacy zero-build frontend (Vanilla HTML, Alpine.js via CDN, Firebase compat SDK) into a modern Vite build system. Configure the environment to operate as a monorepo containing a Vite frontend and a FastAPI backend, orchestrated for deployment to Firebase Hosting and Google Cloud Run.

## Execution Constraints & Agent Protocols

1. **No Chitchat:** Do not generate conversational filler, preambles, or postambles. Output only the requested plan, tool executions, and file modifications.
2. **Absolute Paths:** When utilizing file reading/writing tools, strictly use absolute paths derived from the current working directory.
3. **Parallel Execution:** When analyzing the codebase in the "Understand" phase, execute file reads in parallel to optimize execution time.
4. **Tool Verification:** You possess the `run_shell_command` capability. You must run build and verification commands after modifying code to ensure structural integrity.

## Phase 1: Understand & Plan

1. Scan the repository root to map the current file structure. Locate `index.html`, `script.js`, any `pureHelpers.js` files, and the backend directory containing FastAPI configurations.
2. Formulate an execution plan targeting the structural hierarchy defined in Phase 2. Output this plan as a concise Markdown bulleted list before proceeding to implementation.

## Phase 2: Implement Monorepo Structure

Create the following directory structure if it does not exist:

- `root/frontend/` (for Vite)
- `root/backend/` (for FastAPI)
- `root/public/` (Vite output target and Firebase Hosting source)

## Phase 3: Frontend Build Initialization (Vite)

1. Within `root/frontend/`, initialize the Vite environment as a Vanilla JS project.

2. Update `root/frontend/package.json` to include the following dependencies:
  - `alpinejs`, `@alpinejs/collapse`, `@alpinejs/persist`, `firebase`.
  - Ensure `vite` is in `devDependencies`.

3. Create `root/frontend/vite.config.js` with the following explicit configuration:
  - `build.outDir` set to `'../public'`.
  - `build.emptyOutDir` set to `true`.
  - `server.proxy` mapping `'/api'` to `'http://localhost:8000'` with `changeOrigin: true` and URL rewriting.

## Phase 4: HTML & Alpine.js Refactoring

1. Move the legacy `index.html` into `root/frontend/index.html`.
2. Strip all `<script defer>` tags loading Alpine.js, Collapse plugins, and Firebase compat libraries from the `<head>`.
3. Replace the legacy `<script type="module" src="script.js">` with `<script type="module" src="/src/main.js"></script>`.
4. Ensure the `x-cloak` style remains in the `<head>` to prevent FOUC.

## Phase 5: JavaScript Modularization (src/main.js & Stores)

1. Create `root/frontend/src/main.js`.

2. Generate the ES Module imports:
  - Import `Alpine` from `alpinejs`.
  - Import `collapse` from `@alpinejs/collapse`.

3. Execute synchronous plugin registration: `Alpine.plugin(collapse)`.

4. Expose the global object: `window.Alpine = Alpine`.

5. Extract the monolithic Alpine stores from the legacy `script.js` into isolated files (e.g., `root/frontend/src/stores/unitsStore.js`).

6. Import these isolated stores into `main.js` and register them via `Alpine.store('units', unitsStore)`.

7. Terminate `main.js` with `Alpine.start()`. Ensure this is the absolute last call in the file.

## Phase 6: Firebase v10 Modular SDK Transition

1. Create `root/frontend/src/firebase/config.js`.
2. Implement the modular imports: `import { initializeApp } from "firebase/app"` and `import { getAuth } from "firebase/auth"`.
3. Map the Firebase config object to Vite environment variables strictly using the `import.meta.env.VITE_` prefix format (e.g., `import.meta.env.VITE_FIREBASE_API_KEY`).
4. Generate `root/frontend/src/vite-env.d.ts` specifying the `ImportMetaEnv` interface for type safety.

## Phase 7: Backend Configuration (FastAPI)

1. Modify `root/backend/main.py`.
2. Implement `fastapi.middleware.cors.CORSMiddleware`.
3. Configure `allow_origins` to include local Vite dev ports (`http://localhost:5173`) and target production Firebase domains.
4. Ensure `allow_credentials=True` and allow `OPTIONS` preflight methods.

## Phase 8: Firebase Hosting Configuration

1. Create or overwrite `root/firebase.json`.

2. Set the hosting `public` target to `"public"`.

3. Define the `headers` array:
  - Target `/index.html` with `Cache-Control: no-cache, no-store, must-revalidate`.
  - Target static assets (`**/*.@(js|css)`) with `Cache-Control: public, max-age=31536000, immutable`.

4. Define the `rewrites` array strictly in this order:
  - Source `"/api/**"` routing to `run: { serviceId: "<backend-service-name>", region: "us-central1" }`.
  - Source `"**"` routing to `destination: "/index.html"`.

## Phase 9: Verification

1. Execute `cd frontend && npm install`.
2. Execute `cd frontend && npm run build`.
3. Evaluate the terminal output. If the build succeeds and generates assets in `root/public`, gracefully terminate the execution. If errors occur, analyze the logs, implement fixes, and re-verify.

### Sources used in the report
[^1]: index.html
[^2]: [Getting Started - Vite](https://vite.dev/guide/) - vite.dev
[^3]: [Vite | Next Generation Frontend Tooling](https://vite.dev/) - vite.dev
[^4]: [Getting Started - Vite](https://v4.vite.dev/guide/) - v4.vite.dev
[^5]: [Add Firebase to your JavaScript project | Firebase for web platforms](https://firebase.google.com/docs/web/setup) - firebase.google.com
[^6]: [Configuring CORS in FastAPI - GeeksforGeeks](https://www.geeksforgeeks.org/python/configuring-cors-in-fastapi/) - geeksforgeeks.org
[^7]: [How to Use Firebase Hosting Rewrites to Route Traffic to Cloud Run](https://oneuptime.com/blog/post/2026-02-17-how-to-use-firebase-hosting-rewrites-to-route-traffic-to-cloud-run-services/view) - oneuptime.com
[^8]: [How to Deploy TanStack Router to Production](https://tanstack.com/router/latest/docs/how-to/deploy-to-production) - tanstack.com
[^9]: [System Instructions of Gemini CLI as on 29-07-2025 - GitHub Gist](https://gist.github.com/ksprashu/61194be375dba10d8950df43e33742fb) - gist.github.com
[^10]: [Persist Plugin - Alpine.js](https://alpinejs.dev/plugins/persist) - alpinejs.dev
[^11]: [Collapse — Alpine.js](https://alpinejs.dev/plugins/collapse) - alpinejs.dev
[^12]: [How to defer inline Javascript? - jquery - Stack Overflow](https://stackoverflow.com/questions/41394983/how-to-defer-inline-javascript) - stackoverflow.com
[^13]: [Browser Internals Course - Flavio Copes](https://downloads.flaviocopes.com/course-downloads/browser-internals.pdf) - downloads.flaviocopes.com
[^14]: [Describe the difference between ``, `` and](https://www.greatfrontend.com/questions/quiz/describe-the-difference-between-script-async-and-script-defer) - greatfrontend.com
[^15]: [HTML Guides - issues tagged as script - Rocket Validator](https://rocketvalidator.com/html-validation/tag/script) - rocketvalidator.com
[^16]: [A “script” element with a “defer” attribute must not have a “type](https://rocketvalidator.com/html-validation/a-script-element-with-a-defer-attribute-must-not-have-a-type-attribute-with-the-value-module) - rocketvalidator.com
[^17]: [HTML script element - HTML - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script) - developer.mozilla.org
[^18]: pureHelpers.js
[^19]: script.js
[^20]: [Extending - Alpine.js](https://alpinejs.dev/advanced/extending) - alpinejs.dev
[^21]: [Alpine.store in the Hyvä theme - Frontend Notes](https://bondar.blog/alpinestore-in-hyva/) - bondar.blog
[^22]: [Uncaught ReferenceError: Alpine is not defined / How to use with](https://github.com/alpinejs/alpine/discussions/2828) - github.com
[^23]: [Using microtasks in JavaScript with queueMicrotask() - Web APIs](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide) - developer.mozilla.org
[^24]: [Difference between microtask and macrotask within an event loop](https://stackoverflow.com/questions/25915634/difference-between-microtask-and-macrotask-within-an-event-loop-context) - stackoverflow.com
[^25]: [Why can you only use defer when src is specified? - Stack Overflow](https://stackoverflow.com/questions/5325436/why-can-you-only-use-defer-when-src-is-specified) - stackoverflow.com
[^26]: [Vite | single-spa - JS.ORG](https://single-spa.js.org/docs/ecosystem-vite/) - single-spa.js.org
[^27]: [Build Ultra-Fast Dev Loops with Vite & Monorepos - Medium](https://medium.com/@Modexa/build-ultra-fast-dev-loops-with-vite-monorepos-6e64d9f9ace7) - medium.com
[^28]: [Setting up Vite with TypeScript for a Simple To-Do List](https://dev.to/shayy/setting-up-vite-with-typescript-for-a-simple-to-do-list-2hlh) - dev.to
[^29]: [create-vite - NPM](https://www.npmjs.com/package/create-vite) - npmjs.com
[^30]: [Make a Scene with Three.js & Vite - Codédex](https://www.codedex.io/community/main/I66Zy8oObKAi209Ym0zl) - codedex.io
[^31]: [Alpine.js in 2026: The 7 kB Script Tag That Replaced jQuery (And](https://dev.to/sahilkhurana/alpinejs-in-2026-the-7-kb-script-tag-that-replaced-jquery-and-when-to-actually-use-it-1129) - dev.to
[^32]: [What Is Alpine.js? Features, Use Cases & Complete 2026 Guide](https://innostax.com/blog/alpine-js-a-lightweight-javascript-framework-for-modern-web-development/) - innostax.com
[^33]: [Env Variables and Modes - Vite](https://vite.dev/guide/env-and-mode) - vite.dev
[^34]: [Upgrade Guide | Laravel - Livewire](https://livewire.laravel.com/docs/3.x/upgrading) - livewire.laravel.com
[^35]: [Alpine.js Interview Questions and Answers - GoodSpace AI](https://goodspace.ai/interview-questions/alpine) - goodspace.ai
[^36]: [Install alpine plugin · filamentphp filament · Discussion #5357 - GitHub](https://github.com/filamentphp/filament/discussions/5357) - github.com
[^37]: [Lineone Laravel Documentation](https://lineone-docs.piniastudio.com/laravel-guide.html) - lineone-docs.piniastudio.com
[^38]: [\[Firestore\] admin.firestore.Timestamp.now() fails with firebase-admin](https://github.com/firebase/firebase-admin-node/discussions/1959) - github.com
[^39]: [Chrome Web Store Team complains a Violation: My Extension](https://github.com/firebase/firebase-js-sdk/issues/7617?timeline_page=1) - github.com
[^40]: [vite-envs - NPM](https://npmjs.com/package/vite-envs) - npmjs.com
[^41]: [How to use environmental variables (.env) in Vue.js and Vite.](https://medium.com/@andrewmasonmedia/how-to-use-environmental-variables-env-in-vue-js-and-vite-ac2ee73480dd) - medium.com
[^42]: [Env Variables and Modes - Vite](https://v2.vitejs.dev/guide/env-and-mode) - v2.vitejs.dev
[^43]: [How to Enable and Configure CORS in FastAPI - Untitled Publication](https://sailokesh.hashnode.dev/enable-and-configure-cors-in-fastapi) - sailokesh.hashnode.dev
[^44]: [Write Cloud Run functions | Google Cloud Documentation](https://docs.cloud.google.com/run/docs/write-functions) - docs.cloud.google.com
[^45]: [Understanding Cross-Origin Resource Sharing (CORS) in Flutter](https://medium.com/@mohitarora7272/understanding-cross-origin-resource-sharing-cors-in-flutter-web-for-firebase-connectivity-506e1ccdae54) - medium.com
[^46]: [FAQ · User Guide · Docs - OpenJellyfish](https://openjellyfish.ai/en/docs/user-guide/12) - openjellyfish.ai
[^47]: [FastAPI and React in 2025 - Josh Finnie](https://www.joshfinnie.com/blog/fastapi-and-react-in-2025/) - joshfinnie.com
[^48]: [Modern Full-Stack Setup: FastAPI + React.js + Vite + MUI with](https://dev.to/stamigos/modern-full-stack-setup-fastapi-reactjs-vite-mui-with-typescript-2mef) - dev.to
[^49]: [Vite/Preact non-hardcoded proxy best practice - Stack Overflow](https://stackoverflow.com/questions/79131080/vite-preact-non-hardcoded-proxy-best-practice) - stackoverflow.com
[^50]: [Deploy a Django or FastAPI application using Firebase Hosting and](https://medium.com/@schnaror/deploy-a-django-or-fastapi-application-using-firebase-hosting-and-firestore-part-1-0b4c08a17469) - medium.com
[^51]: [Serve dynamic content and host microservices with Cloud Run](https://firebase.google.com/docs/hosting/cloud-run) - firebase.google.com
[^52]: [Demystifying CORS in FastAPI & React: A Practical Guide](https://vinaysit.wordpress.com/2024/11/07/demystifying-cors-in-fastapi-react-a-practical-guide-%F0%9F%8C%90%F0%9F%9A%80/) - vinaysit.wordpress.com
[^53]: [FastAPI: Configuring CORS for Python's ASGI Framework - StackHawk](https://www.stackhawk.com/blog/configuring-cors-in-fastapi/) - stackhawk.com
[^54]: [The Ultimate Guide to CORS: Making Your Web Apps Play Nice](https://medium.com/@ashishpandey2062/the-ultimate-guide-to-cors-making-your-web-apps-play-nice-e86703222228) - medium.com
[^55]: [Configure Hosting behavior - Firebase - Google](https://firebase.google.com/docs/hosting/full-config) - firebase.google.com
[^56]: [Firebase Hosting for Cloud Run](https://firebase.blog/posts/2019/04/firebase-hosting-and-cloud-run/) - firebase.blog
[^57]: [Firebase Hosting rewrite doesn't redirect to Google Cloud Run](https://stackoverflow.com/questions/55773795/firebase-hosting-rewrite-doesnt-redirect-to-google-cloud-run) - stackoverflow.com
[^58]: [gcp.firebase.HostingVersion | Pulumi Registry](https://www.pulumi.com/registry/packages/gcp/api-docs/firebase/hostingversion/) - pulumi.com
[^59]: [Different History modes - Vue Router](https://router.vuejs.org/guide/essentials/history-mode.html) - router.vuejs.org
[^60]: [Framework hosting : Navigation between pages is always hard reload](https://github.com/firebase/firebase-tools/issues/6141?timeline_page=1) - github.com
[^61]: [How to SSG a Vite SPA - Peterbe.com](https://www.peterbe.com/plog/ssg-vite-spa) - peterbe.com
[^62]: [Deploying a SPA - Quasar Framework](https://quasar.dev/quasar-cli-vite/developing-spa/deploying/) - quasar.dev
[^63]: [Deployment - Lark](https://larkstack.com/docs/getting-started/deployment) - larkstack.com
[^64]: [React-router URLs don't work when refreshing or writing manually](https://stackoverflow.com/questions/27928372/react-router-urls-dont-work-when-refreshing-or-writing-manually/63316403) - stackoverflow.com
[^65]: [index.html single-page app rewrite rule defeats email actions paths](https://github.com/firebase/firebase-tools/issues/224) - github.com
[^66]: [How to Configure Firebase Hosting CDN Caching for Optimal](https://oneuptime.com/blog/post/2026-02-17-how-to-configure-firebase-hosting-cdn-caching-for-optimal-performance-on-gcp/view) - oneuptime.com
[^67]: [Love your cache ❤️ | Articles - web.dev](https://web.dev/articles/love-your-cache) - web.dev
[^68]: [Firebase Domain Front - Hiding C2 as App traffic - Intruder](https://www.redteam.cafe/red-team/domain-front/firebase-domain-front-hiding-c2-as-app-traffic) - redteam.cafe
[^69]: [Firebase hosting: How to prevent caching for the index.html of an SPA](https://stackoverflow.com/questions/48589821/firebase-hosting-how-to-prevent-caching-for-the-index-html-of-an-spa) - stackoverflow.com
[^70]: [Firebase hosting and Cloud Run cache - Medium](https://medium.com/google-cloud/firebase-hosting-and-cloud-run-cache-38afa6bd4beb) - medium.com
[^71]: [Guna1610/ai-interview-assistant - GitHub](https://github.com/Guna1610/ai-interview-assistant) - github.com
[^72]: [Build Options - Vite](https://vite.dev/config/build-options) - vite.dev
[^73]: [Changing the input and output directory in Vite - Stack Overflow](https://stackoverflow.com/questions/66863200/changing-the-input-and-output-directory-in-vite) - stackoverflow.com
[^74]: [vite.config.mts · renovate/configure - GitLab](https://gitlab1.ptb.de/digitaldynamicmeasurement/dccviewer-js/-/blob/renovate/configure/vite.config.mts) - gitlab1.ptb.de
[^75]: [Why I Moved from Cloud Run Domain Mappings to Firebase Hosting](https://abelcreates.com/posts/firebase/) - abelcreates.com
[^76]: [Configuring Vite](https://v2.vite.dev/config/) - v2.vite.dev
[^77]: [Gemini CLI: A Guide With Practical Examples - DataCamp](https://www.datacamp.com/tutorial/gemini-cli) - datacamp.com
[^78]: [Custom commands | Gemini CLI](https://geminicli.com/docs/cli/custom-commands/) - geminicli.com
[^79]: [Agent mode overview | Gemini for Google Cloud](https://docs.cloud.google.com/gemini/docs/codeassist/agent-mode) - docs.cloud.google.com
[^80]: [Agent Factory Recap: Build an AI Workforce with Gemini 3](https://cloud.google.com/blog/topics/developers-practitioners/agent-factory-recap-build-an-ai-workforce-with-gemini-3/) - cloud.google.com