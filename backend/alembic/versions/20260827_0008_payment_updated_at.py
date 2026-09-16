"""Add payment modification timestamp.

Revision ID: 20260827_0008
Revises: 20260827_0007
"""

from alembic import op
import sqlalchemy as sa


revision = "20260827_0008"
down_revision = "20260827_0007"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "payments",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )


def downgrade():
    op.drop_column("payments", "updated_at")
