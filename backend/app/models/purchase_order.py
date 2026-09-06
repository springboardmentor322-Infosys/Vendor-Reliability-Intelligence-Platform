from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)

    po_number = Column(
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
    

    amount = Column(
        Float,
        nullable=False
    )

    order_date = Column(
        Date,
        nullable=False
    )

    delivery_date = Column(
        Date,
        nullable=True
    )

    status = Column(
        String(30),
        default="Pending",
        nullable=False
    )

    description = Column(
        String(500),
        nullable=True
    )

    vendor = relationship(
        "Vendor",
        back_populates="purchase_orders"
    )
    
    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False
    )
    
    product = relationship(
        "Product",
        back_populates="purchase_orders"
    )
    
    deliveries = relationship(
        "Delivery",
        back_populates="purchase_order",
        cascade="all, delete-orphan"
    )
    
    invoices = relationship(
        "Invoice",
        back_populates="purchase_order",
        cascade="all, delete"
    )
    
    quality_inspections = relationship(
        "QualityInspection",
        back_populates="purchase_order",
        cascade="all, delete"
    )