"""Утиліти нормалізації для матриць рішень MCDM."""

from __future__ import annotations

import numpy as np


def vector_normalize(matrix: np.ndarray) -> np.ndarray:
    """Векторна нормалізація: ділення кожного елемента на евклідову норму стовпця.

    Стандартний метод нормалізації в класичному TOPSIS.
    """
    norms = np.linalg.norm(matrix, axis=0)
    safe_norms = np.where(norms == 0.0, 1.0, norms)
    return matrix / safe_norms


def minmax_normalize(matrix: np.ndarray) -> np.ndarray:
    """Мін-макс нормалізація: масштабування значень до діапазону [0, 1]."""
    col_min: np.ndarray = matrix.min(axis=0)
    col_max: np.ndarray = matrix.max(axis=0)
    col_range: np.ndarray = col_max - col_min
    safe_range: np.ndarray = np.where(col_range == 0.0, 1.0, col_range)
    return np.asarray((matrix - col_min) / safe_range)
