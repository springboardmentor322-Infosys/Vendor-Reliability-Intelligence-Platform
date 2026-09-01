from sqlalchemy import Column, Integer, String, Float, Date

from app.database import Base


class Order(Base):

    __tablename__ = "orders"

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

    amount = Column(
        Float,
        nullable=False
    )

    status = Column(
        String,
        default="Pending",
        nullable=False
    )

    expected_delivery_date = Column(
        Date,
        nullable=True
    )

    # DataCo source / logistics fields
    source_order_id = Column(String, nullable=True, index=True)
    order_date = Column(Date, nullable=True)
    shipping_date = Column(Date, nullable=True)
    shipping_mode = Column(String, nullable=True)
    delivery_status = Column(String, nullable=True)
    late_delivery_risk = Column(Integer, nullable=True, default=0)
    order_country = Column(String, nullable=True)
    order_region = Column(String, nullable=True)
    order_state = Column(String, nullable=True)