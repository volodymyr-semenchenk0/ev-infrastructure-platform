"""SensitivityService - persist Monte Carlo rank stability (subsection 2.3.3)."""

from __future__ import annotations

import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import RankingItem
from mcdm.monte_carlo import sensitivity_analysis
from mcdm.topsis import topsis
from schemas.sensitivity import (
    STABILITY_K_VALUES,
    TOP_N_FOR_CONFIDENCE_INTERVALS,
    ConfidenceInterval,
    ConvergenceTrace,
    CstarHistogram,
    SensitivityRead,
)
from services.repository import (
    CriterionRepository,
    DecisionMatrixRepository,
    EvaluationRepository,
    LocationRepository,
    SensitivityRepository,
)

DEFAULT_SEED: int = 42


class SensitivityService:
    """Persist Monte Carlo stability for one EvaluationRun."""

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

        mc_result = sensitivity_analysis(
            decision_matrix=x,
            base_weights=weights_vec,
            types=types_arr,
            scorer=topsis,
            n_simulations=iterations,
            delta=perturbation,
            seed=DEFAULT_SEED,
            k_values=STABILITY_K_VALUES,
        )

        ci_lower = mc_result["ci_lower"]
        ci_upper = mc_result["ci_upper"]
        top_k_freq = mc_result["top_k_freq"]

        # stability_matrix[location_id][k] = p_i(k) per formula (1.17).
        stability_matrix: dict[int, dict[int, float]] = {
            location_ids[i]: {k: float(top_k_freq[k][i]) for k in STABILITY_K_VALUES}
            for i in range(len(location_ids))
        }

        # The deterministic base ranking is the sole key for selecting and
        # ordering the confidence intervals (subsection 2.3.3): Monte Carlo only
        # supplies the 2.5/97.5 percentile band, never a mean used for ranking.
        # ci_lower/ci_upper are indexed like location_ids (decision-matrix column
        # order from location_repo.list_ordered()), so map each ranking item to
        # its array index. cstar is the deterministic C_i* of the base run; it
        # centres the interval but need not be the midpoint of the percentile band.
        idx_by_loc = {loc_id: i for i, loc_id in enumerate(location_ids)}
        ordered = sorted(run.ranking, key=lambda item: item.rank)

        def _interval(item: RankingItem) -> ConfidenceInterval:
            i = idx_by_loc[item.location_id]
            return ConfidenceInterval(
                location_id=item.location_id,
                cstar=float(item.closeness_coefficient),
                lower=float(ci_lower[i]),
                upper=float(ci_upper[i]),
            )

        # Step 2 forest-plot (return-only): deterministic C* + percentile band for
        # ALL locations, ordered by deterministic rank. The top-N slice
        # (Appendix A.9) carries the persisted confidence intervals.
        ranking_intervals = [_interval(item) for item in ordered]
        cis = ranking_intervals[:TOP_N_FOR_CONFIDENCE_INTERVALS]

        # Step 1 histogram: per-location auto-zoomed bins, C* counts per location.
        hist_edges = mc_result["hist_bin_edges"]
        hist_counts = mc_result["hist_counts"]
        cstar_histogram = CstarHistogram(
            edges_by_location={
                location_ids[i]: [float(e) for e in hist_edges[i]] for i in range(len(location_ids))
            },
            counts_by_location={
                location_ids[i]: [int(c) for c in hist_counts[i]] for i in range(len(location_ids))
            },
        )

        # Step 3 convergence: running mean of C* per location at each checkpoint.
        conv_mean = mc_result["convergence_mean"]
        convergence = ConvergenceTrace(
            iterations=[int(t) for t in mc_result["convergence_iterations"]],
            mean_by_location={
                location_ids[i]: [float(v) for v in conv_mean[:, i]]
                for i in range(len(location_ids))
            },
        )

        # Persist (idempotent overwrite if a record already exists).
        existing = await self.sens_repo.get(evaluation_id)
        if existing is not None:
            await self.session.delete(existing)
            await self.session.flush()

        # JSON object keys must be strings; serialise integer ids/k values.
        persisted_stability = {
            str(loc_id): {str(k): p for k, p in inner.items()}
            for loc_id, inner in stability_matrix.items()
        }
        await self.sens_repo.create(
            evaluation_id=evaluation_id,
            iterations=iterations,
            perturbation=perturbation,
            stability_matrix=persisted_stability,
            confidence_intervals=[ci.model_dump() for ci in cis],
        )
        await self.session.flush()

        return SensitivityRead(
            stability_matrix=stability_matrix,
            confidence_intervals=cis,
            ranking_intervals=ranking_intervals,
            cstar_histogram=cstar_histogram,
            convergence=convergence,
        )
