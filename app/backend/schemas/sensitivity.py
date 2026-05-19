"""DTOs for Monte-Carlo sensitivity analysis (spec 2.1.6 §8)."""

from __future__ import annotations

from pydantic import Field

from schemas.base import CamelModel

DEFAULT_ITERATIONS: int = 10_000
DEFAULT_PERTURBATION: float = 0.15


class SensitivityRequest(CamelModel):
    """POST /api/evaluations/{id}/sensitivity — MC parameters."""

    iterations: int = Field(default=DEFAULT_ITERATIONS, ge=100, le=100_000)
    perturbation: float = Field(default=DEFAULT_PERTURBATION, gt=0.0, le=0.5)


class ConfidenceInterval(CamelModel):
    """95 % CI for the closeness coefficient of one location."""

    location_id: int
    low: float
    high: float


class SensitivityRead(CamelModel):
    """Aggregated Monte-Carlo result: rank-stability matrix + CIs."""

    stability_matrix: dict[str, list[float]]
    confidence_intervals: list[ConfidenceInterval]
