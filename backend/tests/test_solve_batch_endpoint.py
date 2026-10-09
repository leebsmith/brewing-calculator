"""Integration tests for the POST /api/solve-batch route.

These tests exercise the full HTTP stack: request validation, the route
handler, the solver orchestration, response serialization, and the
SolverValidationError -> HTTP 422 mapping. They complement the phase-level
unit tests, which call the solver functions directly.

The ``client`` and ``unauthenticated_client`` fixtures come from
``conftest.py`` and already override ``get_current_user`` and ``get_db``.
"""

import pytest


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def valid_payload():
    """A minimal, physically plausible solve-batch request body.

    A 20 L batch at 5.5% ABV with 75% attenuation, a single 2-row base malt,
    and the default equipment losses. This is the same shape the frontend's
    ``solveBatch()`` sends.
    """
    return {
        "target_abv": 5.5,
        "apparent_attenuation": 0.75,
        "v_ferm": 20.0,
        "topology": "r_l_to_g",
        "intensive_value": 2.6079,
        "grain_bill": [
            {"w_i": 1.0, "dbfg_i": 0.80, "mc_i": 0.04},
        ],
        "s_late_add": 0.0,
        "v_kettle_dead": 1.249,
        "delta_v_evap": 3.0,
        "v_dead": 0.946,
        "eta_conv": 0.90,
        "f_shrink": 0.04,
    }


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


def test_solve_batch_returns_200_with_full_response_shape(client, valid_payload):
    response = client.post("/api/solve-batch", json=valid_payload)

    assert response.status_code == 200
    body = response.json()

    # Top-level anchors.
    assert set(body.keys()) == {
        "sg_post_boil",
        "v_pre_boil",
        "s_post_boil_target",
        "m_grist",
        "cascade",
        "max_achievable_abv",
    }

    # Cascade shape, including the Stage 5 v_post_boil field.
    assert set(body["cascade"].keys()) == {
        "v_strike",
        "v_run1",
        "v_run2",
        "v_sparge",
        "s_run1",
        "s_run2",
        "sg_pre_boil",
        "v_post_boil",
    }


def test_solve_batch_anchors_are_physically_plausible(client, valid_payload):
    body = client.post("/api/solve-batch", json=valid_payload).json()

    # Post-boil gravity for a 5.5% ABV / 75% AA ale lands near 1.055.
    assert 1.045 < body["sg_post_boil"] < 1.065
    # Pre-boil volume must exceed the cold fermenter volume (boil-off + losses).
    assert body["v_pre_boil"] > valid_payload["v_ferm"]
    # Grist mass for a 20 L batch is a few kg, not zero and not absurd.
    assert 2.0 < body["m_grist"] < 10.0
    # Post-boil volume is the kettle balance: V_pre_boil - delta_v_evap.
    assert body["cascade"]["v_post_boil"] == pytest.approx(
        body["v_pre_boil"] - valid_payload["delta_v_evap"]
    )
    # Max achievable ABV is echoed back and exceeds the target.
    assert body["max_achievable_abv"] > valid_payload["target_abv"]


def test_solve_batch_runoff_ratio_topology(client, valid_payload):
    payload = {**valid_payload, "topology": "runoff_ratio", "intensive_value": 1.0}
    response = client.post("/api/solve-batch", json=payload)

    assert response.status_code == 200
    body = response.json()
    # r = 1.0 -> equal runnings: V_run1 == V_run2 == V_pre_boil / 2.
    assert body["cascade"]["v_run1"] == pytest.approx(body["v_pre_boil"] / 2.0)
    assert body["cascade"]["v_run2"] == pytest.approx(body["v_pre_boil"] / 2.0)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


def test_solve_batch_requires_authentication(unauthenticated_client, valid_payload):
    response = unauthenticated_client.post("/api/solve-batch", json=valid_payload)
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Request validation (Pydantic, HTTP 422)
# ---------------------------------------------------------------------------


def test_solve_batch_rejects_non_positive_target_abv(client, valid_payload):
    payload = {**valid_payload, "target_abv": 0.0}
    response = client.post("/api/solve-batch", json=payload)
    assert response.status_code == 422


def test_solve_batch_rejects_attenuation_above_one(client, valid_payload):
    payload = {**valid_payload, "apparent_attenuation": 1.5}
    response = client.post("/api/solve-batch", json=payload)
    assert response.status_code == 422


def test_solve_batch_rejects_non_positive_v_ferm(client, valid_payload):
    payload = {**valid_payload, "v_ferm": 0.0}
    response = client.post("/api/solve-batch", json=payload)
    assert response.status_code == 422


def test_solve_batch_rejects_empty_grain_bill(client, valid_payload):
    # An empty grain bill is schema-valid but solver-infeasible; the solver
    # raises INVALID_EXTRACT_POTENTIAL (composite E == 0), which the route
    # maps to 422 with a structured detail payload.
    payload = {**valid_payload, "grain_bill": []}
    response = client.post("/api/solve-batch", json=payload)
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert "code" in detail
    assert "message" in detail


# ---------------------------------------------------------------------------
# Solver validation errors (HTTP 422 with structured detail)
# ---------------------------------------------------------------------------


def test_solve_batch_maps_solver_error_to_structured_422(client, valid_payload):
    # A mash thickness below the husk absorption floor (1.67 L/kg) triggers
    # MASH_TOO_THIN in Phase 3.
    payload = {**valid_payload, "intensive_value": 1.0}
    response = client.post("/api/solve-batch", json=payload)

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "MASH_TOO_THIN"
    assert isinstance(detail["message"], str)
    assert detail["message"]


def test_solve_batch_maps_unreachable_abv_to_structured_422(client, valid_payload):
    # 50% ABV is unreachable within the 0-40 °P bracket at any attenuation.
    payload = {**valid_payload, "target_abv": 50.0}
    response = client.post("/api/solve-batch", json=payload)

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "ABV_UNREACHABLE"


def test_solve_batch_maps_unknown_topology_to_structured_422(client, valid_payload):
    payload = {**valid_payload, "topology": "bogus"}
    response = client.post("/api/solve-batch", json=payload)

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "UNKNOWN_TOPOLOGY"


# ---------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------


def test_solve_batch_is_deterministic(client, valid_payload):
    first = client.post("/api/solve-batch", json=valid_payload).json()
    second = client.post("/api/solve-batch", json=valid_payload).json()
    assert first == second
