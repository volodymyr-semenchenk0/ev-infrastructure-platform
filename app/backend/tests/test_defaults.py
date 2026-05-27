"""Unit tests for db/defaults.py — default pairwise matrix Ã per profile.

Defaults live in code (UI_PLAN §4 fallback contract): the API builds the
matrix on every request, so these tests do not touch the DB at all.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from db.defaults import (
    PAIRWISE_PRIORITIES,
    build_default_pairwise_matrix,
    m_to_tfn,
    snap_to_saaty,
)


# ---------------------------------------------------------------------------
# Stand-in for the Criterion ORM model — keeps these unit tests DB-free.
# ---------------------------------------------------------------------------
@dataclass
class _StubCriterion:
    id: int
    code: str


EXPECTED_CRITERION_CODES = [
    "Pop_dens",
    "Traffic",
    "Grid_cap",
    "Dist_sub",
    "Revenue",
    "Land_cost",
    "Parking",
    "Income",
    "Green",
    "Env_qual",
]


def _criteria() -> list[_StubCriterion]:
    """Return the 10 seeded criteria in id order (matches seed_reference_data)."""
    return [_StubCriterion(id=i + 1, code=code) for i, code in enumerate(EXPECTED_CRITERION_CODES)]


def _compute_cr(modal_matrix: np.ndarray) -> float:
    """Saaty column-mean λ_max approximation, matching the frontend consistency.ts.

    Verifies that the generated default matrix is consistent enough for FAHP
    without breaking through the CR <= 0.10 threshold.
    """
    n = modal_matrix.shape[0]
    if n < 2:
        return 0.0
    col_sums = modal_matrix.sum(axis=0)
    normalised = modal_matrix / col_sums
    weights = normalised.mean(axis=1)
    aw = modal_matrix @ weights
    lambda_max = float(np.mean(aw / weights))
    ci = (lambda_max - n) / (n - 1)
    random_index = {
        3: 0.58,
        4: 0.90,
        5: 1.12,
        6: 1.24,
        7: 1.32,
        8: 1.41,
        9: 1.45,
        10: 1.49,
    }
    ri = random_index.get(n, 1.49)
    if ri == 0:
        return 0.0
    cr = ci / ri
    return max(cr, 0.0)


class TestSnapToSaaty:
    """Pure-function checks on the Saaty snap helper."""

    def test_exact_saaty_values_round_trip(self) -> None:
        for value in (1 / 9, 1 / 7, 1 / 5, 1 / 3, 1.0, 3.0, 5.0, 7.0, 9.0):
            assert snap_to_saaty(value) == value

    def test_intermediate_ratio_snaps_on_log_scale(self) -> None:
        # 2.0 is closer to 3 than to 1 on a log scale: log(2)=0.693 vs midpoint
        # of log(1)/log(3) = 0.549.
        assert snap_to_saaty(2.0) == 3.0
        # 1.2 lies below the midpoint, so it snaps down to 1.
        assert snap_to_saaty(1.2) == 1.0

    def test_inverse_ratios_snap_symmetrically(self) -> None:
        assert snap_to_saaty(1.0 / 2.0) == 1.0 / 3.0
        assert snap_to_saaty(1.0 / 9.0) == 1.0 / 9.0


class TestMToTfn:
    """Bounds match the frontend mToTfn helper for the Saaty domain."""

    def test_one_is_crisp(self) -> None:
        assert m_to_tfn(1.0) == (1.0, 1.0, 1.0)

    def test_integer_saaty_values(self) -> None:
        assert m_to_tfn(3.0) == (2.0, 3.0, 4.0)
        assert m_to_tfn(5.0) == (4.0, 5.0, 6.0)
        # 9 + 1 clamps to the upper Saaty bound.
        assert m_to_tfn(9.0) == (8.0, 9.0, 9.0)

    def test_reciprocal_inversion(self) -> None:
        l, m, u = m_to_tfn(1.0 / 3.0)
        assert m == 1.0 / 3.0
        assert l == 1.0 / 4.0
        assert u == 1.0 / 2.0


class TestBuildDefaultPairwiseMatrix:
    """Verify the on-the-fly matrix builder used by GET /api/profiles/{id}."""

    def test_unknown_profile_returns_none(self) -> None:
        assert build_default_pairwise_matrix("unknown", _criteria()) is None

    def test_empty_criteria_returns_none(self) -> None:
        assert build_default_pairwise_matrix("municipal", []) is None

    def test_matrix_has_correct_shape_and_diagonal(self) -> None:
        matrix = build_default_pairwise_matrix("municipal", _criteria())
        assert matrix is not None
        assert len(matrix) == 10
        for i, row in enumerate(matrix):
            assert len(row) == 10
            cell = row[i]
            assert (cell.l, cell.m, cell.u) == (1.0, 1.0, 1.0), (
                f"Diagonal [{i}][{i}] must be crisp 1, got ({cell.l}, {cell.m}, {cell.u})"
            )

    def test_off_diagonal_is_reciprocal(self) -> None:
        matrix = build_default_pairwise_matrix("municipal", _criteria())
        assert matrix is not None
        # municipal: Pop_dens=9, Traffic=5 → ratio 1.8 snaps to 3 → TFN (2, 3, 4)
        m01 = matrix[0][1]
        assert (m01.l, m01.m, m01.u) == (2.0, 3.0, 4.0)
        # Reciprocal in lower triangle: (1/4, 1/3, 1/2)
        m10 = matrix[1][0]
        assert m10.l == 1.0 / 4.0
        assert m10.m == 1.0 / 3.0
        assert m10.u == 1.0 / 2.0

    def test_priorities_table_covers_both_seeded_profiles(self) -> None:
        assert set(PAIRWISE_PRIORITIES.keys()) == {"municipal", "investor"}
        for profile_code, priorities in PAIRWISE_PRIORITIES.items():
            assert len(priorities) == 10, (
                f"Profile {profile_code} priorities must cover all 10 criteria"
            )

    def test_each_profile_default_satisfies_cr_threshold(self) -> None:
        """Both default matrices must pass the FAHP CR <= 0.10 gate.

        Otherwise the workbench's «Обчислити ваги» button refuses to run on
        a fresh default.
        """
        for profile_code in PAIRWISE_PRIORITIES:
            matrix = build_default_pairwise_matrix(profile_code, _criteria())
            assert matrix is not None
            modal = np.array(
                [[cell.m for cell in row] for row in matrix],
                dtype=float,
            )
            cr = _compute_cr(modal)
            assert cr <= 0.10, (
                f"Profile {profile_code}: CR={cr:.4f} exceeds 0.10 — redesign PAIRWISE_PRIORITIES."
            )
