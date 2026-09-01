from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey

from app.database import Base


class QualityInspection(Base):

    __tablename__ = "quality_inspections"


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
    # INSPECTION INFORMATION
    # ==========================================

    inspection_date = Column(
        Date,
        nullable=False
    )

    inspector_name = Column(
        String,
        nullable=False
    )


    # ==========================================
    # QUALITY RESULT
    # ==========================================

    quality_score = Column(
        Float,
        nullable=False,
        default=0
    )

    result = Column(
        String,
        nullable=False,
        default="Passed"
    )


    # ==========================================
    # DEFECT INFORMATION
    # ==========================================

    defect_count = Column(
        Integer,
        nullable=False,
        default=0
    )


    # ==========================================
    # NOTES
    # ==========================================

    notes = Column(
        String,
        nullable=True
    )