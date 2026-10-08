"""
Batch solver: canonical mass and volume balance for single-strike, single-sparge
batch sparging.

This module implements the four-phase pipeline described in
``docs/batch-math/unified-treatment.md`` and mapped in
``docs/batch-math/dependency-graph.md``.

Stage 1.0 scope: shared pure helpers and frozen result dataclasses only.
Phases 1-4 are added in subsequent sub-stages.

Design constraints (see ``docs/batch-math/implementation-plan.md`` §0):

* Every computational step is a pure function: same inputs -> same outputs,
  no I/O, no mutation of arguments, no hidden state.
* Composite constants are computed exactly once, here, and composed by the
  phase functions. No phase re-derives them.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from scipy.optimize import brentq


# ---------------------------------------------------------------------------
# Physical constants (metric standards; see inputs-and-outputs.md)
# ---------------------------------------------------------------------------

GAMMA_METRIC: float = 385.5
"""Gravity-points conversion constant in GU·L/kg."""

V_BAR_METRIC: float = 0.625
"""Apparent specific volume of dissolved extract in L/kg."""

K_ABS_TRUE_METRIC: float = 1.67
"""True husk absorption coefficient in L/kg."""

RHO_WATER_METRIC: float = 1.00
"""Density of water at strike temperature in kg/L."""

F_SHRINK_DEFAULT: float = 0.04
"""Thermal contraction coefficient (dimensionless)."""


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


class SolverValidationError(ValueError):
    """Raised when the solver's inputs fail a physical or numerical gate.

    Carries a machine-readable ``code`` alongside the human-readable message
    so the API layer can map it to a structured error response.
    """

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


# ---------------------------------------------------------------------------
# Input dataclasses
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class GrainBillEntry:
    """A single malt component of the grain bill.

    Attributes:
        w_i: Normalized mass fraction of this component (sum over the bill = 1.0).
        dbfg_i: Dry-basis fine-grind extract potential fraction (0..1).
        mc_i: As-is moisture content fraction (0..1).
    """

    w_i: float
    dbfg_i: float
    mc_i: float


# ---------------------------------------------------------------------------
# Shared pure helpers
# ---------------------------------------------------------------------------


def composite_extract_potential(grain_bill: Sequence[GrainBillEntry]) -> float:
    """Compute the composite dry-basis potential factor ``E``.

    ``E = sum_i( w_i * DBFG_i * (1 - MC_i) )``

    See ``unified-treatment.md`` §2 (Mash Solute Generation) and
    ``batch-sparge-non-linear-root-finding-v2.md`` §1.1.
    """
    return sum(
        entry.w_i * entry.dbfg_i * (1.0 - entry.mc_i) for entry in grain_bill
    )


def composite_moisture_fraction(grain_bill: Sequence[GrainBillEntry]) -> float:
    """Compute the weighted moisture fraction ``MC_bar``.

    ``MC_bar = sum_i( w_i * MC_i )``

    See ``batch-sparge-non-linear-root-finding-v2.md`` §1.1.
    """
    return sum(entry.w_i * entry.mc_i for entry in grain_bill)


def composite_volumetric_expansion(
    mc_bar: float,
    v_bar: float,
    eta_conv: float,
    extract_potential: float,
) -> float:
    """Compute the composite volumetric expansion coefficient ``c_vol``.

    ``c_vol = MC_bar / rho_water + v_bar * eta_conv * E``

    Note: ``rho_water`` is fixed at the metric standard (1.00 kg/L), so the
    ``MC_bar / rho_water`` term reduces to ``MC_bar``. The parameter is kept
    explicit in the signature for clarity and future unit-system support.

    See ``batch-sparge-non-linear-root-finding-v2.md`` §1.1.
    """
    return (mc_bar / RHO_WATER_METRIC) + (v_bar * eta_conv * extract_potential)


def retained_volume(m_grist: float, k_abs_true: float, v_dead: float) -> float:
    """Compute the total retained liquid volume ``V_ret``.

    ``V_ret = k_abs_true * M_grist + V_dead``

    See ``unified-treatment.md`` §2 (Retention Kinetics).
    """
    return (k_abs_true * m_grist) + v_dead


def moisture_volume(m_grist: float, mc_bar: float) -> float:
    """Compute the intrinsic grain moisture volume ``V_mc``.

    ``V_mc = M_grist * MC_bar / rho_water``

    See ``unified-treatment.md`` §2 (Mash Solute Generation).
    """
    return (m_grist * mc_bar) / RHO_WATER_METRIC


def solute_displacement_volume(s_conv: float, v_bar: float) -> float:
    """Compute the dissolved solute displacement volume ``V_sol``.

    ``V_sol = v_bar * S_conv``

    See ``unified-treatment.md`` §2 (Mash Solute Generation).
    """
    return v_bar * s_conv


def converted_extract(
    m_grist: float, extract_potential: float, eta_conv: float
) -> float:
    """Compute the converted soluble extract mass ``S_conv``.

    ``S_conv = eta_conv * E * M_grist``

    See ``unified-treatment.md`` §2 (Mash Solute Generation).
    """
    return eta_conv * extract_potential * m_grist


# ---------------------------------------------------------------------------
# Phase 1: Cold-Side Inverse Resolution
# ---------------------------------------------------------------------------
#
# The ASBC conversion polynomials below are implemented locally rather than
# imported from ``app.core.utils`` because ``unified-treatment.md`` §6 is the
# authoritative spec for the new solver, and its coefficients differ slightly
# from the legacy ``utils.py`` versions. Stage 5 reconciles the two.


def asbc_plato_to_sg(plato: float) -> float:
    """Convert degrees Plato to specific gravity (ASBC cubic polynomial).

    See ``unified-treatment.md`` §6.
    """
    return (
        1.0
        + (0.0038661 * plato)
        + (1.34e-5 * (plato**2))
        + (4.3e-8 * (plato**3))
    )


def asbc_sg_to_plato(sg: float) -> float:
    """Convert specific gravity to degrees Plato (ASBC quadratic polynomial).

    See ``unified-treatment.md`` §6.
    """
    return -463.37 + (668.72 * sg) - (205.35 * (sg**2))


def cutaia_abv(oe_plato: float, apparent_attenuation: float) -> float:
    """Compute ABV via the Cutaia et al. (2009) empirical model.

    ``ae_plato = oe_plato * (1 - AA)``
    ``abw = (0.372 + 0.00357 * oe_plato) * (oe_plato - ae_plato)``
    ``abv = abw * (fg_sg / 0.791)``

    See ``unified-treatment.md`` §6.
    """
    ae_plato = oe_plato * (1.0 - apparent_attenuation)

    # Alcohol by weight (w/w %) via Cutaia, Reid, & Speers (2009)
    abw = (0.372 + 0.00357 * oe_plato) * (oe_plato - ae_plato)

    # Convert AE to specific gravity for volumetric expansion
    fg_sg = asbc_plato_to_sg(ae_plato)

    return abw * (fg_sg / 0.791)


def solve_sg_post_boil_from_abv(
    target_abv: float, apparent_attenuation: float
) -> float:
    """Phase 1: isolate the post-boil SG required to hit a target ABV.

    Wraps the Cutaia model in a scalar residual and solves it with Brent's
    method over a 0-40 °P bracket.

    Args:
        target_abv: Desired alcohol by volume, as a percentage (e.g. 5.5).
        apparent_attenuation: Expected apparent attenuation as a fraction
            in (0, 1] (e.g. 0.75 for 75% AA).

    Returns:
        The post-boil specific gravity (20 °C reference) required to hit
        ``target_abv`` at the given attenuation.

    Raises:
        SolverValidationError: If the inputs are outside the physical domain
            or the target ABV is unreachable within the 0-40 °P bracket.

    See ``unified-treatment.md`` §5 Phase 1 and §6.
    """
    if target_abv <= 0:
        raise SolverValidationError(
            "INVALID_TARGET_ABV",
            f"Target ABV must be positive; got {target_abv}.",
        )
    if not (0.0 < apparent_attenuation <= 1.0):
        raise SolverValidationError(
            "INVALID_ATTENUATION",
            f"Apparent attenuation must be in (0, 1]; got {apparent_attenuation}.",
        )

    def residual(oe_plato: float) -> float:
        return cutaia_abv(oe_plato, apparent_attenuation) - target_abv

    # Bracket: pure water (0 °P) to extreme high gravity (40 °P).
    f_low = residual(0.0)
    f_high = residual(40.0)
    if f_low * f_high > 0.0:
        raise SolverValidationError(
            "ABV_UNREACHABLE",
            (
                f"Target ABV of {target_abv}% is not reachable within the "
                f"0-40 °P bracket at {apparent_attenuation:.4f} attenuation."
            ),
        )

    target_oe_plato = brentq(residual, 0.0, 40.0)
    return asbc_plato_to_sg(target_oe_plato)
