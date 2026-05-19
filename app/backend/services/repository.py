"""Thin async SQLAlchemy 2.0 repositories — single source of DB access for services.

One class per aggregate root.  Methods take primitive parameters or ORM objects,
return ORM objects or NumPy arrays.  No DTO conversion here — that lives in
the service layer.
"""

from __future__ import annotations

import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.models import (
    Criterion,
    EvaluationRun,
    Location,
    LocationCriterionValue,
    Profile,
    RankingItem,
    SensitivityRecord,
)


class ProfileRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, pk: int) -> Profile | None:
        return await self.session.get(Profile, pk)

    async def list_all(self) -> list[Profile]:
        result = await self.session.execute(select(Profile).order_by(Profile.id))
        return list(result.scalars().all())


class CriterionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_ordered(self) -> list[Criterion]:
        result = await self.session.execute(select(Criterion).order_by(Criterion.id))
        return list(result.scalars().all())


class LocationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_ordered(self) -> list[Location]:
        result = await self.session.execute(select(Location).order_by(Location.id))
        return list(result.scalars().all())

    async def get(self, pk: int) -> Location | None:
        return await self.session.get(Location, pk)

    async def create(
        self,
        name: str,
        latitude: float,
        longitude: float,
        address: str | None = None,
        district: str | None = None,
    ) -> Location:
        loc = Location(
            name=name,
            address=address,
            district=district,
            geom=f"SRID=4326;POINT({longitude} {latitude})",
        )
        self.session.add(loc)
        await self.session.flush()
        # Refresh so geom comes back as a WKBElement (not the raw input string).
        # LocationRead._extract_lat_lon_from_geom expects WKB/WKTElement to call
        # geoalchemy2.shape.to_shape on it.
        await self.session.refresh(loc)
        return loc


class DecisionMatrixRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def load_matrix(self, criterion_ids: list[int], location_ids: list[int]) -> np.ndarray:
        """Return X of shape (len(location_ids), len(criterion_ids)) in caller's order."""
        if not criterion_ids or not location_ids:
            return np.zeros((len(location_ids), len(criterion_ids)))

        stmt = select(
            LocationCriterionValue.location_id,
            LocationCriterionValue.criterion_id,
            LocationCriterionValue.value,
        ).where(
            LocationCriterionValue.location_id.in_(location_ids),
            LocationCriterionValue.criterion_id.in_(criterion_ids),
        )
        result = await self.session.execute(stmt)
        lookup = {(row.location_id, row.criterion_id): float(row.value) for row in result.all()}

        m = len(location_ids)
        n = len(criterion_ids)
        x = np.zeros((m, n))
        for i, loc_id in enumerate(location_ids):
            for j, crit_id in enumerate(criterion_ids):
                x[i, j] = lookup.get((loc_id, crit_id), 0.0)
        return x


class EvaluationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        profile_id: int,
        status: str,
        weights: dict[str, float],
        execution_time_ms: int,
    ) -> EvaluationRun:
        run = EvaluationRun(
            profile_id=profile_id,
            status=status,
            weights_vector=weights,
            execution_time_ms=execution_time_ms,
        )
        self.session.add(run)
        await self.session.flush()
        return run

    async def add_ranking_item(
        self,
        evaluation_id: int,
        location_id: int,
        rank: int,
        closeness_coefficient: float,
        distance_to_positive: float,
        distance_to_negative: float,
    ) -> RankingItem:
        item = RankingItem(
            evaluation_id=evaluation_id,
            location_id=location_id,
            rank=rank,
            closeness_coefficient=closeness_coefficient,
            distance_to_positive=distance_to_positive,
            distance_to_negative=distance_to_negative,
        )
        self.session.add(item)
        return item

    async def get_with_ranking(self, eval_id: int) -> EvaluationRun | None:
        stmt = (
            select(EvaluationRun)
            .where(EvaluationRun.id == eval_id)
            .options(selectinload(EvaluationRun.ranking))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class SensitivityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        evaluation_id: int,
        iterations: int,
        perturbation: float,
        stability_matrix: dict[str, list[float]],
        confidence_intervals: list[dict[str, float | int]],
    ) -> SensitivityRecord:
        rec = SensitivityRecord(
            evaluation_id=evaluation_id,
            iterations=iterations,
            perturbation=perturbation,
            stability_matrix=stability_matrix,
            confidence_intervals=confidence_intervals,
        )
        self.session.add(rec)
        await self.session.flush()
        return rec

    async def get(self, evaluation_id: int) -> SensitivityRecord | None:
        return await self.session.get(SensitivityRecord, evaluation_id)
