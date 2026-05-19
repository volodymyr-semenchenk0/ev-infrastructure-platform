"""DTOs for cross-profile comparison (spec 2.1.6 §9)."""

from __future__ import annotations

from schemas.base import CamelModel


class PairwiseDifference(CamelModel):
    """Per-location difference of two rankings."""

    location_id: int
    rank_a: int
    rank_b: int
    delta: int


class ComparisonRead(CamelModel):
    """GET /api/evaluations/{id}/comparison/{otherId} — Spearman + per-location deltas."""

    spearman_rho: float
    pairwise_differences: list[PairwiseDifference]
