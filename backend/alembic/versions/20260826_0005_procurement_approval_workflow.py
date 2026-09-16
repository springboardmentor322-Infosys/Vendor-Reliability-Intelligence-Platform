"""Add auditable procurement request approval workflow.

Revision ID: 20260826_0005
Revises: 20260826_0004
"""
from alembic import op
import sqlalchemy as sa

revision = "20260826_0005"
down_revision = "20260826_0004"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("procurement_requests", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("procurement_requests", sa.Column("approval_comment", sa.Text(), nullable=True))
    op.add_column("procurement_requests", sa.Column("rejected_by", sa.Integer(), nullable=True))
    op.add_column("procurement_requests", sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("procurement_requests", sa.Column("rejection_reason", sa.Text(), nullable=True))
    op.create_foreign_key("fk_procurement_requests_rejected_by_users", "procurement_requests", "users", ["rejected_by"], ["id"], ondelete="SET NULL")
    op.execute("UPDATE procurement_requests SET status = 'Pending Approval' WHERE status = 'Pending'")
    op.execute("UPDATE procurement_requests SET status = 'Purchase Order Created' WHERE status = 'Ordered'")

def downgrade() -> None:
    op.execute("UPDATE procurement_requests SET status = 'Pending' WHERE status = 'Pending Approval'")
    op.execute("UPDATE procurement_requests SET status = 'Ordered' WHERE status = 'Purchase Order Created'")
    op.drop_constraint("fk_procurement_requests_rejected_by_users", "procurement_requests", type_="foreignkey")
    op.drop_column("procurement_requests", "rejection_reason")
    op.drop_column("procurement_requests", "rejected_at")
    op.drop_column("procurement_requests", "rejected_by")
    op.drop_column("procurement_requests", "approval_comment")
    op.drop_column("procurement_requests", "approved_at")
