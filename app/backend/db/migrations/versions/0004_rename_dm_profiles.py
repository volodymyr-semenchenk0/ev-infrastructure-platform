"""rename_dm_profiles

Update the two decision-maker profile rows so each `name` carries the full
role label; the role prefix is dropped from `description` since it now lives
in the name. UPDATE by `code` leaves the existing rows in place — and the
evaluation_runs that reference them by id stay intact. No profile is
recreated, so no data is lost.

Revision ID: 0004_rename_dm_profiles
Revises: 0003_align_with_chapter2
Create Date: 2026-05-31 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004_rename_dm_profiles"
down_revision: str | Sequence[str] | None = "0003_align_with_chapter2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# (code, name, description) snapshots. A migration is a point-in-time record,
# so the literal text is pinned here rather than imported from db.seed.
_NEW: list[tuple[str, str, str]] = [
    (
        "municipal",
        "Профіль міської адміністрації (Муніципалітет)",
        "Пріоритет суспільної доступності, екології та технічної реалізованості.",
    ),
    (
        "investor",
        "Профіль приватного інвестора",
        "Пріоритет економічної віддачі та пасажиропотоку.",
    ),
]

_OLD: list[tuple[str, str, str]] = [
    (
        "municipal",
        "Муніципалітет",
        "Профіль міської адміністрації: пріоритет суспільної доступності, "
        "екології та технічної реалізованості.",
    ),
    (
        "investor",
        "Інвестор",
        "Профіль приватного інвестора: пріоритет економічної віддачі та пасажиропотоку.",
    ),
]


def _apply(rows: list[tuple[str, str, str]]) -> None:
    stmt = sa.text(
        "UPDATE profiles SET name = :name, description = :description WHERE code = :code"
    )
    for code, name, description in rows:
        op.execute(stmt.bindparams(code=code, name=name, description=description))


def upgrade() -> None:
    """Upgrade schema."""
    _apply(_NEW)


def downgrade() -> None:
    """Downgrade schema."""
    _apply(_OLD)
