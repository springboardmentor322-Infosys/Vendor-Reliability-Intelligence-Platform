"""
Procurement Management Module - Purchase Orders.
Status flow follows the spec: Pending -> Approved -> Ordered -> Delivered -> Completed
(or Cancelled at any point before Completed).
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Enum, Numeric, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class POStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ORDERED = "ordered"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_number = Column(String(30), unique=True, nullable=False)

    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    requested_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    description = Column(Text, nullable=False)
    quantity = Column(Integer, default=1)
    # Currency must not use binary floating point values.
    unit_price = Column(Numeric(12, 2), default=0)
    total_amount = Column(Numeric(12, 2), default=0)

    status = Column(Enum(POStatus), default=POStatus.PENDING)

    expected_delivery_date = Column(DateTime, nullable=True)
    actual_delivery_date = Column(DateTime, nullable=True)
    invoice_reference = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
