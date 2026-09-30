# Implementation Plan: Equipment Profiles Backend & Step 1 UI

## Background & Motivation

In brewing physics and the Directed Acyclic Graph (DAG) calculation sequence defined in `docs/calculator-domain-model.md` and `plans/master-frontend-ui-requirements.md`, **Step 1: Equipment Profile** forms the physical foundation. All downstream calculations—strike water volume, sparge runoff partitions ($V_1$, $V_2$), kettle capacity checks, boil-off concentration, and grain absorption losses—depend directly on the hardware constants established here.

This plan delivers the Tier 2 Equipment Profile subsystem:
1. Backend schema definitions, seed profiles, local JSON-backed repository persistence, and protected REST API endpoints.
2. Frontend integration featuring the first step of the 12-step accordion wizard (Step 1: Equipment Profile), synthesized capacity/loss summary cards, and an integrated profile management drawer/modal.
3. Clean metric-first numeric input controls with unit indicators ($L$, $L/\text{hr}$, $L/\text{kg}$, $\%$) laying the groundwork for the full `UnitInput` conversion engine.

---

## Architectural Scope & Boundaries

### Backend Boundaries (Strict Tach Adherence)
* **`app.schemas`**: Add `EquipmentProfile` and response models in `app/schemas/templates.py` or `app/schemas/models.py`. Has 0 internal dependencies.
* **`app.seeds`**: Add `equipment_profiles.json` and seed loader functions in `app/seeds/__init__.py`. Depends only on `app.schemas`.
* **`app.repositories`**: Add `app/repositories/equipment.py` to manage loading seed presets and persisting custom profiles to local JSON storage. Depends on `app.schemas` and `app.seeds`.
* **`app.service`**: Add business logic in `app/service/logic.py` for profile retrieval, validation, and persistence. Depends on `app.repositories` and `app.schemas`.
* **`app.main`**: Expose protected FastAPI routes (`/api/equipment-profiles`). Depends on `app.service`, `app.schemas`, `app.database`, and `app.auth`.

### Frontend Architecture (Zero-Build Vanilla Stack)
* **Design System Tokens (`tokens.css`)**: Utilize existing semantic tokens (`--sys-surface-default`, `--sys-border-subtle`, `--sys-color-action-primary`).
* **Modular Stylesheet (`style.css`)**: Implement Accordion components (`.step-card`, `.accordion-trigger`), Container Queries (`.step-card`), 2-Column Grid (`.step-grid-2col`), Synthesized Metric Strips (`.synthesized-card`, `.metric-strip`), and Slide-Over Drawer (`.drawer-backdrop`, `.drawer-panel`).
* **Alpine.js Stores & Components (`script.js`)**:
  * `Alpine.store('equipment')`: Manages available profiles fetched from `/api/equipment-profiles`, handles CRUD operations, and caches presets.
  * `Alpine.data('wizard')`: Implements the 12-step wizard state machine with active `manifest.equipment`, step status tracking (`activeStep`, `completedSteps`, `highWaterMark`), dynamic synthesized metric calculations, and step navigation.
* **Declarative Template (`index.html`)**: Incorporates Step 1 Accordion Card with WAI-ARIA compliance (accessible triggers, `aria-controls`, `role="region"`, `hidden` panel states) and the profile management drawer.

---

## Phased Implementation Plan

### Phase 1: Backend Data Model, Seeds & Local Persistence

1. **Schema Definition (`backend/app/schemas/templates.py`)**:
   Define `EquipmentProfile` matching the domain model:

   * `id`: Unique slug identifier (e.g. `herms-30l`).
   * `name`: Display name (e.g. `30L 3-Vessel HERMS`).
   * `description`: Optional text description.
   * `max_kettle_volume_l`: Max capacity of boil kettle in Liters.
   * `max_mash_tun_volume_l`: Max capacity of mash tun in Liters (used to guard against mash overflow: $V_{\text{strike}} + M \times 0.68\text{ L/kg} \le V_{\text{mash\_tun\_max}}$).
   * `max_hlt_volume_l`: Max capacity of hot liquor tank in Liters (initial fill baseline for HERMS underletting).
   * `hlt_min_volume_l`: Minimum volume required to submerge HERMS heat exchanger coil in Liters.
   * `mash_dead_space_l`: Plumbing/undrainable volume in mash tun ($L$).
   * `trub_loss_l`: Post-boil kettle trub sediment loss ($L$).
   * `boil_off_rate_l_per_hr`: Evaporation rate ($L/\text{hr}$).
   * `grain_absorption_factor_l_per_kg`: Grain absorption constant (default $0.96\text{ L/kg}$).
   * `conversion_efficiency`: Mash conversion efficiency (default $0.95$, i.e. $95\%$).
   * `shrinkage_pct`: Wort cooling contraction fraction (default $0.04$, i.e. $4\%$).
   * `is_custom`: Boolean flag indicating user-created vs canonical seed profile.

   **HERMS Underletting & Vessel Coverage Model:**
   * On initial strike, water is underlet from the HLT (starting at $\text{max\_hlt\_volume\_l}$).
   * Post-strike HLT residual:
     $$V_{\text{hlt, post-strike}} = \text{max\_hlt\_volume\_l} - V_{\text{strike}}$$
   * Combined baseline requirement for both HERMS coil coverage and sparging:
     $$V_{\text{hlt, required}} = \max(V_2, \text{hlt\_min\_volume\_l})$$
   * Top-up volume required post-strike:
     $$V_{\text{top-up}} = \max(0.0, V_{\text{hlt, required}} - V_{\text{hlt, post-strike}})$$
   * Final active HLT volume (treated with brewing salts & acid):
     $$V_{\text{treat, sparge}} = V_{\text{hlt, post-strike}} + V_{\text{top-up}}$$
   * Surplus liquor left in HLT after sparge:
     $$V_{\text{residual}} = V_{\text{treat, sparge}} - V_2$$

   **Physical Boundary & Insufficient $V_2$ Error Checks:**
   * **Error 1: Sparge Runoff Exceeds HLT Capacity ($V_2 > \text{max\_hlt\_volume\_l}$):**
     * *Severity:* Critical Blocking Error.
     * *Trigger:* When solved sparge volume $V_2$ exceeds the maximum physical capacity of the HLT.
     * *Remediation Guidance:* Increase strike liquor-to-grist ratio (shift volume into $V_{\text{strike}}$), reduce target batch volume, or configure a multi-stage sparge.
   * **Error 2: Top-Up Exceeds HLT Capacity ($V_{\text{treat, sparge}} > \text{max\_hlt\_volume\_l}$):**
     * *Severity:* Critical Blocking Error.
     * *Trigger:* When the volume required to submerge coils or satisfy $V_2$ would overflow the HLT.
   * **Warning 1: Post-Strike $V_2$ Deficit ($V_{\text{hlt, post-strike}} < V_2$):**
     * *Severity:* Actionable Warning.
     * *Trigger:* Residual HLT water is insufficient to fulfill $V_2$ without topping up.
     * *Action:* Prompts brewer with the exact top-up volume required ($V_{\text{top-up}}$) before heating sparge liquor.
   * **Warning 2: Mash Tun Overflow ($V_{\text{strike}} + M \times 0.68\text{ L/kg} > \text{max\_mash\_tun\_volume\_l}$):**
     * *Severity:* Critical Blocking Error.
     * *Trigger:* Combined grain displacement and strike liquor volume exceeds mash vessel brim.

2. **Canonical Seed Data (`backend/app/seeds/equipment_profiles.json`)**:
   Provide 4 industry-standard starter hardware profiles:

   * `30L 3-Vessel HERMS`:
     * Kettle Max: 38L, Mash Tun Max: 38L, HLT Max: 38L, HLT Min (Coil): 12L.
     * Dead Space: 1.5L, Trub: 2.0L, Boil-off: 3.5L/hr, Absorption: 0.96 L/kg, $C_e$: 95%.
   * `50L 3-Vessel HERMS`:
     * Kettle Max: 60L, Mash Tun Max: 60L, HLT Max: 60L, HLT Min (Coil): 18L.
     * Dead Space: 2.0L, Trub: 3.0L, Boil-off: 4.5L/hr, Absorption: 0.96 L/kg, $C_e$: 95%.
   * `35L Electric All-In-One BIAB`:
     * Kettle Max: 35L, Mash Tun Max: 35L, HLT Max: 0L, HLT Min (Coil): 0L.
     * Dead Space: 0.0L, Trub: 1.5L, Boil-off: 3.0L/hr, Absorption: 0.90 L/kg, $C_e$: 90%.
   * `20L Stovetop / Cooler Mash`:
     * Kettle Max: 24L, Mash Tun Max: 25L, HLT Max: 20L, HLT Min (Coil): 0L.
     * Dead Space: 0.8L, Trub: 1.0L, Boil-off: 2.5L/hr, Absorption: 0.96 L/kg, $C_e$: 95%.

3. **Seeds Loader (`backend/app/seeds/__init__.py`)**:
   Add cached loader `load_seed_equipment_profiles()` and lookup `get_seed_equipment_profile_by_id(id)`.

4. **Repository Implementation (`backend/app/repositories/equipment.py`)**:
   Provide local JSON persistence for user-created profiles (`custom_equipment_profiles.json`):

   * `list_equipment_profiles() -> list[EquipmentProfile]`: Merges canonical seeds with saved custom profiles.
   * `get_equipment_profile(profile_id: str) -> EquipmentProfile | None`.
   * `save_equipment_profile(profile: EquipmentProfile) -> EquipmentProfile`: Validates and persists custom profile to local JSON storage.
   * `delete_equipment_profile(profile_id: str) -> bool`: Deletes custom profile (canonical seeds are protected from deletion).

5. **Service Layer (`backend/app/service/logic.py`)**:
   Expose service functions coordinating validation and repository calls:

   * `get_all_equipment_profiles()`
   * `save_equipment_profile(profile_data)`
   * `delete_equipment_profile(profile_id)`

6. **FastAPI Endpoints (`backend/app/main.py`)**:

   * `GET /api/equipment-profiles`: Returns list of all available profiles. Requires authenticated user.
   * `POST /api/equipment-profiles`: Creates or updates a custom equipment profile. Requires authenticated user.
   * `DELETE /api/equipment-profiles/{profile_id}`: Deletes a custom profile. Requires authenticated user.

7. **Backend Automated Tests (`backend/tests/test_equipment.py`)**:

   * Test seed profile loading and validation against Pydantic model.
   * Test `GET /api/equipment-profiles` authenticated request returns full catalog.
   * Test `POST /api/equipment-profiles` saves a valid profile and validates inputs.
   * Test `DELETE /api/equipment-profiles/{id}` deletes custom profile and prevents deleting canonical seeds.
   * Test unauthorized requests return 401/403.

---

### Phase 2: Frontend Styling & Layout Foundations

1. **Step Card & Accordion Styles (`frontend/style.css`)**:

   * Implement `.step-card` with container queries (`container-type: inline-size`).
   * Implement semantic states: `.is-active`, `.is-completed`, `.is-locked`, `.is-dirty`.
   * Implement `.accordion-trigger` with 44px minimum touch height, keyboard focus ring, and status badge pill.
   * Implement `.step-grid-2col` for fluid responsive input fields.
   * Implement input group styling with static metric unit attachments (`L`, `L/hr`, `L/kg`, `%`).

2. **Synthesized Output Card Styles (`frontend/style.css`)**:

   * Implement `.synthesized-card` showing vessel capacities, fixed losses, and visual summary.
   * Implement `.metric-strip` with monospaced tabular numerals (`font-variant-numeric: tabular-nums`).

3. **Master-Detail Drawer Styles (`frontend/style.css`)**:

   * Implement `.drawer-backdrop` and `.drawer-panel` for smooth slide-over presentation.
   * Implement list view, form editor, action buttons (`Save`, `Delete`, `Cancel`), and error/success alerts.

---

### Phase 3: Frontend State Management & Step 1 Integration

1. **Equipment Alpine Store (`Alpine.store('equipment')` in `frontend/script.js`)**:

   * State: `profiles: []`, `loading: false`, `error: null`.
   * Methods:
     * `fetchProfiles()`: Invoked upon authentication to populate profile selector.
     * `saveProfile(payload)`: Dispatches `POST /api/equipment-profiles` and updates local store.
     * `deleteProfile(id)`: Dispatches `DELETE /api/equipment-profiles/{id}`.

2. **Wizard Alpine Component (`Alpine.data('wizard')` in `frontend/script.js`)**:

   * Initializes wizard state following Section 7.1 of master requirements:
     * `activeStep: 1`
     * `completedSteps: []`
     * `highWaterMark: 1`
     * `manifest.equipment`: Active working copy of equipment properties.
     * `isCustomModified`: Tracks whether active parameters differ from selected profile preset.
   * Computed getters:
     * `fixedSystemLoss`: $\text{mash\_dead\_space\_l} + \text{trub\_loss\_l}$ ($L$).
     * `hourlyEvaporation`: $\text{boil\_off\_rate\_l\_per\_hr}$ ($L/\text{hr}$).
   * Actions:
     * `selectProfile(profileId)`: Copies preset values into `manifest.equipment`.
     * `markStepComplete(stepNumber)`: Validates Step 1, records completion, advances `highWaterMark` and `activeStep`.
     * `openProfileDrawer()` / `closeProfileDrawer()`.

3. **Markup & Accessibility (`frontend/index.html`)**:

   * Replace placeholder content in the authenticated workspace with the Wizard container.
   * Render Step 1 Card with accessible WAI-ARIA accordion markup:
     * `<button class="accordion-trigger" :aria-expanded="activeStep === 1" aria-controls="step-panel-1" @click="setActiveStep(1)">`
     * Panel container `id="step-panel-1" role="region" aria-labelledby="step-trigger-1"` with `x-show="activeStep === 1"`.
   * Render profile selector `<select>` allowing quick selection of saved profiles + "Custom" option.
   * Render inputs for all 10 hardware parameters with metric labels:
     * Vessel Capacities: `max_kettle_volume_l`, `max_mash_tun_volume_l`, `max_hlt_volume_l`, `hlt_min_volume_l`.
     * Losses & Efficiencies: `mash_dead_space_l`, `trub_loss_l`, `boil_off_rate_l_per_hr`, `grain_absorption_factor_l_per_kg`, `conversion_efficiency`, `shrinkage_pct`.
   * Render Synthesized Output Card displaying:
     * Vessel capacity strip (Kettle, Mash Tun, HLT limits, HERMS coil floor).
     * Fixed mechanical loss total ($\text{mash\_dead\_space\_l} + \text{trub\_loss\_l}$).
     * Hourly boil-off rate.
   * Render "Next: Batch Metadata" button to mark Step 1 complete.
   * Render Slide-Over Drawer for full profile CRUD.

---

## Verification & Acceptance Criteria

* **Tach Rule Verification**: `uv run tach check` passes with 0 dependency violations.
* **Backend Test Suite**: `uv run pytest` passes 100% of tests including new equipment profile tests.
* **API Verification**:
  * Unauthenticated requests to `/api/equipment-profiles` receive 401.
  * Authenticated requests receive 200 with all canonical seed profiles.
  * Adding and deleting a custom profile persists correctly and reflects immediately.
* **Frontend Accessibility & UI Verification**:
  * Accordion trigger conforms to WAI-ARIA with correct `aria-expanded` and keyboard navigation (`Enter`/`Space`).
  * Inputs enforce tabular figures without layout jitter.
  * Modifying parameters updates synthesized loss totals dynamically.
  * Selecting a preset automatically populates form fields; editing fields flags custom state.
  * Dark mode reflows seamlessly via `tokens.css` with 0 styling regressions.
