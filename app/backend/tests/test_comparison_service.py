"""Red-phase unit tests for ComparisonService (Task #19).

Tests verify the pure-function contract of ComparisonService.compare before
the implementation exists (Task #20).  No DB, no mocks — only SimpleNamespace
objects that mirror the EvaluationRun.ranking ORM structure.

Reference: spec 2.1.6 §9 — Spearman correlation + per-location deltas.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest

# This import defines the red phase: services/comparison_service.py does not
# exist yet (Task #20).  The ImportError IS the expected red-phase signal.
from services.comparison_service import ComparisonService

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_fake_run(ranks_per_location: dict[int, int]) -> SimpleNamespace:
    """Build a SimpleNamespace mimicking an EvaluationRun with `.ranking` list.

    Each entry has location_id and rank attributes, matching the ORM model
    used by EvaluationRepository.get_with_ranking().
    """
    return SimpleNamespace(
        ranking=[
            SimpleNamespace(location_id=loc_id, rank=rank)
            for loc_id, rank in ranks_per_location.items()
        ]
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestComparisonService:
    """Unit tests for ComparisonService.compare().

    Reference: spec 2.1.6 §9 — GET /api/evaluations/{id}/comparison/{otherId}.
    """

    def test_compare_identical_rankings_spearman_1(self) -> None:
        """Spearman ρ = 1.0 when both runs produce exactly the same rank order.

        Reference: Spearman (1904) — identical rankings yield ρ = 1.
        All pairwise deltas must be 0; the result must contain one entry per location.
        """
        run_a = _make_fake_run({1: 1, 2: 2, 3: 3, 4: 4, 5: 5})
        run_b = _make_fake_run({1: 1, 2: 2, 3: 3, 4: 4, 5: 5})
        service = ComparisonService()

        result = service.compare(run_a, run_b)

        assert result.spearman_rho == pytest.approx(1.0, abs=1e-9)
        assert all(diff.delta == 0 for diff in result.pairwise_differences)
        assert len(result.pairwise_differences) == 5

    def test_compare_reversed_rankings_spearman_neg1(self) -> None:
        """Spearman ρ = -1.0 when one run is the complete reverse of the other.

        Reference: Spearman (1904) — perfectly inverse rankings yield ρ = -1.
        5 locations in run_b have the exact opposite order from run_a.
        """
        run_a = _make_fake_run({1: 1, 2: 2, 3: 3, 4: 4, 5: 5})
        run_b = _make_fake_run({1: 5, 2: 4, 3: 3, 4: 2, 5: 1})  # full reversal
        service = ComparisonService()

        result = service.compare(run_a, run_b)

        assert result.spearman_rho == pytest.approx(-1.0, abs=1e-9)

    def test_compare_returns_one_diff_per_common_location(self) -> None:
        """compare() returns differences only for location IDs present in both runs.

        run_a covers {1, 2, 3}, run_b covers {2, 3, 4}.  The intersection is {2, 3},
        so the result must contain exactly 2 PairwiseDifference entries.

        Delta is defined as abs(rank_a - rank_b):
          location 2: rank_a=2, rank_b=1 → delta=1
          location 3: rank_a=3, rank_b=2 → delta=1

        Edge case note: if < 2 common locations are found, scipy.stats.spearmanr
        returns NaN.  ComparisonService should propagate that as spearman_rho=float('nan')
        rather than raising.  This behaviour is tested implicitly here via the 2-item case
        which is well-defined.

        Reference: spec 2.1.6 §9 — intersection-based diff list.
        """
        run_a = _make_fake_run({1: 1, 2: 2, 3: 3})  # locations: 1, 2, 3
        run_b = _make_fake_run({2: 1, 3: 2, 4: 3})  # locations: 2, 3, 4
        service = ComparisonService()

        result = service.compare(run_a, run_b)

        # Only common locations appear in the diff list.
        assert len(result.pairwise_differences) == 2
        common_ids = {d.location_id for d in result.pairwise_differences}
        assert common_ids == {2, 3}

        # Verify field values for location 2.
        diff_loc2 = next(d for d in result.pairwise_differences if d.location_id == 2)
        assert diff_loc2.rank_a == 2
        assert diff_loc2.rank_b == 1
        assert diff_loc2.delta == 1
