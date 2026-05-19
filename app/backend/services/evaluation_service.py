"""EvaluationService — orchestrates FAHP → TOPSIS → persistence (spec 2.1.6 §6)."""

from __future__ import annotations

import time

import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession

from mcdm.fahp import fahp_weights
from mcdm.topsis import topsis_with_distances
from schemas.evaluation import EvaluationCreate, EvaluationRead, FuzzyNumber
from services.repository import (
    CriterionRepository,
    DecisionMatrixRepository,
    EvaluationRepository,
    LocationRepository,
)

PairwiseMatrixInput = list[list[dict[str, float] | FuzzyNumber]]


class EvaluationService:
    """End-to-end runner for a single FAHP+TOPSIS evaluation cycle."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.criterion_repo = CriterionRepository(session)
        self.location_repo = LocationRepository(session)
        self.dm_repo = DecisionMatrixRepository(session)
        self.eval_repo = EvaluationRepository(session)

    async def execute_full_cycle(
        self,
        profile_id: int,
        pairwise_matrix: PairwiseMatrixInput,
    ) -> EvaluationRead:
        """Run FAHP+TOPSIS for one (profile, matrix) and persist the result.

        Raises:
            ValueError: matrix invalid (Pydantic) or size mismatch with criteria
                or CR > 0.10 (from fahp_weights).
        """
        # Pydantic validation: squareness, diagonal, reciprocal, Saaty bounds.
        # model_validate accepts both raw dicts and FuzzyNumber objects.
        dto = EvaluationCreate.model_validate(
            {"profile_id": profile_id, "pairwise_matrix": pairwise_matrix}
        )
        n = len(dto.pairwise_matrix)

        criteria = await self.criterion_repo.list_ordered()
        criteria_count = len(criteria)
        if n != criteria_count:
            raise ValueError(
                f"pairwise matrix size {n} does not match number of criteria "
                f"{criteria_count} in the database"
            )

        matrix_np = self._dto_matrix_to_numpy(dto.pairwise_matrix, n)

        started = time.perf_counter()

        weights = fahp_weights(matrix_np)

        locations = await self.location_repo.list_ordered()
        criterion_ids = [c.id for c in criteria]
        location_ids = [loc.id for loc in locations]
        x = await self.dm_repo.load_matrix(criterion_ids, location_ids)

        types_arr = np.array([1 if c.optimization_type == "max" else -1 for c in criteria])
        scores, ranking, s_pos, s_neg = topsis_with_distances(x, weights, types_arr)

        elapsed_ms = int((time.perf_counter() - started) * 1000)

        weights_dict = {c.code: float(w) for c, w in zip(criteria, weights, strict=True)}
        run = await self.eval_repo.create(
            profile_id=profile_id,
            status="done",
            weights=weights_dict,
            execution_time_ms=elapsed_ms,
        )

        # Invert ranking → rank per alternative (1-based).
        rank_per_alt = np.empty(len(location_ids), dtype=int)
        for rank_pos, alt_idx in enumerate(ranking.tolist(), start=1):
            rank_per_alt[alt_idx] = rank_pos

        for i, loc_id in enumerate(location_ids):
            await self.eval_repo.add_ranking_item(
                evaluation_id=run.id,
                location_id=loc_id,
                rank=int(rank_per_alt[i]),
                closeness_coefficient=float(scores[i]),
                distance_to_positive=float(s_pos[i]),
                distance_to_negative=float(s_neg[i]),
            )
        await self.session.flush()

        full_run = await self.eval_repo.get_with_ranking(run.id)
        if full_run is None:
            raise RuntimeError("persisted evaluation could not be reloaded")
        full_run.ranking.sort(key=lambda r: r.rank)
        return EvaluationRead.model_validate(full_run)

    @staticmethod
    def _dto_matrix_to_numpy(matrix: list[list[FuzzyNumber]], n: int) -> np.ndarray:
        out = np.zeros((n, n, 3))
        for i in range(n):
            for j in range(n):
                tfn = matrix[i][j]
                out[i, j, 0] = tfn.l
                out[i, j, 1] = tfn.m
                out[i, j, 2] = tfn.u
        return out
