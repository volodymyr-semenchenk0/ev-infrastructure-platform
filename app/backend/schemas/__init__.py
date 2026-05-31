"""Pydantic v2 DTOs for the EV-charging DSS REST API (spec 2.1.6)."""

from __future__ import annotations

from schemas.base import CamelModel
from schemas.comparison import ComparisonRead, PairwiseDifference
from schemas.evaluation import (
    EvaluationCreate,
    EvaluationRead,
    FuzzyNumber,
    RankingItemRead,
)
from schemas.location import LocationCreate, LocationRead
from schemas.profile import (
    CriterionRead,
    CriterionWithWeight,
    ProfileDetailRead,
    ProfileRead,
)
from schemas.sensitivity import (
    ConfidenceInterval,
    ConvergenceTrace,
    CstarHistogram,
    SensitivityRead,
    SensitivityRequest,
)

__all__ = [
    "CamelModel",
    "ComparisonRead",
    "ConfidenceInterval",
    "ConvergenceTrace",
    "CriterionRead",
    "CriterionWithWeight",
    "CstarHistogram",
    "EvaluationCreate",
    "EvaluationRead",
    "FuzzyNumber",
    "LocationCreate",
    "LocationRead",
    "PairwiseDifference",
    "ProfileDetailRead",
    "ProfileRead",
    "RankingItemRead",
    "SensitivityRead",
    "SensitivityRequest",
]
