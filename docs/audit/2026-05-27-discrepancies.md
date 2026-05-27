# Backend vs Chapters 1-2 discrepancies (audit 2026-05-27)

Branch: `fix/backend-align-with-chapters-1-2`.

## A. Math kernel (mcdm/) vs Chapter 1

| # | File | Function / line | As in Chapter 1 | As in code (before audit) | Fix |
|---|---|---|---|---|---|
| A.1 | `app/backend/mcdm/monte_carlo.py` | `sensitivity_analysis` (return dict) | (1.17) `p_i(k) = (1/N) Σ_t 𝟙[r^(t)(a_i) ≤ k]` - cumulative top-k probability | Returned only per-rank `rank_freq`; cumulative `p_i(k)` was never computed. | New return key `top_k_freq: dict[int, np.ndarray]` computed as column-cumulative sum of `rank_freq` for `k_values = (1, 3, 5)` (kept configurable via kwarg). Two reference tests added against (1.17). |
| A.2 | `app/backend/mcdm/normalize.py` | `minmax_normalize` | Not present in subsection 1.2.3 (vector normalisation only). | Defined but never imported by `topsis.py`; only one test referenced it. | Removed function and its tests; vector normalisation per (1.10) is the single normalisation path. |

No discrepancy was found in the FAHP formulas (1.2)-(1.9) or in TOPSIS formulas (1.10)-(1.14). Variable names already match the textbook notation (`S_i`, `w`, `v`, `S^+`, `S^-`, `C*`).

## B. Orchestration (services/, schemas/, api/, db/) vs Chapter 2 / Appendix A

| # | File | Field / contract | As in Chapter 2 / Appendix A | As in code (before audit) | Fix |
|---|---|---|---|---|---|
| B.1 | `app/backend/schemas/sensitivity.py` | `ConfidenceInterval` fields | Appendix A.9: `{locationId, lower, upper}` | `{locationId, low, high}` | Renamed `low → lower`, `high → upper`. |
| B.2 | `app/backend/services/sensitivity_service.py` | `stability_matrix` JSON shape | Appendix A.9: `{locationId: {1: p, 3: p, 5: p}}` | `{location_name: [p(rank=1), …, p(rank=n)]}` | Service now consumes `top_k_freq` and emits the location-id keyed top-k map. |
| B.3 | `app/backend/services/sensitivity_service.py` | `confidence_intervals` scope | Subsection 2.3.3 + Appendix A.9: top-3 alternatives by mean C* only | All locations were emitted. | Result and persisted JSON truncated to `TOP_N_FOR_CONFIDENCE_INTERVALS = 3`. |
| B.4 | `app/backend/db/models/evaluation.py` | `evaluation_runs.execution_time_ms` | Appendix A.7: `NOT NULL, CHECK (> 0)` | `Integer, nullable=True`, no check | Column made non-nullable, `EvaluationService` clamps to ≥ 1 ms, Alembic 0003 adds the CHECK and backfills legacy NULL/zero values. |
| B.5 | `app/backend/db/models/evaluation.py` | `evaluation_runs.status` | Appendix A.7: `CHECK IN ('completed', 'failed')` | No constraint; service wrote `'done'` | Service writes `'completed'`; Alembic 0003 backfills `'done' → 'completed'` and adds the CHECK. |
| B.6 | `app/backend/db/models/decision_matrix.py` | Decision-matrix table name | Subsection 2.2.1, Appendix A.4: entity `CriterionValue`, table `criterion_values` | Table `location_criterion_values`; ORM class `LocationCriterionValue` | Alembic 0003 renames the table; ORM class renamed to `CriterionValue` and all callers updated. |

No internal contradictions were found between Chapter 1 and Chapter 2: Chapter 2 references formulas (1.x) by number and does not redefine them.

## C. Frontend cascade

The sensitivity payload change in (B.1)-(B.3) is part of the public API contract. The frontend was therefore updated in the same branch:

| File | Change |
|---|---|
| `app/frontend/src/types/api.d.ts` | `ConfidenceInterval` now exposes `lower`/`upper`; `SensitivityRead.stabilityMatrix` typed as `Record<locationId, Record<k, number>>`. |
| `app/frontend/src/features/sensitivity/StabilityHeatmap.tsx` | Columns are now `Top-1, Top-3, Top-5`; rows labelled by `nameByLocationId`. Tooltip shows `p_i(k)`. |
| `app/frontend/src/features/sensitivity/ConfidenceIntervalsChart.tsx` | `low/high → lower/upper` throughout (chart data, error bars, tooltip). |
| `app/frontend/src/features/sensitivity/useSensitivity.test.ts` | Mock body uses the new shapes. |
| `app/frontend/src/pages/SensitivityPage.tsx` | Page copy updated to "top-N" and references the new field names. |

## D. Items intentionally left as text questions (no code change)

None. The text was internally consistent within the scope of the audit (formulas (1.2)-(1.18) and entities 2.2.1-2.2.3).
