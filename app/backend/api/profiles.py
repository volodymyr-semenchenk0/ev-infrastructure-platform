"""Profiles endpoints (spec 2.1.6 §1-2)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from api.deps import (
    get_criterion_repository,
    get_profile_comparison_service,
    get_profile_repository,
)
from db.defaults import build_default_pairwise_matrix
from schemas.comparison import ProfileComparisonRead
from schemas.profile import ProfileDetailRead, ProfileRead
from services import CriterionRepository, ProfileComparisonService, ProfileRepository

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.get("", response_model=list[ProfileRead], response_model_by_alias=True)
async def list_profiles(
    repo: ProfileRepository = Depends(get_profile_repository),
) -> list[ProfileRead]:
    profiles = await repo.list_all()
    return [ProfileRead.model_validate(p) for p in profiles]


# Declared before "/{profile_id}" so FastAPI does not parse "comparison" as an int id.
@router.get("/comparison", response_model=ProfileComparisonRead, response_model_by_alias=True)
async def compare_profiles(
    profile_a: int | None = None,
    profile_b: int | None = None,
    service: ProfileComparisonService = Depends(get_profile_comparison_service),
) -> ProfileComparisonRead:
    try:
        return await service.compare_profiles(profile_a, profile_b)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


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
