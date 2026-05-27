# Formula snapshot from Chapter 1 (subsection 1.2)

Source of truth: `docs/chapter1/1_2_1.md` … `docs/chapter1/1_2_5.md`.
Scope: formulas (1.2)–(1.18) used in the math kernel of the system (FAHP, TOPSIS, sensitivity, Monte Carlo).
LaTeX below is reproduced verbatim from the text; tag numbers match the `\tag{…}` macros in the source.

| ID | Subsection | LaTeX (verbatim) | Inputs (types) | Output | Target file in `mcdm/` | BibTeX (as cited around the formula) |
|---|---|---|---|---|---|---|
| (1.2) | 1.2.1 | `CR = \frac{CI}{RI} = \frac{\lambda_{\max} - m}{(m - 1) \cdot RI}` | crisp pairwise comparison matrix (size $m\times m$, modal values $m_{ij}$); $RI$ table by Saaty | $CR\in[0,1]$, matrix admissible if $CR\leq 0{,}10$ | `fahp.py` (consistency precheck on modal matrix) | `saaty_analytic_2022` |
| (1.3) | 1.2.2 | `\mu_M(x) = \begin{cases} 0, & x < l, \\ (x - l) / (m - l), & l \leq x \leq m, \\ (u - x) / (u - m), & m \leq x \leq u, \\ 0, & x > u, \end{cases}` | TFN $M=(l,m,u)$ with $l\le m\le u$ | membership function $\mu_M(x)\in[0,1]$ | `fahp.py` (definitional, not directly invoked) | `kahraman_fuzzy_2008` |
| (1.4) | 1.2.2 | `M_1 \oplus M_2 = (l_1 + l_2, \; m_1 + m_2, \; u_1 + u_2)` | TFNs $M_1, M_2$ | fuzzy sum (exact) | `fahp.py` | `chang_applications_1996; kahraman_fuzzy_2008` |
| (1.5) | 1.2.2 | `M_1 \otimes M_2 \approx (l_1 l_2, \; m_1 m_2, \; u_1 u_2)` | TFNs $M_1, M_2$ | fuzzy product (approximate, preserves TFN closure) | `fahp.py` | `chang_applications_1996; kahraman_fuzzy_2008` |
| (1.6) | 1.2.2 | `M^{-1} \approx \left( \frac{1}{u}, \; \frac{1}{m}, \; \frac{1}{l} \right)` | TFN $M=(l,m,u)$ | reciprocal TFN (approximate) | `fahp.py` | `chang_applications_1996; kahraman_fuzzy_2008` |
| (1.7) | 1.2.2 | `S_i = \sum_{j=1}^{m} \tilde{a}_{ij} \otimes \left[ \sum_{k=1}^{m} \sum_{j=1}^{m} \tilde{a}_{kj} \right]^{-1}` | TFN pairwise matrix $\tilde{A}=[\tilde{a}_{ij}]_{m\times m}$ | fuzzy synthetic extent $S_i=(l_i^S, m_i^S, u_i^S)$ per criterion | `fahp.py` | `chang_applications_1996` |
| (1.8) | 1.2.2 | `V(M_2 \geq M_1) = \begin{cases} 1, & m_2 \geq m_1, \\ 0, & l_1 \geq u_2, \\ \dfrac{l_1 - u_2}{(m_2 - u_2) - (m_1 - l_1)}, & \text{в інших випадках}, \end{cases}` | two TFNs $M_1=(l_1,m_1,u_1)$, $M_2=(l_2,m_2,u_2)$ | degree of possibility $V(M_2\geq M_1)\in[0,1]$ | `fahp.py` (`_degree_of_possibility`) | `chang_applications_1996` |
| (1.9) | 1.2.2 | `d'(A_i) = \min_{k = 1, \ldots, m; \; k \neq i} V(S_i \geq S_k), \qquad w_i = \frac{d'(A_i)}{\sum_{l=1}^{m} d'(A_l)}` | extents $S_1,\dots,S_m$ | weight vector $w$ with $\sum w_i = 1$ | `fahp.py` (`fahp_weights`) | `chang_applications_1996` |
| (1.10) | 1.2.3 | `r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{k=1}^{n} x_{kj}^2}}` | decision matrix $X\in\mathbb{R}^{n\times m}$ | vector-normalized $R=[r_{ij}]$, each column has unit Euclidean norm | `normalize.py::vector_normalize` (consumed by `topsis.py`) | `hwang_multiple_2012` |
| (1.11) | 1.2.3 | `v_{ij} = w_j \, r_{ij}` | $R$ from (1.10), weights $w$ from (1.9) | weighted normalized matrix $V=[v_{ij}]$ | `topsis.py` | `hwang_multiple_2012` |
| (1.12) | 1.2.3 | `\begin{aligned} A^+ &= \{v_1^+, v_2^+, \ldots, v_m^+\}, \quad v_j^+ = \begin{cases} \max\limits_{i} v_{ij}, & j \in J_{\max}, \\ \min\limits_{i} v_{ij}, & j \in J_{\min}, \end{cases} \\ A^- &= \{v_1^-, v_2^-, \ldots, v_m^-\}, \quad v_j^- = \begin{cases} \min\limits_{i} v_{ij}, & j \in J_{\max}, \\ \max\limits_{i} v_{ij}, & j \in J_{\min}, \end{cases} \end{aligned}` | $V$, sets of benefit/cost criteria $J_{\max}, J_{\min}$ | PIS $A^+$, NIS $A^-$ (vectors of length $m$) | `topsis.py` | `hwang_multiple_2012` |
| (1.13) | 1.2.3 | `S_i^+ = \sqrt{\sum_{j=1}^{m} (v_{ij} - v_j^+)^2}, \qquad S_i^- = \sqrt{\sum_{j=1}^{m} (v_{ij} - v_j^-)^2}` | $V$, $A^+$, $A^-$ | Euclidean distances $S_i^+, S_i^- \ge 0$ | `topsis.py` | `hwang_multiple_2012` |
| (1.14) | 1.2.3 | `C_i^* = \frac{S_i^-}{S_i^+ + S_i^-}` | $S_i^\pm$ from (1.13) | relative closeness $C_i^*\in[0,1]$ (ranking score) | `topsis.py` | `hwang_multiple_2012` |
| (1.15) | 1.2.4 | `\tilde{w}_j^{(t)} = w_j \left( 1 + \varepsilon_j^{(t)} \right), \quad \varepsilon_j^{(t)} \sim \mathcal{U}(-\delta, +\delta)` | nominal weights $w$, amplitude $\delta>0$, iteration index $t$ | perturbed weight $\tilde{w}_j^{(t)}$ | `monte_carlo.py` | `lahdelma_smaa_2001` |
| (1.16) | 1.2.4 | `w_j^{(t)} = \frac{\tilde{w}_j^{(t)}}{\sum_{k=1}^{m} \tilde{w}_k^{(t)}}` | perturbed weights $\tilde{w}^{(t)}$ | renormalized weights $w^{(t)}$ with $\sum_j w_j^{(t)} = 1$ | `monte_carlo.py` | `lahdelma_smaa_2001` |
| (1.17) | 1.2.4 | `p_i(k) = \frac{1}{N} \sum_{t=1}^{N} \mathbb{1}\!\left[ r^{(t)}(a_i) \leq k \right]` | per-iteration rank $r^{(t)}(a_i)$ of alternative $a_i$; group size $k$; iterations $N$ | acceptability index $p_i(k)\in[0,1]$ (probability alternative $i$ falls in top-$k$) | `monte_carlo.py` (cumulative top-$k$ aggregate) | `lahdelma_smaa_2001` |
| (1.18) | 1.2.4 | `\rho = 1 - \frac{6 \sum_{i=1}^{n} d_i^2}{n(n^2 - 1)}` | rank differences $d_i$ between two full rankings of $n$ alternatives | Spearman rank correlation $\rho\in[-1,1]$ | `services/comparison_service.py` (via `scipy.stats.spearmanr`) | `kendall_rank_1990; abuabara_review_2025` |

## Algorithms (verbatim sequencing from 1.2.2–1.2.5)

### FAHP (1.2.2)

1. Build TFN pairwise comparison matrix $\tilde{A}=[\tilde{a}_{ij}]$ over the Saaty linguistic scale (Table 1.4). Diagonal: $(1,1,1)$. Lower triangle: TFN reciprocal of upper triangle by (1.6).
2. Compute crisp consistency on modal matrix $[m_{ij}]$ and check (1.2): admissible iff $CR\le 0{,}10$.
3. Compute fuzzy synthetic extents $S_i$ by (1.7).
4. Compute pairwise possibility degrees $V(S_i\ge S_k)$ by (1.8).
5. Take pointwise minima $d'(A_i) = \min_{k\ne i} V(S_i\ge S_k)$ and normalize to $\sum w_i = 1$ per (1.9).

### TOPSIS (1.2.3)

1. Vector-normalize $X$ to $R$ per (1.10).
2. Weight columns: $V = R\cdot \mathrm{diag}(w)$, i.e., $v_{ij}=w_j r_{ij}$ per (1.11).
3. Construct $A^+, A^-$ per (1.12), respecting per-criterion benefit/cost type.
4. Compute Euclidean distances $S_i^+, S_i^-$ per (1.13).
5. Compute closeness $C_i^*$ per (1.14); rank alternatives by descending $C_i^*$.

### Sensitivity / Monte Carlo (1.2.4–1.2.5)

1. Fix RNG seed for reproducibility.
2. For $t = 1, \dots, N$:
   a. Draw $\varepsilon^{(t)}\sim \mathcal{U}(-\delta, +\delta)^m$, build $\tilde{w}^{(t)}$ per (1.15).
   b. Renormalize $w^{(t)}$ per (1.16).
   c. Run TOPSIS with $w^{(t)}$, record per-alternative rank $r^{(t)}(a_i)$ and closeness $C_i^{*(t)}$.
3. Aggregate:
   a. Acceptability indices $p_i(k)$ per (1.17) for $k\in\{1,3,5\}$ (text fixes this set in 1.2.4).
   b. Mean and standard deviation of $C_i^{*}$ over $t$.
   c. 95 % confidence intervals for top-3 alternatives' closeness (text: top-3 only).
4. Optional cross-profile comparison: rank correlation $\rho$ per (1.18).

## Notes / open items

- Formula (1.1) is not in subsection 1.2; the MADM problem statement (subsection 1.1.x) uses non-numbered notation. No code in `mcdm/` should rely on it.
- Formulas (1.5) and (1.6) are explicitly approximate; numeric tests on TFN arithmetic must use tolerances consistent with this (do not assert exact equality with strict multiplication of intervals).
- Formula (1.17) defines `p_i(k)` as a **cumulative top-k** index. This is the canonical implementation target; per-rank frequencies are an internal artifact, not part of the contract.
- Formula (1.2) is computed on the **crisp modal matrix** $[m_{ij}]$, not on TFNs.
- Spearman correlation (1.18) lives outside `mcdm/` because the comparison service operates on already-computed rankings; no math-kernel public function is needed.
