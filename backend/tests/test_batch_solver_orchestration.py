"""Unit tests for the top-level ``solve_batch`` orchestrator (Stage 1.5)."""

import math

import pytest

from app.core.batch_solver import (
    BatchSolverInput,
    GrainBillEntry,
    SolverValidationError,
    solve_batch,
)


@pytest.fixture
def standard_inputs():
    """A plausible 20 L batch: ~5 kg grist, 3:1 L:G, 75% conversion."""
    return BatchSolverInput(
        target_abv=5.0,
        apparent_attenuation=0.75,
        v_ferm=20.0,
        topology="r_l_to_g",
        intensive_value=3.0,
        grain_bill=[
            GrainBillEntry(w_i=0.80, dbfg_i=0.80, mc_i=0.04),
            GrainBillEntry(w_i=0.20, dbfg_i=0.70, mc_i=0.05),
        ],
        s_late_add=0.0,
        v_kettle_dead=1.5,
        delta_v_evap=3.0,
        v_dead=0.5,
        eta_conv=0.75,
    )


def test_solve_batch_returns_finite_anchors(standard_inputs):
    result = solve_batch(standard_inputs)
    for value in (
        result.sg_post_boil,
        result.v_pre_boil,
        result.s_post_boil_target,
        result.m_grist,
        result.cascade.sg_pre_boil,
    ):
        assert math.isfinite(value)


def test_solve_batch_anchors_are_physically_plausible(standard_inputs):
    result = solve_batch(standard_inputs)
    assert 1.0 < result.sg_post_boil < 1.10
    assert result.v_pre_boil > standard_inputs.v_ferm
    assert result.s_post_boil_target > 0.0
    assert result.m_grist > 0.0
    assert 1.0 < result.cascade.sg_pre_boil < 1.10


def test_solve_batch_is_pure(standard_inputs):
    first = solve_batch(standard_inputs)
    second = solve_batch(standard_inputs)
    assert first == second


def test_solve_batch_runoff_ratio_topology(standard_inputs):
    inputs = BatchSolverInput(
        **{**standard_inputs.__dict__, "topology": "runoff_ratio", "intensive_value": 1.0}
    )
    result = solve_batch(inputs)
    assert math.isfinite(result.m_grist)
    assert result.cascade.v_sparge == pytest.approx(result.cascade.v_run2)


def test_solve_batch_propagates_validation_errors(standard_inputs):
    inputs = BatchSolverInput(**{**standard_inputs.__dict__, "target_abv": 0.0})
    with pytest.raises(SolverValidationError) as exc:
        solve_batch(inputs)
    assert exc.value.code == "INVALID_TARGET_ABV"
