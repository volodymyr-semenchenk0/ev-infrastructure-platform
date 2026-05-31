"""Fuzzy Analytic Hierarchy Process – нечіткі вагові коефіцієнти критеріїв.

Ваги виводяться методом Buckley (1985): середнє геометричне рядків нечіткої
матриці парних порівнянь з центроїдною дефаззифікацією.
"""

from __future__ import annotations

import numpy as np

# Saaty Random Index table (n → RI) for CR computation.
# Source: Saaty (1980), Table 4.2, values for n=1..15. Mirrors the frontend
# RANDOM_INDEX table in features/calculate/consistency.ts.
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
    11: 1.51,
    12: 1.48,
    13: 1.56,
    14: 1.57,
    15: 1.59,
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


def fahp_weights(matrix: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Обчислити ваги критеріїв методом нечіткого AHP (Buckley, 1985).

    Середнє геометричне рядків нечіткої матриці з центроїдною дефаззифікацією
    (Center of Area). На відміну від екстент-аналізу Чанга, геометричне середнє
    не обнуляє домінованих критеріїв — усі ваги додатні й монотонні за
    пріоритетами.

    Args:
        matrix: Матриця парних порівнянь розміру (n, n, 3), де третя вісь –
                трійки (l, m, u) трикутного нечіткого числа.

    Returns:
        Кортеж (weights, fuzzy):
          weights – нормований крапковий вектор ваг розміру (n,), сума = 1;
          fuzzy – нечіткі трикутні ваги розміру (n, 3), рядки (l, m, u),
            нормовані тим самим множником, що й weights, тож кожна крапкова
            вага є центроїдом свого трикутника (weights == fuzzy.mean(axis=1))
            і виконується l_i ≤ weights_i ≤ u_i.

    Raises:
        ValueError: якщо CR > 0.1 (матриця не є консистентною).
    """
    # CR check on modal (middle) values; consistency is a property of the
    # judgments, independent of how weights are derived from them.
    cr = _consistency_ratio(matrix[:, :, 1])
    if cr > 0.1:
        raise ValueError(f"inconsistent matrix: CR={cr:.3f} > 0.10")

    # Row geometric mean z_i = (prod_j a_ij)^(1/n), elementwise over (l, m, u).
    n = matrix.shape[0]
    z = np.prod(matrix, axis=1) ** (1.0 / n)  # (n, 3)

    # Fuzzy weight w_i = z_i (x) (1/Su, 1/Sm, 1/Sl); the inverse of a TFN sum
    # reverses the bounds, so the upper sum normalises the lower component.
    s_l, s_m, s_u = z.sum(axis=0)
    w = z * np.array([1.0 / s_u, 1.0 / s_m, 1.0 / s_l])  # (n, 3)

    # Centroid defuzzification (l+m+u)/3, then normalise to sum 1.
    centroid = w.mean(axis=1)  # (n,)
    k = centroid.sum()
    weights: np.ndarray = centroid / k
    # Carry the fuzzy bounds through with the same scalar k so the crisp weight
    # stays the centroid of its triangle and l_i <= weights_i <= u_i holds.
    fuzzy: np.ndarray = w / k  # (n, 3)
    return weights, fuzzy
