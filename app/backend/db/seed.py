"""Reference-data seed: 2 profiles, 10 criteria, 12 Kyiv locations, decision matrix.

Дані відповідають таблицям 3.1, 3.3 і 3.2 курсової. Ідемпотентність забезпечена
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

# 12 Kyiv candidate locations (master.md Table 3.2)
LOCATIONS: list[dict[str, str | float]] = [
    {
        "name": "Шулявка",
        "address": "вул. Борщагівська, 126",
        "district": "Шевченківський",
        "lat": 50.4489,
        "lon": 30.4231,
    },
    {
        "name": "Оболонь",
        "address": "просп. Оболонський, 15",
        "district": "Оболонський",
        "lat": 50.5012,
        "lon": 30.4967,
    },
    {
        "name": "Відрадний",
        "address": "вул. Вітряні Гори, 7",
        "district": "Святошинський",
        "lat": 50.4678,
        "lon": 30.3801,
    },
    {
        "name": "Позняки",
        "address": "вул. Колекторна, 40",
        "district": "Дарницький",
        "lat": 50.3985,
        "lon": 30.6124,
    },
    {
        "name": "Голосіїво",
        "address": "просп. Голосіївський, 132",
        "district": "Голосіївський",
        "lat": 50.3724,
        "lon": 30.4938,
    },
    {
        "name": "Деснянська",
        "address": "вул. Петра Запорожця, 22",
        "district": "Деснянський",
        "lat": 50.5189,
        "lon": 30.6012,
    },
    {
        "name": "Харківське шосе",
        "address": "Харківське шосе, 165",
        "district": "Харківський",
        "lat": 50.3891,
        "lon": 30.6589,
    },
    {
        "name": "Лівобережна",
        "address": "вул. Сирецька, 54",
        "district": "Дніпровський",
        "lat": 50.4312,
        "lon": 30.6278,
    },
    {
        "name": "Бориспільська",
        "address": "вул. Бориспільська, 28",
        "district": "Дарницький",
        "lat": 50.4023,
        "lon": 30.6712,
    },
    {
        "name": "Академмістечко",
        "address": "вул. Акад. Єфименка, 1",
        "district": "Святошинський",
        "lat": 50.4712,
        "lon": 30.3524,
    },
    {
        "name": "Берестейська",
        "address": "вул. Гетьмана, 44",
        "district": "Шевченківський",
        "lat": 50.4534,
        "lon": 30.4124,
    },
    {
        "name": "Троєщина",
        "address": "вул. Теліги, 89",
        "district": "Деснянський",
        "lat": 50.5234,
        "lon": 30.5689,
    },
]


async def seed_reference_data(session: AsyncSession) -> None:
    """Idempotently load profiles, criteria, and Kyiv candidate locations.

    Idempotency: profiles/criteria are upserted via INSERT ... ON CONFLICT (code).
    Locations have no UNIQUE column, so duplicates are avoided by counting first.
    """
    await session.execute(
        insert(Profile).values(PROFILES).on_conflict_do_nothing(index_elements=["code"])
    )

    await session.execute(
        insert(Criterion).values(CRITERIA).on_conflict_do_nothing(index_elements=["code"])
    )

    existing = (await session.execute(select(Location.name))).scalars().all()
    existing_names = set(existing)
    new_rows = [
        {
            "name": loc["name"],
            "address": loc["address"],
            "district": loc["district"],
            "geom": f"SRID=4326;POINT({loc['lon']} {loc['lat']})",
        }
        for loc in LOCATIONS
        if loc["name"] not in existing_names
    ]
    if new_rows:
        await session.execute(insert(Location).values(new_rows))


async def seed_decision_matrix(session: AsyncSession, rng_seed: int = 42) -> None:
    """Idempotently populate location_criterion_values with synthetic data.

    Generates 10 criterion values for each of the 12 candidate locations using
    uniform sampling within per-criterion ranges.  Called after seed_reference_data
    so that criteria and locations already exist.

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
