# Implementation Plan: Bi-Directional Alpine Hydration Coordinator & Persistence Architecture

## Objective
Formalize and implement a robust, reusable Bi-Directional Hydration Coordinator pattern across Alpine.js stores in the brewing calculator application. This plan covers:
1. Drafting a formal design specification doc in `docs/` or `plans/`.
2. Implementing a reusable hydration coordinator scaffold supporting atomic state commits, non-destructive failure handling, payload sanitation, and out-of-band staging.
3. Migrating existing `localStorage`-backed stores (starting with `Alpine.store('units')`) to leverage the new coordinator pattern.

---

## Key Files & Context
* **`frontend/script.js`**: Contains `Alpine.store('units')` and upcoming domain stores.
* **`frontend/constants.js`**: Centralized keys and storage constants.
* **`docs/` or `plans/`**: Formal architectural documentation location.

---

## Phased Implementation Plan

### Phase 1: Formal Design Specification (`docs/bi-directional-hydration-spec.md`)
Draft a formal architecture document detailing:
* **Bi-directional sync mechanics:** Outbound writes (Optimistic/Locked Commit) vs. Inbound reads (Atomic Staging & Commit).
* **Adapter / Provider pattern:** Decoupling persistence targets (`localStorage`, Firestore REST endpoints) from reactive store logic.
* **Schema sanitization rules:** Type checking and strict key filtering during Phase 1 staging.
* **UI Perimeter Interactivity Gating:** Standardized `<fieldset :disabled="!$store.<domain>.isReady">` integration.

### Phase 2: Reusable Hydration Coordinator Scaffold (`frontend/script.js` or helper module)
Implement a base coordinator mixin or factory pattern that can be attached to any Alpine store:
* State properties: `data`, `isReady`, `error` (`{ message: null }`), `isSaving`.
* Core methods:
  * `async hydrate(providerFn)`: Out-of-band fetch, schema sanitation, atomic `Object.assign()`, error trapping, and `isReady = true`.
  * `async commit(payload, writerFn)`: Fieldset locking, out-of-band save, non-destructive rollback on failure, and success telemetry.
  * `clearError()`: Error banner dismissal.

### Phase 3: Migrate Unit Preferences (`Alpine.store('units')`)
Refactor `Alpine.store('units')` to adopt the coordinator scaffold:
* Wrap unit state under `data` (or maintain clean getters/setters mapped to `data`).
* Replace synchronous `localStorage.getItem()` / `setItem()` calls with provider/writer adapters conforming to the coordinator contract.
* Verify unit selector pills, custom override modals, and preset switches operate seamlessly with atomic hydration.

---

## Verification & Testing
1. Verify initial page load hydrates unit preferences correctly from `localStorage` without UI flashing.
2. Verify network/storage error simulation non-destructively falls back to defaults without breaking form interactivity.
3. Verify saving/persisting preferences correctly updates storage while maintaining fieldset/control availability.
4. Run backend test suite (`uv run pytest`) and architectural linter (`uv run tach check`) to ensure 100% hygiene.
