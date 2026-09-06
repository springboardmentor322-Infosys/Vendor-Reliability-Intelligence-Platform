from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id", ondelete="CASCADE"),
        nullable=False
    )

    product_name = Column(
        String(200),
        nullable=False
    )

    category = Column(
        String(100),
        nullable=False
    )

    unit_price = Column(
        Float,
        nullable=False
    )

    stock_unit = Column(
        Integer,
        default=0
    )

    lead_time_days = Column(
        Integer,
        default=0
    )

    warranty_months = Column(
        Integer,
        default=12
    )

    vendor = relationship(
        "Vendor",
        back_populates="products"
    )

    purchase_orders = relationship(
        "PurchaseOrder",
        back_populates="product"
    )