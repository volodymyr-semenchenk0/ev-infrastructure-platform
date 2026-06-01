"""DTOs for cross-profile comparison (spec 2.1.6 §9)."""

from __future__ import annotations

from schemas.base import CamelModel
from schemas.evaluation import RankingItemRead


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


class ProfileRankingRead(CamelModel):
    """One profile and the ranking its default matrix produces (spec 2.3.4)."""

    id: int
    code: str
    name: str
    ranking: list[RankingItemRead]


class ProfileComparisonRead(CamelModel):
    """GET /api/profiles/comparison — both profile rankings plus their Spearman comparison.

    Higher-order scenario from spec 2.1.1/2.3.4: each profile is evaluated from its
    default pairwise matrix, so the comparison is reproducible regardless of session.
    """

    profile_a: ProfileRankingRead
    profile_b: ProfileRankingRead
    comparison: ComparisonRead
