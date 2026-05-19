"""Evaluations endpoints (spec 2.1.6 §6–8)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from api.deps import (
    get_evaluation_repository,
    get_evaluation_service,
    get_sensitivity_service,
)
from schemas.evaluation import EvaluationCreate, EvaluationRead
from schemas.sensitivity import SensitivityRead, SensitivityRequest
from services import (
    EvaluationRepository,
    EvaluationService,
    SensitivityService,
)

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])


@router.post("", response_model=EvaluationRead, response_model_by_alias=True)
async def create_evaluation(
    payload: EvaluationCreate,
    service: EvaluationService = Depends(get_evaluation_service),
) -> EvaluationRead:
    return await service.execute_full_cycle(
        profile_id=payload.profile_id,
        pairwise_matrix=payload.pairwise_matrix,
    )


@router.get(
    "/{evaluation_id}",
    response_model=EvaluationRead,
    response_model_by_alias=True,
)
async def get_evaluation(
    evaluation_id: int,
    repo: EvaluationRepository = Depends(get_evaluation_repository),
) -> EvaluationRead:
    run = await repo.get_with_ranking(evaluation_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Evaluation {evaluation_id} not found")
    run.ranking.sort(key=lambda r: r.rank)
    return EvaluationRead.model_validate(run)


@router.post(
    "/{evaluation_id}/sensitivity",
    response_model=SensitivityRead,
    response_model_by_alias=True,
)
async def run_sensitivity(
    evaluation_id: int,
    payload: SensitivityRequest,
    service: SensitivityService = Depends(get_sensitivity_service),
) -> SensitivityRead:
    return await service.run(
        evaluation_id=evaluation_id,
        iterations=payload.iterations,
        perturbation=payload.perturbation,
    )
