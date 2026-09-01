from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime
)

from datetime import datetime

from app.database import Base


class Communication(Base):

    __tablename__ = "communications"


    # ==========================================
    # PRIMARY KEY
    # ==========================================

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )


    # ==========================================
    # VENDOR
    # ==========================================

    vendor_id = Column(
        Integer,
        nullable=False,
        index=True
    )


    # ==========================================
    # USER / SENDER
    # ==========================================

    sender_email = Column(
        String,
        nullable=False
    )


    # ==========================================
    # MESSAGE TYPE
    #
    # Vendor Message
    # Procurement Discussion
    # Activity Log
    # ==========================================

    communication_type = Column(
        String,
        default="Vendor Message",
        nullable=False
    )


    # ==========================================
    # SUBJECT
    # ==========================================

    subject = Column(
        String,
        nullable=True
    )


    # ==========================================
    # MESSAGE
    # ==========================================

    message = Column(
        Text,
        nullable=False
    )


    # ==========================================
    # FILE INFORMATION
    # ==========================================

    file_name = Column(
        String,
        nullable=True
    )

    file_path = Column(
        String,
        nullable=True
    )


    # ==========================================
    # STATUS
    # ==========================================

    status = Column(
        String,
        default="Sent",
        nullable=False
    )


    # ==========================================
    # CREATED TIME
    # ==========================================

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )