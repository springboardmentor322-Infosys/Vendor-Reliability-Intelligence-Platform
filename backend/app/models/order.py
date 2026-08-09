from sqlalchemy import Column, Integer, String, Float
from app.database import Base


class Order(Base):

    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)

    vendor_id = Column(Integer, nullable=False)

    product_name = Column(String, nullable=False)

    quantity = Column(Integer, nullable=False)

    amount = Column(Float, nullable=False)

    status = Column(
        String,
        default="Pending",
        nullable=False
    )