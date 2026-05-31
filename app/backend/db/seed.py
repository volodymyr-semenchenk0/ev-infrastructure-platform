"""Reference-data seed: 2 profiles, 9 criteria, decision matrix.

Профілі та критерії є довідковими константами задачі. Локації вносяться через API
або окремим скриптом для конкретного аналізу в межах міста. Ідемпотентність
забезпечена через INSERT ... ON CONFLICT DO NOTHING по UNIQUE-ключах.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import numpy as np
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from db.models import Criterion, CriterionValue, Location, Profile

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

# Synthetic placeholder ranges — replace with finalised analysis values later.
CRITERION_RANGES: dict[str, tuple[float, float]] = {
    "Pop_dens": (1000.0, 8000.0),  # persons/km²
    "Traffic": (5000.0, 60000.0),  # vehicles/day
    "Grid_cap": (100.0, 800.0),  # kW
    "Dist_sub": (0.1, 3.5),  # km
    "Land_cost": (3.0, 9.0),  # score 1–10
    "Parking": (5.0, 50.0),  # places
    "Income": (3.0, 8.0),  # score 1–10
    "Green": (5.0, 60.0),  # %
    "Sat_dist": (0.2, 5.0),  # km to nearest existing station
}


# 2 decision-maker profiles
PROFILES: list[dict[str, str]] = [
    {
        "code": "municipal",
        "name": "Профіль міської адміністрації (Муніципалітет)",
        "description": ("Пріоритет суспільної доступності, екології та технічної реалізованості."),
    },
    {
        "code": "investor",
        "name": "Профіль приватного інвестора",
        "description": "Пріоритет економічної віддачі та пасажиропотоку.",
    },
]

# 9 evaluation criteria
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
        "code": "Sat_dist",
        "name": "Відстань до найближчої наявної станції",
        "unit": "km",
        "optimization_type": "max",
        "scale": "ratio",
    },
]


async def seed_reference_data(session: AsyncSession) -> None:
    """Idempotently load profiles and criteria.

    Locations are not seeded here — they are added via the API or a separate
    script for a specific analysis within the city limits. Default pairwise
    matrices Ã per profile are NOT persisted by the seed: they live in
    `db/defaults.py` and are built on the fly inside `GET /api/profiles/{id}`.
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

    Generates 9 criterion values for each location currently in the DB using
    uniform sampling within per-criterion ranges.  Called after seed_reference_data
    and after locations have been added, so that criteria and locations already exist.

    rng_seed allows reproducible generation; change only when refreshing the
    synthetic dataset intentionally.
    """
    existing_count: int = (
        await session.execute(select(func.count()).select_from(CriterionValue))
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

    if not rows:
        return
    await session.execute(insert(CriterionValue).values(rows))
