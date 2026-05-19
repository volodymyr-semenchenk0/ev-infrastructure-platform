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
