"""add vendor management module

Revision ID: b1a2c3d4e5f6
Revises: a8f02d2cd487
Create Date: 2026-08-02 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b1a2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "a8f02d2cd487"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

VENDOR_STATUS_VALUES = (
    "Pending",
    "Under Review",
    "Approved",
    "Rejected",
)

VENDOR_CATEGORY_NAMES = (
    "Raw Material Suppliers",
    "Equipment",
    "IT",
    "Logistics",
    "Services",
    "Maintenance",
)


def upgrade() -> None:
    vendor_status = postgresql.ENUM(*VENDOR_STATUS_VALUES, name="vendor_status")
    vendor_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "vendor_categories",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False, unique=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "vendors",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("vendor_categories.id"), nullable=False),
        sa.Column("contact_email", sa.String(length=255), nullable=False),
        sa.Column("contact_phone", sa.String(length=50), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("status", vendor_status, nullable=False, server_default="Pending"),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "vendor_contacts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("vendor_id", sa.Integer(), sa.ForeignKey("vendors.id"), nullable=False),
        sa.Column("contact_name", sa.String(length=255), nullable=False),
        sa.Column("designation", sa.String(length=255), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=False),
    )

    bind = op.get_bind()
    for category_name in VENDOR_CATEGORY_NAMES:
        bind.execute(
            sa.text("INSERT INTO vendor_categories (name) VALUES (:name) ON CONFLICT DO NOTHING"),
            {"name": category_name},
        )


def downgrade() -> None:
    op.drop_table("vendor_contacts")
    op.drop_table("vendors")
    op.drop_table("vendor_categories")
    postgresql.ENUM(name="vendor_status").drop(op.get_bind(), checkfirst=True)
