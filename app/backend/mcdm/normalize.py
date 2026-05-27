"""Normalisation utilities for MCDM decision matrices.

Subsection 1.2.3 fixes vector normalisation as the canonical TOPSIS scheme.
Alternative schemes (min-max, linear) are not part of the coursework and are
intentionally absent here to keep one normalisation path through the pipeline.
"""

from __future__ import annotations

import numpy as np


def vector_normalize(matrix: np.ndarray) -> np.ndarray:
    """Vector normalisation per formula (1.10).

    r_ij = x_ij / sqrt(sum_k x_kj^2). Zero-norm columns are passed through
    unchanged so that an all-zero criterion column does not propagate NaN.
    """
    norms = np.linalg.norm(matrix, axis=0)
    safe_norms = np.where(norms == 0.0, 1.0, norms)
    return matrix / safe_norms
