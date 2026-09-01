from sqlalchemy import Column, Integer, String, Float, Date

from app.database import Base


class Invoice(Base):

    __tablename__ = "invoices"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    invoice_number = Column(
        String,
        nullable=False,
        unique=True
    )

    order_id = Column(
        Integer,
        nullable=False
    )

    vendor_id = Column(
        Integer,
        nullable=False
    )

    amount = Column(
        Float,
        nullable=False
    )

    status = Column(
        String,
        default="Pending",
        nullable=False
    )

    invoice_date = Column(
        Date,
        nullable=False
    )

    due_date = Column(
        Date,
        nullable=False
    )