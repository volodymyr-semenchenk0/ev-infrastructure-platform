# ADR-0001. FAHP/TOPSIS/MC intermediates are not exposed by the API

Date: 2026-05-27

## Status

Accepted (deferred), pending follow-up backend work outside the current iteration.

## Context

UI_PLAN §5.4.2-5.4.4 specifies that the fullscreen `/details` view shows the intermediate values of the math kernel:

- FAHP: synthetic extents `S_i = (l_i^S, m_i^S, u_i^S)` per formula (1.7), the pairwise possibility matrix `V(S_i >= S_k)` per (1.8), and the minimum-degree vector `d'(A_i)` per (1.9).
- TOPSIS: vector-normalised matrix `r_ij` per (1.10), weighted matrix `v_ij` per (1.11), positive/negative ideal solutions `A^+, A^-` per (1.12), and the per-alternative distances `S_i^+, S_i^-` per (1.13).
- Monte Carlo: the full top-k acceptability matrix `p_i(k)` for every `k`, not just the canonical `{1, 3, 5}` summary persisted in Appendix A.9; plus per-alternative histograms of `C_i^*` over the iteration stream.

The current backend response from `POST /api/evaluations` only returns the final weights vector, ranking with `C_i^*`, and `S^+/S^-` per alternative. `POST /api/evaluations/{id}/sensitivity` returns only the top-k summary for `k in {1, 3, 5}` plus 95 % CIs for the top-3, per the audit alignment with Appendix A.

UI_PLAN §9 explicitly forbids backend changes within the UI iteration ("Бекенд: API-роутери, схеми, mcdm-ядро – без змін у межах цієї ітерації").

## Decision

The fullscreen `/details` view ships with the data that the existing API already exposes:

- `#fahp`: final `w_j` (sorted desc), final `CR`, evaluation metadata.
- `#topsis`: full ranking table with `rank`, `C_i^*`, `S_i^+`, `S_i^-`.
- `#mc`: parameter echo, stability table for `k in {1, 3, 5}`, top-3 CIs.

Each section carries an inline note pointing here. The intermediate values listed above are **not** rendered until the backend exposes them.

A follow-up branch is required to expand the contract. Two options remain on the table for that follow-up:

- **Detail endpoints**: `POST /api/evaluations/{id}/details/fahp`, `.../topsis`, `.../mc` that recompute (or persist + return) the intermediates. Keeps the main evaluation endpoint stable.
- **Bigger evaluation payload**: extend `POST /api/evaluations` to optionally include `?detail=true`, returning intermediates inline. Simpler, but pollutes the standard path.

The pick will be made together with the backend owner when the iteration scope is reopened. Until then, `/details` is intentionally narrower than UI_PLAN §5.4.

## Consequences

- Reviewers see a smaller `/details` than the spec drew; the gap is visible in the UI itself.
- The math kernel is unchanged; tests for `mcdm/` remain authoritative.
- When the follow-up lands, the views can grow without breaking the rest of the workbench because the session store already keys all results by evaluationId.
