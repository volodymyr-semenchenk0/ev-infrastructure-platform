"""Unit tests for mcdm.normalize.

Reference: Hwang, C.L. & Yoon, K. (1981). Multiple Attribute Decision Making:
Methods and Applications. Springer, Berlin.

Uses the same 4-alternative × 3-criterion decision matrix as test_topsis.py
to keep all reference data consistent across the test suite.

Column 1 of DM has an integer Euclidean norm (sqrt(900) = 30), which allows
exact verification without floating-point tolerance inflation.
"""

from __future__ import annotations

import numpy as np

from mcdm.normalize import minmax_normalize, vector_normalize

# 4-alternative × 3-criterion matrix from Hwang & Yoon (1981).
# Criteria: price (min), fuel economy (max), service score (max).
DM = np.array(
    [
        [25_000.0, 16.0, 8.0],  # A1
        [20_000.0, 20.0, 6.0],  # A2
        [15_000.0, 12.0, 7.0],  # A3
        [30_000.0, 10.0, 5.0],  # A4
    ]
)


def test_vector_normalize_unit_columns() -> None:
    """Each column of the normalised matrix must have unit Euclidean norm.

    Hwang & Yoon (1981) define r_ij = x_ij / sqrt(sum_i x_ij^2), so by
    construction ||col_j||_2 = 1 for every j.
    """
    result = vector_normalize(DM)
    col_norms = np.linalg.norm(result, axis=0)
    np.testing.assert_allclose(col_norms, np.ones(DM.shape[1]), atol=1e-9)


def test_vector_normalize_exact_column() -> None:
    """Column 1 normalized values match the exact analytical result.

    Column 1 = [16, 20, 12, 10].
    norm = sqrt(256 + 400 + 144 + 100) = sqrt(900) = 30  (integer — no rounding).
    Expected normalised column: [16/30, 20/30, 12/30, 10/30].
    """
    result = vector_normalize(DM)
    expected = np.array([16 / 30, 20 / 30, 12 / 30, 10 / 30])
    np.testing.assert_allclose(result[:, 1], expected, atol=1e-12)


def test_minmax_normalize_endpoints() -> None:
    """Column min maps to 0 and column max maps to 1 after min-max scaling.

    Min-max formula: r_ij = (x_ij - min_j) / (max_j - min_j).
    """
    result = minmax_normalize(DM)
    np.testing.assert_allclose(result.min(axis=0), np.zeros(DM.shape[1]), atol=1e-9)
    np.testing.assert_allclose(result.max(axis=0), np.ones(DM.shape[1]), atol=1e-9)


def test_minmax_normalize_values() -> None:
    """Specific cell values match hand-computed min-max scaling.

    Column 0 (price): min=15000, max=30000.
    A1 (25000): (25000 - 15000) / (30000 - 15000) = 10000/15000 = 2/3.
    A3 (15000) → 0, A4 (30000) → 1.
    """
    result = minmax_normalize(DM)
    assert result.shape == DM.shape
    np.testing.assert_allclose(result[0, 0], 2 / 3, atol=1e-9)  # A1 price
    np.testing.assert_allclose(result[2, 0], 0.0, atol=1e-9)  # A3 price (min)
    np.testing.assert_allclose(result[3, 0], 1.0, atol=1e-9)  # A4 price (max)
