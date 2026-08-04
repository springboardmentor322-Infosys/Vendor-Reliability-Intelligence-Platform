"""rebuild procurement_requests with line items

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-08-03 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f5a6b7c8d9e0"
down_revision: Union[str, Sequence[str], None] = "e4f5a6b7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop the FK from purchase_orders -> procurement_requests so we can rebuild the table
    op.drop_constraint(
        "purchase_orders_procurement_request_id_fkey",
        "purchase_orders",
        type_="foreignkey",
    )

    # 2. Drop existing procurement_request_items if it was auto-created by create_all()
    op.execute(
        "ALTER TABLE IF EXISTS procurement_request_items "
        "DROP CONSTRAINT IF EXISTS procurement_request_items_procurement_request_id_fkey"
    )
    op.execute("DROP TABLE IF EXISTS procurement_request_items")

    # 3. Drop the old procurement_requests table (schema mismatch with new model)
    op.drop_table("procurement_requests")

    # 4. Create the new procurement_requests table
    op.create_table(
        "procurement_requests",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("requested_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("department", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="Pending"),
        sa.Column("total_estimated_cost", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_procurement_requests_requested_by", "procurement_requests", ["requested_by"])

    # 4. Create procurement_request_items table
    op.create_table(
        "procurement_request_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column(
            "procurement_request_id",
            sa.Integer(),
            sa.ForeignKey("procurement_requests.id"),
            nullable=False,
        ),
        sa.Column("item_name", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("estimated_unit_cost", sa.Numeric(12, 2), nullable=False),
    )
    op.create_index(
        "ix_procurement_request_items_procurement_request_id",
        "procurement_request_items",
        ["procurement_request_id"],
    )

    # 5. Re-add FK on purchase_orders
    op.create_foreign_key(
        "purchase_orders_procurement_request_id_fkey",
        "purchase_orders",
        "procurement_requests",
        ["procurement_request_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "purchase_orders_procurement_request_id_fkey",
        "purchase_orders",
        type_="foreignkey",
    )
    op.drop_index("ix_procurement_request_items_procurement_request_id", table_name="procurement_request_items")
    op.drop_table("procurement_request_items")
    op.drop_index("ix_procurement_requests_requested_by", table_name="procurement_requests")
    op.drop_table("procurement_requests")
