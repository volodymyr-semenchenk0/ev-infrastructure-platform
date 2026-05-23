"""Reference-data seed: 2 profiles, 10 criteria, decision matrix.

Дані відповідають таблицям 3.1 і 3.3 курсової. Локації вносяться через API або
окремим скриптом для конкретного аналізу в межах міста. Ідемпотентність забезпечена
через INSERT ... ON CONFLICT DO NOTHING по UNIQUE-ключах.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import numpy as np
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from db.models import Criterion, Location, LocationCriterionValue, Profile

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

# Synthetic data — replace with chapter 3.2 Appendix D values when finalised.
CRITERION_RANGES: dict[str, tuple[float, float]] = {
    "Pop_dens": (1000.0, 8000.0),  # persons/km²
    "Traffic": (5000.0, 60000.0),  # vehicles/day
    "Grid_cap": (100.0, 800.0),  # kW
    "Dist_sub": (0.1, 3.5),  # km
    "Revenue": (3.0, 9.0),  # score 1–10
    "Land_cost": (3.0, 9.0),  # score 1–10
    "Parking": (5.0, 50.0),  # places
    "Income": (3.0, 8.0),  # score 1–10
    "Green": (5.0, 60.0),  # %
    "Env_qual": (3.0, 8.0),  # score 1–10
}


# 2 profiles (master.md Table 3.1)
PROFILES: list[dict[str, str]] = [
    {
        "code": "municipal",
        "name": "Муніципалітет",
        "description": (
            "Профіль міської адміністрації: пріоритет суспільної доступності, "
            "екології та технічної реалізованості."
        ),
    },
    {
        "code": "investor",
        "name": "Інвестор",
        "description": (
            "Профіль приватного інвестора: пріоритет економічної віддачі та пасажиропотоку."
        ),
    },
]

# 10 criteria (master.md Table 3.3; spec 2.2.2 §2)
CRITERIA: list[dict[str, str]] = [
    {
        "code": "Pop_dens",
        "name": "Щільність населення (1 км)",
        "unit": "persons/km²",
        "optimization_type": "max",
        "scale": "ratio",
    },
    {
        "code": "Traffic",
        "name": "Середньодобовий трафік",
        "unit": "vehicles/day",
        "optimization_type": "max",
        "scale": "ratio",
    },
    {
        "code": "Grid_cap",
        "name": "Доступна потужність електромережі",
        "unit": "kW",
        "optimization_type": "max",
        "scale": "ratio",
    },
    {
        "code": "Dist_sub",
        "name": "Відстань до найближчої підстанції",
        "unit": "km",
        "optimization_type": "min",
        "scale": "ratio",
    },
    {
        "code": "Revenue",
        "name": "Потенційна рентабельність",
        "unit": "score 1-10",
        "optimization_type": "max",
        "scale": "ordinal",
    },
    {
        "code": "Land_cost",
        "name": "Вартість земельної ділянки",
        "unit": "score 1-10",
        "optimization_type": "min",
        "scale": "ordinal",
    },
    {
        "code": "Parking",
        "name": "Паркомісця у радіусі 200 м",
        "unit": "places",
        "optimization_type": "max",
        "scale": "ratio",
    },
    {
        "code": "Income",
        "name": "Рівень доходів населення",
        "unit": "score 1-10",
        "optimization_type": "max",
        "scale": "ordinal",
    },
    {
        "code": "Green",
        "name": "Частка зелених зон у радіусі 500 м",
        "unit": "%",
        "optimization_type": "max",
        "scale": "ratio",
    },
    {
        "code": "Env_qual",
        "name": "Екологічна привабливість",
        "unit": "score 1-10",
        "optimization_type": "max",
        "scale": "ordinal",
    },
]


async def seed_reference_data(session: AsyncSession) -> None:
    """Idempotently load profiles and criteria.

    Locations are not seeded here — they are added via the API or a separate
    script for a specific analysis within the city limits.
    Idempotency: profiles/criteria are upserted via INSERT ... ON CONFLICT (code).
    """
    await session.execute(
        insert(Profile).values(PROFILES).on_conflict_do_nothing(index_elements=["code"])
    )

    await session.execute(
        insert(Criterion).values(CRITERIA).on_conflict_do_nothing(index_elements=["code"])
    )


async def seed_decision_matrix(session: AsyncSession, rng_seed: int = 42) -> None:
    """Idempotently populate location_criterion_values with synthetic data.

    Generates 10 criterion values for each location currently in the DB using
    uniform sampling within per-criterion ranges.  Called after seed_reference_data
    and after locations have been added, so that criteria and locations already exist.

    rng_seed allows reproducible generation; change only when refreshing the
    synthetic dataset intentionally.
    """
    existing_count: int = (
        await session.execute(select(func.count()).select_from(LocationCriterionValue))
    ).scalar_one()
    if existing_count > 0:
        # Table already populated; do nothing (idempotency guard).
        return

    criteria = (await session.execute(select(Criterion).order_by(Criterion.id))).scalars().all()
    locations = (await session.execute(select(Location).order_by(Location.id))).scalars().all()

    rng = np.random.default_rng(rng_seed)

    rows: list[dict[str, object]] = []
    for loc in locations:
        for crit in criteria:
            lo, hi = CRITERION_RANGES[crit.code]
            raw = rng.uniform(lo, hi)
            rows.append(
                {
                    "location_id": loc.id,
                    "criterion_id": crit.id,
                    "value": round(float(raw), 4),
                }
            )

    await session.execute(insert(LocationCriterionValue).values(rows))
