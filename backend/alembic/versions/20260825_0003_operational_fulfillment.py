"""Add operational fulfillment evidence for the procurement-to-risk workflow.

Revision ID: 20260825_0003
Revises: 7550bb791a96
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260825_0003"
down_revision = "7550bb791a96"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "po_fulfillments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("purchase_order_id", sa.Integer(), sa.ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("shipment_reference", sa.String(length=120), nullable=True),
        sa.Column("fulfillment_status", sa.String(length=40), nullable=False, server_default="Not Started"),
        sa.Column("shipped_at", sa.Date(), nullable=True),
        sa.Column("actual_delivery_date", sa.Date(), nullable=True),
        sa.Column("received_at", sa.Date(), nullable=True),
        sa.Column("ordered_quantity", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("received_quantity", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("accepted_quantity", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("rejected_quantity", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("quality_status", sa.String(length=30), nullable=False, server_default="Pending"),
        sa.Column("quality_notes", sa.Text(), nullable=True),
        sa.Column("sla_violations", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("vendor_notes", sa.Text(), nullable=True),
        sa.Column("recorded_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("received_quantity IS NULL OR received_quantity >= 0", name="ck_po_fulfillment_received_nonnegative"),
        sa.CheckConstraint("accepted_quantity IS NULL OR accepted_quantity >= 0", name="ck_po_fulfillment_accepted_nonnegative"),
        sa.CheckConstraint("rejected_quantity IS NULL OR rejected_quantity >= 0", name="ck_po_fulfillment_rejected_nonnegative"),
    )
    op.create_index("ix_po_fulfillments_purchase_order_id", "po_fulfillments", ["purchase_order_id"])
    op.create_index("ix_po_fulfillments_shipment_reference", "po_fulfillments", ["shipment_reference"])
    op.create_index("ix_po_fulfillments_actual_delivery_date", "po_fulfillments", ["actual_delivery_date"])
    op.create_index("ix_po_fulfillments_recorded_by", "po_fulfillments", ["recorded_by"])
    op.add_column("vendor_reliability_history", sa.Column("quantity_fulfillment_rate", sa.Numeric(precision=5, scale=2), nullable=True))
    op.add_column("vendor_reliability_history", sa.Column("quality_acceptance_rate", sa.Numeric(precision=5, scale=2), nullable=True))


def downgrade() -> None:
    op.drop_column("vendor_reliability_history", "quality_acceptance_rate")
    op.drop_column("vendor_reliability_history", "quantity_fulfillment_rate")
    op.drop_index("ix_po_fulfillments_recorded_by", table_name="po_fulfillments")
    op.drop_index("ix_po_fulfillments_actual_delivery_date", table_name="po_fulfillments")
    op.drop_index("ix_po_fulfillments_shipment_reference", table_name="po_fulfillments")
    op.drop_index("ix_po_fulfillments_purchase_order_id", table_name="po_fulfillments")
    op.drop_table("po_fulfillments")
