"""Profiles endpoints (spec 2.1.6 §1–2)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_profile_repository
from schemas.profile import ProfileDetailRead, ProfileRead
from services import ProfileRepository

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.get("", response_model=list[ProfileRead], response_model_by_alias=True)
async def list_profiles(
    repo: ProfileRepository = Depends(get_profile_repository),
) -> list[ProfileRead]:
    profiles = await repo.list_all()
    return [ProfileRead.model_validate(p) for p in profiles]


@router.get("/{profile_id}", response_model=ProfileDetailRead, response_model_by_alias=True)
async def get_profile(
    profile_id: int,
    repo: ProfileRepository = Depends(get_profile_repository),
) -> ProfileDetailRead:
    profile = await repo.get(profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Profile {profile_id} not found")
    return ProfileDetailRead.model_validate(profile)
