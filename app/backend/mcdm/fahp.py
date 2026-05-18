"""Fuzzy Analytic Hierarchy Process – нечіткі вагові коефіцієнти критеріїв."""

from __future__ import annotations

import numpy as np


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
    # TODO: реалізувати за Chang (1996) – синтез нечіткого ступеня переваги
    raise NotImplementedError
