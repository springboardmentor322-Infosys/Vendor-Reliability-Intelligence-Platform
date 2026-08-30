"""
Vendor Performance Module.
Each record is one evaluation snapshot (e.g. logged monthly, or per delivery
cycle) that feeds into the Reliability Score calculation.
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class PerformanceRecord(Base):
    __tablename__ = "performance_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    recorded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Null means "not measured"; zero remains a real measured value.
    on_time_deliveries = Column(Integer, nullable=True)
    delayed_deliveries = Column(Integer, nullable=True)
    quality_rating = Column(Float, nullable=True)          # 0-5 scale
    response_time_hours = Column(Float, nullable=True)     # avg communication response time
    issue_resolution_hours = Column(Float, nullable=True)  # avg time to resolve issues
    order_completion_rate = Column(Float, nullable=True)   # 0-100 %

    created_at = Column(DateTime, default=datetime.utcnow)
