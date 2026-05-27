"""Unit tests for mcdm.monte_carlo.sensitivity_analysis.

Key analytical guarantee (delta=0):
  When delta=0, every simulated weight vector equals base_weights exactly.
  Therefore all n_simulations runs produce the same TOPSIS ranking, so:
    - scores_mean  == deterministic topsis() scores
    - scores_std   == 0 for every alternative
    - rank_freq[i, deterministic_rank[i]] == n_simulations for every i

Reference: verification that Monte Carlo degenerates to a deterministic result
under zero perturbation is a standard sanity check in sensitivity analysis
literature (see e.g. Saltelli et al., 2000, Sensitivity Analysis in Practice).
"""

from __future__ import annotations

import numpy as np

from mcdm.monte_carlo import sensitivity_analysis
from mcdm.topsis import topsis

# 4-alternative × 3-criterion matrix from Hwang & Yoon (1981),
# consistent with test_topsis.py and test_normalize.py.
DM = np.array(
    [
        [25_000.0, 16.0, 8.0],
        [20_000.0, 20.0, 6.0],
        [15_000.0, 12.0, 7.0],
        [30_000.0, 10.0, 5.0],
    ]
)
WEIGHTS = np.array([0.4, 0.3, 0.3])
TYPES = np.array([-1, 1, 1])
N_ALT: int = DM.shape[0]
N_SIM = 500


def test_sensitivity_returns_required_keys() -> None:
    """Return value must contain 'scores_mean', 'scores_std', 'rank_freq'.

    These keys form the public contract of sensitivity_analysis().
    """
    result = sensitivity_analysis(DM, WEIGHTS, TYPES, topsis, n_simulations=N_SIM, delta=0.05)
    assert "scores_mean" in result
    assert "scores_std" in result
    assert "rank_freq" in result


def test_sensitivity_rank_freq_shape() -> None:
    """rank_freq must be a square matrix of shape (m, m) where m = #alternatives."""
    result = sensitivity_analysis(DM, WEIGHTS, TYPES, topsis, n_simulations=N_SIM, delta=0.05)
    assert result["rank_freq"].shape == (N_ALT, N_ALT)


def test_sensitivity_delta_zero_rank_matches_topsis() -> None:
    """With delta=0, all simulations are identical to deterministic TOPSIS.

    Expected behaviour once both functions are implemented:
      - scores_mean matches topsis() scores element-wise (atol=1e-9)
      - scores_std is zero for all alternatives
      - each alternative appears at the same rank in every simulation,
        so rank_freq[i, deterministic_rank[i]] == n_simulations for all i

    Currently both sensitivity_analysis() and topsis() raise NotImplementedError,
    so this test documents the intended contract and will pass after implementation.
    """
    det_scores, det_ranking = topsis(DM, WEIGHTS, TYPES)
    result = sensitivity_analysis(
        DM, WEIGHTS, TYPES, topsis, n_simulations=N_SIM, delta=0.0, seed=0
    )

    np.testing.assert_allclose(result["scores_mean"], det_scores, atol=1e-9)
    np.testing.assert_allclose(result["scores_std"], np.zeros(N_ALT), atol=1e-9)

    # rank_freq diagonal (per deterministic rank) must equal N_SIM
    for alt_idx, rank in enumerate(det_ranking.tolist()):
        assert result["rank_freq"][alt_idx, rank] == N_SIM


def test_sensitivity_top_k_acceptability_is_cumulative_top_k() -> None:
    """p_i(k) is the cumulative top-k probability per formula (1.17).

    With delta=0 every iteration produces the same TOPSIS ranking; the text's
    1-indexed rank r is the 0-indexed Python rank +1, so p_i(k) = 1 iff
    rank_python(i) < k and 0 otherwise. Boundary case k >= n_alt: p_i(k) = 1
    for every alternative.

    Reference: Lahdelma & Salminen (2001), formula (1.17) of subsection 1.2.4.
    """
    _, det_ranking = topsis(DM, WEIGHTS, TYPES)
    python_rank_of = {alt: r for r, alt in enumerate(det_ranking.tolist())}

    result = sensitivity_analysis(
        DM, WEIGHTS, TYPES, topsis, n_simulations=N_SIM, delta=0.0, seed=0
    )

    assert "top_k_freq" in result, "p_i(k) cumulative aggregate must be in the return dict"
    top_k = result["top_k_freq"]
    for k in (1, 3, 5):
        assert k in top_k, f"missing acceptability index for k={k}"
        for alt_idx in range(N_ALT):
            expected = 1.0 if python_rank_of[alt_idx] < k else 0.0
            actual = float(top_k[k][alt_idx])
            assert actual == expected, (
                f"alt={alt_idx} k={k}: got p_i(k)={actual}, expected {expected}"
            )


def test_sensitivity_top_k_acceptability_matches_rank_freq_cumsum() -> None:
    """p_i(k) equals the column-cumulative sum of rank_freq divided by N.

    From formula (1.17), p_i(k) = (1/N) sum_{t} 1[rank(a_i) <= k]. Because the
    raw rank_freq[r, i] is the per-iteration count at exact rank r, the
    cumulative top-k aggregate is sum_{r=0}^{k-1} rank_freq[r, i] / N. This
    invariant must hold regardless of delta. Uses delta=0.15 (the project
    default) to exercise a non-trivial rank distribution.

    Reference: Lahdelma & Salminen (2001), formula (1.17) of subsection 1.2.4.
    """
    result = sensitivity_analysis(
        DM, WEIGHTS, TYPES, topsis, n_simulations=N_SIM, delta=0.15, seed=0
    )
    rank_freq = result["rank_freq"]
    top_k = result["top_k_freq"]

    for k in (1, 3, 5):
        expected = rank_freq[: min(k, N_ALT), :].sum(axis=0) / N_SIM
        np.testing.assert_allclose(top_k[k], expected, atol=1e-12)
