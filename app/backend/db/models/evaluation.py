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
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class EvaluationRun(Base):
    """One FAHP+TOPSIS evaluation session (Appendix A.7)."""

    __tablename__ = "evaluation_runs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('completed', 'failed')",
            name="ck_evaluation_runs_status_enum",
        ),
        CheckConstraint(
            "execution_time_ms > 0",
            name="ck_evaluation_runs_execution_time_positive",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    weights_vector: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    # Triangular fuzzy weights {code: {l, m, u}}; nullable for runs created before
    # this column existed. The crisp weights_vector is the centroid of each triple.
    weights_fuzzy: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    execution_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)

    ranking: Mapped[list[RankingItem]] = relationship(
        back_populates="evaluation", cascade="all, delete-orphan"
    )
    sensitivity: Mapped[SensitivityRecord | None] = relationship(
        back_populates="evaluation",
        cascade="all, delete-orphan",
        uselist=False,
    )


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

    evaluation: Mapped[EvaluationRun] = relationship(back_populates="ranking")


class SensitivityRecord(Base):
    """Результат Monte-Carlo аналізу чутливості для сеансу."""

    __tablename__ = "sensitivity_records"

    evaluation_id: Mapped[int] = mapped_column(
        ForeignKey("evaluation_runs.id", ondelete="CASCADE"), primary_key=True
    )
    iterations: Mapped[int] = mapped_column(Integer, nullable=False)
    perturbation: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    stability_matrix: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    confidence_intervals: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False)

    evaluation: Mapped[EvaluationRun] = relationship(back_populates="sensitivity")
