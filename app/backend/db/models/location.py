"""Location, ExistingStation — просторові сутності зі специфікації 2.2.2 §4–5."""

from __future__ import annotations

from decimal import Decimal

from geoalchemy2 import Geometry, WKBElement
from sqlalchemy import Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class Location(Base):
    """Локація-кандидат для встановлення зарядної станції."""

    __tablename__ = "locations"
    __table_args__ = (Index("idx_locations_district", "district"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    address: Mapped[str | None] = mapped_column(String(256), nullable=True)
    district: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # spatial_index=True (default) дає GiST через GeoAlchemy2
    geom: Mapped[WKBElement] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=False
    )


class ExistingStation(Base):
    """Наявна зарядна станція з OpenChargeMap / OSM."""

    __tablename__ = "existing_stations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    power_kw: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    connector_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    geom: Mapped[WKBElement] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=False
    )
