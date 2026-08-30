"""complete remaining core tables and user roles

Revision ID: j9e0f1g2h3i4
Revises: i8d9e0f1g2h3
Create Date: 2026-08-30 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "j9e0f1g2h3i4"
down_revision: Union[str, Sequence[str], None] = "i8d9e0f1g2h3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_names() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _index_names(table: str) -> set[str]:
    return {index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table) if index["name"]}


def _ensure_index(name: str, table: str, columns: list[str], unique: bool = False) -> None:
    if name not in _index_names(table):
        op.create_index(name, table, columns, unique=unique)


def upgrade() -> None:
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Supply Chain Manager'")

    tables = _table_names()

    if "reliability_scores" not in tables:
        op.create_table(
            "reliability_scores",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("vendor_id", sa.Integer(), sa.ForeignKey("vendors.id"), nullable=False),
            sa.Column("overall_score", sa.Numeric(5, 2), nullable=False),
            sa.Column("delivery_score", sa.Numeric(5, 2), nullable=False),
            sa.Column("quality_score", sa.Numeric(5, 2), nullable=False),
            sa.Column("response_score", sa.Numeric(5, 2), nullable=False),
            sa.Column("period_start", sa.DateTime(timezone=True), nullable=False),
            sa.Column("period_end", sa.DateTime(timezone=True), nullable=False),
            sa.Column(
                "calculated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        _ensure_index("ix_reliability_scores_vendor_id", "reliability_scores", ["vendor_id"])

    if "performance_records" not in tables:
        op.create_table(
            "performance_records",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("vendor_id", sa.Integer(), sa.ForeignKey("vendors.id"), nullable=False),
            sa.Column("record_date", sa.DateTime(timezone=True), nullable=False),
            sa.Column("delivery_score", sa.Numeric(5, 2), nullable=False),
            sa.Column("quality_score", sa.Numeric(5, 2), nullable=False),
            sa.Column("response_score", sa.Numeric(5, 2), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        _ensure_index("ix_performance_records_vendor_id", "performance_records", ["vendor_id"])

    if "compliance_documents" not in tables:
        op.create_table(
            "compliance_documents",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("vendor_id", sa.Integer(), sa.ForeignKey("vendors.id"), nullable=False),
            sa.Column("document_type", sa.String(length=100), nullable=False),
            sa.Column("document_name", sa.String(length=255), nullable=False),
            sa.Column("file_url", sa.String(length=500), nullable=True),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
            sa.Column(
                "uploaded_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
        )
        _ensure_index("ix_compliance_documents_vendor_id", "compliance_documents", ["vendor_id"])

    if "communications" not in tables:
        op.create_table(
            "communications",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("vendor_id", sa.Integer(), sa.ForeignKey("vendors.id"), nullable=False),
            sa.Column("subject", sa.String(length=255), nullable=False),
            sa.Column("channel", sa.String(length=50), nullable=False, server_default="email"),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="open"),
            sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        _ensure_index("ix_communications_vendor_id", "communications", ["vendor_id"])
        _ensure_index("ix_communications_created_by_user_id", "communications", ["created_by_user_id"])

    if "messages" not in tables:
        op.create_table(
            "messages",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("communication_id", sa.Integer(), sa.ForeignKey("communications.id"), nullable=False),
            sa.Column("sender_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("recipient_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column(
                "sent_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )
        _ensure_index("ix_messages_communication_id", "messages", ["communication_id"])
        _ensure_index("ix_messages_sender_user_id", "messages", ["sender_user_id"])
        _ensure_index("ix_messages_recipient_user_id", "messages", ["recipient_user_id"])

    if "notifications" not in tables:
        op.create_table(
            "notifications",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("notification_type", sa.String(length=100), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column("related_entity_type", sa.String(length=100), nullable=True),
            sa.Column("related_entity_id", sa.Integer(), nullable=True),
        )
        _ensure_index("ix_notifications_user_id", "notifications", ["user_id"])

    if "reports" not in tables:
        op.create_table(
            "reports",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("report_type", sa.String(length=100), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("summary", sa.Text(), nullable=True),
            sa.Column("generated_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("vendor_id", sa.Integer(), sa.ForeignKey("vendors.id"), nullable=True),
            sa.Column(
                "generated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column("file_url", sa.String(length=500), nullable=True),
        )
        _ensure_index("ix_reports_generated_by_user_id", "reports", ["generated_by_user_id"])
        _ensure_index("ix_reports_vendor_id", "reports", ["vendor_id"])

    if "support_tickets" not in tables:
        op.create_table(
            "support_tickets",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("subject", sa.String(length=255), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="open"),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        _ensure_index("ix_support_tickets_user_id", "support_tickets", ["user_id"])

    if "thread_messages" not in tables:
        op.create_table(
            "thread_messages",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("thread_type", sa.String(length=50), nullable=False),
            sa.Column("reference_id", sa.Integer(), nullable=False),
            sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        _ensure_index("ix_thread_messages_thread_type", "thread_messages", ["thread_type"])
        _ensure_index("ix_thread_messages_reference_id", "thread_messages", ["reference_id"])
        _ensure_index("ix_thread_messages_sender_id", "thread_messages", ["sender_id"])

    if "audit_logs" not in tables:
        op.create_table(
            "audit_logs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("action_description", sa.Text(), nullable=False),
            sa.Column("performed_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("entity_type", sa.String(length=100), nullable=False),
            sa.Column("entity_id", sa.Integer(), nullable=False),
            sa.Column(
                "timestamp",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        _ensure_index("ix_audit_logs_performed_by", "audit_logs", ["performed_by"])
        _ensure_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
        _ensure_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])
        _ensure_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])


def downgrade() -> None:
    for table in (
        "audit_logs",
        "thread_messages",
        "support_tickets",
        "reports",
        "notifications",
        "messages",
        "communications",
        "compliance_documents",
        "performance_records",
        "reliability_scores",
    ):
        op.execute(f'DROP TABLE IF EXISTS {table} CASCADE')
