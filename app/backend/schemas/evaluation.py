"""DTOs for FAHP+TOPSIS evaluation cycle (spec 2.1.6 §6–7).

FuzzyNumber enforces the triangular ordering l ≤ m ≤ u and the Saaty scale
[1/9, 9] on the modal value. EvaluationCreate's pairwise_matrix validator
checks squareness, unity diagonal, and reciprocal of off-diagonal modal values.

RankingItemRead renames three ORM fields for the wire format:
  closeness_coefficient → closeness
  distance_to_positive  → sPlus
  distance_to_negative  → sMinus
"""

from __future__ import annotations

from typing import Self

from pydantic import Field, model_validator

from schemas.base import CamelModel

# Saaty pairwise comparison scale (Saaty, 1980).
SAATY_MIN: float = 1.0 / 9.0
SAATY_MAX: float = 9.0
RECIPROCAL_TOLERANCE: float = 1e-4
EPSILON: float = 1e-9


class FuzzyNumber(CamelModel):
    """Triangular fuzzy number (l, m, u) with l ≤ m ≤ u and m within Saaty bounds."""

    l: float
    m: float
    u: float

    @model_validator(mode="after")
    def _validate_triangle_and_saaty(self) -> Self:
        if not (self.l - EPSILON <= self.m <= self.u + EPSILON):
            raise ValueError(
                f"TFN ordering violated: require l ≤ m ≤ u, got l={self.l}, m={self.m}, u={self.u}"
            )
        if not (SAATY_MIN - EPSILON <= self.m <= SAATY_MAX + EPSILON):
            raise ValueError(
                f"TFN modal value m={self.m} outside Saaty scale [{SAATY_MIN:.4f}, {SAATY_MAX}]"
            )
        return self


class EvaluationCreate(CamelModel):
    """POST /api/evaluations — request body with profile and pairwise matrix."""

    profile_id: int
    pairwise_matrix: list[list[FuzzyNumber]]

    @model_validator(mode="after")
    def _validate_matrix_structure(self) -> Self:
        matrix = self.pairwise_matrix
        n = len(matrix)
        if n < 2:
            raise ValueError(f"pairwise matrix must have at least 2 rows for FAHP, got {n}")

        # Squareness: every row has exactly n elements.
        for i, row in enumerate(matrix):
            if len(row) != n:
                raise ValueError(
                    f"pairwise matrix must be square: row {i} has {len(row)} elements, expected {n}"
                )

        # Diagonal: (1, 1, 1) — Chang (1996) §2 axiom.
        for i in range(n):
            d = matrix[i][i]
            if abs(d.l - 1.0) > EPSILON or abs(d.m - 1.0) > EPSILON or abs(d.u - 1.0) > EPSILON:
                raise ValueError(
                    f"diagonal [{i}][{i}] must be (1, 1, 1), got ({d.l}, {d.m}, {d.u})"
                )

        # Reciprocal modal: m_ij * m_ji ≈ 1 (Saaty, 1980).
        for i in range(n):
            for j in range(i + 1, n):
                prod = matrix[i][j].m * matrix[j][i].m
                if abs(prod - 1.0) > RECIPROCAL_TOLERANCE:
                    raise ValueError(
                        f"reciprocal violation at ({i},{j}): "
                        f"m_ij * m_ji = {prod:.4f}, expected ≈ 1.0 "
                        f"(tolerance {RECIPROCAL_TOLERANCE})"
                    )

        return self


class RankingItemRead(CamelModel):
    """One row of the TOPSIS ranking, with renamed ORM fields for the JSON contract."""

    location_id: int
    rank: int
    closeness: float = Field(validation_alias="closeness_coefficient")
    s_plus: float = Field(validation_alias="distance_to_positive", serialization_alias="sPlus")
    s_minus: float = Field(validation_alias="distance_to_negative", serialization_alias="sMinus")


class EvaluationRead(CamelModel):
    """GET /api/evaluations/{id} — full result of one MCDM run."""

    evaluation_id: int = Field(validation_alias="id")
    weights: dict[str, float]
    ranking: list[RankingItemRead]
    execution_time_ms: int | None = None
