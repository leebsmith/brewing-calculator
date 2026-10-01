# Architectural Specification: Bi-directional Alpine Hydration Coordinator & Persistence Architecture

## 1. Executive Summary & Philosophy
Client-side SPAs interfacing with asynchronous backends (or browser storage APIs) frequently suffer from race conditions, partial state hydration, UI layout shifts, and error handling fragility. 

This specification formalizes the **Bi-directional Hydration Coordinator** pattern for Alpine.js stores within the brewing calculator mono-repo. It decouples asynchronous persistence boundaries from reactive proxy rendering, ensuring that all data mutations and initial loads occur atomically and non-destructively.

---

## 2. Core Architectural Principles

1. **Atomic State Commit:** Hydration is all-or-nothing. Incoming data is staged in non-reactive memory, validated and sanitized against a declared schema, and committed to reactive store properties in a single synchronous execution tick.
2. **Non-Destructive Failure:** Persistence failures (network timeouts, storage quota exceptions, validation errors) trap exceptions safely, populate error telemetry, discard staged payloads, and unlock form controls so user work is never lost.
3. **Adapter Decoupling:** Persistence mechanisms (`localStorage`, FastAPI REST endpoints, Firestore) are encapsulated behind agnostic provider/writer adapter functions, keeping Alpine stores testable and environment-agnostic.
4. **Perimeter Interactivity Gating:** Form UI containers are wrapped in native `<fieldset :disabled="!$store.<domain>.isReady || $store.<domain>.isSaving">` directives, eliminating repetitive per-field gating.

---

## 3. The Bi-Directional Lifecycle Model

### 3.1 Inbound Hydration (Read)
* **Phase 1 (Staging):** The coordinator sets `isReady = false` and clears prior errors. The asynchronous provider adapter retrieves raw data.
* **Phase 2 (Sanitization):** Staged payloads are filtered against declared schema keys to reject unknown or malicious properties.
* **Phase 3 (Atomic Commit):** Validated data is assigned to store state in a single tick (`Object.assign(this.data, sanitizedData)`), immediately followed by `isReady = true`.

### 3.2 Outbound Persistence (Write)
* **Phase 1 (Locking):** The store sets `isSaving = true`.
* **Phase 2 (Out-of-Band Write):** The writer adapter transmits the payload to the persistence target.
* **Phase 3 (Commit or Rollback):** On success, `isSaving = false` and success telemetry is logged. On failure, `isSaving = false`, an error message is surfaced, and local state remains intact.

---

## 4. Reusable Coordinator Scaffold Contract

Any Alpine store adopting this architecture implements the following standard shape:

```javascript
{
  data: { /* declared schema defaults */ },
  isReady: false,
  isSaving: false,
  error: { message: null },

  async hydrate(providerFn) {
    this.isReady = false;
    this.error.message = null;
    try {
      const raw = await providerFn();
      const sanitized = this.sanitize(raw);
      Object.assign(this.data, sanitized);
    } catch (err) {
      this.error.message = err.message || 'Hydration failed';
    } finally {
      this.isReady = true;
    }
  },

  async commit(payload, writerFn) {
    this.isSaving = true;
    this.error.message = null;
    try {
      const sanitized = this.sanitize(payload);
      await writerFn(sanitized);
      Object.assign(this.data, sanitized);
    } catch (err) {
      this.error.message = err.message || 'Persistence failed';
    } finally {
      this.isSaving = false;
    }
  },

  sanitize(raw) {
    // Strict schema filtering
    return sanitizedPayload;
  },

  clearError() {
    this.error.message = null;
  }
}
```
