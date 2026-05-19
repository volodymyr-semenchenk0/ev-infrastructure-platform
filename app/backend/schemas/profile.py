"""DTOs for profile + criterion resources (spec 2.1.6 §1–3)."""

from __future__ import annotations

from schemas.base import CamelModel
from schemas.evaluation import FuzzyNumber


class CriterionRead(CamelModel):
    """GET /api/criteria — one criterion in the catalog."""

    id: int
    code: str
    name: str
    unit: str
    optimization_type: str
    scale: str


class CriterionWithWeight(CamelModel):
    """Criterion as embedded inside a ProfileDetailRead (no unit/scale needed there)."""

    id: int
    code: str
    weight: float


class ProfileRead(CamelModel):
    """GET /api/profiles — list element."""

    id: int
    code: str
    name: str
    description: str | None = None


class ProfileDetailRead(CamelModel):
    """GET /api/profiles/{id} — profile with attached criteria and pairwise matrix."""

    id: int
    code: str
    name: str
    description: str | None = None
    criteria: list[CriterionWithWeight] = []
    pairwise_matrix: list[list[FuzzyNumber]] | None = None
