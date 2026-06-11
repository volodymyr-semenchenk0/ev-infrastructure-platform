"""Monte Carlo sensitivity analysis of MCDM weights (subsection 1.2.4)."""

from __future__ import annotations

from collections.abc import Callable
from typing import TypedDict

import numpy as np

# Chapter 2.3.3 fixes the acceptability index group sizes.
DEFAULT_K_VALUES: tuple[int, ...] = (1, 3, 5)

# Chapter 2.3.3 fixes 95 % confidence intervals as the 2.5/97.5 percentiles of
# the accumulated C* sample (a non-parametric band that, unlike a normal
# approximation, makes no symmetry assumption near rank-stability boundaries).
CI_LOWER_PERCENTILE: float = 2.5
CI_UPPER_PERCENTILE: float = 97.5

# bins auto-zoomed per alternative — axes are not comparable across alternatives.
HISTOGRAM_BINS: int = 30


class SensitivityResult(TypedDict):
    """Public return type of sensitivity_analysis (see formulas 1.15-1.17)."""

    scores_mean: np.ndarray
    scores_std: np.ndarray
    rank_freq: np.ndarray
    top_k_freq: dict[int, np.ndarray]
    ci_lower: np.ndarray
    ci_upper: np.ndarray
    hist_bin_edges: np.ndarray  # shape (m, HISTOGRAM_BINS + 1): per-alternative
    hist_counts: np.ndarray
    convergence_iterations: np.ndarray
    convergence_mean: np.ndarray


def _convergence_checkpoints(n: int) -> np.ndarray:
    """Log-spaced iteration indices for the running-mean convergence trace.

    Returns strictly increasing integers in [1, n], always including n so the
    running mean at the last checkpoint equals the full-sample mean. n < 10
    yields a single point (n,): too few iterations to show a meaningful curve.
    """
    if n < 10:
        return np.array([n], dtype=np.intp)
    # Log spacing keeps the early, fast-moving part of the curve legible on a
    # log x-axis without storing one point per iteration.
    points = np.unique(np.geomspace(1, n, num=20).astype(np.intp))
    if points[-1] != n:
        points = np.append(points, n)
    return points.astype(np.intp)


def sensitivity_analysis(
    decision_matrix: np.ndarray,
    base_weights: np.ndarray,
    types: np.ndarray,
    scorer: Callable[[np.ndarray, np.ndarray, np.ndarray], tuple[np.ndarray, np.ndarray]],
    *,
    n_simulations: int = 10_000,
    delta: float = 0.15,
    seed: int | None = 42,
    k_values: tuple[int, ...] = DEFAULT_K_VALUES,
) -> SensitivityResult:
    """Monte Carlo rank-stability analysis for an MCDM weight vector.

    Args:
        decision_matrix: Decision matrix (m alternatives x n criteria).
        base_weights: Nominal weight vector w (n,), sum = 1.
        types: Criterion optimisation types (1 - benefit, -1 - cost).
        scorer: Ranker callable with the signature of mcdm.topsis.topsis.
        n_simulations: Number of Monte Carlo iterations N.
        delta: Uniform perturbation amplitude per formula (1.15);
               eps_j ~ U(-delta, +delta).
        seed: Seed of np.random.default_rng for reproducibility.
        k_values: Top-k group sizes for the acceptability index p_i(k).
                  Chapter 2.3.3 fixes the canonical set to (1, 3, 5).

    Returns:
        Dict with keys:
            "scores_mean" - per-alternative mean of C_i* over iterations;
            "scores_std"  - per-alternative standard deviation of C_i*;
            "rank_freq"   - exact-rank count matrix (m x m); rank_freq[r, i]
                            counts how often alternative i landed at rank r
                            (0-indexed, row 0 = best);
            "top_k_freq"  - cumulative acceptability index per formula (1.17):
                            dict {k: array(m,)} where entry [i] is
                            (1/N) * sum_t 1[rank^(t)(a_i) <= k];
            "ci_lower"    - per-alternative 2.5 percentile of C_i* over
                            iterations (lower 95 % confidence bound, 2.3.3);
            "ci_upper"    - per-alternative 97.5 percentile of C_i* (upper
                            95 % confidence bound, 2.3.3);
            "hist_bin_edges" - per-alternative histogram bin edges, each row
                            auto-zoomed to that alternative's own C* range,
                            shape (m, HISTOGRAM_BINS + 1);
            "hist_counts" - per-alternative C* counts over those bins, shape
                            (m, HISTOGRAM_BINS); each row sums to n_simulations;
            "convergence_iterations" - log-spaced iteration checkpoints, shape
                            (C,), strictly increasing, last entry == n_simulations;
            "convergence_mean" - running mean of C_i* at each checkpoint, shape
                            (C, m); the last row equals scores_mean.
    """
    rng = np.random.default_rng(seed)
    n_alt = decision_matrix.shape[0]
    n_crit = len(base_weights)

    scores_all = np.zeros((n_simulations, n_alt))
    rank_freq = np.zeros((n_alt, n_alt), dtype=np.intp)

    for _t in range(n_simulations):
        eps = rng.uniform(-delta, delta, size=n_crit)
        w_tilde = base_weights * (1.0 + eps)
        w_t = w_tilde / w_tilde.sum()

        scores, ranking = scorer(decision_matrix, w_t, types)
        scores_all[_t] = scores

        for rank_pos, alt_idx in enumerate(ranking.tolist()):
            rank_freq[rank_pos, alt_idx] += 1

    # cum_rank[r, i] = iterations where alternative i achieved rank <= r+1 (0-indexed row).
    cum_rank = np.cumsum(rank_freq, axis=0)
    top_k_freq: dict[int, np.ndarray] = {
        k: cum_rank[min(k, n_alt) - 1, :].astype(np.float64) / n_simulations for k in k_values
    }

    ci_lower = np.percentile(scores_all, CI_LOWER_PERCENTILE, axis=0)
    ci_upper = np.percentile(scores_all, CI_UPPER_PERCENTILE, axis=0)

    # Step 1 chart: bins auto-zoomed to each alternative's own C* range so its
    # distribution fills the axis; counts per alternative sum to N.
    hist_bin_edges = np.empty((n_alt, HISTOGRAM_BINS + 1))
    hist_counts = np.empty((n_alt, HISTOGRAM_BINS), dtype=np.intp)
    for i in range(n_alt):
        hist_counts[i], hist_bin_edges[i] = np.histogram(scores_all[:, i], bins=HISTOGRAM_BINS)

    # Step 3 chart: running mean of C* at log-spaced checkpoints. cumsum keeps
    # this O(N) instead of recomputing each prefix mean.
    checkpoints = _convergence_checkpoints(n_simulations)
    cumulative = np.cumsum(scores_all, axis=0)
    convergence_mean = cumulative[checkpoints - 1] / checkpoints[:, np.newaxis]

    return SensitivityResult(
        scores_mean=scores_all.mean(axis=0),
        scores_std=scores_all.std(axis=0),
        rank_freq=rank_freq,
        top_k_freq=top_k_freq,
        ci_lower=ci_lower,
        ci_upper=ci_upper,
        hist_bin_edges=hist_bin_edges,
        hist_counts=hist_counts,
        convergence_iterations=checkpoints,
        convergence_mean=convergence_mean,
    )
