To resolve the gravity constraints required by the recipe formulation workflow, the application must execute the cold-side inverse resolution (Phase 1) and the pre-boil gravity assembly (Phase 4) as distinct computational steps.

The following Python module provides the exact functions needed to handle these transitions, utilizing `scipy.optimize.brentq` to reverse the Cutaia empirical equations and the master balance equation to derive the hot-side gravity.

Download gravity_solvers.py

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

    # Alcohol by weight (w/w %) via Cutaia, Reid, & Speers (2009)
    abw = (0.372 + 0.00357 * oe_plato) * (oe_plato - ae_plato)

    # Convert AE to specific gravity for volumetric expansion
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

### Subsystem Integration Notes

* **ASBC Conversion Bridges:** Because the Cutaia equations natively model fermentation kinetics using Degrees Plato, the module translates the inputs through standard ASBC cubic and quadratic polynomials before evaluating the `SG_post_boil` constraint required by the hot-side extract balance.
* **1D Root-Finding Application:** `solve_sg_post_boil_from_abv()` directly mirrors the mathematical architecture of the grist mass solver. By wrapping the Cutaia formula in a residual scalar function and utilizing Brent's Method over a strict 0.0 to 40.0 Plato bracket, it mathematically isolates the exact Original Gravity target.


* **Gravity Assembly Constants:** The `calculate_sg_pre_boil()` function relies directly on the consolidated extraction mass ($S_{\text{run 1}} + S_{\text{run 2}}$) and defaults to the metric gravity conversion scalar of $\gamma = 385.5\text{ GU}\cdot\text{L/kg}$, consistent with the metric standards declared in `inputs-and-outputs.md`. If the workflow executes in US Customary units ($gal$/$lb$), $\gamma$ must be overridden to $46.21$ when calling the function.
