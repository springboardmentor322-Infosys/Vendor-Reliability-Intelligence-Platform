from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)

    invoice_number = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    purchase_order_id = Column(
        Integer,
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id", ondelete="CASCADE"),
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

    amount = Column(
        Float,
        nullable=False
    )

    payment_status = Column(
        String(30),
        default="Pending"
    )

    notes = Column(
        String(500)
    )

    vendor = relationship(
        "Vendor",
        back_populates="invoices"
    )

    purchase_order = relationship(
        "PurchaseOrder",
        back_populates="invoices"
    )