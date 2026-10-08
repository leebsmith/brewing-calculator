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


# ---------------------------------------------------------------------------
# Phase 2: Volumetric Reversal & Extract Targeting
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class VolumetricReversal:
    """Result of Phase 2: the derived solver-side anchors.

    Attributes:
        v_kettle_cold: Cold kettle volume at 20 °C, in liters.
        s_post_boil_target: Required post-boil extract mass, in kg.
        v_pre_boil: Derived pre-boil kettle volume, in liters.
    """

    v_kettle_cold: float
    s_post_boil_target: float
    v_pre_boil: float


def kettle_cold_volume(
    v_ferm: float, v_kettle_dead: float, f_shrink: float
) -> float:
    """Compute the cold kettle volume ``V_kettle_cold``.

    ``V_kettle_cold = V_ferm + V_kettle_dead * (1 - f_shrink)``

    See ``unified-treatment.md`` §5 Phase 2.
    """
    return v_ferm + (v_kettle_dead * (1.0 - f_shrink))


def post_boil_extract_target(
    sg_post_boil: float, v_kettle_cold: float, gamma: float
) -> float:
    """Compute the required post-boil extract mass ``S_post_boil_target``.

    ``S_post_boil_target = 1000 * (SG_post_boil - 1) * V_kettle_cold / gamma``

    See ``unified-treatment.md`` §5 Phase 2.
    """
    return (1000.0 * (sg_post_boil - 1.0) * v_kettle_cold) / gamma


def pre_boil_volume(
    v_ferm: float,
    v_kettle_dead: float,
    delta_v_evap: float,
    s_late_add: float,
    v_bar: float,
    f_shrink: float,
) -> float:
    """Compute the derived pre-boil kettle volume ``V_pre_boil``.

    ``V_pre_boil = V_ferm / (1 - f_shrink) + V_kettle_dead + delta_v_evap
                   - v_bar * S_late_add``

    See ``unified-treatment.md`` §5 Phase 2.
    """
    return (
        (v_ferm / (1.0 - f_shrink))
        + v_kettle_dead
        + delta_v_evap
        - (v_bar * s_late_add)
    )


def resolve_volumetric_reversal(
    v_ferm: float,
    sg_post_boil: float,
    v_kettle_dead: float,
    delta_v_evap: float,
    s_late_add: float,
    f_shrink: float = F_SHRINK_DEFAULT,
    v_bar: float = V_BAR_METRIC,
    gamma: float = GAMMA_METRIC,
) -> VolumetricReversal:
    """Phase 2: reverse kettle mechanics to derive the solver-side anchors.

    Bridges the application input state (``V_ferm``) to the solver constraint
    topology (``V_pre_boil``), and computes the post-boil extract target.

    Args:
        v_ferm: Target cold fermenter volume, in liters.
        sg_post_boil: Post-boil specific gravity (20 °C reference) from Phase 1.
        v_kettle_dead: Unrecoverable kettle/chiller dead space, in liters.
        delta_v_evap: Calibrated kettle boil-off volume, in liters.
        s_late_add: Late-addition extract mass, in kg.
        f_shrink: Thermal contraction coefficient (default 4%).
        v_bar: Apparent specific volume of dissolved extract, in L/kg.
        gamma: Gravity-points conversion constant, in GU·L/kg.

    Returns:
        A frozen ``VolumetricReversal`` with the derived anchors.

    Raises:
        SolverValidationError: If ``v_ferm`` is non-positive, ``f_shrink`` is
            outside ``[0, 1)``, or the extract target is not strictly greater
            than the late-addition extract mass.

    See ``unified-treatment.md`` §5 Phase 2.
    """
    if v_ferm <= 0:
        raise SolverValidationError(
            "INVALID_FERM_VOLUME",
            f"Fermenter volume must be positive; got {v_ferm}.",
        )
    if not (0.0 <= f_shrink < 1.0):
        raise SolverValidationError(
            "INVALID_SHRINKAGE",
            f"Shrinkage coefficient must be in [0, 1); got {f_shrink}.",
        )

    v_kettle_cold = kettle_cold_volume(v_ferm, v_kettle_dead, f_shrink)
    s_post_boil_target = post_boil_extract_target(
        sg_post_boil, v_kettle_cold, gamma
    )

    if (s_post_boil_target - s_late_add) <= 0.0:
        raise SolverValidationError(
            "EXTRACT_TARGET_NON_POSITIVE",
            (
                f"Post-boil extract target ({s_post_boil_target:.4f} kg) must "
                f"exceed late-addition extract ({s_late_add:.4f} kg)."
            ),
        )

    v_pre_boil = pre_boil_volume(
        v_ferm, v_kettle_dead, delta_v_evap, s_late_add, v_bar, f_shrink
    )

    return VolumetricReversal(
        v_kettle_cold=v_kettle_cold,
        s_post_boil_target=s_post_boil_target,
        v_pre_boil=v_pre_boil,
    )


# ---------------------------------------------------------------------------
# Phase 3: Grist Mass Resolution (1D Root-Finding)
# ---------------------------------------------------------------------------
#
# Stage 1.3 implements only the {V_pre_boil, R_L:G} constraint topology.
# The {V_pre_boil, r} topology is deferred to Stage 1.4.


def grist_mass_bracket(
    s_post_boil_target: float,
    s_late_add: float,
    extract_potential: float,
) -> tuple[float, float]:
    """Compute the guaranteed bracketing interval ``[a, b]`` for ``M_grist``.

    ``a = max(0.0, (S_post_boil_target - S_late_add) / E)``
    ``b = (S_post_boil_target - S_late_add) / (0.50 * E)``

    See ``unified-treatment.md`` §4.
    """
    delta_s = s_post_boil_target - s_late_add
    a = max(0.0, delta_s / extract_potential)
    b = delta_s / (0.50 * extract_potential)
    return a, b


def grist_mass_residual(
    m_grist: float,
    v_pre_boil: float,
    r_l_to_g: float,
    extract_potential: float,
    mc_bar: float,
    eta_conv: float,
    s_post_boil_target: float,
    s_late_add: float,
    v_dead: float,
    k_abs_true: float = K_ABS_TRUE_METRIC,
    v_bar: float = V_BAR_METRIC,
) -> float:
    """Evaluate the cleared-denominator cubic residual ``P(M_grist)``.

    ``P(M) = (eta_conv * E * M) * [D1(M) * D2(M) - V_ret(M)^2]
             - (S_target - S_late) * D1(M) * D2(M)``

    where, under the ``{V_pre_boil, R_L:G}`` topology:

    * ``V_strike = R_L:G * M``
    * ``c_vol = MC_bar / rho_water + v_bar * eta_conv * E``
    * ``D1(M) = V_strike + c_vol * M``
    * ``D2(M) = V_sparge + V_dead + k_abs_true * M``
    * ``V_sparge = V_pre_boil - V_run1``, with ``V_run1`` derived from the tun
      mass balance (see below).

    Because ``V_sparge`` itself depends on ``M`` under this topology, the
    residual is evaluated by first computing ``V_run1`` from the tun mass
    balance and then ``V_sparge = V_pre_boil - V_run1``.

    See ``unified-treatment.md`` §4.
    """
    v_strike = r_l_to_g * m_grist
    c_vol = (mc_bar / RHO_WATER_METRIC) + (v_bar * eta_conv * extract_potential)

    v_mc = moisture_volume(m_grist, mc_bar)
    s_conv = converted_extract(m_grist, extract_potential, eta_conv)
    v_sol = solute_displacement_volume(s_conv, v_bar)
    v_ret = retained_volume(m_grist, k_abs_true, v_dead)

    v_run1 = v_strike + v_mc + v_sol - v_ret
    v_sparge = v_pre_boil - v_run1

    d1 = v_strike + (c_vol * m_grist)
    d2 = v_sparge + v_dead + (k_abs_true * m_grist)

    delta_s = s_post_boil_target - s_late_add
    return (eta_conv * extract_potential * m_grist) * (
        (d1 * d2) - (v_ret**2)
    ) - (delta_s * d1 * d2)


def solve_grist_mass(
    v_pre_boil: float,
    r_l_to_g: float,
    extract_potential: float,
    mc_bar: float,
    eta_conv: float,
    s_post_boil_target: float,
    s_late_add: float,
    v_dead: float,
    k_abs_true: float = K_ABS_TRUE_METRIC,
    v_bar: float = V_BAR_METRIC,
) -> float:
    """Phase 3: resolve the dry grist mass ``M_grist`` via Brent's method.

    Implements the ``{V_pre_boil, R_L:G}`` constraint topology only.

    Args:
        v_pre_boil: Derived pre-boil kettle volume, in liters (from Phase 2).
        r_l_to_g: Liquor-to-grist ratio, in L/kg.
        extract_potential: Composite dry-basis potential factor ``E``.
        mc_bar: Composite moisture fraction ``MC_bar``.
        eta_conv: Mash conversion efficiency as a fraction.
        s_post_boil_target: Required post-boil extract mass, in kg.
        s_late_add: Late-addition extract mass, in kg.
        v_dead: Mash tun dead space, in liters.
        k_abs_true: True husk absorption coefficient, in L/kg.
        v_bar: Apparent specific volume of dissolved extract, in L/kg.

    Returns:
        The converged dry grist mass ``M_grist``, in kg.

    Raises:
        SolverValidationError: If the bracket is degenerate or the residual
            does not change sign across it.

    See ``unified-treatment.md`` §4 and §5 Phase 3.
    """
    if extract_potential <= 0.0:
        raise SolverValidationError(
            "INVALID_EXTRACT_POTENTIAL",
            f"Composite extract potential must be positive; got {extract_potential}.",
        )
    if (s_post_boil_target - s_late_add) <= 0.0:
        raise SolverValidationError(
            "EXTRACT_TARGET_NON_POSITIVE",
            (
                f"Post-boil extract target ({s_post_boil_target:.4f} kg) must "
                f"exceed late-addition extract ({s_late_add:.4f} kg)."
            ),
        )

    a, b = grist_mass_bracket(s_post_boil_target, s_late_add, extract_potential)
    if b <= a:
        raise SolverValidationError(
            "DEGENERATE_BRACKET",
            f"Grist mass bracket is degenerate: a={a}, b={b}.",
        )

    def residual(m_grist: float) -> float:
        return grist_mass_residual(
            m_grist=m_grist,
            v_pre_boil=v_pre_boil,
            r_l_to_g=r_l_to_g,
            extract_potential=extract_potential,
            mc_bar=mc_bar,
            eta_conv=eta_conv,
            s_post_boil_target=s_post_boil_target,
            s_late_add=s_late_add,
            v_dead=v_dead,
            k_abs_true=k_abs_true,
            v_bar=v_bar,
        )

    f_a = residual(a)
    f_b = residual(b)
    if f_a * f_b > 0.0:
        raise SolverValidationError(
            "BRACKET_NO_SIGN_CHANGE",
            (
                f"Grist mass residual does not change sign on [{a:.4f}, "
                f"{b:.4f}]: f(a)={f_a:.6f}, f(b)={f_b:.6f}."
            ),
        )

    return brentq(residual, a, b)
