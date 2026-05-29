from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import insert, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from testcontainers.postgres import PostgresContainer

# Minimal set of Kyiv locations used exclusively in integration tests.
# These are within Kyiv city limits and cover different districts.
_TEST_LOCATION_ROWS: list[dict[str, str]] = [
    {
        "name": "Шулявка",
        "address": "вул. Борщагівська, 126",
        "district": "Шевченківський",
        "geom": "SRID=4326;POINT(30.4231 50.4489)",
    },
    {
        "name": "Оболонь",
        "address": "просп. Оболонський, 15",
        "district": "Оболонський",
        "geom": "SRID=4326;POINT(30.4967 50.5012)",
    },
    {
        "name": "Позняки",
        "address": "вул. Колекторна, 40",
        "district": "Дарницький",
        "geom": "SRID=4326;POINT(30.6124 50.3985)",
    },
]

N_TEST_LOCATIONS = len(_TEST_LOCATION_ROWS)


async def _seed_test_locations(session: AsyncSession) -> None:
    """Insert test locations within Kyiv city limits if they are not present yet."""
    from db.models import Location

    existing = (await session.execute(select(Location.name))).scalars().all()
    existing_names = set(existing)
    new_rows = [r for r in _TEST_LOCATION_ROWS if r["name"] not in existing_names]
    if new_rows:
        await session.execute(insert(Location).values(new_rows))
        await session.flush()


@pytest.fixture(scope="session")
def postgis_container():
    """Start a PostGIS 16 container for the entire test session.

    Uses the official postgis/postgis image so that the postgis extension is
    available without a separate installation step.
    """
    with PostgresContainer("postgis/postgis:16-3.4", driver="asyncpg") as pg:
        yield pg


@pytest_asyncio.fixture
async def db_session(
    postgis_container: PostgresContainer, monkeypatch: pytest.MonkeyPatch
) -> AsyncSession:
    """Create a fresh schema inside the PostGIS container and yield an async session.

    The schema is built via Base.metadata.create_all so it mirrors the ORM
    models exactly — no Alembic dependency here.  The postgis extension is
    enabled explicitly before create_all because GeoAlchemy2 column types
    require it to exist first.

    testcontainers sometimes returns a URL with the plain 'postgresql://'
    scheme.  The replacement below ensures asyncpg is always used as the
    driver, which is required by SQLAlchemy's async engine.
    """
    raw_url: str = postgis_container.get_connection_url()

    # Normalise scheme to postgresql+asyncpg; testcontainers may emit
    # 'postgresql+psycopg2://' or just 'postgresql://' depending on version.
    if "+asyncpg" not in raw_url:
        url = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        url = url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
    else:
        url = raw_url

    monkeypatch.setenv("DATABASE_URL", url)

    engine = create_async_engine(url, echo=False)

    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))

        # Import models so that their Table objects register with Base.metadata
        # before create_all is called.  The import is intentionally deferred to
        # this point so that the module is only loaded when a real DB is present.
        import db.models  # noqa: F401
        from db.base import Base

        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


# ---------------------------------------------------------------------------
# Shared API test helpers — used by test_api_profiles/locations/evaluations.
# Files that define their own api_client locally (test_api_routes.py,
# test_api_comparison_export.py) will use their local version automatically.
# ---------------------------------------------------------------------------


def _identity_pairwise_matrix(n: int) -> list[list[dict[str, float]]]:
    """n×n TFN identity matrix: all cells (1,1,1), CR=0, equal weights."""
    return [[{"l": 1.0, "m": 1.0, "u": 1.0} for _ in range(n)] for _ in range(n)]


@pytest_asyncio.fixture
async def api_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Seeded ASGI client: 2 profiles / 9 criteria / N_TEST_LOCATIONS locations within Kyiv."""
    from api.deps import get_db
    from db.seed import seed_decision_matrix, seed_reference_data
    from main import app

    await seed_reference_data(db_session)
    await _seed_test_locations(db_session)
    await seed_decision_matrix(db_session)
    await db_session.flush()

    async def _override() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def hwang_yoon_api_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """ASGI client seeded with Hwang & Yoon (1981) data: 4 locations, 3 criteria.

    Decision matrix X (4 alternatives × 3 criteria):
      A1: [25000, 16, 8]  — Price(min), Economy(max), Service(max)
      A2: [20000, 20, 6]  — expected best with equal weights (1/3, 1/3, 1/3)
      A3: [15000, 12, 7]
      A4: [30000, 10, 5]

    Reference: Hwang & Yoon (1981), Chapter 3.
    """
    from geoalchemy2 import WKTElement

    from api.deps import get_db
    from db.models import Criterion, CriterionValue, Location, Profile
    from main import app

    profile = Profile(code="hy_test", name="Hwang-Yoon test")
    db_session.add(profile)
    await db_session.flush()

    criteria = [
        Criterion(
            code="C1_price", name="Price", unit="USD", optimization_type="min", scale="ratio"
        ),
        Criterion(
            code="C2_econ", name="Economy", unit="km/L", optimization_type="max", scale="ratio"
        ),
        Criterion(
            code="C3_svc", name="Service", unit="score", optimization_type="max", scale="ratio"
        ),
    ]
    db_session.add_all(criteria)
    await db_session.flush()

    locations = [
        Location(name=f"A{i + 1}", geom=WKTElement("POINT(30.5 50.5)", srid=4326)) for i in range(4)
    ]
    db_session.add_all(locations)
    await db_session.flush()

    raw_x = [
        [25000.0, 16.0, 8.0],
        [20000.0, 20.0, 6.0],
        [15000.0, 12.0, 7.0],
        [30000.0, 10.0, 5.0],
    ]
    for i, loc in enumerate(locations):
        for j, crit in enumerate(criteria):
            db_session.add(
                CriterionValue(
                    location_id=loc.id,
                    criterion_id=crit.id,
                    value=raw_x[i][j],
                )
            )
    await db_session.flush()

    async def _override() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
