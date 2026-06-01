"""Integration tests for the seed_reference_data function (spec 2.2.2, 3.1).

seed_reference_data(session) is defined in db/seed.py (Task #5).
These tests constitute the red phase: they fail with ImportError / AttributeError
until Task #5 is complete.

All tests use a live PostGIS container (db_session fixture from conftest.py).
No mocks are used.
"""

from __future__ import annotations

import pytest
from geoalchemy2.shape import to_shape
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Criterion, Location, Profile
from db.seed import seed_locations, seed_reference_data

# ---------------------------------------------------------------------------
# Expected reference constants: 2 profiles, 9 criteria.
# ---------------------------------------------------------------------------

EXPECTED_PROFILE_CODES = {"municipal", "investor"}

EXPECTED_CRITERION_CODES = {
    "Pop_dens",
    "Traffic",
    "Grid_cap",
    "Dist_sub",
    "Land_cost",
    "Parking",
    "Income",
    "Green",
    "Sat_dist",
}


class TestSeedReferenceData:
    """Tests for db/seed.py::seed_reference_data.

    Reference: spec 2.2.2 seed requirements (2 profiles, 9 criteria codes).
    """

    async def test_seed_creates_two_profiles(self, db_session: AsyncSession) -> None:
        """seed_reference_data must insert exactly 2 profiles: 'municipal' and 'investor'.

        Reference: два профілі прийняття рішень (municipal, investor).
        """
        await seed_reference_data(db_session)
        await db_session.flush()

        result = await db_session.execute(select(Profile))
        profiles = result.scalars().all()

        assert len(profiles) == 2, (
            f"Expected 2 profiles, got {len(profiles)}: {[p.code for p in profiles]}"
        )
        actual_codes = {p.code for p in profiles}
        assert actual_codes == EXPECTED_PROFILE_CODES, (
            f"Profile codes mismatch. Expected {EXPECTED_PROFILE_CODES}, got {actual_codes}"
        )
        await db_session.rollback()

    async def test_seed_creates_nine_criteria(self, db_session: AsyncSession) -> None:
        """seed_reference_data must insert exactly 9 criteria with the expected codes.

        Reference: 9 критеріїв оцінювання локацій.
        """
        await seed_reference_data(db_session)
        await db_session.flush()

        result = await db_session.execute(select(Criterion))
        criteria = result.scalars().all()

        assert len(criteria) == 9, (
            f"Expected 9 criteria, got {len(criteria)}: {[c.code for c in criteria]}"
        )
        actual_codes = {c.code for c in criteria}
        assert actual_codes == EXPECTED_CRITERION_CODES, (
            f"Criterion codes mismatch.\n"
            f"  Missing : {EXPECTED_CRITERION_CODES - actual_codes}\n"
            f"  Extra   : {actual_codes - EXPECTED_CRITERION_CODES}"
        )
        await db_session.rollback()

    async def test_seed_is_idempotent(self, db_session: AsyncSession) -> None:
        """Calling seed_reference_data twice must not duplicate rows.

        After two calls the counts must still be 2 profiles and 9 criteria
        — not 4 / 18.  Locations are not seeded by seed_reference_data; they
        are added separately for each analysis within the city limits.

        Reference: spec 2.2.2 — seed must be safe to re-run (INSERT … ON CONFLICT DO NOTHING
        or equivalent upsert pattern).
        """
        await seed_reference_data(db_session)
        await db_session.flush()
        await seed_reference_data(db_session)
        await db_session.flush()

        profile_count = (
            await db_session.execute(select(func.count()).select_from(Profile))
        ).scalar_one()
        criterion_count = (
            await db_session.execute(select(func.count()).select_from(Criterion))
        ).scalar_one()

        assert profile_count == 2, (
            f"Idempotency broken: {profile_count} profiles after 2 seed calls"
        )
        assert criterion_count == 9, (
            f"Idempotency broken: {criterion_count} criteria after 2 seed calls"
        )

        await db_session.rollback()


class TestSeedLocations:
    """Tests for db/seed.py::seed_locations (12 candidate locations)."""

    async def test_seed_creates_twelve_locations(self, db_session: AsyncSession) -> None:
        await seed_locations(db_session)
        await db_session.flush()

        locations = (await db_session.execute(select(Location))).scalars().all()
        assert len(locations) == 12, f"Expected 12 locations, got {len(locations)}"
        assert "Харківське шосе" in {loc.name for loc in locations}

        await db_session.rollback()

    async def test_seed_stores_wgs84_coordinates(self, db_session: AsyncSession) -> None:
        """Coordinates are stored as SRID=4326 POINT(lon lat) and read back as (lat, lon)."""
        await seed_locations(db_session)
        await db_session.flush()

        by_name = {
            loc.name: loc for loc in (await db_session.execute(select(Location))).scalars().all()
        }
        # shapely point: x is longitude, y is latitude.
        akadem = to_shape(by_name["Академмістечко"].geom)
        assert akadem.y == pytest.approx(50.462587, abs=1e-6)
        assert akadem.x == pytest.approx(30.35543, abs=1e-6)

        await db_session.rollback()

    async def test_seed_is_idempotent(self, db_session: AsyncSession) -> None:
        await seed_locations(db_session)
        await db_session.flush()
        await seed_locations(db_session)
        await db_session.flush()

        count = (await db_session.execute(select(func.count()).select_from(Location))).scalar_one()
        assert count == 12, f"Idempotency broken: {count} locations after 2 seed calls"

        await db_session.rollback()
