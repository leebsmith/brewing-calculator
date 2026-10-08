# 1-Strike 1-Sparge Batch Sparging: Canonical Mass and Volume Balance Specification (Option A)

This document specifies the rigorous physical model (Option A) for a two-stage equilibrium batch sparging brewing system ($\eta_{\text{mix}} = 1.0$). It explicitly accounts for enzymatic conversion efficiency, malt solute expansion volume ($V_{\text{sol}}$), intrinsic grain moisture ($V_{\text{mc}}$), true bed retention ($V_{\text{abs}}$), and static hardware dead space ($V_{\text{dead}}$).

---

## 1. Master Canonical Extract Balance

The total soluble extract mass in the kettle post-boil ($S_{\text{post boil}}$) is given by:

$$S_{\text{post boil}} = S_{\text{conv}} \cdot \left[ 1 - \left( \frac{V_{\text{ret}}}{V_{\text{strike}} + V_{\text{mc}} + V_{\text{sol}}} \right) \left( \frac{V_{\text{ret}}}{V_{\text{sparge}} + V_{\text{ret}}} \right) \right] + S_{\text{late add.}}$$

### Fully Expanded Formulation

Expanding all state variables into fundamental recipe and equipment parameters:

$$S_{\text{post boil}} = \left(\eta_{\text{conv}} \cdot Y_{\text{theo. max}}\right) \cdot \left[ 1 - \left( \frac{k_{\text{abs, true}} \cdot M_{\text{grist}} + V_{\text{dead}}}{V_{\text{strike}} + \left(\frac{M_{\text{grist}} \cdot \overline{\text{MC}}}{\rho_{\text{water}}}\right) + \bar{v} \cdot \eta_{\text{conv}} \cdot Y_{\text{theo. max}}} \right) \left( \frac{k_{\text{abs, true}} \cdot M_{\text{grist}} + V_{\text{dead}}}{V_{\text{sparge}} + k_{\text{abs, true}} \cdot M_{\text{grist}} + V_{\text{dead}}} \right) \right] + S_{\text{late add.}}$$

---

## 2. Sub-Equations and State Variables

### A. Mash Solute Generation
* **Theoretical Maximum Extract Mass:**
  $$Y_{\text{theo. max}} = M_{\text{grist}} \cdot \sum_{i} \left( w_i \cdot \text{DBFG}_i \cdot (1 - \text{MC}_i) \right)$$
  *(where $w_i$ is the mass fraction of malt $i$ in the grist)*

* **Converted Soluble Extract Mass:**
  $$S_{\text{conv}} = \eta_{\text{conv}} \cdot Y_{\text{theo. max}}$$

* **Solute Displacement Volume:**
  $$V_{\text{sol}} = \bar{v} \cdot S_{\text{conv}}$$

* **Intrinsic Grain Moisture Volume:**
  $$V_{\text{mc}} = \frac{M_{\text{grist}} \cdot \overline{\text{MC}}}{\rho_{\text{water}}}$$

### B. Retention Kinetics
* **Total Retained Volume (Spent Husk + Hardware Loop):**
  $$V_{\text{ret}} = V_{\text{abs}} + V_{\text{dead}} = (k_{\text{abs, true}} \cdot M_{\text{grist}}) + V_{\text{dead}}$$

* **First Runnings Retention Fraction ($R_{\text{f1}}$):**
  $$R_{\text{f1}} = \frac{V_{\text{ret}}}{V_{\text{strike}} + V_{\text{mc}} + V_{\text{sol}}}$$

* **Second Runnings Retention Fraction ($R_{\text{f2}}$):**
  $$R_{\text{f2}} = \frac{V_{\text{ret}}}{V_{\text{sparge}} + V_{\text{ret}}}$$

* **Lauter Extraction Efficiency ($\eta_{\text{lauter}}$):**
  $$\eta_{\text{lauter}} = 1 - (R_{\text{f1}} \cdot R_{\text{f2}})$$

---

## 3. Runoff Volumetrics and Kettle Balance

### A. Runoff Volume Allocation
* **First Runnings Drained to Kettle:**
  $$V_{\text{run 1}} = V_{\text{strike}} + V_{\text{mc}} + V_{\text{sol}} - V_{\text{ret}}$$

* **Second Runnings Drained to Kettle:**
  $$V_{\text{run 2}} = V_{\text{sparge}}$$

* **Total Pre-Boil Kettle Volume (Hot, Runoff Temp $\approx 68\text{--}75^\circ\text{C}$):**
  $$V_{\text{pre boil}} = V_{\text{run 1}} + V_{\text{run 2}} = V_{\text{strike}} + V_{\text{sparge}} + V_{\text{mc}} + V_{\text{sol}} - V_{\text{ret}}$$

### B. Post-Boil and Chilled Kettle Volume
* **Hot Post-Boil Volume ($100^\circ\text{C}$):**
  $$V_{\text{post boil, hot}} = V_{\text{pre boil}} - \Delta V_{\text{evap}} + (\bar{v}_{\text{late}} \cdot S_{\text{late add.}}) - V_{\text{kettle dead}}$$

* **Chilled Post-Boil Volume ($20^\circ\text{C}$ Reference):**
  $$V_{\text{post boil, 20°C}} = V_{\text{post boil, hot}} \cdot (1 - f_{\text{shrink}})$$

---

## 4. Stage Extract Distribution and Specific Gravity

Assuming extract mass $S$ is expressed in pounds ($\text{lb}$) or kilograms ($\text{kg}$):

### A. First Runnings
* **Extract Mass:**
  $$S_{\text{run 1}} = S_{\text{conv}} \cdot (1 - R_{\text{f1}})$$
* **Specific Gravity:**
  $$SG_{\text{run 1}} = 1 + \frac{S_{\text{run 1}} \cdot \gamma}{1000 \cdot V_{\text{run 1}}}$$

### B. Second Runnings
* **Extract Mass:**
  $$S_{\text{run 2}} = (S_{\text{conv}} \cdot R_{\text{f1}}) \cdot (1 - R_{\text{f2}})$$
* **Specific Gravity:**
  $$SG_{\text{run 2}} = 1 + \frac{S_{\text{run 2}} \cdot \gamma}{1000 \cdot V_{\text{run 2}}}$$

### C. Kettle Gravities
* **Pre-Boil Gravity:**
  $$SG_{\text{pre boil}} = 1 + \frac{(S_{\text{run 1}} + S_{\text{run 2}}) \cdot \gamma}{1000 \cdot V_{\text{pre boil}}}$$

* **Chilled Post-Boil Gravity ($20^\circ\text{C}$):**
  $$SG_{\text{post boil}} = 1 + \frac{S_{\text{post boil}} \cdot \gamma}{1000 \cdot V_{\text{post boil, 20°C}}}$$

*(Conversion scalar: $\gamma = 46.21\text{ GU}\cdot\text{gal/lb}$ for US Customary; $\gamma = 385.5\text{ GU}\cdot\text{L/kg}$ for Metric).*

---

## 5. Parameter Dictionary and Baseline Constants

| Symbol | Parameter Description | US Customary | Metric | Default / Baseline |
| :--- | :--- | :--- | :--- | :--- |
| $M_{\text{grist}}$ | Total dry grain bill mass | $\text{lb}$ | $\text{kg}$ | Recipe input |
| $\text{DBFG}$ | Dry-basis fine-grind extract potential | Fraction ($0\text{--}1$) | Fraction ($0\text{--}1$) | $0.80 - 0.83$ (Base malt) |
| $\text{MC}$ | Malt as-is moisture content | Fraction ($0\text{--}1$) | Fraction ($0\text{--}1$) | $0.035 - 0.050$ ($4.0\%$) |
| $\eta_{\text{conv}}$ | Enzymatic conversion efficiency | Fraction ($0\text{--}1$) | Fraction ($0\text{--}1$) | $0.94 - 0.98$ |
| $\bar{v}$ | Apparent specific volume of dissolved extract | $\text{gal/lb}$ | $\text{L/kg}$ | $0.075\text{ gal/lb}$ ($0.625\text{ L/kg}$) |
| $k_{\text{abs, true}}$ | True husk water-holding capacity | $\text{gal/lb}$ | $\text{L/kg}$ | $0.20\text{ gal/lb}$ ($1.67\text{ L/kg}$) |
| $\rho_{\text{water}}$ | Water density at mash temperature | $\text{lb/gal}$ | $\text{kg/L}$ | $8.33\text{ lb/gal}$ ($1.00\text{ kg/L}$) |
| $V_{\text{dead}}$ | Tun false bottom, pump, and hose dead space | $\text{gal}$ | $\text{L}$ | Calibrated ($0.20 - 0.60\text{ gal}$) |
| $V_{\text{strike}}$ | Mash strike liquor volume | $\text{gal}$ | $\text{L}$ | User input |
| $V_{\text{sparge}}$ | Batch sparge liquor volume | $\text{gal}$ | $\text{L}$ | User input |
| $S_{\text{late add.}}$ | Boil kettle late additions (extract/sugars) | $\text{lb}$ | $\text{kg}$ | Recipe input ($0.0$ default) |
| $\Delta V_{\text{evap}}$ | Kettle boil-off volume | $\text{gal}$ | $\text{L}$ | System calibrated ($1.0 - 1.5\text{ gal/hr}$) |
| $V_{\text{kettle dead}}$| Unrecoverable kettle/chiller dead space | $\text{gal}$ | $\text{L}$ | System calibrated ($0.25 - 0.50\text{ gal}$) |
| $f_{\text{shrink}}$ | Wort thermal contraction coefficient | Fraction | Fraction | $0.040$ ($4\%$ from $100^\circ\text{C} \to 20^\circ\text{C}$) |
| $\gamma$ | Gravity points conversion constant | $\text{GU}\cdot\text{gal/lb}$ | $\text{GU}\cdot\text{L/kg}$ | $46.21$ (US) / $385.5$ (Metric) |

---

## 6. Implementation Verification and Optimization

### 1. Liquid Volume Conservation Check
$$\left(V_{\text{run 1}} + V_{\text{run 2}}\right) + V_{\text{ret}} = V_{\text{strike}} + V_{\text{sparge}} + V_{\text{mc}} + V_{\text{sol}}$$

### 2. Extract Mass Conservation Check
$$S_{\text{run 1}} + S_{\text{run 2}} + \left(S_{\text{conv}} \cdot R_{\text{f1}} \cdot R_{\text{f2}}\right) = S_{\text{conv}}$$

### 3. Optimal Liquor Split (Equal Runnings Optimization)
To minimize retained extract loss ($R_{\text{f1}} \cdot R_{\text{f2}}$), runoff volumes must be equalized ($V_{\text{run 1}} = V_{\text{run 2}}$). For a fixed total liquor volume $V_{\text{total}} = V_{\text{strike}} + V_{\text{sparge}}$:

$$V_{\text{strike}} = \frac{V_{\text{total}} + V_{\text{ret}} - (V_{\text{mc}} + V_{\text{sol}})}{2}$$

$$V_{\text{sparge}} = \frac{V_{\text{total}} - V_{\text{ret}} + (V_{\text{mc}} + V_{\text{sol}})}{2}$$