"""Profile, Criterion, PairwiseMatrixEntry — реляційне ядро (спец. 2.2.2 §1–3)."""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class Profile(Base):
    """Профіль особи, що приймає рішення (municipal / investor)."""

    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class Criterion(Base):
    """Критерій оцінювання локацій (Pop_dens, Traffic, …)."""

    __tablename__ = "criteria"
    __table_args__ = (
        CheckConstraint(
            "optimization_type IN ('max', 'min')",
            name="ck_criteria_optimization_type",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
    optimization_type: Mapped[str] = mapped_column(String(4), nullable=False)
    scale: Mapped[str] = mapped_column(String(16), nullable=False)


class PairwiseMatrixEntry(Base):
    """Одна клітина FAHP-матриці попарних порівнянь — нечітке число (l, m, u)."""

    __tablename__ = "pairwise_matrices"

    profile_id: Mapped[int] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True
    )
    criterion_i_id: Mapped[int] = mapped_column(ForeignKey("criteria.id"), primary_key=True)
    criterion_j_id: Mapped[int] = mapped_column(ForeignKey("criteria.id"), primary_key=True)
    l: Mapped[Decimal] = mapped_column(Numeric(6, 3), nullable=False)
    m: Mapped[Decimal] = mapped_column(Numeric(6, 3), nullable=False)
    u: Mapped[Decimal] = mapped_column(Numeric(6, 3), nullable=False)
