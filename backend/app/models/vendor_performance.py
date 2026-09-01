from sqlalchemy import Column, Integer, Float, String, Date
from app.database import Base


class VendorPerformance(Base):

    __tablename__ = "vendor_performance"

    # ==========================================
    # PRIMARY KEY
    # ==========================================

    id = Column(
        Integer,
        primary_key=True,
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
    # DELIVERY PERFORMANCE
    # ==========================================

    on_time_deliveries = Column(
        Integer,
        default=0,
        nullable=False
    )

    delayed_deliveries = Column(
        Integer,
        default=0,
        nullable=False
    )


    # ==========================================
    # QUALITY
    # ==========================================

    quality_rating = Column(
        Float,
        default=0,
        nullable=False
    )


    # ==========================================
    # COMMUNICATION
    # ==========================================

    response_time = Column(
        Float,
        default=0,
        nullable=False
    )


    # ==========================================
    # ISSUE RESOLUTION
    # ==========================================

    issue_resolution_time = Column(
        Float,
        default=0,
        nullable=False
    )


    # ==========================================
    # ORDER COMPLETION
    # ==========================================

    order_completion_rate = Column(
        Float,
        default=0,
        nullable=False
    )


    # ==========================================
    # SERVICE RATING
    # ==========================================

    service_rating = Column(
        Float,
        default=0,
        nullable=False
    )


    # ==========================================
    # PERFORMANCE PERIOD
    # ==========================================

    performance_date = Column(
        Date,
        nullable=False
    )