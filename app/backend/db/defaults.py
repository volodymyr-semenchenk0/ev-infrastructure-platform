"""Default pairwise comparison matrix Ã per profile, computed on the fly.

The values here are authorial constants: the priority each profile assigns
to each criterion. The API builds the matrix on every `GET /api/profiles/{id}`
request from this dict, so changing a number only requires a uvicorn reload —
no DB writes, no `seed_cli`, no `DELETE FROM pairwise_matrices`. The table
`pairwise_matrices` stays in the schema for a future "expert saves matrix
to DB" feature; this iteration does not touch it.

Mirrors the frontend `mToTfn` helper so the seeded matrix renders identically
in the matrix editor.
"""

from __future__ import annotations

import math
from typing import Protocol

from schemas.evaluation import FuzzyNumber

# Per-profile priority weights for the default pairwise matrix Ã. Values come
# from the Saaty 1-9 subset so every pair-ratio stays close to the canonical
# scale; both profiles satisfy CR <= 0.10 (verified in tests/test_defaults.py).
# Replace these with your own expert priorities when applicable.
PAIRWISE_PRIORITIES: dict[str, dict[str, int]] = {
    "municipal": {
        "Pop_dens": 9,
        "Env_qual": 7,
        "Green": 7,
        "Grid_cap": 5,
        "Traffic": 5,
        "Dist_sub": 3,
        "Parking": 3,
        "Land_cost": 3,
        "Income": 1,
        "Revenue": 1,
    },
    "investor": {
        "Revenue": 9,
        "Traffic": 7,
        "Income": 7,
        "Grid_cap": 5,
        "Land_cost": 5,
        "Dist_sub": 3,
        "Pop_dens": 3,
        "Parking": 3,
        "Green": 1,
        "Env_qual": 1,
    },
}

# Saaty 9-scale (formula 1.2 reference). Used by snap_to_saaty.
SAATY_VALUES: tuple[float, ...] = (
    1.0 / 9.0,
    1.0 / 7.0,
    1.0 / 5.0,
    1.0 / 3.0,
    1.0,
    3.0,
    5.0,
    7.0,
    9.0,
)
_SAATY_MIN = 1.0 / 9.0
_SAATY_MAX = 9.0


def snap_to_saaty(ratio: float) -> float:
    """Return the closest Saaty value to `ratio` on a log scale.

    The Saaty scale is geometric, so log-distance is the right metric: a
    ratio of 2 is equidistant from 1 and 3 on log scale even though arithmetic
    distance would prefer 1.
    """
    if ratio <= 0:
        return 1.0
    target = math.log(ratio)
    return min(SAATY_VALUES, key=lambda v: abs(math.log(v) - target))


def _clamp_saaty(value: float) -> float:
    if value < _SAATY_MIN:
        return _SAATY_MIN
    if value > _SAATY_MAX:
        return _SAATY_MAX
    return value


def m_to_tfn(m: float) -> tuple[float, float, float]:
    """Mirror of the frontend mToTfn helper.

    For m == 1, the TFN is the crisp 1 = (1, 1, 1). For m in {3, 5, 7, 9},
    spread by ±1 clamped to [1/9, 9]. For m < 1, take the reciprocal of
    m_to_tfn(1/m).
    """
    if m == 1.0:
        return (1.0, 1.0, 1.0)
    if m >= 1.0:
        lower = m - 1.0 if m - 1.0 >= 1.0 else 1.0
        upper = m + 1.0
        return (_clamp_saaty(lower), m, _clamp_saaty(upper))
    inv_l, inv_m, inv_u = m_to_tfn(1.0 / m)
    return (1.0 / inv_u, 1.0 / inv_m, 1.0 / inv_l)


class _CriterionLike(Protocol):
    """Structural protocol used by build_default_pairwise_matrix.

    Both the ORM `Criterion` model and any test-only stub satisfy it; defined
    here purely so the helper can stay free of ORM imports for unit tests.
    """

    @property
    def id(self) -> int: ...

    @property
    def code(self) -> str: ...


def build_default_pairwise_matrix(
    profile_code: str,
    criteria: list[_CriterionLike],
) -> list[list[FuzzyNumber]] | None:
    """Build the 10x10 default Ã for `profile_code` ordered by `criteria`.

    Returns `None` if the profile has no priority dict (UI then falls back
    to the identity matrix per UI_PLAN §4). Diagonal cells are crisp 1; the
    off-diagonal cells are derived from PAIRWISE_PRIORITIES via snap_to_saaty
    and m_to_tfn.
    """
    priorities = PAIRWISE_PRIORITIES.get(profile_code)
    if priorities is None:
        return None
    n = len(criteria)
    if n == 0:
        return None

    matrix: list[list[FuzzyNumber]] = [
        [FuzzyNumber(l=1.0, m=1.0, u=1.0) for _ in range(n)] for _ in range(n)
    ]
    for i, crit_i in enumerate(criteria):
        p_i = priorities.get(crit_i.code)
        if p_i is None:
            continue
        for j, crit_j in enumerate(criteria):
            if i == j:
                continue
            p_j = priorities.get(crit_j.code)
            if p_j is None:
                continue
            m_value = snap_to_saaty(p_i / p_j)
            l_val, m_val, u_val = m_to_tfn(m_value)
            matrix[i][j] = FuzzyNumber(l=l_val, m=m_val, u=u_val)
    return matrix
