"""Locations endpoints (spec 2.1.6 §4–5)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from api.deps import get_location_repository
from schemas.location import LocationCreate, LocationRead
from services import LocationRepository

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("", response_model=list[LocationRead], response_model_by_alias=True)
async def list_locations(
    repo: LocationRepository = Depends(get_location_repository),
) -> list[LocationRead]:
    pairs = await repo.list_ordered_with_criteria_values()
    result = []
    for loc, cv in pairs:
        read = LocationRead.model_validate(loc)
        read.criteria_values = cv or None
        result.append(read)
    return result


@router.post(
    "",
    response_model=LocationRead,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
)
async def create_location(
    payload: LocationCreate,
    repo: LocationRepository = Depends(get_location_repository),
) -> LocationRead:
    loc = await repo.create(
        name=payload.name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address,
        district=payload.district,
    )
    return LocationRead.model_validate(loc)
