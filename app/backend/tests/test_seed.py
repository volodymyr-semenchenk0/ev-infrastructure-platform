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
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Criterion, CriterionValue, Location, Profile
from db.seed import (
    _read_fixture,
    seed_decision_matrix,
    seed_locations,
    seed_reference_data,
)

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


class TestSeedDecisionMatrix:
    """Tests for db/seed.py::seed_decision_matrix (CSV fixture, upsert by name/code)."""

    async def _seed_all(self, db_session: AsyncSession) -> None:
        await seed_reference_data(db_session)
        await seed_locations(db_session)
        await db_session.flush()
        await seed_decision_matrix(db_session)
        await db_session.flush()

    async def test_matrix_matches_fixture_exactly(self, db_session: AsyncSession) -> None:
        """All 108 cells equal the committed fixture, keyed by (name, code)."""
        await self._seed_all(db_session)

        rows = (
            await db_session.execute(
                select(Location.name, Criterion.code, CriterionValue.value)
                .join(Location, Location.id == CriterionValue.location_id)
                .join(Criterion, Criterion.id == CriterionValue.criterion_id)
            )
        ).all()

        actual = {(name, code): float(value) for name, code, value in rows}
        expected = {(n, c): v for n, c, v in _read_fixture()}

        assert len(actual) == 108, f"Expected 108 cells, got {len(actual)}"
        assert actual == expected
        await db_session.rollback()

    async def test_resolves_by_code_not_position(self, db_session: AsyncSession) -> None:
        """Re-inserting a criterion (so its id jumps out of code order) must not
        misalign values — resolution is by code/name, not by id position."""
        await seed_reference_data(db_session)
        await seed_locations(db_session)
        await db_session.flush()

        sat = (
            await db_session.execute(select(Criterion).where(Criterion.code == "Sat_dist"))
        ).scalar_one()
        await db_session.delete(sat)
        await db_session.flush()
        await db_session.execute(
            insert(Criterion).values(
                code="Sat_dist",
                name="Відстань до найближчої наявної станції",
                unit="km",
                optimization_type="max",
                scale="ratio",
            )
        )
        await db_session.flush()

        await seed_decision_matrix(db_session)
        await db_session.flush()

        expected = {(n, c): v for n, c, v in _read_fixture()}
        sat_id = (
            await db_session.execute(select(Criterion.id).where(Criterion.code == "Sat_dist"))
        ).scalar_one()
        rows = (
            await db_session.execute(
                select(Location.name, CriterionValue.value)
                .join(Location, Location.id == CriterionValue.location_id)
                .where(CriterionValue.criterion_id == sat_id)
            )
        ).all()
        actual_sat = {name: float(v) for name, v in rows}
        expected_sat = {n: v for (n, c), v in expected.items() if c == "Sat_dist"}
        assert actual_sat == expected_sat
        await db_session.rollback()

    async def test_rerun_corrects_drifted_value(self, db_session: AsyncSession) -> None:
        """A wrong value in the DB is overwritten back to the fixture on re-run."""
        await self._seed_all(db_session)

        gol_id = (
            await db_session.execute(select(Location.id).where(Location.name == "Голосіїво"))
        ).scalar_one()
        pop_id = (
            await db_session.execute(select(Criterion.id).where(Criterion.code == "Pop_dens"))
        ).scalar_one()
        await db_session.execute(
            update(CriterionValue)
            .where(
                CriterionValue.location_id == gol_id,
                CriterionValue.criterion_id == pop_id,
            )
            .values(value=1.0)
        )
        await db_session.flush()

        await seed_decision_matrix(db_session)
        await db_session.flush()

        value = (
            await db_session.execute(
                select(CriterionValue.value).where(
                    CriterionValue.location_id == gol_id,
                    CriterionValue.criterion_id == pop_id,
                )
            )
        ).scalar_one()
        expected = {(n, c): v for n, c, v in _read_fixture()}
        assert float(value) == expected[("Голосіїво", "Pop_dens")]
        await db_session.rollback()

    async def test_rerun_keeps_108_rows(self, db_session: AsyncSession) -> None:
        """Running the matrix seed twice keeps exactly 108 rows (composite PK)."""
        await self._seed_all(db_session)
        await seed_decision_matrix(db_session)
        await db_session.flush()

        count = (
            await db_session.execute(select(func.count()).select_from(CriterionValue))
        ).scalar_one()
        assert count == 108
        await db_session.rollback()

    async def test_unknown_key_raises(
        self, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """If the fixture names a location/criterion absent from the DB, abort."""
        await seed_reference_data(db_session)
        await seed_locations(db_session)
        await db_session.flush()

        monkeypatch.setattr(
            "db.seed._read_fixture",
            lambda: [("Голосіїво", "NO_SUCH_CRITERION", 1.0)],
        )

        with pytest.raises(ValueError, match="unknown locations/criteria"):
            await seed_decision_matrix(db_session)
        # ValueError raised before any SQL executes; rollback kept for symmetry, it is a no-op.
        await db_session.rollback()
