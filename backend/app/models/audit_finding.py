from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey

from app.database import Base


class AuditFinding(Base):
    __tablename__ = "audit_findings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    finding_id = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    finding = Column(
        String,
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=True,
        index=True
    )

    audit = Column(
        String,
        nullable=False
    )

    severity = Column(
        String,
        nullable=False,
        default="Medium"
    )

    status = Column(
        String,
        nullable=False,
        default="Open"
    )

    evidence_url = Column(
        String,
        nullable=True
    )

    due_date = Column(
        Date,
        nullable=True
    )