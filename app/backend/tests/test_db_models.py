"""Integration tests for ORM model invariants (spec 2.2.2).

Each test targets one invariant that SQLAlchemy alone does not guarantee —
uniqueness constraints, composite PKs, DB-level CHECK constraints, GiST
indexes, PostGIS geometry round-trips, JSON field round-trips, and
cascading deletes.

All tests require a live PostGIS container (see conftest.py).
No mocks are used.
"""

from __future__ import annotations

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import (
    Criterion,
    EvaluationRun,
    Location,
    PairwiseMatrixEntry,
    Profile,
    RankingItem,
    SensitivityRecord,
)

# ---------------------------------------------------------------------------
# 1. profiles.code UNIQUE
# ---------------------------------------------------------------------------


class TestProfileModel:
    """Spec 2.2.2 §1 — profiles table."""

    async def test_profile_code_unique(self, db_session: AsyncSession) -> None:
        """Inserting two Profile rows with the same code must raise IntegrityError.

        Reference: spec 2.2.2 §1 — code UNIQUE VARCHAR(16).
        """
        db_session.add(Profile(code="municipal", name="Муніципалітет"))
        await db_session.flush()

        db_session.add(Profile(code="municipal", name="Дублікат"))
        with pytest.raises(IntegrityError):
            await db_session.flush()

        await db_session.rollback()


# ---------------------------------------------------------------------------
# 2. criteria.optimization_type accepts 'max' and 'min'
# ---------------------------------------------------------------------------


class TestCriterionModel:
    """Spec 2.2.2 §2 — criteria table."""

    async def test_criterion_optimization_type_accepts_max_min(
        self, db_session: AsyncSession
    ) -> None:
        """Both 'max' and 'min' values for optimization_type must flush without error.

        Reference: spec 2.2.2 §2 — optimization_type VARCHAR(4), accepts only
        'max'/'min'.  The CHECK constraint rejection of other values is covered by
        test_criterion_optimization_type_rejects_invalid below.
        """
        db_session.add(
            Criterion(
                code="Pop_dens",
                name="Population density",
                unit="persons/km²",
                optimization_type="max",
                scale="ratio",
            )
        )
        db_session.add(
            Criterion(
                code="Land_cost",
                name="Land cost",
                unit="UAH/m²",
                optimization_type="min",
                scale="ratio",
            )
        )
        # Must not raise
        await db_session.flush()
        await db_session.rollback()

    async def test_criterion_optimization_type_rejects_invalid(
        self, db_session: AsyncSession
    ) -> None:
        """An optimization_type value other than 'max'/'min' must raise IntegrityError.

        Reference: spec 2.2.2 §2 — the CHECK constraint enforces only 'max'/'min'.
        """
        db_session.add(
            Criterion(
                code="Bad_crit",
                name="Bad",
                unit="-",
                optimization_type="foo",
                scale="ratio",
            )
        )
        with pytest.raises(IntegrityError):
            await db_session.flush()

        await db_session.rollback()


# ---------------------------------------------------------------------------
# 3. pairwise_matrices composite PK
# ---------------------------------------------------------------------------


class TestPairwiseMatrixEntryModel:
    """Spec 2.2.2 §3 — pairwise_matrices table."""

    async def _create_profile_and_criteria(
        self, db_session: AsyncSession
    ) -> tuple[Profile, Criterion, Criterion]:
        profile = Profile(code="p_pw", name="PW Profile")
        ci = Criterion(
            code="c_pw_i", name="Criterion I", unit="-", optimization_type="max", scale="ratio"
        )
        cj = Criterion(
            code="c_pw_j", name="Criterion J", unit="-", optimization_type="min", scale="ratio"
        )
        db_session.add_all([profile, ci, cj])
        await db_session.flush()
        return profile, ci, cj

    async def test_pairwise_matrix_composite_pk(self, db_session: AsyncSession) -> None:
        """Duplicate (profile_id, criterion_i_id, criterion_j_id) must raise IntegrityError.

        Reference: spec 2.2.2 §3 — composite PK on those three columns.
        """
        profile, ci, cj = await self._create_profile_and_criteria(db_session)

        db_session.add(
            PairwiseMatrixEntry(
                profile_id=profile.id,
                criterion_i_id=ci.id,
                criterion_j_id=cj.id,
                l=1.0,
                m=1.0,
                u=1.0,
            )
        )
        await db_session.flush()

        # Same composite key — must violate PK constraint
        db_session.add(
            PairwiseMatrixEntry(
                profile_id=profile.id,
                criterion_i_id=ci.id,
                criterion_j_id=cj.id,
                l=2.0,
                m=3.0,
                u=4.0,
            )
        )
        with pytest.raises(IntegrityError):
            await db_session.flush()

        await db_session.rollback()


# ---------------------------------------------------------------------------
# 4. locations.geom persists in WGS-84
# ---------------------------------------------------------------------------


class TestLocationModel:
    """Spec 2.2.2 §4 — locations table."""

    async def test_location_geom_persists_as_wgs84(self, db_session: AsyncSession) -> None:
        """A Location's POINT geometry must survive a flush-and-read with coordinate precision 1e-6.

        The test also verifies SRID=4326 (WGS-84) is stored correctly.
        Reference: spec 2.2.2 §4 — geom GEOMETRY(Point, 4326).
        """
        # Троєщина, Київ
        lon, lat = 30.5234, 50.5189

        loc = Location(
            name="Троєщина (test)",
            address="вул. Тимошенка, 1",
            district="Деснянський",
            geom=f"SRID=4326;POINT({lon} {lat})",
        )
        db_session.add(loc)
        await db_session.flush()

        row = await db_session.execute(
            text(
                "SELECT ST_X(geom::geometry) AS x, ST_Y(geom::geometry) AS y, "
                "ST_SRID(geom::geometry) AS srid "
                "FROM locations WHERE id = :id"
            ).bindparams(id=loc.id)
        )
        result = row.one()

        assert abs(result.x - lon) < 1e-6, f"longitude mismatch: {result.x} != {lon}"
        assert abs(result.y - lat) < 1e-6, f"latitude mismatch: {result.y} != {lat}"
        assert result.srid == 4326, f"unexpected SRID: {result.srid}"

        await db_session.rollback()

    async def test_location_gist_index_exists(self, db_session: AsyncSession) -> None:
        """A GiST index on locations.geom must exist after schema creation.

        Reference: spec 2.2.2 §4 — GiST(geom).
        """
        rows = await db_session.execute(
            text(
                "SELECT indexdef FROM pg_indexes "
                "WHERE tablename = 'locations' AND indexdef ILIKE '%gist%'"
            )
        )
        results = rows.fetchall()
        assert len(results) >= 1, (
            "No GiST index found on locations table. "
            "Expected at least one index matching ILIKE '%gist%'."
        )


# ---------------------------------------------------------------------------
# 5. existing_stations — basic persistence (no extra constraints beyond geom)
# ---------------------------------------------------------------------------


class TestExistingStationModel:
    """Spec 2.2.2 §5 — existing_stations table.

    The spec does not define uniqueness or CHECK constraints beyond the geom
    column type and GiST index.  This test confirms the model persists and
    the GiST index is present.
    """

    async def test_existing_station_gist_index_exists(self, db_session: AsyncSession) -> None:
        """A GiST index on existing_stations.geom must exist after schema creation.

        Reference: spec 2.2.2 §5 — GiST(geom).
        """
        rows = await db_session.execute(
            text(
                "SELECT indexdef FROM pg_indexes "
                "WHERE tablename = 'existing_stations' AND indexdef ILIKE '%gist%'"
            )
        )
        results = rows.fetchall()
        assert len(results) >= 1, "No GiST index found on existing_stations table."


# ---------------------------------------------------------------------------
# 6. evaluation_runs.weights_vector JSON round-trip
# ---------------------------------------------------------------------------


class TestEvaluationRunModel:
    """Spec 2.2.2 §6 — evaluation_runs table."""

    async def _create_profile(self, db_session: AsyncSession) -> Profile:
        p = Profile(code="p_eval", name="Eval Profile")
        db_session.add(p)
        await db_session.flush()
        return p

    async def test_evaluation_run_weights_vector_roundtrip(self, db_session: AsyncSession) -> None:
        """A dict stored in weights_vector must be read back as an equal dict.

        Reference: spec 2.2.2 §6 — weights_vector JSON.
        """
        profile = await self._create_profile(db_session)

        weights = {"c1": 0.4, "c2": 0.3, "c3": 0.3}
        run = EvaluationRun(
            profile_id=profile.id,
            status="done",
            weights_vector=weights,
        )
        db_session.add(run)
        await db_session.flush()

        # expire the instance so the next access hits the DB
        db_session.expire(run)
        await db_session.refresh(run)

        assert run.weights_vector == weights, (
            f"weights_vector roundtrip failed: got {run.weights_vector}"
        )
        await db_session.rollback()


# ---------------------------------------------------------------------------
# 7. ranking_items CHECK rank >= 1
# ---------------------------------------------------------------------------


class TestRankingItemModel:
    """Spec 2.2.2 §7 — ranking_items table."""

    async def _create_run_and_location(
        self, db_session: AsyncSession
    ) -> tuple[EvaluationRun, Location]:
        profile = Profile(code="p_rank", name="Rank Profile")
        db_session.add(profile)
        await db_session.flush()

        run = EvaluationRun(profile_id=profile.id, status="done", weights_vector={})
        loc = Location(
            name="Test Location",
            address="вул. Тестова, 1",
            district="Тестовий",
            geom="SRID=4326;POINT(30.5 50.5)",
        )
        db_session.add_all([run, loc])
        await db_session.flush()
        return run, loc

    async def test_ranking_item_check_rank_positive(self, db_session: AsyncSession) -> None:
        """rank=0 must violate the CHECK rank>=1 constraint and raise IntegrityError.

        Reference: spec 2.2.2 §7 — CHECK: rank>=1.
        """
        run, loc = await self._create_run_and_location(db_session)

        db_session.add(
            RankingItem(
                evaluation_id=run.id,
                location_id=loc.id,
                rank=0,  # invalid — must fail CHECK
                closeness_coefficient=0.5,
                distance_to_positive=0.1,
                distance_to_negative=0.1,
            )
        )
        with pytest.raises(IntegrityError):
            await db_session.flush()

        await db_session.rollback()

    async def test_ranking_item_check_closeness_bounds(self, db_session: AsyncSession) -> None:
        """closeness_coefficient outside [0,1] must raise IntegrityError.

        Reference: spec 2.2.2 §7 — CHECK: closeness_coefficient BETWEEN 0 AND 1.
        """
        run, loc = await self._create_run_and_location(db_session)

        db_session.add(
            RankingItem(
                evaluation_id=run.id,
                location_id=loc.id,
                rank=1,
                closeness_coefficient=1.5,  # out of range
                distance_to_positive=0.1,
                distance_to_negative=0.1,
            )
        )
        with pytest.raises(IntegrityError):
            await db_session.flush()

        await db_session.rollback()


# ---------------------------------------------------------------------------
# 8. sensitivity_records cascade delete
# ---------------------------------------------------------------------------


class TestSensitivityRecordModel:
    """Spec 2.2.2 §8 — sensitivity_records table."""

    async def test_sensitivity_records_cascade_delete(self, db_session: AsyncSession) -> None:
        """Deleting an EvaluationRun must cascade-delete the linked SensitivityRecord.

        Reference: spec 2.2.2 §8 — FK=evaluation_id ON DELETE CASCADE.
        """
        profile = Profile(code="p_sens", name="Sens Profile")
        db_session.add(profile)
        await db_session.flush()

        run = EvaluationRun(profile_id=profile.id, status="done", weights_vector={})
        db_session.add(run)
        await db_session.flush()

        record = SensitivityRecord(
            evaluation_id=run.id,
            iterations=1000,
            perturbation=0.15,
            stability_matrix={"L1": [0.9, 0.08, 0.02]},
            confidence_intervals={"L1": [0.82, 0.96]},
        )
        db_session.add(record)
        await db_session.flush()

        record_evaluation_id = record.evaluation_id

        # Delete the parent run; the cascade should remove the record too
        await db_session.delete(run)
        await db_session.flush()

        remaining = await db_session.execute(
            text(
                "SELECT evaluation_id FROM sensitivity_records WHERE evaluation_id = :id"
            ).bindparams(id=record_evaluation_id)
        )
        assert remaining.fetchone() is None, (
            "SensitivityRecord was not deleted when its parent EvaluationRun was deleted. "
            "Check that ON DELETE CASCADE is defined on the FK."
        )
        await db_session.rollback()
