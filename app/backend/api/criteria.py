"""Criteria endpoint (spec 2.1.6 §3)."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from api.deps import get_criterion_repository
from schemas.profile import CriterionRead
from services import CriterionRepository

router = APIRouter(prefix="/api/criteria", tags=["criteria"])


@router.get("", response_model=list[CriterionRead], response_model_by_alias=True)
async def list_criteria(
    repo: CriterionRepository = Depends(get_criterion_repository),
) -> list[CriterionRead]:
    criteria = await repo.list_ordered()
    return [CriterionRead.model_validate(c) for c in criteria]
