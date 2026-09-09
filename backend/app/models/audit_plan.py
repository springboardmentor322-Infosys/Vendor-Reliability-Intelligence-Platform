from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey

from app.database import Base


class AuditPlan(Base):
    __tablename__ = "audit_plans"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    audit_id = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    title = Column(
        String,
        nullable=False
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=True,
        index=True
    )

    auditor = Column(
        String,
        nullable=False,
        default="Auditor"
    )

    audit_type = Column(
        String,
        nullable=False
    )

    priority = Column(
        String,
        nullable=False,
        default="Medium"
    )

    start_date = Column(
        Date,
        nullable=True
    )

    due_date = Column(
        Date,
        nullable=True
    )

    status = Column(
        String,
        nullable=False,
        default="Planned"
    )

    progress = Column(
        Integer,
        nullable=False,
        default=0
    )

    scope = Column(
        Text,
        nullable=True
    )