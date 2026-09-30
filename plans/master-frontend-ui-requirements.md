# Master Frontend UI Requirements Specification
**Single Source of Truth for the Compositor Wizard UI Architecture**

---

## 1. Executive Summary & Architectural Scope

This specification defines the exhaustive front-end UI/UX architecture and functional requirements for the **Batch Brewing Calculator**. It synthesizes the foundational domain physics and Directed Acyclic Graph (DAG) math pipeline from `calculator-design-spec.pdf` with the responsive, accessible, token-driven design system from `SPA Wizard UI Design Plan - Google Docs.md`.

### 1.1 Core Technology Boundaries
* **Architecture:** Zero-build, static Single Page Application (SPA) deployed to Firebase Hosting, consuming a headless FastAPI backend over a unified origin (`/api/**`).
* **State & Reactivity:** **Alpine.js (v3)** exclusively governs Document Object Model (DOM) reactivity, component state, and the presentation Finite State Machine (FSM).
* **Styling & Layout:** **Modular Vanilla CSS** (`tokens.css` and `style.css`) driven entirely by CSS Custom Properties, CSS Container Queries (`@container`), and native fluid functions (`clamp()`).
* **Toolchain Constraints:** Strictly zero build tools. No `package.json`, `npm`, `npx`, bundlers, or CSS preprocessors. All external dependencies (Alpine.js, Firebase Auth Compat SDK) load via trusted Content Delivery Networks (CDNs).
* **Decoupled Separation of Concerns:** JavaScript **never** applies inline styling or framework-specific utility strings for dynamic presentation. JavaScript manages semantic state classes (`.is-active`, `.is-completed`, `.is-locked`, `.is-dirty`), while the CSS engine drives all visual rendering, transitions, and hardware-accelerated animations.

### 1.2 The Tripartite Compositor Hierarchy
The UI models complex calculation flows not as static web forms, but as an interactive visual compositor structured across three distinct layers:

1. **Primitives (Tier 1 Inputs):** Indivisible ingredient entities (Malts, Hops, Yeast, Sugars) selected from library caches, carrying immutable physical properties (extract potentials, alpha acids, attenuation). Rendered with subtle visual weight until selected.
2. **Blocks (Tier 2 Aggregations & Steps):** Discrete interactive surfaces realized as collapsible cards within a sequential accordion. Each block represents an independent step in the brewing DAG, encapsulating local validation and presentation state.
3. **Synthesized Outputs (Terminal Presentation):** Real-time, math-derived results (Target OG, IBU, Mash pH, Strike/Sparge Volumes, SRM Color). Synthesized outputs are visually elevated via high-contrast typography, distinctive surface elevations, and dedicated summary metric cards.

---

## 2. Design System & CSS Token Architecture

The design system operates on a strict, mathematically driven three-tier token hierarchy declared within `:root` in `frontend/tokens.css`.

### 2.1 The Three-Tier Token Taxonomy

```
[ Tier 1: Primitive Tokens ]   --> Raw immutable values (e.g., --color-indigo-600, --text-base)
          │
          ▼
[ Tier 2: Semantic Tokens ]    --> Functional intent (e.g., --sys-color-action-primary, --sys-surface-canvas)
          │
          ▼
[ Tier 3: Component Tokens ]   --> Scoped element properties (e.g., --cmp-card-border, --cmp-accordion-trigger)
```

| Token Tier | Architectural Scope | Naming Convention | Example |
| :--- | :--- | :--- | :--- |
| **Primitive** | Defines absolute raw scales (neutrals, accents, font stacks, radii). | `--color-[palette]-[stop]` | `--color-slate-900: #0f172a;` |
| **Semantic** | Defines functional UI roles mapped to primitive tokens. | `--sys-[category]-[role]` | `--sys-surface-default: #ffffff;` |
| **Component** | Scoped application of semantic tokens to specific elements. | `--cmp-[element]-[property]` | `--cmp-step-card-active-border: var(--sys-color-action-primary);` |

### 2.2 The 60-30-10 Spatial Color Rule
To minimize cognitive fatigue across data-dense calculation screens, color distribution follows a strict mathematical ratio:
* **60% Dominant Canvas (`--sys-surface-canvas`):** Neutral page background providing visual breathing room.
* **30% Secondary Surfaces (`--sys-surface-default`, `--sys-surface-elevated`):** Surface backgrounds for cards, accordion blocks, tables, and modal dialogs.
* **10% High-Visibility Accents (`--sys-color-action-primary`, `--sys-color-success-accent`, etc.):** Reserved strictly for interactive triggers, focus rings, progress indicators, and critical synthesis highlights.

### 2.3 First-Class Dark Mode Architecture
Dark mode is implemented natively without JavaScript intervention via `@media (prefers-color-scheme: dark)`. It complies with three fundamental structural rules:

1. **Elevation via Progressive Lightness:** In dark mode, shadows are imperceptible. Elevation is communicated by progressively illuminating surfaces closer to the user:
   * Canvas (Base): `#0b1120` (Dark Slate)
   * Surface Layer 1 (Cards, Headers): `#1e293b` (Slate 800)
   * Surface Layer 2 (Active Accordion, Modals, Popovers): `#293548` (Elevated Slate)
2. **Glare Elimination:** Pure black (`#000000`) and pure white (`#ffffff`) are strictly prohibited. Canvas backgrounds use soft dark slates, and primary text uses high-opacity off-white (`#f8fafc`) to eliminate ocular fatigue and contrast halation.
3. **Desaturated Accents:** Saturated brand colors cause visual vibration on dark backgrounds. Semantic action and status tokens are remapped to softer pastel equivalents (e.g., Indigo primary shifts from `#4f46e5` to `#6366f1`).

### 2.4 Dynamic Brewing Color Tokens (SRM Scale)
The visual engine maps calculated beverage color (Standard Reference Method - SRM) directly to dynamic CSS variables. The Alpine state machine evaluates the Morey equation:
$$\text{SRM} = 1.4922 \times (\text{MCU})^{0.6859}$$
The calculated value updates an inline CSS variable (e.g., `style="--calculated-srm-color: var(--color-srm-15);"`), driving an immediate, hardware-accelerated preview of the final beer color swatch.

### 2.5 Typography, Modular Scaling & Numeric Alignment
* **Fluid Scaling:** Typography scales continuously across viewport sizes using CSS `clamp()`:
  * Small / Micro: `clamp(0.75rem, 0.72rem + 0.15vw, 0.8125rem)`
  * Base / Body: `clamp(1rem, 0.96rem + 0.2vw, 1.0625rem)`
  * Macro / Header: `clamp(1.125rem, 1.05rem + 0.35vw, 1.25rem)`
* **Modular Ratio:** Font sizing follows a $1.250$ modular ratio to establish rhythmic visual hierarchy between instruction copy and input tables.
* **Tabular Numerals Mandate:** All numeric inputs, data tables, volume calculations, and financial/density outputs **must** declare:
  ```css
  font-variant-numeric: tabular-nums;
  ```
  This forces monospaced character glyphs for digits, preventing horizontal layout jitter as the state machine continuously recalculates values during user entry.

### 2.6 Layout Orchestration via CSS Container Queries
Because accordion blocks must reflow gracefully whether embedded in full-screen desktop views or constrained sidebars, responsive reflows rely on CSS Container Queries:
```css
.step-card {
  container-type: inline-size;
}

@container (max-width: 600px) {
  .step-grid-2col {
    grid-template-columns: 1fr;
  }
  .decoupled-metric-strip {
    flex-direction: column;
  }
}
```

---

## 3. Universal Unit Presentation Engine (`UnitInput`)

To satisfy the **Data Normalization** pillar from `calculator-design-spec.pdf`, the system strictly separates mathematical calculation from user presentation.

### 3.1 The Absolute Metric Base Mandate
All persistent data entities in Firestore, backend API payloads, and internal Alpine calculations operate **exclusively** in standard metric base units:

* **Mass:** Kilograms ($kg$)
* **Volume:** Liters ($L$)
* **Extract / Gravity:** Specific Gravity ($SG$, e.g., $1.054$) and extract yield fractions ($0.0 - 1.0$)
* **Temperature:** Celsius ($^\circ C$)
* **Ion Concentration:** Milligrams per Liter ($mg/L$ or $ppm$)

Imperial units (Gallons, Pounds, Ounces, Fahrenheit, Plato) **never** enter the core math pipeline. They exist strictly within the UI presentation boundary.

### 3.2 The Master Dictionary Configuration
A centralized client-side dictionary defines domain conversion factors:
```javascript
const UNIT_REGISTRY = {
  mass: {
    base_unit: 'kg',
    units: {
      kg: { label: 'kg', factor: 1.0, precision: 3 },
      g:  { label: 'g',  factor: 0.001, precision: 1 },
      lb: { label: 'lb', factor: 0.45359237, precision: 2 },
      oz: { label: 'oz', factor: 0.028349523, precision: 2 }
    }
  },
  volume: {
    base_unit: 'L',
    units: {
      L:   { label: 'L',   factor: 1.0, precision: 2 },
      ml:  { label: 'mL',  factor: 0.001, precision: 0 },
      gal: { label: 'gal', factor: 3.785411784, precision: 2 },
      qt:  { label: 'qt',  factor: 0.946352946, precision: 2 }
    }
  },
  temperature: {
    base_unit: 'C',
    units: {
      C: { label: '°C', to_base: (v) => v, from_base: (v) => v, precision: 1 },
      F: { label: '°F', to_base: (v) => (v - 32) * (5/9), from_base: (v) => (v * (9/5)) + 32, precision: 1 }
    }
  },
  gravity: {
    base_unit: 'SG',
    units: {
      SG:    { label: 'SG',    to_base: (v) => v, from_base: (v) => v, precision: 3 },
      Plato: { label: '°P',    to_base: (p) => 1 + (p / (258.6 - (p/258.2) * 227.1)), from_base: (sg) => (-1 * 616.868) + (1111.14 * sg) - (630.272 * Math.pow(sg, 2)) + (135.997 * Math.pow(sg, 3)), precision: 1 }
    }
  }
};
```

### 3.3 Three-Tier Unit Fallback Resolution
When rendering any numerical input field, the unit is resolved via a strict fallback order:
```
[ 1. Field-Specific Override ]   (e.g., Grain Bill line item set specifically to "oz")
             │  (if undefined)
             ▼
[ 2. Domain-Specific Override ]  (e.g., all Mass fields set to "lb")
             │  (if undefined)
             ▼
[ 3. Global Preference / Base ]  (e.g., User Profile defaults, defaulting to Master Metric Base)
```

### 3.4 The Resolution Lifecycle
1. **Resolution:** The component inspects the active unit preference for its assigned field or domain.
2. **Render (Read):** The component receives the absolute base value (e.g., $0.150\text{ kg}$) from the Alpine FSM, converts it to display units ($0.150 / 0.001 = 150$), and renders the input with the appropriate unit label (`g`).
3. **Mutation (Write):** The user types a new value (e.g., $200$).
4. **Translation:** The component intercepts the input event, converts the display value back to base metric ($200 \times 0.001 = 0.200\text{ kg}$).
5. **Dispatch:** The normalized metric base value ($0.200\text{ kg}$) is written to the Alpine state store, triggering downstream DAG recalculations.

### 3.6 Reactive Unit Store & Backend Persistence Pattern
To support seamless per-field and per-domain unit customization across sessions without sacrificing UI performance:
* **Alpine Reactive Store (`Alpine.store('units', ...)`):** All unit preferences are held in a centralized reactive store, making every `UnitInput` component instantly reactive across all wizard steps and modals.
* **Startup Hydration:** Upon initial application authentication and bootstrap, the store fetches the user's unit preference map from their Firestore profile document (with a robust fallback to `localStorage` or default metric base).
* **On-Change Background Synchronization:** When a user toggles a unit on any field or domain (e.g., switching hop mass from `g` to `oz`), the store immediately updates local UI reactivity and triggers a lightweight asynchronous background request (`PATCH /api/user/preferences`) to persist the preference map, ensuring cross-device continuity for infrequent preference updates.
* **Global Toggle vs. Granular Overrides (Option C):** When a user triggers the global master unit toggle (e.g., switching between Metric and US Imperial), the store checks for active per-field custom overrides (`is_customized: true`). If overrides exist, a lightweight clarification prompt is surfaced offering two distinct actions:
  1. **"Apply to All":** Overwrites custom modifications, resetting all domains to the selected global preset.
  2. **"Update Unmodified Only":** Preserves intentional custom overrides (e.g., maintaining hop mass in grams) while updating all unmodded domains to the new preset.


---

## 4. The 12-Step Progressive FSM Solver Sequence (The Accordion)

The primary calculation workspace is a progressive 12-step accordion that functions as the visual gateway for the physics Directed Acyclic Graph (DAG). 

```
[ Step 1: Equipment Profile ]
              │
              ▼
[ Step 2: Batch Metadata (Target OG, Vol, Boil Time) ]
              │
              ▼
[ Step 3: Grain Bill (%) & Conversion Efficiency ]
              │
              ▼
[ Step 4: Late Additions (Deduct raw sugar gravity points) ]
              │
              ▼
[ Step 5: Mash Profile (Time & Temp schedules) ]
              │
              ▼
[ Step 6: Master Solver (Root-finder: Total Grain Mass, V_strike, V1, V2) ] ◄── Critical Solver Node
              │
              ▼
[ Step 7: Water Chemistry (HERMS Treatment Volumes, Salts, Mash pH) ]
              │
              ▼
[ Step 8: Wet Hops (Tinseth IBU via Pre-boil Vol & Gravity) ]
              │
              ▼
[ Step 9: Yeast Selection (Attenuation, Predicted FG & ABV) ]
              │
              ▼
[ Step 10: Fermentation Schedule (Post-boil Time & Temp) ]
              │
              ▼
[ Step 11: Dry Hops (Mass via Target Volume, Bound to Phase) ]
              │
              ▼
[ Step 12: Detailed Plan & Brew Day Ledger ] ──(Freeze to Vault)──► [Immutable Brew Log]
```

### 4.1 Accordion State Model & Interaction Rules
* **Mutually Exclusive Expansion:** During active recipe configuration (Steps 1–11), only **one** block is expanded at a time. Activating a block automatically collapses the previous block.
* **Concurrent Review Mode:** When Step 12 is unlocked or when the recipe is marked complete, the user can toggle "Review Mode," permitting multiple or all accordion panels to expand simultaneously for holistic cross-referencing.
* **Hardware-Accelerated Animation:** Block expansion and collapse is managed via Alpine's `x-collapse` plugin, smoothly transitioning `max-height` based on runtime `scrollHeight` without jarring layout snaps.
* **Sequential Unlocking (High-Water Mark):** Steps remain locked (`.is-locked`) until all upstream prerequisite inputs satisfy local validation.
* **Cascading Downstream Invalidation ("Dirty" State):** If a brewer modifies an upstream variable (e.g., changing Target OG in Step 2 or modifying Grain Bill in Step 3), all downstream solved panels (Steps 6, 7, 8, 9, 11, 12) immediately transition to an `.is-dirty` state. The UI displays an amber warning indicator informing the user that mathematical values must be re-solved.

---

### 4.2 Detailed Step-by-Step UI Specifications

#### Step 1: Equipment Profile
* **Purpose:** Injects physical hardware constraints, vessel dimensions, and mechanical loss constants.
* **DAG Preconditions:** None (Entry point).
* **Inputs & Controls:**
  * Select saved Profile from Library or custom define.
  * `max_kettle_volume` (`UnitInput`, volume).
  * `max_mash_tun_volume` (`UnitInput`, volume) — Mash vessel overflow limit.
  * `max_hlt_volume` (`UnitInput`, volume) — HLT initial fill capacity for underletting strike water.
  * `hlt_min_volume` (`UnitInput`, volume) — HERMS coil submersion floor.
  * `mash_dead_space` (`UnitInput`, volume) — Unrecoverable wort in mash plumbing.
  * `trub_loss` (`UnitInput`, volume) — Kettle bottom sediment loss.
  * `boil_off_rate` (`UnitInput`, volume per hour).
  * `grain_absorption_factor` (`UnitInput`, L/kg, default $0.96$).
  * `conversion_efficiency` ($C_e$, percentage, default $95\%$).
  * `shrinkage_pct` (Percentage, default $4\%$) — Cooling contraction factor.
* **Synthesized Output:** Visual diagram/summary card showing vessel capacities (Kettle, Mash Tun, HLT, Coil floor) and fixed system loss totals.

#### Step 2: Batch Metadata & Boil Solver
* **Purpose:** Establishes core recipe targets, pre-boil/post-boil checkpoints, boil duration, boil-off rate, and equipment loss bridges.
* **DAG Preconditions:** Step 1 valid.
* **Inputs & Controls:**
  * Batch Name (Text input).
  * **Solver Mode Toggle:**
    * *Option A (Solve Boil-Off Rate):* Pre-boil volume/gravity and post-boil volume/gravity are fixed, yielding the required boil-off rate.
    * *Option B (Solve Post-Boil Volume & Gravity):* Pre-boil volume/gravity, boil-off rate, and boil time are fixed, yielding post-boil volume and Target OG.
  * Pre-Boil Checkpoint: `preboil_volume` (`UnitInput`), `preboil_gravity` (`UnitInput` / SG).
  * Post-Boil & Fermenter Checkpoint: `postboil_volume` (`UnitInput`), `target_og` (`UnitInput`), `boil_time` (minutes), `boil_off_rate` (`UnitInput`, L/hr).
  * Inherited Equipment Losses: Trub Loss (from Step 1) and Cooling Shrinkage (`shrinkage_pct`, e.g. 4%).
* **Mathematical Invariants & Physics Engine:**
  * **Mass Conservation (Boil):** $V_{\text{pre}} \times SG_{\text{pre}} = V_{\text{post}} \times SG_{\text{post}}$
  * **Evaporation:** $V_{\text{pre}} - V_{\text{post}} = \text{Boil-Off Rate} \times \left(\frac{\text{Boil Time}}{60}\right)$
  * **Thermal Contraction (Chilling):** $V_{\text{target}} = (V_{\text{post}} - \text{Trub Loss}) \times (1 - \text{shrinkage\_pct})$
  * **Concentration Adjustment:** Total extract points are conserved across chilling ($V_{\text{post}} \times (SG_{\text{post}} - 1.0) = V_{\text{target}} \times (OG - 1.0)$), ensuring $OG > SG_{\text{post}}$ due to thermal contraction.
* **Synthesized Output:** Target Total Kettle Extract ($S_{\text{kettle}}$ in $\text{L}\cdot\degree$), Pre-boil to post-boil summary cascade, and solver status badge.

#### Step 3: Grain Bill (Proportional %)
* **Purpose:** Defines proportional malt bill ratios and extract potentials.
* **DAG Preconditions:** Step 2 valid.
* **Inputs & Controls:**
  * Dynamic primitive table: Add Malt row from library cache.
  * Columns: Malt Name, Category (Base, Crystal, Roasted, Acid), Potential SG, Color (SRM), Proportional Percentage (`%`).
  * Real-time validator: Live tally tracking total percentage (must equal $100.0\%$).
* **Synthesized Output:** Weighted Average Extract Potential ($P$) and Composite Grist Color.

#### Step 4: Late Additions (Scalar / Adjuncts)
* **Purpose:** Accounts for kettle sugars (Dextrose, Candi Syrup, Honey) added post-mash.
* **DAG Preconditions:** Step 3 valid.
* **Inputs & Controls:**
  * Table of Sugar primitives: Name, Extract Potential, Added Gravity Points (e.g., $10\text{ points}$).
* **Synthesized Output & DAG Deduction:** 
  Deducts late sugar points from Step 2 Target OG to produce the **Adjusted Target Mash Gravity**:
  $$\text{Target OG}_{\text{mash}} = \text{Target OG}_{\text{batch}} - \text{Late Sugar Points}$$
  This ensures mash extraction is not artificially inflated by kettle sugars.

#### Step 5: Mash Profile
* **Purpose:** Configures temperature rests and durations (routed to brew day plan).
* **DAG Preconditions:** Step 4 valid.
* **Inputs & Controls:**
  * Infusion Step Table: Step Name (e.g., Protein Rest, Saccharification, Mash Out), Target Temp (`UnitInput`), Duration (min).
* **Synthesized Output:** Mash Schedule timeline card.

#### Step 6: Master Solver (The Engine)
* **Purpose:** Solves the Master Batch Sparge Equation via backend root-finding (`scipy.optimize.root_scalar`).
* **DAG Preconditions:** Steps 1–5 valid.
* **Solver Control Selector:**
  * **Option A: Lock Liquor-to-Grist Ratio (LGR):** Default $3.0\text{ L/kg}$.
  * **Option B: Lock Runnings Ratio (V1:V2 Split):** Default $50/50$ equal volume split.
* **Action:** "Solve Mash & Extraction" button (dispatches asynchronous API request to `/api/v1/solve/mash`).
* **Synthesized Output Metric Cards:**
  * Total Grain Mass ($M$ in $kg$).
  * Individual resolved malt weights (table showing absolute $kg$ and $\%$).
  * Strike Water Volume ($V_{\text{strike}}$).
  * First Runnings Volume ($V_1$).
  * Sparge Water Volume ($V_2$).
  * Total Pre-Boil Wort Volume ($V_{\text{wort}}$) and Pre-Boil Gravity.
  * Predicted Lauter Efficiency & System Brewhouse Efficiency.

#### Step 7: Water Chemistry & Mash pH
* **Purpose:** Solves mineral salt balancing and automated mash/sparge acidification.
* **DAG Preconditions:** Step 6 solved (grain mass and runnings volumes resolved).
* **Inputs & Controls:**
  * Source Water Profile (Tap or 100% RO).
  * Target Water Profile Selector (or target Sulfate-to-Chloride ratio slider).
  * Target Mash pH input (default $5.40$).
  * Acid Type selector (88% Lactic or 10% Phosphoric).
  * Salt Distribution Mode: "Mash Only" vs "Proportional Strike/Sparge".
* **HERMS Treatment Volume Calculation:**
  * $V_{\text{treat, strike}} = V_{\text{strike}}$
  * $V_{\text{treat, sparge}} = \max(V_2, \text{HLT}_{\text{min\_volume}})$
  * $V_{\text{residual}} = V_{\text{treat, sparge}} - V_2$ (Surplus water flagged for cleaning).
* **Synthesized Output Cards:**
  * Salt additions ledger (Gypsum, $\text{CaCl}_2$, Epsom, Canning Salt in grams).
  * Acid additions ($mL$ for mash strike and sparge water).
  * Predicted Mash pH badge with status color:
    * Optimal ($5.2 - 5.6$): Emerald.
    * Out of range: Amber/Rose alert.
  * Sparge Tannin Warning: Flagged if sparge runnings $pH > 5.8$ without acidification.
  * Surplus HLT Water Flag: Clearly denotes volume of treated water available for CIP.

#### Step 8: Wet Hops (Boil & Whirlpool)
* **Purpose:** Calculates hop weights required to satisfy target bitterness via Tinseth utilization.
* **DAG Preconditions:** Step 6 solved (Pre-boil volume and gravity required).
* **Inputs & Controls:**
  * Hop Schedule Table: Add Hop Primitive (Name, Alpha Acid %, Form).
  * Addition Timing (Boil Time min, Whirlpool min).
  * Bitterness Contribution: Input as target IBUs or percentage of total bitterness.
* **Synthesized Output:** Resolved hop mass ($g$), individual addition IBUs, and cumulative batch IBU tally.

#### Step 9: Yeast Selection & Attenuation
* **Purpose:** Predicts final gravity (FG) and Alcohol by Volume (ABV).
* **DAG Preconditions:** Step 2 (Target OG) and Step 3 (Malt types) configured.
* **Inputs & Controls:**
  * Select Yeast Primitive (Name, Apparent Attenuation %, Alcohol Tolerance).
* **Synthesized Output Cards:**
  * Predicted Final Gravity ($FG$).
  * Predicted ABV ($\%$):
    $$\text{ABV} = (\text{Target OG} - \text{FG}) \times 131.25$$
  * Apparent Attenuation and Alcohol Tolerance safety check badge.

#### Step 10: Fermentation Schedule
* **Purpose:** Establishes temperature stages and duration for cold-side cellar operations.
* **DAG Preconditions:** Step 9 configured.
* **Inputs & Controls:**
  * Phase Table: Phase Name (Primary, Diacetyl Rest, Cold Crash), Target Temp (`UnitInput`), Duration (Days).
* **Synthesized Output:** Interactive Fermentation Timeline.

#### Step 11: Dry Hops
* **Purpose:** Allocates cold-side aroma hops based on finished batch volume.
* **DAG Preconditions:** Step 2 (Target Volume) and Step 10 (Fermentation phases) configured.
* **Inputs & Controls:**
  * Dry Hop Table: Hop Primitive, Dosing Rate (`UnitInput`, $g/L$ or $oz/gal$), Injection Phase (bound to Step 10 phases, e.g., "Day 3 of Primary" or "Cold Crash").
* **Synthesized Output:** Resolved dry hop mass ($g$) and dosing rate summary.

#### Step 12: Detailed Plan & Brew Day Ledger (The Compositor Ledger)
* **Purpose:** Flattens Steps 1–11 into a single, chronological brew day execution timeline.
* **DAG Preconditions:** Steps 1–11 valid.
* **Presentation Format:** Read-only compositor view organized by operational phase:
  1. **Water Preparation:** Strike & Sparge treatment volumes, mineral salts, and acid dosing.
  2. **Mash In:** Strike temp, grist weight, mash rest timers.
  3. **Lauter & Sparge:** Target runoff volumes ($V_1, V_2$), pre-boil gravity check.
  4. **Boil & Hop Additions:** Timed kettle additions, late sugars, chiller sanitization.
  5. **Whirlpool & Transfer:** Whirlpool rests, knockout volume, aeration.
  6. **Cellar & Pitch:** Yeast pitch temp, initial fermentation setpoint.
* **Historical Immutability (The Vault Transition):**
  * Top Action Button: **"Lock Recipe & Transition to Brew Day"**.
  * **The Vault Freeze:** Triggers a copy-on-write snapshot. All foreign key references to global library templates are permanently severed. The resolved physical masses, volumes, and prescriptions are frozen into the batch record.
  * Subsequent updates to library templates will **never** alter this historical brew log.

---

## 5. Responsive Tabular Data & Ledger Presentation

Configuration of primitives (malts, hops, water ions) requires tabular display. Standard HTML tables are inherently resistant to narrow viewports; the following architecture preserves data integrity without sacrificing usability.

### 5.1 Semantic HTML `<table>` vs The ARIA `grid` Anti-Pattern
* **Strict Mandate:** Standard semantic `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, and `<td>` elements **must** be used.
* **Anti-Pattern Rejection:** The application strictly forbids `role="grid"` on standard data ledgers. ARIA `grid` is reserved for spreadsheet apps requiring complex two-dimensional arrow key navigation with roving `tabindex`. Applying `role="grid"` to read/write calculation tables destroys native screen reader announcements and traps keyboard users.

### 5.2 The Horizontal Scroll Paradigm with Sticky Anchor
* Tables reside in an overflow wrapper: `overflow-x: auto;`.
* The primary identifying column (Ingredient Name / Step Title) utilizes:
  ```css
  position: sticky;
  left: 0;
  background-color: var(--sys-surface-elevated);
  z-index: var(--z-sticky);
  box-shadow: 2px 0 4px -2px rgba(0, 0, 0, 0.15);
  ```
* As users scroll horizontally through dense numeric columns, the ingredient name remains anchored, preventing cognitive disorientation.

### 5.3 Decoupled Controls & Metric Extraction
On mobile devices, table headers and summary columns frequently scroll out of view. The architecture mitigates this by decoupling table operations:
1. **Decoupled Sorting UI:** A `<select>` dropdown sits directly **above** the table container (e.g., "Sort by: Percentage | Lovibond | Extract"). Selecting an option triggers Alpine to sort the array and re-render rows without requiring touch interaction with tiny header targets.
2. **Decoupled Metric Cards:** Critical aggregate metrics (e.g., Total Grain Mass, Total IBU, Strike Volume) are extracted from tables and rendered as prominent cards positioned **above** the table. The table below functions purely as a detailed ledger justifying the numbers.

### 5.4 Dynamic Row Iteration with CSS `display: contents`
When rendering dynamic primitive lists with Alpine's `<template x-for="...">`, wrapper tags can distort standard `<tbody>` child hierarchies. Alpine wrappers inside tabular layouts declare:
```css
.alpine-table-wrapper {
  display: contents;
}
```
This guarantees the browser renders the semantic `<tr>` and `<td>` tree cleanly for assistive technologies.

---

## 6. Master-Detail CRUD Factory & Navigation Shell

To prevent calculation workflow bloat, all atomic library management (Tier 1 Primitives and Tier 2 Templates) is isolated into a global Master-Detail CRUD Factory.

### 6.1 Navigation Header Taxonomy
The application header provides global context and navigation:

* **Brand Mark & Application Title:** `Batch Brewing Calculator`.
* **Global Recipe Meta:** Active Recipe Name and status badge (`Draft`, `Brewing`, `Completed`).
* **Library / Settings Drawer Trigger:** "Ingredients & Profiles" button opening the CRUD factory.
* **User Profile & Session Controls:** Authenticated Google avatar/name or Google Sign-In trigger.

### 6.2 Master-Detail CRUD Factory (Slide-Over Drawer / Modal)
Clicking "Ingredients & Profiles" opens an elevated full-height slide-over drawer:

* **Left Pane (Master Roster):**
    * Category Selector:
        * *Ingredients (Primitives):* Malts, Hops, Yeast, Sugars.
        * *Templates:* Equipment Profiles, Water Profiles, Mash Profiles.
    * Search / Filter input.
    * Scrollable list of existing records with "Add New" button.
* **Right Pane (Dynamic Detail Editor):**
    * Selecting a record loads its reactive form.
    * Form inputs use the standardized `UnitInput` wrapper.
    * Validation feedback and Save/Delete actions.
    * Changes saved here immediately update the cached library in the client store.

---

## 7. State Management & Alpine.js Reactive Contracts

### 7.1 Root Wizard Component State Schema
The wizard FSM is initialized at the root of `frontend/index.html` via `Alpine.data('wizard', ...)`:

```javascript
{
  // Presentation FSM State
  activeStep: 1,
  completedSteps: [],
  highWaterMark: 1,
  dirtySteps: [],
  expansionMode: 'exclusive', // 'exclusive' | 'concurrent'
  
  // Working Recipe Manifest (Pointers & Targets)
  manifest: {
    name: 'Untitled Batch',
    equipment_profile_id: null,
    target_volume_l: 20.0,
    target_og: 1.055,
    boil_time_min: 60,
    grain_bill: [],          // [{ malt_id, percentage }]
    late_additions: [],      // [{ sugar_id, gravity_points }]
    mash_profile: [],        // [{ name, temp_c, duration_min }]
    water_profile_id: null,
    hop_schedule: [],        // [{ hop_id, time_min, target_ibu }]
    yeast_id: null,
    fermentation_schedule: [],
    dry_hops: []
  },
  
  // Solved Output State (Populated by Solvers)
  solved: {
    adjusted_target_og: 1.055,
    grain_mass_kg: 0.0,
    grain_weights: {},       // malt_id -> kg
    v_strike_l: 0.0,
    v1_l: 0.0,
    v2_l: 0.0,
    v_pre_boil_l: 0.0,
    pre_boil_gravity: 1.000,
    water_prescription: null,
    predicted_fg: 1.010,
    predicted_abv: 0.0,
    calculated_srm: 0.0
  },
  
  // FSM Action Methods
  setActiveStep(stepNumber) {},
  markStepComplete(stepNumber) {},
  invalidateDownstream(fromStepNumber) {},
  toggleExpansionMode() {},
  async runMasterSolver() {},
  async runWaterSolver() {},
  freezeToVault() {}
}
```

### 7.2 Semantic Class Binding Rules
The state machine dynamically binds semantic classes to step card containers:

* `.is-active`: Applied to the card matching `activeStep`. Triggers expanded height, active border highlight (`--sys-color-action-primary`), and elevated shadow.
* `.is-completed`: Applied to steps in `completedSteps`. Renders a condensed summary bar displaying configured primitives when collapsed.
* `.is-locked`: Applied to steps $> \text{highWaterMark}$. Sets `opacity: 0.5`, `pointer-events: none`, and hides internal controls.
* `.is-dirty`: Applied to downstream solved cards when upstream inputs mutate. Renders an amber border highlight and prompts the user to re-solve.

---

## 8. Accessibility Standards (WCAG 2.2 AA Compliance)

Full adherence to WCAG 2.1 and 2.2 AA is a core architectural mandate.

### 8.1 WAI-ARIA Accordion Semantics
* **Trigger Elements:** Accordion header triggers **must** be native `<button>` elements, enclosed in semantic heading tags (`<h3>`).
* **State Declaration:** The button binds dynamic attributes:
  ```html
  <button 
    type="button"
    class="accordion-trigger"
    :aria-expanded="activeStep === 1"
    aria-controls="accordion-panel-1"
    @click="setActiveStep(1)"
  >
  ```
* **Panel Association:** The collapsible panel container declares `id="accordion-panel-1"` and `role="region"` with `aria-labelledby` referencing the trigger button ID.
* **Accessibility Tree Removal:** When collapsed, the panel declares the HTML `hidden` attribute or `x-show` to ensure non-visible inputs are completely removed from the keyboard tab sequence.

### 8.2 Target Sizing (WCAG 2.5.8 & 2.5.5 AAA)
* **Macro Targets:** All primary navigation triggers, accordion headers, and wizard action buttons enforce a minimum touch target size of **$44 \times 44\text{ CSS px}$**.
* **Micro Targets:** Inline buttons within dense configuration tables (delete row, reorder, unit toggle) enforce a minimum size of **$24 \times 24\text{ CSS px}$**. If visual constraints demand smaller icons ($20\text{px}$), the component enforces an $8\text{px}$ margin perimeter to pass via the WCAG spacing exception.

### 8.3 Contrast & Focus Visibility
* **Text Contrast:** All text content achieves a minimum contrast ratio of **4.5:1** against its surface background under both light and dark themes.
* **Component Boundaries:** Interactive borders (input boxes, checkboxes) maintain at least **3:1** contrast against adjacent backgrounds.
* **Focus Indicators:** Custom focus rings are applied strictly via the `:focus-visible` pseudo-class (2px solid `--sys-border-focus` with 2px offset). This preserves an uncluttered aesthetic for mouse users while providing clear focus indication for keyboard navigation.

### 8.4 Dynamic Feedback via Polite Debounced Live Regions
Calculations continuously update in the background as users adjust sliders or numbers. 

* **Announcements:** The container displaying synthesized metrics declares `aria-live="polite"` and `aria-atomic="true"`. Assistive technology announces recalculated totals only when the user pauses interaction.
* **Debounce Mandate:** All numeric inputs bound to reactive solvers declare a 300–500ms debounce (`x-model.debounce.400ms`) to prevent spamming the screen reader announcement queue during rapid keystrokes or slider drags.
* **Error Handling:** Workflow-blocking validation errors are announced immediately using `aria-live="assertive"`.

---

## 9. Verification & Acceptance Criteria

To confirm that the UI implementation satisfies all domain and architectural requirements, the front-end will be validated against this test matrix:

| Verification Area | Acceptance Criteria |
| :--- | :--- |
| **Modular CSS Architecture** | Zero references to Tailwind CSS CDN or utility class chains. Styles load strictly from `tokens.css` and `style.css`. |
| **Dark Mode Theming** | System automatically shifts between light and dark palettes via `@media (prefers-color-scheme: dark)` without visual glare, clipping, or unreadable contrast. |
| **Data Normalization** | All inputs display user-preferred units, but store and emit normalized metric base values ($kg, L, SG, ^\circ C, ppm$). |
| **FSM DAG Progression** | Steps 1–11 unlock sequentially. Modifying upstream steps marks downstream solved steps `.is-dirty`. |
| **Responsive Tables** | Narrow viewports preserve sticky column identification with horizontal scroll. Sorting and metric totals are accessible above the table. |
| **Master-Detail CRUD** | Primitives and templates can be created, updated, and deleted outside the batch calculation flow. |
| **The Vault Snapshot** | Transitioning a recipe to "Brew Day" permanently severs template pointers, freezing resolved masses/volumes into an immutable ledger. |
| **WCAG 2.2 AA Compliance** | Full keyboard navigation via `Tab`/`Enter`/`Space`; all buttons meet target size rules; live regions announce debounced calculation updates. |
