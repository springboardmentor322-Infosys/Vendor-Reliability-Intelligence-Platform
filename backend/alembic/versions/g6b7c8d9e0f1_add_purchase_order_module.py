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


def _table_names() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _column_names(table: str) -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table)}


def _index_names(table: str) -> set[str]:
    return {index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table) if index["name"]}


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS delivery_documents CASCADE")
    op.execute("DROP TABLE IF EXISTS po_items CASCADE")

    tables = _table_names()
    if "purchase_orders" not in tables:
        op.create_table(
            "purchase_orders",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("po_number", sa.String(length=100), nullable=False),
            sa.Column(
                "procurement_request_id",
                sa.Integer(),
                sa.ForeignKey("procurement_requests.id"),
                nullable=True,
            ),
            sa.Column("vendor_id", sa.Integer(), sa.ForeignKey("vendors.id"), nullable=False),
            sa.Column("order_date", sa.DateTime(timezone=True), nullable=False),
            sa.Column("expected_delivery_date", sa.DateTime(timezone=True), nullable=True),
            sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("currency", sa.String(length=10), nullable=False, server_default="USD"),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="Pending"),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        op.create_index("ix_purchase_orders_po_number", "purchase_orders", ["po_number"], unique=True)
        op.create_index("ix_purchase_orders_procurement_request_id", "purchase_orders", ["procurement_request_id"])
        op.create_index("ix_purchase_orders_vendor_id", "purchase_orders", ["vendor_id"])
        op.create_index("ix_purchase_orders_created_by", "purchase_orders", ["created_by"])
    elif "created_by" not in _column_names("purchase_orders"):
        op.add_column(
            "purchase_orders",
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        )
        op.execute(
            "UPDATE purchase_orders SET created_by = "
            "(SELECT id FROM users WHERE role = 'Administrator' ORDER BY id LIMIT 1) "
            "WHERE created_by IS NULL"
        )
        op.alter_column("purchase_orders", "created_by", nullable=False)
        if "ix_purchase_orders_created_by" not in _index_names("purchase_orders"):
            op.create_index("ix_purchase_orders_created_by", "purchase_orders", ["created_by"])

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
    op.create_index("ix_po_items_purchase_order_id", "po_items", ["purchase_order_id"])

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
    op.create_index("ix_delivery_documents_purchase_order_id", "delivery_documents", ["purchase_order_id"])
    op.create_index("ix_delivery_documents_uploaded_by", "delivery_documents", ["uploaded_by"])


def downgrade() -> None:
    op.drop_index("ix_delivery_documents_uploaded_by", table_name="delivery_documents")
    op.drop_index("ix_delivery_documents_purchase_order_id", table_name="delivery_documents")
    op.drop_table("delivery_documents")

    op.drop_index("ix_po_items_purchase_order_id", table_name="po_items")
    op.drop_table("po_items")
