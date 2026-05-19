"""TOPSIS – Technique for Order Preference by Similarity to Ideal Solution."""

from __future__ import annotations

import numpy as np

from mcdm.normalize import vector_normalize


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
    # (1.10) vector normalization
    r = vector_normalize(decision_matrix)

    # (1.11) weighted normalized matrix
    v = r * weights

    # (1.12) ideal and anti-ideal solutions
    # benefit (types==1): ideal=max, anti-ideal=min
    # cost   (types==-1): ideal=min, anti-ideal=max
    v_pos = np.where(types == 1, v.max(axis=0), v.min(axis=0))
    v_neg = np.where(types == 1, v.min(axis=0), v.max(axis=0))

    # (1.13) Euclidean distances
    s_pos = np.sqrt(((v - v_pos) ** 2).sum(axis=1))
    s_neg = np.sqrt(((v - v_neg) ** 2).sum(axis=1))

    # (1.14) closeness coefficient; guard against 0/0 (all alternatives identical)
    denom = s_pos + s_neg
    scores = np.where(denom == 0.0, 0.5, s_neg / denom)

    # ranking: descending scores → best first
    ranking = np.argsort(scores)[::-1]
    return scores, ranking
