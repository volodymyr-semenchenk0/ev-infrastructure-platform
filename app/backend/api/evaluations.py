"""Evaluations endpoints (spec 2.1.6 §6–10)."""

from __future__ import annotations

import csv
import io
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from api.deps import (
    get_comparison_service,
    get_evaluation_repository,
    get_evaluation_service,
    get_sensitivity_service,
)
from schemas.comparison import ComparisonRead
from schemas.evaluation import EvaluationCreate, EvaluationRead
from schemas.sensitivity import SensitivityRead, SensitivityRequest
from services import (
    ComparisonService,
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


@router.get(
    "/{evaluation_id}/comparison/{other_id}",
    response_model=ComparisonRead,
    response_model_by_alias=True,
)
async def get_comparison(
    evaluation_id: int,
    other_id: int,
    repo: EvaluationRepository = Depends(get_evaluation_repository),
    service: ComparisonService = Depends(get_comparison_service),
) -> ComparisonRead:
    run_a = await repo.get_with_ranking(evaluation_id)
    run_b = await repo.get_with_ranking(other_id)
    if run_a is None or run_b is None:
        missing = evaluation_id if run_a is None else other_id
        raise HTTPException(status_code=404, detail=f"Evaluation {missing} not found")
    return service.compare(run_a, run_b)


@router.get("/{evaluation_id}/export")
async def export_evaluation(
    evaluation_id: int,
    format: Literal["csv", "json"] = "json",
    repo: EvaluationRepository = Depends(get_evaluation_repository),
) -> Response:
    run = await repo.get_with_ranking(evaluation_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Evaluation {evaluation_id} not found")
    run.ranking.sort(key=lambda r: r.rank)

    if format == "json":
        dto = EvaluationRead.model_validate(run)
        return Response(
            content=dto.model_dump_json(by_alias=True),
            media_type="application/json",
            headers={
                "Content-Disposition": (f"attachment; filename=evaluation-{evaluation_id}.json")
            },
        )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["location_id", "rank", "closeness", "s_plus", "s_minus"])
    for item in run.ranking:
        writer.writerow(
            [
                item.location_id,
                item.rank,
                float(item.closeness_coefficient),
                float(item.distance_to_positive),
                float(item.distance_to_negative),
            ]
        )
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": (f"attachment; filename=evaluation-{evaluation_id}.csv")},
    )
