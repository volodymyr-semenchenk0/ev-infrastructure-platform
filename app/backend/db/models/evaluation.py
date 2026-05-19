"""EvaluationRun, RankingItem, SensitivityRecord — журнал MCDM-сеансу (спец. 2.2.2 §6–8)."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class EvaluationRun(Base):
    """Один сеанс обчислень FAHP+TOPSIS."""

    __tablename__ = "evaluation_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    weights_vector: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    execution_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)


class RankingItem(Base):
    """Один елемент рейтингу TOPSIS для конкретного сеансу і локації."""

    __tablename__ = "ranking_items"
    __table_args__ = (
        CheckConstraint("rank >= 1", name="ck_ranking_rank_positive"),
        CheckConstraint(
            "closeness_coefficient BETWEEN 0 AND 1",
            name="ck_ranking_closeness_bounds",
        ),
        CheckConstraint("distance_to_positive >= 0", name="ck_ranking_dist_positive_nonneg"),
        CheckConstraint("distance_to_negative >= 0", name="ck_ranking_dist_negative_nonneg"),
    )

    evaluation_id: Mapped[int] = mapped_column(
        ForeignKey("evaluation_runs.id", ondelete="CASCADE"), primary_key=True
    )
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), primary_key=True)
    rank: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    closeness_coefficient: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False)
    distance_to_positive: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False)
    distance_to_negative: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False)


class SensitivityRecord(Base):
    """Результат Monte-Carlo аналізу чутливості для сеансу."""

    __tablename__ = "sensitivity_records"

    evaluation_id: Mapped[int] = mapped_column(
        ForeignKey("evaluation_runs.id", ondelete="CASCADE"), primary_key=True
    )
    iterations: Mapped[int] = mapped_column(Integer, nullable=False)
    perturbation: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    stability_matrix: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    confidence_intervals: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
