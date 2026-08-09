"""update contracts table with new fields

Revision ID: h7c8d9e0f1g2
Revises: g6b7c8d9e0f1
Create Date: 2026-08-06 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "h7c8d9e0f1g2"
down_revision: Union[str, Sequence[str], None] = "g6b7c8d9e0f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Check if contracts table exists with the old schema (has end_date column)
    old_schema = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'contracts' AND column_name = 'end_date'"
        )
    ).scalar()

    # Check if contracts table exists with the new schema (has title column)
    new_schema = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'contracts' AND column_name = 'title'"
        )
    ).scalar()

    if old_schema and not new_schema:
        # Old schema exists — drop and recreate
        op.drop_table("contracts")

    # Create the new contracts table
    op.create_table(
        "contracts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("contract_number", sa.String(length=100), nullable=False, unique=True),
        sa.Column("vendor_id", sa.Integer(), sa.ForeignKey("vendors.id"), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=True),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expiry_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("renewal_notice_period_days", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("contract_value", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="USD"),
        sa.Column("terms", sa.Text(), nullable=True),
        sa.Column("compliance_flag", sa.String(length=50), nullable=False, server_default="Under Review"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="Draft"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_contracts_vendor_id", "contracts", ["vendor_id"])
    op.create_index("ix_contracts_created_by_user_id", "contracts", ["created_by_user_id"])
    op.create_index("ix_contracts_contract_number", "contracts", ["contract_number"])


def downgrade() -> None:
    op.drop_index("ix_contracts_contract_number", table_name="contracts")
    op.drop_index("ix_contracts_created_by_user_id", table_name="contracts")
    op.drop_index("ix_contracts_vendor_id", table_name="contracts")
    op.drop_table("contracts")
