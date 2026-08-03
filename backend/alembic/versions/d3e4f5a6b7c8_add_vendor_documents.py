"""add vendor documents and user_id

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-08-03 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, Sequence[str], None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("vendors", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_vendors_user_id", "vendors", "users", ["user_id"], ["id"])
    op.create_index("ix_vendors_user_id", "vendors", ["user_id"])

    op.create_table(
        "vendor_documents",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("vendor_id", sa.Integer(), sa.ForeignKey("vendors.id"), nullable=False),
        sa.Column("doc_type", sa.String(length=100), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_vendor_documents_vendor_id", "vendor_documents", ["vendor_id"])


def downgrade() -> None:
    op.drop_index("ix_vendor_documents_vendor_id", table_name="vendor_documents")
    op.drop_table("vendor_documents")
    op.drop_index("ix_vendors_user_id", table_name="vendors")
    op.drop_constraint("fk_vendors_user_id", "vendors", type_="foreignkey")
    op.drop_column("vendors", "user_id")
