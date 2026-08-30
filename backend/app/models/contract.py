"""Contract & Compliance Module."""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Enum, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class ContractStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRING_SOON = "expiring_soon"
    EXPIRED = "expired"
    TERMINATED = "terminated"


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)

    title = Column(String(200), nullable=False)
    contract_number = Column(String(50), unique=True, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)

    status = Column(Enum(ContractStatus), default=ContractStatus.ACTIVE)
    is_compliant = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
