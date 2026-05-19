# MCDM Core Implementation Plan (TOPSIS + FAHP + Monte Carlo)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `topsis()`, `fahp_weights()`, and `sensitivity_analysis()` in `app/backend/mcdm/` so all 11 unit tests pass, ruff and mypy --strict are green.

**Architecture:** Three independent modules form a pipeline — FAHP produces weights, TOPSIS ranks alternatives, Monte Carlo perturbs weights N times and aggregates rank-frequency statistics. All math lives exclusively in `mcdm/`; each module is tested against reference numbers from its original publication.

**Tech Stack:** Python 3.11+, numpy 1.26+. No external MCDM libraries — formulas implemented directly from Chang (1996) and Hwang & Yoon (1981). Tests use `numpy.testing.assert_allclose`.

---

## Branching strategy

```
feat/mcdm-normalize  ←  current (already committed)
  └─ feat/mcdm-topsis      (Task 1)
       └─ feat/mcdm-fahp   (Task 2)
            └─ feat/mcdm-monte-carlo  (Task 3)
                 └─ merge all to master (Task 4, requires user approval)
```

Each task: checkout from the previous branch → implement → pass tests → commit.

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `app/backend/mcdm/topsis.py` | Modify | Implement `topsis()` — formulas (1.10)–(1.14) |
| `app/backend/mcdm/fahp.py` | Modify | Implement `fahp_weights()` — CR check + formulas (1.7)–(1.9) |
| `app/backend/mcdm/monte_carlo.py` | Modify | Implement `sensitivity_analysis()` — formulas (1.15)–(1.17) |
| `app/backend/mcdm/tests/test_topsis.py` | Read-only | 1 existing failing test — verify it passes after implementation |
| `app/backend/mcdm/tests/test_fahp.py` | Read-only | 3 existing failing tests — verify they pass |
| `app/backend/mcdm/tests/test_sensitivity.py` | Read-only | 3 existing failing tests — verify they pass |

---

## Task 1: Implement TOPSIS

**Branch:** `feat/mcdm-topsis` (from `feat/mcdm-normalize`)

**Files:**
- Modify: `app/backend/mcdm/topsis.py`
- Test: `app/backend/mcdm/tests/test_topsis.py`

### Formula reference (master.md, підрозділ 1.2.5)

```
(1.10) r_ij = x_ij / sqrt(Σ_k x_kj²)          vector normalize
(1.11) v_ij = w_j · r_ij                         weighted matrix
(1.12) v_j+ = max v_ij (benefit) / min (cost)    ideal
       v_j- = min v_ij (benefit) / max (cost)    anti-ideal
(1.13) S_i+ = sqrt(Σ_j (v_ij − v_j+)²)          dist to ideal
       S_i- = sqrt(Σ_j (v_ij − v_j-)²)           dist to anti-ideal
(1.14) C_i* = S_i- / (S_i+ + S_i-)               closeness coeff
       ranking: descending C_i*
```

- [ ] **Step 1.1: Create branch**

```bash
cd /path/to/ev-charging-dss
git checkout feat/mcdm-normalize
git checkout -b feat/mcdm-topsis
```

- [ ] **Step 1.2: Verify test currently fails**

```bash
cd app/backend
.venv/bin/pytest mcdm/tests/test_topsis.py -v
```

Expected: `FAILED mcdm/tests/test_topsis.py::test_topsis_best_alternative — NotImplementedError`

- [ ] **Step 1.3: Implement `topsis()`**

Replace the body of `app/backend/mcdm/topsis.py` with:

```python
"""TOPSIS – Technique for Order Preference by Similarity to Ideal Solution."""

from __future__ import annotations

import numpy as np

from mcdm.normalize import vector_normalize


def topsis(
    decision_matrix: np.ndarray,
    weights: np.ndarray,
    types: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """Класичний TOPSIS з векторною нормалізацією (Hwang & Yoon, 1981).

    Args:
        decision_matrix: Матриця рішень розміру (m альтернатив × n критеріїв).
        weights: Вектор ваг критеріїв розміру (n,), сума = 1.
        types: Вектор типів критеріїв: 1 – максимізація, -1 – мінімізація.

    Returns:
        Кортеж (scores, ranking):
            scores  – значення відносної близькості Ci ∈ [0, 1];
            ranking – індекси альтернатив, відсортовані від кращої до гіршої.
    """
    # (1.10) vector normalization
    r = vector_normalize(decision_matrix)

    # (1.11) weighted normalized matrix
    v = r * weights

    # (1.12) ideal and anti-ideal solutions
    # benefit (types==1): ideal=max, anti-ideal=min
    # cost   (types==-1): ideal=min, anti-ideal=max
    v_pos = np.where(types == 1, v.max(axis=0), v.min(axis=0))
    v_neg = np.where(types == 1, v.min(axis=0), v.max(axis=0))

    # (1.13) Euclidean distances
    s_pos = np.sqrt(((v - v_pos) ** 2).sum(axis=1))
    s_neg = np.sqrt(((v - v_neg) ** 2).sum(axis=1))

    # (1.14) closeness coefficient; guard against 0/0 (all alternatives identical)
    denom = s_pos + s_neg
    scores = np.where(denom == 0.0, 0.5, s_neg / denom)

    # ranking: descending scores → best first
    ranking = np.argsort(scores)[::-1]
    return scores, ranking
```

- [ ] **Step 1.4: Run tests**

```bash
cd app/backend
.venv/bin/pytest mcdm/tests/test_topsis.py mcdm/tests/test_normalize.py -v
```

Expected: all 5 tests pass.

- [ ] **Step 1.5: Run ruff and mypy**

```bash
cd app/backend
.venv/bin/ruff check mcdm/
.venv/bin/mypy mcdm/ --strict
```

Expected: no errors.

- [ ] **Step 1.6: Commit**

```bash
git add app/backend/mcdm/topsis.py
git commit -m "feat(mcdm): implement topsis with vector normalization (Hwang & Yoon, 1981)"
```

---

## Task 2: Implement FAHP

**Branch:** `feat/mcdm-fahp` (from `feat/mcdm-topsis`)

**Files:**
- Modify: `app/backend/mcdm/fahp.py`
- Test: `app/backend/mcdm/tests/test_fahp.py`

### Formula reference (master.md, підрозділ 1.2.4)

```
CR check (formula 1.2):
  modal_matrix = matrix[:,:,1]       # middle TFN values
  λ_max via normalized column eigenvector approximation
  CI = (λ_max − n) / (n − 1)
  CR = CI / RI[n];  RI table: {3:0.58, 4:0.90, 5:1.12, …}
  if CR > 0.1: raise ValueError

(1.7) S_i = row_sum_i ⊗ (total_sum)^{-1}
  row_sum_i = Σ_j ã_ij  (l,m,u each summed separately)
  total_sum^{-1} = (1/u_total, 1/m_total, 1/l_total)
  S_i = (l_i^row / u_total, m_i^row / m_total, u_i^row / l_total)

(1.8) V(M₂ ≥ M₁):
  = 1                                        if m₂ ≥ m₁
  = 0                                        if l₁ ≥ u₂
  = (l₁ − u₂) / ((m₂ − u₂) − (m₁ − l₁))   otherwise

(1.9) d'(A_i) = min_{k≠i} V(S_i ≥ S_k)
  w_i = d'(A_i) / Σ_l d'(A_l)
```

- [ ] **Step 2.1: Create branch**

```bash
git checkout feat/mcdm-topsis
git checkout -b feat/mcdm-fahp
```

- [ ] **Step 2.2: Verify tests fail**

```bash
cd app/backend
.venv/bin/pytest mcdm/tests/test_fahp.py -v
```

Expected: 3 tests FAILED with `NotImplementedError`.

- [ ] **Step 2.3: Implement `fahp_weights()`**

Replace the body of `app/backend/mcdm/fahp.py` with:

```python
"""Fuzzy Analytic Hierarchy Process – нечіткі вагові коефіцієнти критеріїв."""

from __future__ import annotations

import numpy as np

# Saaty Random Index table (n → RI) for CR computation.
# Source: Saaty (1980), values for n=1..10.
_RI: dict[int, float] = {
    1: 0.00, 2: 0.00, 3: 0.58, 4: 0.90, 5: 1.12,
    6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49,
}


def _consistency_ratio(modal: np.ndarray) -> float:
    """Compute CR for the crisp modal-value matrix.

    Uses column-normalization eigenvector approximation (Saaty, 1980).
    Returns 0.0 for n <= 2 (consistency guaranteed by definition).
    """
    n = modal.shape[0]
    if n <= 2:
        return 0.0
    col_sums = modal.sum(axis=0)
    w = (modal / col_sums).mean(axis=1)
    lambda_max = float(np.mean((modal @ w) / w))
    ci = (lambda_max - n) / (n - 1)
    ri = _RI.get(n, 1.49)
    return ci / ri


def _degree_of_possibility(m2: np.ndarray, m1: np.ndarray) -> float:
    """V(M2 >= M1) for two TFN arrays [l, m, u] — Chang (1996) eq. (1.8)."""
    if m2[1] >= m1[1]:
        return 1.0
    if m1[0] >= m2[2]:
        return 0.0
    return float((m1[0] - m2[2]) / ((m2[1] - m2[2]) - (m1[1] - m1[0])))


def fahp_weights(matrix: np.ndarray) -> np.ndarray:
    """Обчислити ваги критеріїв методом нечіткого AHP (Chang, 1996 extent analysis).

    Args:
        matrix: Матриця парних порівнянь розміру (n, n, 3), де третя вісь –
                трійки (l, m, u) трикутного нечіткого числа.

    Returns:
        Нормований вектор ваг розміру (n,), сума = 1.

    Raises:
        ValueError: якщо CR > 0.1 (матриця не є консистентною).
    """
    n = matrix.shape[0]

    # CR check on modal (middle) values before fuzzy extent analysis
    cr = _consistency_ratio(matrix[:, :, 1])
    if cr > 0.1:
        raise ValueError(f"inconsistent matrix: CR={cr:.3f} > 0.10")

    # (1.7) fuzzy synthetic extent S_i
    row_sums = matrix.sum(axis=1)          # (n, 3): sum over columns j
    total = matrix.sum(axis=(0, 1))        # (3,): grand total [l, m, u]
    # TFN inverse: (l,m,u)^-1 = (1/u, 1/m, 1/l)
    inv_total = np.array([1.0 / total[2], 1.0 / total[1], 1.0 / total[0]])
    s = row_sums * inv_total               # (n, 3)

    # (1.8)+(1.9) d'(A_i) = min_{k≠i} V(S_i >= S_k)
    d_prime = np.zeros(n)
    for i in range(n):
        min_v = 1.0
        for k in range(n):
            if k != i:
                v = _degree_of_possibility(s[i], s[k])
                if v < min_v:
                    min_v = v
        d_prime[i] = min_v

    # (1.9) normalize; guard against all-zero (degenerate matrix)
    total_d = d_prime.sum()
    if total_d == 0.0:
        return np.full(n, 1.0 / n)
    return d_prime / total_d
```

- [ ] **Step 2.4: Run tests**

```bash
cd app/backend
.venv/bin/pytest mcdm/tests/test_fahp.py mcdm/tests/test_topsis.py mcdm/tests/test_normalize.py -v
```

Expected: all 7 tests pass.

- [ ] **Step 2.5: Run ruff and mypy**

```bash
cd app/backend
.venv/bin/ruff check mcdm/
.venv/bin/mypy mcdm/ --strict
```

Expected: no errors.

- [ ] **Step 2.6: Commit**

```bash
git add app/backend/mcdm/fahp.py
git commit -m "feat(mcdm): implement fahp_weights with CR check and extent analysis (Chang, 1996)"
```

---

## Task 3: Implement Monte Carlo sensitivity analysis

**Branch:** `feat/mcdm-monte-carlo` (from `feat/mcdm-fahp`)

**Files:**
- Modify: `app/backend/mcdm/monte_carlo.py`
- Test: `app/backend/mcdm/tests/test_sensitivity.py`

### Formula reference (master.md, підрозділ 1.2.6)

```
(1.15) w̃_j^(t) = w_j · (1 + ε_j^(t)),  ε_j^(t) ~ U(−δ, +δ)
(1.16) w_j^(t) = w̃_j^(t) / Σ_k w̃_k^(t)
(1.17) p_i(k) = (1/N) · Σ_t 1[rank^(t)(a_i) ≤ k]

rank_freq[rank_position, alt_idx] = count across N simulations
  where rank_position 0 = best (highest C*)
```

Default parameters per Table 1.8: N=10_000, δ=0.15.

- [ ] **Step 3.1: Create branch**

```bash
git checkout feat/mcdm-fahp
git checkout -b feat/mcdm-monte-carlo
```

- [ ] **Step 3.2: Verify tests fail**

```bash
cd app/backend
.venv/bin/pytest mcdm/tests/test_sensitivity.py -v
```

Expected: 3 tests FAILED with `NotImplementedError`.

- [ ] **Step 3.3: Implement `sensitivity_analysis()`**

Replace the body of `app/backend/mcdm/monte_carlo.py` with:

```python
"""Аналіз чутливості вагових коефіцієнтів методом Монте-Карло."""

from __future__ import annotations

from collections.abc import Callable

import numpy as np


def sensitivity_analysis(
    decision_matrix: np.ndarray,
    base_weights: np.ndarray,
    types: np.ndarray,
    scorer: Callable[[np.ndarray, np.ndarray, np.ndarray], tuple[np.ndarray, np.ndarray]],
    *,
    n_simulations: int = 10_000,
    delta: float = 0.15,
    seed: int | None = 42,
) -> dict[str, np.ndarray]:
    """Монте-Карло аналіз стабільності рейтингу альтернатив.

    Args:
        decision_matrix: Матриця рішень (m × n).
        base_weights: Базові ваги критеріїв (n,), сума = 1.
        types: Типи критеріїв (1 – max, -1 – min).
        scorer: Функція-рейтингувальник, напр. topsis().
        n_simulations: Кількість ітерацій Монте-Карло.
        delta: Амплітуда рівномірного збурення ваг (ε ~ U(-delta, +delta)).
        seed: Зерно генератора псевдовипадкових чисел для відтворюваності.

    Returns:
        Словник з ключами:
            "scores_mean" – середні значення Ci по симуляціях;
            "scores_std"  – стандартне відхилення Ci;
            "rank_freq"   – матриця частот рангів (m × m),
                            rank_freq[rank_position, alt_idx] = кількість разів.
    """
    rng = np.random.default_rng(seed)
    n_alt = decision_matrix.shape[0]
    n_crit = len(base_weights)

    scores_all = np.zeros((n_simulations, n_alt))
    # rank_freq[rank_position, alt_idx] counts how often alt_idx landed at rank_position
    rank_freq = np.zeros((n_alt, n_alt), dtype=np.intp)

    for t in range(n_simulations):
        # (1.15) uniform perturbation
        eps = rng.uniform(-delta, delta, size=n_crit)
        w_tilde = base_weights * (1.0 + eps)
        # (1.16) renormalize to sum=1
        w_t = w_tilde / w_tilde.sum()

        scores, ranking = scorer(decision_matrix, w_t, types)
        scores_all[t] = scores

        # ranking[rank_pos] = alt_idx with that rank
        for rank_pos, alt_idx in enumerate(ranking.tolist()):
            rank_freq[rank_pos, alt_idx] += 1

    return {
        "scores_mean": scores_all.mean(axis=0),
        "scores_std": scores_all.std(axis=0),
        "rank_freq": rank_freq,
    }
```

- [ ] **Step 3.4: Run all mcdm tests**

```bash
cd app/backend
.venv/bin/pytest mcdm/tests/ -v
```

Expected: all 11 tests pass (`test_normalize` 4, `test_fahp` 3, `test_topsis` 1, `test_sensitivity` 3).

- [ ] **Step 3.5: Run ruff and mypy**

```bash
cd app/backend
.venv/bin/ruff check mcdm/
.venv/bin/mypy mcdm/ --strict
```

Expected: no errors.

- [ ] **Step 3.6: Commit**

```bash
git add app/backend/mcdm/monte_carlo.py
git commit -m "feat(mcdm): implement sensitivity_analysis with uniform MC perturbation (1.15)-(1.17)"
```

---

## Task 4: Merge to master (requires explicit user approval)

Before merging, verify all three conditions from CLAUDE.md:

- [ ] **Step 4.1: Run full quality check**

```bash
cd app/backend
.venv/bin/pytest mcdm/tests/ -v      # 11/11 must pass
.venv/bin/ruff check mcdm/           # zero errors
.venv/bin/mypy mcdm/ --strict        # zero errors
```

- [ ] **Step 4.2: Confirm uvicorn starts** *(optional for mcdm-only changes)*

```bash
cd app/backend
.venv/bin/uvicorn main:app --reload &
curl -s http://localhost:8000/api/docs | head -5
kill %1
```

- [ ] **Step 4.3: Wait for explicit user approval**

User must say «можна мерджити» or «merge».

- [ ] **Step 4.4: Merge sequence**

```bash
# Merge monte-carlo into master
git checkout master
git merge --no-ff feat/mcdm-monte-carlo -m "feat(mcdm): FAHP + TOPSIS + Monte Carlo core implementation"
```

---

## Self-review

**Spec coverage:**
- `topsis()` formulas (1.10)–(1.14) → Task 1 ✓
- `fahp_weights()` CR check + (1.7)–(1.9) → Task 2 ✓
- `sensitivity_analysis()` (1.15)–(1.17) + δ rename → Task 3 ✓
- All 11 tests green → Tasks 1–3 ✓
- ruff + mypy --strict → Steps 1.5, 2.5, 3.5 ✓
- Branch-per-module strategy → Tasks 1–3 ✓
- Merge gate → Task 4 ✓

**Placeholder scan:** None found — all steps contain exact commands and full code.

**Type consistency:**
- `topsis()` signature: `(np.ndarray, np.ndarray, np.ndarray) → tuple[np.ndarray, np.ndarray]` — matches `scorer` type in `monte_carlo.py` ✓
- `fahp_weights()` returns `np.ndarray` of shape `(n,)` — consistent with `base_weights` expected shape ✓
- `rank_freq` dtype `np.intp` — integer counts, shape `(n_alt, n_alt)` — matches test assertion `== N_SIM` ✓
