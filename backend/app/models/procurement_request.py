from sqlalchemy import Column, Integer, String, Float
from app.database import Base


class ProcurementRequest(Base):

    __tablename__ = "procurement_requests"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        Integer,
        nullable=False
    )

    product_name = Column(
        String,
        nullable=False
    )

    quantity = Column(
        Integer,
        nullable=False
    )

    estimated_amount = Column(
        Float,
        nullable=False
    )

    status = Column(
        String,
        default="Pending",
        nullable=False
    )