"""Integration tests for GET /api/profiles and GET /api/profiles/{id}.

Covers the success branch of profile detail retrieval (missing in test_api_routes.py)
and verifies camelCase response structure.

Reference: spec 2.1.6 §1–2 — profile resource endpoints.
"""

from __future__ import annotations

from httpx import AsyncClient


class TestProfiles:
    async def test_list_profiles_returns_200_with_two_items(self, api_client: AsyncClient) -> None:
        """GET /api/profiles returns 200 with exactly 2 seeded profiles."""
        resp = await api_client.get("/api/profiles")

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        item = data[0]
        assert {"id", "code", "name"}.issubset(item.keys()), (
            f"Expected id/code/name keys in profile list item, got {set(item.keys())}"
        )

    async def test_get_profile_by_id_returns_detail_with_criteria(
        self, api_client: AsyncClient
    ) -> None:
        """GET /api/profiles/{id} returns 200 with criteria list for valid id.

        ProfileDetailRead must include a 'criteria' list (seeded: 10 items).
        Reference: spec 2.1.6 §2 — profile detail endpoint.
        """
        profiles = (await api_client.get("/api/profiles")).json()
        profile_id = profiles[0]["id"]

        resp = await api_client.get(f"/api/profiles/{profile_id}")

        assert resp.status_code == 200
        data = resp.json()
        assert "criteria" in data, (
            f"ProfileDetailRead must contain 'criteria' list, got keys: {set(data.keys())}"
        )
        assert isinstance(data["criteria"], list)

    async def test_get_profile_returns_404_for_missing(self, api_client: AsyncClient) -> None:
        """GET /api/profiles/{id} returns 404 for a non-existent profile id."""
        resp = await api_client.get("/api/profiles/999999")

        assert resp.status_code == 404
