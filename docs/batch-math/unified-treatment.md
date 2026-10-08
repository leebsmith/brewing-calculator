# Batch Sparging Mathematics: Canonical Mass and Volume Balance Specification

## 1. Master Canonical Extract Balance
The single-strike, single-sparge batch sparging process operates as a two-stage equilibrium extraction system. The total soluble extract mass in the kettle post-boil ($S_{\text{post boil}}$) is given by the master canonical balance:

$$\begin{aligned} S_{\text{post boil}} &= S_{\text{conv}} \cdot \left[ 1 - \left( \frac{V_{\text{ret}}}{V_{\text{strike}} + V_{\text{mc}} + V_{\text{sol}}} \right) \left( \frac{V_{\text{ret}}}{V_{\text{sparge}} + V_{\text{ret}}} \right) \right] + S_{\text{late add.}} \end{aligned}$$

Expanding all state variables into fundamental recipe and equipment parameters yields the fully expanded formulation:

$$\begin{aligned} S_{\text{post boil}} &= \left(\eta_{\text{conv}} \cdot Y_{\text{theo. max}}\right) \\ &\quad \times \Biggl[ 1 - \left( \frac{k_{\text{abs, true}} \cdot M_{\text{grist}} + V_{\text{dead}}}{V_{\text{strike}} + \left(\frac{M_{\text{grist}} \cdot \overline{\text{MC}}}{\rho_{\text{water}}}\right) + \bar{v} \cdot \eta_{\text{conv}} \cdot Y_{\text{theo. max}}} \right) \\ &\quad\quad \times \left( \frac{k_{\text{abs, true}} \cdot M_{\text{grist}} + V_{\text{dead}}}{V_{\text{sparge}} + k_{\text{abs, true}} \cdot M_{\text{grist}} + V_{\text{dead}}} \right) \Biggr] + S_{\text{late add.}} \end{aligned}$$

## 2. Sub-Equations and State Variables
The master extraction balance relies on several volumetric and extract mass sub-equations to resolve the specific stages of the mash and lauter process.

### Mash Solute Generation
These parameters dictate the theoretical and actual soluble yield converted during the mash:

* Theoretical Maximum Extract Mass: $Y_{\text{theo. max}} = M_{\text{grist}} \cdot \sum_{i} \left( w_i \cdot \text{DBFG}_i \cdot (1 - \text{MC}_i) \right)$
* Converted Soluble Extract Mass: $S_{\text{conv}} = \eta_{\text{conv}} \cdot Y_{\text{theo. max}}$
* Solute Displacement Volume: $V_{\text{sol}} = \bar{v} \cdot S_{\text{conv}}$
* Intrinsic Grain Moisture Volume: $V_{\text{mc}} = \frac{M_{\text{grist}} \cdot \overline{\text{MC}}}{\rho_{\text{water}}}$

### Retention Kinetics
These equations describe the liquid volumes trapped by the grain bed and hardware:

* Total Retained Volume: $V_{\text{ret}} = (k_{\text{abs, true}} \cdot M_{\text{grist}}) + V_{\text{dead}}$
* First Runnings Retention Fraction ($R_{\text{f1}}$): $R_{\text{f1}} = \frac{V_{\text{ret}}}{V_{\text{strike}} + V_{\text{mc}} + V_{\text{sol}}}$
* Second Runnings Retention Fraction ($R_{\text{f2}}$): $R_{\text{f2}} = \frac{V_{\text{ret}}}{V_{\text{sparge}} + V_{\text{ret}}}$
* Lauter Extraction Efficiency ($\eta_{\text{lauter}}$): $\eta_{\text{lauter}} = 1 - (R_{\text{f1}} \cdot R_{\text{f2}})$

### Runoff Volumetrics and Kettle Balance
These derivations govern the fluid drained into the kettle and its transformation during the boil:

* First Runnings Drained to Kettle: $V_{\text{run 1}} = V_{\text{strike}} + V_{\text{mc}} + V_{\text{sol}} - V_{\text{ret}}$
* Second Runnings Drained to Kettle: $V_{\text{run 2}} = V_{\text{sparge}}$
* Total Pre-Boil Kettle Volume: $V_{\text{pre boil}} = V_{\text{run 1}} + V_{\text{run 2}}$
* Hot Post-Boil Volume ($100^\circ\text{C}$): $V_{\text{post boil, hot}} = V_{\text{pre boil}} - \Delta V_{\text{evap}} + (\bar{v} \cdot S_{\text{late add.}}) - V_{\text{kettle dead}}$
* Chilled Post-Boil Volume ($20^\circ\text{C}$ Reference): $V_{\text{post boil, } 20^\circ\text{C}} = V_{\text{post boil, hot}} \cdot (1 - f_{\text{shrink}})$

### Stage Extract Distribution and Specific Gravity
These equations track the dissolved extract mass transferring during each runoff:

* First Runnings Extract & Gravity: $S_{\text{run 1}} = S_{\text{conv}} \cdot (1 - R_{\text{f1}})$, $SG_{\text{run 1}} = 1 + \frac{S_{\text{run 1}} \cdot \gamma}{1000 \cdot V_{\text{run 1}}}$
* Second Runnings Extract & Gravity: $S_{\text{run 2}} = (S_{\text{conv}} \cdot R_{\text{f1}}) \cdot (1 - R_{\text{f2}})$, $SG_{\text{run 2}} = 1 + \frac{S_{\text{run 2}} \cdot \gamma}{1000 \cdot V_{\text{run 2}}}$
* Pre-Boil Gravity: $SG_{\text{pre boil}} = 1 + \frac{(S_{\text{run 1}} + S_{\text{run 2}}) \cdot \gamma}{1000 \cdot V_{\text{pre boil}}}$
* Chilled Post-Boil Gravity ($20^\circ\text{C}$): $SG_{\text{post boil}} = 1 + \frac{S_{\text{post boil}} \cdot \gamma}{1000 \cdot V_{\text{post boil, } 20^\circ\text{C}}}$

## 3. Constraint Topology & Degrees of Freedom
The liquid volumetric subsystem possesses two degrees of freedom ($N_{\text{liq}} = 2$) and requires exactly two independent constraints containing at least one extensive variable to uniquely resolve the mathematical system. Within a top-down, target-driven recipe formulation workflow, $\{V_{\text{pre boil}}, r\}$ and $\{V_{\text{pre boil}}, R_{L:G}\}$ are the only practical constraint pairs.

A distinction must be drawn between the **application input state** and the **solver constraint topology**:

* **Application Perspective (Independent User Inputs):** The desired cold fermenter volume ($V_{\text{ferm}}$) is collected as an independent "Target Endpoint" alongside the intensive constraint ($R_{L:G}$ or $r$). The user-facing input pairs are therefore $\{V_{\text{ferm}}, R_{L:G}\}$ and $\{V_{\text{ferm}}, r\}$.
* **Solver Perspective (Mathematical Constraints):** The liquid volumetric subsystem solver explicitly requires $\{V_{\text{pre boil}}, R_{L:G}\}$ or $\{V_{\text{pre boil}}, r\}$ to resolve the matrix. The pre-boil kettle volume ($V_{\text{pre boil}}$) is the extensive anchor consumed by the root-finder.

The computational pipeline bridges the two layers via the **Volumetric Reversal** phase: $V_{\text{ferm}}$ is used to work backward through kettle dead space, thermal contraction, and boil-off to establish $V_{\text{pre boil}}$. Once complete, the derived $\{V_{\text{pre boil}}, R_{L:G}\}$ or $\{V_{\text{pre boil}}, r\}$ pair is passed into the 1D root-finding solver.

### The $\{V_{\text{pre boil}}, R_{L:G}\}$ Constraint Topology
This configuration aligns with standard brewing practice by establishing a fixed pre-boil volume constraint while enforcing a specific physical mash thickness.

* Classification: Extensive + Intensive.
* Solver Behavior: Strike volume ($V_{\text{strike}}(M)$) scales linearly alongside the calculated grist mass.
* Dynamic Sparge: Sparge volume ($V_{\text{sparge}}(M)$) dynamically absorbs mash expansion and retention shifts to strictly hit the pre-boil target.

### The $\{V_{\text{pre boil}}, r\}$ Constraint Topology
This configuration fixes the target kettle volume while allowing optimization of lauter extraction efficiency, reaching its global mathematical maximum strictly at equal runnings ($r = 1.0$).

* Classification: Extensive + Intensive.
* Solver Simplification: Pairing a fixed pre-boil volume with the dimensionless runoff ratio eliminates grain moisture volume ($V_{\text{mc}}$) and solute displacement ($V_{\text{sol}}$) from the root-finding residual entirely.
* Static Constants: The first and second runnings volumes ($V_{\text{run 1}}$ and $V_{\text{run 2}}$) become static constants throughout the iterative solver loop.

## 4. 1D Root-Finding Formulation
To design a recipe targeting a defined post-boil extract mass $S_{\text{post boil}}^{\text{target}}$, the overall balance is evaluated as a scalar residual function $f(M_{\text{grist}}) = 0$.

$$\begin{aligned} f(M_{\text{grist}}) &= (\eta_{\text{conv}} \cdot E \cdot M_{\text{grist}}) \\ &\quad \times \Biggl[ 1 - \frac{\left(k_{\text{abs, true}} \cdot M_{\text{grist}} + V_{\text{dead}}\right)^2}{\left(V_{\text{strike}} + c_{\text{vol}} \cdot M_{\text{grist}}\right)\left(V_{\text{sparge}} + V_{\text{dead}} + k_{\text{abs, true}} \cdot M_{\text{grist}}\right)} \Biggr] \\ &\quad + S_{\text{late add.}} - S_{\text{post boil}}^{\text{target}} \end{aligned}$$

Clearing algebraic denominators converts this residual into an equivalent cubic polynomial optimized for numerical solvers like Brent's Method:

$$\begin{aligned} P(M_{\text{grist}}) &= (\eta_{\text{conv}} E M_{\text{grist}}) \left[ D_1(M_{\text{grist}}) D_2(M_{\text{grist}}) - V_{\text{ret}}(M_{\text{grist}})^2 \right] \\ &\quad - \left(S_{\text{post boil}}^{\text{target}} - S_{\text{late add.}}\right) D_1(M_{\text{grist}}) D_2(M_{\text{grist}}) = 0 \end{aligned}$$

The solver initializes a guaranteed bracketing interval $[a, b]$ where the bounds are constructed as follows:

* Lower Bound ($a$): $a = \max\left(0.0, \; \frac{S_{\text{post boil}}^{\text{target}} - S_{\text{late add.}}}{E}\right)$
* Upper Bound ($b$): $b = \frac{S_{\text{post boil}}^{\text{target}} - S_{\text{late add.}}}{0.50 \cdot E}$

## 5. Computational Workflow Pipeline
The recipe formulation workflow executes in four sequential phases to logically reverse physical brewing mechanics prior to executing the numerical solver.

### Phase 1: Cold-Side Inverse Resolution
The pipeline begins by mathematically isolating the precise Original Gravity constraint required to hit the user's alcoholic strength target.

* Iterative Resolution: The target ABV and Apparent Attenuation (AA) parameters are fed into an inverse empirical solver.
* State Lock: The solver isolates the Original Gravity ($SG_{\text{post boil}}$ at $20^\circ\text{C}$) as an immutable constraint for the hot-side phase.

### Phase 2: Volumetric Reversal & Extract Targeting
The system calculates absolute mass boundaries by reversing kettle boil-off and contraction mechanics. This phase is the **bridge** between the application input state ($V_{\text{ferm}}$) and the solver constraint topology ($V_{\text{pre boil}}$): the cold fermenter volume $V_{\text{ferm}}$ is the **primary user input**, and the pre-boil volume $V_{\text{pre boil}}$ below is the **derived output** handed to the root-finder.

* Total Cold Kettle Volume: $V_{\text{kettle, cold}} = V_{\text{ferm}} + \left[ V_{\text{kettle dead}} \cdot (1 - f_{\text{shrink}}) \right]$
* Total Extract Target: $S_{\text{post boil}}^{\text{target}} = \frac{1000 \cdot (SG_{\text{post boil}} - 1) \cdot V_{\text{kettle, cold}}}{\gamma}$
* Validation Gate: The finite state machine confirms $S_{\text{post boil}}^{\text{target}} - S_{\text{late add.}} > 0$ to prevent bracketing a negative grist mass.
* Extensive Pre-Boil Anchor: Derives the required kettle target volume:
$$\begin{aligned} V_{\text{pre boil}} &= \frac{V_{\text{ferm}}}{(1 - f_{\text{shrink}})} + V_{\text{kettle dead}} + \Delta V_{\text{evap}} - (\bar{v} \cdot S_{\text{late add.}}) \end{aligned}$$


### Phase 3: Grist Mass Resolution (1D Root-Finding)
With boundaries successfully validated, the system evaluates the root grist mass.

* Brent's Method Execution: Pairing the derived extensive boundary ($V_{\text{pre boil}}$) with the selected intensive constraint ($R_{L:G}$ or $r$), the system executes Brent's Method on the polynomial until $M_{\text{grist}}$ fully converges. Note that the solver consumes the **derived** $\{V_{\text{pre boil}}, \cdot\}$ pair, not the user-facing $\{V_{\text{ferm}}, \cdot\}$ pair.

### Phase 4: Stage Volume & Gravity Cascade
Post-convergence, physical volumes are cascaded dependent on the chosen constraint pair.

* Under $\{V_{\text{pre boil}}, R_{L:G}\}$: $V_{\text{strike}}$ scales linearly inside the solver loop. $V_{\text{run 1}}$ is derived via tun mass balance, leaving $V_{\text{run 2}}$ (and consequently $V_{\text{sparge}}$) to supply the remainder of $V_{\text{pre boil}}$.
* Under $\{V_{\text{pre boil}}, r\}$: $V_{\text{sparge}}$ and $V_{\text{run 2}}$ are evaluated statically as fractions of the total target ($\frac{V_{\text{pre boil}}}{r + 1}$). $V_{\text{run 1}}$ remains a static remainder. $V_{\text{strike}}$ is mathematically reversed in a single post-solve evaluation to absorb retention.
* Pre-Boil Gravity Assembly: $SG_{\text{pre boil}} = 1 + \frac{(S_{\text{run 1}} + S_{\text{run 2}}) \cdot \gamma}{1000 \cdot V_{\text{pre boil}}}$

## 6. Python Implementation: Gravity Solvers
The cold-side inverse resolution and pre-boil gravity assembly described in Phase 1 and Phase 4 are executed programmatically via `scipy.optimize`.

```python
import scipy.optimize as optimize

def asbc_plato_to_sg(plato: float) -> float:
    """Converts Degrees Plato to Specific Gravity using ASBC cubic polynomial."""
    return 1.0 + (0.0038661 * plato) + (1.34e-5 * (plato**2)) + (4.3e-8 * (plato**3))

def asbc_sg_to_plato(sg: float) -> float:
    """Converts Specific Gravity to Degrees Plato using ASBC quadratic equation."""
    return -463.37 + (668.72 * sg) - (205.35 * (sg**2))

def cutaia_abv(oe_plato: float, apparent_attenuation: float) -> float:
    """Calculates ABV using the Cutaia et al. (2009) empirical model."""
    ae_plato = oe_plato * (1.0 - apparent_attenuation)
    re_plato = (0.1808 * oe_plato) + (0.8192 * ae_plato)
    
    abw = 0.38726 * (oe_plato - re_plato) + 0.00307 * ((oe_plato - re_plato)**2)
    fg_sg = asbc_plato_to_sg(ae_plato)
    
    abv = abw * (fg_sg / 0.791)
    return abv

def solve_sg_post_boil_from_abv(target_abv: float, apparent_attenuation: float) -> float:
    """
    Phase 1: Cold-Side Inverse Resolution
    Isolates the Original Gravity (SG_post_boil) required to hit a target ABV.
    """
    def residual(oe_plato: float) -> float:
        return cutaia_abv(oe_plato, apparent_attenuation) - target_abv
        
    # Search bracket bounded between pure water (0 P) and extreme high gravity (40 P)
    target_oe_plato = optimize.brentq(residual, 0.0, 40.0)
    
    return asbc_plato_to_sg(target_oe_plato)

def calculate_sg_pre_boil(s_run1: float, s_run2: float, v_pre_boil: float, gamma: float = 385.5) -> float:
    """
    Phase 4: Pre-Boil Gravity Assembly
    Derives the consolidated pre-boil specific gravity from recovered stage extracts.

    gamma is the metric gravity-points conversion constant in GU·L/kg (385.5),
    consistent with the metric standards declared in inputs-and-outputs.md.
    """
    return 1.0 + (((s_run1 + s_run2) * gamma) / (1000.0 * v_pre_boil))
```
