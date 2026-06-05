"""Reference-data seed: 2 profiles, 9 criteria, decision matrix.

Профілі та критерії є довідковими константами задачі. Локації вносяться через API
або окремим скриптом для конкретного аналізу в межах міста. Ідемпотентність
забезпечена через INSERT ... ON CONFLICT DO NOTHING по UNIQUE-ключах.
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import TYPE_CHECKING

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from db.models import Criterion, CriterionValue, Location, Profile

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

_FIXTURE_PATH = Path(__file__).parent / "data" / "decision_matrix.csv"


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


# 12 candidate locations across Kyiv districts as (name, district, address, lat, lon).
# Coordinates are WGS-84; stored as SRID=4326 POINT(lon lat). The order fixes the row
# order on a fresh seed so the CSV fixture is reproducible.
LOCATIONS: list[tuple[str, str, str, float, float]] = [
    ("Шулявка", "Шевченківський", "вул. Борщагівська, 126", 50.4489, 30.4231),
    ("Оболонь", "Оболонський", "просп. Оболонський, 15", 50.5012, 30.4967),
    ("Відрадний", "Святошинський", "вул. Вітряні Гори, 7", 50.4678, 30.3801),
    ("Позняки", "Дарницький", "вул. Колекторна, 40", 50.3985, 30.6124),
    ("Голосіїво", "Голосіївський", "просп. Голосіївський, 132", 50.361624, 30.486073),
    ("Деснянська", "Деснянський", "вул. Петра Запорожця, 22", 50.5189, 30.6012),
    ("Харківське шосе", "Харківський", "Харківське шосе, 165", 50.400774, 30.653307),
    ("Лівобережна", "Дніпровський", "вул. Сирецька, 54", 50.4312, 30.6278),
    ("Бориспільська", "Дарницький", "вул. Бориспільська, 28", 50.403576, 30.684217),
    ("Академмістечко", "Святошинський", "вул. Акад. Єфименка, 1", 50.462587, 30.35543),
    ("Берестейська", "Шевченківський", "вул. Гетьмана, 44", 50.4534, 30.4124),
    ("Троєщина", "Деснянський", "вул. Теліги, 89", 50.5234, 30.5689),
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


async def seed_locations(session: AsyncSession) -> None:
    """Idempotently load the 12 candidate locations.

    geom is built as the EWKT string ``SRID=4326;POINT(lon lat)`` (same form the
    API repository uses). Idempotency: skipped when the table already holds rows,
    so locations added via the API are never duplicated. Must run before
    seed_decision_matrix so the fixture values attach to these rows.
    """
    existing_count: int = (
        await session.execute(select(func.count()).select_from(Location))
    ).scalar_one()
    if existing_count > 0:
        return

    rows = [
        {
            "name": name,
            "district": district,
            "address": address,
            "geom": f"SRID=4326;POINT({lon} {lat})",
        }
        for name, district, address, lat, lon in LOCATIONS
    ]
    await session.execute(insert(Location).values(rows))


def _read_fixture() -> list[tuple[str, str, float]]:
    """Read the canonical decision matrix from data/decision_matrix.csv.

    Returns (location_name, criterion_code, value) triples. Raises if the file
    is missing or empty so a misconfigured deploy fails loudly rather than
    seeding a partial matrix.
    """
    with _FIXTURE_PATH.open(encoding="utf-8") as fh:
        rows = [
            (r["location_name"], r["criterion_code"], float(r["value"])) for r in csv.DictReader(fh)
        ]
    if not rows:
        raise ValueError(f"decision_matrix fixture is empty: {_FIXTURE_PATH}")
    return rows


async def seed_decision_matrix(session: AsyncSession) -> None:
    """Load the canonical decision matrix from the committed CSV fixture.

    Each fixture row (location_name, criterion_code, value) is resolved to ids by
    name/code — not positionally — so the matrix is identical across environments
    regardless of auto-increment id ordering. Rows are upserted into
    criterion_values, so a re-run on a populated DB converges existing values to
    the fixture (self-heal on every deploy). Must run after seed_reference_data
    so criteria already exist. Fixture rows for locations absent from the DB are
    skipped — locations are a working set that may be partial (integration tests,
    city-subset analysis); see module docstring.
    """
    fixture = _read_fixture()

    name_to_id = {
        name: id_ for name, id_ in (await session.execute(select(Location.name, Location.id))).all()
    }
    code_to_id = {
        code: id_
        for code, id_ in (await session.execute(select(Criterion.code, Criterion.id))).all()
    }

    # Criteria are fixed reference data: every code in the fixture must resolve,
    # otherwise the fixture is misconfigured and we abort.
    unknown_codes = sorted({code for _, code, _ in fixture if code not in code_to_id})
    if unknown_codes:
        raise ValueError(f"decision_matrix fixture references unknown criteria: {unknown_codes}")

    # Locations are a working set that may be partial (integration tests, or a
    # city-subset analysis — see module docstring). Fixture rows for locations
    # absent from the DB are skipped rather than treated as an error; on a full
    # deploy seed_locations inserts all canonical locations, so the whole matrix
    # loads. Criteria above are already validated, so code_to_id[code] is safe.
    values: list[dict[str, object]] = [
        {"location_id": name_to_id[name], "criterion_id": code_to_id[code], "value": value}
        for name, code, value in fixture
        if name in name_to_id
    ]
    if not values:
        return

    stmt = insert(CriterionValue).values(values)
    await session.execute(
        stmt.on_conflict_do_update(
            index_elements=["location_id", "criterion_id"],
            set_={"value": stmt.excluded.value},
        )
    )
