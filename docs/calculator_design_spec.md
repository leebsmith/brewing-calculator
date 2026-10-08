# Brewing Calculator Architecture & Design Specification

## 1. Core Architectural Pillars

This application is built on a strict, decoupled architecture designed to eliminate circular mathematical dependencies, ensure historical data integrity, and provide a highly fluid user experience. The architecture relies on nine foundational pillars:

### 1.1 Atomic Data Units (The Library)
All physical ingredients and proportional templates exist as independent, normalized entities. They are isolated from one another and contain no logic regarding specific batches. They are managed entirely outside the main brewing workflow.

### 1.2 Relational Compositor (The Assembler)
A "Batch" does not store a bloated list of ingredient data. Instead, it acts as a lightweight manifest. A Batch record stores specific mathematical targets (e.g., Target Volume, Target OG) alongside relational pointers (foreign keys) to the Atomic Data Units required to fulfill those targets.

### 1.3 Directed Acyclic Graph (DAG)
The application's mathematical engine executes as a strict one-way pipeline. By intentionally sequencing the physics—such as deducting raw gravity points for late sugars before executing mash volume calculations, and calculating water chemistry after grain mass is resolved—the DAG completely eliminates the circular reference loops common in brewing software.

### 1.4 Finite State Machine (FSM)
The UI is governed by a state controller that enforces the DAG. Presented as a sequential accordion, the FSM unlocks downstream panels only when upstream mathematical requirements are met. Modifying an upstream variable instantly transitions downstream panels into a "dirty" or collapsed state until recalculated.

### 1.5 Historical Immutability (The Vault)
To protect historical brew logs, the application utilizes a strict state transition during the brewing phase. When a batch moves from "Planning" to "Brewing/Completed," the relational pointers to global templates are permanently severed. The system executes a snapshot (copy-on-write) of the active template data, freezing it into the batch record to ensure future template updates do not corrupt past logs.

### 1.6 Recipe Lineage (Forking Strategy)
Recipes evolve through iteration. When a user wishes to modify a completed batch, the system clones the manifest into a new Draft and records the `Parent_Batch_ID`. This creates a traceable genealogical tree of recipe evolution rather than a flat list of disconnected batches.

### 1.7 Data Normalization
The core database and FSM solvers operate entirely in a single, absolute metric base (e.g., Liters, Kilograms, Specific Gravity/Plato). User-preferred units (Gallons, Ounces, Fahrenheit) never enter the math pipeline; they exist solely as a UI presentation layer.

### 1.8 Unit Registry & Hierarchy
Unit preferences are driven by a JSON configuration mapping rather than hardcoded logic. The system resolves display units via a fallback hierarchy: Field-Specific Override -> Domain-Specific Override -> Global Preference, defaulting to the master registry's base unit.

### 1.9 Inventory Pub/Sub (Event Bus)
The FSM is decoupled from external side effects like inventory management. When a batch state transitions to "Completed," the FSM emits a `Batch_Brewed` event containing the resolved absolute physical weights. External modules (like an inventory tracker) subscribe to this bus to deduct stock silently.

---

## 2. Data Model: Primitives and Templates

The global database is divided into two tiers of atomic data, managed outside the batch workflow.

### 2.1 Tier 1: The Primitives
Immutable physical properties of raw ingredients.

*   **Malts / Grains:** Name, Extract Potential (PPG or $L^{\circ}/kg$), Color (Lovibond/SRM), Type.
*   **Hops:** Name, Alpha Acid %, Form (Pellet, Whole, Liquid).
*   **Yeast Strains:** Name, Apparent Attenuation %, Flocculation, Alcohol Tolerance.
*   **Sugars / Adjuncts:** Name, Extract Potential, Color Contribution.

### 2.2 Tier 2: The Compositor Templates
Proportional formulas and hardware profiles that assemble Primitives into scalable blocks.

*   **Equipment Profiles:** Max Mash/Kettle Volume, Dead Space, Trub Loss, Boil-off Rate, Expected Conversion Efficiency %.
*   **Grain Bills:** Array of [Malt Primitive + Percentage %].
*   **Late Addition Profiles:** Array of [Sugar Primitive + Gravity Points].
*   **Mash Profiles:** Array of [Step Name, Target Temp, Duration].
*   **Water Profiles:** Target Ion concentrations [Ca, Mg, Na, Cl, SO4, HCO3].
*   **Wet Hop Schedules:** Array of [Hop Primitive + % of Target IBU + Boil/Whirlpool Time].
*   **Dry Hop Schedules:** Array of [Hop Primitive + Weight per Volume ($g/L$) + Injection Phase].
*   **Fermentation Schedules:** Array of phases [Phase Name, Target Temp, Duration].

---

## 3. UI Architecture: Menu Bar Taxonomy

To prevent UI bloat, all atomic CRUD operations are housed in a global Menu Bar/Command Palette. This utilizes a Master-Detail "CRUD Factory" layout: a left-pane roster of records and a right-pane dynamic editor.

### 3.1 Menu Bar Taxonomy

*   **Ingredients (Primitives):** Malts, Hops, Yeast, Sugars.
*   **Hot-Side Templates:** Grain Bills, Late Additions, Mash Profiles, Water Profiles, Wet Hop Schedules.
*   **Cold-Side Templates:** Dry Hop Schedules, Fermentation Schedules.
*   **System:** Equipment Profiles, Unit Preferences.

---

## 4. Unit-Aware UI Component

To support the Data Normalization pillar, standard text inputs are replaced with a universal `UnitInput` wrapper component.

### 4.1 The Master Dictionary (JSON)
A static configuration linking physical domains to base units and conversion factors (e.g., `volume.base_unit = L`, `volume.units.gal.to_base = 3.78541`).

### 4.2 The Resolution Lifecycle
When the UI renders a field (e.g., "Dry Hop Weight"):

*   **Resolution:** The component checks the User Preference Map for a field override. If none exists, it checks the domain override, then the global preference.
*   **Render (Read):** The component receives the absolute base value (e.g., 0.150 kg) from the FSM, divides by the chosen unit's `to_base` factor, and displays 150 with a "g" label.
*   **Mutation (Write):** The user inputs 200.
*   **Translation:** The component intercepts the keystrokes, multiplies by the `to_base` factor (0.001), and prepares 0.200 kg.
*   **Dispatch:** The absolute metric value is dispatched to the FSM.

### 4.3 Inline Unit Switching
The unit label (e.g., "g") is an interactive toggle. Clicking it reveals valid alternative units for that domain. Selecting an alternative instantly recalculates the UI display value and updates the User Preference Map, while the underlying FSM base value remains untouched.

---

## 5. The FSM Solver Sequence (The Accordion)

The Batch UI is a progressive accordion that acts as the FSM gateway. It dictates the execution order of the DAG to guarantee mathematical safety.

*   **Step 1: Equipment Profile:** Injects physical hardware constraints, dead space, and boil-off rates.
*   **Step 2: Batch Metadata:** Establishes the core mathematical targets (Target OG, Target Volume, Boil Time).
*   **Step 3: Grain Bill (%):** Injects the proportional malt ratios, extract potentials, and the Expected Conversion Efficiency (a mechanical constant tied to the equipment).
*   **Step 4: Late Additions (Scalar):** Calculates sugar mass based on batch volume. Deducts raw gravity points from the Target OG to generate an adjusted mash target gravity.
*   **Step 5: Mash Profile:** Establishes time and temperature steps (bypasses volume math, routed to final plan).
*   **Step 6: Master Solver (The Engine):** Receives the adjusted Target OG from Step 4. The user locks either the Liquor-to-Grist Ratio (LGR) or the V1:V2 ratio. The bi-directional solver calculates total grain mass, strike volume (V1), and sparge volume (V2).
*   **Step 7: Water Chemistry:** Utilizes the exact grain mass and V1/V2 volumes from Step 6 to calculate ion dilution, buffering capacity, and precise acid/salt additions for mash pH.
*   **Step 8: Wet Hops:** Utilizes the calculated pre-boil gravity and boil volume from Step 6 to run Tinseth utilization, outputting physical hop mass required to hit Target IBUs.
*   **Step 9: Yeast Selection:** Utilizes the original Target OG to calculate apparent attenuation, predicting Final Gravity (FG) and ABV.
*   **Step 10: Fermentation Schedule:** Injects the post-boil time and temperature timeline.
*   **Step 11: Dry Hops:** Utilizes Target Volume to calculate physical mass. Binds timing to the phases established in Step 10.
*   **Step 12: Detailed Plan:** A read-only compositor that flattens Steps 1-11 into a chronological, immutable brew day ledger.