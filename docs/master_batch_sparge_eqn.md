# Master Two-Stage Batch Sparge Equation

$$S_{kettle} = (P \times M \times C_{e}) \times \left[ 1 - \left( \frac{Loss_{equip} + (M \times A_{f})}{V_{strike} + \frac{M \times \text{moisture}\%}{\rho_{water}}} \right) \times \left( \frac{Loss_{equip} + (M \times A_{f})}{Loss_{equip} + (M \times A_{f}) + V_{run2}} \right) \right]$$

This equation models $S_{kettle}$ - the total amount of fermentable sugar (extract) collected in the boil kettle **at the end of the lauter, before the boil begins** (i.e., pre-boil extract), **prior to the addition of any fermentable sugars in the boil kettle**, during a two-stage batch sparge brewing process.

It factors into two multiplicative terms: the total sugar created during the mash, and the fraction of that sugar you successfully rinse into the kettle (lauter efficiency).

> **Pre-boil vs. post-boil:** $S_{kettle}$ is defined here as *pre-boil* extract. By conservation of extract, the total extract is unchanged by boiling (only the volume changes, concentrating the wort). Therefore $S_{kettle}^{preboil} = S_{kettle}^{postboil}$ **provided no late additions are made**. If **fermentable** late additions (sugars, DME, LME) are added during or after the boil, the post-boil extract exceeds the pre-boil extract by the late-addition contribution $S_{late}$:
> $$S_{kettle}^{postboil} = S_{kettle}^{preboil} + S_{late}$$
>
> **Scope note:** $S_{late}$ covers *fermentable* late additions only. Late hops (aroma, flavor, whirlpool) contribute no fermentable extract and are modeled separately in the hop schedule; they do not appear in this equation.

### Post-Boil Gravity Does NOT Include Late Additions

The boil solver's post-boil gravity $G2$ is the gravity of the **mash-derived wort only**, measured at flameout, *before* any fermentable late additions are stirred in. This is a deliberate modeling choice with three consequences:

1. **The boil solver's conservation equation stays clean.** $V1 \cdot G1 = V2 \cdot G2$ holds exactly, because $S_{late}$ is not injected between $V1$ and $V2$. If $G2$ included late additions, the conservation equation would become $V1 \cdot G1 + S_{late} = V2 \cdot G2$, and every case of the 2-DOF boil solver would need to be rewritten.

2. **The fermenter OG is a separate, downstream quantity.** The gravity the brewer measures in the fermenter *does* include late additions:
   $$OG_{fermenter} = 1 + \frac{S_{kettle} + S_{late}}{V_{packaged}}$$

3. **The bridge between them is the late-addition ΔOG.** The Late Additions step surfaces this explicitly:
   $$\Delta OG_{late} = \frac{S_{late}}{V_{packaged}}$$
   so the user can see exactly how much the late additions shift the gravity, and why $OG_{fermenter} \neq G2$.

> **UI labeling requirement:** Because $G2$ and $OG_{fermenter}$ are different quantities, they must be labeled unambiguously wherever they appear:
> * Step 2's $G2$ field → **"Post-Boil Gravity (kettle, pre-late)"**
> * Fermentation solver's $OG$ → **"Original Gravity (fermenter)"**
> * Late Additions step → **"ΔOG from late additions"** (the bridge value above)

## The Two Factors of the Equation

1. **Total Converted Sugar:** $(P \times M \times C_{e})$ This first factor represents the absolute maximum amount of sugar available in the mash tun before any draining occurs.
   * $P$: Potential extract of the malt (the maximum theoretical yield).
   * $M$: Mass of the grain bill.
   * $C_{e}$: Conversion efficiency (how successfully the mash enzymes converted starches into sugars).

2. **Lauter Efficiency:** $\left[1 - (Loss_{1}) \times (Loss_{2})\right]$ This bracket calculates how much of that converted sugar is successfully washed into the kettle. In a batch sparge, you drain the tun twice. The equation calculates the fraction of sugar left behind after the first drain, multiplies it by the fraction left behind after the second drain, and subtracts that combined loss from $1$ ($100\%$). Note that this is a *product* of two sequential drain-loss fractions, not two independent physical phases.

## Understanding the Drain Losses

The equation uses two separate fractions to represent the liquid left behind at each step. Because sugar is dissolved uniformly in the water, the fraction of liquid left behind equals the fraction of sugar left behind.

Both fractions share the same numerator, $Loss_{equip} + (M \times A_{f})$, which represents the **total liquid that does not drain** at each step:

* $Loss_{equip}$ — liquid trapped in the mash tun's dead space (below the false bottom, in hoses, etc.). This is the *same* value in both fractions, because the same physical equipment is present at both drains.
* $M \times A_{f}$ — liquid absorbed by the grain itself. This stays with the grain bed and never drains, regardless of how much sparge water you add.

> **Unit note:** $\text{moisture}\%$ must be expressed as a **decimal fraction** (e.g., $0.04$ for $4\%$), not as a percentage. Likewise, $\rho_{water}$ must be in the same mass units as $M$ (e.g., $8.32\ \text{lbs/gal}$ if $M$ is in pounds, or $1.0\ \text{kg/L}$ if $M$ is in kilograms).

* **First Runnings Loss Fraction:**
  $$\frac{Loss_{equip} + (M \times A_{f})}{V_{strike} + \frac{M \times \text{moisture}\%}{\rho_{water}}}$$
  * **Numerator:** The volume of liquid permanently trapped in the mash tun (equipment dead space plus water absorbed by the grain).
  * **Denominator:** The total volume of water present in the initial mash (your strike water plus the natural moisture already inside the dry grain).

* **Second Runnings (Sparge) Loss Fraction:**
  $$\frac{Loss_{equip} + (M \times A_{f})}{Loss_{equip} + (M \times A_{f}) + V_{run2}}$$
  * **Numerator:** The volume of liquid still trapped in the grain bed and equipment.
  * **Denominator:** The total liquid present during the sparge (the trapped liquid from step one plus the new sparge water, $V_{run2}$).

## Runnings Definitions

The two-stage batch sparge produces two distinct volumes of wort, collected sequentially into the same kettle:

* **First runnings ($V_{run1}$):** The wort that drains from the mash tun after the initial mash rest, before any sparge water is introduced. Its volume is set by the strike water minus the liquid retained by the grain bed and equipment dead space.
* **Second runnings ($V_{run2}$):** The wort collected after adding sparge water to the (already drained) grain bed and draining a second time. Its volume is the sparge water added, minus the liquid newly retained by the grain bed and equipment dead space.

Together they fill the kettle to the target pre-boil volume:

$$V_{wort} = V_{run1} + V_{run2}$$

> **Naming note:** These are *mash/lauter* volumes. They are distinct from the boil solver's `V1` (pre-boil kettle volume) and `V2` (post-boil kettle volume), which are used elsewhere in the calculator. The bridge between the two naming schemes is $V_{wort} = V_{1}^{calc}$ (the pre-boil volume).

## Solving for M

$M$ can be solved for in the master equation by root-finding algorithms. Rearrange the equation such that it becomes a function of $M$, and set it to zero.

$$f(M) = (P \times M \times C_{e}) \times \left[ 1 - \left( \frac{Loss_{equip} + (M \times A_{f})}{V_{strike} + \frac{M \times \text{moisture}\%}{\rho_{water}}} \right) \times \left( \frac{Loss_{equip} + (M \times A_{f})}{Loss_{equip} + (M \times A_{f}) + V_{run2}} \right) \right] - S_{kettle} = 0$$

## Recipe Formulation Options: $E_{kettle}$ / Known LGR / Known Runnings Ratio

All of the equations and equation cascades below assume that $M$ has been pre-determined by the root-finding algorithm above.

## Batch Sparge Recipe Calculation Cascades

### Efficiency Into the Kettle ($E_{kettle}$)

The formula for total efficiency into the kettle ($E_{kettle}$, often called mash efficiency or pre-boil efficiency) can be expressed in two ways:

1. **The Output Ratio:**
   For calculating actual efficiency, post brewday:
   $$E_{kettle,actual} = \frac{S_{kettle}}{P \times M}$$

2. **The Mechanical Expansion:**
   For calculating predicted efficiency, pre brewday, substitute the master equation for $S_{kettle}$ into the output ratio above. The $P \times M$ terms cancel, leaving only the lauter-efficiency bracket scaled by $C_{e}$:
   $$E_{kettle,theoretical} = \frac{S_{kettle}}{P \times M} = C_{e} \times \left[ 1 - \left( \frac{Loss_{equip} + (M \times A_{f})}{V_{strike} + \frac{M \times \text{moisture}\%}{\rho_{water}}} \right) \times \left( \frac{Loss_{equip} + (M \times A_{f})}{Loss_{equip} + (M \times A_{f}) + V_{run2}} \right) \right]$$

3. **Adjusting $C_{e}$ For Next Brewday:**
   If both $E_{kettle,actual}$ and $E_{kettle,theoretical}$ are known, we can calculate a new $C_{e,new}$ for next brewday:
   $$C_{e,new} = C_{e} \times (E_{kettle,actual} / E_{kettle,theoretical})$$

   > **Caveat:** This correction assumes the entire discrepancy between actual and theoretical efficiency is attributable to conversion efficiency. In practice, lauter losses ($Loss_{equip}$, $A_{f}$) also vary brew-to-brew. Treat $C_{e,new}$ as a first-order correction, not an exact calibration.

### Path 1: Known Liquor-to-Grist Ratio (LGR)

This cascade determines the required water volumes when you start with a fixed LGR (e.g., $1.5$ quarts per pound).

1. **Calculate Strike Water ($V_{strike}$):**
   $$V_{strike} = LGR \times M$$

2. **Calculate First Runnings Volume ($V_{run1}$):** This calculates the liquid that successfully drains out, factoring in the inherent grain moisture ($\text{moisture}\%$) and the water permanently trapped by equipment dead-space ($Loss_{equip}$) and grain absorption ($A_{f}$).
   $$V_{run1} = V_{strike} + \left( \frac{M \times \text{moisture}\%}{\rho_{water}} \right) - [Loss_{equip} + (M \times A_{f})]$$

   > **Warning:** If $V_{strike}$ is too small (an under-watered mash), $V_{run1}$ can go negative — meaning the grain absorbs more than the strike water provides. In practice this indicates an infeasible LGR; increase $V_{strike}$.

3. **Calculate Sparge Water ($V_{run2}$):** Subtract the collected first runnings from your total target pre-boil volume.
   $$V_{run2} = V_{wort} - V_{run1}$$

   > **Invariant:** Throughout this document, $V_{wort} = V_{run1} + V_{run2}$ — the total pre-boil volume is exactly the sum of the two runnings.

### Path 2: Known Runnings Ratio

This cascade determines the required strike volume and LGR when you start with a specific target for your first drain (e.g., a $50/50$ equal volume split to maximize efficiency).

1. **Calculate First Runnings Volume ($V_{run1}$):** Multiply your total target pre-boil volume by your desired first runnings fraction (e.g., $0.5$ for a $50\%$ split).
   $$V_{run1} = V_{wort} \times \text{Target Fraction}$$
   (Your sparge water is then simply the remainder: $V_{run2} = V_{wort} - V_{run1}$)

2. **Calculate Required Strike Water ($V_{strike}$):** Work backward by adding the trapped system losses back to your target first runnings volume and subtracting the grain moisture contribution. (This is the algebraic inverse of Path 1, Step 2.)
   $$V_{strike} = V_{run1} + [Loss_{equip} + (M \times A_{f})] - \left( \frac{M \times \text{moisture}\%}{\rho_{water}} \right)$$

3. **Calculate Required LGR:** Divide the calculated required strike water by your known grain mass ($M$).
   $$LGR = \frac{V_{strike}}{M}$$

## Fermentation Solver (ABV-Centric Design)

Recipe designers think in terms of **ABV** (the product) and **apparent attenuation** (the yeast's behavior), not in terms of OG/FG (which are intermediate measurements). The fermentation solver inverts this relationship: given a target ABV and an expected attenuation, it derives the required OG and FG.

### The Four Variables

| Variable | Definition | Typical Range |
| :--- | :--- | :--- |
| $OE$ | Original Extract (°Plato) | $8 - 20\ ^\circ\text{P}$ |
| $AE$ | Apparent Extract (°Plato) | $0 - 8\ ^\circ\text{P}$ |
| $ABV$ | Alcohol by Volume (%) | $3 - 12\%$ |
| $AA$ | Apparent Attenuation (fraction) | $0.65 - 0.85$ |

These four variables are linked by **two independent equations**, giving a 2-DOF system: any two determine the other two.

### The Forward Equations (Cutaia, Reid & Speers, 2009)

**1. Alcohol by Weight (ABW):**
$$ABW = (0.372 + 0.00357 \times OE) \times (OE - AE)$$

The $0.00357 \times OE$ term captures the fact that higher-gravity worts yield more alcohol per unit of extract consumed — a real physical effect that the linear $131.25$ approximation misses.

**2. Alcohol by Volume (ABV):**
$$ABV = ABW \times \frac{SG_{final}}{0.7907}$$

where $0.7907$ is the density of ethanol (g/mL). This term accounts for the volumetric expansion of ethanol relative to the water it displaces.

**3. Apparent Attenuation (AA):**
$$AA = \frac{OE - AE}{OE}$$

**4. Real Extract (RE) and Real Degree of Fermentation (RDF):**
$$RE = 0.49681569 \times ABW + 1.0015341 \times AE - 0.00059105 \times (ABW \times AE) - 0.00029431 \times AE^2$$
$$RDF = \frac{OE - RE}{OE}$$

RDF is the *actual* attenuation, accounting for the fact that ethanol contributes to apparent gravity but is not extract. It is the correct metric for mouthfeel and body modeling.

### Plato ↔ Specific Gravity Conversion

Two ASBC empirical polynomials are used:

**Plato → SG (ASBC 3rd-order):**
$$SG = 1.0000131 + 0.00386777 \times P + 1.27447 \times 10^{-5} \times P^2 + 6.34964 \times 10^{-8} \times P^3$$

**SG → Plato (ASBC Table 1 cubic):**
$$P = -616.868 + 1111.14 \times SG - 630.272 \times SG^2 + 135.997 \times SG^3$$

> **Note:** These are two *different* empirical fits, not exact inverses. Round-tripping $P \to SG \to P$ drifts by ~$0.01 - 0.05\ ^\circ\text{P}$, well below measurement precision. Do not assume exactness.

### Inverse Pathway 1: Target ABV + Target AA → OE, AE

Given a target ABV and an expected apparent attenuation, solve for the required OE and AE:

1. Express $AE$ in terms of $OE$: $AE = OE \times (1 - AA)$.
2. Define the objective: $g(OE) = ABV(OE, AE(OE)) - ABV_{target}$.
3. Root-find $OE$ via Brent's method on $g(OE) = 0$, bracketed between $1.0\ ^\circ\text{P}$ (session wort) and $40.0\ ^\circ\text{P}$ (extreme gravity).
4. Back out $AE = OE \times (1 - AA)$.

This is the **primary design pathway**: the brewer specifies the beer they want (ABV + attenuation), and the solver derives the gravity targets.

### Inverse Pathway 2: Known OE + Target ABV → AE, AA

Given a measured or chosen OE and a target ABV, solve for the required AE and the attenuation it implies:

1. Compute the theoretical maximum ABV at full attenuation ($AE = 0$). If $ABV_{target}$ exceeds this, the target is infeasible.
2. Define the objective: $g(AE) = ABV(OE, AE) - ABV_{target}$.
3. Root-find $AE$ via Brent's method on $g(AE) = 0$, bracketed between $0.0\ ^\circ\text{P}$ and $OE$.
4. Back out $AA = (OE - AE) / OE$.

This is the **diagnostic pathway**: the brewer has a wort of known gravity and asks "what attenuation do I need to hit my ABV target?"

### Coupling to the Lauter Solver

The fermentation solver's output feeds the Lauter solver via the extract budget:

$$S_{fermenter,target} = (OG_{target} - 1) \times V_{packaged}$$
$$S_{kettle,target} = S_{fermenter,target} - S_{late}$$

where $V_{packaged}$ comes from the boil solver's downstream bridge, and $S_{late}$ comes from the Late Additions step. $S_{kettle,target}$ is then the RHS of the master sparge equation, which the Lauter solver inverts to find $M$.

> **Note:** $S_{late}$ *reduces* the grain bill. Adding fermentable late additions means less base malt is needed to hit the same OG — a physically correct and useful property.

### The Late-Addition Bridge (Displayed to the User)

The Late Additions step surfaces the bridge between the boil solver's $G2$ and the fermentation solver's $OG_{fermenter}$:

$$\Delta OG_{late} = \frac{S_{late}}{V_{packaged}}$$

This value is **displayed** in the Late Additions step so the user can see:
* The kettle gravity $G2$ (mash wort only, pre-late).
* The ΔOG contributed by their late additions.
* The resulting fermenter OG: $OG_{fermenter} = G2_{adjusted} + \Delta OG_{late}$, where $G2_{adjusted}$ accounts for the volume change from boil to packaging.

> **Why display it:** Without this bridge, a brewer who adds 1 kg of candi syrup at flameout would measure a higher kettle gravity than the boil solver predicts, and would have no way to reconcile the two numbers. The bridge makes the model transparent and self-documenting.

## Variable Glossary

| Variable | Definition | Typical Homebrew Value |
| :--- | :--- | :--- |
| $S_{kettle}$ | Total sugar/extract in the kettle at the end of the lauter (pre-boil) | Target varies by recipe |
| $P$ | Malt potential (choose one unit system and use it consistently) | $\sim 36-38 \text{ ppg}$ (points/pound/gallon) or decimal potential fraction $(\sim 0.85)^{1}$ or $L^{\circ}/kg$ $(LDK)^{2}$ |
| $M$ | Mass of the grain bill | Varies |
| $C_{e}$ | Conversion efficiency | $90\% - 100\%$ |
| $Loss_{equip}$ | Liquid left in hoses/tun dead-space | $0.1 - 0.5 \text{ gallons}$ |
| $A_{f}$ | Grain absorption factor | $\sim 0.1 - 0.125 \text{ gal/lb}$ |
| $V_{strike}$ | Initial strike water volume | Varies |
| $\text{moisture}\%$ | Grain moisture weight **fraction** (not percent) | $\sim 0.04$ |
| $\rho_{water}$ | Density of water (must match mass units of $M$) | $8.32 \text{ lbs/gal}$ or $1.0 \text{ kg/L}$ |
| $V_{run1}$ | First runnings volume — wort drained from the mash tun *before* any sparge water is added | Varies |
| $V_{run2}$ | Second runnings volume — sparge water added to the grain bed *after* the first drain, which becomes the second runnings | Varies |
| $V_{wort}$ | Target pre-boil wort volume — the sum of both runnings collected in the kettle ($V_{run1} + V_{run2}$) | Target varies by recipe |
| $E_{kettle}$ | Efficiency into the kettle | $< C_{e}$ |
| $S_{late}$ | Extract contributed by **fermentable** late additions (sugars, DME, LME); zero if none. Late hops contribute no extract and are out of scope for this term. | $0$ or recipe-dependent |
| $G2$ | Post-boil gravity of the **mash-derived wort only** (kettle, pre-late additions) | Target varies by recipe |
| $OG_{fermenter}$ | Original gravity in the fermenter, **including** $S_{late}$ | Target varies by recipe |
| $\Delta OG_{late}$ | Gravity shift contributed by late additions: $S_{late} / V_{packaged}$ | $0$ or recipe-dependent |

## Worked Example

A concrete numeric example to anchor the algebra. All values in metric.

**Given:**

| Parameter | Value |
| :--- | :--- |
| $M$ (grain mass) | $5.0\ \text{kg}$ |
| $P$ (malt potential) | $0.80$ (dimensionless fraction) |
| $C_{e}$ (conversion efficiency) | $0.95$ |
| $LGR$ (liquor-to-grist ratio) | $3.0\ \text{L/kg}$ |
| $A_{f}$ (grain absorption) | $0.96\ \text{L/kg}$ |
| $Loss_{equip}$ (mash tun dead space) | $0.95\ \text{L}$ |
| $\text{moisture}\%$ | $0.04$ |
| $\rho_{water}$ | $1.0\ \text{kg/L}$ |
| $V_{wort}$ (target pre-boil volume) | $28.0\ \text{L}$ |

**Step 1 — Strike water (Path 1):**
$$V_{strike} = LGR \times M = 3.0 \times 5.0 = 15.0\ \text{L}$$

**Step 2 — First runnings:**
$$V_{run1} = 15.0 + \left( \frac{5.0 \times 0.04}{1.0} \right) - [0.95 + (5.0 \times 0.96)] = 15.0 + 0.2 - 5.75 = 9.45\ \text{L}$$

**Step 3 — Sparge water:**
$$V_{run2} = V_{wort} - V_{run1} = 28.0 - 9.45 = 18.55\ \text{L}$$

**Step 4 — Lauter efficiency:**
$$\text{Loss}_{1} = \frac{0.95 + 4.8}{15.0 + 0.2} = \frac{5.75}{15.2} \approx 0.3783$$
$$\text{Loss}_{2} = \frac{0.95 + 4.8}{0.95 + 4.8 + 18.55} = \frac{5.75}{24.3} \approx 0.2366$$
$$\text{Lauter Efficiency} = 1 - (0.3783 \times 0.2366) \approx 1 - 0.0895 = 0.9105$$

**Step 5 — Total kettle extract:**
$$S_{kettle} = (0.80 \times 5.0 \times 0.95) \times 0.9105 \approx 3.80 \times 0.9105 \approx 3.46\ \text{kg of extract}$$

**Step 6 — Efficiency into the kettle:**
$$E_{kettle,theoretical} = \frac{S_{kettle}}{P \times M} = \frac{3.46}{4.0} \approx 0.865\ (86.5\%)$$

Note that $E_{kettle,theoretical} < C_{e}$ ($86.5\% < 95\%$), as expected — the difference is the lauter loss.

## Notes

1. The units of $S_{kettle}$ depend on the units of $P$. If the units of $P$ are points/pound/gallon (PPG), then the units of $S_{kettle}$ are total sugar points. If the units of $P$ are dimensionless, then the units of $S_{kettle}$ are the same as $M$.
2. The British units $L^{\circ}/kg$ or $LDK$ can be used for $P$ if metric units, throughout, are desired.

## Future Enhancements

### Late Addition Advisory (Advisory Only)

The workflow does **not** surface the *need* for fermentable late additions. OG flows correctly whether or not late additions are used:

* **No late additions** ($S_{late} = 0$): the Lauter solver sizes the grain bill to carry the full extract burden.
* **With late additions** ($S_{late} > 0$): the Lauter solver sizes a *smaller* grain bill, and the late additions make up the difference.

Both paths hit the target OG exactly. The difference is that skipping late additions produces a larger grain bill — which may be stylistically wrong (e.g., a Belgian Dubbel should derive gravity from candi syrup, not base malt) or may exceed `max_mash_tun_volume_l`.

**Proposed enhancement:** when the Lauter solver produces a grain bill that exceeds a threshold (e.g., $> 8\ \text{kg}$, or $> 80\%$ of mash tun capacity), surface a **non-blocking advisory**: *"Grain bill is large. Consider fermentable late additions to reduce mash volume."*

This is **advisory only** — the wizard does not enforce late additions. A brewer may legitimately want an all-malt recipe, and the wizard should not second-guess that intent.

### LLM Recipe Analyst (Future)

A separate, downstream analysis layer that reviews the completed recipe for **style consistency** and other qualitative concerns (e.g., "this Dubbel has no candi syrup," "this IPA's bitterness ratio is out of style," "this stout's roasted malt percentage is unusually low"). This is orthogonal to the deterministic solvers described in this document and would consume their outputs as inputs.

> **Design note:** The deterministic solvers (boil, fermentation, lauter) remain the source of truth for all numeric quantities. The LLM analyst is a *commentary* layer, never a *calculation* layer.
