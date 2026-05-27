"""Profiles endpoints (spec 2.1.6 §1-2)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_criterion_repository, get_profile_repository
from db.defaults import build_default_pairwise_matrix
from schemas.profile import ProfileDetailRead, ProfileRead
from services import CriterionRepository, ProfileRepository

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
    profile_repo: ProfileRepository = Depends(get_profile_repository),
    criterion_repo: CriterionRepository = Depends(get_criterion_repository),
) -> ProfileDetailRead:
    profile = await profile_repo.get(profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Profile {profile_id} not found")

    criteria = await criterion_repo.list_ordered()
    pairwise_matrix = build_default_pairwise_matrix(profile.code, list(criteria))

    return ProfileDetailRead(
        id=profile.id,
        code=profile.code,
        name=profile.name,
        description=profile.description,
        criteria=[],
        pairwise_matrix=pairwise_matrix,
    )
