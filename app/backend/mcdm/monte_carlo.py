"""Аналіз чутливості вагових коефіцієнтів методом Монте-Карло."""

from __future__ import annotations

from collections.abc import Callable

import numpy as np


def sensitivity_analysis(
    decision_matrix: np.ndarray,
    base_weights: np.ndarray,
    types: np.ndarray,
    scorer: Callable[[np.ndarray, np.ndarray, np.ndarray], tuple[np.ndarray, np.ndarray]],
    *,
    n_simulations: int = 10_000,
    delta: float = 0.15,
    seed: int | None = 42,
) -> dict[str, np.ndarray]:
    """Монте-Карло аналіз стабільності рейтингу альтернатив.

    Args:
        decision_matrix: Матриця рішень (m × n).
        base_weights: Базові ваги критеріїв (n,), сума = 1.
        types: Типи критеріїв (1 – max, -1 – min).
        scorer: Функція-рейтингувальник, напр. topsis().
        n_simulations: Кількість ітерацій Монте-Карло.
        delta: Амплітуда рівномірного збурення ваг (ε ~ U(-delta, +delta)).
        seed: Зерно генератора псевдовипадкових чисел для відтворюваності.

    Returns:
        Словник з ключами:
            "scores_mean" – середні значення Ci по симуляціях;
            "scores_std"  – стандартне відхилення Ci;
            "rank_freq"   – матриця частот рангів (m × m),
                            rank_freq[rank_position, alt_idx] = кількість разів.
    """
    rng = np.random.default_rng(seed)
    n_alt = decision_matrix.shape[0]
    n_crit = len(base_weights)

    scores_all = np.zeros((n_simulations, n_alt))
    # rank_freq[rank_position, alt_idx] counts how often alt_idx landed at rank_position
    rank_freq = np.zeros((n_alt, n_alt), dtype=np.intp)

    for t in range(n_simulations):
        # (1.15) uniform perturbation
        eps = rng.uniform(-delta, delta, size=n_crit)
        w_tilde = base_weights * (1.0 + eps)
        # (1.16) renormalize to sum=1
        w_t = w_tilde / w_tilde.sum()

        scores, ranking = scorer(decision_matrix, w_t, types)
        scores_all[t] = scores

        # ranking[rank_pos] = alt_idx with that rank
        for rank_pos, alt_idx in enumerate(ranking.tolist()):
            rank_freq[rank_pos, alt_idx] += 1

    return {
        "scores_mean": scores_all.mean(axis=0),
        "scores_std": scores_all.std(axis=0),
        "rank_freq": rank_freq,
    }
