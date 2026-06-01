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

    `cstar` is the deterministic closeness coefficient C_i* of the base TOPSIS
    ranking (the interval centre), NOT a Monte Carlo average. The bounds are the
    2.5/97.5 percentiles of the accumulated C* sample (2.3.3), so the interval is
    generally asymmetric and `cstar` need not equal the midpoint. Field names
    match Appendix A.9 (`location_id`, `cstar`, `lower`, `upper`).
    """

    location_id: int
    cstar: float
    lower: float
    upper: float


class CstarHistogram(CamelModel):
    """C* distribution per location, bins auto-zoomed per location (Step 1 chart).

    Return-only: recomputed each request, never persisted. Both maps are keyed by
    location id. `edges_by_location[id]` holds that location's own bin edges
    (auto-zoomed to its C* range); `counts_by_location[id]` has
    len(edges_by_location[id]) - 1 entries summing to the iteration count N.
    """

    edges_by_location: dict[int, list[float]]
    counts_by_location: dict[int, list[int]]


class ConvergenceTrace(CamelModel):
    """Running mean of C* at log-spaced iteration checkpoints (Step 3 chart).

    Return-only. `iterations` is strictly increasing and ends at N; each
    `mean_by_location` series carries one value per checkpoint.
    """

    iterations: list[int]
    mean_by_location: dict[int, list[float]]


class SensitivityRead(CamelModel):
    """Aggregated Monte Carlo result.

    `stability_matrix[location_id][k]` is the acceptability index p_i(k) per
    formula (1.17) for k in STABILITY_K_VALUES. `confidence_intervals` lists
    the top-`TOP_N_FOR_CONFIDENCE_INTERVALS` alternatives ordered by the
    deterministic rank of the base ranking, not by Monte Carlo mean C*
    (Appendix A.9).

    The last three fields back the sensitivity storyline charts and are
    recomputed on every request — they are NOT persisted (Appendix A.9 keeps
    only stability_matrix and confidence_intervals). `ranking_intervals` carries
    the deterministic C* and 2.5/97.5 percentile band for ALL locations, ordered
    by deterministic rank best to worst (Step 2 forest-plot); `cstar_histogram`
    and `convergence` back Steps 1 and 3.
    """

    stability_matrix: dict[int, dict[int, float]]
    confidence_intervals: list[ConfidenceInterval]
    ranking_intervals: list[ConfidenceInterval]
    cstar_histogram: CstarHistogram
    convergence: ConvergenceTrace
