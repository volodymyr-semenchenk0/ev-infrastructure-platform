"""initial_schema

Revision ID: 209b1504f634
Revises:
Create Date: 2026-05-19 16:55:35.721962

"""

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "209b1504f634"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # PostGIS must exist before any GEOMETRY column is created.
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "criteria",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("unit", sa.String(length=32), nullable=False),
        sa.Column("optimization_type", sa.String(length=4), nullable=False),
        sa.Column("scale", sa.String(length=16), nullable=False),
        sa.CheckConstraint(
            "optimization_type IN ('max', 'min')", name="ck_criteria_optimization_type"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "existing_stations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("power_kw", sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column("connector_type", sa.String(length=32), nullable=True),
        sa.Column(
            "geom",
            geoalchemy2.types.Geometry(
                geometry_type="POINT",
                srid=4326,
                dimension=2,
                from_text="ST_GeomFromEWKT",
                name="geometry",
                nullable=False,
            ),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    # GeoAlchemy2 auto-creates GiST on existing_stations.geom via spatial_index=True.
    op.create_table(
        "locations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("address", sa.String(length=256), nullable=True),
        sa.Column("district", sa.String(length=64), nullable=True),
        sa.Column(
            "geom",
            geoalchemy2.types.Geometry(
                geometry_type="POINT",
                srid=4326,
                dimension=2,
                from_text="ST_GeomFromEWKT",
                name="geometry",
                nullable=False,
            ),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_locations_district", "locations", ["district"], unique=False)
    # GeoAlchemy2 auto-creates GiST on locations.geom via spatial_index=True.
    op.create_table(
        "profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "evaluation_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("profile_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("weights_vector", sa.JSON(), nullable=False),
        sa.Column("execution_time_ms", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["profile_id"],
            ["profiles.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "pairwise_matrices",
        sa.Column("profile_id", sa.Integer(), nullable=False),
        sa.Column("criterion_i_id", sa.Integer(), nullable=False),
        sa.Column("criterion_j_id", sa.Integer(), nullable=False),
        sa.Column("l", sa.Numeric(precision=6, scale=3), nullable=False),
        sa.Column("m", sa.Numeric(precision=6, scale=3), nullable=False),
        sa.Column("u", sa.Numeric(precision=6, scale=3), nullable=False),
        sa.ForeignKeyConstraint(
            ["criterion_i_id"],
            ["criteria.id"],
        ),
        sa.ForeignKeyConstraint(
            ["criterion_j_id"],
            ["criteria.id"],
        ),
        sa.ForeignKeyConstraint(["profile_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("profile_id", "criterion_i_id", "criterion_j_id"),
    )
    op.create_table(
        "ranking_items",
        sa.Column("evaluation_id", sa.Integer(), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("rank", sa.SmallInteger(), nullable=False),
        sa.Column("closeness_coefficient", sa.Numeric(precision=8, scale=6), nullable=False),
        sa.Column("distance_to_positive", sa.Numeric(precision=8, scale=6), nullable=False),
        sa.Column("distance_to_negative", sa.Numeric(precision=8, scale=6), nullable=False),
        sa.CheckConstraint(
            "closeness_coefficient BETWEEN 0 AND 1", name="ck_ranking_closeness_bounds"
        ),
        sa.CheckConstraint("distance_to_negative >= 0", name="ck_ranking_dist_negative_nonneg"),
        sa.CheckConstraint("distance_to_positive >= 0", name="ck_ranking_dist_positive_nonneg"),
        sa.CheckConstraint("rank >= 1", name="ck_ranking_rank_positive"),
        sa.ForeignKeyConstraint(["evaluation_id"], ["evaluation_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["locations.id"],
        ),
        sa.PrimaryKeyConstraint("evaluation_id", "location_id"),
    )
    op.create_table(
        "sensitivity_records",
        sa.Column("evaluation_id", sa.Integer(), nullable=False),
        sa.Column("iterations", sa.Integer(), nullable=False),
        sa.Column("perturbation", sa.Numeric(precision=4, scale=3), nullable=False),
        sa.Column("stability_matrix", sa.JSON(), nullable=False),
        sa.Column("confidence_intervals", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["evaluation_id"], ["evaluation_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("evaluation_id"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("sensitivity_records")
    op.drop_table("ranking_items")
    op.drop_table("pairwise_matrices")
    op.drop_table("evaluation_runs")
    op.drop_table("profiles")
    op.drop_index("idx_locations_district", table_name="locations")
    # GeoAlchemy2-managed GiST indexes are removed automatically with their tables.
    op.drop_table("locations")
    op.drop_table("existing_stations")
    op.drop_table("criteria")
    # PostGIS extension intentionally not dropped — other databases / users in
    # the same cluster may rely on it.
