# Architecture Decision Record: Parts-to-Percentage Grist Formulation via Hamilton Largest Remainder Algorithm

## Context
Defining major grain bill components requires balancing intuitive user input (relational parts) with absolute mathematical precision (exact 100.0% normalization). Traditional floating-point division leads to rounding drift (e.g., summing to 99.9% or 100.1%), while naive apportionment algorithms suffer from zero-erasure and scale distortion when handling components with wide magnitude disparities.

## Decision
We will adopt the **Parts-to-Percentage Model** paired with the **Hamilton Largest Remainder Algorithm** for Stage 1 (Non-Trace Formulation).

### 1. Algorithmic Pipeline
The Stage 1 formulation grid treats major grain additions as relational proportions rather than fixed percentages or physical weights.
* **Integer Scaling:** Exact proportions are calculated as `(parts / total) * 1000`. By targeting 1000 units, the algorithm evaluates everything in tenths of a percent using whole numbers.
* **Hamilton Largest Remainder:** The system floors the scaled values, calculates the deficit to 1000, and ranks the fractional remainders. It distributes a `+1` unit bump to the highest-ranked remainders until the deficit is closed.
* **Deterministic Tie-Breakers:** If remainders tie, the algorithm breaks the tie by sorting for the largest raw part input (hiding the rounding bump inside the largest mass). If parts also tie, it defaults to the original array index order to prevent UI flickering.
* **Final Output:** The reconciled integers are divided by 10 to yield final, print-ready percentages.

### 2. Validation & UI Mechanics (The 2.0% Trace Floor)
The interface uses the mathematics of the remainder algorithm to physically police the boundary between structural malts and trace additions.
* **Input Constraints:** The "Parts" column is the only editable numeric field and is restricted strictly to positive integers. Negative numbers, zeros, and fractions are instantly floored or clamped to 1.
* **The 2.0% Trace Floor:** A strict 2.0% minimum threshold acts as the gatekeeper. The table calculates the normalized percentage on every keystroke.
* **Reactive Visual Feedback:**
  * If a row's calculated share is $\ge 2.0\%$, the read-only percentage cell renders with green styling and a unicode checkmark (`✓`).
  * If a row drops $< 2.0\%$, the cell immediately shifts to red styling, displays a cross (`✗`), and surfaces inline helper text instructing the user to move the ingredient to the trace additions table.
* **Stage 2 Lockout:** The system blocks downstream handoff to the master sugar equation until all rows in the formulation grid pass the 2.0% validation check.

## Rationale
This architecture provides intuitive grist formulation for brewers while guaranteeing floating-point immunity, zero drift, and strict adherence to our Two-Tier Grist Architecture. By enforcing the 2.0% trace floor, we protect the Hamilton algorithm from extreme scale distortion and ensure trace components are correctly relegated to physical mass space (Table 2).
