# ADR 0001: Pair-of-Pairs Solver Model

- **Status:** Proposed
- **Date:** 2026-10-07
- **Deciders:** Project maintainer
- **Supersedes:** None
- **Related:** [`docs/master_batch_sparge_eqn.md`](../master_batch_sparge_eqn.md) (math specification)

---

## 1. Context: Current Model & Its Assumptions

The calculator today implements **one** solver and leaves several brewing domains entirely unmodeled. This section documents what exists, what it assumes, and where it is deliberately ignorant.

### 1.1 What Exists

**Boil Solver (implemented).** A generalized 2-DOF solver over six variables:

| Variable | Manifest field | Domain |
| :--- | :--- | :--- |
| $V1$ | `manifest.preboil_volume_l` | volume |
| $G1$ | `manifest.preboil_gravity` | gravity |
| $V2$ | `manifest.postboil_volume_l` | volume |
| $G2$ | `manifest.postboil_gravity` | gravity |
| $R_{boil}$ | `manifest.equipment.boil_off_rate_l_per_hr` | volume |
| $t$ | `manifest.boil_time_min` | time |

The user selects any two as outputs; the solver finds them from the other four. Two constraints govern the system:

- **Volume conservation:** $V1 = V2 + R_{boil} \cdot t$
- **Extract conservation:** $V1 \cdot G1 = V2 \cdot G2$ (in gravity points)

Two output pairs are structurally singular and blacklisted: `R_boil:t` and `G1:G2`.

**Downstream chilling bridge (implemented).** After the boil solve, the calculator derives:

- $V_{packaged} = V2 \cdot (1 - \text{shrinkage}) - Loss_{postboil}$
- $S_{kettle} = V2 \cdot (G2 - 1) \cdot 1000$ (post-boil kettle extract)
- `target_og` $= S_{kettle} / V_{packaged}$

### 1.2 What Does Not Exist

| Domain | Status | Consequence |
| :--- | :--- | :--- |
| **Fermentation model** | Absent | ABV, FG, AA%, RDF are never computed. The wizard has no concept of "what beer do I want." |
| **Late additions** | `manifest.late_additions` is an empty array; nothing consumes it | Fermentable late additions cannot be modeled. |
| **Lauter model** | Absent | Grain mass $M$ is never computed. The grain bill is proportional parts only. |
| **Trace additions** | `manifest.traceMalts` exists in the store but is not validated | The `< 2%` rule cannot be enforced without $M$. |
| **Mash profile** | `manifest.mash_profile` is an empty array | Purely informational; no rests modeled. |

### 1.3 Assumptions & Known Ignorance

1. **`target_og` is semantically inconsistent.** It is *derived* (`S_kettle / V_packaged`) but is *validated as an input* in `markStepComplete(2)` against the range `[1.010, 1.200]`. This is a latent bug: the validation guards a value the user never enters.

2. **`S_kettle` is pre-late by construction.** Because it is computed from `V2 × G2`, and `G2` is the mash-derived wort gravity, `S_kettle` excludes any fermentable late additions. This is correct but undocumented in the code.

3. **No fermentation awareness.** The calculator cannot answer "what OG do I need for a 6.5% ABV beer?" It can only answer "given this OG, what volume/gravity results?"

4. **`ThermodynamicSolver` is duplicated.** A placeholder class exists at `root/frontend/src/utils/thermodynamicSolver.js` (all methods return `0`), while the real implementation lives inline in `frontend/script.js`. This is a divergence risk.

5. **The ABV formula is absent.** No ABV calculation exists anywhere in the codebase — not even the crude `131.25` linear approximation.

---

## 2. Decision: Target Model

Adopt the **pair-of-pairs model**: two independent 2-DOF solvers, coupled only through an extract residual.

### 2.1 Two Independent Solvers

| Solver | Variables | Pick | Solve | Physical domain |
| :--- | :--- | :--- | :--- | :--- |
| **Boil** | $V1, G1, V2, G2, R_{boil}, t$ | 2 | 4 | Kettle geometry & evaporation |
| **Fermentation** | $OG, FG, ABV, AA$ | 2 | 2 | Yeast behavior |

Neither solver consumes the other's variables. The boil solver is **unchanged** from its current implementation.

### 2.2 The Coupling Term: $S_{late}$ as a Residual

The two solvers are bridged by a **computed residual**, not a declared input:

$$S_{kettle}^{mash} = V2 \cdot (G2 - 1) \cdot 1000$$
$$S_{fermenter} = (OG - 1) \cdot V_{packaged}$$
$$S_{late} = S_{fermenter} - S_{kettle}^{mash}$$

The sign of $S_{late}$ tells the user what to do:

| $S_{late}$ | Meaning | User action |
| :--- | :--- | :--- |
| $= 0$ | Mash provides exactly the required extract | No late additions needed |
| $> 0$ | Fermentation target requires more extract | **Add fermentable late additions** |
| $< 0$ | Mash provides excess extract | Reduce grain bill or increase volume |

This is the **"surface the need"** behavior: the wizard derives the required late-addition amount rather than requiring the user to know it in advance.

### 2.3 The Lauter Solver

The Lauter solver inverts the master sparge equation to find grain mass $M$, targeting $S_{kettle}^{mash}$:

$$S_{kettle}^{mash} = (P \times M \times C_{e}) \times \left[ 1 - \left( \frac{Loss_{equip} + (M \times A_{f})}{V_{strike} + \frac{M \times \text{moisture}\%}{\rho_{water}}} \right) \times \left( \frac{Loss_{equip} + (M \times A_{f})}{Loss_{equip} + (M \times A_{f}) + V_{run2}} \right) \right]$$

Solved by root-finding on $f(M) = 0$. $M$ is **always** solved, never an input. Two pathways are supported:

- **LGR-centric:** user fixes liquor-to-grist ratio; solve for $M$, then cascade to $V_{strike}$, $V_{run1}$, $V_{run2}$.
- **Runnings-centric:** user fixes the runnings split (fraction or ratio); solve for $M$, then back out $V_{strike}$ and LGR.

### 2.4 Fermentation Math

Use **Cutaia, Reid & Speers (2009)**, not the linear `131.25` approximation:

$$ABW = (0.372 + 0.00357 \times OE) \times (OE - AE)$$
$$ABV = ABW \times \frac{SG_{final}}{0.7907}$$
$$AA = \frac{OE - AE}{OE}$$

Plus the Real Extract regression for RDF. Plato ↔ SG conversion uses the ASBC polynomials. Full equations are in the math spec.

### 2.5 Scope Boundaries

- **Late additions are fermentable-only.** Hops (aroma, flavor, whirlpool) contribute no extract and belong in a separate hop schedule step.
- **Trace additions contribute no extract.** They are color/flavor only, and are validated against $M$ (must be $< 2\%$ of total grist weight).
- **Late-addition volume delta is negligible.** Late additions are treated as volume-neutral.
- **$G2$ excludes late additions.** $G2$ is the mash-derived wort gravity at flameout. $OG$ includes late additions. These must be labeled unambiguously in the UI.
- **The Late Addition Advisory is advisory-only.** The wizard does not enforce late additions.

---

## 3. Deltas: Current → Target

| Subsystem | Current | Target | Impact |
| :--- | :--- | :--- | :--- |
| Boil solver | 2-DOF, implemented | **Unchanged** | None |
| Fermentation solver | Does not exist | New 2-DOF solver (Cutaia) | New code |
| Lauter solver | Does not exist | New root-finder on $M$ | New code |
| `target_og` | Derived but validated as input | Derived readout only | Remove obsolete validation |
| `S_kettle` | Post-boil kettle extract | Rename to $S_{kettle}^{mash}$ for clarity | Naming only |
| `S_late` | Does not exist | Computed residual | New code |
| Grain mass $M$ | Not computed | Solved by Lauter | New code |
| Trace additions | Unvalidated | Validated against $M$ | New step |
| Late additions | Empty array | Fermentable-only, feeds residual | New step |
| Mash profile | Empty array | Informational only | New step |
| Step count | 4 | 8 (proposed) | UI restructure |
| `ThermodynamicSolver` | Duplicated (placeholder + inline) | Consolidated | Refactor |

---

## 4. Staged Implementation Plan

Each stage is independently shippable and testable.

### Stage 0 — Documentation & Naming (no code)

- This ADR.
- Rename $S_{kettle}$ → $S_{kettle}^{mash}$ in the math spec and code comments.
- Clarify `target_og` semantics in the math spec.
- **Deliverable:** doc-only commit.

### Stage 1 — Fermentation Solver (isolated)

- Implement a `FermentationSolver` class: Cutaia forward equations, ASBC Plato ↔ SG, Brent root-finding for both inverse pathways.
- Unit tests against known OE/AE pairs and round-trip inversions.
- **No UI wiring.**
- **Deliverable:** solver class + tests.

### Stage 2 — Fermentation Step UI

- New step card for the fermentation solver (placement TBD — see Open Questions).
- Wire to `FermentationSolver`.
- Surface $OG$, $FG$, $ABV$, $AA\%$, $RDF$.
- **Deliverable:** new partial + wizard wiring.

### Stage 3 — Lauter Solver (isolated)

- Implement a `LauterSolver` class: master sparge equation, root-finding on $M$, both pathways (LGR-centric, runnings-centric).
- Unit tests against the worked example in the math spec.
- **No UI wiring.**
- **Deliverable:** solver class + tests.

### Stage 4 — Late Additions + Residual

- New step card for fermentable late additions.
- Compute and display $S_{late} = S_{fermenter} - S_{kettle}^{mash}$.
- Display the suggested late-addition mass.
- **Deliverable:** new partial + residual computation.

### Stage 5 — Lauter Step UI + Trace Additions + Mash

- New Lauter step card (pathway selector, $M$ readout, volume cascade).
- New Trace Additions step card (validated against $M$).
- New Mash step card (informational).
- **Deliverable:** three new partials + wizard wiring.

### Stage 6 — Consolidation & Cleanup

- Consolidate the duplicated `ThermodynamicSolver` (placeholder vs. inline).
- Remove obsolete `target_og` validation.
- Renumber steps if required.
- **Deliverable:** refactor commit.

---

## 5. Alternatives Considered

### Alternative A: Unified $S_{kettle}$ (late additions folded into the boil solver)

Redefine $S_{kettle}$ to include $S_{late}$, and modify the boil solver's conservation equation to $V1 \cdot G1 + S_{late} = V2 \cdot G2$.

**Rejected because:**
- Requires rewriting all 13 cases of `solve2DOF`.
- Reintroduces circularity: the boil solver would need $S_{late}$, which comes from a later step.
- Breaks the clean `V1·G1 = V2·G2` invariant.

### Alternative B: OG as a Labeling Concern (Approach 1)

Keep `target_og` as a pre-late value, and surface the post-late OG as a separate downstream readout.

**Rejected because:**
- It does not surface the *need* for late additions — the user must know in advance.
- It leaves the fermentation domain unmodeled (no ABV/AA% solver).
- It treats the ABV-centric design intent as an afterthought.

### Alternative C: Linear ABV Approximation (`131.25`)

Use $ABV = (OG - FG) \times 131.25$ instead of Cutaia.

**Rejected because:**
- It is a linear approximation that drifts badly outside the 1.040–1.060 range.
- It ignores volumetric expansion of ethanol.
- It provides no RDF, which is needed for mouthfeel/body modeling.
- Cutaia is the modern standard and is no more complex to implement.

---

## 6. Consequences

### Positive

- The wizard can answer the question brewers actually ask: *"I want a 6.5% dry IPA — what grain bill gets me there?"*
- The boil solver is untouched, minimizing regression risk.
- The pair-of-pairs structure is symmetric and reusable (two solvers, same UX pattern).
- Late additions are surfaced as a computed need, not a hidden requirement.
- RDF is available for mouthfeel/body modeling.

### Negative

- The wizard grows from 4 steps to 8 (proposed).
- Two gravity values ($G2$ and $OG$) must be labeled carefully to avoid user confusion.
- The fermentation solver depends on $V_{packaged}$ from the boil solver, creating a step-ordering constraint.
- New solver code requires new test coverage.

### Neutral

- `target_og` changes from a validated input to a derived readout.
- Step renumbering is deferred but will eventually be required.

---

## 7. Open Questions

1. **Fermentation solver placement.** New step before Fermentables (Option A), folded into Step 2 (Option B), or new step after Fermentables (Option C)?
2. **Step ordering.** Proposed: `Boil → Fermentation → Late → Lauter → Trace → Mash`. Not yet confirmed.
3. **Yeast strain integration.** Raw $AA\%$ input, yeast catalog lookup, or both?
4. **`target_og` disposition.** Remove entirely, rename to `postboil_og_prelate`, or keep as a user goal alongside a derived value?
5. **Step 2 "Target OG" label.** Rename to "Kettle Gravity" / "Post-Boil Gravity (pre-late)"?
6. **Trace validation failure behavior.** Block progression, warn only, or auto-promote to major?
7. **Runnings pathway storage.** Store fraction internally, display ratio?
8. **`ThermodynamicSolver` consolidation.** Which location is canonical — `root/frontend/src/utils/` or inline in `script.js`?
9. **Step renumbering.** When, and to what scheme?

---

## 8. References

- [`docs/master_batch_sparge_eqn.md`](../master_batch_sparge_eqn.md) — math specification for the master sparge equation, fermentation solver, and pair-of-pairs model.
- Cutaia, A. J., Reid, A. J., & Speers, R. A. (2009). *Examination of the Relationships of Original, Real, and Apparent Extract and Their Use in the Brewing Industry.* Journal of the American Society of Brewing Chemists, 67(4), 205–212.
- ASBC Methods of Analysis — Table 1 (Specific Gravity ↔ °Plato).
