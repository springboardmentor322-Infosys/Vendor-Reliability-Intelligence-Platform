"""add missing vendor columns (rejection_reason, user_id)

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-08-03 00:00:00.000000

These columns are already added by c2d3e4f5a6b7 and d3e4f5a6b7c8.
This revision only adds them when they are absent.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, Sequence[str], None] = "d3e4f5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(table: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns(table)}


def _index_names(table: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {index["name"] for index in inspector.get_indexes(table) if index["name"]}


def upgrade() -> None:
    columns = _column_names("vendors")

    if "rejection_reason" not in columns:
        op.add_column("vendors", sa.Column("rejection_reason", sa.Text(), nullable=True))

    if "user_id" not in columns:
        op.add_column(
            "vendors",
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )

    if "ix_vendors_user_id" not in _index_names("vendors"):
        op.create_index("ix_vendors_user_id", "vendors", ["user_id"])


def downgrade() -> None:
    # Columns and index are owned by c2d3e4f5a6b7 / d3e4f5a6b7c8.
    return
