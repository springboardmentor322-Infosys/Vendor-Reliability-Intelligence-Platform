"""Set the database default for new procurement requests to Draft.

Revision ID: 20260826_0006
Revises: 20260826_0005
"""
from alembic import op

revision = "20260826_0006"
down_revision = "20260826_0005"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.alter_column("procurement_requests", "status", server_default="Draft")

def downgrade() -> None:
    op.alter_column("procurement_requests", "status", server_default="Pending")
