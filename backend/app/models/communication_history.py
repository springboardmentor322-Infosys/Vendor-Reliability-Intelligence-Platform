from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class CommunicationHistory(Base):
    __tablename__ = "communication_history"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id", ondelete="CASCADE"),
        nullable=False
    )

    subject = Column(
        String(200),
        nullable=False
    )

    communication_type = Column(
        String(50),
        nullable=False
    )

    sender = Column(
        String(100),
        nullable=False
    )

    receiver = Column(
        String(100),
        nullable=False
    )

    message = Column(
        String(1000),
        nullable=False
    )

    communication_date = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    vendor = relationship(
        "Vendor",
        back_populates="communication_history"
    )