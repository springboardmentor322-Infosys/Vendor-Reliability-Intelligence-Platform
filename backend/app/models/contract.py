from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Contract(Base):

    __tablename__ = "contracts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    contract_number = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id", ondelete="CASCADE"),
        nullable=False
    )

    start_date = Column(
        Date,
        nullable=False
    )

    end_date = Column(
        Date,
        nullable=False
    )

    contract_value = Column(
        Float,
        nullable=False
    )

    contract_status = Column(
        String(30),
        default="Active"
    )

    terms = Column(
        String(1000),
        nullable=True
    )

    vendor = relationship(
        "Vendor",
        back_populates="contracts"
    )