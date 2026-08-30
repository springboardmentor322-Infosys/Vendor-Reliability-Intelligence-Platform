"""
The Vendor table, matching the "Vendor Management Module" section of the spec:
categories, approval workflow, status monitoring, contact info.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Enum, Float
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class VendorCategory(str, enum.Enum):
    RAW_MATERIAL = "raw_material_suppliers"
    EQUIPMENT = "equipment_vendors"
    IT = "it_vendors"
    SERVICE_PROVIDER = "service_providers"
    LOGISTICS = "logistics_partners"
    MAINTENANCE = "maintenance_vendors"


class VendorStatus(str, enum.Enum):
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    SUSPENDED = "suspended"
    REJECTED = "rejected"


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name = Column(String(200), nullable=False)
    category = Column(Enum(VendorCategory), nullable=False)
    status = Column(Enum(VendorStatus), default=VendorStatus.PENDING_APPROVAL)

    contact_name = Column(String(150))
    contact_email = Column(String(255))
    contact_phone = Column(String(30))
    address = Column(String(300))

    # This will be computed later by the Reliability Module (Milestone 3)
    reliability_score = Column(Float, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
