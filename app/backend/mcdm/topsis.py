"""TOPSIS – Technique for Order Preference by Similarity to Ideal Solution."""

from __future__ import annotations

import numpy as np

from mcdm.normalize import vector_normalize


def topsis_with_distances(
    decision_matrix: np.ndarray,
    weights: np.ndarray,
    types: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """TOPSIS повертає (scores, ranking, s_pos, s_neg) — для персистенції у БД.

    Окрема від topsis() функція для типобезпеки: 4-tuple замість 2-tuple,
    щоб виклики на кшталт `scores, ranking = topsis(...)` лишалися без змін.

    Args:
        decision_matrix: Матриця рішень розміру (m альтернатив × n критеріїв).
        weights: Вектор ваг критеріїв розміру (n,), сума = 1.
        types: Вектор типів критеріїв: 1 – максимізація, -1 – мінімізація.

    Returns:
        Кортеж (scores, ranking, s_pos, s_neg):
            scores  – значення відносної близькості Ci ∈ [0, 1];
            ranking – індекси альтернатив, відсортовані від кращої до гіршої;
            s_pos   – евклідова відстань до позитивно-ідеальної точки;
            s_neg   – евклідова відстань до антиідеальної точки.
    """
    r = vector_normalize(decision_matrix)
    v = r * weights

    v_pos = np.where(types == 1, v.max(axis=0), v.min(axis=0))
    v_neg = np.where(types == 1, v.min(axis=0), v.max(axis=0))

    s_pos = np.sqrt(((v - v_pos) ** 2).sum(axis=1))
    s_neg = np.sqrt(((v - v_neg) ** 2).sum(axis=1))

    denom = s_pos + s_neg
    # guard against 0/0 when all alternatives are identical
    scores = np.where(denom == 0.0, 0.5, s_neg / denom)

    ranking = np.argsort(scores)[::-1]
    return scores, ranking, s_pos, s_neg


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
    scores, ranking, _, _ = topsis_with_distances(decision_matrix, weights, types)
    return scores, ranking
