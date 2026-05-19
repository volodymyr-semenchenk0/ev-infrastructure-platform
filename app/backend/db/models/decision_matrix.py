"""LocationCriterionValue — decision matrix X (12 locations × 10 criteria)."""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class LocationCriterionValue(Base):
    """One cell of the TOPSIS decision matrix X[i,j].

    Composite PK (location_id, criterion_id) ensures at most one value per
    (location, criterion) pair.  ON DELETE CASCADE on location_id keeps the
    matrix consistent when a location is removed.
    """

    __tablename__ = "location_criterion_values"
    __table_args__ = (CheckConstraint("value >= 0", name="ck_lcv_value_nonneg"),)

    location_id: Mapped[int] = mapped_column(
        ForeignKey("locations.id", ondelete="CASCADE"), primary_key=True
    )
    criterion_id: Mapped[int] = mapped_column(ForeignKey("criteria.id"), primary_key=True)
    value: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
