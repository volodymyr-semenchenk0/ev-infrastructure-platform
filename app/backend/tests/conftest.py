from __future__ import annotations

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from testcontainers.postgres import PostgresContainer


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
