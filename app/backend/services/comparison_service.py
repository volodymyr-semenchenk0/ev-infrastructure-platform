"""ComparisonService — Spearman correlation + per-location rank deltas (spec 2.1.6 §9)."""

from __future__ import annotations

from typing import Any

from scipy.stats import spearmanr

from schemas.comparison import ComparisonRead, PairwiseDifference


class ComparisonService:
    """Pure-function comparator over two pre-loaded EvaluationRun objects.

    Stateless; takes resolved objects with eagerly loaded `ranking` rather than
    primary keys.  Lookup + 404 handling lives in the router so this class can
    be used from CLI / tests without an HTTP context.

    Accepts `Any` to allow duck-typed SimpleNamespace in unit tests; production
    callers pass `db.models.EvaluationRun`.
    """

    def compare(self, run_a: Any, run_b: Any) -> ComparisonRead:
        ranks_a: dict[int, int] = {item.location_id: item.rank for item in run_a.ranking}
        ranks_b: dict[int, int] = {item.location_id: item.rank for item in run_b.ranking}
        common_ids = sorted(set(ranks_a) & set(ranks_b))

        if len(common_ids) < 2:
            # spearmanr requires >= 2 paired observations.
            rho = float("nan")
        else:
            stat, _ = spearmanr(
                [ranks_a[i] for i in common_ids],
                [ranks_b[i] for i in common_ids],
            )
            rho = float(stat)

        differences = [
            PairwiseDifference(
                location_id=loc_id,
                rank_a=ranks_a[loc_id],
                rank_b=ranks_b[loc_id],
                delta=ranks_a[loc_id] - ranks_b[loc_id],
            )
            for loc_id in common_ids
        ]

        return ComparisonRead(
            spearman_rho=rho,
            pairwise_differences=differences,
        )
