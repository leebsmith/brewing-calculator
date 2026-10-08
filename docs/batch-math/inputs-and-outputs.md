# Inputs and Outputs

## Prerequisite Inputs / Data Collection

To resolve the master batch equations outlined in the "Batch Sparging Mathematics" document, the computational pipeline requires the collection of the following prerequisite variables before the finite state machine can initialize:

* Target Endpoints:
   * Desired Alcohol by Volume (ABV)
   * Apparent Attenuation (AA)
* Operational Input Pair:
   * Target cold fermenter volume ($V_{\text{ferm}}$) paired with either the Liquor-to-Grist Ratio ($R_{L:G}$) or the Runoff Ratio ($r$). The pre-boil kettle volume ($V_{\text{pre boil}}$) is a derived output of the volumetric reversal phase, not a direct input.
* Recipe Parameters:
   * Late addition extract mass ($S_{\text{late add.}}$)
   * Malt specification vector, which includes mass fractions ($w_i$), dry-basis fine-grind potential ($\text{DBFG}_i$), and moisture content ($\text{MC}_i$)
* System Constants:
   * Calibrated kettle boil-off volume ($\Delta V_{\text{evap}}$)
   * Unrecoverable kettle and chiller dead space ($V_{\text{kettle dead}}$)
   * Mash tun dead space ($V_{\text{dead}}$)
   * Mash conversion efficiency ($\eta_{\text{conv}}$)
   * Thermal contraction coefficient ($f_{\text{shrink}}$), which defaults to 4.0%
* Physical Constants:
   * Apparent specific volume of dissolved extract ($\bar{v}$)
   * True husk absorption coefficient ($k_{\text{abs, true}}$)
   * Density of water at strike temperature ($\rho_{\text{water}}$)

## Physical Constants

Based on the "Batch Sparging Mathematics" parameter dictionary, the metric standards and baseline defaults for the physical constants are:

* Apparent specific volume of dissolved extract ($\bar{v}$): 0.625 L/kg
* True husk absorption coefficient ($k_{\text{abs, true}}$): 1.67 L/kg
* Density of water at strike temperature ($\rho_{\text{water}}$): 1.00 kg/L
Additionally, the gravity points conversion constant ($\gamma$) utilizes a metric standard of 385.5 GU·L/kg.

## Operational Constrain Pairs and Calculation Cascades

The calculation cascade and solver behavior for the physical stage volumes shift fundamentally depending on which operational constraint pair is selected.

The $\{V_{\text{ferm}}, R_{L:G}\}$ Constraint Topology
In this configuration, the strike volume scales linearly with the grist mass, forcing the sparge volume to dynamically absorb fluid retention shifts to hit the derived pre-boil target.

* Strike Volume ($V_{\text{strike}}$): Calculated dynamically inside the root-finding solver loop as a linear function of the dry grist mass ($V_{\text{strike}} = R_{L:G} \cdot M_{\text{grist}}$).
* First Runnings ($V_{\text{run 1}}$): Derived via the mash tun mass balance by taking the strike volume, adding intrinsic grain moisture and solute displacement, and subtracting the total retained volume.
* Second Runnings ($V_{\text{run 2}}$): Evaluated by subtracting the first runnings from the extensive pre-boil kettle anchor ($V_{\text{pre boil}} - V_{\text{run 1}}$).
* Sparge Volume ($V_{\text{sparge}}$): In a single-batch sparge, this is physically identical to the second runnings, expanding dynamically to satisfy the kettle target.

The $\{V_{\text{ferm}}, r\}$ Constraint Topology
Pairing a fixed fermenter volume with a runoff ratio triggers a mathematical simplification that treats the runoff volumes as static constants independent of the dynamic grist calculations.

* Sparge Volume ($V_{\text{sparge}}$) and Second Runnings ($V_{\text{run 2}}$): Calculated as a statically linked fraction of the total pre-boil target before the solver even executes ($V_{\text{sparge}} = V_{\text{run 2}} = \frac{V_{\text{pre boil}}}{r + 1}$).
* First Runnings ($V_{\text{run 1}}$): Dictated entirely by the ratio and pre-boil volume, evaluated statically as the remainder of the total target ($V_{\text{pre boil}} - V_{\text{run 2}}$).
* Strike Volume ($V_{\text{strike}}$): Computed in a single post-solve evaluation once $M_{\text{grist}}$ converges, mathematically reversing the tun mass balance to absorb the fluid retention and displacement variables.
