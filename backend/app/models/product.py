from sqlalchemy import Column, Integer, String, Float

from app.database import Base


class Product(Base):

    __tablename__ = "products"


    # ==========================================
    # PRIMARY KEY
    # ==========================================

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )


    # ==========================================
    # PRODUCT INFORMATION
    # ==========================================

    product_name = Column(
        String,
        nullable=False
    )

    category = Column(
        String,
        nullable=False
    )

    description = Column(
        String,
        nullable=True
    )


    # ==========================================
    # PRICING
    # ==========================================

    unit_price = Column(
        Float,
        nullable=False,
        default=0
    )


    # ==========================================
    # INVENTORY
    # ==========================================

    stock_quantity = Column(
        Integer,
        nullable=False,
        default=0
    )

    reorder_level = Column(
        Integer,
        nullable=False,
        default=10
    )


    # ==========================================
    # STATUS
    # ==========================================

    status = Column(
        String,
        nullable=False,
        default="Active"
    )