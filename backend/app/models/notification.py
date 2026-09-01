from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from datetime import datetime

from app.database import Base


class Notification(Base):

    __tablename__ = "notifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String
    )

    message = Column(
        Text
    )

    notification_type = Column(
        String
    )

    vendor_id = Column(
        Integer,
        nullable=True
    )

    contract_id = Column(
        Integer,
        nullable=True
    )

    is_read = Column(
        Boolean,
        default=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )