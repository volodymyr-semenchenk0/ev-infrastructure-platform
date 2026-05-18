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
    sigma: float = 0.05,
    seed: int | None = 42,
) -> dict[str, np.ndarray]:
    """Монте-Карло аналіз стабільності рейтингу альтернатив.

    Args:
        decision_matrix: Матриця рішень (m × n).
        base_weights: Базові ваги критеріїв (n,), сума = 1.
        types: Типи критеріїв (1 – max, -1 – min).
        scorer: Функція-рейтингувальник, напр. topsis().
        n_simulations: Кількість ітерацій Монте-Карло.
        sigma: Стандартне відхилення нормального збурення ваг.
        seed: Зерно генератора псевдовипадкових чисел для відтворюваності.

    Returns:
        Словник з ключами:
            "scores_mean" – середні значення Ci по симуляціях;
            "scores_std"  – стандартне відхилення Ci;
            "rank_freq"   – матриця частот рангів (m × m).
    """
    # TODO: нормальне збурення ваг → нормалізація → запуск scorer → агрегація
    raise NotImplementedError
