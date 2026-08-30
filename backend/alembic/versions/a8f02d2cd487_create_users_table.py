"""create users table

Revision ID: a8f02d2cd487
Revises:
Create Date: 2026-07-27 16:57:48.656313

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a8f02d2cd487"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

USER_ROLE_VALUES = (
    "Administrator",
    "Procurement Manager",
    "Supply Chain Manager",
    "Vendor",
    "Finance Officer",
    "Auditor",
)


def upgrade() -> None:
    user_role = postgresql.ENUM(*USER_ROLE_VALUES, name="user_role")
    user_role.create(op.get_bind(), checkfirst=True)

    user_role_column = postgresql.ENUM(
        *USER_ROLE_VALUES,
        name="user_role",
        create_type=False,
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", user_role_column, nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    postgresql.ENUM(name="user_role").drop(op.get_bind(), checkfirst=True)
