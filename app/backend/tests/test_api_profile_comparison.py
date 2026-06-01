"""Integration tests for GET /api/profiles/comparison.

Higher-order scenario (spec 2.1.1, 2.3.4): run the full evaluation cycle for both
standard profiles from their default pairwise matrices and compare the two rankings
via Spearman (formula 1.18). The result is canonical — built from default matrices,
independent of session edits — so it is reproducible for §3.2.4.
"""

from __future__ import annotations

from httpx import AsyncClient


class TestProfileComparison:
    async def test_comparison_of_two_standard_profiles_returns_200(
        self, api_client: AsyncClient
    ) -> None:
        """No-arg call compares both seeded profiles and returns a coherent result."""
        resp = await api_client.get("/api/profiles/comparison")

        assert resp.status_code == 200, resp.text
        data = resp.json()

        assert {"id", "code", "name", "ranking"}.issubset(data["profileA"].keys())
        assert {"id", "code", "name", "ranking"}.issubset(data["profileB"].keys())
        assert data["profileA"]["ranking"], "profileA ranking must be non-empty"
        assert data["profileB"]["ranking"], "profileB ranking must be non-empty"
        assert data["profileA"]["id"] != data["profileB"]["id"]

        comparison = data["comparison"]
        rho = comparison["spearmanRho"]
        assert -1.0 <= rho <= 1.0, f"spearmanRho out of range: {rho}"

        # One per-location difference per common location; both rankings cover the
        # same locations here, so the count equals each ranking length.
        diffs = comparison["pairwiseDifferences"]
        assert len(diffs) == len(data["profileA"]["ranking"])

        # delta must equal rankA - rankB for every entry.
        for d in diffs:
            assert d["delta"] == d["rankA"] - d["rankB"], (
                f"delta {d['delta']} != rankA-rankB for location {d['locationId']}"
            )

    async def test_comparison_by_explicit_ids(self, api_client: AsyncClient) -> None:
        """Explicit profile_a/profile_b query params select the compared profiles."""
        profiles = (await api_client.get("/api/profiles")).json()
        a, b = profiles[0]["id"], profiles[1]["id"]

        resp = await api_client.get(f"/api/profiles/comparison?profile_a={a}&profile_b={b}")

        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["profileA"]["id"] == a
        assert data["profileB"]["id"] == b

    async def test_comparison_404_for_missing_profile(self, api_client: AsyncClient) -> None:
        """A non-existent profile id yields 404, not 500."""
        resp = await api_client.get("/api/profiles/comparison?profile_a=999999&profile_b=999998")
        assert resp.status_code == 404

    async def test_comparison_response_is_camel_case(self, api_client: AsyncClient) -> None:
        """Response keys follow the camelCase JSON contract (CamelModel aliases)."""
        data = (await api_client.get("/api/profiles/comparison")).json()
        assert {"profileA", "profileB", "comparison"}.issubset(data.keys())
        assert "spearmanRho" in data["comparison"]
        assert "pairwiseDifferences" in data["comparison"]
        first_diff = data["comparison"]["pairwiseDifferences"][0]
        assert {"locationId", "rankA", "rankB", "delta"}.issubset(first_diff.keys())
        assert "locationId" in data["profileA"]["ranking"][0]
