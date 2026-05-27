"""Red-phase API integration tests for the 8 FastAPI routes added in Task #17.

All tests use a real PostGIS container via the db_session fixture (conftest.py).
No mocks.  The api_client fixture injects the test DB session via
app.dependency_overrides[get_db] — the standard FastAPI pattern.

Import of `api.deps.get_db` will fail with ImportError until Task #17
creates that module.  That ImportError IS the expected red-phase signal.

Reference: spec 2.1.6 §1–8 — endpoint contracts.
"""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

# This import defines the red phase: api/deps.py does not exist yet (Task #17).
# When Task #17 is complete this import will resolve, and all tests can run.
from api.deps import get_db  # noqa: E402  (intentional deferred import)
from db.seed import seed_decision_matrix, seed_reference_data
from main import app

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _identity_pairwise_matrix(n: int) -> list[list[dict[str, float]]]:
    """Return an n×n identity TFN matrix: every cell (1, 1, 1).

    CR = 0 for any n, so fahp_weights will never raise here.
    Reference: Chang (1996) — diagonal elements equal (1, 1, 1).
    """
    return [[{"l": 1.0, "m": 1.0, "u": 1.0} for _ in range(n)] for _ in range(n)]


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def api_client(db_session: AsyncSession) -> AsyncClient:
    """ASGI client with the test DB session injected via dependency_overrides.

    Seeds the reference data and decision matrix so every endpoint test starts
    from a consistent state: 2 profiles, 10 criteria, 12 locations, 120 X-values.
    """
    from tests.conftest import _seed_test_locations

    await seed_reference_data(db_session)
    await _seed_test_locations(db_session)
    await seed_decision_matrix(db_session)
    await db_session.flush()

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# A. Profiles
# ---------------------------------------------------------------------------


class TestProfiles:
    """Tests for GET /api/profiles and GET /api/profiles/{id}.

    Reference: spec 2.1.6 §1–2 — profile resource endpoints.
    """

    async def test_list_profiles_returns_200_and_2_seeded(self, api_client: AsyncClient) -> None:
        """GET /api/profiles must return status 200 and exactly the 2 seeded profiles.

        Both 'municipal' and 'investor' codes must appear in the response.
        Reference: master.md Table 3.1 — two decision-maker profiles.
        """
        response = await api_client.get("/api/profiles")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        codes = {p["code"] for p in data}
        assert codes == {"municipal", "investor"}

    async def test_get_profile_404_for_missing(self, api_client: AsyncClient) -> None:
        """GET /api/profiles/{id} with a non-existent id must return 404.

        Reference: spec 2.1.6 §2 — not-found case.
        """
        response = await api_client.get("/api/profiles/999999")

        assert response.status_code == 404


# ---------------------------------------------------------------------------
# B. Criteria
# ---------------------------------------------------------------------------


class TestCriteria:
    """Tests for GET /api/criteria.

    Reference: spec 2.1.6 §3 — criteria catalog endpoint.
    """

    async def test_list_criteria_returns_10_items(self, api_client: AsyncClient) -> None:
        """GET /api/criteria must return 10 items matching master.md Table 3.3.

        Each item must expose the camelCase keys id, code, name, unit,
        optimizationType, scale — no snake_case leakage.
        Reference: master.md Table 3.3 — 10 evaluation criteria.
        """
        response = await api_client.get("/api/criteria")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 10

        item = data[0]
        expected_keys = {"id", "code", "name", "unit", "optimizationType", "scale"}
        assert expected_keys.issubset(item.keys()), (
            f"Missing camelCase keys in criterion item. "
            f"Expected subset {expected_keys}, got {set(item.keys())}"
        )


# ---------------------------------------------------------------------------
# C. Locations
# ---------------------------------------------------------------------------


class TestLocations:
    """Tests for GET /api/locations and POST /api/locations.

    Reference: spec 2.1.6 §4–5 — location resource endpoints.
    """

    async def test_list_locations_returns_seeded_items(self, api_client: AsyncClient) -> None:
        """GET /api/locations must return all seeded Kyiv candidate locations.

        Each item must expose camelCase keys without the raw PostGIS 'geom' field.
        Reference: spec 2.1.6 §4 — location list endpoint.
        """
        response = await api_client.get("/api/locations")

        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "Expected at least one location within Kyiv city limits"

        item = data[0]
        expected_keys = {"id", "name", "address", "district", "latitude", "longitude"}
        assert expected_keys.issubset(item.keys()), (
            f"Missing camelCase keys in location item. "
            f"Expected subset {expected_keys}, got {set(item.keys())}"
        )
        assert "geom" not in item, "Raw 'geom' field must not be exposed in the JSON response"

    async def test_create_location_returns_201(self, api_client: AsyncClient) -> None:
        """POST /api/locations must return 201 and the created location with its id.

        Coordinates are within the Ukraine bounding box defined in LocationCreate.
        Reference: spec 2.1.6 §5 — location creation endpoint.
        """
        payload = {
            "name": "Test",
            "address": "вул. Тестова, 1",
            "district": "Тестовий",
            "latitude": 50.5,
            "longitude": 30.5,
        }

        response = await api_client.post("/api/locations", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert isinstance(data.get("id"), int), (
            f"Response must contain integer 'id', got: {data.get('id')!r}"
        )
        assert data["latitude"] == pytest.approx(50.5, abs=1e-4)
        assert data["longitude"] == pytest.approx(30.5, abs=1e-4)

    async def test_create_location_returns_422_for_invalid_coords(
        self, api_client: AsyncClient
    ) -> None:
        """POST /api/locations with latitude outside Ukraine bounds must return 422.

        LocationCreate.latitude has ge=44.0, le=53.0 (UKRAINE_LAT_MAX=53.0).
        A latitude of 60.0 is outside this range and must be rejected by Pydantic.
        Reference: schemas/location.py — UKRAINE_LAT_MIN/MAX coordinate validation.
        """
        payload = {
            "name": "Out-of-bounds",
            "address": "N/A",
            "district": "N/A",
            "latitude": 60.0,
            "longitude": 30.5,
        }

        response = await api_client.post("/api/locations", json=payload)

        assert response.status_code == 422


# ---------------------------------------------------------------------------
# D. Evaluations
# ---------------------------------------------------------------------------


class TestEvaluations:
    """Tests for POST /api/evaluations and GET /api/evaluations/{id}.

    Reference: spec 2.1.6 §6–7 — FAHP+TOPSIS evaluation cycle endpoint.
    """

    async def test_post_evaluation_with_identity_matrix_returns_200(
        self, api_client: AsyncClient
    ) -> None:
        """POST /api/evaluations with an identity 10×10 TFN matrix must return 200.

        The identity matrix has CR = 0 and yields equal weights (1/10 each).
        Response must contain evaluationId (int), weights (dict with 10 keys),
        and ranking (list of 12 items, each with locationId, rank, closeness,
        sPlus, sMinus).

        Reference: spec 2.1.6 §6 — FAHP+TOPSIS evaluation cycle.
        """
        # Resolve the municipal profile id from the seeded data.
        profiles_resp = await api_client.get("/api/profiles")
        profiles = profiles_resp.json()
        municipal = next(p for p in profiles if p["code"] == "municipal")
        municipal_id = municipal["id"]

        pwm = _identity_pairwise_matrix(10)
        payload = {"profileId": municipal_id, "pairwiseMatrix": pwm}

        response = await api_client.post("/api/evaluations", json=payload)

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data.get("evaluationId"), int), (
            f"'evaluationId' must be an integer, got {data.get('evaluationId')!r}"
        )

        weights = data.get("weights", {})
        assert len(weights) == 10, (
            f"Expected 10 weight entries (one per criterion), got {len(weights)}"
        )

        ranking = data.get("ranking", [])
        assert len(ranking) > 0, "Expected ranking items (one per location), got empty list"
        first = ranking[0]
        expected_ranking_keys = {"locationId", "rank", "closeness", "sPlus", "sMinus"}
        assert expected_ranking_keys.issubset(first.keys()), (
            f"Missing keys in ranking item. "
            f"Expected subset {expected_ranking_keys}, got {set(first.keys())}"
        )

    async def test_post_evaluation_size_mismatch_returns_422(self, api_client: AsyncClient) -> None:
        """POST /api/evaluations with a 5×5 matrix must return 422.

        The DB has 10 criteria after seed; EvaluationService raises ValueError
        when the matrix dimension does not match the criterion count.  The global
        ValueError exception handler added in Task #17 maps that to HTTP 422.

        The 5×5 matrix is structurally valid (square, diagonal (1,1,1), reciprocal,
        within Saaty bounds) so the error is a domain-level size mismatch, not a
        Pydantic validation error.

        Reference: spec 2.1.6 §6 — matrix size must equal criteria count (10).
        """
        profiles_resp = await api_client.get("/api/profiles")
        profiles = profiles_resp.json()
        municipal = next(p for p in profiles if p["code"] == "municipal")
        municipal_id = municipal["id"]

        pwm = _identity_pairwise_matrix(5)
        payload = {"profileId": municipal_id, "pairwiseMatrix": pwm}

        response = await api_client.post("/api/evaluations", json=payload)

        assert response.status_code == 422

    async def test_get_evaluation_after_create(self, api_client: AsyncClient) -> None:
        """GET /api/evaluations/{id} must return the evaluation created by a preceding POST.

        The response from GET must include the same top-level keys as the POST
        response: evaluationId, weights, ranking.

        Reference: spec 2.1.6 §7 — evaluation retrieval endpoint.
        """
        profiles_resp = await api_client.get("/api/profiles")
        profiles = profiles_resp.json()
        municipal = next(p for p in profiles if p["code"] == "municipal")
        municipal_id = municipal["id"]

        pwm = _identity_pairwise_matrix(10)
        create_resp = await api_client.post(
            "/api/evaluations",
            json={"profileId": municipal_id, "pairwiseMatrix": pwm},
        )
        assert create_resp.status_code == 200
        evaluation_id = create_resp.json()["evaluationId"]

        get_resp = await api_client.get(f"/api/evaluations/{evaluation_id}")

        assert get_resp.status_code == 200
        data = get_resp.json()
        for key in ("evaluationId", "weights", "ranking"):
            assert key in data, (
                f"Key '{key}' missing from GET /api/evaluations/{evaluation_id} response"
            )


# ---------------------------------------------------------------------------
# E. Sensitivity
# ---------------------------------------------------------------------------


class TestSensitivity:
    """Tests for POST /api/evaluations/{id}/sensitivity.

    Reference: spec 2.1.6 §8 — Monte-Carlo sensitivity analysis endpoint.
    """

    async def test_post_sensitivity_returns_200_with_top_n_cis(
        self, api_client: AsyncClient
    ) -> None:
        """POST /api/evaluations/{id}/sensitivity must return 200 with MC results.

        Per Appendix A.9 and subsection 2.3.3, the response must contain:
          - stabilityMatrix: {locationId: {1: p_i(1), 3: p_i(3), 5: p_i(5)}}
          - confidenceIntervals: top-N items only with keys locationId, lower, upper

        Runs 200 iterations to keep test duration short while still exercising
        the full Monte Carlo pipeline.

        Reference: subsection 2.3.3, Appendix A.9, formula (1.17).
        """
        from schemas.sensitivity import STABILITY_K_VALUES, TOP_N_FOR_CONFIDENCE_INTERVALS

        profiles_resp = await api_client.get("/api/profiles")
        profiles = profiles_resp.json()
        municipal = next(p for p in profiles if p["code"] == "municipal")
        municipal_id = municipal["id"]

        pwm = _identity_pairwise_matrix(10)
        create_resp = await api_client.post(
            "/api/evaluations",
            json={"profileId": municipal_id, "pairwiseMatrix": pwm},
        )
        assert create_resp.status_code == 200
        evaluation_id = create_resp.json()["evaluationId"]

        sens_resp = await api_client.post(
            f"/api/evaluations/{evaluation_id}/sensitivity",
            json={"iterations": 200, "perturbation": 0.1},
        )

        assert sens_resp.status_code == 200
        data = sens_resp.json()

        stability_matrix = data.get("stabilityMatrix", {})
        assert len(stability_matrix) > 0, (
            "Expected stabilityMatrix with at least one location key, got empty dict"
        )
        any_entry = next(iter(stability_matrix.values()))
        expected_k = {str(k) for k in STABILITY_K_VALUES}
        assert set(any_entry.keys()) == expected_k, (
            f"Each stability entry must carry top-k keys {expected_k}; got {set(any_entry.keys())}"
        )

        cis = data.get("confidenceIntervals", [])
        assert len(cis) == TOP_N_FOR_CONFIDENCE_INTERVALS, (
            f"Expected {TOP_N_FOR_CONFIDENCE_INTERVALS} CIs (top-N only), got {len(cis)}"
        )
        first_ci = cis[0]
        expected_ci_keys = {"locationId", "lower", "upper"}
        assert expected_ci_keys.issubset(first_ci.keys()), (
            f"Missing keys in CI item. "
            f"Expected subset {expected_ci_keys}, got {set(first_ci.keys())}"
        )

    async def test_post_sensitivity_ci_sorted_by_mean_score_desc(
        self, api_client: AsyncClient
    ) -> None:
        """confidenceIntervals must be ordered by mean closeness C* descending.

        The frontend bar chart shows the top-N locations sorted from best to
        worst; the API contract guarantees this ordering so the client does not
        need to re-sort. Since C*_mean = (lower + upper) / 2, we assert the
        midpoint of each subsequent interval is <= the previous one.
        """
        profiles_resp = await api_client.get("/api/profiles")
        profiles = profiles_resp.json()
        municipal_id = next(p for p in profiles if p["code"] == "municipal")["id"]

        create_resp = await api_client.post(
            "/api/evaluations",
            json={
                "profileId": municipal_id,
                "pairwiseMatrix": _identity_pairwise_matrix(10),
            },
        )
        evaluation_id = create_resp.json()["evaluationId"]

        sens_resp = await api_client.post(
            f"/api/evaluations/{evaluation_id}/sensitivity",
            json={"iterations": 200, "perturbation": 0.1},
        )
        assert sens_resp.status_code == 200

        cis = sens_resp.json()["confidenceIntervals"]
        midpoints = [(ci["lower"] + ci["upper"]) / 2 for ci in cis]
        for i in range(len(midpoints) - 1):
            assert midpoints[i] >= midpoints[i + 1], (
                f"CI list not sorted desc: midpoint[{i}]={midpoints[i]:.4f} "
                f"< midpoint[{i + 1}]={midpoints[i + 1]:.4f}"
            )
