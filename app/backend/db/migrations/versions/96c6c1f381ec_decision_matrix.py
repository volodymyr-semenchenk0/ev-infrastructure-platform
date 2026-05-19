"""decision_matrix

Revision ID: 96c6c1f381ec
Revises: 209b1504f634
Create Date: 2026-05-19 18:14:23.078669

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "96c6c1f381ec"
down_revision: str | Sequence[str] | None = "209b1504f634"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "location_criterion_values",
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("criterion_id", sa.Integer(), nullable=False),
        sa.Column("value", sa.Numeric(precision=12, scale=4), nullable=False),
        sa.CheckConstraint("value >= 0", name="ck_lcv_value_nonneg"),
        sa.ForeignKeyConstraint(["criterion_id"], ["criteria.id"]),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("location_id", "criterion_id"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("location_criterion_values")
