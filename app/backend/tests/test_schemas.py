"""Red-phase tests for Pydantic v2 DTO schemas (spec 2.1.6).

These tests are written BEFORE the schema implementations exist (Task #7).
They will fail with ImportError / ModuleNotFoundError until Task #8 provides
the actual schema modules.

No database fixtures are used here — validation is pure Pydantic logic.
SimpleNamespace stands in for ORM objects where from_attributes=True is needed.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from geoalchemy2 import WKTElement
from pydantic import ValidationError

from schemas.evaluation import (
    EvaluationCreate,
    FuzzyNumber,
    RankingItemRead,
)
from schemas.location import LocationCreate, LocationRead
from schemas.sensitivity import SensitivityRequest

# ---------------------------------------------------------------------------
# Shared fixture data — copied from mcdm/tests/test_fahp.py MATRIX_DOMINANT,
# translated into TFN-object notation {l, m, u}.
# Reference: Chang (1996), European Journal of Operational Research, 95(3).
# Do NOT import from mcdm — schemas/ must be independent of the math kernel.
# ---------------------------------------------------------------------------

VALID_MATRIX = [
    [{"l": 1, "m": 1, "u": 1}, {"l": 5, "m": 7, "u": 9}, {"l": 5, "m": 7, "u": 9}],
    [
        {"l": 1 / 9, "m": 1 / 7, "u": 1 / 5},
        {"l": 1, "m": 1, "u": 1},
        {"l": 1, "m": 1, "u": 1},
    ],
    [
        {"l": 1 / 9, "m": 1 / 7, "u": 1 / 5},
        {"l": 1, "m": 1, "u": 1},
        {"l": 1, "m": 1, "u": 1},
    ],
]


# ===========================================================================
# class TestPairwiseMatrixIn
# Validates EvaluationCreate.pairwiseMatrix (6 tests, spec 2.1.6 §2).
# ===========================================================================


class TestPairwiseMatrixIn:
    """Validation tests for the pairwise comparison matrix embedded in EvaluationCreate."""

    def test_pairwise_matrix_must_be_square(self):
        """Non-square matrix (row lengths differ) must raise ValidationError.

        Spec 2.1.6: the FAHP matrix is n×n by definition; a ragged matrix
        cannot be a valid comparison table.
        """
        ragged = [
            [{"l": 1, "m": 1, "u": 1}],
            [{"l": 1, "m": 1, "u": 1}, {"l": 1, "m": 1, "u": 1}],
        ]
        with pytest.raises(ValidationError) as exc_info:
            EvaluationCreate(profileId=1, pairwiseMatrix=ragged)
        error_text = str(exc_info.value).lower()
        assert "square" in error_text or "квадратн" in error_text

    def test_pairwise_matrix_diagonal_must_be_ones(self):
        """Non-unity diagonal TFN must raise ValidationError.

        Chang (1996): a_ii = (1,1,1) always — comparing a criterion with itself
        yields perfect equality.
        """
        bad_diagonal = [
            [{"l": 1, "m": 2, "u": 3}, {"l": 1, "m": 1, "u": 1}],
            [{"l": 1, "m": 1, "u": 1}, {"l": 1, "m": 1, "u": 1}],
        ]
        with pytest.raises(ValidationError):
            EvaluationCreate(profileId=1, pairwiseMatrix=bad_diagonal)

    def test_pairwise_matrix_l_le_m_le_u(self):
        """TFN with l > m violates the triangular ordering constraint.

        Both a standalone FuzzyNumber and one embedded in the matrix must fail.
        """
        with pytest.raises(ValidationError):
            FuzzyNumber(l=3, m=2, u=4)

        bad_entry = [
            [{"l": 1, "m": 1, "u": 1}, {"l": 3, "m": 2, "u": 4}],
            [{"l": 1, "m": 1, "u": 1}, {"l": 1, "m": 1, "u": 1}],
        ]
        with pytest.raises(ValidationError):
            EvaluationCreate(profileId=1, pairwiseMatrix=bad_entry)

    def test_pairwise_matrix_reciprocal_modal(self):
        """Off-diagonal modal values must satisfy m_ij * m_ji ≈ 1 (tolerance 1e-4).

        If m[0][1] = 3 then m[1][0] must be ≈ 1/3 ≈ 0.333, not 0.5.
        """
        bad_reciprocal = [
            [{"l": 1, "m": 1, "u": 1}, {"l": 2, "m": 3, "u": 4}],
            [{"l": 0.4, "m": 0.5, "u": 0.6}, {"l": 1, "m": 1, "u": 1}],
        ]
        with pytest.raises(ValidationError):
            EvaluationCreate(profileId=1, pairwiseMatrix=bad_reciprocal)

    def test_pairwise_matrix_saaty_scale_bounds(self):
        """TFN components outside [1/9, 9] violate the Saaty scale.

        m = 10 exceeds the maximum; m = 0.1 is below 1/9 ≈ 0.111.
        Both must raise ValidationError.
        """
        too_large = [
            [{"l": 1, "m": 1, "u": 1}, {"l": 7, "m": 10, "u": 10}],
            [{"l": 0.1, "m": 0.1, "u": 0.2}, {"l": 1, "m": 1, "u": 1}],
        ]
        with pytest.raises(ValidationError):
            EvaluationCreate(profileId=1, pairwiseMatrix=too_large)

        too_small = [
            [{"l": 1, "m": 1, "u": 1}, {"l": 0.08, "m": 0.1, "u": 0.2}],
            [{"l": 5, "m": 7, "u": 9}, {"l": 1, "m": 1, "u": 1}],
        ]
        with pytest.raises(ValidationError):
            EvaluationCreate(profileId=1, pairwiseMatrix=too_small)

    def test_pairwise_matrix_valid_3x3_passes(self):
        """A structurally correct 3×3 matrix (MATRIX_DOMINANT from Chang 1996) must not raise.

        Values copied from mcdm/tests/test_fahp.py — not imported to avoid
        cross-module coupling between schemas and the math kernel.
        """
        dto = EvaluationCreate(profileId=1, pairwiseMatrix=VALID_MATRIX)
        assert dto.profile_id == 1
        assert len(dto.pairwise_matrix) == 3


# ===========================================================================
# class TestLocationCreate
# Validates lat/lon bounds for Ukrainian territory (3 tests, spec 2.1.6 §4).
# ===========================================================================


class TestLocationCreate:
    """Boundary validation for LocationCreate coordinates."""

    def test_location_create_latitude_within_ukraine(self):
        """Latitude must be within [44, 53] (approx bounding box of Ukraine).

        lat=60.0 is north of Ukraine; lat=40.0 is south — both must fail.
        """
        with pytest.raises(ValidationError):
            LocationCreate(name="X", latitude=60.0, longitude=30.0)

        with pytest.raises(ValidationError):
            LocationCreate(name="X", latitude=40.0, longitude=30.0)

    def test_location_create_longitude_within_ukraine(self):
        """Longitude must be within [22, 41] (approx bounding box of Ukraine).

        lon=50.0 is east of Ukraine; lon=20.0 is west — both must fail.
        """
        with pytest.raises(ValidationError):
            LocationCreate(name="X", latitude=50.0, longitude=50.0)

        with pytest.raises(ValidationError):
            LocationCreate(name="X", latitude=50.0, longitude=20.0)

    def test_location_read_serializes_with_latitude_longitude(self):
        """LocationRead must extract lat/lon from a WKTElement and exclude 'geom'.

        The ORM column 'geom' (WKBElement / WKTElement) must be converted to
        separate 'latitude' and 'longitude' fields by a @model_validator.
        No live DB session is required — we construct a fake ORM-like object
        with SimpleNamespace to test Pydantic's from_attributes path only.

        Reference: spec 2.1.6 §4 — response shape for GET /api/locations.
        """
        fake_orm = SimpleNamespace(
            id=1,
            name="Майдан",
            address="вул. Хрещатик, 1",
            district="Шевченківський",
            geom=WKTElement("POINT(30.5 50.5)", srid=4326),
        )

        dto = LocationRead.model_validate(fake_orm)
        serialized = dto.model_dump()

        assert serialized["latitude"] == pytest.approx(50.5)
        assert serialized["longitude"] == pytest.approx(30.5)
        assert "geom" not in serialized


# ===========================================================================
# class TestSensitivityRequest
# Validates default values and bounds for Monte Carlo parameters (3 tests).
# Reference: spec 2.1.6 §6, mcdm formulas (1.15)–(1.17).
# ===========================================================================


class TestSensitivityRequest:
    """Default values and boundary validation for SensitivityRequest."""

    def test_sensitivity_request_defaults(self):
        """SensitivityRequest() with no arguments must use documented defaults.

        Default iterations=10000, perturbation=0.15 are the documented MC
        defaults (seed=42, N=10000, delta=0.15).
        """
        req = SensitivityRequest()
        assert req.iterations == 10_000
        assert req.perturbation == pytest.approx(0.15)

    def test_sensitivity_request_iterations_bounds(self):
        """iterations must be in [100, 100_000]; values outside must raise.

        Lower bound: 100 (statistically meaningful minimum).
        Upper bound: 100_000 (practical server-side limit).
        """
        with pytest.raises(ValidationError):
            SensitivityRequest(iterations=50)

        with pytest.raises(ValidationError):
            SensitivityRequest(iterations=200_000)

        # Boundary values that must pass:
        SensitivityRequest(iterations=100)
        SensitivityRequest(iterations=100_000)

    def test_sensitivity_request_perturbation_bounds(self):
        """perturbation must be in (0, 0.5]; endpoints and out-of-range must raise.

        gt=0 means 0 is invalid; le=0.5 means 0.5 is valid but 0.6 is not.
        """
        with pytest.raises(ValidationError):
            SensitivityRequest(perturbation=0)

        with pytest.raises(ValidationError):
            SensitivityRequest(perturbation=0.6)

        # Values within the valid range:
        SensitivityRequest(perturbation=0.5)
        SensitivityRequest(perturbation=0.001)


# ===========================================================================
# class TestRankingItemRead
# Validates ORM-field renaming and camelCase alias_generator (1 test).
# Reference: spec 2.1.6 §7 — response body for POST /api/evaluations.
# ===========================================================================


class TestRankingItemRead:
    """ORM-to-DTO field renaming and camelCase alias tests for RankingItemRead."""

    def test_ranking_item_read_renames_distances_to_s_plus_s_minus_and_camel_case(self):
        """ORM fields must be renamed and serialised as camelCase aliases.

        Checks three things simultaneously:
        1. alias_generator=to_camel → camelCase keys in model_dump(by_alias=True)
        2. distance_to_positive → sPlus (explicit Field alias)
        3. distance_to_negative → sMinus (explicit Field alias)
        4. closeness_coefficient → closeness (explicit Field alias)
        5. from_attributes=True — construction from a SimpleNamespace ORM proxy.

        Reference: spec 2.1.6 §7; ORM model db/models/evaluation.py RankingItem.
        """
        orm = SimpleNamespace(
            location_id=42,
            rank=1,
            closeness_coefficient=0.6,
            distance_to_positive=0.1,
            distance_to_negative=0.2,
        )

        dto = RankingItemRead.model_validate(orm)
        serialized = dto.model_dump(by_alias=True)

        assert serialized == {
            "locationId": 42,
            "rank": 1,
            "closeness": 0.6,
            "sPlus": 0.1,
            "sMinus": 0.2,
        }
