"""add app_settings for administrator system configuration

Revision ID: k0f1g2h3i4j5
Revises: j9e0f1g2h3i4
Create Date: 2026-09-01 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "k0f1g2h3i4j5"
down_revision: Union[str, Sequence[str], None] = "j9e0f1g2h3i4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tables = set(sa.inspect(op.get_bind()).get_table_names())
    if "app_settings" in tables:
        return
    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(length=100), primary_key=True),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
    )
    op.execute(
        "INSERT INTO app_settings (key, value) VALUES "
        "('contract_expiry_alert_days', '30'), "
        "('invoice_due_days', '30')"
    )


def downgrade() -> None:
    op.drop_table("app_settings")
