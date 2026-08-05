"""add purchase order module tables

Revision ID: g6b7c8d9e0f1
Revises: f5a6b7c8d9e0
Create Date: 2026-08-05 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "g6b7c8d9e0f1"
down_revision: Union[str, Sequence[str], None] = "f5a6b7c8d9e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -----------------------------------------------------------------------
    # 0. Drop auto-created tables (SQLAlchemy create_all may have created them
    #    when the server started with new models before this migration ran).
    # -----------------------------------------------------------------------
    op.execute("DROP TABLE IF EXISTS delivery_documents CASCADE")
    op.execute("DROP TABLE IF EXISTS po_items CASCADE")

    # -----------------------------------------------------------------------
    # 1. Add created_by column to purchase_orders table (skip if already exists)
    # -----------------------------------------------------------------------
    conn = op.get_bind()
    col_check = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'purchase_orders' AND column_name = 'created_by'"
        )
    ).scalar()

    if not col_check:
        op.add_column(
            "purchase_orders",
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        )

        # Set existing rows to have a default created_by (first admin user)
        op.execute(
            "UPDATE purchase_orders SET created_by = "
            "(SELECT id FROM users WHERE role = 'Administrator' ORDER BY id LIMIT 1) "
            "WHERE created_by IS NULL"
        )

        # Now make it NOT NULL
        op.alter_column("purchase_orders", "created_by", nullable=False)
        op.create_index("ix_purchase_orders_created_by", "purchase_orders", ["created_by"])

    # -----------------------------------------------------------------------
    # 2. Create po_items table
    # -----------------------------------------------------------------------
    op.create_table(
        "po_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column(
            "purchase_order_id",
            sa.Integer(),
            sa.ForeignKey("purchase_orders.id"),
            nullable=False,
        ),
        sa.Column("item_name", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
    )
    op.create_index(
        "ix_po_items_purchase_order_id",
        "po_items",
        ["purchase_order_id"],
    )

    # -----------------------------------------------------------------------
    # 3. Create delivery_documents table
    # -----------------------------------------------------------------------
    op.create_table(
        "delivery_documents",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column(
            "purchase_order_id",
            sa.Integer(),
            sa.ForeignKey("purchase_orders.id"),
            nullable=False,
        ),
        sa.Column("doc_type", sa.String(length=50), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_delivery_documents_purchase_order_id",
        "delivery_documents",
        ["purchase_order_id"],
    )
    op.create_index(
        "ix_delivery_documents_uploaded_by",
        "delivery_documents",
        ["uploaded_by"],
    )


def downgrade() -> None:
    op.drop_index("ix_delivery_documents_uploaded_by", table_name="delivery_documents")
    op.drop_index("ix_delivery_documents_purchase_order_id", table_name="delivery_documents")
    op.drop_table("delivery_documents")

    op.drop_index("ix_po_items_purchase_order_id", table_name="po_items")
    op.drop_table("po_items")

    op.drop_index("ix_purchase_orders_created_by", table_name="purchase_orders")
    op.drop_column("purchase_orders", "created_by")
