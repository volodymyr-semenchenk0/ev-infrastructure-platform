from __future__ import annotations

import asyncio
from logging.config import fileConfig
from typing import Any

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

import db.models  # noqa: F401  — registers all ORM models with Base.metadata
from core.config import settings
from db.base import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


# PostGIS Tiger Geocoder, topology, and spatial_ref_sys are shipped by the
# postgis/postgis Docker image. We do not own them and must never generate
# drop_table / drop_index ops for them.
_POSTGIS_SYSTEM_TABLES: frozenset[str] = frozenset(
    {"spatial_ref_sys", "layer", "topology", "us_gaz", "us_lex", "us_rules"}
)
_POSTGIS_SYSTEM_PREFIXES: tuple[str, ...] = (
    "tiger_",
    "loader_",
    "pagc_",
    "geocode_",
)


def _is_postgis_system_table(name: str) -> bool:
    if name in _POSTGIS_SYSTEM_TABLES:
        return True
    if name.startswith(_POSTGIS_SYSTEM_PREFIXES):
        return True
    # tiger schema tables like addr, addrfeat, place, state, county, tract, etc.
    # are only present in the Tiger geocoder bundle; we never own them.
    if name in {
        "addr",
        "addrfeat",
        "bg",
        "county",
        "county_lookup",
        "countysub_lookup",
        "cousub",
        "edges",
        "faces",
        "featnames",
        "place",
        "place_lookup",
        "secondary_unit_lookup",
        "state",
        "state_lookup",
        "street_type_lookup",
        "tabblock",
        "tabblock20",
        "tract",
        "zcta5",
        "zip_lookup",
        "zip_lookup_all",
        "zip_lookup_base",
        "zip_state",
        "zip_state_loc",
        "direction_lookup",
    }:
        return True
    return False


def include_object(
    obj: Any,
    name: str | None,
    type_: str,
    reflected: bool,
    compare_to: Any,
) -> bool:
    # Drop generation guard: a reflected table not present in our metadata
    # means "exists in DB but not in models" — Alembic should ignore it.
    if type_ == "table" and reflected and compare_to is None:
        return False
    # Explicit safety net for known PostGIS Tiger / topology tables.
    if type_ == "table" and name is not None and _is_postgis_system_table(name):
        return False
    # GeoAlchemy2 creates its own spatial indexes on geom columns automatically;
    # Alembic does not understand them and would generate duplicates on each run.
    if type_ == "index" and name and name.startswith("idx_") and name.endswith("_geom"):
        return False
    return True


def include_name(name: str | None, type_: str, parent_names: dict[str, str | None]) -> bool:
    """Schema-level filter — restrict autogenerate to the 'public' schema only."""
    if type_ == "schema":
        return name in (None, "public")
    if type_ == "table" and name is not None and _is_postgis_system_table(name):
        return False
    return True


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        include_name=include_name,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = create_async_engine(settings.database_url)
    async with connectable.connect() as connection:
        await connection.run_sync(
            lambda conn: context.configure(
                connection=conn,
                target_metadata=target_metadata,
                include_object=include_object,
                include_name=include_name,
            )
        )
        async with connection.begin():
            await connection.run_sync(lambda _: context.run_migrations())
    await connectable.dispose()


def run_async_migrations() -> None:
    asyncio.run(run_migrations_online())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_async_migrations()
