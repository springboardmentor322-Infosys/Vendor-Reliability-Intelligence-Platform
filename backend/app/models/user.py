"""
The User table + the RoleEnum from your spec:
Administrator, Procurement Manager, Supply Chain Manager,
Vendor, Finance Officer, Auditor.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class RoleEnum(str, enum.Enum):
    ADMIN = "administrator"
    PROCUREMENT_MANAGER = "procurement_manager"
    SUPPLY_CHAIN_MANAGER = "supply_chain_manager"
    VENDOR = "vendor"
    FINANCE_OFFICER = "finance_officer"
    AUDITOR = "auditor"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.PROCUREMENT_MANAGER)
    # Vendor users are restricted to this vendor's records. Staff users leave it empty.
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
