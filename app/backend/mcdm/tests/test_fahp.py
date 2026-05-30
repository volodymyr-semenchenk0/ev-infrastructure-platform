"""Unit tests for mcdm.fahp (Buckley's geometric-mean Fuzzy AHP).

Reference: Buckley, J.J. (1985). Fuzzy hierarchical analysis. Fuzzy Sets and
Systems, 17(3), 233-247. Step-by-step algorithm: Kahraman (ed.) (2008), Fuzzy
Multi-Criteria Decision Making, §2.4, eqs. (9)-(10).

Input format: ndarray of shape (n, n, 3) where axis-2 holds (l, m, u) of each
triangular fuzzy number. The diagonal entries must be (1, 1, 1).
"""

from __future__ import annotations

import numpy as np

from mcdm.fahp import fahp_weights

# 3x3 identity-like matrix: all pairwise comparisons are (1,1,1).
# Buckley: each row geometric mean is (1,1,1), so fuzzy weights are equal and
# centroid-normalised weights = 1/3 each. This invariant holds for any method.
MATRIX_EQUAL = np.ones((3, 3, 3), dtype=float)

# Analytic 3x3 oracle (Saaty scale TFNs), C1 > C2 > C3.
# Row geometric means z_i = (prod_j a_ij)^(1/3) per (l,m,u):
#   z1 = (2.000000, 2.466212, 2.884499)
#   z2 = (0.793701, 1.000000, 1.259921)
#   z3 = (0.346681, 0.405480, 0.500000)
# Fuzzy weight w_i = z_i (x) (1/Su, 1/Sm, 1/Sl), centroid (l+m+u)/3, normalise:
#   -> [0.629498, 0.263186, 0.107315]  (sum = 1).
# Verified programmatically and by hand. This is the primary Buckley oracle;
# Kahraman §2.4 worked example is trapezoidal (4-tuples), not triangular, and
# leaves weights fuzzy, so it is not usable as a direct centroid oracle.
MATRIX_ANALYTIC = np.array(
    [
        [[1, 1, 1], [2, 3, 4], [4, 5, 6]],
        [[1 / 4, 1 / 3, 1 / 2], [1, 1, 1], [2, 3, 4]],
        [[1 / 6, 1 / 5, 1 / 4], [1 / 4, 1 / 3, 1 / 2], [1, 1, 1]],
    ],
    dtype=float,
)
ANALYTIC_EXPECTED = np.array([0.629498, 0.263186, 0.107315])

# 3x3 matrix where C1 clearly dominates C2 and C3.
# C1 vs C2: (5,7,9), C1 vs C3: (5,7,9), C2 vs C3: (1,1,1).
MATRIX_DOMINANT = np.array(
    [
        [[1, 1, 1], [5, 7, 9], [5, 7, 9]],
        [[1 / 9, 1 / 7, 1 / 5], [1, 1, 1], [1, 1, 1]],
        [[1 / 9, 1 / 7, 1 / 5], [1, 1, 1], [1, 1, 1]],
    ],
    dtype=float,
)

# Generic non-trivial 3x3 matrix used for sum-to-one and no-zero checks.
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

    Buckley: centroid-defuzzified fuzzy weights are normalised so their sum = 1.
    """
    weights = fahp_weights(MATRIX_GENERIC)
    assert abs(weights.sum() - 1.0) < 1e-9


def test_fahp_weights_equal_comparison() -> None:
    """Equal pairwise comparisons (all TFNs = (1,1,1)) yield uniform weights.

    Derivation (Buckley geometric mean):
      Row geometric mean z_i = (1,1,1) for every criterion.
      Sum S = (3,3,3); fuzzy weight w_i = (1,1,1) (x) (1/3,1/3,1/3) = (1/3,1/3,1/3).
      Centroid (l+m+u)/3 = 1/3 for each -> normalised = [1/3, 1/3, 1/3].
    """
    weights = fahp_weights(MATRIX_EQUAL)
    expected = np.full(3, 1 / 3)
    np.testing.assert_allclose(weights, expected, atol=1e-9)


def test_fahp_weights_analytic_oracle() -> None:
    """Analytic 3x3 oracle matches Buckley geometric-mean + centroid weights.

    Reference vector [0.629498, 0.263186, 0.107315], verified programmatically
    and by hand against the row geometric means above.
    """
    weights = fahp_weights(MATRIX_ANALYTIC)
    np.testing.assert_allclose(weights, ANALYTIC_EXPECTED, atol=1e-6)
    assert weights[0] > weights[1] > weights[2], "order must be C1 > C2 > C3"


def test_fahp_weights_no_zero_weights() -> None:
    """Buckley never assigns a zero weight to a consistent matrix.

    This is the structural advantage over Chang extent analysis, whose degree of
    possibility can drive dominated criteria to exactly zero.
    """
    for matrix in (MATRIX_ANALYTIC, MATRIX_GENERIC):
        weights = fahp_weights(matrix)
        assert (weights > 0.0).all(), "all weights must be strictly positive"


def test_fahp_weights_dominant_criterion() -> None:
    """When one criterion dominates, its weight must exceed all others."""
    weights = fahp_weights(MATRIX_DOMINANT)
    assert weights[0] > weights[1], "C1 weight must exceed C2"
    assert weights[0] > weights[2], "C1 weight must exceed C3"
