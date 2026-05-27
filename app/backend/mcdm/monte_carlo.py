"""Monte Carlo sensitivity analysis of MCDM weights (subsection 1.2.4)."""

from __future__ import annotations

from collections.abc import Callable
from typing import TypedDict

import numpy as np

# Chapter 2.3.3 fixes the acceptability index group sizes.
DEFAULT_K_VALUES: tuple[int, ...] = (1, 3, 5)


class SensitivityResult(TypedDict):
    """Public return type of sensitivity_analysis (see formulas 1.15-1.17)."""

    scores_mean: np.ndarray
    scores_std: np.ndarray
    rank_freq: np.ndarray
    top_k_freq: dict[int, np.ndarray]


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
                            (1/N) * sum_t 1[rank^(t)(a_i) <= k].
    """
    rng = np.random.default_rng(seed)
    n_alt = decision_matrix.shape[0]
    n_crit = len(base_weights)

    scores_all = np.zeros((n_simulations, n_alt))
    # rank_freq[rank_position, alt_idx] counts how often alt_idx landed at rank_position.
    rank_freq = np.zeros((n_alt, n_alt), dtype=np.intp)

    for _t in range(n_simulations):
        # (1.15) uniform perturbation
        eps = rng.uniform(-delta, delta, size=n_crit)
        w_tilde = base_weights * (1.0 + eps)
        # (1.16) renormalize to sum=1
        w_t = w_tilde / w_tilde.sum()

        scores, ranking = scorer(decision_matrix, w_t, types)
        scores_all[_t] = scores

        # ranking[rank_pos] = alt_idx with that rank
        for rank_pos, alt_idx in enumerate(ranking.tolist()):
            rank_freq[rank_pos, alt_idx] += 1

    # (1.17) cumulative top-k acceptability index: cumsum over exact-rank rows.
    # cum_rank[r, i] = number of iterations alternative i achieved rank <= r+1.
    cum_rank = np.cumsum(rank_freq, axis=0)
    top_k_freq: dict[int, np.ndarray] = {
        k: cum_rank[min(k, n_alt) - 1, :].astype(np.float64) / n_simulations for k in k_values
    }

    return SensitivityResult(
        scores_mean=scores_all.mean(axis=0),
        scores_std=scores_all.std(axis=0),
        rank_freq=rank_freq,
        top_k_freq=top_k_freq,
    )
