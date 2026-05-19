"""Integration tests for POST/GET /api/evaluations and related sub-resources.

Covers invariants (sorted ranking, valid closeness range, weights sum to 1),
camelCase response structure, 404 failure branches, and the Hwang & Yoon (1981)
end-to-end reference test through the HTTP API.

Reference: spec 2.1.6 §6–8 — evaluation cycle endpoints.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


def _identity_pairwise_matrix(n: int) -> list[list[dict[str, float]]]:
    return [[{"l": 1.0, "m": 1.0, "u": 1.0} for _ in range(n)] for _ in range(n)]


async def _create_evaluation(client: AsyncClient, n_criteria: int = 10) -> dict:
    """POST /api/evaluations with an identity matrix; return the JSON response."""
    profiles = (await client.get("/api/profiles")).json()
    profile_id = profiles[0]["id"]
    payload = {"profileId": profile_id, "pairwiseMatrix": _identity_pairwise_matrix(n_criteria)}
    resp = await client.post("/api/evaluations", json=payload)
    assert resp.status_code == 200, resp.text
    return resp.json()


class TestEvaluationInvariants:
    async def test_ranking_items_are_sorted_by_rank(self, api_client: AsyncClient) -> None:
        """Ranking list returned by POST /api/evaluations must be ordered rank=1,2,...,12.

        EvaluationService sorts by closeness descending; the router re-sorts by rank.
        Reference: spec 2.1.6 §6 — ranking field.
        """
        data = await _create_evaluation(api_client)
        ranking = data["ranking"]
        ranks = [item["rank"] for item in ranking]
        assert ranks == list(range(1, len(ranking) + 1)), (
            f"ranking must be sorted 1..n, got {ranks}"
        )

    async def test_closeness_scores_are_in_valid_range(self, api_client: AsyncClient) -> None:
        """All closeness coefficients C* must satisfy 0 ≤ C* ≤ 1.

        This is an algebraic invariant of TOPSIS: Cᵢ* = Sᵢ⁻ / (Sᵢ⁺ + Sᵢ⁻).
        Reference: formula (1.14) — closeness coefficient definition.
        """
        data = await _create_evaluation(api_client)
        for item in data["ranking"]:
            c = item["closeness"]
            assert 0.0 <= c <= 1.0, f"closeness={c} is outside [0, 1] for rank {item['rank']}"

    async def test_weights_sum_to_one(self, api_client: AsyncClient) -> None:
        """FAHP weights returned by POST /api/evaluations must sum to 1.0 (±1e-9).

        Normalisation step in fahp_weights() (formula 1.8) guarantees this.
        Reference: formula (1.8) — weight normalisation.
        """
        data = await _create_evaluation(api_client)
        weights = data["weights"]
        total = sum(weights.values())
        assert total == pytest.approx(1.0, abs=1e-9), f"FAHP weights must sum to 1.0, got {total}"

    async def test_camel_case_response_keys(self, api_client: AsyncClient) -> None:
        """POST /api/evaluations response uses camelCase for all field names.

        CamelModel alias_generator converts snake_case ORM fields.
        Reference: schemas/base.py CamelModel — alias_generator=to_camel.
        """
        data = await _create_evaluation(api_client)
        assert "evaluationId" in data
        assert "executionTimeMs" in data
        first = data["ranking"][0]
        assert "locationId" in first
        assert "sPlus" in first
        assert "sMinus" in first
        assert "closeness" in first
        assert "rank" in first


class TestEvaluationFailures:
    async def test_post_evaluation_rejects_inconsistent_matrix_with_422(
        self, api_client: AsyncClient
    ) -> None:
        """POST /api/evaluations with CR > 0.1 returns 422 (not 500).

        Constructed inconsistent 10×10 matrix:
          - crit_0 vs crit_1 → 9 (strongly prefers 0)
          - crit_1 vs crit_2 → 9 (strongly prefers 1)
          - crit_0 vs crit_2 → 1/9 (contradicts transitivity)

        fahp.fahp_weights raises ValueError("inconsistent matrix: CR=...");
        the endpoint must surface this as HTTP 422 with detail message.
        Reference: mcdm/fahp.py — CR > 0.1 invariant; spec 2.1.6 §6.
        """
        profiles = (await api_client.get("/api/profiles")).json()
        profile_id = profiles[0]["id"]

        n = 10
        matrix = [[{"l": 1.0, "m": 1.0, "u": 1.0} for _ in range(n)] for _ in range(n)]
        matrix[0][1] = {"l": 8.0, "m": 9.0, "u": 9.0}
        matrix[1][0] = {"l": 1 / 9, "m": 1 / 9, "u": 1 / 8}
        matrix[1][2] = {"l": 8.0, "m": 9.0, "u": 9.0}
        matrix[2][1] = {"l": 1 / 9, "m": 1 / 9, "u": 1 / 8}
        matrix[0][2] = {"l": 1 / 9, "m": 1 / 9, "u": 1 / 8}
        matrix[2][0] = {"l": 8.0, "m": 9.0, "u": 9.0}

        resp = await api_client.post(
            "/api/evaluations",
            json={"profileId": profile_id, "pairwiseMatrix": matrix},
        )

        assert resp.status_code == 422, (
            f"expected 422 for CR > 0.1, got {resp.status_code}: {resp.text}"
        )
        detail = resp.json().get("detail", "")
        assert "CR" in detail or "consisten" in detail.lower(), (
            f"422 detail must mention CR or inconsistency, got: {detail!r}"
        )

    async def test_get_evaluation_404_for_missing(self, api_client: AsyncClient) -> None:
        """GET /api/evaluations/{id} returns 404 for a non-existent evaluation id.

        Reference: spec 2.1.6 §7 — not-found case for evaluation retrieval.
        """
        resp = await api_client.get("/api/evaluations/999999")
        assert resp.status_code == 404

    async def test_post_sensitivity_404_for_missing_evaluation(
        self, api_client: AsyncClient
    ) -> None:
        """POST /api/evaluations/{id}/sensitivity returns 404 for missing evaluation.

        SensitivityService loads the evaluation before running MC;
        the router raises HTTPException(404) when not found.
        Reference: spec 2.1.6 §8 — sensitivity endpoint not-found case.
        """
        resp = await api_client.post(
            "/api/evaluations/999999/sensitivity",
            json={"iterations": 100, "perturbation": 0.1},
        )
        assert resp.status_code == 404


class TestEvaluationConsistency:
    async def test_create_then_retrieve_returns_consistent_data(
        self, api_client: AsyncClient
    ) -> None:
        """POST /api/evaluations followed by GET /api/evaluations/{id} must agree.

        Both responses must have the same evaluationId, ranking length,
        and identical closeness values.
        Reference: spec 2.1.6 §6–7 — create and retrieve evaluation.
        """
        post_data = await _create_evaluation(api_client)
        evaluation_id = post_data["evaluationId"]

        get_resp = await api_client.get(f"/api/evaluations/{evaluation_id}")
        assert get_resp.status_code == 200
        get_data = get_resp.json()

        assert get_data["evaluationId"] == evaluation_id
        assert len(get_data["ranking"]) == len(post_data["ranking"])

        post_closeness = {item["locationId"]: item["closeness"] for item in post_data["ranking"]}
        get_closeness = {item["locationId"]: item["closeness"] for item in get_data["ranking"]}
        assert post_closeness == pytest.approx(get_closeness, abs=1e-9), (
            "closeness values must be identical between POST and GET responses"
        )


class TestEndToEndHwangYoon:
    async def test_end_to_end_flow_matches_topsis_reference(
        self, hwang_yoon_api_client: AsyncClient
    ) -> None:
        """Full HTTP API cycle with Hwang & Yoon (1981) data must rank A2 first.

        Decision matrix X (4 alternatives × 3 criteria, equal weights 1/3 each):
          A1: [25000, 16, 8]  — Price(min), Economy(max), Service(max)
          A2: [20000, 20, 6]  — expected best due to dominant economy score
          A3: [15000, 12, 7]
          A4: [30000, 10, 5]

        The 3×3 identity pairwise matrix yields CR=0 and equal weights (1/3, 1/3, 1/3).
        With these weights A2 dominates on the economy criterion and is ranked first.

        Reference: Hwang & Yoon (1981), Chapter 3 illustrative example.
        """
        profiles = (await hwang_yoon_api_client.get("/api/profiles")).json()
        profile_id = profiles[0]["id"]

        payload = {
            "profileId": profile_id,
            "pairwiseMatrix": _identity_pairwise_matrix(3),
        }
        post_resp = await hwang_yoon_api_client.post("/api/evaluations", json=payload)
        assert post_resp.status_code == 200, post_resp.text
        evaluation_id = post_resp.json()["evaluationId"]

        get_resp = await hwang_yoon_api_client.get(f"/api/evaluations/{evaluation_id}")
        assert get_resp.status_code == 200
        detail = get_resp.json()

        top_location_id = detail["ranking"][0]["locationId"]

        locations = (await hwang_yoon_api_client.get("/api/locations")).json()
        winner_name = next((loc["name"] for loc in locations if loc["id"] == top_location_id), None)
        assert winner_name == "A2", (
            f"Expected A2 at rank 1 (Hwang & Yoon 1981), got '{winner_name}'"
        )
