from sqlalchemy import Column, Integer, String, Float, Date

from app.database import Base


class ProcurementRequest(Base):

    __tablename__ = "procurement_requests"

    id = Column(Integer, primary_key=True, index=True)

    request_number = Column(
        String(50),
        unique=True,
        nullable=False
    )

    department = Column(
        String(100),
        nullable=False
    )

    requested_by = Column(
        String(100),
        nullable=False
    )

    item_name = Column(
        String(150),
        nullable=False
    )

    quantity = Column(
        Integer,
        nullable=False
    )

    estimated_cost = Column(
        Float,
        nullable=False
    )

    request_date = Column(
        Date,
        nullable=False
    )

    status = Column(
        String(30),
        default="Pending"
    )