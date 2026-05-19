"""Red-phase API integration tests for comparison and export endpoints (Task #19).

Covers the two remaining endpoints from spec 2.1.6 §9–10:
  §9  GET /api/evaluations/{id}/comparison/{otherId}
  §10 GET /api/evaluations/{id}/export?format=csv|json

The api_client fixture is defined locally (same pattern as test_api_routes.py)
to avoid coupling tests across files.  The 404-case and format-validation tests
will remain red until Task #20 adds the route handlers to api/evaluations.py.

No mocks — real PostGIS container via db_session (conftest.py).
Reference: spec 2.1.6 §9–10.
"""

from __future__ import annotations

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db
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

    Seeds reference data and decision matrix so every endpoint test starts
    from a consistent state: 2 profiles, 10 criteria, 12 locations, 120 X-values.
    """
    await seed_reference_data(db_session)
    await seed_decision_matrix(db_session)
    await db_session.flush()

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


async def _create_evaluation(api_client: AsyncClient, profile_code: str = "municipal") -> int:
    """POST /api/evaluations with an identity matrix; return the created evaluationId."""
    profiles = (await api_client.get("/api/profiles")).json()
    profile = next(p for p in profiles if p["code"] == profile_code)
    payload = {"profileId": profile["id"], "pairwiseMatrix": _identity_pairwise_matrix(10)}
    resp = await api_client.post("/api/evaluations", json=payload)
    assert resp.status_code == 200
    return resp.json()["evaluationId"]


# ---------------------------------------------------------------------------
# F. Comparison
# ---------------------------------------------------------------------------


class TestComparison:
    """Tests for GET /api/evaluations/{id}/comparison/{otherId}.

    Reference: spec 2.1.6 §9 — Spearman correlation endpoint.
    """

    async def test_get_comparison_returns_200_with_spearman(self, api_client: AsyncClient) -> None:
        """GET /api/evaluations/{a}/comparison/{b} → 200, JSON with spearmanRho and pairwiseDifferences.

        Two evaluations are created with different profiles so that their weight
        vectors differ and the resulting rankings may diverge.  The Spearman ρ
        value must be a float in [-1, 1].  All 12 seeded locations are shared,
        so pairwiseDifferences must contain exactly 12 entries.

        Each entry must expose the camelCase keys locationId, rankA, rankB, delta.

        Reference: spec 2.1.6 §9 — comparison contract.
        """
        eval_a_id = await _create_evaluation(api_client, "municipal")
        eval_b_id = await _create_evaluation(api_client, "investor")

        resp = await api_client.get(f"/api/evaluations/{eval_a_id}/comparison/{eval_b_id}")

        assert resp.status_code == 200
        data = resp.json()
        assert "spearmanRho" in data
        assert isinstance(data["spearmanRho"], (int, float))
        assert -1.0 <= data["spearmanRho"] <= 1.0
        assert "pairwiseDifferences" in data
        # 12 locations are common to both runs.
        assert len(data["pairwiseDifferences"]) == 12
        first = data["pairwiseDifferences"][0]
        assert {"locationId", "rankA", "rankB", "delta"}.issubset(first.keys())

    async def test_get_comparison_404_for_missing_evaluation(self, api_client: AsyncClient) -> None:
        """GET /api/evaluations/999/comparison/998 → 404 when neither evaluation exists.

        The router must perform a lookup for both IDs before calling ComparisonService
        and raise HTTPException(404) on the first miss.

        Reference: spec 2.1.6 §9 — not-found handling.
        """
        resp = await api_client.get("/api/evaluations/999/comparison/998")

        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# G. Export
# ---------------------------------------------------------------------------


class TestExport:
    """Tests for GET /api/evaluations/{id}/export?format=csv|json.

    Reference: spec 2.1.6 §10 — evaluation export endpoint.
    """

    async def test_export_evaluation_as_json(self, api_client: AsyncClient) -> None:
        """GET /api/evaluations/{id}/export?format=json → 200 with a JSON document.

        The response must have Content-Type application/json, include the
        evaluationId field matching the requested ID, and contain a ranking list
        with 12 entries (one per seeded location).

        Reference: spec 2.1.6 §10 — JSON export format.
        """
        eval_id = await _create_evaluation(api_client)

        resp = await api_client.get(f"/api/evaluations/{eval_id}/export?format=json")

        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("application/json")
        data = resp.json()
        assert data["evaluationId"] == eval_id
        assert "ranking" in data
        assert len(data["ranking"]) == 12

    async def test_export_evaluation_as_csv(self, api_client: AsyncClient) -> None:
        """GET /api/evaluations/{id}/export?format=csv → 200 with CSV text.

        The response must have Content-Type text/csv.
        The first line must be the header starting with:
          location_id,rank,closeness,s_plus,s_minus
        There must be exactly 12 data rows after the header (one per location).

        Reference: spec 2.1.6 §10 — CSV export format.
        """
        eval_id = await _create_evaluation(api_client)

        resp = await api_client.get(f"/api/evaluations/{eval_id}/export?format=csv")

        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/csv")
        lines = resp.text.strip().split("\n")
        assert lines[0].startswith("location_id,rank,closeness,s_plus,s_minus")
        # header + 12 data rows
        data_rows = lines[1:]
        assert len(data_rows) == 12
