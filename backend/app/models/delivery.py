from sqlalchemy import Column, Integer, String, Date, ForeignKey

from app.database import Base


class Delivery(Base):

    __tablename__ = "deliveries"


    # ==========================================
    # PRIMARY KEY
    # ==========================================

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )


    # ==========================================
    # ORDER
    # ==========================================

    order_id = Column(
        Integer,
        ForeignKey("orders.id"),
        nullable=False,
        index=True
    )


    # ==========================================
    # VENDOR
    # ==========================================

    vendor_id = Column(
        Integer,
        nullable=False,
        index=True
    )


    # ==========================================
    # DELIVERY INFORMATION
    # ==========================================

    expected_delivery_date = Column(
        Date,
        nullable=False
    )

    actual_delivery_date = Column(
        Date,
        nullable=True
    )


    # ==========================================
    # STATUS
    # ==========================================

    status = Column(
        String,
        nullable=False,
        default="Pending"
    )


    # ==========================================
    # TRACKING
    # ==========================================

    tracking_number = Column(
        String,
        nullable=True
    )


    # ==========================================
    # NOTES
    # ==========================================

    notes = Column(
        String,
        nullable=True
    )