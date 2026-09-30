from sqlalchemy import Column, Integer, String, Float, Date
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

    department = Column(
        String,
        nullable=False,
        default="General"
    )

    expected_delivery_date = Column(
        Date,
        nullable=True
    )

    requested_by = Column(String, nullable=True)
    priority = Column(String, nullable=True, default="Medium")
    justification = Column(String, nullable=True)

    status = Column(
        String,
        default="Pending",
        nullable=False
    )