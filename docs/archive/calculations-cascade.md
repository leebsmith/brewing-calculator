**The $\{V_{\text{pre boil}}, R_{L:G}\}$ Constraint Topology**
In this configuration, the strike volume scales linearly with the grist mass, forcing the sparge volume to dynamically absorb expansion and retention shifts to hit the static pre-boil target.

* **Strike Volume ($V_{\text{strike}}$):** Calculated directly inside the solver loop as a linear function of the dry grist mass: $V_{\text{strike}} = R_{L:G} \cdot M_{\text{grist}}$.


* **First Runnings ($V_{\text{run 1}}$):** Derived from the mass balance of the mash tun by taking the strike volume, adding the intrinsic grain moisture ($V_{\text{mc}}$) and solute displacement ($V_{\text{sol}}$), and subtracting the total retained volume ($V_{\text{ret}}$): $V_{\text{run 1}} = V_{\text{strike}} + V_{\text{mc}} + V_{\text{sol}} - V_{\text{ret}}$.


* **Second Runnings ($V_{\text{run 2}}$):** Defined by subtracting the first runnings from the extensive kettle anchor: $V_{\text{run 2}} = V_{\text{pre boil}} - V_{\text{run 1}}$.


* **Sparge Volume ($V_{\text{sparge}}$):** In a single-batch sparge, this is physically identical to the second runnings: $V_{\text{sparge}} = V_{\text{run 2}}$. It is fully expanded in the master balance as: $V_{\text{sparge}} = V_{\text{pre boil}} - V_{\text{strike}} - (c_{\text{vol}} - k_{\text{abs, true}}) M_{\text{grist}} + V_{\text{dead}}$.



**The $\{V_{\text{pre boil}}, r\}$ Constraint Topology**
Pairing the pre-boil volume with the runoff ratio triggers a fundamental mathematical simplification, treating the first and second runnings as static constants during iteration and dropping grain moisture and solute displacement from the root-finding residual entirely.

* **Sparge Volume ($V_{\text{sparge}}$) and Second Runnings ($V_{\text{run 2}}$):** Calculated identically as a static fraction of the total pre-boil target before the solver even executes: $V_{\text{sparge}} = V_{\text{run 2}} = \frac{V_{\text{pre boil}}}{r + 1}$.


* **First Runnings ($V_{\text{run 1}}$):** Dictated entirely by the ratio and pre-boil volume, remaining completely independent of the dynamic grist mass calculations: $V_{\text{run 1}} = V_{\text{pre boil}} - V_{\text{run 2}}$.


* **Strike Volume ($V_{\text{strike}}$):** Computed in a single post-solve evaluation once $M_{\text{grist}}$ converges, mathematically reversing the tun mass balance to absorb the fluid retention and displacement variables: $V_{\text{strike}} = V_{\text{run 1}} + V_{\text{ret}} - \left[ V_{\text{mc}} + V_{\text{sol}} \right]$.