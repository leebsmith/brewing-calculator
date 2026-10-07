# Master Batch Sparge Eqn.

$$S_{kettle} = (P \times M \times C_{e}) \times \left[ 1 - \left( \frac{Loss_{equip} + (M \times A_{f})}{V_{strike} + \frac{M \times \text{moisture}\%}{\rho_{water}}} \right) \times \left( \frac{Loss_{equip} + (M \times A_{f})}{Loss_{equip} + (M \times A_{f}) + V_{2}} \right) \right]$$

This equation models $S_{kettle}$ - the total amount of fermentable sugar (extract) collected in the boil kettle during a two-stage batch sparge brewing process.

It elegantly breaks down brewing into two distinct physical phases: the total sugar created during the mash, and the percentage of that sugar you successfully rinse into the kettle (lauter efficiency).

## The Two Halves of the Equation

1. **Total Converted Sugar:** $(P \times M \times C_{e})$ This first chunk represents the absolute maximum amount of sugar available in the mash tun before any draining occurs.
   * $P$: Potential extract of the malt (the maximum theoretical yield).
   * $M$: Mass of the grain bill.
   * $C_{e}$: Conversion efficiency (how successfully the mash enzymes converted starches into sugars).

2. **Lauter Efficiency:** $\left[1 - (Loss_{1}) \times (Loss_{2})\right]$ This large bracket calculates how much of that converted sugar is successfully washed into the kettle. In a batch sparge, you drain the tun twice. The equation calculates the fraction of sugar left behind after the first drain, multiplies it by the fraction left behind after the second drain, and subtracts that combined loss from $1$ ($100\%$).

## Understanding the Drain Losses

The equation uses two separate fractions to represent the liquid left behind at each step. Because sugar is dissolved uniformly in the water, the fraction of liquid left behind equals the fraction of sugar left behind.

* **First Runnings Loss Fraction:**
  $$\frac{Loss_{equip} + (M \times A_{f})}{V_{strike} + \frac{M \times \text{moisture}\%}{\rho_{water}}}$$
  * **Numerator:** The volume of liquid permanently trapped in the mash tun (equipment dead space plus water absorbed by the grain).
  * **Denominator:** The total volume of water present in the initial mash (your strike water plus the natural moisture already inside the dry grain).

* **Second Runnings (Sparge) Loss Fraction:**
  $$\frac{Loss_{equip} + (M \times A_{f})}{Loss_{equip} + (M \times A_{f}) + V_{2}}$$
  * **Numerator:** The volume of liquid still trapped in the grain bed and equipment.
  * **Denominator:** The total liquid present during the sparge (the trapped liquid from step one plus the new sparge water, $V_{2}$).

## Solving for M

$M$ can be solved for in the master equation by root-finding algorithms. Rearrange the equation such that it becomes a function of $M$, and set it to zero.

$$f(M) = (P \times M \times C_{e}) \times \left[ 1 - \left( \frac{Loss_{equip} + (M \times A_{f})}{V_{strike} + \frac{M \times \text{moisture}\%}{\rho_{water}}} \right) \times \left( \frac{Loss_{equip} + (M \times A_{f})}{Loss_{equip} + (M \times A_{f}) + V_{2}} \right) \right] - S_{kettle} = 0$$

## Recipe Formulation Options: $E_{kettle}$ / Known LGR / Known Runnings Ratio

All of the equations and equation cascades below assume that $M$ has been pre-determined by the root-finding algorithm above.

## Batch Sparge Recipe Calculation Cascades

### Efficiency Into the Kettle ($E_{kettle}$)

The formula for total efficiency into the kettle ($E_{kettle}$, often called mash efficiency or pre-boil efficiency) can be expressed in two ways:

1. **The Output Ratio:**
   For calculating actual efficiency, post brewday:
   $$E_{kettle,actual} = \frac{S_{kettle}}{P \times M}$$

2. **The Mechanical Expansion:**
   For calculating predicted efficiency, pre brewday:
   $$E_{kettle,theoretical} = C_{e} \times \left[ 1 - \left( \frac{Loss_{equip} + (M \times A_{f})}{V_{strike} + \frac{M \times \text{moisture}\%}{\rho_{water}}} \right) \times \left( \frac{Loss_{equip} + (M \times A_{f})}{Loss_{equip} + (M \times A_{f}) + V_{2}} \right) \right]$$

3. **Adjusting $C_{e}$ For Next Brewday:**
   If both $E_{kettle,actual}$ and $E_{kettle,theoretical}$ are known, we can calculate a new $C_{e,new}$ for next brewday:
   $$C_{e,new} = C_{e} \times (E_{kettle,actual} / E_{kettle,theoretical})$$

### Path 1: Known Liquor-to-Grist Ratio (LGR)

This cascade determines the required water volumes when you start with a fixed LGR (e.g., $1.5$ quarts per pound).

1. **Calculate Strike Water ($V_{strike}$):**
   $$V_{strike} = LGR \times M$$

2. **Calculate First Runnings Volume ($V_{1}$):** This calculates the liquid that successfully drains out, factoring in the inherent grain moisture ($\text{moisture}\%$) and the water permanently trapped by equipment dead-space ($Loss_{equip}$) and grain absorption ($A_{f}$).
   $$V_{1} = V_{strike} + \left( \frac{M \times \text{moisture}\%}{\rho_{water}} \right) - [Loss_{equip} + (M \times A_{f})]$$

3. **Calculate Sparge Water ($V_{2}$):** Subtract the collected first runnings from your total target pre-boil volume.
   $$V_{2} = V_{wort} - V_{1}$$

### Path 2: Known Runnings Ratio

This cascade determines the required strike volume and LGR when you start with a specific target for your first drain (e.g., a $50/50$ equal volume split to maximize efficiency).

1. **Calculate First Runnings Volume ($V_{1}$):** Multiply your total target pre-boil volume by your desired first runnings fraction (e.g., $0.5$ for a $50\%$ split).
   $$V_{1} = V_{wort} \times \text{Target Fraction}$$
   (Your sparge water is then simply the remainder: $V_{2} = V_{wort} - V_{1}$)

2. **Calculate Required Strike Water ($V_{strike}$):** Work backward by adding the trapped system losses back to your target first runnings volume and subtracting the grain moisture contribution.
   $$V_{strike} = V_{1} + [Loss_{equip} + (M \times A_{f})] - \left( \frac{M \times \text{moisture}\%}{\rho_{water}} \right)$$

3. **Calculate Required LGR:** Divide the calculated required strike water by your known grain mass ($M$).
   $$LGR = \frac{V_{strike}}{M}$$

## Variable Glossary

| Variable | Definition | Typical Homebrew Value |
| :--- | :--- | :--- |
| $S_{kettle}$ | Total sugar/extract in the kettle | Target varies by recipe |
| $P$ | Malt potential | $\sim 36-38 \text{ ppg}$ (points/pound/gallon) or decimal potential fraction $(\sim 0.85)^{1}$ or $L^{\circ}/kg$ $(LDK)^{2}$ |
| $M$ | Mass of the grain bill | Varies |
| $C_{e}$ | Conversion efficiency | $90\% - 100\%$ |
| $Loss_{equip}$ | Liquid left in hoses/tun dead-space | $0.1 - 0.5 \text{ gallons}$ |
| $A_{f}$ | Grain absorption factor | $\sim 0.1 - 0.125 \text{ gal/lb}$ |
| $V_{strike}$ | Initial strike water volume | Varies |
| $\text{moisture}\%$ | Grain moisture weight percentage | $\sim 4\%$ |
| $\rho_{water}$ | Density of water | $8.32 \text{ lbs/gal}$ |
| $V_{2}$ | Sparge water volume (second addition) | Varies |
| $V_{wort}$ | Target pre-boil wort volume | Target varies by recipe |
| $V_{1}$ | First runnings volume | Varies |
| $E_{kettle}$ | Efficiency into the kettle | $< C_{e}$ |

## Notes

1. The units of $S_{kettle}$ depend on the units of $P$. If the units of $P$ are points/pound/gallon (PPG), then the units of $S_{kettle}$ are total sugar points. If the units of $P$ are dimensionless, then the units of $S_{kettle}$ are the same as $M$.
2. The British units $L^{\circ}/kg$ or $LDK$ can be used for $P$ if metric units, throughout, are desired.