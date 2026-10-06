# Refactor Plan: Unit System Architecture, Field Registry & Symmetrical Toggle Engine

## 1. Objective & Scope

This refactor resolves the unit toggle asymmetry and preset corruption bug documented in `docs/unit-toggle-bug.md`. It implements the new binary state model and universal field registry specified in `docs/design_requirements/unit_system_and_override_governance.md`.

### Core Goals
* Replace the fragile `activePreset: 'custom'` model with an immutable binary global mode invariant ($0 = \text{Metric}$, $1 = \text{Imperial}$).
* Introduce a centralized `FIELD_REGISTRY` in `frontend/constants.js` to guard against override sprawl and simplify template bindings.
* Implement a strictly symmetric bit-flip toggle engine ($b_i \leftarrow 1 - b_i$) that cycles indefinitely without state corruption.
* Standardize header mode buttons to exhibit tri-state visual styling (Solid, Tinted, Ghost) and deterministic interaction behavior (Cases A, B, and C), eliminating confirmation modals.
* Implement sparse exception persistence in `localStorage`, automatically purging obsolete or deprecated keys during hydration.

---

## 2. Key Files & Boundaries

* **`frontend/constants.js`**:
  * Define `UNIT_MODES` (`METRIC: 0`, `IMPERIAL: 1`).
  * Define `DOMAIN_BINARY_PAIRS` mapping each domain to its binary tuple `[Unit 0, Unit 1]`.
  * Define `FIELD_REGISTRY` declaring the 14 supported unit-aware fields and their domains.
* **`frontend/script.js`**:
  * Overhaul the `units` Alpine.store to utilize the binary mode bit and sparse exception map.
  * Consolidate disparate toggle methods into a unified `$store.units.toggle(fieldKey)`.
  * Remove obsolete modal prompt state (`promptModalOpen`, `pendingPreset`) and modal handler methods.
* **`frontend/src/partials/site-header.html`**:
  * Update mode buttons to route clicks through the unified `$store.units.handleModeClick(modeBit)`.
* **`frontend/src/partials/step-equipment-profile.html`**:
  * Streamline all 10 `.unit-badge` buttons to use the single-parameter `$store.units.toggle(fieldKey)` API.
* **`frontend/src/partials/step-batch-metadata.html`**:
  * Streamline all 4 `.unit-badge` buttons to use the single-parameter `$store.units.toggle(fieldKey)` API.
* **`frontend/index.html`**:
  * Remove obsolete unit override modal dialog markup if present.
* **`frontend/tests/unitsStore.test.js`**:
  * New automated test suite validating bit-flip symmetry, Imperial stability, Case A/B/C state transitions, and sparse persistence.

---

## 3. Phased Implementation Steps

### Phase 1: Constants & Universal Field Registry (`frontend/constants.js`)
1. Export `UNIT_MODES`:
   ```javascript
   export const UNIT_MODES = {
     METRIC: 0,
     IMPERIAL: 1
   };
   ```
2. Export `DOMAIN_BINARY_PAIRS`:
   * `volume`: `['L', 'gal']`
   * `mass`: `['kg', 'lb']`
   * `hopMass`: `['g', 'oz']`
   * `temperature`: `['C', 'F']`
   * `gravity`: `['Plato', 'SG']`
   * `compound`: `['L/kg', 'qt/lb']`
   * `extract_potential`: `['L·°/kg', 'gal·°/lb']`
   * `color`: `['EBC', 'SRM']`
   * `percentage`: `['%', 'fraction']`
3. Export `FIELD_REGISTRY` mapping the 14 authorized fields to their domains, utilizing step prefixes for origin traceability:
   * Equipment Profile: `step1_max_kettle_volume_l`, `step1_max_mash_tun_volume_l`, `step1_max_hlt_volume_l`, `step1_hlt_min_volume_l`, `step1_mash_dead_space_l`, `step1_trub_loss_l`, `step1_boil_off_rate_l_per_hr` (`volume`); `step1_grain_absorption` (`compound`); `step1_conversion_efficiency`, `step1_shrinkage_pct` (`percentage`).
   * Batch Metadata: `step2_preboil_volume_l`, `step2_postboil_volume_l`, `step2_target_volume_l` (`volume`); `step2_preboil_gravity` (`gravity`).

---

### Phase 2: Units Store Architecture Overhaul (`frontend/script.js`)
1. Refactor Alpine store state:
   * `globalMode`: `0` (Metric default)
   * `overrides`: `{}` (Sparse exception dictionary: `{ [fieldKey]: unitBit }`)
   * `isReady`: boolean, `isSaving`: boolean, `error`: `{ message: null }`
2. Implement Derived Status Getters:
   * `overrideCount`: Number of entries in `overrides` that belong to `FIELD_REGISTRY` and deviate from `globalMode`.
   * `isPure`: `overrideCount === 0`.
   * `isMixed`: `overrideCount > 0`.
   * `isPureMetric()`: `globalMode === 0 && isPure`.
   * `isMixedMetric()`: `globalMode === 0 && isMixed`.
   * `isPureImperial()`: `globalMode === 1 && isPure`.
   * `isMixedImperial()`: `globalMode === 1 && isMixed`.
3. Implement Field-Level Methods:
   * `getFieldBit(fieldKey)`: Returns `overrides[fieldKey]` if defined, else returns `globalMode` (or `0` for percentage).
   * `getFieldUnit(domain, fieldKey)`: Returns the string unit corresponding to `getFieldBit(fieldKey)`.
   * `getLabel(fieldKey)`: Convenient lookup returning the unit string for template display.
   * `isCustomized(fieldKey)`: Returns `true` if `getFieldBit(fieldKey) !== globalMode` (or for percentage, if `getFieldBit(fieldKey) !== 0`).
   * `toggle(fieldKey)`: Inverts the field's bit ($1 - b$). If the new bit equals the default ($g$, or $0$ for percentage), deletes the key from `overrides`; otherwise stores the new bit. Saves to storage.
4. Implement Global Mode Button Actions:
   * `handleModeClick(targetMode)`:
     * If `targetMode === globalMode`:
       * If `isPure`: Case A (No-op).
       * If `isMixed`: Case B (Call `resetOverrides()`, making system Pure).
     * If `targetMode !== globalMode`:
       * Case C: Set `globalMode = targetMode`, clear `overrides`, save to storage.
5. Conversion Helpers:
   * Update `toDisplay(domain, baseVal, fieldKey)` and `toBase(domain, displayVal, fieldKey)` to resolve active units directly from the new registry-driven `getFieldUnit`.
6. Hydration & Storage Coordinator:
   * Sanitize storage payload: enforce `globalMode` $\in \{0, 1\}$; filter `overrides` so only recognized keys in `FIELD_REGISTRY` with valid bit values ($0$ or $1$) are retained.

---

### Phase 3: Template Streamlining & Markup Updates
1. **`frontend/src/partials/site-header.html`**:
   * Update `@click` bindings:
     * Metric button: `@click="$store.units.handleModeClick(0)"`
     * Imperial button: `@click="$store.units.handleModeClick(1)"`
   * Retain the existing tri-state CSS pill classes (`tri-state-pill-solid`, `tri-state-pill-tinted`, `tri-state-pill-ghost`), which now bind cleanly to `isPureMetric()`, `isMixedMetric()`, `isPureImperial()`, `isMixedImperial()`.
2. **`frontend/src/partials/step-equipment-profile.html`**:
   * Replace verbose calls like `@click="$store.units.toggleField('volume', 'max_kettle_volume_l')"` with `@click="$store.units.toggle('step1_max_kettle_volume_l')"`.
   * Bind label via `x-text="$store.units.getLabel('step1_max_kettle_volume_l')"`.
   * Bind customized indicator via `:class="{ 'unit-badge-customized': $store.units.isCustomized('step1_max_kettle_volume_l') }"`.
3. **`frontend/src/partials/step-batch-metadata.html`**:
   * Apply the identical streamlined pattern across all 4 badges, using the `step2_` prefix logic.
4. **`frontend/index.html`**:
   * Audit and remove any leftover modal markup for unit confirmation dialogs.

---

### Phase 4: Automated Testing & Verification
1. Create `frontend/tests/unitsStore.test.js` using Node.js built-in test runner (`node --test`):
   * **Test 1: Default State.** Verify initial initialization produces `globalMode = 0`, `isPureMetric() === true`, and `overrideCount === 0`.
   * **Test 2: Single Field Toggle in Metric.** Toggle `step1_max_kettle_volume_l`. Verify unit switches from `L` to `gal`, `isCustomized` is `true`, and Metric button state becomes `isMixedMetric() === true`.
   * **Test 3: Infinite Toggle Symmetry.** Toggle `step1_max_kettle_volume_l` repeatedly for 10 cycles. Verify state alternates strictly between (`L`, pure) and (`gal`, mixed) with zero degradation.
   * **Test 4: Imperial Mode Stability.** Switch to Imperial (`globalMode = 1`). Verify `isPureImperial() === true`. Toggle `step1_max_kettle_volume_l` repeatedly for 10 cycles. Verify state alternates strictly between (`gal`, pure) and (`L`, mixed), directly confirming resolution of the bug in `docs/unit-toggle-bug.md`.
   * **Test 5: Case B Reset.** In Mixed Imperial mode, trigger `handleModeClick(1)`. Verify all overrides clear and state becomes Pure Imperial.
   * **Test 6: Case C Preset Switch.** In Mixed Imperial mode, trigger `handleModeClick(0)`. Verify `globalMode` becomes `0`, all overrides clear, and state becomes Pure Metric.
   * **Test 7: Percentage Invariant.** Toggle `step1_conversion_efficiency`. Verify it switches to `fraction` and counts as an override. Toggle again; verify it returns to `%` and clears override.
   * **Test 8: Sparse Serialization & Hydration Sanitization.** Verify `localStorage` payload contains only valid fields and unexpected keys are cleanly purged.
2. Run project verification commands:
   * `npx eslint frontend/script.js frontend/constants.js`
   * `npm run build`

---

## 4. Rollback Plan
If any regressions occur during implementation:
* Revert staged edits via `git checkout -- frontend/constants.js frontend/script.js frontend/src/partials/`.
* Reinstate previous unit preference coordinator methods from Git history.
