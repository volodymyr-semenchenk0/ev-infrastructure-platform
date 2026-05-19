"""DTOs for location resources (spec 2.1.6 §4–5).

LocationRead extracts (latitude, longitude) from the PostGIS GEOMETRY(Point, 4326)
ORM column via a model_validator so callers see plain floats, not geometry blobs.
"""

from __future__ import annotations

from typing import Any

from geoalchemy2 import WKBElement, WKTElement
from geoalchemy2.shape import to_shape
from pydantic import Field, model_validator

from schemas.base import CamelModel

# Approximate bounding box of Ukraine in WGS-84.
UKRAINE_LAT_MIN: float = 44.0
UKRAINE_LAT_MAX: float = 53.0
UKRAINE_LON_MIN: float = 22.0
UKRAINE_LON_MAX: float = 41.0


class LocationCreate(CamelModel):
    """POST /api/locations request body."""

    name: str = Field(..., min_length=1, max_length=128)
    address: str | None = Field(None, max_length=256)
    district: str | None = Field(None, max_length=64)
    latitude: float = Field(..., ge=UKRAINE_LAT_MIN, le=UKRAINE_LAT_MAX)
    longitude: float = Field(..., ge=UKRAINE_LON_MIN, le=UKRAINE_LON_MAX)


class LocationRead(CamelModel):
    """GET /api/locations element with lat/lon extracted from PostGIS geom."""

    id: int
    name: str
    address: str | None = None
    district: str | None = None
    latitude: float
    longitude: float

    @model_validator(mode="before")
    @classmethod
    def _extract_lat_lon_from_geom(cls, data: Any) -> Any:
        # Plain dict input — pass through (used in unit tests and manual construction).
        if isinstance(data, dict):
            return data

        # ORM-like input: convert WKBElement/WKTElement on `.geom` into (lat, lon).
        geom = getattr(data, "geom", None)
        if isinstance(geom, (WKBElement, WKTElement)):
            shape = to_shape(geom)
            return {
                "id": data.id,
                "name": data.name,
                "address": getattr(data, "address", None),
                "district": getattr(data, "district", None),
                "latitude": shape.y,
                "longitude": shape.x,
            }
        return data
