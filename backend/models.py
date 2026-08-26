import enum
import datetime as dt
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from database import Base


# ---------- Enums ----------

class RoleEnum(str, enum.Enum):
    ADMIN = "Administrator"
    PROCUREMENT_MANAGER = "Procurement Manager"
    SUPPLY_CHAIN_MANAGER = "Supply Chain Manager"
    VENDOR = "Vendor"
    FINANCE_OFFICER = "Finance Officer"
    AUDITOR = "Auditor"


class VendorCategoryEnum(str, enum.Enum):
    RAW_MATERIAL = "Raw Material Suppliers"
    EQUIPMENT = "Equipment Vendors"
    IT = "IT Vendors"
    SERVICE = "Service Providers"
    LOGISTICS = "Logistics Partners"
    MAINTENANCE = "Maintenance Vendors"


class VendorStatusEnum(str, enum.Enum):
    PENDING = "Pending Approval"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    SUSPENDED = "Suspended"


class ProcurementStatusEnum(str, enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    ORDERED = "Ordered"
    DELIVERED = "Delivered"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class RiskLevelEnum(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class ComplianceStatusEnum(str, enum.Enum):
    COMPLIANT = "Compliant"
    AT_RISK = "At Risk"
    NON_COMPLIANT = "Non-Compliant"


# ---------- Models ----------

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.PROCUREMENT_MANAGER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)
    # if role == VENDOR, this links to their vendor profile
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)


class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(Enum(VendorCategoryEnum), nullable=False)
    contact_person = Column(String)
    email = Column(String)
    phone = Column(String)
    address = Column(String)
    status = Column(Enum(VendorStatusEnum), default=VendorStatusEnum.PENDING)
    reliability_score = Column(Float, default=0.0)
    risk_level = Column(Enum(RiskLevelEnum), default=RiskLevelEnum.MEDIUM)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    performance_records = relationship("PerformanceRecord", back_populates="vendor", cascade="all, delete-orphan")
    purchase_orders = relationship("PurchaseOrder", back_populates="vendor", cascade="all, delete-orphan")
    contracts = relationship("Contract", back_populates="vendor", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="vendor", cascade="all, delete-orphan")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String, unique=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    item_description = Column(String)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    status = Column(Enum(ProcurementStatusEnum), default=ProcurementStatusEnum.PENDING)
    requested_by = Column(String)
    order_date = Column(DateTime, default=dt.datetime.utcnow)
    expected_delivery = Column(DateTime, nullable=True)
    actual_delivery = Column(DateTime, nullable=True)
    invoice_number = Column(String, nullable=True)
    invoice_paid = Column(Boolean, default=False)

    vendor = relationship("Vendor", back_populates="purchase_orders")


class PerformanceRecord(Base):
    __tablename__ = "performance_records"
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    on_time_deliveries = Column(Integer, default=0)
    delayed_deliveries = Column(Integer, default=0)
    quality_rating = Column(Float, default=0.0)  # 0-5
    response_time_hours = Column(Float, default=0.0)
    issue_resolution_hours = Column(Float, default=0.0)
    order_completion_rate = Column(Float, default=0.0)  # 0-100
    recorded_at = Column(DateTime, default=dt.datetime.utcnow)

    vendor = relationship("Vendor", back_populates="performance_records")


class Contract(Base):
    __tablename__ = "contracts"
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    contract_title = Column(String)
    start_date = Column(DateTime, default=dt.datetime.utcnow)
    end_date = Column(DateTime)
    compliance_status = Column(Enum(ComplianceStatusEnum), default=ComplianceStatusEnum.COMPLIANT)
    document_name = Column(String, nullable=True)
    document_path = Column(String, nullable=True)  # where the uploaded file lives on disk
    notes = Column(Text, nullable=True)
    # Set once an expiry notification has been generated for this contract,
    # so the automated check (see notifications_engine.py) doesn't re-fire
    # the same alert every time it runs.
    expiry_notified = Column(Boolean, default=False)

    vendor = relationship("Vendor", back_populates="contracts")


class VendorDocument(Base):
    """Certifications and general vendor documentation (business license,
    ISO certificates, insurance, tax certificates, etc.) - distinct from
    contract files, since a vendor can hold these independent of any single
    contract."""
    __tablename__ = "vendor_documents"
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    document_type = Column(String)  # e.g. "Business License", "ISO Certification"
    file_name = Column(String)      # original filename, for display
    file_path = Column(String)      # where the uploaded file lives on disk
    expiry_date = Column(DateTime, nullable=True)  # for certifications that expire
    uploaded_at = Column(DateTime, default=dt.datetime.utcnow)

    vendor = relationship("Vendor")


class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    sender = Column(String)
    content = Column(Text)
    sent_at = Column(DateTime, default=dt.datetime.utcnow)

    vendor = relationship("Vendor", back_populates="messages")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    message = Column(Text)
    category = Column(String)  # e.g. "Contract Expiry", "Delivery Delay", "Vendor Approval"
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=dt.datetime.utcnow)
