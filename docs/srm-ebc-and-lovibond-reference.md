# Imperial and Metric Beer Color Calculations and Terminology

## Lovibond, SRM and EBC Definitions

Color of individual dry malts are expressed in Lovibond (°L) in the Imperial system and EBC in the metric system. Both are dimensionless numbers.

Color of finished beer is expressed in SRM (Standard Reference Method) in the Imperial system and EBC in the metric system. Units of EBC are used in both calculations in the metric system. (For clarity of terminology, `EBC_grain` and `EBC_beer` can be used.) Visually, the SRM of a single grain beer is very similar to its Lovibond rating.

## Interconverting SRM and EBC

Because both SRM and EBC measure light absorbance at the same wavelength (430 nm) but use different scalar multipliers (12.7 for SRM vs. 25 for EBC), converting between the two final beer colors is a simple linear ratio (25 / 12.7 = 1.97).

$$\text{EBC} = \text{SRM} \times 1.97$$

$$\text{SRM} = \frac{\text{EBC}}{1.97}$$

## SRM and EBC Calculation

The final color of a beer is a function of the weighted color contributions of the individual grains, scaled to batch size, and then adjusted by a nonlinear function.

### SRM

1. Malt Color Unit (MCU) is the raw, unscaled weighted sum of the individual grain's Lovibond rating divided by the batch size.

$$\text{MCU} = \frac{\Sigma{(Wt_{grain,lbs}}\times{Color_{grain,^\circ{L}})}}{V_{batch,gal}}$$

2. MCU is converted to SRM via the Morey Equation.

$$\text{SRM} = 1.4922 \times (\text{MCU})^{0.6859}$$

### EBC

1. Like MCU, the Metric Color Unit (they share the same abbreviation, unfortunately) is the raw, unscaled weighted sum of the individual grain's EBC rating divided by the batch size.

$$\text{MCU}_{metric} = \frac{\Sigma{(Wt_{grain,kg}}\times{\text{EBC}_{grain})}}{V_{batch,L}}$$

2. In practice, metric MCU units are converted to SRM with a conversion factor, then converted to EBC.

$$\text{SRM} = 1.4922 \times (\text{MCU}_{metric} \times 4.236)^{0.6859}$$

then

$$\text{EBC}_{beer} = \text{SRM} \times 1.97$$

---

**Implementation Note:** If flattening the metric equations into a single step for software calculation, the constants ($1.97 \times 1.4922 \times 4.236^{0.6859}$) combine to form a direct EBC-to-EBC equation:

$$\text{EBC}_{beer} = 7.85 \times (\text{MCU}_{metric})^{0.6859}$$


