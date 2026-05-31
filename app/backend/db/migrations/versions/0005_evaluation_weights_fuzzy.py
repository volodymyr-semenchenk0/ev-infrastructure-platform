"""evaluation_weights_fuzzy

Add a nullable JSON column `weights_fuzzy` to `evaluation_runs` holding the
triangular fuzzy weights {code: {l, m, u}} produced by FAHP. Nullable so runs
recorded before this column existed stay valid; for those rows the API returns
null and the UI omits the whiskers.

Revision ID: 0005_evaluation_weights_fuzzy
Revises: 0004_rename_dm_profiles
Create Date: 2026-05-31 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005_evaluation_weights_fuzzy"
down_revision: str | Sequence[str] | None = "0004_rename_dm_profiles"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "evaluation_runs",
        sa.Column("weights_fuzzy", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("evaluation_runs", "weights_fuzzy")
