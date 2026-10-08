The top-down recipe formulation workflow requires a strictly sequential computational pipeline that reverses physical brewing mechanics to establish mathematical boundaries before executing the root-finding solver.

### 1. Prerequisite Data Collection

Before the finite state machine (FSM) can initialize, the following system, recipe, and physical constants must be collected into memory:

* **Target Endpoints:** Desired Alcohol by Volume (ABV), Apparent Attenuation (AA), and cold fermenter volume ($V_{\text{ferm}}$).
* **Operational Input Pair:** The target pre-boil kettle volume ($V_{\text{pre boil}}$), paired with either a Liquor-to-Grist Ratio ($R_{L:G}$) or a Runoff Ratio ($r$).


* **Recipe Parameters:** Late addition extract mass ($S_{\text{late add.}}$) and the malt specification vector containing mass fractions ($w_i$), dry-basis fine-grind potential ($\text{DBFG}_i$), and moisture content ($\text{MC}_i$).


* **System Constants:** Calibrated kettle boil-off volume ($\Delta V_{\text{evap}}$), kettle/chiller dead space ($V_{\text{kettle dead}}$), mash tun dead space ($V_{\text{dead}}$), conversion efficiency ($\eta_{\text{conv}}$), and thermal contraction coefficient ($f_{\text{shrink}}$, defaulting to 4.0%).


* **Physical Constants:** Specific volume of extract ($\bar{v}$), true husk absorption ($k_{\text{abs, true}}$), and water density ($\rho_{\text{water}}$).



### 2. Phase 1: Cold-Side Inverse Resolution

The pipeline begins by mathematically isolating the precise Original Gravity (OG) constraint required to hit the user's final alcoholic strength target.

1. **Iterative Gravity Targeting:** The target ABV and AA parameters are fed into an inverse empirical solver (such as the Cutaia equations).


2. **State Lock:** The inverse solver outputs the mathematically precise chilled post-boil specific gravity ($SG_{\text{post boil}}$ at $20^\circ\text{C}$), which is locked in as an immutable constraint for the hot-side extraction phase.



### 3. Phase 2: Volumetric Reversal & Extract Targeting

To prevent the root-finding solver from evaluating infinite batches or negative spaces, the application must construct the absolute volumetric and mass bounds by reversing kettle mechanics.

1. **Resolve Absolute Cold Kettle Volume:** Because unrecoverable trub contains identical sugar concentrations to the cast-out wort, the system calculates the total cold kettle volume ($V_{\text{kettle, cold}}$) to prevent an under-extracted mash:

$$V_{\text{kettle, cold}} = V_{\text{ferm}} + \left[ V_{\text{kettle dead}} \cdot (1 - f_{\text{shrink}}) \right]$$


.


2. **Calculate Total Extract Mass:** Combine the derived $SG_{\text{post boil}}$ with the total cold volume to establish the absolute required soluble extract mass in the kettle ($S_{\text{post boil}}^{\text{target}}$):

$$S_{\text{post boil}}^{\text{target}} = \frac{1000 \cdot (SG_{\text{post boil}} - 1) \cdot V_{\text{kettle, cold}}}{\gamma}$$


.


3. **Validate Net Mash Requirement:** Subtract the static user-provided late addition extract ($S_{\text{late add.}}$) from $S_{\text{post boil}}^{\text{target}}$ to define the net extract ($S_{\text{net}}$) that must be enzymatically converted. The FSM must confirm $S_{\text{net}} > 0$ to prevent bracketing a negative, physically impossible grist mass.


4. **Derive the Extensive Pre-Boil Anchor:** The pipeline works backward from the fermenter through thermal expansion and boil-off to establish the necessary $V_{\text{pre boil}}$ anchor constraint:

$$V_{\text{pre boil}} = \frac{V_{\text{ferm}}}{(1 - f_{\text{shrink}})} + V_{\text{kettle dead}} + \Delta V_{\text{evap}} - (\bar{v} \cdot S_{\text{late add.}})$$


.


5. **Calculate Hot Post-Boil Volume:** The hot kettle volume prior to chilling is established natively as:

$$V_{\text{post boil, hot}} = V_{\text{pre boil}} - \Delta V_{\text{evap}} + (\bar{v} \cdot S_{\text{late add.}}) - V_{\text{kettle dead}}$$


.



### 4. Phase 3: Grist Mass Resolution (1D Root-Finding)

With the extensive boundary ($V_{\text{pre boil}}$) and the intensive constraint (either $R_{L:G}$ or $r$) established, the system evaluates the master canonical extract balance to determine the required dry grist mass ($M_{\text{grist}}$).

1. **Pre-Compute Grist Variables:** The malt specification vectors are aggregated into a composite extract potential ($E$) and weighted moisture fraction ($\overline{\text{MC}}$).


2. **Initialize Search Bracket:** The solver constructs a strict interval $[a, b]$ where the lower bound assumes 100% theoretical conversion efficiency ($a = (S_{\text{post boil}}^{\text{target}} - S_{\text{late add.}}) / E$) and the upper bound assumes a worst-case 50% lauter recovery.


3. **Execute Brent's Method:** The 1D solver evaluates the cubic polynomial, driving the scalar residual function $f(M_{\text{grist}})$ to zero until the exact required $M_{\text{grist}}$ converges.



### 5. Phase 4: Stage Volume & Gravity Cascade

Once $M_{\text{grist}}$ successfully converges, the pipeline back-calculates the physical stage volumes based specifically on the selected operational constraint pair.

**If Using the $\{V_{\text{pre boil}}, R_{L:G}\}$ Constraint Pair:**

* **Strike Volume:** Scales linearly inside the solver loop as $V_{\text{strike}} = R_{L:G} \cdot M_{\text{grist}}$.


* **First Runnings:** Derived via tun mass balance, adding intrinsic moisture ($V_{\text{mc}}$) and solute volume ($V_{\text{sol}}$), and subtracting total retained volume ($V_{\text{ret}}$): $V_{\text{run 1}} = V_{\text{strike}} + V_{\text{mc}} + V_{\text{sol}} - V_{\text{ret}}$.


* **Second Runnings:** Subtracted directly from the extensive anchor to fill the remaining kettle capacity: $V_{\text{run 2}} = V_{\text{pre boil}} - V_{\text{run 1}}$.


* **Sparge Volume:** Equal to the second runnings in a single-batch sparge: $V_{\text{sparge}} = V_{\text{run 2}}$.



**If Using the $\{V_{\text{pre boil}}, r\}$ Constraint Pair:**

* **Sparge Volume & Second Runnings:** Treated as statically linked fractions of the pre-boil target before iteration begins: $V_{\text{sparge}} = V_{\text{run 2}} = \frac{V_{\text{pre boil}}}{r + 1}$.


* **First Runnings:** Evaluated statically as the remainder of the total target: $V_{\text{run 1}} = V_{\text{pre boil}} - V_{\text{run 2}}$.


* **Strike Volume:** Mathematically reversed in a single post-solve evaluation to absorb retention and fluid expansion requirements: $V_{\text{strike}} = V_{\text{run 1}} + V_{\text{ret}} - \left[ V_{\text{mc}} + V_{\text{sol}} \right]$.



**Pre-Boil Gravity Assembly:**
Once all liquid stages are volumetrically resolved, the application calculates the total extract mass recovered from both runoff stages ($S_{\text{run 1}} + S_{\text{run 2}}$) and derives the consolidated pre-boil specific gravity:


$$SG_{\text{pre boil}} = 1 + \frac{(S_{\text{run 1}} + S_{\text{run 2}}) \cdot \gamma}{1000 \cdot V_{\text{pre boil}}}$$

.