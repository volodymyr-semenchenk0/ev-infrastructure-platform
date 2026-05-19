"""SensitivityService — Monte-Carlo rank stability (spec 2.1.6 §8, formula 1.17)."""

from __future__ import annotations

import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession

from mcdm.monte_carlo import sensitivity_analysis
from mcdm.topsis import topsis
from schemas.sensitivity import ConfidenceInterval, SensitivityRead
from services.repository import (
    CriterionRepository,
    DecisionMatrixRepository,
    EvaluationRepository,
    LocationRepository,
    SensitivityRepository,
)

CI_Z_SCORE_95: float = 1.96
DEFAULT_SEED: int = 42


class SensitivityService:
    """Persist Monte-Carlo stability for one EvaluationRun."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.criterion_repo = CriterionRepository(session)
        self.location_repo = LocationRepository(session)
        self.dm_repo = DecisionMatrixRepository(session)
        self.eval_repo = EvaluationRepository(session)
        self.sens_repo = SensitivityRepository(session)

    async def run(
        self,
        evaluation_id: int,
        iterations: int,
        perturbation: float,
    ) -> SensitivityRead:
        run = await self.eval_repo.get_with_ranking(evaluation_id)
        if run is None:
            raise ValueError(f"EvaluationRun {evaluation_id} not found")

        criteria = await self.criterion_repo.list_ordered()
        locations = await self.location_repo.list_ordered()
        criterion_ids = [c.id for c in criteria]
        location_ids = [loc.id for loc in locations]
        x = await self.dm_repo.load_matrix(criterion_ids, location_ids)

        weights_vec = np.array([float(run.weights_vector[c.code]) for c in criteria])
        types_arr = np.array([1 if c.optimization_type == "max" else -1 for c in criteria])

        # Fixed seed → reproducible stability matrix.
        mc_result = sensitivity_analysis(
            decision_matrix=x,
            base_weights=weights_vec,
            types=types_arr,
            scorer=topsis,
            n_simulations=iterations,
            delta=perturbation,
            seed=DEFAULT_SEED,
        )

        scores_mean = mc_result["scores_mean"]
        scores_std = mc_result["scores_std"]
        rank_freq = mc_result["rank_freq"]

        n_alt = len(locations)
        # stability_matrix[location_name] = [p(rank=1), ..., p(rank=n_alt)]
        stability_matrix: dict[str, list[float]] = {}
        for alt_idx, loc in enumerate(locations):
            probs = [float(rank_freq[k, alt_idx]) / iterations for k in range(n_alt)]
            stability_matrix[loc.name] = probs

        # CI for top-3 by mean closeness.
        order_desc = np.argsort(scores_mean)[::-1]
        top3 = order_desc[: min(3, n_alt)].tolist()
        cis = [
            ConfidenceInterval(
                location_id=location_ids[i],
                low=float(scores_mean[i] - CI_Z_SCORE_95 * scores_std[i]),
                high=float(scores_mean[i] + CI_Z_SCORE_95 * scores_std[i]),
            )
            for i in top3
        ]

        # Persist (idempotent overwrite if a record already exists).
        existing = await self.sens_repo.get(evaluation_id)
        if existing is not None:
            await self.session.delete(existing)
            await self.session.flush()

        await self.sens_repo.create(
            evaluation_id=evaluation_id,
            iterations=iterations,
            perturbation=perturbation,
            stability_matrix=stability_matrix,
            confidence_intervals=[ci.model_dump() for ci in cis],
        )
        await self.session.flush()

        return SensitivityRead(
            stability_matrix=stability_matrix,
            confidence_intervals=cis,
        )
