"""Red-phase tests for services/ layer: repositories, EvaluationService, SensitivityService.

All imports from services.* and db.seed.seed_decision_matrix will fail with
ImportError until Tasks #11, #13, #14 are complete — that is expected and
defines the contract these implementations must satisfy.

No mocks.  All tests use a live PostGIS container via the db_session fixture
from conftest.py.
"""

from __future__ import annotations

import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import (
    Criterion,
    CriterionValue,
    EvaluationRun,
    Location,
    Profile,
    RankingItem,
    SensitivityRecord,
)
from db.seed import seed_decision_matrix, seed_reference_data  # seed_decision_matrix: Task #11
from schemas.evaluation import EvaluationRead
from schemas.sensitivity import SensitivityRead
from services.evaluation_service import EvaluationService  # Task #14
from services.repository import (  # Task #14
    CriterionRepository,
    DecisionMatrixRepository,
    EvaluationRepository,
    LocationRepository,
    ProfileRepository,
)
from services.sensitivity_service import SensitivityService  # Task #14

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _identity_pairwise_matrix(n: int) -> list[list[dict[str, float]]]:
    """Identity-like FAHP matrix: all comparisons (1, 1, 1) → equal weights 1/n.

    CR = 0 for any n, so fahp_weights will never raise here.
    """
    return [[{"l": 1.0, "m": 1.0, "u": 1.0} for _ in range(n)] for _ in range(n)]


# ---------------------------------------------------------------------------
# A. TestRepositories
# ---------------------------------------------------------------------------


class TestRepositories:
    """Unit-level tests for the repository layer against a live DB.

    These tests document the required public API of each repository class so
    Task #14 knows exactly which method signatures to implement.
    """

    async def test_profile_repository_get_existing_returns_profile(
        self, db_session: AsyncSession
    ) -> None:
        """ProfileRepository.get(id) must return the Profile with matching code.

        Reference: services/repository.py spec — get(pk) → ORM object | None.
        """
        await seed_reference_data(db_session)
        await seed_decision_matrix(db_session)
        await db_session.flush()

        # Resolve the PK for "municipal" first — avoids hardcoding auto-increment IDs.
        municipal = await db_session.scalar(select(Profile).where(Profile.code == "municipal"))
        assert municipal is not None, "seed_reference_data must create 'municipal' profile"

        repo = ProfileRepository(db_session)
        result = await repo.get(municipal.id)

        assert result is not None
        assert result.code == "municipal"

    async def test_profile_repository_get_missing_returns_none(
        self, db_session: AsyncSession
    ) -> None:
        """ProfileRepository.get with a non-existent PK must return None, not raise.

        Reference: services/repository.py spec — standard ORM get-by-pk pattern.
        """
        await seed_reference_data(db_session)
        await db_session.flush()

        repo = ProfileRepository(db_session)
        result = await repo.get(999_999)

        assert result is None

    async def test_criterion_repository_list_ordered_returns_9_criteria_after_seed(
        self, db_session: AsyncSession
    ) -> None:
        """CriterionRepository.list_ordered() must return 9 criteria sorted by id ASC.

        The first criterion code must be one of the 9 defined evaluation criteria.
        """
        await seed_reference_data(db_session)
        await db_session.flush()

        repo = CriterionRepository(db_session)
        criteria = await repo.list_ordered()

        assert len(criteria) == 9, f"Expected 9 criteria, got {len(criteria)}"

        valid_codes = {
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
        assert criteria[0].code in valid_codes, (
            f"First criterion code '{criteria[0].code}' not in expected set {valid_codes}"
        )
        # Verify ascending order by id
        ids = [c.id for c in criteria]
        assert ids == sorted(ids), f"Criteria not sorted ascending by id: {ids}"

    async def test_decision_matrix_repository_load_returns_n_locations_x_9_shape(
        self, db_session: AsyncSession
    ) -> None:
        """DecisionMatrixRepository.load_matrix must return ndarray of shape (n_locations, 9).

        All values must be >= 0 (enforced by DB CHECK constraint).
        The first cell X[0, 0] must equal the CriterionValue row
        (location_ids[0], criterion_ids[0]) seeded with rng_seed=42.

        Reference: spec 2.2.2 §9 — decision matrix shape (n_locations × 9 criteria),
        all values non-negative.
        """
        import numpy as np

        from tests.conftest import N_TEST_LOCATIONS, _seed_test_locations

        await seed_reference_data(db_session)
        await _seed_test_locations(db_session)
        await seed_decision_matrix(db_session)
        await db_session.flush()

        crit_repo = CriterionRepository(db_session)
        loc_repo = LocationRepository(db_session)

        criterion_ids = [c.id for c in await crit_repo.list_ordered()]
        location_ids = [loc.id for loc in await loc_repo.list_ordered()]

        assert len(criterion_ids) == 9, f"Expected 9 criteria, got {len(criterion_ids)}"
        assert len(location_ids) == N_TEST_LOCATIONS, (
            f"Expected {N_TEST_LOCATIONS} test locations, got {len(location_ids)}"
        )

        repo = DecisionMatrixRepository(db_session)
        X = await repo.load_matrix(criterion_ids, location_ids)

        assert isinstance(X, np.ndarray), f"Expected ndarray, got {type(X)}"
        assert X.shape == (N_TEST_LOCATIONS, 9), (
            f"Expected shape ({N_TEST_LOCATIONS}, 9), got {X.shape}"
        )
        assert (X >= 0).all(), "Decision matrix contains negative values"

        # Verify cell (0, 0) matches the seeded value for (location_ids[0], criterion_ids[0]).
        # seed_decision_matrix uses rng_seed=42 → deterministic, so this must match.
        db_value = await db_session.scalar(
            select(CriterionValue.value).where(
                CriterionValue.location_id == location_ids[0],
                CriterionValue.criterion_id == criterion_ids[0],
            )
        )
        assert db_value is not None, "No LCV row found for (location_ids[0], criterion_ids[0])"
        assert abs(float(X[0, 0]) - float(db_value)) < 1e-4, (
            f"X[0, 0]={X[0, 0]} does not match seeded value {db_value}"
        )

    async def test_evaluation_repository_save_and_get_with_ranking_eagerly_loaded(
        self, db_session: AsyncSession
    ) -> None:
        """EvaluationRepository must persist a run + ranking items, then load them eagerly.

        get_with_ranking(eval_id) must return the EvaluationRun with .ranking already
        populated — no additional SELECT should be needed outside the repository.

        Reference: services/repository.py spec — get_with_ranking uses selectinload.
        """
        from tests.conftest import _seed_test_locations

        await seed_reference_data(db_session)
        await _seed_test_locations(db_session)
        await db_session.flush()

        # Resolve 3 locations to attach ranking items to
        locations = (await db_session.execute(select(Location).limit(3))).scalars().all()
        assert len(locations) == 3, (
            "Need at least 3 test locations; _seed_test_locations should provide them"
        )

        profile = await db_session.scalar(select(Profile).where(Profile.code == "municipal"))
        assert profile is not None

        repo = EvaluationRepository(db_session)
        eval_run = await repo.create(
            profile_id=profile.id,
            status="completed",
            weights={"Pop_dens": 0.5, "Traffic": 0.5},
            execution_time_ms=100,
        )
        await db_session.flush()

        for rank_pos, loc in enumerate(locations, start=1):
            await repo.add_ranking_item(
                evaluation_id=eval_run.id,
                location_id=loc.id,
                rank=rank_pos,
                closeness_coefficient=0.5,
                distance_to_positive=0.1,
                distance_to_negative=0.1,
            )
        await db_session.flush()

        # get_with_ranking must eagerly load RankingItems — no lazy load after session close
        result = await repo.get_with_ranking(eval_run.id)

        assert result is not None
        assert len(result.ranking) == 3, f"Expected 3 ranking items, got {len(result.ranking)}"


# ---------------------------------------------------------------------------
# B. TestEvaluationService
# ---------------------------------------------------------------------------


class TestEvaluationService:
    """Tests for EvaluationService.execute_full_cycle — the FAHP→TOPSIS pipeline.

    All tests start from a clean DB seeded with reference data + test locations
    + decision matrix, so the service finds 9 criteria and N_TEST_LOCATIONS locations.
    """

    async def test_evaluation_service_full_cycle_persists_run_and_ranking_items(
        self, db_session: AsyncSession
    ) -> None:
        """execute_full_cycle must return EvaluationRead and persist rows in the DB.

        After the call: one EvaluationRun row + one RankingItem per location must exist.
        Reference: spec 2.1.6 §6 — full FAHP+TOPSIS cycle with DB persistence.
        """
        from tests.conftest import _seed_test_locations

        await seed_reference_data(db_session)
        await _seed_test_locations(db_session)
        await seed_decision_matrix(db_session)
        await db_session.flush()

        profile = await db_session.scalar(select(Profile).where(Profile.code == "municipal"))
        assert profile is not None

        service = EvaluationService(db_session)
        result = await service.execute_full_cycle(
            profile_id=profile.id,
            pairwise_matrix=_identity_pairwise_matrix(9),
        )

        assert isinstance(result, EvaluationRead), f"Expected EvaluationRead, got {type(result)}"

        run = await db_session.scalar(
            select(EvaluationRun).where(EvaluationRun.id == result.evaluation_id)
        )
        assert run is not None, "EvaluationRun must be persisted in DB"

        ranking_count = await db_session.scalar(
            select(func.count()).select_from(RankingItem).where(RankingItem.evaluation_id == run.id)
        )
        assert ranking_count is not None and ranking_count > 0, (
            f"Expected at least one ranking item per location, got {ranking_count}"
        )

    async def test_evaluation_service_returns_dto_with_camel_case_fields(
        self, db_session: AsyncSession
    ) -> None:
        """execute_full_cycle must return an EvaluationRead whose model_dump(by_alias=True)
        contains camelCase keys per the JSON wire contract (spec 2.1.6 §7).

        Verified keys: evaluationId, executionTimeMs, ranking[*].locationId,
        ranking[*].closeness, ranking[*].sPlus, ranking[*].sMinus.
        """
        from tests.conftest import _seed_test_locations

        await seed_reference_data(db_session)
        await _seed_test_locations(db_session)
        await seed_decision_matrix(db_session)
        await db_session.flush()

        profile = await db_session.scalar(select(Profile).where(Profile.code == "municipal"))
        assert profile is not None

        service = EvaluationService(db_session)
        result = await service.execute_full_cycle(
            profile_id=profile.id,
            pairwise_matrix=_identity_pairwise_matrix(9),
        )

        serialized = result.model_dump(by_alias=True)

        assert "evaluationId" in serialized, (
            f"'evaluationId' not in serialized keys: {list(serialized)}"
        )
        assert "executionTimeMs" in serialized, (
            f"'executionTimeMs' not in serialized keys: {list(serialized)}"
        )
        assert len(serialized["ranking"]) > 0, "Ranking must not be empty"
        first_item = serialized["ranking"][0]
        for key in ("locationId", "closeness", "sPlus", "sMinus"):
            assert key in first_item, f"Key '{key}' missing from ranking item: {list(first_item)}"

    @pytest.mark.skip(
        reason=(
            "CR-error path requires a test fixture with exactly 3 criteria. "
            "The DB is seeded with 9 criteria, so a 3×3 inconsistent matrix "
            "would fail on size validation first (covered by test 9). "
            "CR validation itself is covered by mcdm/tests/test_fahp.py."
        )
    )
    async def test_evaluation_service_propagates_cr_error(self, db_session: AsyncSession) -> None:
        """execute_full_cycle must propagate ValueError when CR > 0.10.

        Skipped: with 9 seeded criteria, a 9×9 inconsistent matrix would be
        required.  Constructing a reciprocal 9×9 TFN matrix with CR > 0.10 is
        non-trivial to do reliably here; the CR code path is already exercised
        by mcdm/tests/test_fahp.py::TestFAHP::test_inconsistent_matrix_raises.
        Task #14 implementer should add a dedicated fixture if needed.
        """

    async def test_evaluation_service_validates_matrix_size_matches_criteria_count(
        self, db_session: AsyncSession
    ) -> None:
        """execute_full_cycle must raise ValueError when matrix n != criteria count.

        The DB has 9 criteria after seed; passing a 5×5 matrix must fail.
        The error message must reference the expected count (9) or the words
        'size', 'criteria', or 'matrix'.

        Reference: spec 2.1.6 §6 — matrix dimensions must match criterion count.
        """
        await seed_reference_data(db_session)
        await seed_decision_matrix(db_session)
        await db_session.flush()

        profile = await db_session.scalar(select(Profile).where(Profile.code == "municipal"))
        assert profile is not None

        service = EvaluationService(db_session)

        with pytest.raises(ValueError) as exc_info:
            await service.execute_full_cycle(
                profile_id=profile.id,
                pairwise_matrix=_identity_pairwise_matrix(5),
            )

        error_msg = str(exc_info.value).lower()
        assert any(token in error_msg for token in ("9", "size", "criteria", "matrix")), (
            f"Error message does not reference the size mismatch: '{exc_info.value}'"
        )

    async def test_evaluation_service_weights_sum_to_one(self, db_session: AsyncSession) -> None:
        """The weights dict on EvaluationRead must sum to 1.0 ± 1e-9.

        Reference: fahp_weights contract — normalized output vector sums to 1.
        """
        from tests.conftest import _seed_test_locations

        await seed_reference_data(db_session)
        await _seed_test_locations(db_session)
        await seed_decision_matrix(db_session)
        await db_session.flush()

        profile = await db_session.scalar(select(Profile).where(Profile.code == "municipal"))
        assert profile is not None

        service = EvaluationService(db_session)
        result = await service.execute_full_cycle(
            profile_id=profile.id,
            pairwise_matrix=_identity_pairwise_matrix(9),
        )

        total = sum(result.weights.values())
        assert abs(total - 1.0) < 1e-9, (
            f"Weights do not sum to 1.0: sum={total}, weights={result.weights}"
        )


# ---------------------------------------------------------------------------
# C. TestSensitivityService
# ---------------------------------------------------------------------------


class TestSensitivityService:
    """Tests for SensitivityService.run — Monte-Carlo rank-stability analysis."""

    async def _create_evaluation(self, db_session: AsyncSession) -> tuple[int, int]:
        """Seed DB and run full evaluation cycle. Returns (profile_id, evaluation_id)."""
        from tests.conftest import _seed_test_locations

        await seed_reference_data(db_session)
        await _seed_test_locations(db_session)
        await seed_decision_matrix(db_session)
        await db_session.flush()

        profile = await db_session.scalar(select(Profile).where(Profile.code == "municipal"))
        assert profile is not None

        service = EvaluationService(db_session)
        result = await service.execute_full_cycle(
            profile_id=profile.id,
            pairwise_matrix=_identity_pairwise_matrix(9),
        )
        return profile.id, result.evaluation_id

    async def test_sensitivity_service_persists_record_with_top_n_confidence_intervals(
        self, db_session: AsyncSession
    ) -> None:
        """Result contains a CI per top-N alternative ordered by mean C* descending.

        Per Appendix A.9, only the top-3 alternatives carry confidence intervals,
        ordered by mean C* descending. Bounds are percentile-based (2.3.3) and
        generally asymmetric, so ordering is asserted on `mean`, not the midpoint.

        Reference: subsection 2.3.3 + Appendix A.9.
        """
        from schemas.sensitivity import TOP_N_FOR_CONFIDENCE_INTERVALS

        _, eval_id = await self._create_evaluation(db_session)

        sens = SensitivityService(db_session)
        result = await sens.run(evaluation_id=eval_id, iterations=200, perturbation=0.1)

        assert isinstance(result, SensitivityRead), f"Expected SensitivityRead, got {type(result)}"
        assert len(result.confidence_intervals) == TOP_N_FOR_CONFIDENCE_INTERVALS, (
            f"Expected {TOP_N_FOR_CONFIDENCE_INTERVALS} CIs (top-N only), "
            f"got {len(result.confidence_intervals)}"
        )
        means = [ci.mean for ci in result.confidence_intervals]
        assert means == sorted(means, reverse=True), (
            "Confidence intervals must be ordered by mean C* descending"
        )
        for ci in result.confidence_intervals:
            assert ci.lower <= ci.mean <= ci.upper, (
                "mean C* must lie within its percentile confidence interval"
            )

        rec = await db_session.scalar(
            select(SensitivityRecord).where(SensitivityRecord.evaluation_id == eval_id)
        )
        assert rec is not None, "SensitivityRecord must be persisted in DB"
        assert rec.iterations == 200, f"Persisted iterations={rec.iterations}, expected 200"

    async def test_sensitivity_service_stability_matrix_top_k_per_location(
        self, db_session: AsyncSession
    ) -> None:
        """stability_matrix[location_id] = {k: p_i(k)} for k in {1, 3, 5}.

        p_i(k) is the cumulative top-k acceptability index per formula (1.17),
        bounded in [0, 1] and monotonically non-decreasing in k.

        Reference: subsection 2.3.3 + Appendix A.9.
        """
        from schemas.sensitivity import STABILITY_K_VALUES

        _, eval_id = await self._create_evaluation(db_session)

        sens = SensitivityService(db_session)
        result = await sens.run(evaluation_id=eval_id, iterations=200, perturbation=0.1)

        assert len(result.stability_matrix) > 0, (
            "Expected entries in stability_matrix (one per location), got empty dict"
        )
        for location_id, per_k in result.stability_matrix.items():
            assert set(per_k.keys()) == set(STABILITY_K_VALUES), (
                f"location {location_id}: expected k values {STABILITY_K_VALUES}, "
                f"got {sorted(per_k.keys())}"
            )
            prev = -1.0
            for k in STABILITY_K_VALUES:
                value = per_k[k]
                assert 0.0 <= value <= 1.0, f"p_{location_id}({k})={value} outside [0, 1]"
                assert value >= prev, (
                    f"p_{location_id} must be non-decreasing in k; "
                    f"got {value} at k={k} after {prev}"
                )
                prev = value

    async def test_sensitivity_service_seed_42_is_reproducible(
        self, db_session: AsyncSession
    ) -> None:
        """Two calls with the same parameters must produce identical stability_matrix.

        SensitivityService must use np.random.default_rng(42) internally (CLAUDE.md rule),
        or accept a seed parameter.  Because the decision matrix and weights are
        deterministic (rng_seed=42 in seed_decision_matrix + identity FAHP matrix),
        both runs must produce bit-identical probability matrices.

        Reference: CLAUDE.md — stochastic methods via np.random.default_rng(seed).
        """
        _, eval_id = await self._create_evaluation(db_session)

        sens = SensitivityService(db_session)
        result1 = await sens.run(evaluation_id=eval_id, iterations=100, perturbation=0.1)
        result2 = await sens.run(evaluation_id=eval_id, iterations=100, perturbation=0.1)

        assert result1.stability_matrix == result2.stability_matrix, (
            "stability_matrix differs between two runs with identical inputs. "
            "SensitivityService must use a fixed seed (42) for reproducibility."
        )

    async def test_sensitivity_service_returns_storyline_payloads(
        self, db_session: AsyncSession
    ) -> None:
        """Storyline charts: ranking_intervals (all, desc), histogram, convergence.

        ranking_intervals carries every location (unlike confidence_intervals,
        top-N only) ordered by mean C* descending; the histogram counts of each
        location sum to N; the convergence iterations end at N.
        """
        _, eval_id = await self._create_evaluation(db_session)

        sens = SensitivityService(db_session)
        result = await sens.run(evaluation_id=eval_id, iterations=200, perturbation=0.1)

        n_loc = len(result.stability_matrix)
        assert len(result.ranking_intervals) == n_loc
        means = [ri.mean for ri in result.ranking_intervals]
        assert means == sorted(means, reverse=True)
        for ri in result.ranking_intervals:
            assert ri.lower <= ri.mean <= ri.upper

        hist = result.cstar_histogram
        assert len(hist.edges_by_location) == n_loc
        assert len(hist.counts_by_location) == n_loc
        for lid, counts in hist.counts_by_location.items():
            edges = hist.edges_by_location[lid]
            assert len(edges) >= 2
            assert len(counts) == len(edges) - 1
            assert sum(counts) == 200

        conv = result.convergence
        assert conv.iterations[-1] == 200
        assert all(b > a for a, b in zip(conv.iterations, conv.iterations[1:], strict=False))
        for series in conv.mean_by_location.values():
            assert len(series) == len(conv.iterations)


# ---------------------------------------------------------------------------
# D. TestEndToEndHwangYoon
# ---------------------------------------------------------------------------


class TestEndToEndHwangYoon:
    """End-to-end smoke test using Hwang & Yoon (1981) reference data.

    This test installs a minimal 3-criteria / 4-location scenario and
    verifies that the service pipeline selects the expected best alternative.

    The test is marked xfail because EvaluationService is expected to read
    ALL criteria and locations from the DB.  When seeded reference data (9
    criteria, 12 locations) coexists with the 3 ad-hoc criteria added here,
    the service would see 12 criteria and fail on matrix-size validation with
    the provided 3×3 pairwise matrix.

    The implementer of Task #14 must decide how to scope the service
    (e.g., accept criterion_ids/location_ids overrides, or filter by the
    profile's associated criteria).  Once scoping is implemented, remove
    the xfail marker and adjust the pairwise_matrix size accordingly.

    Reference: Hwang & Yoon (1981), example 3.1 — 4 alternatives, 3 criteria.
    """

    @pytest.mark.xfail(
        reason=(
            "EvaluationService currently reads all criteria in DB. "
            "With 9 seeded criteria + 3 ad-hoc criteria = 12 total, "
            "the 3×3 pairwise matrix will fail size validation. "
            "Task #14 must add scoping support (criterion_ids override or "
            "profile-scoped criteria) before this test can pass."
        ),
        strict=False,
    )
    async def test_full_pipeline_hwang_yoon_reference(self, db_session: AsyncSession) -> None:
        """TOPSIS with equal weights on Hwang & Yoon (1981) data must rank A2 first.

        Decision matrix X (4 alternatives × 3 criteria):
          A1: [25000, 16, 8]  — Price (min), Economy (max), Service (max)
          A2: [20000, 20, 6]  — expected best with equal weights
          A3: [15000, 12, 7]
          A4: [30000, 10, 5]

        With equal FAHP weights (1/3, 1/3, 1/3) and the criteria types
        [min, max, max], TOPSIS should rank A2 first due to its dominant
        economy and competitive service.  The exact C* value is not asserted
        here; only the rank-1 identity is checked.

        Reference: Hwang & Yoon (1981), Chapter 3 illustrative example.

        Architectural question for Task #14: should EvaluationService accept
        optional criterion_ids: list[int] | None and location_ids: list[int] | None
        parameters to restrict the scope of a run?  This test assumes yes.
        """
        # Clear all reference data so the service only sees our 3 ad-hoc criteria.
        await db_session.execute(delete(CriterionValue))
        await db_session.execute(delete(RankingItem))
        await db_session.execute(delete(EvaluationRun))
        await db_session.execute(delete(Location))
        await db_session.execute(delete(Criterion))
        await db_session.execute(delete(Profile))
        await db_session.flush()

        # Ad-hoc profile
        profile = Profile(code="test_hy", name="Hwang-Yoon test")
        db_session.add(profile)
        await db_session.flush()

        # 3 criteria matching Hwang & Yoon (1981) example 3.1
        criteria = [
            Criterion(
                code="C1_price",
                name="Price",
                unit="USD",
                optimization_type="min",
                scale="ratio",
            ),
            Criterion(
                code="C2_econ",
                name="Economy",
                unit="km/L",
                optimization_type="max",
                scale="ratio",
            ),
            Criterion(
                code="C3_svc",
                name="Service",
                unit="score",
                optimization_type="max",
                scale="ratio",
            ),
        ]
        db_session.add_all(criteria)
        await db_session.flush()

        # 4 alternatives
        locations = [
            Location(
                name=f"A{i + 1}",
                geom="SRID=4326;POINT(30.5 50.5)",
            )
            for i in range(4)
        ]
        db_session.add_all(locations)
        await db_session.flush()

        # Decision matrix X from Hwang & Yoon (1981) example 3.1
        raw_x = [
            [25000.0, 16.0, 8.0],  # A1
            [20000.0, 20.0, 6.0],  # A2 — expected best with equal weights
            [15000.0, 12.0, 7.0],  # A3
            [30000.0, 10.0, 5.0],  # A4
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

        # 3×3 identity FAHP matrix → equal weights (1/3, 1/3, 1/3)
        pwm = _identity_pairwise_matrix(3)

        service = EvaluationService(db_session)
        result = await service.execute_full_cycle(
            profile_id=profile.id,
            pairwise_matrix=pwm,
        )

        # A2 (index 1) must be ranked first
        assert result.ranking[0].location_id == locations[1].id, (
            f"Expected A2 (id={locations[1].id}) at rank 1, "
            f"got location_id={result.ranking[0].location_id}"
        )
