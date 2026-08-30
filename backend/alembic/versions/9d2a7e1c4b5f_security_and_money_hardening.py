"""security, money, and vendor-account hardening

Revision ID: 9d2a7e1c4b5f
Revises: 6b1338f3a736
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "9d2a7e1c4b5f"
down_revision: Union[str, None] = "6b1338f3a736"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("vendor_id", sa.UUID(), nullable=True))
    op.create_foreign_key("fk_users_vendor_id", "users", "vendors", ["vendor_id"], ["id"])
    op.create_index("ix_users_vendor_id", "users", ["vendor_id"])
    op.alter_column("purchase_orders", "unit_price", type_=sa.Numeric(12, 2), postgresql_using="unit_price::numeric")
    op.alter_column("purchase_orders", "total_amount", type_=sa.Numeric(12, 2), postgresql_using="total_amount::numeric")
    for column in ("on_time_deliveries", "delayed_deliveries", "quality_rating", "response_time_hours", "issue_resolution_hours", "order_completion_rate"):
        op.alter_column("performance_records", column, server_default=None, nullable=True)


def downgrade() -> None:
    op.alter_column("purchase_orders", "total_amount", type_=sa.Float(), postgresql_using="total_amount::double precision")
    op.alter_column("purchase_orders", "unit_price", type_=sa.Float(), postgresql_using="unit_price::double precision")
    op.drop_index("ix_users_vendor_id", table_name="users")
    op.drop_constraint("fk_users_vendor_id", "users", type_="foreignkey")
    op.drop_column("users", "vendor_id")
