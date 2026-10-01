# Architecture Decision Record (ADR): Malt Entry Table UI & Allocation Engine

---

## Status
**Accepted / Finalized Specification**

---

## 1. Context & Problem Statement

Formulating a grain bill within a recipe creation wizard is fundamentally a proportional process. Traditional brewing data tables often suffer from several user experience and data integrity failure modes:

* Forcing direct entry of absolute weights early in recipe formulation, rather than reasoning in relative proportions.

* Tight coupling to external malt catalogs, causing historical recipes to silently drift when catalog ingredients are modified, renamed, or deleted.

* Screen clutter from exposing specialized mash-chemistry and physical metrics (distilled mash pH, buffer index, moisture content) across the main grid.

* Awkward interaction flows involving nested modal dialogs or vertical accordion rows that distort table alignment.

* Horizontal scroll traps within modal dialogs that disorient users and detach summary footers from table columns.

This document establishes the authoritative UI requirements, state machine invariants, data contracts, and calculation behaviors for the Malt Entry Table component.

---

## 2. Architectural Decisions & Specifications

### 2.1 UI Topology & View States

The component operates across two coordinated states managed by an Alpine.js state engine:

#### A. Collapsed Static Card (Wizard Step Baseline)
The default presentation embedded directly within the sequential recipe wizard step.

* **Summary Table:** Read-only display of the current grain bill showing Malt Name, Category, Assigned Parts, Computed %, and Color (SRM).

* **Empty State:** When no malts exist, displays a minimal placeholder card: *"No malts added yet. Click 'Configure Malts' to build your grain bill."*

* **Status Validation Badge:** Serves as the visual completion gate for the wizard step:

  * **Balanced (Green):** Total allocation equals strictly $100.0\%$. Badge reads `100.0% Balanced`. Wizard navigation ("Next") is unlocked.

  * **Deficit (Amber):** Allocation is between $0.1\%$ and $99.9\%$. Badge reads `XX.X% (Remaining: YY.Y%)`. Wizard navigation is blocked.

  * **Surplus (Red):** Allocation exceeds $100.0\%$. Badge reads `XX.X% (Excess: +YY.Y%)`. Wizard navigation is blocked.

  * **Unconfigured (Gray):** Zero rows ($0.0\%$). Badge reads `Unconfigured`. Wizard navigation is blocked.

* **Launch Action:** Prominent button (`"Configure Malts"` / `"Edit Grain Bill"`) that clones the committed grain bill into the Alpine modal draft store and opens the Modal Editor.

#### B. Modal Editor Workspace (Popped Out)
A focused dialog overlay housing active editing controls, pinned aggregations, and utility drawers.

* **Layout Strategy:** 2-zone spatial layout featuring a **Main Grid Workspace** (left/center) and an anchored **Contextual Utility Drawer** (right).

* **Anti-Pattern Guard:** Rejects nested modal dialogs and inline expandable sub-rows. All detailed searching and field inspection occur strictly inside the slide-out utility drawer.

---

### 2.2 Proportional Allocation Engine: Parts-to-Percentage & Hamilton Algorithm

Direct percentage input is strictly prohibited. The grist allocation model is purely proportional.

#### A. Input Mechanics
* The **Parts** column is the **only** directly editable `<input>` field in the standard table row.

* Users define ratios using arbitrary positive numbers (e.g., `10` parts Base Malt, `1` part Munich Malt, `0.5` parts Crystal 60).

* Decimal parts are supported and parsed dynamically.

#### B. Normalization Pipeline (Hamilton / Largest Remainder)
On every input keystroke, insertion, or deletion, the Alpine engine executes the normalization pipeline:

1. **Calculate Total Parts:**

   $$\text{Total Parts} = \sum_{i=1}^{n} \text{parts}_i$$

2. **Compute Raw Proportions:**

   $$\text{Raw } \%_i = \left( \frac{\text{parts}_i}{\text{Total Parts}} \right) \times 100.0$$

3. **Distribute Whole / Truncated Quotas:**
   Each row is allocated its integer or fixed-precision floor.

4. **Sort and Allocate Remainders:**
   Fractional remainders are ranked in descending order. Rounding residuals are distributed sequentially to the rows with the highest fractional remainders until the sum strictly equals $100.0\%$.

5. **Invariants:**
   * Computed percentages are guaranteed to total exactly $100.0\%$ with zero floating-point drift.
   * If Total Parts $> 0$, the table automatically satisfies the "Balanced" requirement.

---

### 2.3 Data Contract: The Compositor Snapshot Pattern

The recipe table functions as an authoritative compositor snapshot. It retains complete ingredient records rather than runtime foreign-key references to the master catalog.

#### A. Row-Level Data Schema
Each row object stored in the recipe array complies with the following contract:

```json
{
  "row_id": "row_c8f92a10",
  "catalog_id": "amber-malt",
  "is_custom": false,
  "name": "Amber Malt",
  "category": "BASE",
  "parts": 10.0,
  "pct": 80.0,
  "potential_fraction": 0.76,
  "color_srm": 27.0,
  "moisture_pct": 0.04,
  "di_ph": 5.75,
  "buffer_index": 45.0,
  "notes": "Traditional dry-roasted British specialty malt..."
}
```

* `row_id` (String): Unique identifier generated client-side for DOM node tracking.

* `catalog_id` (String | Null): Source catalog identifier. Retained for provenance; set to `null` for scratch-built custom entries.

* `is_custom` (Boolean): Flags whether the ingredient has been detached or cloned from catalog defaults.

* `name` (String): Ingredient label.

* `category` (String): Categorical classification (`BASE`, `CRYSTAL`, `ROASTED`, `SPECIALTY`, `ADJUNCT`).

* `parts` (Number): User-allocated relative parts (the only editable table input).

* `pct` (Number): Read-only calculated output from the Hamilton normalization algorithm.

* `potential_fraction` (Number): Canonical extract yield stored as a decimal fraction (e.g., `0.76` representing 76% dry basis extract).

* `color_srm` (Number): Color rating in SRM.

* `moisture_pct` (Number): Moisture decimal fraction (e.g., `0.04` for 4.0%).

* `di_ph` (Number): Distilled water mash pH rating (e.g., `5.75`).

* `buffer_index` (Number): Buffering capacity metric (e.g., `45.0`).

* `notes` (String): Informational notes, supplier information, or lot harvest dates.

#### B. Canonical Storage vs. Presentation Decoupling
Physical yields and moisture are stored in raw canonical form (`potential_fraction: 0.76`). Alpine computed formatters dynamically convert values for display (e.g., Dry Basis %, PPG points, or Specific Gravity) based on runtime settings without mutating underlying state.

---

### 2.4 Data Grid Layout & Visual Column Budget

To eliminate horizontal scrolling, nested scroll traps, and column misalignments, the active data grid uses a fixed layout (`table-layout: fixed`) engineered to fit standard modal viewports ($750\text{px}$ to $950\text{px}$).

#### Column Budget (7 Columns Total)

* **Malt Name (~28%):** Left-aligned. Text label with an optional `Custom` badge.

* **Category (~14%):** Left-aligned. Visual category badge/tag.

* **Color SRM (~12%):** Right-aligned. Numeric value with adjacent SRM color swatch.

* **Potential (~12%):** Right-aligned. Rendered via dynamic presentation formatter.

* **Parts (~12%):** Right-aligned. **The single editable numeric `<input>` in the row.**

* **Malt % (~12%):** Right-aligned. **Read-only computed output** via Hamilton algorithm.

* **Actions (~10%):** Right-aligned. Action icon cluster (Clone & Edit, Remove).

#### Extended Attributes Off-Grid
Secondary mash and chemistry attributes (`moisture_pct`, `di_ph`, `buffer_index`, `notes`) live inside the row snapshot in memory, but remain off the primary grid. They are accessed and edited exclusively within the Slide-Out Inspector Drawer.

---

### 2.5 Actions Column & Row Mutation Lifecycle

The Actions column contains two operational icon buttons per row:

#### A. Clone & Edit (Inspect) Action
* **Stock Catalog Rows:** Clicking "Clone & Edit" duplicates the row as an independent instance (`is_custom: true`, unique `row_id`, name suffixed with `(Custom)`), appends it to the table, and opens the Inspector Drawer. The master catalog remains untouched.

* **Cloned/Custom Rows:** Clicking the action opens the Inspector Drawer directly for that row.

#### B. Remove Action
* Clicking the trash icon requires an explicit confirmation step (*"Remove [Malt Name] from grain bill? [Cancel] [Remove]"*).

* Upon confirmation:

  * The row is removed from the array.

  * Hamilton percentages and summary totals recalculate immediately across remaining rows.

  * If the removed row is active in the Inspector Drawer, the drawer dismisses automatically.

  * The malt is re-enabled for selection in the Catalog Search Drawer.

---

### 2.6 Contextual Slide-Out Utility Drawer

A single right-hand drawer operating as a mutually exclusive state machine:
* `drawer_mode: null | 'search' | 'inspect'`
* `active_row_id: null | string`

Pressing `Esc` while the drawer is open dismisses the drawer (`drawer_mode = null`) without closing the parent recipe modal.
