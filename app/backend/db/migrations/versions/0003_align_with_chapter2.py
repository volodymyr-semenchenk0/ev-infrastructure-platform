"""align_with_chapter2

Brings the schema in line with subsection 2.2.2 and Appendix A:

* Rename location_criterion_values -> criterion_values (Appendix A.4
  entity name CriterionValue).
* Backfill any legacy evaluation_runs.status='done' rows to 'completed'
  so the new CHECK can be added.
* Set evaluation_runs.execution_time_ms NOT NULL and add CHECK (> 0)
  per Appendix A.7.
* Add CHECK evaluation_runs.status IN ('completed', 'failed') per
  Appendix A.7.

Revision ID: 0003_align_with_chapter2
Revises: 96c6c1f381ec
Create Date: 2026-05-27 12:30:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003_align_with_chapter2"
down_revision: str | Sequence[str] | None = "96c6c1f381ec"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Rename the decision-matrix table to match Appendix A.4.
    #    The old CHECK constraint name remains pinned to the old name; rename
    #    it as well so dropping the table later does not leave dangling names.
    op.rename_table("location_criterion_values", "criterion_values")
    op.drop_constraint("ck_lcv_value_nonneg", "criterion_values", type_="check")
    op.create_check_constraint("ck_criterion_values_value_nonneg", "criterion_values", "value >= 0")

    # 2. Backfill evaluation_runs to satisfy the new constraints.
    op.execute(
        "UPDATE evaluation_runs SET status = 'completed' WHERE status NOT IN "
        "('completed', 'failed')"
    )
    op.execute(
        "UPDATE evaluation_runs SET execution_time_ms = 1 "
        "WHERE execution_time_ms IS NULL OR execution_time_ms < 1"
    )

    # 3. Tighten evaluation_runs per Appendix A.7.
    op.alter_column("evaluation_runs", "execution_time_ms", nullable=False)
    op.create_check_constraint(
        "ck_evaluation_runs_execution_time_positive",
        "evaluation_runs",
        "execution_time_ms > 0",
    )
    op.create_check_constraint(
        "ck_evaluation_runs_status_enum",
        "evaluation_runs",
        "status IN ('completed', 'failed')",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_evaluation_runs_status_enum", "evaluation_runs", type_="check")
    op.drop_constraint(
        "ck_evaluation_runs_execution_time_positive",
        "evaluation_runs",
        type_="check",
    )
    op.alter_column("evaluation_runs", "execution_time_ms", nullable=True)

    op.drop_constraint("ck_criterion_values_value_nonneg", "criterion_values", type_="check")
    op.create_check_constraint("ck_lcv_value_nonneg", "criterion_values", "value >= 0")
    op.rename_table("criterion_values", "location_criterion_values")
