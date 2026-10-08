# Canonical Batch Sparge Extract Balance: Grist Mass Determination via 1D Root-Finding and Constraint Topology Analysis

## 1. Governing Equations of the Master Canonical Extract Balance

The single-strike, single-sparge batch sparging process operates as a two-stage equilibrium extraction system. In the Fully Expanded Formulation, the post-boil extract mass $S_{\text{post boil}}$ accounts for enzymatic conversion yield, solute displacement, grain moisture contribution, husk liquid retention, and dead space losses:

$$\begin{aligned} S_{\text{post boil}} ={}& (\eta_{\text{conv}} \cdot Y_{\text{theo. max}}) \\ &\times \Biggl[ 1 - \left( \frac{k_{\text{abs, true}} \cdot M_{\text{grist}} + V_{\text{dead}}}{V_{\text{strike}} + \left(\frac{M_{\text{grist}} \cdot \overline{\text{MC}}}{\rho_{\text{water}}}\right) + \bar{v} \cdot \eta_{\text{conv}} \cdot Y_{\text{theo. max}}} \right) \\ &\quad\quad \times \left( \frac{k_{\text{abs, true}} \cdot M_{\text{grist}} + V_{\text{dead}}}{V_{\text{sparge}} + k_{\text{abs, true}} \cdot M_{\text{grist}} + V_{\text{dead}}} \right) \Biggr] + S_{\text{late add.}} \end{aligned}$$

### 1.1 Grist Property Linearization and Parameter Grouping

To isolate the dependence on dry grist mass $M_{\text{grist}}$, the multi-grain bill parameters are aggregated into mass-weighted composite constants.

Let $w_i$ represent the normalized mass fraction of grain component $i$ ($\sum w_i = 1.0$), $\text{DBFG}_i$ the dry-basis fine-grind extract potential fraction, and $\text{MC}_i$ the as-is moisture content fraction. The composite dry-basis potential factor $E$ and weighted moisture fraction $\overline{\text{MC}}$ are defined as:

$$E = \sum_{i} \left( w_i \cdot \text{DBFG}_i \cdot (1 - \text{MC}_i) \right)$$

$$\overline{\text{MC}} = \sum_{i} \left( w_i \cdot \text{MC}_i \right)$$

Applying these composite metrics allows expressing all extract and volumetric stage terms as direct linear functions of $M_{\text{grist}}$:

* **Theoretical Maximum Extract:**
  $$Y_{\text{theo. max}}(M_{\text{grist}}) = E \cdot M_{\text{grist}}$$

* **Converted Extract in Mash:**
  $$S_{\text{conv}}(M_{\text{grist}}) = \eta_{\text{conv}} \cdot E \cdot M_{\text{grist}}$$

* **Native Grain Moisture Liquid Volume:**
  $$V_{\text{mc}}(M_{\text{grist}}) = \left( \frac{\overline{\text{MC}}}{\rho_{\text{water}}} \right) M_{\text{grist}}$$

* **Dissolved Solute Displacement Volume:**
  $$V_{\text{sol}}(M_{\text{grist}}) = \bar{v} \cdot S_{\text{conv}}(M_{\text{grist}}) = (\bar{v} \cdot \eta_{\text{conv}} \cdot E) M_{\text{grist}}$$

* **Composite Volumetric Expansion Coefficient:**
  $$c_{\text{vol}} = \frac{\overline{\text{MC}}}{\rho_{\text{water}}} + \bar{v} \cdot \eta_{\text{conv}} \cdot E$$

* **Retained Liquid Volume (Grist Absorption + Tun Dead Space):**
  $$V_{\text{ret}}(M_{\text{grist}}) = k_{\text{abs, true}} \cdot M_{\text{grist}} + V_{\text{dead}}$$

### 1.2 Denominator Simplification

Defining the total liquid volume present in each extraction stage yields:

* **First Runnings Stage Volume:**
  $$D_1(M_{\text{grist}}) = V_{\text{strike}} + c_{\text{vol}} \cdot M_{\text{grist}}$$

* **Second Runnings Stage Volume:**
  $$D_2(M_{\text{grist}}) = V_{\text{sparge}} + V_{\text{dead}} + k_{\text{abs, true}} \cdot M_{\text{grist}}$$

The master extract balance simplifies to:

$$S_{\text{post boil}}(M_{\text{grist}}) = S_{\text{conv}}(M_{\text{grist}}) \left[ 1 - \frac{V_{\text{ret}}(M_{\text{grist}})^2}{D_1(M_{\text{grist}}) \cdot D_2(M_{\text{grist}})} \right] + S_{\text{late add.}}$$

---

## 2. 1D Root-Finding Formulation and Numerical Methods

When designing a recipe to hit a defined kettle extract target $S_{\text{post boil}}^{\text{target}}$, the balance cannot be evaluated explicitly for $M_{\text{grist}}$ because the grist mass appears simultaneously in the conversion pre-factor, the retention numerator, and both stage volume denominators.

### 2.1 The Residual Function

Given a target post-boil extract mass $S_{\text{post boil}}^{\text{target}}$—derived either directly or from target post-boil chilled volume $V_{\text{post boil, } 20^\circ\text{C}}$ and specific gravity $SG_{\text{post boil}}$:

$$S_{\text{post boil}}^{\text{target}} = \frac{1000 \cdot (SG_{\text{post boil}} - 1) \cdot V_{\text{post boil, } 20^\circ\text{C}}}{\gamma}$$

where $\gamma$ is the gravity factor ($46.21\text{ GU}\cdot\text{gal/lb}$ or $385.5\text{ GU}\cdot\text{L/kg}$), the scalar residual function $f(M_{\text{grist}}) = 0$ is defined as:

$$\begin{aligned} f(M_{\text{grist}}) ={}& (\eta_{\text{conv}} \cdot E \cdot M_{\text{grist}}) \\ &\times \Biggl[ 1 - \frac{\left(k_{\text{abs, true}} \cdot M_{\text{grist}} + V_{\text{dead}}\right)^2}{\left(V_{\text{strike}} + c_{\text{vol}} \cdot M_{\text{grist}}\right)\left(V_{\text{sparge}} + V_{\text{dead}} + k_{\text{abs, true}} \cdot M_{\text{grist}}\right)} \Biggr] \\ &+ S_{\text{late add.}} - S_{\text{post boil}}^{\text{target}} \end{aligned}$$

Clearing algebraic denominators converts $f(M_{\text{grist}}) = 0$ into an equivalent cubic polynomial:

$$\begin{aligned} P(M_{\text{grist}}) ={}& (\eta_{\text{conv}} E M_{\text{grist}}) \left[ D_1(M_{\text{grist}}) D_2(M_{\text{grist}}) - V_{\text{ret}}(M_{\text{grist}})^2 \right] \\ &- \left(S_{\text{post boil}}^{\text{target}} - S_{\text{late add.}}\right) D_1(M_{\text{grist}}) D_2(M_{\text{grist}}) = 0 \end{aligned}$$

Direct numerical 1D root-finding on $f(M_{\text{grist}})$ is preferred over analytic cubic formulas (Cardano's method) to avoid catastrophic numerical cancellation and complex branch evaluations under floating-point arithmetic.

### 2.2 Mathematical Properties and Domain Bounds

The residual function exhibits mathematical characteristics that ensure rapid and stable convergence:

* **Pole-Free Domain:** Because physical liquor additions are positive ($V_{\text{strike}} > 0, V_{\text{sparge}} > 0$), dead space is non-negative ($V_{\text{dead}} \ge 0$), and physical constants are positive ($c_{\text{vol}} > 0, k_{\text{abs, true}} > 0$), the denominators $D_1(M_{\text{grist}})$ and $D_2(M_{\text{grist}})$ remain strictly positive for all $M_{\text{grist}} \ge 0$. The function is smooth and continuously differentiable ($C^\infty$) over the physical domain.

* **Strict Monotonicity:** While the retention fractions $R_{f1} R_{f2}$ introduce non-linear curvature, lauter efficiency $\eta_{\text{lauter}} = 1 - (R_{f1} R_{f2})$ varies gradually within $(0.65, 0.90)$. The converted extract term scales linearly with $M_{\text{grist}}$, ensuring that the composite function is strictly monotonically increasing ($\frac{df}{dM_{\text{grist}}} > 0$) across the operational range. A single unique positive real root is mathematically guaranteed.

### 2.3 Search Bracket Construction

A guaranteed bracketing interval $[a, b]$ satisfying $f(a) \cdot f(b) < 0$ is initialized as follows:

* **Lower Bound ($a$):**
  Assuming 100% conversion and 100% lauter recovery provides an absolute theoretical minimum for grist mass:

  $$a = \max\left(0.0, \; \frac{S_{\text{post boil}}^{\text{target}} - S_{\text{late add.}}}{E}\right)$$

  Because physical recovery is strictly less than 100%, $f(a) < 0$ is guaranteed whenever $S_{\text{post boil}}^{\text{target}} > S_{\text{late add.}}$.

* **Upper Bound ($b$):**
  Assuming a conservative baseline lauter recovery floor (e.g., overall extract recovery $\ge 50\%$):

  $$b = \frac{S_{\text{post boil}}^{\text{target}} - S_{\text{late add.}}}{0.50 \cdot E}$$

  If evaluation reveals $f(b) \le 0$, an expansion step doubles the bound ($b \leftarrow 2b$) iteratively until $f(b) > 0$.

### 2.4 Numerical Solvers

* **Brent’s Method (`brentq`):**
  Brent's method is the optimal numerical solver for this formulation. Combining bisection steps, linear secant interpolation, and inverse quadratic interpolation, it guarantees convergence without requiring analytic derivatives, achieving superlinear convergence ($O \approx 1.618$).

* **Newton-Raphson Method:**
  When utilizing derivative-based solvers, the iteration step updates via:

  $$M_{k+1} = M_k - \frac{f(M_k)}{f'(M_k)}$$

  Differentiating $f(M_{\text{grist}})$ via the product and quotient rules gives:

  $$\begin{aligned}   f'(M_{\text{grist}}) ={}& (\eta_{\text{conv}} E) \left[ 1 - \frac{V_{\text{ret}}^2}{D_1 D_2} \right] \\   &- (\eta_{\text{conv}} E M_{\text{grist}}) \left[ \frac{2 V_{\text{ret}} k_{\text{abs, true}} D_1 D_2 - V_{\text{ret}}^2 \left( c_{\text{vol}} D_2 + k_{\text{abs, true}} D_1 \right)}{(D_1 D_2)^2} \right]   \end{aligned}$$

---

## 3. Degrees of Freedom and Input Variable Taxonomy

The master balance requires separating primitive exogenous constants from endogenous variables that scale dynamically with grist mass.

```text
                           +-------------------------+
                           | Exogenous Constants     |
                           | E, MC, k_abs, v_bar,    |
                           | eta_conv, V_dead        |
                           +------------+------------+
                                        |
+--------------------------+            |            +-------------------------+
| Target Endpoint          |            v            | Operational Constraints |
| S_post_boil^target       +---> [ Solver Loop ] <---+ 2 Constraints           |
| (or SG_target, V_kettle) |     f(M_grist) = 0      | (e.g., V_preboil, r)    |
+--------------------------+            |            +-------------------------+
                                        v
                           +-------------------------+
                           | Output State            |
                           | M_grist                 |
                           | V_strike, V_sparge      |
                           +-------------------------+

```

### 3.1 Primitive Exogenous Parameters

When liquor additions are fixed numerical quantities, the residual function is parameterized by ten primitive inputs:

* **Malt Specification Vector:** $\{w_i, \text{DBFG}_i, \text{MC}_i\}$, yielding composite extract potential $E$ and weighted moisture fraction $\overline{\text{MC}}$.
* **Physical and System Constants:**
* $\eta_{\text{conv}}$: Mash conversion efficiency (dimensionless).
* $\bar{v}$: Apparent specific volume of dissolved extract ($0.075\text{ gal/lb}$ or $0.625\text{ L/kg}$).
* $k_{\text{abs, true}}$: True husk absorption coefficient ($0.20\text{ gal/lb}$ or $1.67\text{ L/kg}$).
* $\rho_{\text{water}}$: Density of water at strike temperature ($8.33\text{ lb/gal}$ or $1.00\text{ kg/L}$).
* $V_{\text{dead}}$: Mash tun dead space volume ($gal$ or $L$).


* **Recipe Additions:** $S_{\text{late add.}}$ (extract mass added directly to kettle).
* **Boundary Additions (Static Formulation):** $V_{\text{strike}}$ and $V_{\text{sparge}}$ ($gal$ or $L$).

### 3.2 Endogenous Liquor Couplings

In standard recipe design, absolute water volumes cannot be specified prior to knowing the grist mass. Instead, operational brewing parameters replace $V_{\text{strike}}$ and $V_{\text{sparge}}$, coupling liquid additions directly to $M_{\text{grist}}$ inside the solver loop:

* **Liquor-to-Grist Ratio Binding ($R_{L:G}$):**

$$V_{\text{strike}}(M_{\text{grist}}) = R_{L:G} \cdot M_{\text{grist}}$$


* **Kettle Runoff Target Binding ($V_{\text{pre boil}}$):**
To ensure post-boil kettle volume conservation:
$$\begin{aligned}   V_{\text{sparge}}(M_{\text{grist}}) ={}& V_{\text{pre boil}} - V_{\text{strike}} \\   &- \left( c_{\text{vol}} - k_{\text{abs, true}} \right) M_{\text{grist}} + V_{\text{dead}}   \end{aligned}$$


* **Equal Runnings Optimization ($V_{\text{total}}$):**
When total water inventory is fixed and lauter loss is minimized ($V_{\text{run 1}} = V_{\text{run 2}}$):
$$V_{\text{strike}}(M_{\text{grist}}) = \frac{V_{\text{total}} + V_{\text{ret}}(M_{\text{grist}}) - c_{\text{vol}} M_{\text{grist}}}{2}$$


$$V_{\text{sparge}}(M_{\text{grist}}) = \frac{V_{\text{total}} - V_{\text{ret}}(M_{\text{grist}}) + c_{\text{vol}} M_{\text{grist}}}{2}$$



---

## 4. Generalizing Runoff Symmetry: The Runoff Ratio ($r$)

Specifying the runoff ratio $r = V_{\text{run 1}} / V_{\text{run 2}}$ alone is insufficient because it is dimensionless. However, pairing $r$ with an extensive volume constraint (such as $V_{\text{pre boil}}$ or $V_{\text{total}}$) uniquely resolves the liquid subsystem. The conventional "equal runnings" condition is simply the special case where $r = 1.0$.

### 4.1 Algebraic Decoupling Under $\{V_{\text{pre boil}}, r\}$

When target pre-boil volume $V_{\text{pre boil}}$ and runoff ratio $r$ are constrained simultaneously, runoff volumes are determined prior to solving:

$$V_{\text{pre boil}} = V_{\text{run 1}} + V_{\text{run 2}} = (r + 1) V_{\text{run 2}}$$

$$V_{\text{run 2}} = \frac{V_{\text{pre boil}}}{r + 1}$$

$$V_{\text{run 1}} = \left( \frac{r}{r + 1} \right) V_{\text{pre boil}}$$

Because runoff volumes relate to stage liquids by definition ($V_{\text{run 1}} = V_{\text{strike}} + V_{\text{mc}} + V_{\text{sol}} - V_{\text{ret}}$ and $V_{\text{run 2}} = V_{\text{sparge}}$), the denominators in the retention fractions become:

* $D_1(M_{\text{grist}}) = V_{\text{run 1}} + V_{\text{ret}}(M_{\text{grist}})$
* $D_2(M_{\text{grist}}) = V_{\text{run 2}} + V_{\text{ret}}(M_{\text{grist}})$

This produces a fundamental mathematical simplification: **grain moisture volume ($V_{\text{mc}}$) and solute displacement volume ($V_{\text{sol}}$) drop out of the root-finding residual entirely**.

The residual function reduces to:

$$\begin{aligned} f(M_{\text{grist}}) ={}& (\eta_{\text{conv}} E M_{\text{grist}}) \\ &\times \Biggl[ 1 - \frac{\left(k_{\text{abs, true}} M_{\text{grist}} + V_{\text{dead}}\right)^2}{\left(V_{\text{run 1}} + k_{\text{abs, true}} M_{\text{grist}} + V_{\text{dead}}\right) \left(V_{\text{run 2}} + k_{\text{abs, true}} M_{\text{grist}} + V_{\text{dead}}\right)} \Biggr] \\ &+ S_{\text{late add.}} - S_{\text{post boil}}^{\text{target}} \end{aligned}$$

Once $M_{\text{grist}}$ converges, $V_{\text{mc}}$ and $V_{\text{sol}}$ are computed in a single post-solve evaluation to determine physical liquor additions:

$$V_{\text{sparge}} = V_{\text{run 2}} = \frac{V_{\text{pre boil}}}{r + 1}$$

$$V_{\text{strike}} = V_{\text{run 1}} + V_{\text{ret}}(M_{\text{grist}}) - \left[ V_{\text{mc}}(M_{\text{grist}}) + V_{\text{sol}}(M_{\text{grist}}) \right]$$

### 4.2 Lauter Efficiency Consequences

Lauter efficiency is given by:

$$\eta_{\text{lauter}} = 1 - (R_{f1} \cdot R_{f2}) = 1 - \frac{V_{\text{ret}}^2}{(V_{\text{run 1}} + V_{\text{ret}})(V_{\text{run 2}} + V_{\text{ret}})}$$

Under a fixed pre-boil target $V_{\text{pre boil}} = V_{\text{run 1}} + V_{\text{run 2}}$, maximizing $\eta_{\text{lauter}}$ requires maximizing the denominator product:

$$g(V_{\text{run 1}}) = (V_{\text{run 1}} + V_{\text{ret}})(V_{\text{pre boil}} - V_{\text{run 1}} + V_{\text{ret}})$$

Differentiating with respect to $V_{\text{run 1}}$ and setting to zero:

$$\begin{aligned} \frac{dg}{dV_{\text{run 1}}} &= (V_{\text{pre boil}} - V_{\text{run 1}} + V_{\text{ret}}) - (V_{\text{run 1}} + V_{\text{ret}}) \\ &= V_{\text{pre boil}} - 2 V_{\text{run 1}} = 0 \implies V_{\text{run 1}} = \frac{V_{\text{pre boil}}}{2} \end{aligned}$$

Thus, **lauter efficiency reaches its global maximum strictly at equal runnings ($r = 1.0$)**. Any operational departure ($r \ne 1.0$) increases retained extract losses, necessitating a slightly larger grist mass $M_{\text{grist}}$ to satisfy the kettle target.

---

## 5. Constraint Topology: Degrees of Freedom and Solvability

The liquid volumetric subsystem contains two primitive variables: strike water ($V_{\text{strike}}$) and sparge water ($V_{\text{sparge}}$). The degrees of freedom for the liquid subsystem equal $N_{\text{liq}} = 2$. Resolving the system alongside the extract balance requires specifying exactly two independent constraints ($C = 2$) containing at least one extensive volume dimension.

### 5.1 Permissible Constraint Pairs

| Constraint Pair | Classification | Solver Coupling Behavior | Practical Use Case |
| --- | --- | --- | --- |
| **$\{V_{\text{pre boil}}, r\}$** | Extensive + Intensive | Eliminates $V_{\text{mc}}$ and $V_{\text{sol}}$ from solver loop; $V_{\text{run 1}}$ and $V_{\text{run 2}}$ remain static constants during iteration. | Fixed kettle boil volume with balanced ($r=1.0$) or custom runnings ratio. |
| **$\{V_{\text{pre boil}}, R_{L:G}\}$** | Extensive + Intensive | $V_{\text{strike}}(M)$ scales linearly; $V_{\text{sparge}}(M)$ dynamically absorbs mash expansion and retention shifts. | Standard brewing practice targeting fixed mash thickness and pre-boil volume. |
| **$\{V_{\text{total}}, r\}$** | Extensive + Intensive | Both $V_{\text{strike}}(M)$ and $V_{\text{sparge}}(M)$ vary dynamically; $V_{\text{pre boil}}$ floats as an endogenous output. | Fixed hot liquor tank inventory with balanced stage runoffs. |
| **$\{V_{\text{total}}, R_{L:G}\}$** | Extensive + Intensive | $V_{\text{strike}}(M) = R_{L:G} M$; $V_{\text{sparge}}(M) = V_{\text{total}} - R_{L:G} M$. Both remain linear in $M_{\text{grist}}$. | Fixed water inventory where specific mash thickness is enforced. |
| **$\{V_{\text{strike}}, V_{\text{sparge}}\}$** | Extensive + Extensive | Both liquor volumes are static constants; non-linearities are confined strictly to extraction and retention. | Rigid hardware workflows or manual vessel additions. |
| **$\{V_{\text{pre boil}}, V_{\text{strike}}\}$** | Extensive + Extensive | $V_{\text{strike}}$ is static; $V_{\text{sparge}}(M) = V_{\text{pre boil}} - V_{\text{run 1}}(M)$. | Electric HERMS/RIMS setups requiring minimum volume to submerge elements. |
| **$\{R_{L:G}, V_{\text{sparge}}\}$** | Intensive + Extensive | Strike volume scales dynamically; sparge volume remains static. | Fixed sparge kettle capacity with controlled mash thickness. |

### 5.2 Disallowed and Degenerate Constraint Configurations

A constraint configuration is mathematically invalid if the Jacobian of the liquid system is rank-deficient ($\det(\mathbf{J}) = 0$):

* **Pure Intensive Pair $\{R_{L:G}, r\}$:** Specifying only dimensionless ratios provides no volumetric scale. The system is scale-invariant; an infinite continuum of batch sizes satisfy the ratio criteria.
* **Identity / Redundant Pair $\{V_{\text{sparge}}, V_{\text{run 2}}\}$:** In single-batch sparging, $V_{\text{run 2}} \equiv V_{\text{sparge}}$ by physical definition. Specifying both constitutes only one unique constraint ($C = 1$), leaving the system underdetermined.
* **Collinear Conservation Pairs:** Combinations such as $\{V_{\text{total}}, V_{\text{strike}} + V_{\text{sparge}}\}$ or $\{V_{\text{pre boil}}, V_{\text{run 1}} + V_{\text{run 2}}\}$ represent algebraic tautologies that fail to resolve individual stage volumes.

---

## 6. Computational Workflow and Verification Protocol

### 6.1 Execution Pipeline

```text
  1. Parse Recipe Targets & System Parameters
     (SG_post_boil, V_post_boil, w_i, DBFG_i, MC_i, k_abs, v_bar, eta_conv, V_dead)
                           |
                           v
  2. Validate Constraint Pair Topology
     (Ensure at least 1 extensive variable, det(J) != 0)
                           |
                           v
  3. Pre-Compute Stage Constants
     - E = sum(w_i * DBFG_i * (1 - MC_i))
     - MC_bar = sum(w_i * MC_i)
     - S_post_boil^target = 1000 * (SG_target - 1) * V_kettle / gamma
                           |
                           v
  4. Formulate Residual Function f(M_grist)
     (Select residual form based on constraint pair)
                           |
                           v
  5. Bracket Root Interval [a, b]
     - a = max(0, (S_target - S_late) / E)
     - b = (S_target - S_late) / (0.50 * E)
     - Expand b until f(b) > 0
                           |
                           v
  6. Execute Brent's Method Solver
     - Solve f(M_grist) = 0 to tolerance epsilon < 1e-7
                           |
                           v
  7. Back-Calculate Endogenous Physical Volumes
     - Compute V_mc, V_sol, V_ret
     - Compute V_strike, V_sparge, V_run1, V_run2
                           |
                           v
  8. Execute Post-Solve Physical Verification

```

### 6.2 Post-Convergence Verification Checklist

Execute the following post-solution verification steps to ensure numerical and physical validity:

* **Residual Convergence:** Confirm that $|f(M_{\text{grist}})| < 10^{-7}\text{ lb}$ (or $\text{kg}$).
* **Mash Bed Fluidity Assertion:** Verify that $R_{L:G} = \frac{V_{\text{strike}}}{M_{\text{grist}}} \ge 1.0\text{ – }1.2\text{ qt/lb}$ ($2.09\text{ – }2.50\text{ L/kg}$) to ensure the grist bed does not compact or run dry.
* **Runoff Positivity:** Confirm $V_{\text{run 1}} > 0$ and $V_{\text{run 2}} > 0$. If $V_{\text{sparge}} \le 0$ under a $\{V_{\text{pre boil}}, R_{L:G}\}$ configuration, the grist mass has exceeded the batch sparge boundary, indicating a transition into a no-sparge regime.
* **Volumetric Conservation Check:** Confirm that total system liquid balances across stages:

$$(V_{\text{run 1}} + V_{\text{run 2}}) + V_{\text{ret}} = V_{\text{strike}} + V_{\text{sparge}} + V_{\text{mc}} + V_{\text{sol}}$$



with an absolute error $< 10^{-6}\text{ gal}$ (or $\text{L}$).
* **Extract Mass Conservation Check:** Verify that post-boil extract equals converted extract minus retention losses:

$$S_{\text{run 1}} + S_{\text{run 2}} + (S_{\text{conv}} \cdot R_{f1} \cdot R_{f2}) = S_{\text{conv}}$$


* **Final Gravity Verification:** Recompute $SG_{\text{post boil}}$ from the converged state:

$$SG_{\text{post boil}} = 1 + \frac{S_{\text{post boil}} \cdot \gamma}{1000 \cdot V_{\text{post boil, } 20^\circ\text{C}}}$$



Confirm exact alignment with the recipe target specification.

### 6.3 Intensive versus Extensive System Variables

In this mathematical modeling context, **extensive variables** dictate the absolute physical scale or size of the brewing batch, while **intensive variables** define the proportions, physical conditions, or relative relationships within the system regardless of the batch's overall size.

**Extensive Variables (The Scale Anchors)**
Extensive variables are additive. If you double the size of the recipe, the values of these variables double. In the constraint topology of the liquid subsystem, these represent absolute volumes and masses:

* $V_{\text{strike}}$ (Strike water volume, e.g., $4.0 \text{ gal}$)
* $V_{\text{sparge}}$ (Sparge water volume, e.g., $4.5 \text{ gal}$)
* $V_{\text{total}}$ (Total system brewing water, e.g., $8.5 \text{ gal}$)
* $V_{\text{pre boil}}$ (Target kettle volume, e.g., $7.0 \text{ gal}$)
* $M_{\text{grist}}$ (Total grist mass)
* $S_{\text{post boil}}$ (Total post-boil extract mass)

**Intensive Variables (The State/Proportion Constraints)**
Intensive variables are scale-invariant. If you scale a 5-gallon recipe up to a 50-barrel commercial system using the same physical parameters, these values remain identical. In the solver topology, they act as geometric or conditional bounds:

* $R_{L:G}$ (Liquor-to-Grist Ratio, e.g., $1.5 \text{ qt/lb}$): Defines the physical thickness or fluidity of the mash bed, independent of how much grain is actually in the tun.
* $r$ (Runoff Ratio, $V_{\text{run 1}} / V_{\text{run 2}}$): Defines the volumetric symmetry of the two extraction stages, independent of the absolute runoff volumes.
* $SG_{\text{post boil}}$ (Specific Gravity): Defines the concentration of the extract, independent of total kettle volume.
* System constants like $\bar{v}$ (specific volume), $k_{\text{abs, true}}$ (absorption rate), and $\eta_{\text{conv}}$ (conversion efficiency).

**Why the Distinction Matters to the Solver**
Categorizing constraints this way determines whether the system of equations is solvable.

If a calculation engine receives two intensive constraints—such as a user requesting a mash thickness ($R_{L:G}$) of $1.5 \text{ qt/lb}$ and perfectly equal stage runnings ($r = 1.0$)—the matrix is rank-deficient. Because intensive constraints provide no sense of scale, the mathematical system has an infinite number of correct solutions. To calculate a specific grist mass and absolute water additions, the solver requires at least one extensive constraint (like $V_{\text{pre boil}} = 7.0 \text{ gal}$) to anchor the proportions to an absolute physical reality.
