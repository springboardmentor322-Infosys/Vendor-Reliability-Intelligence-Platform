"""add vendor status history and rejection reason

Revision ID: c2d3e4f5a6b7
Revises: b1a2c3d4e5f6
Create Date: 2026-08-03 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, Sequence[str], None] = "b1a2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("vendors", sa.Column("rejection_reason", sa.Text(), nullable=True))

    op.create_table(
        "vendor_status_history",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("vendor_id", sa.Integer(), sa.ForeignKey("vendors.id"), nullable=False),
        sa.Column("from_status", sa.String(length=50), nullable=True),
        sa.Column("to_status", sa.String(length=50), nullable=False),
        sa.Column("changed_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column(
            "changed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_vendor_status_history_vendor_id", "vendor_status_history", ["vendor_id"])
    op.create_index("ix_vendor_status_history_changed_by", "vendor_status_history", ["changed_by"])


def downgrade() -> None:
    op.drop_index("ix_vendor_status_history_changed_by", table_name="vendor_status_history")
    op.drop_index("ix_vendor_status_history_vendor_id", table_name="vendor_status_history")
    op.drop_table("vendor_status_history")
    op.drop_column("vendors", "rejection_reason")
