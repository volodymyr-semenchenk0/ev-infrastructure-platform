"""Integration tests for GET /api/locations and POST /api/locations.

Verifies camelCase field names (latitude/longitude instead of raw geom)
and coordinate boundary validation.

Reference: spec 2.1.6 §4–5 — location resource endpoints.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


class TestLocations:
    async def test_list_locations_returns_latitude_longitude_fields(
        self, api_client: AsyncClient
    ) -> None:
        """GET /api/locations items expose latitude/longitude (not raw geom).

        LocationRead serialises the PostGIS point to lat/lon floats.
        Reference: schemas/location.py LocationRead — geom → latitude/longitude.
        """
        resp = await api_client.get("/api/locations")

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 12

        item = data[0]
        assert "latitude" in item and "longitude" in item, (
            f"Expected latitude/longitude keys, got: {set(item.keys())}"
        )
        assert "geom" not in item, "Raw geom field must not be exposed in the response"
        assert isinstance(item["latitude"], float)
        assert isinstance(item["longitude"], float)

    async def test_create_location_returns_201_with_coordinates(
        self, api_client: AsyncClient
    ) -> None:
        """POST /api/locations returns 201 and includes latitude/longitude in response.

        Coordinates are within the Ukraine bounding box (lat 44–53, lon 22–41).
        Reference: spec 2.1.6 §5 — location creation; schemas/location.py bounds.
        """
        payload = {
            "name": "Тестова локація",
            "address": "вул. Хрещатик, 1",
            "district": "Шевченківський",
            "latitude": 50.45,
            "longitude": 30.52,
        }

        resp = await api_client.post("/api/locations", json=payload)

        assert resp.status_code == 201
        data = resp.json()
        assert isinstance(data.get("id"), int)
        assert data["latitude"] == pytest.approx(50.45, abs=1e-4)
        assert data["longitude"] == pytest.approx(30.52, abs=1e-4)

    async def test_create_location_rejects_out_of_ukraine_coords(
        self, api_client: AsyncClient
    ) -> None:
        """POST /api/locations with latitude outside Ukraine bounds returns 422.

        UKRAINE_LAT_MAX = 53.0; latitude=61.0 must be rejected by Pydantic.
        Reference: schemas/location.py — UKRAINE_LAT_MIN/MAX validation.
        """
        payload = {
            "name": "Out-of-bounds",
            "address": "N/A",
            "district": "N/A",
            "latitude": 61.0,
            "longitude": 30.5,
        }

        resp = await api_client.post("/api/locations", json=payload)

        assert resp.status_code == 422
