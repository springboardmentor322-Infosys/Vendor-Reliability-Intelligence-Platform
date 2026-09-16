"""Link external Vendor accounts to their supplier company.

Revision ID: 20260826_0004
Revises: 20260825_0003
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260826_0004"
down_revision: Union[str, Sequence[str], None] = "20260825_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("vendor_id", sa.Integer(), nullable=True))
    op.create_index("ix_users_vendor_id", "users", ["vendor_id"], unique=False)
    op.create_foreign_key(
        "fk_users_vendor_id_vendors",
        "users",
        "vendors",
        ["vendor_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_users_vendor_id_vendors", "users", type_="foreignkey")
    op.drop_index("ix_users_vendor_id", table_name="users")
    op.drop_column("users", "vendor_id")
