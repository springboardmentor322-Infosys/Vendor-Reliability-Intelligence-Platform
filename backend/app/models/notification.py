"""
Notification Module (in-app notifications).
Email/SMS delivery (SMTP/Twilio from the spec) needs real provider credentials,
so those are wired as optional hooks in notifications service - see
app/services/notifications.py for where to plug them in.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Boolean, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class NotificationType(str, enum.Enum):
    VENDOR_APPROVAL = "vendor_approval"
    PO_STATUS = "po_status"
    CONTRACT_EXPIRY = "contract_expiry"
    DELIVERY_DELAY = "delivery_delay"
    COMPLIANCE = "compliance"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    type = Column(Enum(NotificationType), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
