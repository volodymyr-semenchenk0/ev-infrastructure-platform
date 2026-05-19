"""Fuzzy Analytic Hierarchy Process – нечіткі вагові коефіцієнти критеріїв."""

from __future__ import annotations

import numpy as np

# Saaty Random Index table (n → RI) for CR computation.
# Source: Saaty (1980), values for n=1..10.
_RI: dict[int, float] = {
    1: 0.00,
    2: 0.00,
    3: 0.58,
    4: 0.90,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49,
}


def _consistency_ratio(modal: np.ndarray) -> float:
    """Compute CR for the crisp modal-value matrix.

    Uses column-normalization eigenvector approximation (Saaty, 1980).
    Returns 0.0 for n <= 2 (consistency guaranteed by definition).
    """
    n = modal.shape[0]
    if n <= 2:
        return 0.0
    col_sums = modal.sum(axis=0)
    w = (modal / col_sums).mean(axis=1)
    lambda_max = float(np.mean((modal @ w) / w))
    ci = (lambda_max - n) / (n - 1)
    ri = _RI.get(n, 1.49)
    return float(ci / ri)


def _degree_of_possibility(m2: np.ndarray, m1: np.ndarray) -> float:
    """V(M2 >= M1) for two TFN arrays [l, m, u] — Chang (1996) eq. (1.8)."""
    if m2[1] >= m1[1]:
        return 1.0
    if m1[0] >= m2[2]:
        return 0.0
    return float((m1[0] - m2[2]) / ((m2[1] - m2[2]) - (m1[1] - m1[0])))


def fahp_weights(matrix: np.ndarray) -> np.ndarray:
    """Обчислити ваги критеріїв методом нечіткого AHP (Chang, 1996 extent analysis).

    Args:
        matrix: Матриця парних порівнянь розміру (n, n, 3), де третя вісь –
                трійки (l, m, u) трикутного нечіткого числа.

    Returns:
        Нормований вектор ваг розміру (n,), сума = 1.

    Raises:
        ValueError: якщо CR > 0.1 (матриця не є консистентною).
    """
    n = matrix.shape[0]

    # CR check on modal (middle) values before fuzzy extent analysis
    cr = _consistency_ratio(matrix[:, :, 1])
    if cr > 0.1:
        raise ValueError(f"inconsistent matrix: CR={cr:.3f} > 0.10")

    # (1.7) fuzzy synthetic extent S_i
    row_sums = matrix.sum(axis=1)  # (n, 3): sum over columns j
    total = matrix.sum(axis=(0, 1))  # (3,): grand total [l, m, u]
    # TFN inverse: (l,m,u)^-1 = (1/u, 1/m, 1/l)
    inv_total = np.array([1.0 / total[2], 1.0 / total[1], 1.0 / total[0]])
    s = row_sums * inv_total  # (n, 3)

    # (1.8)+(1.9) d'(A_i) = min_{k≠i} V(S_i >= S_k)
    d_prime = np.zeros(n)
    for i in range(n):
        min_v = 1.0
        for k in range(n):
            if k != i:
                v = _degree_of_possibility(s[i], s[k])
                if v < min_v:
                    min_v = v
        d_prime[i] = min_v

    # (1.9) normalize; guard against all-zero (degenerate matrix)
    total_d = float(d_prime.sum())
    if total_d == 0.0:
        return np.full(n, 1.0 / n)
    weights: np.ndarray = d_prime / total_d
    return weights
