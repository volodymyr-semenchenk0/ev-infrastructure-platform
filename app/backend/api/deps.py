"""FastAPI dependencies (DI) for the EV-charging DSS API layer."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import AsyncSessionLocal
from services import (
    ComparisonService,
    CriterionRepository,
    EvaluationRepository,
    EvaluationService,
    LocationRepository,
    ProfileRepository,
    SensitivityService,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Async session per-request — overridable via app.dependency_overrides in tests."""
    async with AsyncSessionLocal() as session:
        yield session


def get_profile_repository(
    session: AsyncSession = Depends(get_db),
) -> ProfileRepository:
    return ProfileRepository(session)


def get_criterion_repository(
    session: AsyncSession = Depends(get_db),
) -> CriterionRepository:
    return CriterionRepository(session)


def get_location_repository(
    session: AsyncSession = Depends(get_db),
) -> LocationRepository:
    return LocationRepository(session)


def get_evaluation_repository(
    session: AsyncSession = Depends(get_db),
) -> EvaluationRepository:
    return EvaluationRepository(session)


def get_evaluation_service(
    session: AsyncSession = Depends(get_db),
) -> EvaluationService:
    return EvaluationService(session)


def get_sensitivity_service(
    session: AsyncSession = Depends(get_db),
) -> SensitivityService:
    return SensitivityService(session)


def get_comparison_service() -> ComparisonService:
    """ComparisonService is stateless — no session needed."""
    return ComparisonService()
