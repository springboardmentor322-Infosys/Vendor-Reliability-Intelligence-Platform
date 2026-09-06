from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, JSON

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, nullable=True, index=True)

    user_name = Column(
        String(150),
        nullable=True
    )

    user_role = Column(
        String(100),
        nullable=True,
        index=True
    )

    action = Column(
        String(100),
        nullable=False,
        index=True
    )

    module = Column(
        String(100),
        nullable=False,
        index=True
    )

    entity_type = Column(
        String(100),
        nullable=True
    )

    entity_id = Column(
        String(100),
        nullable=True
    )

    description = Column(
        Text,
        nullable=False
    )

    old_values = Column(
        JSON,
        nullable=True
    )

    new_values = Column(
        JSON,
        nullable=True
    )

    ip_address = Column(
        String(100),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )