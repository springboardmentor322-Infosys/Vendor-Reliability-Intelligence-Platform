from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)

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

    delivery_date = Column(
        Date,
        nullable=False
    )

    expected_delivery_date = Column(
        Date,
        nullable=False
    )

    delay_days = Column(
        Integer,
        default=0
    )

    delivery_status = Column(
        String(30),
        default="Pending"
    )

    damaged_goods = Column(
        Integer,
        default=0
    )

    delivery_notes = Column(
        String(500),
        nullable=True
    )

    purchase_order = relationship(
        "PurchaseOrder",
        back_populates="deliveries"
    )

    vendor = relationship(
        "Vendor",
        back_populates="deliveries"
    )