"""DTOs for Monte Carlo sensitivity analysis (subsection 2.3.3, Appendix A.9)."""

from __future__ import annotations

from pydantic import Field

from schemas.base import CamelModel

DEFAULT_ITERATIONS: int = 10_000
DEFAULT_PERTURBATION: float = 0.15

# Chapter 2.3.3 fixes acceptability index group sizes; Appendix A persists
# p_i(k) for exactly these k.
STABILITY_K_VALUES: tuple[int, ...] = (1, 3, 5)
# Chapter 2.3.3 + Appendix A.9 specify CIs for the top-3 alternatives only.
TOP_N_FOR_CONFIDENCE_INTERVALS: int = 3


class SensitivityRequest(CamelModel):
    """POST /api/evaluations/{id}/sensitivity request body."""

    iterations: int = Field(default=DEFAULT_ITERATIONS, ge=100, le=100_000)
    perturbation: float = Field(default=DEFAULT_PERTURBATION, gt=0.0, le=0.5)


class ConfidenceInterval(CamelModel):
    """95 % confidence interval for the closeness coefficient of one location.

    Bounds are the 2.5/97.5 percentiles of the accumulated C* sample (2.3.3),
    so the interval is generally asymmetric and `mean` does not equal the
    midpoint. `mean` is the per-alternative average C* that orders the top-N
    (Appendix A.9). Field names match Appendix A.9 (`mean`, `lower`, `upper`).
    """

    location_id: int
    mean: float
    lower: float
    upper: float


class SensitivityRead(CamelModel):
    """Aggregated Monte Carlo result.

    `stability_matrix[location_id][k]` is the acceptability index p_i(k) per
    formula (1.17) for k in STABILITY_K_VALUES. `confidence_intervals` lists
    the top-`TOP_N_FOR_CONFIDENCE_INTERVALS` alternatives ordered by mean C*
    descending (Appendix A.9).
    """

    stability_matrix: dict[int, dict[int, float]]
    confidence_intervals: list[ConfidenceInterval]
