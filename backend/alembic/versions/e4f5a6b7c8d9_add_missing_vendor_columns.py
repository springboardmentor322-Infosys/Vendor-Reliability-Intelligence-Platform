"""add missing vendor columns (rejection_reason, user_id)

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-08-03 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, Sequence[str], None] = "d3e4f5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add rejection_reason column (nullable text, absent from the original migration)
    op.add_column(
        "vendors",
        sa.Column("rejection_reason", sa.Text(), nullable=True),
    )

    # Add user_id column linking the vendor record to the self-registering user
    op.add_column(
        "vendors",
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_vendors_user_id", "vendors", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_vendors_user_id", table_name="vendors")
    op.drop_column("vendors", "user_id")
    op.drop_column("vendors", "rejection_reason")
