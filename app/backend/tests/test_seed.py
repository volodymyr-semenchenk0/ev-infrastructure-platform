"""Integration tests for the seed_reference_data function (spec 2.2.2, 3.1).

seed_reference_data(session) is defined in db/seed.py (Task #5).
These tests constitute the red phase: they fail with ImportError / AttributeError
until Task #5 is complete.

All tests use a live PostGIS container (db_session fixture from conftest.py).
No mocks are used.
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Criterion, Profile
from db.seed import seed_reference_data

# ---------------------------------------------------------------------------
# Expected reference constants (source: master.md Table 3.1, Table 3.3)
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

    Reference: spec 2.2.2 seed requirements; master.md Table 3.1 (profiles),
    Table 3.3 (criteria codes).
    """

    async def test_seed_creates_two_profiles(self, db_session: AsyncSession) -> None:
        """seed_reference_data must insert exactly 2 profiles: 'municipal' and 'investor'.

        Reference: master.md Table 3.1 — два профілі прийняття рішень.
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

        Reference: master.md Table 3.3 — 9 критеріїв оцінювання локацій.
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
