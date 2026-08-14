"""add supply chain models

Revision ID: i8d9e0f1g2h3
Revises: h7c8d9e0f1g2
Create Date: 2026-08-14 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "i8d9e0f1g2h3"
down_revision: Union[str, Sequence[str], None] = "h7c8d9e0f1g2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS quality_inspections CASCADE")
    op.execute("DROP TABLE IF EXISTS invoices CASCADE")
    op.execute("DROP TABLE IF EXISTS deliveries CASCADE")
    op.execute("DROP TABLE IF EXISTS products CASCADE")

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=255), nullable=False),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("vendor_id", sa.Integer(), sa.ForeignKey("vendors.id"), nullable=False),
    )
    op.create_index("ix_products_name", "products", ["name"])
    op.create_index("ix_products_category", "products", ["category"])
    op.create_index("ix_products_vendor_id", "products", ["vendor_id"])

    op.create_table(
        "deliveries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column(
            "purchase_order_id",
            sa.Integer(),
            sa.ForeignKey("purchase_orders.id"),
            nullable=False,
        ),
        sa.Column("scheduled_shipping_days", sa.Integer(), nullable=True),
        sa.Column("actual_shipping_days", sa.Integer(), nullable=True),
        sa.Column("shipping_mode", sa.String(length=100), nullable=True),
        sa.Column("late_delivery_risk", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("delivery_status", sa.String(length=100), nullable=False),
    )
    op.create_index("ix_deliveries_purchase_order_id", "deliveries", ["purchase_order_id"], unique=True)
    op.create_index("ix_deliveries_delivery_status", "deliveries", ["delivery_status"])

    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column(
            "purchase_order_id",
            sa.Integer(),
            sa.ForeignKey("purchase_orders.id"),
            nullable=False,
        ),
        sa.Column("invoice_number", sa.String(length=100), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="Pending"),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("paid_date", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_invoices_purchase_order_id", "invoices", ["purchase_order_id"])
    op.create_index("ix_invoices_invoice_number", "invoices", ["invoice_number"], unique=True)

    op.create_table(
        "quality_inspections",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("vendor_id", sa.Integer(), sa.ForeignKey("vendors.id"), nullable=False),
        sa.Column(
            "purchase_order_id",
            sa.Integer(),
            sa.ForeignKey("purchase_orders.id"),
            nullable=False,
        ),
        sa.Column("inspection_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("quality_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("defects_found", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("inspector_notes", sa.Text(), nullable=True),
    )
    op.create_index("ix_quality_inspections_vendor_id", "quality_inspections", ["vendor_id"])
    op.create_index("ix_quality_inspections_purchase_order_id", "quality_inspections", ["purchase_order_id"])


def downgrade() -> None:
    op.drop_index("ix_quality_inspections_purchase_order_id", table_name="quality_inspections")
    op.drop_index("ix_quality_inspections_vendor_id", table_name="quality_inspections")
    op.drop_table("quality_inspections")

    op.drop_index("ix_invoices_invoice_number", table_name="invoices")
    op.drop_index("ix_invoices_purchase_order_id", table_name="invoices")
    op.drop_table("invoices")

    op.drop_index("ix_deliveries_delivery_status", table_name="deliveries")
    op.drop_index("ix_deliveries_purchase_order_id", table_name="deliveries")
    op.drop_table("deliveries")

    op.drop_index("ix_products_vendor_id", table_name="products")
    op.drop_index("ix_products_category", table_name="products")
    op.drop_index("ix_products_name", table_name="products")
    op.drop_table("products")
