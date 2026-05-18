"""Утиліти нормалізації для матриць рішень MCDM."""

from __future__ import annotations

import numpy as np


def vector_normalize(matrix: np.ndarray) -> np.ndarray:
    """Векторна нормалізація: ділення кожного елемента на евклідову норму стовпця.

    Стандартний метод нормалізації в класичному TOPSIS.
    """
    # TODO: np.linalg.norm по axis=0, захист від ділення на нуль
    raise NotImplementedError


def minmax_normalize(matrix: np.ndarray) -> np.ndarray:
    """Мін-макс нормалізація: масштабування значень до діапазону [0, 1]."""
    # TODO: (x - min) / (max - min) по кожному стовпцю
    raise NotImplementedError
