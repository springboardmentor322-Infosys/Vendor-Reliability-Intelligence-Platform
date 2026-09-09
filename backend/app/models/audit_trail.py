from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime

from app.database import Base


class AuditTrail(Base):
    __tablename__ = "audit_trails"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    log_id = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    user = Column(
        String,
        nullable=False
    )

    role = Column(
        String,
        nullable=True
    )

    action = Column(
        String,
        nullable=False
    )

    module = Column(
        String,
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    status = Column(
        String,
        nullable=False,
        default="Success"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )