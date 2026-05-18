"""TOPSIS – Technique for Order Preference by Similarity to Ideal Solution."""

from __future__ import annotations

import numpy as np


def topsis(
    decision_matrix: np.ndarray,
    weights: np.ndarray,
    types: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """Класичний TOPSIS з векторною нормалізацією (Hwang & Yoon, 1981).

    Args:
        decision_matrix: Матриця рішень розміру (m альтернатив × n критеріїв).
        weights: Вектор ваг критеріїв розміру (n,), сума = 1.
        types: Вектор типів критеріїв: 1 – максимізація, -1 – мінімізація.

    Returns:
        Кортеж (scores, ranking):
            scores  – значення відносної близькості Ci ∈ [0, 1];
            ranking – індекси альтернатив, відсортовані від кращої до гіршої.
    """
    # TODO: реалізувати Hwang & Yoon (1981)
    raise NotImplementedError
