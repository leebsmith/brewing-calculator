The liquid volumetric subsystem possesses two degrees of freedom ($N_{\text{liq}} = 2$) and requires exactly two independent constraints to uniquely resolve the mathematical system without resulting in a rank-deficient matrix ($\det(\mathbf{J}) = 0$). To avoid calculating an infinite continuum of theoretical batch sizes, at least one constraint must be an extensive variable that dictates the absolute physical scale, while the other is optimally an intensive variable that defines physical proportions independent of scale.

Within a top-down, target-driven recipe formulation workflow, $\{V_{\text{pre boil}}, r\}$ and $\{V_{\text{pre boil}}, R_{L:G}\}$ are the only practical pairs because they anchor the extraction mathematics directly to the target kettle yield while allowing operational parameters to control fluid dynamics.

### The $\{V_{\text{pre boil}}, R_{L:G}\}$ Constraint Topology

* **Classification:** Extensive + Intensive.


* **Workflow Alignment:** This matches standard brewing practice by establishing a fixed pre-boil volume constraint while enforcing a specific physical thickness and fluidity for the mash bed, regardless of the overall batch scale.


* **Solver Behavior:** The strike volume ($V_{\text{strike}}(M)$) scales linearly alongside the calculated grist mass, while the sparge volume ($V_{\text{sparge}}(M)$) dynamically absorbs any volumetric shifts caused by mash expansion and true husk retention to strictly hit the pre-boil target.



### The $\{V_{\text{pre boil}}, r\}$ Constraint Topology

* **Classification:** Extensive + Intensive.


* **Workflow Alignment:** This configuration fixes the target kettle volume while directly optimizing lauter extraction efficiency ($\eta_{\text{lauter}}$), which reaches its global mathematical maximum strictly at equal runnings ($r = 1.0$).


* **Solver Behavior:** Pairing a fixed pre-boil volume with the dimensionless runoff ratio triggers a fundamental mathematical simplification. The intrinsic grain moisture volume ($V_{\text{mc}}$) and solute displacement volume ($V_{\text{sol}}$) drop out of the root-finding residual function entirely. Consequently, the first and second runnings volumes ($V_{\text{run 1}}$ and $V_{\text{run 2}}$) are treated as static constants throughout the iterative solver loop rather than floating dynamically.



### Impracticality of Alternative Pairs

The remaining mathematically permissible constraint configurations contradict the goal of designing a recipe from a defined endpoint target, either by forcing the final pre-boil volume to float unpredictably or by treating fluid dynamics as rigid constants:

* **Total Inventory Anchors ($\{V_{\text{total}}, r\}$ or $\{V_{\text{total}}, R_{L:G}\}$):** Fixing the total hot liquor tank inventory ($V_{\text{total}}$) upfront forces the final pre-boil volume to float as an endogenous output. Because intrinsic grain moisture and solute expansion dynamically alter the liquid yield based on the total grain mass, the brewer cannot guarantee a precise volume into the kettle.


* **Rigid Volume Anchors ($\{V_{\text{strike}}, V_{\text{sparge}}\}$ or $\{V_{\text{pre boil}}, V_{\text{strike}}\}$):** Supplying liquid additions as absolute, static numerical inputs confines all mathematical non-linearities strictly to extraction and retention physics. These pairs are required for rigid hardware limitations (such as RIMS/HERMS systems needing a specific minimum strike volume to submerge heating elements) or manual vessel additions, rather than fluid recipe formulation.


* **Hardware Capacity Bounds ($\{R_{L:G}, V_{\text{sparge}}\}$):** Anchoring the system to a fixed sparge capacity while allowing the strike volume to scale dynamically is a constraint used to accommodate a specifically undersized hot liquor tank, not a standard formulation parameter.


* **Pure Intensive Pairs ($\{R_{L:G}, r\}$):** Specifying only dimensionless ratios provides no volumetric scale. The system becomes scale-invariant and mathematically invalid because an infinite number of batch sizes can satisfy the criteria without anchoring to a physical target.