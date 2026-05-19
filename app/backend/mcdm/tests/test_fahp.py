"""Unit tests for mcdm.fahp (Fuzzy AHP extent analysis).

Reference: Chang, D-Y. (1996). Applications of the extent analysis method on
fuzzy AHP. European Journal of Operational Research, 95(3), 649-655.

Input format: ndarray of shape (n, n, 3) where axis-2 holds (l, m, u) of each
triangular fuzzy number. The diagonal entries must be (1, 1, 1).
"""

from __future__ import annotations

import numpy as np

from mcdm.fahp import fahp_weights

# 3×3 identity-like matrix: all pairwise comparisons are (1,1,1).
# By Chang (1996) extent analysis, fuzzy synthetic extents are equal for all
# criteria, so V(S_i >= S_j) = 1 for every pair, and normalised weights = 1/3 each.
MATRIX_EQUAL = np.ones((3, 3, 3), dtype=float)

# 3×3 matrix where C1 clearly dominates C2 and C3.
# C1 vs C2: (5,7,9), C1 vs C3: (5,7,9), C2 vs C3: (1,1,1).
# Chang (1996): when m_i >> m_j, V(S_i >= S_j) -> 1 and V(S_j >= S_i) -> 0,
# so the dominant criterion receives a weight close to 1.
MATRIX_DOMINANT = np.array(
    [
        [[1, 1, 1], [5, 7, 9], [5, 7, 9]],
        [[1 / 9, 1 / 7, 1 / 5], [1, 1, 1], [1, 1, 1]],
        [[1 / 9, 1 / 7, 1 / 5], [1, 1, 1], [1, 1, 1]],
    ],
    dtype=float,
)

# Generic non-trivial 3×3 matrix used only for sum-to-one check.
MATRIX_GENERIC = np.array(
    [
        [[1, 1, 1], [1, 2, 3], [2, 3, 4]],
        [[1 / 3, 1 / 2, 1], [1, 1, 1], [1, 2, 3]],
        [[1 / 4, 1 / 3, 1 / 2], [1 / 3, 1 / 2, 1], [1, 1, 1]],
    ],
    dtype=float,
)


def test_fahp_weights_sum_to_one() -> None:
    """Weight vector must sum to 1 regardless of input values.

    Chang (1996): the final step normalises d'(A_i) values so their sum = 1.
    """
    weights = fahp_weights(MATRIX_GENERIC)
    assert abs(weights.sum() - 1.0) < 1e-9


def test_fahp_weights_equal_comparison() -> None:
    """Equal pairwise comparisons (all TFNs = (1,1,1)) yield uniform weights.

    Derivation (Chang, 1996 extent analysis):
      Row sum for each criterion: l=3, m=3, u=3.
      Grand total: l=9, m=9, u=9.
      Fuzzy synthetic extent S_i = (3/9, 3/9, 3/9) = (1/3, 1/3, 1/3) for all i.
      V(S_i >= S_j) = 1 for all i,j (extents are identical).
      Unnormalised priority = [1, 1, 1] -> normalised = [1/3, 1/3, 1/3].
    """
    weights = fahp_weights(MATRIX_EQUAL)
    expected = np.full(3, 1 / 3)
    np.testing.assert_allclose(weights, expected, atol=1e-9)


def test_fahp_weights_dominant_criterion() -> None:
    """When one criterion dominates, its weight must exceed all others.

    Chang (1996): large TFN values for C1 vs C2/C3 produce V(S_1 >= S_2) = 1
    and V(S_2 >= S_1) near 0, concentrating weight on C1.
    """
    weights = fahp_weights(MATRIX_DOMINANT)
    assert weights[0] > weights[1], "C1 weight must exceed C2"
    assert weights[0] > weights[2], "C1 weight must exceed C3"
