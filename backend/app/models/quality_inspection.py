from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class QualityInspection(Base):
    __tablename__ = "quality_inspections"

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

    inspection_date = Column(
        Date,
        nullable=False
    )

    inspector = Column(
        String(100),
        nullable=False
    )

    quality_score = Column(
        Float,
        nullable=False
    )

    defects_found = Column(
        Integer,
        default=0
    )

    remarks = Column(
        String(500)
    )

    status = Column(
        String(30),
        default="Passed"
    )

    vendor = relationship(
        "Vendor",
        back_populates="quality_inspections"
    )

    purchase_order = relationship(
        "PurchaseOrder",
        back_populates="quality_inspections"
    )