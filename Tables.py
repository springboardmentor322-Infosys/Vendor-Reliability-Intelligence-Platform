import os
from dotenv import load_dotenv
load_dotenv()
from datetime import date, datetime, timedelta, timezone
from enum import Enum
from typing import List, Optional, Any, Dict
from fastapi.security import OAuth2PasswordBearer
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, 
    Numeric, String, create_engine, Text, func, UniqueConstraint,
    Index, CheckConstraint
)
from decimal import Decimal
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

# Set DATABASE_URL in the environment for production, for example:
# postgresql://postgres:<password>@localhost:5432/Vendor-Reliability
#
# The fallback is intentionally generic so credentials are not hard-coded
# into source code.
DATABASE_URL = os.getenv( "DATABASE_URL" )

engine = create_engine( DATABASE_URL )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


# ============================================================
# DATABASE SESSION
# ============================================================

def get_db():
    database = SessionLocal()
    try:
        yield database
    finally:
        database.close()


def create_tables():
    """
    Create tables that do not already exist.

    NOTE:
    create_all() does not migrate existing tables. If you add new columns
    to an existing PostgreSQL database, use Alembic or an ALTER TABLE
    migration.
    """
    Base.metadata.create_all(bind=engine)


# ============================================================
# PASSWORD HASHING
# ============================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    try:
        return pwd_context.verify(
            plain_password,
            hashed_password,
        )
    except Exception:
        return False


# ==========================================================
# OTP HASHING
# ==========================================================

def hash_otp(otp: str) -> str:

    return pwd_context.hash(otp)


def verify_otp(
    otp: str,
    otp_hash: str,
) -> bool:

    return pwd_context.verify(
        otp,
        otp_hash,
    )


# ============================================================
# JWT CONFIGURATION
# ============================================================

SECRET_KEY = os.getenv(
    "SECRET_KEY"
)

ALGORITHM = os.getenv(
    "JWT_ALGORITHM"
)

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        "60",
    )
)


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    to_encode = data.copy()

    if expires_delta is not None:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = (
            datetime.now(timezone.utc)
            + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )

    to_encode["exp"] = expire

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_token(token: str):
    try:
        return jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
    except JWTError:
        return None


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/login",
)


# ============================================================
# ENUMS
# ============================================================


# ============================================================
# SQLALCHEMY TABLES ARRANGED BY APPLICATION HTML PAGE USAGE
# ============================================================


# ============================================================
# AUTHENTICATION / COMMON
# ============================================================

class UserRole(str, Enum):

    ADMIN = "Admin"

    PROCUREMENT_MANAGER = "Procurement Manager"

    FINANCE_OFFICER = "Finance Officer"

    SUPPLY_CHAIN_MANAGER = "Supply Chain Manager"

    AUDITOR = "Auditor"


# ============================================================
# SQLALCHEMY DATABASE TABLES
# ============================================================


# ============================================================
# HTML PAGE 1 - ADMIN DASHBOARD / AUTHENTICATION
# ============================================================

class User(Base):
    """
    Application users.

    Used by:
      - Admin Dashboard
      - Authentication
      - User Management
      - Profile
      - Role-based authorization
    """

    __tablename__ = "users"

    # ==========================================================
    # PRIMARY KEY
    # ==========================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ==========================================================
    # BASIC USER INFORMATION
    # ==========================================================

    name = Column(
        String(100),
        nullable=False,
    )

    email = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    mobile = Column(
        String(20),
        unique=True,
        nullable=True,
    )

    gender = Column(
        String(20),
        nullable=True,
    )

    address = Column(
        Text,
        nullable=True,
    )

    # ==========================================================
    # ACCOUNT STATUS
    # ==========================================================

    active = Column(
        Boolean,
        default=True,
        nullable=False,
    )

    # ==========================================================
    # ROLE
    # ==========================================================

    role = Column(
        String(50),
        nullable=False,
        default=UserRole.PROCUREMENT_MANAGER.value,
        index=True,
    )

    # ==========================================================
    # AUTHENTICATION
    # ==========================================================

    hashed_password = Column(
        String(255),
        nullable=False,
    )

    # ==========================================================
    # LAST LOGIN
    # ==========================================================

    last_login = Column(
        DateTime,
        nullable=True,
    )

    # ==========================================================
    # CREATED DATE
    # ==========================================================

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # ==========================================================
    # PROFILE INFORMATION
    # ==========================================================

    employee_id = Column(
        String(50),
        unique=True,
        nullable=True,
        index=True
    )

    alternate_email = Column(
        String(150),
        unique=True,
        nullable=True
    )

    department = Column(
        String(150),
        nullable=True
    )

    job_title = Column(
        String(150),
        nullable=True
    )

    location = Column(
        String(200),
        nullable=True
    )

    reporting_manager_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    date_of_joining = Column(
        Date,
        nullable=True
    )

    profile_image = Column(
        String(500),
        nullable=True
    )

    # ==========================================================
    # SECURITY
    # ==========================================================

    two_factor_enabled = Column(
        Boolean,
        default=False,
        nullable=False
    )

    login_email_notifications = Column(
        Boolean,
        default=True,
        nullable=False
    )

    date_of_birth = Column(
        Date,
        nullable=True
    )

    nationality = Column(
        String(100),
        nullable=True
    )

    languages = Column(
        String(255),
        nullable=True
    )

    about_me = Column(
        Text,
        nullable=True
    )

    work_phone = Column(
        String(30),
        nullable=True
    )

    team_size = Column(
        Integer,
        nullable=True
    )

    employment_type = Column(
        String(50),
        nullable=True
    )

    business_unit = Column(
        String(150),
        nullable=True
    )

    password_changed_at = Column(
        DateTime,
        nullable=True
    )

    # ==========================================================
    # RELATIONSHIPS
    # ==========================================================

    activities = relationship(
        "SystemActivity",
        back_populates="user",
    )

    reporting_manager = relationship(
        "User",
        remote_side=[id],
        foreign_keys=[reporting_manager_id]
    )

    feedback = relationship(
        "Feedback",
        back_populates="user",
        cascade="all, delete-orphan"
    )


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        unique=True,
        index=True
    )

    name = Column(
        String(150),
        nullable=False
    )

    relationship_type = Column(
        String(50),
        nullable=True
    )

    phone = Column(
        String(30),
        nullable=True
    )

    email = Column(
        String(150),
        nullable=True
    )

    address = Column(
        String(255),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    user = relationship(
        "User",
        backref="emergency_contact",
        uselist=False
    )


class UserSkill(Base):
    __tablename__ = "user_skills"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    skill_name = Column(
        String(150),
        nullable=False
    )

    proficiency = Column(
        Float,
        nullable=False,
        default=0
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    user = relationship(
        "User",
        backref="skills"
    )


# ============================================================
# HTML PAGE 2 - VENDOR REGISTRATION / VENDOR MANAGEMENT / VENDOR PROFILE / VENDOR DASHBOARD
# ============================================================

class Vendor(Base):
    """
    Main Vendor table.

    This single table contains:
    - Vendor registration information
    - Vendor profile information
    - Approval information
    - Dashboard performance metrics
    - Contact information
    - Vendor status
    """

    __tablename__ = "vendors"

    # ==========================================================
    # PRIMARY KEY
    # ==========================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # ==========================================================
    # VENDOR IDENTIFICATION
    # ==========================================================

    vendor_id = Column(
        String(10),
        unique=True,
        nullable=False,
        index=True
    )

    vendor_name = Column(
        String(150),
        nullable=False,
        index=True
    )

    # ==========================================================
    # REGISTRATION INFORMATION
    # ==========================================================

    country = Column(
        String(100),
        nullable=True
    )

    email = Column(
        String(150),
        unique=True,
        nullable=False,
        index=True
    )

    phone = Column(
        String(20),
        unique=True,
        nullable=True
    )

    business_type = Column(
        String(100),
        nullable=True
    )

    address = Column(
        String(255),
        nullable=True
    )

    hashed_password = Column(
        String(255),
        nullable=True
    )

    # ==========================================================
    # VENDOR MANAGEMENT
    # ==========================================================

    category = Column(
        String(100),
        nullable=True,
        index=True
    )

    contact_person = Column(
        String(150),
        nullable=True
    )

    status = Column(
        String(50),
        nullable=False,
        default="Pending",
        index=True
    )

    # ==========================================================
    # APPROVAL INFORMATION
    # ==========================================================

    approved_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    # ==========================================================
    # PERFORMANCE METRICS
    # ==========================================================

    reliability_score = Column(
        Float,
        nullable=True
    )

    trend = Column(
        String(20),
        nullable=True
    )

    quality_score = Column(
        Float,
        nullable=True
    )

    delivery_score = Column(
        Float,
        nullable=True
    )

    service_score = Column(
        Float,
        nullable=True
    )

    # ==========================================================
    # CONTRACT COUNT
    # ==========================================================
    # This is different from the SQLAlchemy contracts relationship.

    contract_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    website = Column(
        String(255),
        nullable=True
    )

    gst_vat_number = Column(
        String(100),
        nullable=True
    )

    tax_id_ein = Column(
        String(100),
        nullable=True
    )

    pan_number = Column(
        String(50),
        nullable=True
    )

    member_since = Column(
        Date,
        nullable=True
    )

    is_preferred = Column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )

    # ==========================================================
    # RELATIONSHIPS
    # ==========================================================

    purchase_orders = relationship(
        "PurchaseOrder",
        back_populates="vendor",
        cascade="all, delete-orphan"
    )

    contracts = relationship(
        "Contract",
        back_populates="vendor",
        cascade="all, delete-orphan"
    )

    invoices = relationship(
        "Invoice",
        back_populates="vendor"
    )

    approver = relationship(
        "User",
        foreign_keys=[approved_by]
    )

    communication_messages = relationship(
        "CommunicationMessage",
        back_populates="vendor",
        cascade="all, delete-orphan"
    )

    communication_files = relationship(
        "CommunicationFile",
        back_populates="vendor",
        cascade="all, delete-orphan"
    )

    communication_activities = relationship(
        "CommunicationActivity",
        back_populates="vendor",
        cascade="all, delete-orphan"
    )

    performance_history = relationship(
        "VendorPerformanceHistory",
        back_populates="vendor",
        cascade="all, delete-orphan"
    )


class VendorSettings(Base):
    __tablename__ = "vendor_settings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        String(20),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="CASCADE"
        ),
        unique=True,
        nullable=False,
        index=True
    )

    # ======================================================
    # NOTIFICATIONS
    # ======================================================

    email_notifications = Column(
        Boolean,
        default=True,
        nullable=False
    )

    system_notifications = Column(
        Boolean,
        default=True,
        nullable=False
    )

    sms_notifications = Column(
        Boolean,
        default=True,
        nullable=False
    )

    digest_frequency = Column(
        String(30),
        default="Daily",
        nullable=False
    )

    # ======================================================
    # DOCUMENT SETTINGS
    # ======================================================

    document_expiry_alert_days = Column(
        Integer,
        default=30,
        nullable=False
    )

    auto_document_reminder = Column(
        Boolean,
        default=True,
        nullable=False
    )

    allowed_file_types = Column(
        Text,
        default="PDF,DOC,DOCX,XLS,XLSX,PNG,JPG",
        nullable=False
    )

    max_file_size_mb = Column(
        Integer,
        default=25,
        nullable=False
    )

    # ======================================================
    # SECURITY
    # ======================================================

    two_factor_authentication = Column(
        Boolean,
        default=True,
        nullable=False
    )

    password_changed_at = Column(
        DateTime,
        nullable=True
    )

    active_sessions = Column(
        Integer,
        default=1,
        nullable=False
    )

    account_security_status = Column(
        String(30),
        default="Good",
        nullable=False
    )

    # ======================================================
    # PREFERENCES
    # ======================================================

    language = Column(
        String(50),
        default="English",
        nullable=False
    )

    timezone = Column(
        String(100),
        default="(UTC+05:30) Chennai, India",
        nullable=False
    )

    date_format = Column(
        String(50),
        default="DD MMM YYYY",
        nullable=False
    )

    currency = Column(
        String(100),
        default="USD - US Dollar",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class VendorUserAccess(Base):
    __tablename__ = "vendor_user_access"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        String(20),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    role_id = Column(
        Integer,
        ForeignKey(
            "roles.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    status = Column(
        String(30),
        default="Active",
        nullable=False
    )

    invited_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    joined_at = Column(
        DateTime,
        nullable=True
    )

    __table_args__ = (
        UniqueConstraint(
            "vendor_id",
            "user_id",
            name="uq_vendor_user_access"
        ),
    )


class VendorSubscription(Base):
    __tablename__ = "vendor_subscriptions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        String(20),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="CASCADE"
        ),
        unique=True,
        nullable=False,
        index=True
    )

    plan_name = Column(
        String(50),
        default="Standard",
        nullable=False
    )

    storage_used_gb = Column(
        Float,
        default=0,
        nullable=False
    )

    storage_limit_gb = Column(
        Float,
        default=10,
        nullable=False
    )

    status = Column(
        String(30),
        default="Active",
        nullable=False
    )

    started_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    expires_at = Column(
        DateTime,
        nullable=True
    )


# ==========================================================
# PROCUREMENT REQUEST
# ==========================================================


# ============================================================
# HTML PAGE 3 - PROCUREMENT OVERVIEW
# ============================================================

class ProcurementRequest(Base):

    __tablename__ = "procurement_requests"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    request_number = Column(
        String(30),
        unique=True,
        nullable=False,
        index=True
    )

    title = Column(
        String(255),
        nullable=True,
        index=True
    )

    requester = Column(
        String(150),
        nullable=True
    )

    requester_user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    department = Column(
        String(100),
        nullable=True,
        index=True
    )

    category = Column(
        String(100),
        nullable=True,
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    amount = Column(
        Float,
        default=0
    )

    status = Column(
        String(50),
        default="Draft",
        nullable=False,
        index=True
    )

    priority = Column(
        String(20),
        nullable=False,
        default="Medium",
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    submitted_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    required_date = Column(
        Date,
        nullable=True
    )

    approved_at = Column(
        DateTime,
        nullable=True
    )

    approved_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    rejection_reason = Column(
        Text,
        nullable=True
    )

    po_number = Column(
        String(30),
        nullable=True,
        index=True
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class ProcurementDocument(Base):

    __tablename__ = "procurement_documents"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    procurement_request_id = Column(
        Integer,
        ForeignKey(
            "procurement_requests.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    file_name = Column(
        String(255),
        nullable=False
    )

    file_path = Column(
        String(500),
        nullable=False
    )

    file_type = Column(
        String(100),
        nullable=True
    )

    uploaded_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    uploaded_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# ============================================================
# PROCUREMENT BUDGETS
# ============================================================

class ProcurementBudget(Base):
    __tablename__ = "procurement_budgets"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    month = Column(
        Integer,
        nullable=False,
        index=True
    )

    year = Column(
        Integer,
        nullable=False,
        index=True
    )

    department = Column(
        String(150),
        nullable=True,
        index=True
    )

    category = Column(
        String(150),
        nullable=True,
        index=True
    )

    budget_amount = Column(
        Float,
        nullable=False,
        default=0
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "month",
            "year",
            "department",
            "category",
            name="uq_procurement_budget_period"
        ),
    )


# ============================================================
# PROCUREMENT SAVINGS
# ============================================================

class ProcurementSavings(Base):
    __tablename__ = "procurement_savings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    po_id = Column(
        Integer,
        ForeignKey(
            "purchase_orders.id",
            ondelete="CASCADE"
        ),
        nullable=True,
        index=True
    )

    vendor_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    category = Column(
        String(100),
        nullable=True
    )

    department = Column(
        String(100),
        nullable=True
    )

    savings_amount = Column(
        Float,
        nullable=False,
        default=0
    )

    savings_date = Column(
        Date,
        nullable=False,
        default=date.today,
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# ==========================================================
# PURCHASE ORDER
# ==========================================================

class PurchaseOrder(Base):

    __tablename__ = "purchase_orders"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    po_number = Column(
        String(30),
        unique=True,
        nullable=False
    )

    vendor_id = Column(
        String,
        ForeignKey("vendors.vendor_id"),
        nullable=True
    )

    amount = Column(
        Float,
        default=0
    )

    status = Column(
        String(50),
        default="Pending",
        index=True
    )

    order_date = Column(
        Date,
        nullable=True,
        index=True
    )

    expected_delivery = Column(
        Date,
        nullable=True
    )

    actual_delivery = Column(
        Date,
        nullable=True
    )

    category = Column(
        String(100),
        nullable=True,
        index=True
    )

    pr_id = Column(
        Integer,
        ForeignKey(
            "procurement_requests.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    pr_number = Column(
        String(30),
        nullable=True,
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    approved_at = Column(
        DateTime,
        nullable=True
    )

    received_at = Column(
        DateTime,
        nullable=True
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    department = Column(
        String(100),
        nullable=True,
        index=True
    )

    creator = relationship(
        "User",
        foreign_keys=[created_by]
    )

    # ==========================================================
    # RELATIONSHIPS
    # ==========================================================

    details = relationship(
        "PurchaseOrderDetails",
        back_populates="purchase_order",
        uselist=False,
        cascade="all, delete-orphan"
    )

    items = relationship(
        "PurchaseOrderItem",
        back_populates="purchase_order",
        cascade="all, delete-orphan"
    )

    vendor = relationship(
        "Vendor",
        back_populates="purchase_orders",
    )


class PurchaseOrderDetails(Base):

    __tablename__="purchase_order_details"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    purchase_order_id = Column(
        Integer,
        ForeignKey(
            "purchase_orders.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        unique=True,
        index=True
    )

    po_type = Column(
        String(50),
        nullable=True
    )

    supplier_reference = Column(
        String(100),
        nullable=True
    )

    contact_person = Column(
        String(150),
        nullable=True
    )

    contact_phone = Column(
        String(30),
        nullable=True
    )

    contact_email = Column(
        String(150),
        nullable=True
    )

    payment_method = Column(
        String(50),
        nullable=True
    )

    payment_terms = Column(
        String(100),
        nullable=True
    )

    incoterms = Column(
        String(50),
        nullable=True
    )

    currency = Column(
        String(10),
        nullable=True,
        default="USD"
    )

    exchange_rate = Column(
        Numeric(12, 4),
        nullable=True
    )

    delivery_warehouse_id = Column(
        Integer,
        ForeignKey(
            "warehouses.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    notes = Column(
        Text,
        nullable=True
    )

    subtotal = Column(
        Numeric(14, 2),
        nullable=False,
        default=0
    )

    tax_amount = Column(
        Numeric(14, 2),
        nullable=False,
        default=0
    )

    shipping_amount = Column(
        Numeric(14, 2),
        nullable=False,
        default=0
    )

    total_amount = Column(
        Numeric(14, 2),
        nullable=False,
        default=0
    )

    purchase_order = relationship(
        "PurchaseOrder",
        back_populates="details"
    )

    delivery_warehouse = relationship(
        "Warehouse"
    )


class PurchaseOrderItem(Base):

    __tablename__="purchase_order_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    purchase_order_id = Column(
        Integer,
        ForeignKey(
            "purchase_orders.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    inventory_item_id = Column(
        Integer,
        ForeignKey(
            "inventory_items.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    item_code = Column(
        String(50),
        nullable=False
    )

    item_description = Column(
        String(500),
        nullable=False
    )

    uom = Column(
        String(20),
        nullable=False,
        default="PCS"
    )

    quantity = Column(
        Numeric(14, 3),
        nullable=False,
        default=1
    )

    unit_price = Column(
        Numeric(14, 2),
        nullable=False,
        default=0
    )

    tax_rate = Column(
        Numeric(6, 2),
        nullable=False,
        default=0
    )

    tax_amount = Column(
        Numeric(14, 2),
        nullable=False,
        default=0
    )

    amount = Column(
        Numeric(14, 2),
        nullable=False,
        default=0
    )

    received_quantity = Column(
        Numeric(14, 3),
        nullable=False,
        default=0
    )

    purchase_order = relationship(
        "PurchaseOrder",
        back_populates="items"
    )

    inventory_item = relationship(
        "InventoryItem"
    )


class OrderTrackingEvent(Base):
    __tablename__ = "order_tracking_events"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    shipment_id = Column(
        Integer,
        ForeignKey(
            "shipments.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    event_type = Column(
        String(50),
        nullable=False
    )

    event_time = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True
    )

    location = Column(
        String(200),
        nullable=True
    )

    note = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    shipment = relationship(
        "Shipment",
        back_populates="tracking_events"
    )


# ============================================================
# APPROVAL WORKFLOW
# ============================================================

class ApprovalWorkflow(Base):
    __tablename__ = "approval_workflows"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # PR or PO
    reference_type = Column(
        String(20),
        nullable=False,
        index=True
    )

    # ID of procurement_requests.id or purchase_orders.id
    reference_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    # PR-2024-0128 / PO-2024-1260
    reference_number = Column(
        String(50),
        nullable=False,
        index=True
    )

    title = Column(
        String(255),
        nullable=True
    )

    requested_by_user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    department = Column(
        String(100),
        nullable=True,
        index=True
    )

    amount = Column(
        Numeric(14, 2),
        nullable=False,
        default=0
    )

    priority = Column(
        String(20),
        nullable=True,
        default="Medium",
        index=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="Pending",
        index=True
    )

    current_step = Column(
        Integer,
        nullable=False,
        default=1
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    completed_at = Column(
        DateTime,
        nullable=True
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    requested_by = relationship(
        "User",
        foreign_keys=[requested_by_user_id]
    )

    steps = relationship(
        "ApprovalStep",
        back_populates="workflow",
        cascade="all, delete-orphan",
        order_by="ApprovalStep.step_order"
    )


# ============================================================
# APPROVAL STEPS
# ============================================================

class ApprovalStep(Base):
    __tablename__ = "approval_steps"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    workflow_id = Column(
        Integer,
        ForeignKey(
            "approval_workflows.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    step_order = Column(
        Integer,
        nullable=False
    )

    step_name = Column(
        String(100),
        nullable=False
    )

    approver_user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="Pending",
        index=True
    )

    comments = Column(
        Text,
        nullable=True
    )

    acted_at = Column(
        DateTime,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    workflow = relationship(
        "ApprovalWorkflow",
        back_populates="steps"
    )

    approver = relationship(
        "User",
        foreign_keys=[approver_user_id]
    )


# ============================================================
# APPROVAL DELEGATION
# ============================================================

class ApprovalDelegation(Base):
    """
    Stores approval authority delegated from one user to another.

    Example:
        Finance Officer A
            delegates
        Finance Officer B

    for:
        All Approvals
        or a specific approval type
    """

    __tablename__ = "approval_delegations"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # --------------------------------------------------------
    # USER WHO IS DELEGATING APPROVAL AUTHORITY
    # --------------------------------------------------------

    delegator_user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    # --------------------------------------------------------
    # USER RECEIVING THE DELEGATED AUTHORITY
    # --------------------------------------------------------

    delegate_user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    # --------------------------------------------------------
    # TYPE OF APPROVAL
    # --------------------------------------------------------

    approval_type = Column(
        String(100),
        nullable=False,
        default="All Approvals",
        index=True
    )

    # --------------------------------------------------------
    # DELEGATION PERIOD
    # --------------------------------------------------------

    start_date = Column(
        Date,
        nullable=False
    )

    end_date = Column(
        Date,
        nullable=False
    )

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    status = Column(
        String(30),
        nullable=False,
        default="Active",
        index=True
    )

    # --------------------------------------------------------
    # CREATED / UPDATED
    # --------------------------------------------------------

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # --------------------------------------------------------
    # RELATIONSHIPS
    # --------------------------------------------------------

    delegator = relationship(
        "User",
        foreign_keys=[delegator_user_id]
    )

    delegate = relationship(
        "User",
        foreign_keys=[delegate_user_id]
    )


# ============================================================
# SUPPLIER ASSESSMENT
# ============================================================

class SupplierAssessment(Base):

    __tablename__ = "supplier_assessments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    assessment_date = Column(
        Date,
        nullable=False,
        index=True
    )

    score = Column(
        Float,
        nullable=False,
        default=0
    )

    status = Column(
        String(30),
        nullable=False,
        default="Good"
    )

    notes = Column(
        Text,
        nullable=True
    )

    vendor = relationship(
        "Vendor"
    )


class SupplierBusinessDetails(Base):

    __tablename__ = "supplier_business_details"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="CASCADE"
        ),
        unique=True,
        nullable=False,
        index=True
    )

    legal_entity_name = Column(
        String(200),
        nullable=True
    )

    website = Column(
        String(255),
        nullable=True
    )

    tax_id_gst = Column(
        String(100),
        nullable=True
    )

    industry = Column(
        String(100),
        nullable=True
    )

    supplier_type = Column(
        String(100),
        nullable=True
    )

    duns_number = Column(
        String(30),
        nullable=True
    )

    year_established = Column(
        Integer,
        nullable=True
    )

    preferred_language = Column(
        String(50),
        nullable=True
    )

    currency = Column(
        String(10),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class SupplierAddress(Base):

    __tablename__ = "supplier_addresses"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    address_type = Column(
        String(30),
        nullable=False
    )

    address_line1 = Column(
        String(255),
        nullable=False
    )

    address_line2 = Column(
        String(255),
        nullable=True
    )

    city = Column(
        String(100),
        nullable=False
    )

    state_province = Column(
        String(100),
        nullable=False
    )

    postal_code = Column(
        String(30),
        nullable=False
    )

    country = Column(
        String(100),
        nullable=False
    )

    phone = Column(
        String(30),
        nullable=True
    )

    email = Column(
        String(150),
        nullable=True
    )

    is_primary = Column(
        Boolean,
        default=False,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )


class SupplierContact(Base):

    __tablename__ = "supplier_contacts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    contact_name = Column(
        String(150),
        nullable=False
    )

    job_title = Column(
        String(100),
        nullable=True
    )

    email = Column(
        String(150),
        nullable=True
    )

    phone = Column(
        String(30),
        nullable=True
    )

    contact_type = Column(
        String(50),
        nullable=True
    )

    is_primary = Column(
        Boolean,
        default=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


class SupplierBankAccount(Base):

    __tablename__ = "supplier_bank_accounts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    bank_name = Column(
        String(150),
        nullable=False
    )

    account_name = Column(
        String(150),
        nullable=True
    )

    account_last_four = Column(
        String(4),
        nullable=True
    )

    ifsc_swift = Column(
        String(50),
        nullable=True
    )

    branch_name = Column(
        String(150),
        nullable=True
    )

    currency = Column(
        String(10),
        nullable=True
    )

    is_primary = Column(
        Boolean,
        default=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# ==========================================================
# INVOICE
# ==========================================================


# ============================================================
# HTML PAGE 4 - CONTRACTS & COMPLIANCE
# ============================================================

class Contract(Base):
    """
    Contract and compliance data used by Admin, Procurement Manager,
    and Vendor dashboards.
    """

    __tablename__ = "contracts"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    contract_number = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
    )

    vendor_id = Column(
        String,
        ForeignKey(
            "vendors.vendor_id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    status = Column(
        String(30),
        nullable=False,
        index=True,
    )

    expiry_date = Column(
        Date,
        nullable=True,
    )

    renewal_date = Column(
        Date,
        nullable=True,
    )

    contract_value = Column(
        Numeric(12, 2),
        nullable=True,
    )

    compliance_status = Column(
        String(30),
        nullable=True,
    )

    risk_level = Column(
        String(20),
        nullable=True,
    )

    renewal_status = Column(
        String(30),
        nullable=True,
    )

    vendor = relationship(
        "Vendor",
        back_populates="contracts",
    )


class ComplianceReportHistory(Base):
    __tablename__ = "compliance_report_history"

    id = Column(Integer, primary_key=True, index=True)

    vendor_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    month = Column(
        String(20),
        nullable=False
    )

    year = Column(
        Integer,
        nullable=False,
        index=True
    )

    compliance_score = Column(
        Float,
        nullable=False,
        default=0
    )

    compliant_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    expiring_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    pending_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    non_compliant_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    overdue_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "vendor_id",
            "month",
            "year",
            name="uq_compliance_report_vendor_month"
        ),
    )


# ============================================================
# COMPLIANCE AREAS
# ============================================================

class ComplianceArea(Base):

    __tablename__ = "compliance_areas"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(150),
        nullable=False,
        unique=True,
        index=True
    )

    category = Column(
        String(100),
        nullable=False,
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    score = Column(
        Float,
        nullable=False,
        default=0
    )

    status = Column(
        String(30),
        nullable=False,
        default="Compliant",
        index=True
    )

    previous_score = Column(
        Float,
        nullable=False,
        default=0
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )


# ============================================================
# COMPLIANCE ACTIVITIES
# ============================================================

class ComplianceActivity(Base):

    __tablename__ = "compliance_activities"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    activity = Column(
        String(250),
        nullable=False
    )

    category = Column(
        String(100),
        nullable=False,
        index=True
    )

    activity_date = Column(
        Date,
        nullable=False,
        index=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="Pending",
        index=True
    )

    assigned_to = Column(
        String(150),
        nullable=True
    )

    description = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )


# ============================================================
# COMPLIANCE DEADLINES
# ============================================================

class ComplianceDeadline(Base):

    __tablename__ = "compliance_deadlines"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    activity_id = Column(
        Integer,
        ForeignKey(
            "compliance_activities.id",
            ondelete="CASCADE"
        ),
        nullable=True,
        index=True
    )

    title = Column(
        String(250),
        nullable=False
    )

    category = Column(
        String(100),
        nullable=False,
        index=True
    )

    due_date = Column(
        Date,
        nullable=False,
        index=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="Pending",
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    assigned_to = Column(
        String(150),
        nullable=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )


# ============================================================
# COMPLIANCE ALERTS
# ============================================================

class ComplianceAlert(Base):

    __tablename__ = "compliance_alerts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String(250),
        nullable=False
    )

    message = Column(
        Text,
        nullable=False
    )

    category = Column(
        String(100),
        nullable=True,
        index=True
    )

    severity = Column(
        String(30),
        nullable=False,
        default="Medium",
        index=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True
    )

    is_resolved = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True
    )


# ============================================================
# HTML PAGE 5 - INVOICES & PAYMENTS
# ============================================================

class Invoice(Base):

    __tablename__ = "invoices"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    invoice_number = Column(
        String(50),
        unique=True,
        nullable=False
    )

    po_id = Column(
        Integer,
        ForeignKey("purchase_orders.id"),
        nullable=True
    )

    vendor_id = Column(
        String,
        ForeignKey("vendors.vendor_id"),
        nullable=True
    )

    amount = Column(
        Float,
        default=0
    )

    status = Column(
        String(50),
        default="Pending"
    )

    invoice_date = Column(
        Date,
        nullable=True
    )

    due_date = Column(
        Date,
        nullable=True,
        index=True
    )

    paid_date = Column(
        Date,
        nullable=True
    )

    customer_id = Column(
        Integer,
        ForeignKey(
            "customers.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    # ==========================================================
    # RELATIONSHIPS
    # ==========================================================

    vendor = relationship(
        "Vendor",
        back_populates="invoices",
    )

    payments = relationship(
        "Payment",
        back_populates="invoice",
        cascade="all, delete-orphan"
    )

    items = relationship(
        "InvoiceItem",
        back_populates="invoice",
        cascade="all, delete-orphan"
    )

    attachments = relationship(
        "InvoiceAttachment",
        back_populates="invoice",
        cascade="all, delete-orphan"
    )

    history = relationship(
        "InvoiceHistory",
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="InvoiceHistory.created_at.desc()"
    )

    workflow = relationship(
        "InvoiceWorkflow",
        back_populates="invoice",
        uselist=False,
        cascade="all, delete-orphan"
    )

    customer = relationship(
        "Customer",
        back_populates="invoices"
    )


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    invoice_id = Column(
        Integer,
        ForeignKey(
            "invoices.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    purchase_order_item_id = Column(
        Integer,
        ForeignKey(
            "purchase_order_items.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    item_code = Column(
        String(50),
        nullable=True
    )

    description = Column(
        String(500),
        nullable=False
    )

    quantity = Column(
        Numeric(14, 3),
        nullable=False,
        default=1
    )

    unit_price = Column(
        Numeric(14, 2),
        nullable=False,
        default=0
    )

    tax_rate = Column(
        Numeric(6, 2),
        nullable=False,
        default=0
    )

    tax_amount = Column(
        Numeric(14, 2),
        nullable=False,
        default=0
    )

    amount = Column(
        Numeric(14, 2),
        nullable=False,
        default=0
    )

    invoice = relationship(
        "Invoice",
        back_populates="items"
    )

    purchase_order_item = relationship(
        "PurchaseOrderItem"
    )

class InvoiceAttachment(Base):
    __tablename__ = "invoice_attachments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    invoice_id = Column(
        Integer,
        ForeignKey(
            "invoices.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    file_name = Column(
        String(255),
        nullable=False
    )

    file_path = Column(
        String(500),
        nullable=False
    )

    file_type = Column(
        String(100),
        nullable=True
    )

    file_size = Column(
        Integer,
        nullable=True
    )

    uploaded_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    invoice = relationship(
        "Invoice",
        back_populates="attachments"
    )


class InvoiceHistory(Base):
    __tablename__ = "invoice_history"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    invoice_id = Column(
        Integer,
        ForeignKey(
            "invoices.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    action = Column(
        String(100),
        nullable=False
    )

    old_status = Column(
        String(50),
        nullable=True
    )

    new_status = Column(
        String(50),
        nullable=True
    )

    description = Column(
        Text,
        nullable=True
    )

    performed_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    invoice = relationship(
        "Invoice",
        back_populates="history"
    )


class InvoiceWorkflow(Base):
    __tablename__ = "invoice_workflows"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    invoice_id = Column(
        Integer,
        ForeignKey(
            "invoices.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        unique=True,
        index=True
    )

    current_step = Column(
        Integer,
        default=1,
        nullable=False
    )

    status = Column(
        String(30),
        default="Pending Approval",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    invoice = relationship(
        "Invoice",
        back_populates="workflow"
    )

    steps = relationship(
        "InvoiceWorkflowStep",
        back_populates="workflow",
        cascade="all, delete-orphan",
        order_by="InvoiceWorkflowStep.step_order"
    )


class InvoiceWorkflowStep(Base):
    __tablename__ = "invoice_workflow_steps"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    workflow_id = Column(
        Integer,
        ForeignKey(
            "invoice_workflows.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    step_order = Column(
        Integer,
        nullable=False
    )

    step_name = Column(
        String(100),
        nullable=False
    )

    status = Column(
        String(30),
        default="Pending",
        nullable=False
    )

    assigned_to = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    completed_at = Column(
        DateTime,
        nullable=True
    )

    notes = Column(
        Text,
        nullable=True
    )

    workflow = relationship(
        "InvoiceWorkflow",
        back_populates="steps"
    )


class Payment(Base):

    __tablename__ = "payments"

    # ==========================================================
    # PRIMARY KEY
    # ==========================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # ==========================================================
    # INVOICE
    # ==========================================================

    invoice_id = Column(
        Integer,
        ForeignKey(
            "invoices.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    # ==========================================================
    # PAYMENT REFERENCE
    # ==========================================================

    payment_reference = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    # ==========================================================
    # PAYMENT DATE
    # ==========================================================

    payment_date = Column(
        Date,
        default=lambda: datetime.utcnow().date(),
        nullable=False
    )

    # ==========================================================
    # PAYMENT AMOUNT
    # ==========================================================

    amount = Column(
        Float,
        nullable=False,
        default=0
    )

    # ==========================================================
    # PAYMENT METHOD
    # ==========================================================

    payment_method = Column(
        String(50),
        nullable=True
    )

    # Examples:
    # Bank Transfer
    # Credit Card
    # Debit Card
    # Cheque
    # Cash
    # ACH
    # Wire Transfer

    # ==========================================================
    # PAYMENT STATUS
    # ==========================================================

    status = Column(
        String(50),
        nullable=False,
        default="Completed"
    )

    # Examples:
    # Pending
    # Completed
    # Failed
    # Cancelled
    # Refunded

    # ==========================================================
    # TRANSACTION ID
    # ==========================================================

    transaction_id = Column(
        String(150),
        nullable=True,
        index=True
    )

    # ==========================================================
    # PAYMENT NOTES
    # ==========================================================

    notes = Column(
        Text,
        nullable=True
    )

    # ==========================================================
    # CREATED / UPDATED
    # ==========================================================

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # ==========================================================
    # RELATIONSHIP
    # ==========================================================

    invoice = relationship(
        "Invoice",
        back_populates="payments"
    )


# ============================================================
# PAYMENT METHOD
# ============================================================

class PaymentMethod(Base):

    __tablename__ = "payment_methods"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    method_type = Column(
        String(50),
        nullable=False
    )

    account_name = Column(
        String(150),
        nullable=False
    )

    account_number = Column(
        String(100),
        nullable=False
    )

    bank_name = Column(
        String(150),
        nullable=True
    )

    branch_name = Column(
        String(150),
        nullable=True
    )

    ifsc_code = Column(
        String(50),
        nullable=True
    )

    is_default = Column(
        Boolean,
        default=False,
        nullable=False
    )

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )


# ==========================================================
# NOTIFICATIONS
# ==========================================================


# ============================================================
# HTML PAGE 6 - COMMUNICATION / NOTIFICATIONS
# ============================================================

class Notification(Base):

    __tablename__ = "notifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="CASCADE"
        ),
        nullable=True,
        index=True
    )

    notification_type = Column(
        String(50),
        nullable=False,
        index=True
    )

    title = Column(
        String(255),
        nullable=False
    )

    message = Column(
        Text,
        nullable=True
    )

    category = Column(
        String(100),
        nullable=False,
        index=True
    )

    priority = Column(
        String(20),
        default="Low",
        nullable=False
    )

    channel = Column(
        String(50),
        default="In-App",
        nullable=False
    )

    status = Column(
        String(20),
        default="Unread",
        nullable=False,
        index=True
    )

    reference_id = Column(
        String(100),
        nullable=True
    )

    recipient_email = Column(
        String(255),
        nullable=True
    )

    recipient_phone = Column(
        String(30),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    is_email_sent = Column(
        Boolean,
        default=False
    )

    is_sms_sent = Column(
        Boolean,
        default=False
    )

    recipient_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    related_type = Column(
        String(50),
        nullable=True
    )

    read_at = Column(
        DateTime(timezone=True),
        nullable=True
    )


# ==========================================================
# NOTIFICATION SETTINGS
# ==========================================================

class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        unique=True,
        index=True
    )

    email_enabled = Column(
        Boolean,
        default=True,
        nullable=False
    )

    vendor_registration = Column(
        Boolean,
        default=True,
        nullable=False
    )

    po_updates = Column(
        Boolean,
        default=True,
        nullable=False
    )

    contract_expiration = Column(
        Boolean,
        default=True,
        nullable=False
    )

    sms_enabled = Column(
        Boolean,
        default=False,
        nullable=False
    )

    urgent_sms = Column(
        Boolean,
        default=True,
        nullable=False
    )

    browser_notifications = Column(
        Boolean,
        default=True,
        nullable=False
    )

    notification_sound = Column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class VendorNotificationSettings(Base):

    __tablename__ = "vendor_notification_settings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="CASCADE"
        ),
        nullable=False,
        unique=True,
        index=True
    )

    procurement_alerts = Column(
        Boolean,
        default=True,
        nullable=False
    )

    delivery_delay_notifications = Column(
        Boolean,
        default=True,
        nullable=False
    )

    vendor_approval_notifications = Column(
        Boolean,
        default=True,
        nullable=False
    )

    contract_expiry_alerts = Column(
        Boolean,
        default=True,
        nullable=False
    )

    compliance_notifications = Column(
        Boolean,
        default=True,
        nullable=False
    )

    email_notifications = Column(
        Boolean,
        default=True,
        nullable=False
    )

    sms_notifications = Column(
        Boolean,
        default=False,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


# ==========================================================
# EMAIL TEMPLATES
# ==========================================================

class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    template_name = Column(
        String(255),
        nullable=False
    )

    subject = Column(
        String(500),
        nullable=False
    )

    body = Column(
        Text,
        nullable=False
    )

    status = Column(
        String(20),
        default="Active",
        nullable=False
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


# ==========================================================
# SMS TEMPLATES
# ==========================================================

class SMSTemplate(Base):
    __tablename__ = "sms_templates"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    template_name = Column(
        String(255),
        nullable=False
    )

    message = Column(
        String(160),
        nullable=False
    )

    status = Column(
        String(20),
        default="Active",
        nullable=False
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


# ==========================================================
# NOTIFICATION LOGS
# ==========================================================

class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    recipient = Column(
        String(255),
        nullable=False
    )

    notification_type = Column(
        String(30),
        nullable=False
    )

    subject = Column(
        String(500),
        nullable=True
    )

    message = Column(
        Text,
        nullable=True
    )

    status = Column(
        String(30),
        default="Sent",
        nullable=False
    )

    error_message = Column(
        Text,
        nullable=True
    )

    sent_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )


# ==========================================================
# MESSAGES
# ==========================================================

class Message(Base):

    __tablename__ = "messages"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    sender = Column(
        String(150),
        nullable=False
    )

    subject = Column(
        String(255),
        nullable=True
    )

    message = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    is_read = Column(
        Integer,
        default=0
    )


# ==========================================================
# COMMUNICATION MESSAGE
# ==========================================================

# ==========================================================
# COMMUNICATION MESSAGE
# ==========================================================

class CommunicationMessage(Base):

    __tablename__ = "communication_messages"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # --------------------------------------------------------
    # VENDOR
    # Example: VND0000001
    # --------------------------------------------------------

    vendor_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id"
        ),
        nullable=False,
        index=True
    )

    # --------------------------------------------------------
    # SENDER
    #
    # Vendor message:
    #     sender_type = "vendor"
    #     sender_user_id = NULL
    #
    # User message:
    #     sender_type = "user"
    #     sender_user_id = users.id
    # --------------------------------------------------------

    sender_user_id = Column(
        Integer,
        ForeignKey(
            "users.id"
        ),
        nullable=True,
        index=True
    )

    # --------------------------------------------------------
    # RECIPIENT
    #
    # This is required for vendor -> specific employee
    # conversations.
    #
    # Example:
    # Procurement Manager = 2
    # Finance Officer     = 3
    # Auditor             = 4
    # --------------------------------------------------------

    recipient_user_id = Column(
        Integer,
        ForeignKey(
            "users.id"
        ),
        nullable=True,
        index=True
    )

    # --------------------------------------------------------
    # SENDER TYPE
    #
    # vendor
    # user
    # --------------------------------------------------------

    sender_type = Column(
        String(30),
        nullable=False,
        default="user",
        index=True
    )

    # --------------------------------------------------------
    # MESSAGE
    # --------------------------------------------------------

    message = Column(
        Text,
        nullable=False
    )

    # --------------------------------------------------------
    # MESSAGE TYPE
    # --------------------------------------------------------

    message_type = Column(
        String(30),
        nullable=False,
        default="Message"
    )

    # --------------------------------------------------------
    # READ STATUS
    # --------------------------------------------------------

    is_read = Column(
        Boolean,
        default=False,
        nullable=False
    )

    # --------------------------------------------------------
    # CREATED
    # --------------------------------------------------------

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        index=True
    )

    # --------------------------------------------------------
    # RELATIONSHIPS
    # --------------------------------------------------------

    vendor = relationship(
        "Vendor",
        back_populates="communication_messages"
    )

    sender = relationship(
        "User",
        foreign_keys=[sender_user_id]
    )

    recipient = relationship(
        "User",
        foreign_keys=[recipient_user_id]
    )


# ==========================================================
# COMMUNICATION FILE
# ==========================================================

class CommunicationFile(Base):

    __tablename__ = "communication_files"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        String,
        ForeignKey("vendors.vendor_id"),
        nullable=False
    )

    uploaded_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    file_name = Column(
        String(255),
        nullable=False
    )

    file_path = Column(
        String(500),
        nullable=False
    )

    file_size = Column(
        Float,
        default=0
    )

    file_type = Column(
        String(100),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    vendor = relationship(
        "Vendor",
        back_populates="communication_files"
    )


# ==========================================================
# COMMUNICATION ACTIVITY
# ==========================================================

class CommunicationActivity(Base):

    __tablename__ = "communication_activities"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        String,
        ForeignKey("vendors.vendor_id"),
        nullable=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    activity_type = Column(
        String(50),
        nullable=False
    )

    subject = Column(
        String(255),
        nullable=True
    )

    description = Column(
        Text,
        nullable=True
    )

    status = Column(
        String(50),
        default="Delivered"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        index=True
    )

    vendor = relationship(
        "Vendor"
    )

    user = relationship(
        "User"
    )


class CommunicationMessageAttachment(Base):
    __tablename__ = "communication_message_attachments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    message_id = Column(
        Integer,
        ForeignKey(
            "communication_messages.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    file_id = Column(
        Integer,
        ForeignKey(
            "communication_files.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    message = relationship(
        "CommunicationMessage"
    )

    file = relationship(
        "CommunicationFile"
    )


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"

    __table_args__ = (
        UniqueConstraint(
            "vendor_id",
            "user_id",
            name="uq_conversation_participant"
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    vendor_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="CASCADE"
        ),
        nullable=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    role = Column(
        String(100),
        nullable=True
    )

    joined_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    is_archived = Column(
        Boolean,
        default=False,
        nullable=False
    )

    last_read_at = Column(
        DateTime,
        nullable=True
    )

    user = relationship("User")
    vendor = relationship("Vendor")
    conversation = relationship(
        "Conversation",
        back_populates="participants"
    )


class Report(Base):

    __tablename__ = "reports"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    report_name = Column(
        String(255),
        nullable=False
    )

    category = Column(
        String(100),
        nullable=False
    )

    generated_by = Column(
        String(150),
        nullable=True
    )

    generated_at = Column(
        DateTime,
        nullable=True
    )

    format = Column(
        String(20),
        nullable=False
    )

    file_path = Column(
        String(500),
        nullable=True
    )

    file_size = Column(
        String(50),
        nullable=True
    )

    download_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    last_downloaded_at = Column(
        DateTime,
        nullable=True
    )

    report_type = Column(
        String(50),
        nullable=True,
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    from_date = Column(
        Date,
        nullable=True
    )

    to_date = Column(
        Date,
        nullable=True
    )

    status = Column(
        String(50),
        nullable=False,
        default="Completed",
        index=True
    )

    view_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    accuracy_score = Column(
        Float,
        nullable=False,
        default=100
    )


# ==========================================================
# SCHEDULED REPORT
# ==========================================================

class ScheduledReport(Base):

    __tablename__ = "scheduled_reports"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    report_name = Column(
        String(255),
        nullable=False
    )

    schedule = Column(
        String(255),
        nullable=False
    )

    next_run = Column(
        DateTime,
        nullable=True
    )

    recipients = Column(
        Text,
        nullable=True
    )

    format = Column(
        String(20),
        nullable=False,
        default="PDF"
    )

    status = Column(
        String(50),
        nullable=False,
        default="Active"
    )

    is_active = Column(
        Boolean,
        default=True
    )

    vendor_id = Column(
        String(10),
        ForeignKey("vendors.vendor_id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    filters_json = Column(
        Text,
        nullable=True
    )


# ==========================================================
# ROLE
# ==========================================================

class Role(Base):

    __tablename__ = "roles"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    role_type = Column(
        String(50),
        default="Custom",
        nullable=False
    )

    permissions = relationship(
        "RolePermission",
        back_populates="role",
        cascade="all, delete-orphan"
    )


# ==========================================================
# ROLE PERMISSION
# ==========================================================

class RolePermission(Base):

    __tablename__ = "role_permissions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    role_id = Column(
        Integer,
        ForeignKey(
            "roles.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    module = Column(
        String(150),
        nullable=False
    )

    permission = Column(
        String(150),
        nullable=False
    )

    access = Column(
        String(20),
        nullable=False,
        default="none"
    )

    role = relationship(
        "Role",
        back_populates="permissions"
    )

    __table_args__ = (
        UniqueConstraint(
            "role_id",
            "module",
            "permission",
            name="uq_role_permission"
        ),
    )


class SystemSettings(Base):

    __tablename__ = "system_settings"


    id = Column(
        Integer,
        primary_key=True,
        index=True
    )


    # ======================================================
    # GENERAL SETTINGS
    # ======================================================

    platform_name = Column(
        String(100),
        nullable=False,
        default="VendorIQ"
    )

    platform_tagline = Column(
        String(255),
        nullable=False,
        default="Vendor Reliability Platform"
    )

    default_language = Column(
        String(50),
        nullable=False,
        default="English (US)"
    )

    default_timezone = Column(
        String(100),
        nullable=False,
        default="(UTC+05:30) Asia/Kolkata"
    )

    date_format = Column(
        String(50),
        nullable=False,
        default="01 May 2024"
    )

    time_format = Column(
        String(50),
        nullable=False,
        default="12 Hour (03:30 PM)"
    )

    items_per_page = Column(
        Integer,
        nullable=False,
        default=10
    )

    currency = Column(
        String(100),
        nullable=False,
        default="IN - INDIAN RUPEE (₹)"
    )


    # ======================================================
    # USER & ACCESS
    # ======================================================

    allow_user_registration = Column(
        Boolean,
        nullable=False,
        default=True
    )

    require_email_verification = Column(
        Boolean,
        nullable=False,
        default=True
    )

    password_minimum_length = Column(
        Integer,
        nullable=False,
        default=8
    )

    session_timeout = Column(
        String(50),
        nullable=False,
        default="30 Minutes"
    )


    # ======================================================
    # SECURITY
    # ======================================================

    password_complexity = Column(
        Boolean,
        nullable=False,
        default=True
    )

    password_expiry = Column(
        String(50),
        nullable=False,
        default="90 Days"
    )

    max_login_attempts = Column(
        Integer,
        nullable=False,
        default=5
    )

    two_factor_authentication = Column(
        Boolean,
        nullable=False,
        default=True
    )


    # ======================================================
    # NOTIFICATIONS
    # ======================================================

    in_app_notifications = Column(
        Boolean,
        nullable=False,
        default=True
    )

    email_notifications = Column(
        Boolean,
        nullable=False,
        default=True
    )

    sms_notifications = Column(
        Boolean,
        nullable=False,
        default=False
    )

    digest_frequency = Column(
        String(50),
        nullable=False,
        default="Daily"
    )


    # ======================================================
    # EMAIL
    # ======================================================

    smtp_host = Column(
        String(255),
        nullable=True,
        default="smtp.vendoriq.com"
    )

    smtp_port = Column(
        Integer,
        nullable=False,
        default=587
    )

    from_email = Column(
        String(255),
        nullable=True,
        default="noreply@vendoriq.com"
    )

    from_name = Column(
        String(255),
        nullable=True,
        default="VendorIQ Platform"
    )


    # ======================================================
    # DATA & STORAGE
    # ======================================================

    data_retention_period = Column(
        String(50),
        nullable=False,
        default="2 Years"
    )

    file_storage_limit = Column(
        String(50),
        nullable=False,
        default="25 MB"
    )


    # ======================================================
    # BACKUP
    # ======================================================

    automatic_backups = Column(
        Boolean,
        nullable=False,
        default=True
    )

    backup_frequency = Column(
        String(50),
        nullable=False,
        default="Daily"
    )

    backup_time = Column(
        String(50),
        nullable=False,
        default="02:00 AM"
    )

    # ============================================================
    # DISPLAY / SYSTEM PREFERENCES
    # ============================================================

    number_format = Column(
        String(50),
        nullable=False,
        default="1,234.56"
    )

    measurement_unit = Column(
        String(100),
        nullable=False,
        default="Metric (kg, cm, km)"
    )

    default_dashboard = Column(
        String(100),
        nullable=False,
        default="Supply Chain Overview"
    )


    # ============================================================
    # OTHER SETTINGS
    # ============================================================

    maintenance_mode = Column(
        Boolean,
        nullable=False,
        default=False
    )

    system_updates_enabled = Column(
        Boolean,
        nullable=False,
        default=True
    )

    beta_features_enabled = Column(
        Boolean,
        nullable=False,
        default=False
    )


# ============================================================
# SETTINGS - COMPANY PROFILE
# ============================================================

class CompanyProfile(Base):

    __tablename__ = "company_profiles"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    company_name = Column(
        String(200),
        nullable=False
    )

    company_id = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    industry = Column(
        String(100),
        nullable=True
    )

    address = Column(
        Text,
        nullable=True
    )

    phone = Column(
        String(30),
        nullable=True
    )

    email = Column(
        String(255),
        nullable=True
    )

    website = Column(
        String(255),
        nullable=True
    )

    updated_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


# ============================================================
# SETTINGS - BUSINESS SETTINGS
# ============================================================

class BusinessSettings(Base):

    __tablename__ = "business_settings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    financial_year_start = Column(
        String(30),
        nullable=False,
        default="April"
    )

    default_warehouse_id = Column(
        Integer,
        ForeignKey(
            "warehouses.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    default_supplier_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    default_payment_terms = Column(
        String(100),
        nullable=False,
        default="Net 30 Days"
    )

    tax_calculation = Column(
        Boolean,
        nullable=False,
        default=True
    )

    multi_currency = Column(
        Boolean,
        nullable=False,
        default=True
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    tax_rate = Column(
        Float,
        nullable=False,
        default=18.0
    )


# ============================================================
# SETTINGS - USER PREFERENCES
# ============================================================

class UserPreferences(Base):

    __tablename__ = "user_preferences"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        unique=True,
        index=True
    )

    number_format = Column(
        String(50),
        nullable=False,
        default="1,234.56"
    )

    measurement_unit = Column(
        String(100),
        nullable=False,
        default="Metric (kg, cm, km)"
    )

    default_dashboard = Column(
        String(100),
        nullable=False,
        default="Supply Chain Overview"
    )

    theme = Column(
        String(20),
        nullable=False,
        default="Light"
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    language = Column(
        String(100),
        nullable=False,
        default="English (US)"
    )

    timezone = Column(
        String(100),
        nullable=False,
        default="(UTC+05:30) Asia/Kolkata"
    )

    date_format = Column(
        String(50),
        nullable=False,
        default="MM/DD/YYYY"
    )

    time_format = Column(
        String(50),
        nullable=False,
        default="12 Hour (AM/PM)"
    )

    currency = Column(
        String(100),
        nullable=False,
        default="USD - US Dollar"
    )

    dashboard_view = Column(
        String(50),
        nullable=False,
        default="Expanded View"
    )

    start_of_week = Column(
        String(20),
        nullable=False,
        default="Monday"
    )

    compact_mode = Column(
        Boolean,
        nullable=False,
        default=False
    )

    auto_attach_documents = Column(
        Boolean,
        nullable=False,
        default=True
    )

    export_format = Column(
        String(20),
        nullable=False,
        default="PDF"
    )

    font_size = Column(
        String(20),
        nullable=False,
        default="Medium"
    )

    primary_color = Column(
        String(30),
        nullable=False,
        default="Purple"
    )

    sidebar_position = Column(
        String(20),
        nullable=False,
        default="Left"
    )

    user = relationship(
        "User",
        backref="preferences",
        uselist=False
    )


class UserSession(Base):

    __tablename__ = "user_sessions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    session_token = Column(
        String(255),
        unique=True,
        nullable=False
    )

    device = Column(
        String(150),
        nullable=True
    )

    browser = Column(
        String(100),
        nullable=True
    )

    ip_address = Column(
        String(50),
        nullable=True
    )

    location = Column(
        String(200),
        nullable=True
    )

    is_current = Column(
        Boolean,
        default=False,
        nullable=False
    )

    last_active = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    user = relationship(
        "User"
    )


# ============================================================
# SETTINGS - INTEGRATIONS
# ============================================================

class Integration(Base):

    __tablename__ = "integrations"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    integration_name = Column(
        String(150),
        nullable=False,
        unique=True
    )

    integration_type = Column(
        String(50),
        nullable=False
    )

    provider_name = Column(
        String(150),
        nullable=False
    )

    status = Column(
        String(30),
        nullable=False,
        default="Not Connected"
    )

    endpoint = Column(
        String(500),
        nullable=True
    )

    last_sync_at = Column(
        DateTime,
        nullable=True
    )

    enabled = Column(
        Boolean,
        nullable=False,
        default=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


# ============================================================
# SETTINGS - BACKUP JOBS
# ============================================================

class BackupJob(Base):

    __tablename__ = "backup_jobs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    backup_type = Column(
        String(50),
        nullable=False,
        default="Manual"
    )

    status = Column(
        String(30),
        nullable=False,
        default="Queued"
    )

    file_path = Column(
        String(500),
        nullable=True
    )

    file_size = Column(
        String(50),
        nullable=True
    )

    started_at = Column(
        DateTime,
        nullable=True
    )

    completed_at = Column(
        DateTime,
        nullable=True
    )

    created_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


class AuditLog(Base):

    __tablename__ = "audit_logs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        nullable=True,
        index=True
    )

    user_email = Column(
        String(255),
        nullable=True,
        index=True
    )

    user_name = Column(
        String(255),
        nullable=True
    )

    role = Column(
        String(100),
        nullable=True,
        index=True
    )

    action = Column(
        String(100),
        nullable=False,
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    resource = Column(
        String(100),
        nullable=True,
        index=True
    )

    resource_id = Column(
        String(100),
        nullable=True
    )

    status = Column(
        String(50),
        nullable=False,
        default="Success",
        index=True
    )

    ip_address = Column(
        String(100),
        nullable=True
    )

    user_agent = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )


Index(
    "ix_audit_logs_created_at_action",
    AuditLog.created_at,
    AuditLog.action
)


# ==========================================================
# SYSTEM METRICS
# ==========================================================

class SystemMetric(Base):

    __tablename__ = "system_metrics"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    metric_type = Column(
        String(100),
        nullable=False,
        index=True
    )

    metric_value = Column(
        Float,
        nullable=False
    )

    recorded_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )


# ==========================================================
# SYSTEM ALERTS
# ==========================================================

class SystemAlert(Base):

    __tablename__ = "system_alerts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    issue = Column(
        String(255),
        nullable=False
    )

    severity = Column(
        String(50),
        nullable=False,
        default="Info"
    )

    status = Column(
        String(50),
        nullable=False,
        default="Open"
    )

    detected_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    resolved_at = Column(
        DateTime,
        nullable=True
    )

    details = Column(
        Text,
        nullable=True
    )


# ==========================================================
# SUPPORT TICKETS
# ==========================================================

class SupportTicket(Base):

    __tablename__ = "support_tickets"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    ticket_id = Column(
        String(30),
        unique=True,
        nullable=False,
        index=True
    )

    subject = Column(
        String(255),
        nullable=False
    )

    description = Column(
        Text,
        nullable=False
    )

    category = Column(
        String(100),
        nullable=False
    )

    priority = Column(
        String(30),
        default="Medium",
        nullable=False
    )

    status = Column(
        String(30),
        default="Open",
        nullable=False
    )

    created_by = Column(
        String(255),
        nullable=True
    )

    vendor_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    created_on = Column(
        DateTime,
        server_default=func.now()
    )

    updated_on = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )

    attachments = relationship(
        "SupportTicketAttachment",
        back_populates="ticket",
        cascade="all, delete-orphan"
    )


# ==========================================================
# FAQ
# ==========================================================

class SupportFAQ(Base):

    __tablename__ = "support_faqs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    question = Column(
        String(500),
        nullable=False
    )

    answer = Column(
        Text,
        nullable=False
    )

    category = Column(
        String(100),
        nullable=True
    )

    is_active = Column(
        Boolean,
        default=True
    )

    display_order = Column(
        Integer,
        default=0
    )


# ==========================================================
# QUICK LINKS
# ==========================================================

class SupportQuickLink(Base):

    __tablename__ = "support_quick_links"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String(255),
        nullable=False
    )

    description = Column(
        String(500),
        nullable=True
    )

    icon = Column(
        String(100),
        nullable=True
    )

    url = Column(
        String(500),
        nullable=True
    )

    display_order = Column(
        Integer,
        default=0
    )

    is_active = Column(
        Boolean,
        default=True
    )


# ==========================================================
# SUPPORT CONTACT
# ==========================================================

class SupportContact(Base):

    __tablename__ = "support_contacts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    contact_type = Column(
        String(100),
        nullable=False
    )

    title = Column(
        String(255),
        nullable=False
    )

    value = Column(
        String(255),
        nullable=False
    )

    description = Column(
        String(500),
        nullable=True
    )

    is_active = Column(
        Boolean,
        default=True
    )


# ==========================================================
# SUPPORT CATEGORIES
# ==========================================================

class SupportCategory(Base):
    __tablename__ = "support_categories"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    description = Column(
        String(500),
        nullable=True
    )

    icon = Column(
        String(100),
        nullable=True
    )

    color = Column(
        String(30),
        nullable=True
    )

    display_order = Column(
        Integer,
        default=0
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )


# ==========================================================
# SUPPORT ARTICLES
# ==========================================================

class SupportArticle(Base):
    __tablename__ = "support_articles"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String(255),
        nullable=False,
        index=True
    )

    slug = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    summary = Column(
        String(500),
        nullable=True
    )

    content = Column(
        Text,
        nullable=False
    )

    category = Column(
        String(100),
        nullable=False,
        index=True
    )

    icon = Column(
        String(100),
        nullable=True
    )

    views = Column(
        Integer,
        default=0,
        nullable=False
    )

    helpful_yes = Column(
        Integer,
        default=0,
        nullable=False
    )

    helpful_no = Column(
        Integer,
        default=0,
        nullable=False
    )

    is_popular = Column(
        Boolean,
        default=False,
        nullable=False
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    display_order = Column(
        Integer,
        default=0
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )


# ==========================================================
# SUPPORT CALLBACK REQUESTS
# ==========================================================

class SupportCallback(Base):
    __tablename__ = "support_callbacks"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    name = Column(
        String(150),
        nullable=False
    )

    phone = Column(
        String(30),
        nullable=False
    )

    preferred_date = Column(
        Date,
        nullable=True
    )

    preferred_time = Column(
        String(50),
        nullable=True
    )

    notes = Column(
        Text,
        nullable=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="Pending"
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )


# ==========================================================
# SUPPORT SERVICE STATUS
# ==========================================================

class SupportServiceStatus(Base):
    __tablename__ = "support_service_status"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    service_name = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="Operational"
    )

    message = Column(
        String(255),
        nullable=True
    )

    checked_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )


# ============================================================
# SUPPORT TICKET ATTACHMENTS
# ============================================================

class SupportTicketAttachment(Base):

    __tablename__ = "support_ticket_attachments"


    id = Column(
        Integer,
        primary_key=True,
        index=True
    )


    ticket_id = Column(
        Integer,
        ForeignKey(
            "support_tickets.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )


    file_name = Column(
        String(255),
        nullable=False
    )


    stored_name = Column(
        String(255),
        nullable=False
    )


    file_path = Column(
        String(500),
        nullable=False
    )


    file_type = Column(
        String(100),
        nullable=True
    )


    file_size = Column(
        Integer,
        nullable=True
    )


    uploaded_at = Column(
        DateTime,
        server_default=func.now()
    )


    ticket = relationship(
        "SupportTicket",
        back_populates="attachments"
    )


class Feedback(Base):

    __tablename__ = "feedback"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    rating = Column(
        Integer,
        nullable=False,
        index=True
    )

    category = Column(
        String(100),
        nullable=False,
        index=True
    )

    subject = Column(
        String(255),
        nullable=False
    )

    message = Column(
        Text,
        nullable=False
    )

    status = Column(
        String(50),
        nullable=False,
        default="Pending",
        index=True
    )

    admin_response = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        index=True
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint(
            "rating >= 1 AND rating <= 5",
            name="check_feedback_rating"
        ),
    )

    user = relationship(
        "User",
        back_populates="feedback",
        lazy="joined"
    )


class VendorPerformanceHistory(Base):

    __tablename__ = "vendor_performance_history"

    __table_args__ = (
        UniqueConstraint(
            "vendor_id",
            "month",
            "year",
            name="uq_vendor_performance_month"
        ),
    )

    # ==========================================================
    # PRIMARY KEY
    # ==========================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # ==========================================================
    # VENDOR
    # ==========================================================

    vendor_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    # ==========================================================
    # PERIOD
    # ==========================================================

    month = Column(
        String(20),
        nullable=False
    )

    year = Column(
        Integer,
        nullable=False
    )

    # ==========================================================
    # DELIVERY PERFORMANCE
    # ==========================================================

    on_time_deliveries = Column(
        Float,
        nullable=False,
        default=0
    )

    delayed_deliveries = Column(
        Float,
        nullable=False,
        default=0
    )

    # ==========================================================
    # QUALITY
    # ==========================================================

    quality_rating = Column(
        Float,
        nullable=False,
        default=0
    )

    # ==========================================================
    # COMMUNICATION
    # ==========================================================

    response_time = Column(
        Float,
        nullable=False,
        default=0
    )

    # ==========================================================
    # ISSUE RESOLUTION
    # ==========================================================

    issue_resolution_time = Column(
        Float,
        nullable=False,
        default=0
    )

    # ==========================================================
    # ORDER COMPLETION
    # ==========================================================

    order_completion_rate = Column(
        Float,
        nullable=False,
        default=0
    )

    # ==========================================================
    # OVERALL SCORE
    # ==========================================================

    overall_score = Column(
        Float,
        nullable=False,
        default=0
    )

    compliance_score = Column(
        Float,
        nullable=False,
        default=0
    )

    # ==========================================================
    # RELATIONSHIP
    # ==========================================================

    vendor = relationship(
        "Vendor",
        back_populates="performance_history"
    )


# ============================================================
# HTML PAGE 7 - SYSTEM ACTIVITY / ADMIN DASHBOARD FEED
# ============================================================

class SystemActivity(Base):
    """
    Admin system activity feed.
    """

    __tablename__ = "system_activity"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    message = Column(
        String(300),
        nullable=False,
    )

    activity_type = Column(
        String(50),
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    user = relationship(
        "User",
        back_populates="activities",
    )


class InventoryItem(Base):

    __tablename__ = "inventory_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    item_code = Column(
        String(50),
        unique=True,
        nullable=False
    )

    item_name = Column(
        String(200),
        nullable=False
    )

    category = Column(
        String(100),
        nullable=True
    )

    quantity = Column(
        Integer,
        default=0,
        nullable=False
    )

    minimum_stock = Column(
        Integer,
        default=0,
        nullable=False
    )

    maximum_stock = Column(
        Integer,
        default=0,
        nullable=False
    )

    unit_price = Column(
        Float,
        default=0,
        nullable=False
    )

    status = Column(
        String(30),
        default="Available"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    reorder_point = Column(
        Integer,
        default=0,
        nullable=False
    )

    warehouse_id = Column( 
        Integer, 
        ForeignKey( "warehouses.id", 
                    ondelete="SET NULL" ), 
                    nullable=True, 
                    index=True 
    ) 

    warehouse_relation = relationship( "Warehouse" )


class Shipment(Base):

    __tablename__ = "shipments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    shipment_number = Column(
        String(50),
        unique=True,
        nullable=False
    )

    po_id = Column(
        Integer,
        ForeignKey("purchase_orders.id"),
        nullable=False,
        index=True
    )

    status = Column(
        String(50),
        default="Pending"
    )

    carrier_name = Column(
        String(100),
        nullable=True
    )

    tracking_number = Column(
        String(100),
        nullable=True
    )

    shipped_date = Column(
        Date,
        nullable=True
    )

    expected_delivery = Column(
        Date,
        nullable=True
    )

    actual_delivery = Column(
        Date,
        nullable=True
    )

    origin = Column(
        String(200),
        nullable=True
    )

    destination = Column(
        String(200),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

        # ========================================================
    # CUSTOMER ORDER
    # ========================================================

    order_id = Column(
        Integer,
        ForeignKey(
            "customer_orders.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    # ========================================================
    # CURRENT TRACKING LOCATION
    # ========================================================

    current_location = Column(
        String(200),
        nullable=True
    )

    current_latitude = Column(
        Float,
        nullable=True
    )

    current_longitude = Column(
        Float,
        nullable=True
    )

    # ========================================================
    # ROUTE COORDINATES
    # ========================================================

    origin_latitude = Column(
        Float,
        nullable=True
    )

    origin_longitude = Column(
        Float,
        nullable=True
    )

    destination_latitude = Column(
        Float,
        nullable=True
    )

    destination_longitude = Column(
        Float,
        nullable=True
    )

    # ========================================================
    # TRACKING
    # ========================================================

    tracking_updated_at = Column(
        DateTime,
        nullable=True
    )

    transport_mode = Column(
        String(30),
        nullable=True,
        index=True
    )

    distance_km = Column(
        Numeric(12, 2),
        nullable=True
    )

    transportation_cost = Column(
        Numeric(14, 2),
        default=0
    )

    fuel_cost = Column(
        Numeric(14, 2),
        default=0
    )

    toll_charges = Column(
        Numeric(14, 2),
        default=0
    )

    handling_charges = Column(
        Numeric(14, 2),
        default=0
    )

    other_charges = Column(
        Numeric(14, 2),
        default=0
    )

    fuel_consumed_liters = Column(
        Numeric(12, 2),
        nullable=True
    )

    delivered_quantity = Column(
        Numeric(14, 3),
        nullable=False,
        default=0
    )

    carrier_id = Column(
        Integer,
        ForeignKey(
            "carriers.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    carrier = relationship(
        "Carrier"
    )

    items = relationship(
        "ShipmentItem",
        back_populates="shipment",
        cascade="all, delete-orphan"
    )

    details = relationship(
        "ShipmentDetails",
        back_populates="shipment",
        uselist=False,
        cascade="all, delete-orphan"
    )

    customer_order = relationship(
        "CustomerOrder",
        back_populates="shipments"
    )

    tracking_events = relationship(
        "OrderTrackingEvent",
        back_populates="shipment",
        cascade="all, delete-orphan",
        order_by="OrderTrackingEvent.event_time"
    )


class ShipmentDetails(Base):
    __tablename__ = "shipment_details"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    shipment_id = Column(
        Integer,
        ForeignKey("shipments.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )

    # -------------------------
    # Schedule & Delivery
    # -------------------------

    requested_delivery = Column(
        Date,
        nullable=True
    )

    promised_delivery = Column(
        Date,
        nullable=True
    )

    earliest_pickup = Column(
        Date,
        nullable=True
    )

    latest_delivery = Column(
        Date,
        nullable=True
    )

    pickup_time_window = Column(
        String(50),
        nullable=True
    )

    delivery_time_window = Column(
        String(50),
        nullable=True
    )

    timezone = Column(
        String(100),
        nullable=True
    )

    # -------------------------
    # Origin
    # -------------------------

    origin_contact_person = Column(
        String(150),
        nullable=True
    )

    origin_phone = Column(
        String(30),
        nullable=True
    )

    origin_address = Column(
        Text,
        nullable=True
    )

    # -------------------------
    # Destination
    # -------------------------

    destination_contact_person = Column(
        String(150),
        nullable=True
    )

    destination_phone = Column(
        String(30),
        nullable=True
    )

    destination_address = Column(
        Text,
        nullable=True
    )

    # -------------------------
    # Additional information
    # -------------------------

    special_instructions = Column(
        Text,
        nullable=True
    )

    internal_notes = Column(
        Text,
        nullable=True
    )

    # Relationship
    shipment = relationship(
        "Shipment",
        back_populates="details"
    )


# ============================================================
# SHIPMENT ITEMS
# ============================================================

class ShipmentItem(Base):

    __tablename__ = "shipment_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    shipment_id = Column(
        Integer,
        ForeignKey(
            "shipments.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    inventory_item_id = Column(
        Integer,
        ForeignKey(
            "inventory_items.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    purchase_order_item_id = Column(
        Integer,
        ForeignKey(
            "purchase_order_items.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    item_code = Column(
        String(50),
        nullable=False
    )

    item_description = Column(
        String(500),
        nullable=False
    )

    quantity = Column(
        Numeric(14, 3),
        nullable=False,
        default=1
    )

    uom = Column(
        String(20),
        nullable=False,
        default="PCS"
    )

    total_weight = Column(
        Numeric(14, 3),
        nullable=False,
        default=0
    )

    weight_unit = Column(
        String(10),
        nullable=False,
        default="kg"
    )

    total_volume = Column(
        Numeric(14, 3),
        nullable=False,
        default=0
    )

    volume_unit = Column(
        String(10),
        nullable=False,
        default="m3"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    shipment = relationship(
        "Shipment",
        back_populates="items"
    )

    inventory_item = relationship(
        "InventoryItem"
    )

    purchase_order_item = relationship(
        "PurchaseOrderItem"
    )


# ============================================================
# TRANSPORTATION - CARRIER
# ============================================================

class Carrier(Base):

    __tablename__ = "carriers"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    carrier_code = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    carrier_name = Column(
        String(150),
        nullable=False,
        index=True
    )

    transport_modes = Column(
        String(150),
        nullable=True
    )

    rating = Column(
        Numeric(3, 2),
        default=0
    )

    damage_rate = Column(
        Numeric(5, 2),
        default=0
    )

    status = Column(
        String(30),
        default="Active"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# ============================================================
# DEMAND PLANNING
# ============================================================

class DemandPlan(Base):

    __tablename__ = "demand_plans"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    plan_name = Column(
        String(150),
        nullable=False,
        index=True
    )

    time_horizon = Column(
        String(50),
        nullable=False,
        default="12 Weeks"
    )

    start_date = Column(
        Date,
        nullable=False
    )

    end_date = Column(
        Date,
        nullable=False
    )

    total_demand = Column(
        Integer,
        default=0,
        nullable=False
    )

    planned_orders = Column(
        Integer,
        default=0,
        nullable=False
    )

    inventory_required = Column(
        Integer,
        default=0,
        nullable=False
    )

    service_level_target = Column(
        Float,
        default=95.0,
        nullable=False
    )

    created_by = Column(
        String(150),
        nullable=True
    )

    last_updated = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    status = Column(
        String(30),
        default="Active",
        nullable=False,
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    items = relationship(
        "DemandPlanItem",
        back_populates="plan",
        cascade="all, delete-orphan"
    )


# ============================================================
# DEMAND FORECAST
# ============================================================

class DemandForecast(Base):

    __tablename__ = "demand_forecasts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    forecast_run_id = Column(
        Integer,
        ForeignKey(
            "forecast_runs.id",
            ondelete="CASCADE"
        ),
        nullable=True,
        index=True
    )

    item_code = Column(
        String(50),
        ForeignKey(
            "inventory_items.item_code",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    product_name = Column(
        String(200),
        nullable=False
    )

    category = Column(
        String(100),
        nullable=False,
        index=True
    )

    period_start = Column(
        Date,
        nullable=False,
        index=True
    )

    period_label = Column(
        String(30),
        nullable=False
    )

    forecast_units = Column(
        Integer,
        default=0,
        nullable=False
    )

    actual_units = Column(
        Integer,
        default=0,
        nullable=False
    )

    accuracy = Column(
        Float,
        default=0,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    forecast_run = relationship(
        "ForecastRun",
        back_populates="forecasts"
    )


# ============================================================
# FORECAST RUN
# ============================================================

class ForecastRun(Base):

    __tablename__ = "forecast_runs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    forecast_name = Column(
        String(150),
        nullable=False
    )

    horizon = Column(
        String(50),
        nullable=False
    )

    start_date = Column(
        Date,
        nullable=False
    )

    accuracy = Column(
        Float,
        default=0,
        nullable=False
    )

    status = Column(
        String(30),
        default="Completed",
        nullable=False
    )

    created_by = Column(
        String(150),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    forecasts = relationship(
        "DemandForecast",
        back_populates="forecast_run",
        cascade="all, delete-orphan"
    )


# ============================================================
# DEMAND PLAN ITEMS
# ============================================================

class DemandPlanItem(Base):

    __tablename__ = "demand_plan_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    plan_id = Column(
        Integer,
        ForeignKey(
            "demand_plans.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    item_code = Column(
        String(50),
        nullable=True,
        index=True
    )

    product_name = Column(
        String(200),
        nullable=False
    )

    category = Column(
        String(100),
        nullable=True
    )

    demand_units = Column(
        Integer,
        default=0,
        nullable=False
    )

    planned_order_units = Column(
        Integer,
        default=0,
        nullable=False
    )

    inventory_required_units = Column(
        Integer,
        default=0,
        nullable=False
    )

    service_level_target = Column(
        Float,
        default=95.0,
        nullable=False
    )

    plan = relationship(
        "DemandPlan",
        back_populates="items"
    )


# ============================================================
# INVENTORY - WAREHOUSE
# ============================================================

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    warehouse_code = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    warehouse_name = Column(
        String(150),
        nullable=False
    )

    location = Column(
        String(200),
        nullable=True
    )

    manager_name = Column(
        String(150),
        nullable=True
    )

    status = Column(
        String(30),
        default="Active",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Add these fields inside the existing Warehouse class

    capacity_sq_ft = Column(
        Float,
        default=0,
        nullable=False
    )

    latitude = Column(
        Float,
        nullable=True
    )

    longitude = Column(
        Float,
        nullable=True
    )


class WarehouseMetric(Base):

    __tablename__ = "warehouse_metrics"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    warehouse_id = Column(
        Integer,
        ForeignKey(
            "warehouses.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    metric_date = Column(
        Date,
        nullable=False,
        index=True
    )

    utilization_rate = Column(
        Float,
        default=0,
        nullable=False
    )

    inventory_value = Column(
        Float,
        default=0,
        nullable=False
    )

    turnover_rate = Column(
        Float,
        default=0,
        nullable=False
    )

    health_score = Column(
        Float,
        default=0,
        nullable=False
    )

    health_status = Column(
        String(30),
        default="Healthy",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    warehouse = relationship(
        "Warehouse"
    )


class WarehouseAlert(Base):

    __tablename__ = "warehouse_alerts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    warehouse_id = Column(
        Integer,
        ForeignKey(
            "warehouses.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    title = Column(
        String(255),
        nullable=False
    )

    message = Column(
        Text,
        nullable=True
    )

    severity = Column(
        String(30),
        default="Info",
        nullable=False
    )

    status = Column(
        String(30),
        default="Open",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    warehouse = relationship(
        "Warehouse"
    )


class WarehouseActivity(Base):

    __tablename__ = "warehouse_activities"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    warehouse_id = Column(
        Integer,
        ForeignKey(
            "warehouses.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    activity_type = Column(
        String(50),
        nullable=False
    )

    title = Column(
        String(255),
        nullable=False
    )

    reference_number = Column(
        String(100),
        nullable=True
    )

    quantity = Column(
        Integer,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    warehouse = relationship(
        "Warehouse"
    )

    user = relationship(
        "User"
    )


class WarehouseTransfer(Base):

    __tablename__ = "warehouse_transfers"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    transfer_number = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    item_id = Column(
        Integer,
        ForeignKey(
            "inventory_items.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    from_warehouse_id = Column(
        Integer,
        ForeignKey(
            "warehouses.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    to_warehouse_id = Column(
        Integer,
        ForeignKey(
            "warehouses.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    quantity = Column(
        Integer,
        nullable=False
    )

    status = Column(
        String(30),
        default="Completed",
        nullable=False
    )

    transfer_date = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    notes = Column(
        Text,
        nullable=True
    )

    item = relationship(
        "InventoryItem"
    )

    from_warehouse = relationship(
        "Warehouse",
        foreign_keys=[from_warehouse_id]
    )

    to_warehouse = relationship(
        "Warehouse",
        foreign_keys=[to_warehouse_id]
    )


class WarehouseDocument(Base):

    __tablename__ = "warehouse_documents"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    warehouse_id = Column(
        Integer,
        ForeignKey(
            "warehouses.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    file_name = Column(
        String(255),
        nullable=False
    )

    file_path = Column(
        String(500),
        nullable=False
    )

    file_type = Column(
        String(100),
        nullable=True
    )

    file_size = Column(
        Float,
        default=0
    )

    uploaded_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    warehouse = relationship(
        "Warehouse"
    )

    user = relationship(
        "User"
    )


# ============================================================
# INVENTORY - MOVEMENTS
# ============================================================

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    item_id = Column(
        Integer,
        ForeignKey(
            "inventory_items.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    warehouse_id = Column(
        Integer,
        ForeignKey(
            "warehouses.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    movement_type = Column(
        String(30),
        nullable=False,
        index=True
    )
    # Receipt / Issue / Adjustment / Transfer

    quantity = Column(
        Integer,
        nullable=False
    )

    movement_date = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    reference_number = Column(
        String(100),
        nullable=True
    )

    notes = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    item = relationship(
        "InventoryItem"
    )

    warehouse = relationship(
        "Warehouse"
    )


# ============================================================
# INVENTORY - HISTORICAL SNAPSHOTS
# ============================================================

class InventorySnapshot(Base):
    __tablename__ = "inventory_snapshots"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    snapshot_date = Column(
        Date,
        nullable=False,
        index=True
    )

    warehouse_id = Column(
        Integer,
        ForeignKey(
            "warehouses.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    category = Column(
        String(100),
        nullable=True,
        index=True
    )

    total_items = Column(
        Integer,
        default=0,
        nullable=False
    )

    total_quantity = Column(
        Integer,
        default=0,
        nullable=False
    )

    inventory_value = Column(
        Float,
        default=0,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    warehouse = relationship(
        "Warehouse"
    )


# ============================================================
# CUSTOMER
# ============================================================

class Customer(Base):

    __tablename__ = "customers"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    customer_code = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    customer_name = Column(
        String(200),
        nullable=False,
        index=True
    )

    email = Column(
        String(150),
        nullable=True
    )

    phone = Column(
        String(30),
        nullable=True
    )

    address = Column(
        String(255),
        nullable=True
    )

    city = Column(
        String(100),
        nullable=True
    )

    state = Column(
        String(100),
        nullable=True
    )

    country = Column(
        String(100),
        nullable=True,
        default="India"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    orders = relationship(
        "CustomerOrder",
        back_populates="customer",
        cascade="all, delete-orphan"
    )

    invoices = relationship(
        "Invoice",
        back_populates="customer"
    )


# ============================================================
# CUSTOMER ORDER
# ============================================================

class CustomerOrder(Base):

    __tablename__ = "customer_orders"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    order_number = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    customer_id = Column(
        Integer,
        ForeignKey(
            "customers.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    order_date = Column(
        Date,
        nullable=False,
        index=True
    )

    status = Column(
        String(50),
        nullable=False,
        default="Pending",
        index=True
    )

    amount = Column(
        Numeric(14, 2),
        nullable=False,
        default=0
    )

    expected_delivery = Column(
        Date,
        nullable=True
    )

    actual_delivery = Column(
        Date,
        nullable=True
    )

    priority = Column(
        String(30),
        nullable=False,
        default="Normal"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    customer = relationship(
        "Customer",
        back_populates="orders"
    )

    items = relationship(
        "CustomerOrderItem",
        back_populates="order",
        cascade="all, delete-orphan"
    )

    shipments = relationship(
        "Shipment",
        back_populates="customer_order"
    )


# ============================================================
# CUSTOMER ORDER ITEM
# ============================================================

class CustomerOrderItem(Base):

    __tablename__ = "customer_order_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    order_id = Column(
        Integer,
        ForeignKey(
            "customer_orders.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    item_code = Column(
        String(50),
        nullable=True
    )

    item_name = Column(
        String(200),
        nullable=False
    )

    quantity = Column(
        Integer,
        nullable=False,
        default=1
    )

    unit_price = Column(
        Numeric(14, 2),
        nullable=False,
        default=0
    )

    total_price = Column(
        Numeric(14, 2),
        nullable=False,
        default=0
    )

    order = relationship(
        "CustomerOrder",
        back_populates="items"
    )


# ============================================================
# ANALYTICS DASHBOARD SNAPSHOTS
# ============================================================

class AnalyticsSnapshot(Base):

    __tablename__ = "analytics_snapshots"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    snapshot_date = Column(
        Date,
        nullable=False,
        index=True
    )

    revenue = Column(
        Float,
        nullable=False,
        default=0
    )

    cost = Column(
        Float,
        nullable=False,
        default=0
    )

    profit = Column(
        Float,
        nullable=False,
        default=0
    )

    total_orders = Column(
        Integer,
        nullable=False,
        default=0
    )

    total_shipments = Column(
        Integer,
        nullable=False,
        default=0
    )

    service_level = Column(
        Float,
        nullable=False,
        default=0
    )

    on_time_delivery = Column(
        Float,
        nullable=False,
        default=0
    )

    order_fulfillment = Column(
        Float,
        nullable=False,
        default=0
    )

    perfect_order_rate = Column(
        Float,
        nullable=False,
        default=0
    )

    on_time_shipments = Column(
        Float,
        nullable=False,
        default=0
    )

    inventory_accuracy = Column(
        Float,
        nullable=False,
        default=0
    )

    inventory_value = Column(
        Float,
        nullable=False,
        default=0
    )

    inventory_turnover = Column(
        Float,
        nullable=False,
        default=0
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# ============================================================
# ALERT RULES
# ============================================================

class AlertRule(Base):

    __tablename__ = "alert_rules"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    rule_name = Column(
        String(150),
        nullable=False,
        index=True
    )

    category = Column(
        String(100),
        nullable=False,
        index=True
    )

    condition = Column(
        String(500),
        nullable=False
    )

    priority = Column(
        String(20),
        nullable=False,
        default="Medium",
        index=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="Active",
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    created_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    creator = relationship(
        "User"
    )

    alerts = relationship(
        "Alert",
        back_populates="rule"
    )


# ============================================================
# ALERTS
# ============================================================

class Alert(Base):

    __tablename__ = "alerts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String(255),
        nullable=False,
        index=True
    )

    message = Column(
        Text,
        nullable=True
    )

    category = Column(
        String(100),
        nullable=False,
        index=True
    )

    source = Column(
        String(100),
        nullable=True
    )

    reference_id = Column(
        String(100),
        nullable=True,
        index=True
    )

    priority = Column(
        String(20),
        nullable=False,
        default="Medium",
        index=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="New",
        index=True
    )

    # New
    # In Progress
    # Resolved
    # Snoozed
    # Dismissed

    rule_id = Column(
        Integer,
        ForeignKey(
            "alert_rules.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    resolved_at = Column(
        DateTime,
        nullable=True,
        index=True
    )

    snoozed_until = Column(
        DateTime,
        nullable=True,
        index=True
    )

    resolved_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    assigned_to = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    rule = relationship(
        "AlertRule",
        back_populates="alerts"
    )

    resolver = relationship(
        "User",
        foreign_keys=[resolved_by]
    )

    assignee = relationship(
        "User",
        foreign_keys=[assigned_to]
    )


# ============================================================
# ALERT ESCALATION MATRIX
# ============================================================

class AlertEscalation(Base):

    __tablename__ = "alert_escalations"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    category = Column(
        String(100),
        nullable=False,
        index=True
    )

    priority = Column(
        String(20),
        nullable=False,
        index=True
    )

    escalation_level = Column(
        Integer,
        nullable=False,
        default=1
    )

    delay_minutes = Column(
        Integer,
        nullable=False,
        default=60
    )

    notify_role = Column(
        String(100),
        nullable=False
    )

    email_enabled = Column(
        Boolean,
        default=True,
        nullable=False
    )

    sms_enabled = Column(
        Boolean,
        default=False,
        nullable=False
    )

    in_app_enabled = Column(
        Boolean,
        default=True,
        nullable=False
    )

    active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# ============================================================
# DOCUMENT MANAGEMENT
# ============================================================

class DocumentFolder(Base):

    __tablename__ = "document_folders"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    folder_name = Column(
        String(150),
        nullable=False,
        index=True
    )

    parent_id = Column(
        Integer,
        ForeignKey(
            "document_folders.id",
            ondelete="CASCADE"
        ),
        nullable=True,
        index=True
    )

    category = Column(
        String(100),
        nullable=True,
        index=True
    )

    created_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


class Document(Base):

    __tablename__ = "documents"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    document_name = Column(
        String(255),
        nullable=False,
        index=True
    )

    vendor_id = Column(
        String(10),
        ForeignKey(
            "vendors.vendor_id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    # =========================================================
    # DOCUMENT CLASSIFICATION
    # =========================================================

    category = Column(
        String(100),
        nullable=False,
        index=True
    )

    document_type = Column(
        String(100),
        nullable=True,
        index=True
    )

    subcategory = Column(
        String(100),
        nullable=True
    )

    # =========================================================
    # RELATION
    # =========================================================

    related_type = Column(
        String(50),
        nullable=True
    )

    related_id = Column(
        String(100),
        nullable=True,
        index=True
    )

    # =========================================================
    # ORGANIZATION
    # =========================================================

    business_unit = Column(
        String(150),
        nullable=True
    )

    tags = Column(
        Text,
        nullable=True
    )

    confidentiality_level = Column(
        String(50),
        nullable=False,
        default="Internal"
    )

    retention_period = Column(
        String(50),
        nullable=True
    )

    document_date = Column(
        Date,
        nullable=True
    )

    # =========================================================
    # FOLDER
    # =========================================================

    folder_id = Column(
        Integer,
        ForeignKey(
            "document_folders.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    # =========================================================
    # UPLOAD INFORMATION
    # =========================================================

    uploaded_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    uploaded_on = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    file_path = Column(
        String(500),
        nullable=False
    )

    file_type = Column(
        String(100),
        nullable=True
    )

    mime_type = Column(
        String(150),
        nullable=True
    )

    file_size = Column(
        Integer,
        default=0,
        nullable=False
    )

    # =========================================================
    # STATUS
    # =========================================================

    status = Column(
        String(30),
        default="Pending Review",
        nullable=False,
        index=True
    )

    expiry_date = Column(
        Date,
        nullable=True,
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class DocumentApproval(Base):

    __tablename__ = "document_approvals"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    document_id = Column(
        Integer,
        ForeignKey(
            "documents.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    reviewer_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    status = Column(
        String(30),
        default="Pending",
        nullable=False,
        index=True
    )

    comments = Column(
        Text,
        nullable=True
    )

    requested_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    reviewed_at = Column(
        DateTime,
        nullable=True
    )


class DocumentActivity(Base):

    __tablename__ = "document_activity"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    document_id = Column(
        Integer,
        ForeignKey(
            "documents.id",
            ondelete="CASCADE"
        ),
        nullable=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    action = Column(
        String(50),
        nullable=False
    )

    message = Column(
        String(500),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )


# ==========================================================
# BUDGET
# ==========================================================


# ============================================================
# HTML PAGE 8 - FINANCE / FINANCIAL DASHBOARD
# ============================================================

class FinanceBudget(Base):
    __tablename__ = "finance_budgets"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    department = Column(
        String(100),
        nullable=False,
        index=True
    )

    # Total approved budget
    budget = Column(
        Float,
        nullable=False,
        default=0
    )

    # Amount allocated to the department
    allocated = Column(
        Float,
        nullable=False,
        default=0
    )

    # Amount actually spent
    actual = Column(
        Float,
        nullable=False,
        default=0
    )

    year = Column(
        Integer,
        nullable=False,
        index=True
    )

    # Draft / Pending Approval / Active / Completed / Rejected
    status = Column(
        String(30),
        nullable=False,
        default="Active",
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "department",
            "year",
            name="uq_finance_budget_department_year"
        ),
    )


# ==========================================================
# FINANCIAL TRANSACTIONS
# ==========================================================

class FinanceTransaction(Base):

    __tablename__ = "finance_transactions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    transaction_date = Column(
        Date,
        nullable=False,
        index=True
    )

    transaction_type = Column(
        String(30),
        nullable=False
    )
    # expense
    # income
    # payment
    # inflow
    # outflow

    category = Column(
        String(100),
        nullable=True
    )

    department = Column(
        String(100),
        nullable=True
    )

    amount = Column(
        Float,
        nullable=False
    )

    status = Column(
        String(50),
        nullable=True
    )


# ==========================================================
# PAYMENTS
# ==========================================================

class FinancePayment(Base):

    __tablename__ = "finance_payments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    invoice_no = Column(
        String(50),
        nullable=False
    )

    vendor = Column(
        String(150),
        nullable=False
    )

    amount = Column(
        Float,
        nullable=False
    )

    payment_date = Column(
        Date,
        nullable=False
    )

    status = Column(
        String(50),
        nullable=False
    )

    early_payment = Column(
        Boolean,
        default=False
    )

    discount_amount = Column(
        Float,
        default=0
    )


# ==========================================================
# ACCOUNTS PAYABLE
# ==========================================================

class FinancePayable(Base):

    __tablename__ = "finance_payables"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    invoice_no = Column(
        String(50),
        nullable=False
    )

    vendor = Column(
        String(150),
        nullable=False
    )

    amount = Column(
        Float,
        nullable=False
    )

    due_date = Column(
        Date,
        nullable=False
    )

    bill_date = Column(
        Date,
        nullable=True,
        index=True
    )

    payment_status = Column(
        String(50),
        nullable=False,
        default="Pending"
    )


# ==========================================================
# FINANCIAL ALERTS
# ==========================================================

class FinanceAlert(Base):

    __tablename__ = "finance_alerts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String(200),
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    severity = Column(
        String(30),
        nullable=False
    )

    time_label = Column(
        String(100),
        nullable=True
    )


# ==========================================================
# FINANCIAL OBLIGATIONS
# ==========================================================

class FinanceObligation(Base):

    __tablename__ = "finance_obligations"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    obligation_type = Column(
        String(100),
        nullable=False
    )

    reference = Column(
        String(100),
        nullable=False
    )

    amount = Column(
        Float,
        nullable=False
    )

    due_date = Column(
        Date,
        nullable=False
    )


# ==========================================================
# CASH FLOW
# ==========================================================

class FinanceCashFlow(Base):

    __tablename__ = "finance_cash_flow"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    month = Column(
        String(20),
        nullable=False
    )

    inflow = Column(
        Float,
        nullable=False
    )

    outflow = Column(
        Float,
        nullable=False
    )

    net_cash_flow = Column(
        Float,
        nullable=False
    )


# ==========================================================
# MONTHLY EXPENSES
# ==========================================================

class FinanceMonthlyExpense(Base):

    __tablename__ = "finance_monthly_expenses"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    month = Column(
        String(20),
        nullable=False
    )

    actual_expense = Column(
        Float,
        nullable=False
    )

    budget = Column(
        Float,
        nullable=False
    )


# ==========================================================
# COMPANY FINANCIAL METRICS
# ==========================================================

class FinanceMetric(Base):

    __tablename__ = "finance_metrics"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    total_budget = Column(
        Float,
        nullable=False,
        default=0
    )

    total_expenses = Column(
        Float,
        nullable=False,
        default=0
    )

    total_savings = Column(
        Float,
        nullable=False,
        default=0
    )

    total_payments = Column(
        Float,
        nullable=False,
        default=0
    )

    outstanding_payables = Column(
        Float,
        nullable=False,
        default=0
    )

    cash_balance = Column(
        Float,
        nullable=False,
        default=0
    )

    gross_margin = Column(
        Float,
        nullable=False,
        default=0
    )

    operating_margin = Column(
        Float,
        nullable=False,
        default=0
    )

    expense_ratio = Column(
        Float,
        nullable=False,
        default=0
    )

    current_ratio = Column(
        Float,
        nullable=False,
        default=0
    )

    quick_ratio = Column(
        Float,
        nullable=False,
        default=0
    )

    return_on_assets = Column(
        Float,
        nullable=False,
        default=0
    )


class FinanceExpenseAttachment(Base):
    __tablename__ = "finance_expense_attachments"

    id = Column(Integer, primary_key=True, index=True)

    transaction_id = Column(
        Integer,
        ForeignKey(
            "finance_transactions.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    content_type = Column(String(100), nullable=True)

    uploaded_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


class FinanceRecurringExpense(Base):
    __tablename__ = "finance_recurring_expenses"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    department = Column(String(100), nullable=True)

    amount = Column(Float, nullable=False)

    frequency = Column(
        String(30),
        nullable=False,
        default="Monthly"
    )

    next_expense_date = Column(Date, nullable=False)

    status = Column(
        String(30),
        nullable=False,
        default="Active"
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# ============================================================
# REVENUE PLAN / TARGET
# ============================================================

class FinanceRevenuePlan(Base):
    __tablename__ = "finance_revenue_plans"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    source = Column(
        String(100),
        nullable=False,
        index=True
    )

    department = Column(
        String(100),
        nullable=True,
        index=True
    )

    year = Column(
        Integer,
        nullable=False,
        index=True
    )

    budget = Column(
        Float,
        nullable=False,
        default=0
    )

    annual_target = Column(
        Float,
        nullable=False,
        default=0
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class FinancialDataSource(Base):

    __tablename__ = "financial_data_sources"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(150),
        nullable=False,
        unique=True
    )

    source_type = Column(
        String(50),
        nullable=False,
        default="Database"
    )

    description = Column(
        Text,
        nullable=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="Connected",
        index=True
    )

    records_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    accuracy_score = Column(
        Float,
        nullable=False,
        default=100
    )

    last_sync_at = Column(
        DateTime,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


# ============================================================
# BANK ACCOUNTS
# ============================================================

class BankAccount(Base):

    __tablename__ = "bank_accounts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    account_name = Column(
        String(150),
        nullable=False,
        index=True
    )

    account_number = Column(
        String(50),
        nullable=False
    )

    bank_name = Column(
        String(150),
        nullable=False,
        index=True
    )

    account_type = Column(
        String(50),
        nullable=False,
        default="Current Account"
    )

    currency = Column(
        String(10),
        nullable=False,
        default="INR"
    )

    balance = Column(
        Float,
        nullable=False,
        default=0
    )

    reconciled_balance = Column(
        Float,
        nullable=False,
        default=0
    )

    status = Column(
        String(30),
        nullable=False,
        default="Active"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


# ============================================================
# BANK TRANSACTIONS
# ============================================================

class BankTransaction(Base):

    __tablename__ = "bank_transactions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    bank_account_id = Column(
        Integer,
        ForeignKey(
            "bank_accounts.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    transaction_date = Column(
        Date,
        nullable=False,
        index=True
    )

    description = Column(
        String(255),
        nullable=False
    )

    reference = Column(
        String(100),
        nullable=True,
        index=True
    )

    transaction_type = Column(
        String(20),
        nullable=False
    )
    # credit / debit

    amount = Column(
        Float,
        nullable=False
    )

    balance_after = Column(
        Float,
        nullable=True
    )

    category = Column(
        String(100),
        nullable=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="Unreconciled"
    )

    reconciled = Column(
        Boolean,
        nullable=False,
        default=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# ============================================================
# BANK STATEMENTS
# ============================================================

class BankStatement(Base):

    __tablename__ = "bank_statements"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    bank_account_id = Column(
        Integer,
        ForeignKey(
            "bank_accounts.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    statement_date = Column(
        Date,
        nullable=False,
        index=True
    )

    period_start = Column(
        Date,
        nullable=True
    )

    period_end = Column(
        Date,
        nullable=True
    )

    opening_balance = Column(
        Float,
        nullable=False,
        default=0
    )

    closing_balance = Column(
        Float,
        nullable=False,
        default=0
    )

    status = Column(
        String(30),
        nullable=False,
        default="Pending"
    )
    # Pending / In Progress / Reconciled / Failed

    reconciled_on = Column(
        Date,
        nullable=True
    )

    reconciled_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    difference = Column(
        Float,
        nullable=False,
        default=0
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# ============================================================
# BANK STATEMENT LINES
# ============================================================

class BankStatementLine(Base):

    __tablename__ = "bank_statement_lines"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    statement_id = Column(
        Integer,
        ForeignKey(
            "bank_statements.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    transaction_date = Column(
        Date,
        nullable=False,
        index=True
    )

    description = Column(
        String(255),
        nullable=False
    )

    reference = Column(
        String(100),
        nullable=True
    )

    debit = Column(
        Float,
        nullable=False,
        default=0
    )

    credit = Column(
        Float,
        nullable=False,
        default=0
    )

    balance = Column(
        Float,
        nullable=True
    )

    matched_transaction_id = Column(
        Integer,
        ForeignKey(
            "bank_transactions.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    match_status = Column(
        String(30),
        nullable=False,
        default="Unmatched"
    )
    # Matched / Unmatched / Ignored


# ============================================================
# FINANCE NOTIFICATION PREFERENCES
# ============================================================

class FinanceNotificationPreference(Base):
    __tablename__ = "finance_notification_preferences"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        unique=True,
        index=True
    )

    budget_alerts = Column(
        Boolean,
        default=True,
        nullable=False
    )

    payment_alerts = Column(
        Boolean,
        default=True,
        nullable=False
    )

    approval_alerts = Column(
        Boolean,
        default=True,
        nullable=False
    )

    compliance_alerts = Column(
        Boolean,
        default=True,
        nullable=False
    )

    system_notifications = Column(
        Boolean,
        default=True,
        nullable=False
    )

    email_notifications = Column(
        Boolean,
        default=True,
        nullable=False
    )

    sms_notifications = Column(
        Boolean,
        default=False,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


# ============================================================
# SYSTEM ANNOUNCEMENTS
# ============================================================

class SystemAnnouncement(Base):
    __tablename__ = "system_announcements"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String(255),
        nullable=False,
        index=True
    )

    message = Column(
        Text,
        nullable=False
    )

    category = Column(
        String(100),
        nullable=False,
        default="System"
    )

    priority = Column(
        String(20),
        nullable=False,
        default="Medium"
    )

    published_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    expires_at = Column(
        DateTime,
        nullable=True,
        index=True
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
        index=True
    )

    created_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# ============================================================
# AUDITOR MODULE
# ============================================================

class Audit(Base):
    __tablename__ = "audits"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    audit_number = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    title = Column(
        String(255),
        nullable=False,
        index=True
    )

    audit_type = Column(
        String(100),
        nullable=False,
        index=True
    )

    entity_name = Column(
        String(255),
        nullable=True,
        index=True
    )

    entity_type = Column(
        String(100),
        nullable=True
    )

    description = Column(
        Text,
        nullable=True
    )

    scheduled_date = Column(
        DateTime,
        nullable=True,
        index=True
    )

    start_date = Column(
        Date,
        nullable=True
    )

    end_date = Column(
        Date,
        nullable=True
    )

    status = Column(
        String(50),
        nullable=False,
        default="Not Started",
        index=True
    )

    progress = Column(
        Float,
        nullable=False,
        default=0
    )

    risk_level = Column(
        String(30),
        nullable=False,
        default="Medium",
        index=True
    )

    compliance_score = Column(
        Float,
        nullable=False,
        default=0
    )

    created_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Add inside Audit

    assignments = relationship(
        "AuditAssignment",
        backref="audit",
        cascade="all, delete-orphan"
    )

    findings = relationship(
        "AuditFinding",
        backref="audit",
        cascade="all, delete-orphan"
    )


class AuditAssignment(Base):
    __tablename__ = "audit_assignments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    audit_id = Column(
        Integer,
        ForeignKey(
            "audits.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    auditor_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    assigned_date = Column(
        Date,
        default=date.today,
        nullable=False
    )

    due_date = Column(
        Date,
        nullable=True,
        index=True
    )

    status = Column(
        String(50),
        nullable=False,
        default="Not Started",
        index=True
    )

    progress = Column(
        Float,
        nullable=False,
        default=0
    )

    priority = Column(
        String(30),
        nullable=False,
        default="Medium"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class AuditFinding(Base):
    __tablename__ = "audit_findings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    audit_id = Column(
        Integer,
        ForeignKey(
            "audits.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    title = Column(
        String(255),
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    severity = Column(
        String(30),
        nullable=False,
        default="Medium",
        index=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="Open",
        index=True
    )

    identified_date = Column(
        Date,
        default=date.today,
        nullable=False
    )

    due_date = Column(
        Date,
        nullable=True
    )

    resolved_date = Column(
        Date,
        nullable=True
    )

    assigned_to = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    category = Column(
        String(100),
        nullable=False,
        default="Operational",
        index=True
    )


# ============================================================
# AUDIT RISK REGISTER
# ============================================================

class AuditRisk(Base):
    __tablename__ = "audit_risks"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    audit_id = Column(
        Integer,
        ForeignKey(
            "audits.id",
            ondelete="CASCADE"
        ),
        nullable=True,
        index=True
    )

    risk_title = Column(
        String(255),
        nullable=False,
        index=True
    )

    category = Column(
        String(100),
        nullable=False,
        default="Operational",
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    impact = Column(
        String(30),
        nullable=False,
        default="Medium",
        index=True
    )

    likelihood = Column(
        String(30),
        nullable=False,
        default="Medium",
        index=True
    )

    risk_score = Column(
        Integer,
        nullable=False,
        default=1,
        index=True
    )

    status = Column(
        String(50),
        nullable=False,
        default="Open",
        index=True
    )

    treatment = Column(
        String(50),
        nullable=False,
        default="Pending Decision",
        index=True
    )

    owner_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    due_date = Column(
        Date,
        nullable=True,
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    audit = relationship(
        "Audit",
        backref="risks"
    )

    owner = relationship(
        "User",
        foreign_keys=[owner_id]
    )


# ============================================================
# AUDIT PROGRESS HISTORY
# ============================================================

class AuditProgressHistory(Base):
    __tablename__ = "audit_progress_history"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    audit_id = Column(
        Integer,
        ForeignKey(
            "audits.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    progress = Column(
        Float,
        nullable=False,
        default=0
    )

    status = Column(
        String(50),
        nullable=False,
        default="In Progress"
    )

    recorded_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    recorded_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    audit = relationship(
        "Audit",
        backref="progress_history"
    )

    recorder = relationship(
        "User",
        foreign_keys=[recorded_by]
    )


# ============================================================
# AUDIT MILESTONES
# ============================================================

class AuditMilestone(Base):
    __tablename__ = "audit_milestones"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    audit_id = Column(
        Integer,
        ForeignKey(
            "audits.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    milestone = Column(
        String(255),
        nullable=False
    )

    due_date = Column(
        Date,
        nullable=False,
        index=True
    )

    status = Column(
        String(50),
        nullable=False,
        default="Pending"
    )

    owner_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    completed_at = Column(
        DateTime,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    audit = relationship(
        "Audit",
        backref="milestones"
    )

    owner = relationship(
        "User",
        foreign_keys=[owner_id]
    )

class IssueFindingHistory(Base):
    __tablename__ = "issue_finding_history"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    finding_id = Column(
        Integer,
        ForeignKey(
            "audit_findings.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    old_status = Column(
        String(30),
        nullable=True
    )

    new_status = Column(
        String(30),
        nullable=False
    )

    changed_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    comments = Column(
        Text,
        nullable=True
    )

    changed_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    finding = relationship(
        "AuditFinding",
        backref="status_history"
    )

    user = relationship(
        "User",
        foreign_keys=[changed_by]
    )


# ============================================================
# AUDITOR COMPLIANCE FRAMEWORKS
# ============================================================

class ComplianceFramework(Base):
    __tablename__ = "compliance_frameworks"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(150),
        nullable=False,
        unique=True,
        index=True
    )

    code = Column(
        String(50),
        nullable=True,
        unique=True,
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="Active",
        index=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )


# ============================================================
# AUDITOR COMPLIANCE REQUIREMENTS
# ============================================================

class ComplianceRequirement(Base):
    __tablename__ = "compliance_requirements"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    requirement_id = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True
    )

    requirement = Column(
        String(300),
        nullable=False
    )

    framework_id = Column(
        Integer,
        ForeignKey(
            "compliance_frameworks.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    audit_id = Column(
        Integer,
        ForeignKey(
            "audits.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    entity_department = Column(
        String(150),
        nullable=True,
        index=True
    )

    status = Column(
        String(40),
        nullable=False,
        default="Not Assessed",
        index=True
    )

    compliance_score = Column(
        Float,
        nullable=False,
        default=0
    )

    last_assessed = Column(
        Date,
        nullable=True,
        index=True
    )

    next_review = Column(
        Date,
        nullable=True,
        index=True
    )

    gap_area = Column(
        String(150),
        nullable=True,
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    framework = relationship(
        "ComplianceFramework"
    )

    audit = relationship(
        "Audit"
    )


# ============================================================
# COMPLIANCE REQUIREMENT HISTORY
# ============================================================

class ComplianceRequirementHistory(Base):
    __tablename__ = "compliance_requirement_history"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    month = Column(
        String(20),
        nullable=False
    )

    year = Column(
        Integer,
        nullable=False,
        index=True
    )

    compliance_score = Column(
        Float,
        nullable=False,
        default=0
    )

    compliant_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    partially_compliant_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    non_compliant_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    not_assessed_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint(
            "month",
            "year",
            name="uq_compliance_requirement_history_month_year"
        ),
    )


# ============================================================
# AUDIT RECOMMENDATIONS
# ============================================================

class AuditRecommendation(Base):
    __tablename__ = "audit_recommendations"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    audit_id = Column(
        Integer,
        ForeignKey(
            "audits.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    title = Column(
        String(255),
        nullable=False,
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    category = Column(
        String(100),
        nullable=False,
        default="Operational",
        index=True
    )

    priority = Column(
        String(30),
        nullable=False,
        default="Medium",
        index=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="Pending",
        index=True
    )

    assigned_to = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    due_date = Column(
        Date,
        nullable=True,
        index=True
    )

    implemented_date = Column(
        Date,
        nullable=True
    )

    # ---------------------------------------------------------
    # IMPACT
    # ---------------------------------------------------------

    impact = Column(
        String(30),
        nullable=False,
        default="Medium",
        index=True
    )

    risk_reduction = Column(
        Float,
        nullable=False,
        default=0
    )

    control_improvement = Column(
        Float,
        nullable=False,
        default=0
    )

    cost_savings = Column(
        Float,
        nullable=False,
        default=0
    )

    created_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    audit = relationship(
        "Audit",
        backref="recommendations"
    )

    assignee = relationship(
        "User",
        foreign_keys=[assigned_to]
    )

    creator = relationship(
        "User",
        foreign_keys=[created_by]
    )


# ============================================================
# AUDITOR CALENDAR EVENTS
# ============================================================

class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String(255),
        nullable=False,
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    # Audit / Meeting / Planning / Review /
    # Compliance / Reporting / Other
    event_type = Column(
        String(50),
        nullable=False,
        default="Other",
        index=True
    )

    start_datetime = Column(
        DateTime,
        nullable=False,
        index=True
    )

    end_datetime = Column(
        DateTime,
        nullable=True
    )

    all_day = Column(
        Boolean,
        nullable=False,
        default=False
    )

    location = Column(
        String(255),
        nullable=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="Scheduled",
        index=True
    )

    # Optional link to an existing audit
    audit_id = Column(
        Integer,
        ForeignKey(
            "audits.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    # Optional link to an assignment
    assignment_id = Column(
        Integer,
        ForeignKey(
            "audit_assignments.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    # User who created the calendar event
    created_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    audit = relationship(
        "Audit",
        foreign_keys=[audit_id]
    )

    assignment = relationship(
        "AuditAssignment",
        foreign_keys=[assignment_id]
    )

    creator = relationship(
        "User",
        foreign_keys=[created_by]
    )


# ============================================================
# AUDITOR NOTIFICATION PREFERENCES
# ============================================================

class AuditorNotificationPreference(Base):

    __tablename__ = "auditor_notification_preferences"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        unique=True,
        index=True
    )

    # Notification Channels
    email_notifications = Column(
        Boolean,
        default=True,
        nullable=False
    )

    in_app_notifications = Column(
        Boolean,
        default=True,
        nullable=False
    )

    sms_notifications = Column(
        Boolean,
        default=False,
        nullable=False
    )

    # Auditor Specific Preferences
    important_alerts = Column(
        Boolean,
        default=True,
        nullable=False
    )

    audit_reminders = Column(
        Boolean,
        default=True,
        nullable=False
    )

    # ----------------------------------------------------------
    # Auditor Email Preferences
    # ----------------------------------------------------------

    audit_assignments = Column(
        Boolean,
        default=True,
        nullable=False
    )

    finding_notifications = Column(
        Boolean,
        default=True,
        nullable=False
    )

    report_notifications = Column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


# ==========================================================
# INTERNAL MESSAGING / AUDITOR CHAT
# ==========================================================

class Conversation(Base):

    __tablename__ = "conversations"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    conversation_type = Column(
        String(30),
        nullable=False,
        default="direct"
    )
    # direct / group

    title = Column(
        String(255),
        nullable=True
    )

    created_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
        index=True
    )

    messages = relationship(
        "DirectMessage",
        back_populates="conversation",
        cascade="all, delete-orphan"
    )

    participants = relationship(
        "ConversationParticipant",
        back_populates="conversation",
        cascade="all, delete-orphan"
    )


# ==========================================================
# DIRECT / GROUP MESSAGES
# ==========================================================

class DirectMessage(Base):

    __tablename__ = "direct_messages"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    conversation_id = Column(
        Integer,
        ForeignKey(
            "conversations.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    sender_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    message = Column(
        Text,
        nullable=True
    )

    message_type = Column(
        String(30),
        nullable=False,
        default="text"
    )
    # text / file / system

    is_deleted = Column(
        Boolean,
        default=False,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    conversation = relationship(
        "Conversation",
        back_populates="messages"
    )

    sender = relationship(
        "User",
        foreign_keys=[sender_id]
    )

    attachments = relationship(
        "MessageAttachment",
        back_populates="message",
        cascade="all, delete-orphan"
    )


# ==========================================================
# MESSAGE ATTACHMENTS
# ==========================================================

class MessageAttachment(Base):

    __tablename__ = "message_attachments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    message_id = Column(
        Integer,
        ForeignKey(
            "direct_messages.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    file_name = Column(
        String(255),
        nullable=False
    )

    file_path = Column(
        String(500),
        nullable=False
    )

    file_type = Column(
        String(100),
        nullable=True
    )

    file_size = Column(
        Float,
        default=0
    )

    uploaded_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    message = relationship(
        "DirectMessage",
        back_populates="attachments"
    )


# ==========================================================
# CHAT GROUPS
# ==========================================================

class ChatGroup(Base):

    __tablename__ = "chat_groups"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(150),
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    created_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    conversation_id = Column(
        Integer,
        ForeignKey(
            "conversations.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        unique=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# ==========================================================
# CHAT GROUP MEMBERS
# ==========================================================

class ChatGroupMember(Base):

    __tablename__ = "chat_group_members"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    group_id = Column(
        Integer,
        ForeignKey(
            "chat_groups.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    role = Column(
        String(30),
        default="member"
    )

    joined_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint(
            "group_id",
            "user_id",
            name="uq_chat_group_member"
        ),
    )


class PasswordResetOTP(Base):
    """
    Stores OTP information for password reset.

    The mobile number references the
    users.mobile column.
    """

    __tablename__ = "password_reset_otps"

    # ==========================================================
    # PRIMARY KEY
    # ==========================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ==========================================================
    # USER MOBILE FOREIGN KEY
    # ==========================================================

    user_mobile = Column(
        String(20),
        ForeignKey(
            "users.mobile",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    vendor_phone = Column(
        String(20),
        ForeignKey(
            "vendors.phone",
            ondelete="CASCADE",
        ),
        nullable=True,
        index=True,
    )

    # ==========================================================
    # OTP
    # ==========================================================

    otp_hash = Column(
        String(255),
        nullable=False,
    )

    # ==========================================================
    # OTP EXPIRATION
    # ==========================================================

    expires_at = Column(
        DateTime,
        nullable=False,
    )

    # ==========================================================
    # VERIFICATION STATUS
    # ==========================================================

    verified = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    # ==========================================================
    # OTP ATTEMPTS
    # ==========================================================

    attempts = Column(
        Integer,
        default=0,
        nullable=False,
    )

    # ==========================================================
    # CREATED DATE
    # ==========================================================

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # ==========================================================
    # VERIFIED DATE
    # ==========================================================

    verified_at = Column(
        DateTime,
        nullable=True,
    )

    # ==========================================================
    # RELATIONSHIP
    # ==========================================================

    user = relationship(
        "User",
        primaryjoin="PasswordResetOTP.user_mobile == User.mobile",
        foreign_keys=[user_mobile],
        backref="password_reset_otps",
    )

    vendor = relationship(
        "Vendor",
        primaryjoin=( "PasswordResetOTP.vendor_phone " "== Vendor.phone" ),
        foreign_keys=[vendor_phone],
        backref="password_reset_otps",
    )


# ============================================================
# AUTHENTICATION SCHEMAS
# ============================================================

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None

class UserLogin(BaseModel):
    username: str 
    password: str

# ==========================================================
# LOGIN RESPONSE
# ==========================================================

class LoginResponse(BaseModel):

    access_token: str

    token_type: str

    user_id: int

    name: str

    email: str

    role: str

class UserBase(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    email: EmailStr

    mobile: Optional[str] = Field(
        default=None,
        max_length=20,
    )

    password: Optional[str] = Field(
        default=None,
        min_length=6,
        max_length=100,
    )

    gender: Optional[str] = Field(
        default=None,
        max_length=20,
    )

    role: UserRole

    active: bool = True

class UserCreate(UserBase):
    password: str = Field(
        ...,
        min_length=6,
        max_length=100,
    )

class UserUpdate(BaseModel):
    name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    email: Optional[EmailStr] = None

    mobile: Optional[str] = Field(
        default=None,
        max_length=20,
    )

    password: Optional[str] = Field(
        default=None,
        min_length=6,
        max_length=100,
    )

    gender: Optional[str] = Field(
        default=None,
        max_length=20,
    )

    role: Optional[UserRole] = None

    active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime

    # Never expose hashed_password through this schema.
    password: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True,
    )

class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int

class UserRegister(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=150
    )

    email: EmailStr

    mobile: Optional[str] = Field(
        default=None,
        max_length=20
    )

    gender: Optional[str] = Field(
        default=None,
        max_length=20
    )

    role: str = Field(
        ...,
        min_length=2,
        max_length=50
    )

    password: str = Field(
        ...,
        min_length=8,
        max_length=128
    )

    confirm_password: str = Field(
        ...,
        min_length=8,
        max_length=128
    )

    address: Optional[str] = Field(
        default=None,
        max_length=500
    )

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, value):
        if value is None:
            return value

        value = value.strip()

        if not value.isdigit():
            raise ValueError(
                "Mobile number must contain only digits"
            )

        if len(value) != 10:
            raise ValueError(
                "Mobile number must contain exactly 10 digits"
            )

        return value

    @field_validator("role")
    @classmethod
    def validate_role(cls, value):
        allowed_roles = {
            "Admin",
            "Procurement Manager",
            "Finance Officer",
            "Supply Chain Manager",
            "Auditor"
        }

        if value not in allowed_roles:
            raise ValueError(
                "Invalid role selected"
            )

        return value

    def validate_passwords(self):
        if self.password != self.confirm_password:
            raise ValueError(
                "Passwords do not match"
            )

# ============================================================
# PROFILE SCHEMAS
# ============================================================

class AdminProfileResponse(BaseModel):
    id: int
    name: Optional[str] = None
    email: EmailStr
    mobile: Optional[str] = None
    gender: Optional[str] = None
    role: Optional[str] = None
    address: Optional[str] = None
    last_login: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class AdminProfileUpdate(BaseModel):
    """
    Schema used when an administrator updates
    their own profile.
    """

    name: str = Field(
        ...,
        min_length=1,
        max_length=100
    )

    email: EmailStr

    mobile: Optional[str] = None

    gender: Optional[str] = None

    address: Optional[str] = None

    active: bool = True

    new_password: Optional[str] = Field(
        default=None,
        min_length=6,
        max_length=255
    )

class AdminUserCreate(BaseModel):

    name: str

    email: EmailStr

    mobile: str | None = None

    role: str

    gender: str | None = None

    address: str | None = None

    password: str

    active: bool = True

class AdminUserUpdate(BaseModel):

    name: str

    email: EmailStr

    mobile: Optional[str] = None

    gender: Optional[str] = None

    role: str

    address: Optional[str] = None

    password: Optional[str] = None

    active: bool = True


# ==========================================================
# VENDOR BASE MODEL
# ==========================================================


# ============================================================
# VENDOR REGISTRATION / MANAGEMENT / PROFILE / DASHBOARD SCHEMAS
# ============================================================

class VendorBase(BaseModel):
    """
    Common vendor fields shared by vendor creation,
    update and response schemas.
    """

    vendor_name: str = Field(
        ...,
        min_length=2,
        max_length=150
    )

    country: Optional[str] = Field(
        default=None,
        max_length=100
    )

    email: EmailStr

    phone: Optional[str] = Field(
        default=None,
        min_length=5,
        max_length=20
    )

    business_type: Optional[str] = Field(
        default=None,
        max_length=100
    )

    address: Optional[str] = Field(
        default=None,
        max_length=255
    )

    category: Optional[str] = Field(
        default=None,
        max_length=100
    )

    contact_person: Optional[str] = Field(
        default=None,
        max_length=150
    )

    reliability_score: Optional[float] = 0

    status: Optional[str] = "Active"

    contract_count: Optional[int] = 0


# ==========================================================
# VENDOR REGISTRATION DETAILS
# ==========================================================

class VendorRegistrationDetails(BaseModel):
    """
    Data submitted during Step 1 of vendor registration.

    This corresponds to the registration form before
    the Vendor ID and password are submitted.
    """

    vendor_name: str = Field(
        ...,
        min_length=2,
        max_length=150
    )

    country: str = Field(
        ...,
        min_length=2,
        max_length=100
    )

    email: EmailStr

    phone: str = Field(
        ...,
        min_length=5,
        max_length=20
    )

    business_type: str = Field(
        ...,
        min_length=2,
        max_length=100
    )

    category: Optional[str] = Field(
        default=None,
        max_length=100
    )

    contact_person: Optional[str] = Field(
        default=None,
        max_length=150
    )

    address: str = Field(
        ...,
        min_length=2,
        max_length=255
    )


# ==========================================================
# VENDOR REGISTRATION REQUEST
# ==========================================================

class VendorRegistration(VendorRegistrationDetails):
    """
    Complete vendor registration request.

    Used by:

        POST /api/vendor/register

    The Vendor ID is generated during Step 1 and sent
    back during Step 2.

    The password is accepted from the frontend as plain
    text and must be hashed by the backend before storing
    it in:

        vendors.hashed_password
    """

    vendor_id: str = Field(
        ...,
        min_length=1,
        max_length=10
    )

    password: str = Field(
        ...,
        min_length=6,
        max_length=100
    )

class VendorAccountCreate(BaseModel):
    """
    Data required to create the vendor login account.

    Step 3 only requires:
    - Python-generated Vendor ID
    - New password
    """

    vendor_id: str = Field(
        ...,
        min_length=10,
        max_length=10
    )

    password: str = Field(
        ...,
        min_length=8,
        max_length=128
    )


# ==========================================================
# VENDOR CREATE
# ==========================================================

class VendorCreate(VendorBase):
    """
    Used when creating a new Vendor record.

    vendor_id can be generated by the backend.
    password is accepted here and converted to
    hashed_password before database insertion.
    """

    vendor_id: Optional[str] = Field(
        default=None,
        max_length=10
    )

    password: str = Field(
        ...,
        min_length=6,
        max_length=100
    )


# ==========================================================
# VENDOR UPDATE
# ==========================================================

class VendorUpdate(BaseModel):
    """
    Used by Admin Vendor Management when editing
    an existing vendor.
    """

    vendor_name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=150
    )

    country: Optional[str] = Field(
        default=None,
        max_length=100
    )

    email: Optional[EmailStr] = None

    phone: Optional[str] = Field(
        default=None,
        min_length=5,
        max_length=20
    )

    business_type: Optional[str] = Field(
        default=None,
        max_length=100
    )

    address: Optional[str] = Field(
        default=None,
        max_length=255
    )

    category: Optional[str] = Field(
        default=None,
        max_length=100
    )

    contact_person: Optional[str] = Field(
        default=None,
        max_length=150
    )

    status: Optional[str] = Field(
        default=None,
        max_length=50
    )

    reliability_score: Optional[float] = Field(
        default=None,
        ge=0,
        le=100
    )

    quality_score: Optional[float] = Field(
        default=None,
        ge=0
    )

    delivery_score: Optional[float] = Field(
        default=None,
        ge=0,
        le=100
    )

    service_score: Optional[float] = Field(
        default=None,
        ge=0,
        le=100
    )

    contract_count: Optional[int] = Field(
        default=None,
        ge=0
    )

    approved_by: Optional[str] = None

    password: Optional[str] = None


# ==========================================================
# VENDOR EDIT RESPONSE
# ==========================================================

class VendorEditResponse(BaseModel):

    vendor_id: str

    vendor_name: str

    country: Optional[str] = None

    email: EmailStr

    phone: Optional[str] = None

    business_type: Optional[str] = None

    address: Optional[str] = None

    category: Optional[str] = None

    contact_person: Optional[str] = None

    status: str

    approved_by: Optional[str] = None

    reliability_score: float = 0

    quality_score: float = 0

    delivery_score: float = 0

    service_score: float = 0

    contract_count: int = 0

    class Config:
        from_attributes = True

class VendorEditRequest(BaseModel):

    vendor_name: str = Field(
        ...,
        min_length=2,
        max_length=150
    )

    country: Optional[str] = None

    email: EmailStr

    phone: Optional[str] = None

    business_type: Optional[str] = None

    address: Optional[str] = None

    category: Optional[str] = None

    contact_person: Optional[str] = None

    status: str

    reliability_score: float = Field(
        default=0,
        ge=0,
        le=100
    )

    quality_score: float = Field(
        default=0,
        ge=0,
        le=100
    )

    delivery_score: float = Field(
        default=0,
        ge=0,
        le=100
    )

    service_score: float = Field(
        default=0,
        ge=0,
        le=100
    )

    contract_count: int = Field(
        default=0,
        ge=0
    )

    approved_by: Optional[str] = None


# ==========================================================
# VENDOR REGISTRATION RESPONSE
# ==========================================================

class VendorRegistrationResponse(BaseModel):

    message: str

    vendor_id: str

    status: str

class VendorAccountResponse(BaseModel):

    message: str

    vendor_id: str

    status: str


# ==========================================================
# VENDOR RESPONSE
# ==========================================================

class VendorResponse(VendorBase):
    """
    Complete Vendor response returned by the API.
    """

    id: int

    vendor_id: str

    hashed_password: Optional[str] = None

    status: str

    approved_by: Optional[int] = None

    reliability_score: Optional[float] = None

    trend: Optional[str] = None

    quality_score: Optional[float] = None

    delivery_score: Optional[float] = None

    service_score: Optional[float] = None

    contract_count: int = 0

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# VENDOR MANAGEMENT RESPONSE
# ==========================================================

class VendorManagementResponse(BaseModel):
    """
    Response specifically designed for the Admin
    Vendor Management page.
    """

    id: int

    vendor_id: str

    vendor_name: str

    category: Optional[str] = None

    contact_person: Optional[str] = None

    email: EmailStr

    reliability_score: Optional[float] = None

    status: str

    contract_count: int = 0

    is_preferred: bool = False

    model_config = ConfigDict( from_attributes=True )


# ==========================================================
# VENDOR DASHBOARD RESPONSE
# ==========================================================

class VendorDashboardResponse(BaseModel):
    """
    Vendor information displayed on the Vendor Dashboard.
    """

    id: int

    vendor_id: str

    vendor_name: str

    country: Optional[str] = None

    email: EmailStr

    phone: Optional[str] = None

    business_type: Optional[str] = None

    address: Optional[str] = None

    category: Optional[str] = None

    contact_person: Optional[str] = None

    status: str

    reliability_score: Optional[float] = None

    trend: Optional[str] = None

    quality_score: Optional[float] = None

    delivery_score: Optional[float] = None

    service_score: Optional[float] = None

    contract_count: int = 0

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# VENDOR APPROVAL
# ==========================================================

class VendorApproval(BaseModel):
    """
    Used by Admin to approve or reject a vendor.
    """

    status: str = Field(
        ...,
        max_length=50
    )

    approved_by: Optional[int] = None


# ==========================================================
# VENDOR STATUS UPDATE
# ==========================================================

class VendorStatusUpdate(BaseModel):
    """
    Used to change vendor status from Vendor Management.
    """

    status: str = Field(
        ...,
        max_length=50
    )


class VendorSettingsResponse(BaseModel):

    vendor_id: str

    company_name: str
    email: str
    phone: Optional[str] = None
    website: Optional[str] = None

    business_type: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None

    primary_contact: Optional[str] = None

    gst_vat_number: Optional[str] = None
    tax_id_ein: Optional[str] = None
    pan_number: Optional[str] = None

    member_since: Optional[datetime] = None

    total_users: int = 0
    active_users: int = 0
    roles: int = 0
    pending_invitations: int = 0

    email_notifications: bool
    system_notifications: bool
    sms_notifications: bool
    digest_frequency: str

    document_expiry_alert_days: int
    auto_document_reminder: bool
    allowed_file_types: str
    max_file_size_mb: int

    password_changed_at: Optional[datetime] = None
    two_factor_authentication: bool
    active_sessions: int
    account_security_status: str

    language: str
    timezone: str
    date_format: str
    currency: str

    plan_name: str
    storage_used_gb: float
    storage_limit_gb: float
    account_status: str

    last_login: Optional[datetime] = None


class VendorSettingsUpdate(BaseModel):

    company_name: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    primary_contact: Optional[str] = None

    business_type: Optional[str] = None

    gst_vat_number: Optional[str] = None
    tax_id_ein: Optional[str] = None
    pan_number: Optional[str] = None

    email_notifications: Optional[bool] = None
    system_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None

    digest_frequency: Optional[str] = None

    document_expiry_alert_days: Optional[int] = None
    auto_document_reminder: Optional[bool] = None
    allowed_file_types: Optional[str] = None
    max_file_size_mb: Optional[int] = None

    two_factor_authentication: Optional[bool] = None

    language: Optional[str] = None
    timezone: Optional[str] = None
    date_format: Optional[str] = None
    currency: Optional[str] = None


# ==========================================================
# VENDOR PERFORMANCE UPDATE
# ==========================================================

class VendorPerformanceUpdate(BaseModel):
    """
    Used to update vendor dashboard performance metrics.
    """

    reliability_score: Optional[float] = Field(
        default=None,
        ge=0,
        le=100
    )

    trend: Optional[str] = Field(
        default=None,
        max_length=20
    )

    quality_score: Optional[float] = Field(
        default=None,
        ge=0
    )

    delivery_score: Optional[float] = Field(
        default=None,
        ge=0,
        le=100
    )

    service_score: Optional[float] = Field(
        default=None,
        ge=0,
        le=100
    )


# ============================================================
# PERFORMANCE REPORT FILTERS
# ============================================================

class PerformanceReportFilters(BaseModel):

    from_date: Optional[date] = None

    to_date: Optional[date] = None

    category: Optional[str] = None

    vendor_id: Optional[str] = None


# ============================================================
# PERFORMANCE REPORT SCHEDULE
# ============================================================

class PerformanceReportScheduleCreate(BaseModel):
    report_name: str
    schedule: str
    next_run: Optional[datetime] = None
    recipients: Optional[str] = None
    format: str = "PDF"
    status: str = "Active"
    is_active: bool = True
    

class PerformanceReportScheduleResponse(
    PerformanceReportScheduleCreate
):

    id: int

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# PERFORMANCE VENDOR ROW
# ============================================================

class PerformanceVendorRow(BaseModel):

    vendor_id: str

    vendor_name: str

    category: Optional[str] = None

    overall_score: float = 0

    on_time_delivery: float = 0

    quality_score: float = 0

    order_fulfillment: float = 0

    response_time: float = 0

    trend: str = "flat"


# ============================================================
# PERFORMANCE CATEGORY ROW
# ============================================================

class PerformanceCategoryRow(BaseModel):

    category: str

    on_time_delivery: float = 0

    quality_score: float = 0

    order_fulfillment: float = 0

    overall_score: float = 0


# ============================================================
# PERFORMANCE REPORT RESPONSE
# ============================================================

class PerformanceReportResponse(BaseModel):

    success: bool = True

    date_range: dict

    filters: dict

    kpis: dict

    score_breakdown: list

    score_distribution: list

    performance_trend: dict

    vendors: list

    categories: list

    insights: list


# ==========================================================
# VENDOR LIST RESPONSE
# ==========================================================

class VendorListResponse(BaseModel):
    """
    Used for the Vendor Management table.
    """

    total: int

    vendors: list[VendorManagementResponse]


# ==========================================================
# VENDOR LOGIN
# ==========================================================

class VendorLogin(BaseModel):
    """
    Vendor login uses Vendor ID as username.
    """

    vendor_id: str = Field(
        ...,
        min_length=1,
        max_length=10
    )

    password: str = Field(
        ...,
        min_length=1,
        max_length=100
    )


# ==========================================================
# VENDOR LOGIN RESPONSE
# ==========================================================

class VendorLoginResponse(BaseModel):
    """
    Returned after successful vendor login.
    """

    access_token: str

    token_type: str = "bearer"

    vendor_id: str

    vendor_name: str

    status: str


# ============================================================
# VENDOR PROFILE
# ============================================================

class VendorProfileResponse(BaseModel):

    id: int
    vendor_id: str
    vendor_name: str

    country: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None

    business_type: Optional[str] = None
    category: Optional[str] = None

    address: Optional[str] = None
    contact_person: Optional[str] = None

    status: Optional[str] = None

    reliability_score: float = 0
    quality_score: float = 0
    delivery_score: float = 0
    service_score: float = 0

    contract_count: int = 0

    class Config:
        from_attributes = True

class VendorProfileUpdate(BaseModel):

    vendor_name: Optional[str] = None

    country: Optional[str] = None

    email: Optional[EmailStr] = None

    phone: Optional[str] = None

    business_type: Optional[str] = None

    category: Optional[str] = None

    address: Optional[str] = None

    contact_person: Optional[str] = None

    password: Optional[str] = None


# ============================================================
# PROCUREMENT / PURCHASE ORDER SCHEMAS
# ============================================================

class ProcurementRequestCreate(BaseModel):

    title: str = Field(
        ...,
        min_length=2,
        max_length=255
    )

    department: Optional[str] = None

    category: Optional[str] = None

    description: Optional[str] = None

    amount: float = Field(
        default=0,
        ge=0
    )

    required_date: Optional[date] = None

    priority: str = "Medium"


class ProcurementRequestUpdate(BaseModel):

    title: Optional[str] = Field(
        default=None,
        max_length=255
    )

    requester: Optional[str] = None

    department: Optional[str] = None

    category: Optional[str] = None

    description: Optional[str] = None

    amount: Optional[float] = Field(
        default=None,
        ge=0
    )

    required_date: Optional[date] = None

    priority: Optional[str] = None

    status: Optional[str] = None

    rejection_reason: Optional[str] = None


class ProcurementRequestResponse(BaseModel):

    id: int

    request_number: str

    title: Optional[str] = None

    requester: Optional[str] = None

    requester_user_id: Optional[int] = None

    department: Optional[str] = None

    category: Optional[str] = None

    description: Optional[str] = None

    amount: float

    required_date: Optional[date] = None

    priority: str

    status: str

    po_number: Optional[str] = None

    created_at: Optional[datetime] = None

    submitted_at: Optional[datetime] = None

    approved_at: Optional[datetime] = None

    approved_by: Optional[int] = None

    rejection_reason: Optional[str] = None

    class Config:
        from_attributes = True


class StatusUpdate(BaseModel):

    status: str

    rejection_reason: Optional[str] = None


# ============================================================
# RESPONSE SCHEMAS
# ============================================================

class ProcurementRequestListItem(BaseModel):
    id: int
    request_number: str
    title: Optional[str] = None
    requester: Optional[str] = None
    requester_user_id: Optional[int] = None

    department: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None

    priority: str
    status: str

    amount: float
    created_at: Optional[datetime] = None
    required_date: Optional[date] = None

    approved_at: Optional[datetime] = None
    approved_by: Optional[int] = None

    po_number: Optional[str] = None

    class Config:
        from_attributes = True


class ProcurementRequestCreateAPI(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)

    department: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None

    amount: float = Field(default=0, ge=0)

    required_date: Optional[date] = None

    priority: str = "Medium"


class ProcurementRequestStatusUpdate(BaseModel):
    status: str
    rejection_reason: Optional[str] = None


class ReportsDashboardResponse(BaseModel):
    success: bool
    date_range: dict
    kpis: dict
    spend_trend: list
    spend_by_category: list
    top_vendors: list
    department_spend: list
    monthly_summary: list
    recent_reports: list
    report_categories: dict


# ============================================================
# PURCHASE ORDER BASE
# ============================================================

class PurchaseOrderBase(BaseModel):

    po_number: str = Field(
        ...,
        min_length=2,
        max_length=50,
    )

    vendor_id: str

    amount: float = Field(
        default=0,
        ge=0,
    )

    status: str = Field(
        default="Pending",
        min_length=1,
        max_length=50,
    )

    order_date: Optional[date] = None

    expected_delivery: Optional[date] = None

    actual_delivery: Optional[date] = None


# ============================================================
# CREATE
# ============================================================

class PurchaseOrderCreate(BaseModel):
    # ============================================================
    # CORE PURCHASE ORDER FIELDS
    # ============================================================

    po_number: str

    pr_id: Optional[int] = None
    pr_number: Optional[str] = None

    vendor_id: str

    amount: float = Field(
        default=0,
        ge=0
    )

    status: str = "Pending Finance Approval"

    order_date: Optional[date] = None

    expected_delivery: Optional[date] = None

    actual_delivery: Optional[date] = None

    department: Optional[str] = None

    category: Optional[str] = None

    # ============================================================
    # STEP 1 - PURCHASE ORDER DETAILS
    # ============================================================

    po_type: str = "Standard Purchase Order"

    supplier_reference: Optional[str] = None

    contact_person: Optional[str] = None

    contact_phone: Optional[str] = None

    contact_email: Optional[EmailStr] = None

    payment_method: Optional[str] = None

    payment_terms: Optional[str] = None

    incoterms: Optional[str] = None

    currency: str = "INR"

    exchange_rate: float = Field(
        default=1,
        gt=0
    )

    warehouse_id: Optional[int] = None

    warehouse_info: Optional[str] = None

    notes: Optional[str] = None

    # ============================================================
    # STEP 2 - ITEMS
    # ============================================================

    items: List["PurchaseOrderItemCreate"] = []

    # ============================================================
    # TOTALS
    # ============================================================

    subtotal: float = Field(
        default=0,
        ge=0
    )

    tax_amount: float = Field(
        default=0,
        ge=0
    )

    shipping_amount: float = Field(
        default=0,
        ge=0
    )

    total_amount: float = Field(
        default=0,
        ge=0
    )


# ============================================================
# UPDATE
# ============================================================

class PurchaseOrderUpdate(BaseModel):

    po_number: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=50,
    )

    vendor_id: Optional[str] = None

    amount: Optional[float] = Field(
        default=None,
        ge=0,
    )

    status: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    order_date: Optional[date] = None

    expected_delivery: Optional[date] = None

    actual_delivery: Optional[date] = None


# ============================================================
# RESPONSE
# ============================================================

class PurchaseOrderResponse(BaseModel):

    id: int

    po_number: str

    pr_id: Optional[int]

    pr_number: Optional[str]

    vendor_id: Optional[str]

    amount: float

    status: str

    order_date: Optional[date]

    expected_delivery: Optional[date]

    actual_delivery: Optional[date]

    class Config:
        from_attributes = True


class POItemCreate(BaseModel):

    inventory_item_id: Optional[int] = None

    item_code: str

    item_description: str

    uom: str = "PCS"

    quantity: Decimal = Field( gt=0 )

    unit_price: Decimal = Field( ge=0 )

    tax_rate: Decimal = Field( ge=0 )


class PurchaseOrderCreateRequest(BaseModel):

    po_type: str

    vendor_id: str

    supplier_reference: Optional[str] = None

    contact_person: Optional[str] = None

    contact_phone: Optional[str] = None

    contact_email: Optional[str] = None

    payment_method: Optional[str] = None

    payment_terms: Optional[str] = None

    incoterms: Optional[str] = None

    currency: str = "IN"

    exchange_rate: Decimal = 1

    order_date: date

    required_delivery_date: date

    delivery_warehouse_id: Optional[int] = None

    notes: Optional[str] = None

    shipping_amount: Decimal = 0

    items: List[POItemCreate]


class DraftResponse(BaseModel):

    success: bool

    message: str

    po_id: int

    po_number: str

    total_amount: Decimal


class PurchaseOrderItemCreate(BaseModel):
    inventory_item_id: Optional[int] = None

    item_code: str = Field(
        ...,
        max_length=50
    )

    item_description: str = Field(
        ...,
        max_length=500
    )

    uom: str = Field(
        default="PCS",
        max_length=20
    )

    quantity: float = Field(
        ...,
        gt=0
    )

    unit_price: float = Field(
        ...,
        ge=0
    )

    tax_rate: float = Field(
        default=0,
        ge=0
    )


class PurchaseOrderDetailsCreate(BaseModel):

    po_type: str = "Standard Purchase Order"

    supplier_reference: Optional[str] = None

    contact_person: Optional[str] = None

    contact_phone: Optional[str] = None

    contact_email: Optional[EmailStr] = None

    payment_method: Optional[str] = None

    payment_terms: Optional[str] = None

    incoterms: Optional[str] = None

    currency: str = "IN"

    exchange_rate: float = Field( default=1, gt=0 )

    delivery_warehouse_id: Optional[int] = None

    notes: Optional[str] = None

    subtotal: float = 0

    tax_amount: float = 0

    shipping_amount: float = 0

    total_amount: float = 0


class PurchaseOrderFullCreate(BaseModel):

    po_number: Optional[str] = None

    vendor_id: str

    order_date: date

    expected_delivery: date

    status: str = "Draft"

    details: PurchaseOrderDetailsCreate

    items: List[ PurchaseOrderItemCreate ]


# ============================================================
# APPROVAL SCHEMAS
# ============================================================

class ApprovalDecision(BaseModel):
    status: str = Field(
        ...,
        pattern="^(Approved|Rejected)$"
    )

    comments: Optional[str] = None


class ApprovalWorkflowResponse(BaseModel):
    id: int
    reference_type: str
    reference_id: int
    reference_number: str

    title: Optional[str] = None
    requested_by: Optional[str] = None
    department: Optional[str] = None

    amount: float
    priority: Optional[str] = None
    status: str

    current_step: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )


class ApprovalLevelCreate(BaseModel):
    level: int
    role: str
    approval_type: Optional[str] = "Sequential"
    min_amount: Optional[float] = 0
    max_amount: Optional[float] = None


class ApprovalWorkflowCreate(BaseModel):
    workflow_name: str
    description: Optional[str] = None
    is_active: bool = True
    levels: List[ApprovalLevelCreate] = []


class ApprovalWorkflowUpdate(BaseModel):
    workflow_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ApprovalStepResponse(BaseModel):
    id: int
    step_order: int
    step_name: str
    approver_user_id: Optional[int] = None
    approver_name: Optional[str] = None
    status: str
    comments: Optional[str] = None
    acted_at: Optional[datetime] = None


class ApprovalDetailResponse(BaseModel):
    workflow: dict
    steps: List[dict]


class TrackingEventCreate(BaseModel):

    shipment_id: int

    event_type: str

    event_time: Optional[datetime] = None

    location: Optional[str] = None

    note: Optional[str] = None


class OrderReportScheduleRequest( BaseModel ):

    vendor_id: str

    report_name: str = ( "Order Report" )

    schedule: str = ( "Monthly" )

    next_run: Optional[ datetime ] = None

    recipients: Optional[ str ] = None

    format: str = ( "CSV" )

    filters: dict = {}


class ComplianceReportScheduleRequest( BaseModel ):

    vendor_id: str

    report_name: str = ( "Compliance Report" )

    schedule: str = "Monthly"

    next_run: Optional[datetime] = None

    recipients: Optional[str] = None

    format: str = "CSV"

    filters: dict = Field( default_factory=dict )


# ============================================================
# COMPLIANCE DASHBOARD SCHEMAS
# ============================================================

class ComplianceAreaCreate(BaseModel):

    name: str

    category: str

    description: Optional[str] = None

    score: float = Field(
        default=0,
        ge=0,
        le=100
    )

    status: str = "Compliant"

    previous_score: float = Field(
        default=0,
        ge=0,
        le=100
    )


class ComplianceActivityCreate(BaseModel):

    activity: str

    category: str

    activity_date: date

    status: str = "Pending"

    assigned_to: Optional[str] = None

    description: Optional[str] = None


class ComplianceDeadlineCreate(BaseModel):

    title: str

    category: str

    due_date: date

    status: str = "Pending"

    description: Optional[str] = None

    assigned_to: Optional[str] = None


class ComplianceAlertCreate(BaseModel):

    title: str

    message: str

    category: Optional[str] = None

    severity: str = "Medium"


class ComplianceDashboardResponse(BaseModel):

    success: bool

    kpis: dict

    trend: list

    status_overview: dict

    categories: list

    activities: list

    deadlines: list

    alerts: list


# ============================================================
# CONTRACT SCHEMAS
# ============================================================


# ============================================================
# CONTRACTS & COMPLIANCE SCHEMAS
# ============================================================

class ContractBase(BaseModel):
    contract_number: str = Field(
        ...,
        min_length=1,
        max_length=50,
    )

    vendor_id: str

    status: str = Field(
        ...,
        min_length=1,
        max_length=30,
    )

    renewal_date: Optional[date] = None

    expiry_date: Optional[date] = None

    contract_value: Optional[float] = Field(
        default=None,
        ge=0,
    )

    compliance_status: Optional[str] = Field(
        default=None,
        max_length=30,
    )

    risk_level: Optional[str] = Field(
        default=None,
        max_length=20,
    )

    renewal_status: Optional[str] = Field(
        default=None,
        max_length=30,
    )

class ContractCreate(ContractBase):
    pass

class ContractUpdate(BaseModel):
    contract_number: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    vendor_id: Optional[str] = None

    status: Optional[str] = Field(
        default=None,
        max_length=30,
    )

    expiry_date: Optional[date] = None

    renewal_date: Optional[date] = None

    contract_value: Optional[float] = Field(
        default=None,
        ge=0,
    )

    compliance_status: Optional[str] = Field(
        default=None,
        max_length=30,
    )

    risk_level: Optional[str] = Field(
        default=None,
        max_length=20,
    )

    renewal_status: Optional[str] = Field(
        default=None,
        max_length=30,
    )

class ContractResponse(ContractBase):
    id: int

    model_config = ConfigDict(
        from_attributes=True,
    )

class ContractListResponse(BaseModel):
    contracts: List[ContractResponse]
    total: int


# ============================================================
# INVOICE SCHEMAS
# ============================================================


# ============================================================
# INVOICES & PAYMENTS SCHEMAS
# ============================================================

# ============================================================
# INVOICE
# ============================================================

class InvoiceBase(BaseModel):

    invoice_number: str = Field(
        ...,
        min_length=1,
        max_length=50
    )

    amount: float = Field(
        ...,
        ge=0
    )

    status: str = Field(
        default="Pending",
        min_length=1,
        max_length=30
    )

    invoice_date: Optional[date] = None

    due_date: Optional[date] = None

    paid_date: Optional[date] = None

    vendor_id: Optional[str] = None

    po_id: Optional[int] = None

    customer_id: Optional[int] = None


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceUpdate(BaseModel):

    invoice_number: Optional[str] = None

    amount: Optional[float] = Field(
        default=None,
        ge=0
    )

    status: Optional[str] = None

    invoice_date: Optional[date] = None

    due_date: Optional[date] = None

    paid_date: Optional[date] = None

    vendor_id: Optional[str] = None

    po_id: Optional[int] = None

    customer_id: Optional[int] = None


class InvoiceResponse(InvoiceBase):

    id: int

    model_config = ConfigDict(
        from_attributes=True
    )


class InvoiceStatusUpdate(BaseModel):

    status: str


class InvoiceListResponse(BaseModel):

    invoices: List[InvoiceResponse]

    total: int


class InvoiceDecisionRequest(BaseModel):
    decision: str


class InvoiceItemResponse(BaseModel):
    id: int
    item_code: Optional[str] = None
    description: str
    quantity: float
    unit_price: float
    tax_rate: float
    tax_amount: float
    amount: float


class InvoiceAttachmentResponse(BaseModel):
    id: int
    file_name: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None


class InvoiceHistoryResponse(BaseModel):
    action: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None


class InvoiceWorkflowStepResponse(BaseModel):
    step_order: int
    step_name: str
    status: str
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None


class InvoiceDashboardDetailResponse(BaseModel):

    id: int

    invoice_number: str

    vendor_id: Optional[str] = None

    vendor_name: Optional[str] = None

    po_id: Optional[int] = None

    po_number: Optional[str] = None

    amount: float

    status: str

    invoice_date: Optional[date] = None

    due_date: Optional[date] = None

    paid_date: Optional[date] = None

    total_paid: float = 0

    balance_due: float = 0

    payments: list = []

    items: list[InvoiceItemResponse] = []

    history: list[InvoiceHistoryResponse] = []

    attachments: list[InvoiceAttachmentResponse] = []

    workflow: list[InvoiceWorkflowStepResponse] = []


# ============================================================
# INVOICE CREATE
# ============================================================

class VendorInvoiceCreate(BaseModel):

    invoice_number: str

    po_id: int | None = None

    amount: float

    invoice_date: datetime

    due_date: datetime | None = None


# ============================================================
# PAYMENT LIST
# ============================================================

class PaymentListResponse(BaseModel):

    payments: List[PaymentResponse]

    total: int


# ============================================================
# INVOICE DETAIL
# ============================================================

class InvoiceDetailResponse(InvoiceResponse):

    po_number: Optional[str] = None

    vendor_name: Optional[str] = None

    payments: List[PaymentResponse] = []


# ============================================================
# INVOICE STATUS SUMMARY
# ============================================================

class InvoiceStatusSummary(BaseModel):

    paid: int = 0

    pending: int = 0

    overdue: int = 0

    draft: int = 0

    total: int = 0


# ============================================================
# PAYMENT MONTHLY SUMMARY
# ============================================================

class MonthlyPaymentSummary(BaseModel):

    month: str

    paid_amount: float = 0

    pending_amount: float = 0


# ============================================================
# DASHBOARD SUMMARY
# ============================================================

class InvoiceDashboardItem(BaseModel):

    id: int

    invoice_number: str

    po_id: Optional[int] = None

    po_number: Optional[str] = None

    vendor_id: Optional[str] = None

    vendor_name: Optional[str] = None

    amount: float

    status: str

    invoice_date: Optional[date] = None

    due_date: Optional[date] = None

    paid_date: Optional[date] = None


class InvoiceDashboardResponse(BaseModel):

    total_invoices: int

    total_paid: float

    pending_payments: float

    overdue_amount: float

    average_payment_time: float

    status_summary: InvoiceStatusSummary

    monthly_payments: List[MonthlyPaymentSummary]

    recent_invoices: List[InvoiceResponse]

    upcoming_payments: List[InvoiceResponse]

    payment_history: List[PaymentResponse]


# ============================================================
# PAYMENT METHOD
# ============================================================

class PaymentMethodCreate(BaseModel):

    method_type: str

    account_name: str

    account_number: str

    bank_name: str | None = None

    branch_name: str | None = None

    ifsc_code: str | None = None

    is_default: bool = False


class PaymentMethodResponse(BaseModel):

    id: int

    vendor_id: str

    method_type: str

    account_name: str

    account_number: str

    bank_name: str | None = None

    branch_name: str | None = None

    ifsc_code: str | None = None

    is_default: bool

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class NotificationResponse(BaseModel):

    id: int

    vendor_id: Optional[str] = None

    recipient_user_id: Optional[int] = None

    notification_type: str

    title: str

    message: Optional[str] = None

    category: str

    priority: str

    channel: str

    status: str

    reference_id: Optional[str] = None

    related_type: Optional[str] = None

    recipient_email: Optional[str] = None

    recipient_phone: Optional[str] = None

    created_at: datetime

    is_email_sent: bool

    is_sms_sent: bool

    model_config = ConfigDict(
        from_attributes=True
    )


class NotificationCreate(BaseModel):

    notification_type: str

    title: str

    message: Optional[str] = None

    category: str

    priority: str = "Low"

    channel: str = "In-App"

    reference_id: Optional[str] = None

    related_type: Optional[str] = None

    recipient_user_id: Optional[int] = None

    vendor_id: Optional[str] = None

    recipient_email: Optional[str] = None

    recipient_phone: Optional[str] = None


class NotificationStats(BaseModel):

    total_notifications: int
    unread_notifications: int
    high_priority_alerts: int

    email_sent: int
    sms_sent: int

    action_required: int


# ==========================================================
# NOTIFICATION SETTINGS
# ==========================================================

class NotificationSettingsBase(BaseModel):

    email_enabled: bool = True

    vendor_registration: bool = True

    po_updates: bool = True

    contract_expiration: bool = True

    sms_enabled: bool = False

    urgent_sms: bool = True

    browser_notifications: bool = True

    notification_sound: bool = True


class NotificationSettingsCreate(
    NotificationSettingsBase
):
    pass


class NotificationSettingsUpdate(
    NotificationSettingsBase
):
    pass


class NotificationSettingsResponse(
    NotificationSettingsBase
):

    id: int

    user_id: int

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class MessageCreate(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=5000
    )

    message_type: str = "Message"


class ConversationParticipantResponse(BaseModel):
    user_id: int
    name: str
    role: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True


class VendorNotificationSettingsResponse(BaseModel):

    id: int
    vendor_id: str

    procurement_alerts: bool
    delivery_delay_notifications: bool
    vendor_approval_notifications: bool
    contract_expiry_alerts: bool
    compliance_notifications: bool
    email_notifications: bool
    sms_notifications: bool

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class VendorNotificationSettingsUpdate(BaseModel):

    procurement_alerts: bool = True

    delivery_delay_notifications: bool = True

    vendor_approval_notifications: bool = True

    contract_expiry_alerts: bool = True

    compliance_notifications: bool = True

    email_notifications: bool = True

    sms_notifications: bool = False


class VendorNotificationStats(BaseModel):

    all_notifications: int = 0

    unread_notifications: int = 0

    procurement_alerts: int = 0

    procurement_unread: int = 0

    delivery_delays: int = 0

    delivery_unread: int = 0

    vendor_approvals: int = 0

    vendor_unread: int = 0

    contract_expiry: int = 0

    contract_unread: int = 0

    compliance: int = 0

    compliance_unread: int = 0


class VendorNotificationListResponse(BaseModel):

    items: list[NotificationResponse]

    total: int

    page: int

    limit: int

    total_pages: int


# ==========================================================
# EMAIL TEMPLATE
# ==========================================================

# ==========================================================
# CREATE
# ==========================================================

class EmailTemplateCreate(BaseModel):

    template_name: str = Field(
        ...,
        min_length=1,
        max_length=255
    )

    subject: str = Field(
        ...,
        min_length=1,
        max_length=500
    )

    body: str = Field(
        ...,
        min_length=1
    )

    status: str = Field(
        default="Active",
        max_length=20
    )


# ==========================================================
# UPDATE
# ==========================================================

class EmailTemplateUpdate(BaseModel):

    template_name: str = Field(
        ...,
        min_length=1,
        max_length=255
    )

    subject: str = Field(
        ...,
        min_length=1,
        max_length=500
    )

    body: str = Field(
        ...,
        min_length=1
    )

    status: str = Field(
        default="Active",
        max_length=20
    )


# ==========================================================
# RESPONSE
# ==========================================================

class EmailTemplateResponse(BaseModel):

    id: int

    template_name: str

    subject: str

    body: str

    status: str

    created_by: int | None = None

    created_at: datetime | None = None

    updated_at: datetime | None = None


    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# SMS TEMPLATE
# ==========================================================

class SMSTemplateCreate(BaseModel):

    template_name: str

    message: str

    status: str = "Active"


class SMSTemplateUpdate(BaseModel):

    template_name: str

    message: str

    status: str


class SMSTemplateResponse(BaseModel):

    id: int

    template_name: str

    message: str

    status: str

    created_by: Optional[int] = None

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# NOTIFICATION LOG
# ==========================================================

class NotificationLogResponse(BaseModel):

    id: int

    recipient: str

    notification_type: str

    subject: Optional[str] = None

    message: Optional[str] = None

    status: str

    error_message: Optional[str] = None

    sent_at: datetime

    created_by: Optional[int] = None

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# PERMISSION
# ==========================================================

class PermissionBase(BaseModel):

    module: str

    permission: str

    access: str


class PermissionResponse(
    PermissionBase
):

    id: int

    class Config:
        from_attributes = True


# ==========================================================
# ROLE
# ==========================================================

class RoleCreate(BaseModel):

    name: str

    description: Optional[str] = None

    role_type: str = "Custom"


class RoleResponse(BaseModel):

    id: int

    name: str

    description: Optional[str]

    role_type: str

    user_count: int = 0

    class Config:
        from_attributes = True


# ==========================================================
# UPDATE PERMISSIONS
# ==========================================================

class PermissionUpdate(BaseModel):

    module: str

    permission: str

    access: str


class RolePermissionsUpdate(BaseModel):

    permissions: List[
        PermissionUpdate
    ]


class SystemSettingsResponse(BaseModel):

    id: int

    # General
    platform_name: str
    platform_tagline: str
    default_language: str
    default_timezone: str
    date_format: str
    time_format: str
    items_per_page: int
    currency: str

    # User & Access
    allow_user_registration: bool
    require_email_verification: bool
    password_minimum_length: int
    session_timeout: str

    # Security
    password_complexity: bool
    password_expiry: str
    max_login_attempts: int
    two_factor_authentication: bool

    # Notifications
    in_app_notifications: bool
    email_notifications: bool
    sms_notifications: bool
    digest_frequency: str

    # Email
    smtp_host: Optional[str] = None
    smtp_port: int
    from_email: Optional[str] = None
    from_name: Optional[str] = None

    # Data
    data_retention_period: str
    file_storage_limit: str

    # Backup
    automatic_backups: bool
    backup_frequency: str
    backup_time: str

    class Config:
        from_attributes = True


class SystemSettingsUpdate(BaseModel):

    # ======================================================
    # GENERAL
    # ======================================================

    platform_name: Optional[str] = None

    platform_tagline: Optional[str] = None

    default_language: Optional[str] = None

    default_timezone: Optional[str] = None

    date_format: Optional[str] = None

    time_format: Optional[str] = None

    items_per_page: Optional[int] = Field(
        default=None,
        ge=1,
        le=100
    )

    currency: Optional[str] = None


    # ======================================================
    # USER & ACCESS
    # ======================================================

    allow_user_registration: Optional[bool] = None

    require_email_verification: Optional[bool] = None

    password_minimum_length: Optional[int] = Field(
        default=None,
        ge=6,
        le=128
    )

    session_timeout: Optional[str] = None


    # ======================================================
    # SECURITY
    # ======================================================

    password_complexity: Optional[bool] = None

    password_expiry: Optional[str] = None

    max_login_attempts: Optional[int] = Field(
        default=None,
        ge=1,
        le=20
    )

    two_factor_authentication: Optional[bool] = None


    # ======================================================
    # NOTIFICATIONS
    # ======================================================

    in_app_notifications: Optional[bool] = None

    email_notifications: Optional[bool] = None

    sms_notifications: Optional[bool] = None

    digest_frequency: Optional[str] = None


    # ======================================================
    # EMAIL
    # ======================================================

    smtp_host: Optional[str] = None

    smtp_port: Optional[int] = Field(
        default=None,
        ge=1,
        le=65535
    )

    from_email: Optional[str] = None

    from_name: Optional[str] = None


    # ======================================================
    # DATA
    # ======================================================

    data_retention_period: Optional[str] = None

    file_storage_limit: Optional[str] = None


    # ======================================================
    # BACKUP
    # ======================================================

    automatic_backups: Optional[bool] = None

    backup_frequency: Optional[str] = None

    backup_time: Optional[str] = None


# ============================================================
# PYDANTIC SCHEMAS
# ============================================================

class CompanyProfileUpdate(BaseModel):

    company_name: str

    company_id: str

    industry: str | None = None

    address: str | None = None

    phone: str | None = None

    email: str | None = None

    website: str | None = None


class BusinessSettingsUpdate(BaseModel):

    financial_year_start: str

    default_warehouse_id: int | None = None

    default_supplier_id: str | None = None

    default_payment_terms: str

    tax_calculation: bool

    multi_currency: bool

    tax_rate: float = Field( default=18.0, ge=0, le=100 )


class PreferencesUpdate(BaseModel):

    date_format: str

    time_format: str

    number_format: str

    measurement_unit: str

    default_dashboard: str

    items_per_page: int = Field(
        ge=1,
        le=100
    )

    currency: str

    theme: str


class SecurityUpdate(BaseModel):

    two_factor_authentication: bool

    password_complexity: bool

    password_expiry: str

    session_timeout: str

    max_login_attempts: int = Field(
        ge=1,
        le=20
    )


class NotificationUpdate(BaseModel):

    email_enabled: bool

    vendor_registration: bool

    po_updates: bool

    contract_expiration: bool

    sms_enabled: bool

    urgent_sms: bool

    browser_notifications: bool

    notification_sound: bool


class DataSettingsUpdate(BaseModel):

    data_retention_period: str

    automatic_backups: bool

    backup_frequency: str

    backup_time: str


class OtherSettingsUpdate(BaseModel):

    maintenance_mode: bool

    system_updates_enabled: bool

    beta_features_enabled: bool


class SettingsPageUpdate(BaseModel):

    organization_name: Optional[str] = None

    timezone: Optional[str] = None

    language: Optional[str] = None

    currency: Optional[str] = None

    number_format: Optional[str] = None

    date_format: Optional[str] = None

    items_per_page: Optional[int] = Field( default=None, ge=1, le=100 )

    start_of_week: Optional[str] = None

    dashboard_view: Optional[str] = None

    sound_notifications: Optional[bool] = None

    email_updates: Optional[bool] = None

    dark_mode: Optional[bool] = None

    compact_mode: Optional[bool] = None

    auto_attach_documents: Optional[bool] = None

    session_timeout: Optional[str] = None

    export_format: Optional[str] = None

    primary_color: Optional[str] = None

    sidebar_position: Optional[str] = None

    font_size: Optional[str] = None


# ======================================================
# AUDIT LOGS
# ======================================================

class AuditLogResponse(BaseModel):

    id: int

    user_id: Optional[int] = None

    user_email: Optional[str] = None

    user_name: Optional[str] = None

    role: Optional[str] = None

    action: str

    description: Optional[str] = None

    resource: Optional[str] = None

    resource_id: Optional[str] = None

    status: str

    ip_address: Optional[str] = None

    user_agent: Optional[str] = None

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# CREATE TICKET
# ==========================================================

class SupportTicketCreate(BaseModel):

    vendor_id: Optional[str] = None

    subject: str

    description: str

    category: str

    priority: str = "Medium"

    created_by: Optional[str] = None


# ==========================================================
# TICKET RESPONSE
# ==========================================================

class SupportTicketResponse(BaseModel):

    id: int

    ticket_id: str

    subject: str

    description: str

    category: str

    priority: str

    status: str

    created_by: Optional[str]

    created_on: Optional[datetime]

    updated_on: Optional[datetime]

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# SUPPORT CATEGORY RESPONSE
# ==========================================================

class SupportCategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# SUPPORT ARTICLE RESPONSE
# ==========================================================

class SupportArticleResponse(BaseModel):
    id: int
    title: str
    slug: str
    summary: Optional[str] = None
    content: str
    category: str
    icon: Optional[str] = None
    views: int
    helpful_yes: int
    helpful_no: int
    is_popular: bool

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# CALLBACK REQUEST
# ==========================================================

class SupportCallbackCreate(BaseModel):
    vendor_id: Optional[str] = None

    name: str = Field(
        ...,
        min_length=2,
        max_length=150
    )

    phone: str = Field(
        ...,
        min_length=5,
        max_length=30
    )

    preferred_date: Optional[date] = None

    preferred_time: Optional[str] = None

    notes: Optional[str] = None


class SupportCallbackResponse(BaseModel):
    id: int
    vendor_id: Optional[str]
    name: str
    phone: str
    preferred_date: Optional[date]
    preferred_time: Optional[str]
    notes: Optional[str]
    status: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# SERVICE STATUS
# ==========================================================

class SupportServiceStatusResponse(BaseModel):
    service_name: str
    status: str
    message: Optional[str] = None
    checked_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )


class SupportTicketAttachmentResponse(BaseModel):

    id: int

    ticket_id: int

    file_name: str

    stored_name: str

    file_type: Optional[str] = None

    file_size: Optional[int] = None

    uploaded_at: Optional[datetime] = None


    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# FAQ RESPONSE
# ==========================================================

class FAQResponse(BaseModel):

    id: int

    question: str

    answer: str

    category: Optional[str]

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# QUICK LINK RESPONSE
# ==========================================================

class QuickLinkResponse(BaseModel):

    id: int

    title: str

    description: Optional[str]

    icon: Optional[str]

    url: Optional[str]

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# CONTACT RESPONSE
# ==========================================================

class ContactResponse(BaseModel):

    id: int

    contact_type: str

    title: str

    value: str

    description: Optional[str]

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# CREATE FEEDBACK
# ==========================================================

class FeedbackCreate(BaseModel):

    user_id: Optional[int] = None

    rating: int = Field(
        ...,
        ge=1,
        le=5
    )

    category: str = Field(
        ...,
        min_length=1,
        max_length=100
    )

    subject: str = Field(
        ...,
        min_length=1,
        max_length=255
    )

    message: str = Field(
        ...,
        min_length=1
    )


# ==========================================================
# UPDATE FEEDBACK
# ==========================================================

class FeedbackUpdate(BaseModel):

    rating: Optional[int] = Field(
        None,
        ge=1,
        le=5
    )

    category: Optional[str] = Field(
        None,
        max_length=100
    )

    subject: Optional[str] = Field(
        None,
        max_length=255
    )

    message: Optional[str] = None

    status: Optional[str] = None

    admin_response: Optional[str] = None


# ==========================================================
# ADMIN RESPONSE
# ==========================================================

class FeedbackResponseCreate(BaseModel):

    response: str = Field(
        ...,
        min_length=1
    )


# ==========================================================
# STATUS UPDATE
# ==========================================================

class FeedbackStatusUpdate(BaseModel):

    status: str


# ==========================================================
# USER INFO
# ==========================================================

class FeedbackUserResponse(BaseModel):

    id: Optional[int] = None

    name: Optional[str] = None

    email: Optional[str] = None

    role: Optional[str] = None


# ==========================================================
# FEEDBACK RESPONSE
# ==========================================================

class FeedbackResponse(BaseModel):

    id: int

    user_id: Optional[int]

    rating: int

    category: str

    subject: str

    message: str

    status: str

    admin_response: Optional[str]

    created_at: datetime

    updated_at: Optional[datetime]

    user: Optional[FeedbackUserResponse] = None

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# STATISTICS
# ==========================================================

class FeedbackStatistics(BaseModel):

    total_feedback: int

    average_rating: float

    positive_feedback: int

    pending_feedback: int

    reviewed_feedback: int

    resolved_feedback: int

    negative_feedback: int


# ============================================================
# SYSTEM ACTIVITY SCHEMAS
# ============================================================

class ActivityBase(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=300,
    )

    activity_type: str = Field(
        ...,
        min_length=1,
        max_length=50,
    )

class ActivityCreate(ActivityBase):
    user_id: Optional[int] = None

class ActivityResponse(ActivityBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )

class ActivityListResponse(BaseModel):
    activities: List[ActivityResponse]
    total: int


# ============================================================
# DEMAND PLANNING SCHEMAS
# ============================================================

class DemandPlanItemResponse(BaseModel):

    id: int
    item_code: Optional[str] = None
    product_name: str
    category: Optional[str] = None
    demand_units: int
    planned_order_units: int
    inventory_required_units: int
    service_level_target: float

    model_config = ConfigDict(
        from_attributes=True
    )


class DemandPlanResponse(BaseModel):

    id: int
    plan_name: str
    time_horizon: str
    start_date: date
    end_date: date
    total_demand: int
    planned_orders: int
    inventory_required: int
    service_level_target: float
    created_by: Optional[str] = None
    last_updated: datetime
    status: str

    model_config = ConfigDict(
        from_attributes=True
    )


class ForecastRunResponse(BaseModel):

    id: int
    forecast_name: str
    horizon: str
    start_date: date
    accuracy: float
    status: str
    created_by: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class DemandForecastResponse(BaseModel):

    id: int
    forecast_run_id: Optional[int] = None
    item_code: Optional[str] = None
    product_name: str
    category: str
    period_start: date
    period_label: str
    forecast_units: int
    actual_units: int
    accuracy: float

    model_config = ConfigDict(
        from_attributes=True
    )


class DemandDashboardResponse(BaseModel):

    total_demand: int
    demand_change_percent: float

    forecast_accuracy: float
    accuracy_change_percent: float

    planned_orders: int
    planned_orders_change_percent: float

    planning_horizon: str

    months: List[str]
    forecast_values: List[int]
    actual_values: List[int]

    category_demand: List[dict]

    top_products: List[dict]

    category_accuracy: List[dict]

    recent_forecast_runs: List[dict]

    insights: List[dict]

    demand_plans: List[dict]


class SupplierTableCreate(BaseModel):

    vendor_name: str

    country: Optional[str] = None

    email: EmailStr

    phone: Optional[str] = None

    business_type: Optional[str] = None

    address: Optional[str] = None

    category: Optional[str] = None

    region: Optional[str] = None

    contact_person: Optional[str] = None


class SupplierBusinessCreate(BaseModel):

    legal_entity_name: Optional[str] = None

    website: Optional[str] = None

    tax_id_gst: Optional[str] = None

    industry: Optional[str] = None

    supplier_type: Optional[str] = None

    duns_number: Optional[str] = None

    year_established: Optional[int] = None

    preferred_language: Optional[str] = None

    currency: Optional[str] = None


class SupplierAddressCreate(BaseModel):

    address_type: str

    address_line1: str

    address_line2: Optional[str] = None

    city: str

    state_province: str

    postal_code: str

    country: str

    phone: Optional[str] = None

    email: Optional[EmailStr] = None

    is_primary: bool = False


class SupplierContactCreate(BaseModel):

    contact_name: str

    job_title: Optional[str] = None

    email: Optional[EmailStr] = None

    phone: Optional[str] = None

    contact_type: Optional[str] = None

    is_primary: bool = False


class SupplierBankCreate(BaseModel):

    bank_name: str

    account_name: Optional[str] = None

    account_last_four: Optional[str] = None

    ifsc_swift: Optional[str] = None

    branch_name: Optional[str] = None

    currency: Optional[str] = None

    is_primary: bool = False


class SupplierCreate(BaseModel):

    supplier_name: str = Field( ..., min_length=2, max_length=150 )

    country: str

    email: EmailStr

    phone: str

    business_type: Optional[str] = None

    category: Optional[str] = None

    contact_person: Optional[str] = None

    business: SupplierBusinessCreate

    registered_address: SupplierAddressCreate

    communication_address: Optional[ SupplierAddressCreate ] = None

    contacts: List[ SupplierContactCreate ] = []

    bank_accounts: List[ SupplierBankCreate ] = []


# ============================================================
# INVENTORY ITEM
# ============================================================

class InventoryItemBase(BaseModel):

    item_code: str = Field(
        ...,
        min_length=1,
        max_length=50
    )

    item_name: str = Field(
        ...,
        min_length=1,
        max_length=200
    )

    category: Optional[str] = None

    quantity: int = Field(
        default=0,
        ge=0
    )

    minimum_stock: int = Field(
        default=0,
        ge=0
    )

    maximum_stock: int = Field(
        default=0,
        ge=0
    )

    reorder_point: int = Field(
        default=0,
        ge=0
    )

    unit_price: float = Field(
        default=0,
        ge=0
    )

    warehouse: Optional[str] = None

    status: str = "Available"


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):

    item_name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = Field(
        default=None,
        ge=0
    )
    minimum_stock: Optional[int] = Field(
        default=None,
        ge=0
    )
    maximum_stock: Optional[int] = Field(
        default=None,
        ge=0
    )
    reorder_point: Optional[int] = Field(
        default=None,
        ge=0
    )
    unit_price: Optional[float] = Field(
        default=None,
        ge=0
    )
    warehouse: Optional[str] = None
    status: Optional[str] = None


class InventoryItemResponse(InventoryItemBase):

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# WAREHOUSE
# ============================================================

class WarehouseCreate(BaseModel):

    warehouse_code: str
    warehouse_name: str
    location: Optional[str] = None
    manager_name: Optional[str] = None
    status: str = "Active"


class WarehouseResponse(WarehouseCreate):

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# INVENTORY MOVEMENT
# ============================================================

class InventoryMovementCreate(BaseModel):

    item_id: int
    warehouse_id: Optional[int] = None

    movement_type: str

    quantity: int = Field(
        ...,
        gt=0
    )

    movement_date: Optional[datetime] = None

    reference_number: Optional[str] = None

    notes: Optional[str] = None


class InventoryMovementResponse( InventoryMovementCreate ):

    id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class CustomerBase(BaseModel):

    customer_code: str
    customer_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"


class CustomerCreate(CustomerBase):
    pass


class CustomerResponse(CustomerBase):

    id: int

    model_config = ConfigDict(
        from_attributes=True
    )


class CustomerOrderBase(BaseModel):

    order_number: str

    customer_id: int

    order_date: date

    status: str = "Pending"

    amount: float = 0

    expected_delivery: Optional[date] = None

    actual_delivery: Optional[date] = None

    priority: str = "Normal"


class CustomerOrderCreate(CustomerOrderBase):
    pass


class CustomerOrderResponse(CustomerOrderBase):

    id: int

    customer_name: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True
    )


class ShipmentDashboardResponse(BaseModel):

    shipment_number: str

    order_number: Optional[str] = None

    carrier: Optional[str] = None

    status: str

    current_location: Optional[str] = None

    origin: Optional[str] = None

    destination: Optional[str] = None

    expected_delivery: Optional[date] = None

    tracking_number: Optional[str] = None

    current_latitude: Optional[float] = None

    current_longitude: Optional[float] = None

    origin_latitude: Optional[float] = None

    origin_longitude: Optional[float] = None

    destination_latitude: Optional[float] = None

    destination_longitude: Optional[float] = None


class ShipmentItemCreate(BaseModel):
    inventory_item_id: Optional[int] = None
    purchase_order_item_id: Optional[int] = None

    item_code: str
    item_description: str

    quantity: Decimal = Decimal("1")
    uom: str = "PCS"

    total_weight: Decimal = Decimal("0")
    weight_unit: str = "kg"

    total_volume: Decimal = Decimal("0")
    volume_unit: str = "m3"


class ShipmentDetailsCreate(BaseModel):

    requested_delivery: Optional[date] = None
    promised_delivery: Optional[date] = None
    earliest_pickup: Optional[date] = None
    latest_delivery: Optional[date] = None

    pickup_time_window: Optional[str] = None
    delivery_time_window: Optional[str] = None
    timezone: Optional[str] = None

    origin_contact_person: Optional[str] = None
    origin_phone: Optional[str] = None
    origin_address: Optional[str] = None

    destination_contact_person: Optional[str] = None
    destination_phone: Optional[str] = None
    destination_address: Optional[str] = None

    special_instructions: Optional[str] = None
    internal_notes: Optional[str] = None


class ShipmentCreate(BaseModel):

    po_id: int

    shipment_date: date

    shipment_type: str = "Outbound"
    priority: str = "Normal"

    reference_number: Optional[str] = None
    related_document: Optional[str] = None
    incoterms: Optional[str] = None
    payment_terms: Optional[str] = None

    status: str = "Pending"

    origin: Optional[str] = None
    destination: Optional[str] = None

    carrier_id: Optional[int] = None

    order_id: Optional[int] = None

    details: Optional[ShipmentDetailsCreate] = None

    items: list[ShipmentItemCreate] = []


class DashboardKPI(BaseModel):

    total_orders: int
    delivered_orders: int
    pending_orders: int
    cancelled_orders: int

    total_shipments: int
    in_transit_shipments: int
    delivered_shipments: int
    delayed_shipments: int


class OrderTrendResponse(BaseModel):

    labels: List[str]

    total_orders: List[int]

    delivered_orders: List[int]

    cancelled_orders: List[int]


class StatusCount(BaseModel):

    status: str

    count: int


class OrdersShipmentsDashboardResponse(BaseModel):

    kpis: DashboardKPI

    order_trend: OrderTrendResponse

    orders_by_status: List[StatusCount]

    shipments_by_status: List[StatusCount]

    recent_orders: List[CustomerOrderResponse]

    recent_shipments: List[ShipmentDashboardResponse]

    in_transit_shipments: List[ShipmentDashboardResponse]

    unread_notifications: int


class AnalyticsSummary(BaseModel):
    total_revenue: float = 0
    total_orders: int = 0
    total_shipments: int = 0
    total_cost: float = 0
    inventory_turnover: float = 0

    revenue_change: float = 0
    orders_change: float = 0
    shipments_change: float = 0
    cost_change: float = 0
    turnover_change: float = 0


class AnalyticsTrend(BaseModel):
    labels: List[str] = []
    revenue: List[float] = []
    cost: List[float] = []
    profit: List[float] = []


class CostBreakdownItem(BaseModel):
    category: str
    amount: float
    percentage: float


class ServiceLevelData(BaseModel):
    current: float = 0
    labels: List[str] = []
    values: List[float] = []


class PerformanceMetric(BaseModel):
    metric: str
    performance: float
    target: float
    status: str


class SupplierPerformance(BaseModel):
    supplier: str
    on_time_delivery: float
    quality_score: float
    total_orders: int


class DemandSupplyPoint(BaseModel):
    label: str
    demand: float
    supply: float
    gap: float


class InventoryCategory(BaseModel):
    category: str
    inventory_value: float
    percentage: float
    turnover_rate: float


class InventoryAnalysis(BaseModel):
    average_inventory_value: float
    stockout_value: float
    slow_moving_items: int
    excess_inventory: float
    categories: List[InventoryCategory]


class ReportItem(BaseModel):
    id: int
    report_name: str
    category: str
    generated_by: Optional[str] = None
    generated_at: Optional[str] = None
    format: str
    file_path: Optional[str] = None


class InsightItem(BaseModel):
    title: str
    description: str
    severity: str
    action: Optional[str] = None


class AnalyticsDashboardResponse(BaseModel):

    summary: AnalyticsSummary

    trend: AnalyticsTrend

    cost_breakdown: List[CostBreakdownItem]

    service_level: ServiceLevelData

    performance: List[PerformanceMetric]

    suppliers: List[SupplierPerformance]

    demand_supply: List[DemandSupplyPoint]

    inventory: InventoryAnalysis

    reports: List[ReportItem]

    insights: List[InsightItem]


# ============================================================
# PROCUREMENT ANALYTICS RESPONSE SCHEMAS
# ============================================================

class ProcurementAnalyticsKPI(BaseModel):
    total_spend: float = 0
    total_pos: int = 0
    avg_po_value: float = 0
    savings_ytd: float = 0
    on_time_delivery: float = 0
    supplier_performance: float = 0

    spend_change: float = 0
    po_change: float = 0
    avg_po_change: float = 0
    savings_change: float = 0
    delivery_change: float = 0
    supplier_change: float = 0


class ProcurementTrendResponse(BaseModel):
    labels: List[str] = []
    actual: List[float] = []
    budget: List[float] = []


class ProcurementCategoryResponse(BaseModel):
    category: str
    amount: float
    percentage: float


class ProcurementDepartmentResponse(BaseModel):
    department: str
    amount: float
    percentage: float


class ProcurementVendorResponse(BaseModel):
    vendor_id: str
    vendor_name: str
    amount: float
    percentage: float
    score: float


class PurchaseOrderStatusResponse(BaseModel):
    status: str
    count: int
    percentage: float


class InvoiceAgingResponse(BaseModel):
    zero_30: float = 0
    thirty_one_60: float = 0
    sixty_one_90: float = 0
    ninety_plus: float = 0


class SupplierRatingResponse(BaseModel):
    rating: int
    count: int
    percentage: float


class DeliveryTrendResponse(BaseModel):
    labels: List[str] = []
    values: List[float] = []


class SavingsTrendResponse(BaseModel):
    labels: List[str] = []
    values: List[float] = []


class ProcurementAnalyticsDashboardResponse(BaseModel):
    kpis: ProcurementAnalyticsKPI

    spend_trend: ProcurementTrendResponse

    spend_by_category: List[ProcurementCategoryResponse]

    spend_by_department: List[ProcurementDepartmentResponse]

    top_vendors: List[ProcurementVendorResponse]

    po_status: List[PurchaseOrderStatusResponse]

    invoice_aging: InvoiceAgingResponse

    delivery_trend: DeliveryTrendResponse

    supplier_distribution: List[SupplierRatingResponse]

    savings_trend: SavingsTrendResponse


# ============================================================
# ALERT SCHEMAS
# ============================================================

class AlertRuleBase(BaseModel):

    rule_name: str
    category: str
    condition: str
    priority: str = "Medium"
    status: str = "Active"
    description: Optional[str] = None


class AlertRuleCreate(AlertRuleBase):
    pass


class AlertRuleResponse(AlertRuleBase):

    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class AlertBase(BaseModel):

    title: str
    message: Optional[str] = None

    category: str
    source: Optional[str] = None
    reference_id: Optional[str] = None

    priority: str = "Medium"
    status: str = "New"

    rule_id: Optional[int] = None


class AlertCreate(AlertBase):
    pass


class AlertResponse(AlertBase):

    id: int

    created_at: datetime

    resolved_at: Optional[datetime] = None
    snoozed_until: Optional[datetime] = None

    resolved_by: Optional[int] = None
    assigned_to: Optional[int] = None

    model_config = ConfigDict(
        from_attributes=True
    )


class AlertDashboardSummary(BaseModel):

    critical_alerts: int = 0
    high_priority: int = 0
    informational: int = 0
    resolved_today: int = 0
    snoozed_alerts: int = 0


class AlertCategoryCount(BaseModel):

    category: str
    count: int


class AlertDashboardResponse(BaseModel):

    summary: AlertDashboardSummary

    alerts: List[AlertResponse]

    categories: List[AlertCategoryCount]

    recent_activity: List[dict]

    alert_rules: List[AlertRuleResponse]

    notification_preferences: NotificationSettingsResponse


# ============================================================
# DOCUMENT SCHEMAS
# ============================================================

class DocumentResponse(BaseModel):

    id: int

    document_name: str

    category: str

    document_type: Optional[str] = None

    subcategory: Optional[str] = None

    related_type: Optional[str] = None

    related_id: Optional[str] = None

    vendor_id: Optional[str] = None

    business_unit: Optional[str] = None

    tags: Optional[str] = None

    confidentiality_level: Optional[str] = "Internal"

    retention_period: Optional[str] = None

    document_date: Optional[date] = None

    folder_id: Optional[int] = None

    uploaded_by: Optional[int] = None

    uploaded_by_name: Optional[str] = None

    uploaded_on: datetime

    file_path: str

    file_type: Optional[str] = None

    mime_type: Optional[str] = None

    file_size: int

    status: str

    expiry_date: Optional[date] = None

    description: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True
    )


class DocumentFolderResponse(BaseModel):

    id: int

    folder_name: str

    category: Optional[str] = None

    document_count: int = 0

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class DocumentApprovalResponse(BaseModel):

    id: int

    document_id: int

    document_name: str

    reviewer_id: Optional[int] = None

    reviewer_name: Optional[str] = None

    status: str

    comments: Optional[str] = None

    requested_at: datetime

    reviewed_at: Optional[datetime] = None


class DocumentActivityResponse(BaseModel):

    id: int

    document_id: Optional[int] = None

    user_id: Optional[int] = None

    user_name: Optional[str] = None

    action: str

    message: str

    created_at: datetime


class DocumentDashboardResponse(BaseModel):

    total_documents: int

    total_folders: int

    recently_added: int

    pending_approvals: int

    expiring_soon: int

    storage_used: int

    storage_limit: int

    storage_available: int

    categories: List[dict]

    documents: List[DocumentResponse]

    recent_activity: List[DocumentActivityResponse]

    pending_documents: List[DocumentApprovalResponse]

    expiring_documents: List[DocumentResponse]


class ProfileUpdate(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=100
    )

    email: EmailStr

    alternate_email: Optional[EmailStr] = None

    mobile: Optional[str] = None

    gender: Optional[str] = None

    date_of_birth: Optional[date] = None

    nationality: Optional[str] = None

    department: Optional[str] = None

    job_title: Optional[str] = None

    location: Optional[str] = None

    reporting_manager_id: Optional[int] = None

    date_of_joining: Optional[date] = None

    address: Optional[str] = None

    about_me: Optional[str] = None

    languages: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True
    )


class EmergencyContactUpdate(BaseModel):

    name: str = Field(
        ...,
        min_length=2,
        max_length=150
    )

    relationship_type: Optional[str] = None

    phone: Optional[str] = None

    email: Optional[EmailStr] = None

    address: Optional[str] = None


class SkillItem(BaseModel):

    skill_name: str = Field(
        ...,
        min_length=1,
        max_length=150
    )

    proficiency: float = Field(
        0,
        ge=0,
        le=100
    )


class SkillsUpdate(BaseModel):

    skills: List[SkillItem]


class PasswordChangeRequest(BaseModel):

    current_password: str

    new_password: str

    confirm_password: str


class TwoFactorUpdate(BaseModel):

    enabled: bool


class LoginNotificationUpdate(BaseModel):

    enabled: bool


class ProfilePreferencesUpdate(BaseModel):

    language: Optional[str] = "English (US)"

    timezone: Optional[str] = "(UTC+05:30) Asia/Kolkata"

    date_format: Optional[str] = "MM/DD/YYYY"

    time_format: Optional[str] = "12 Hour (AM/PM)"

    currency: Optional[str] = "USD - US Dollar"

    theme: Optional[str] = "Light"


# ==========================================================
# PAYMENT CREATE
# ==========================================================

class PaymentCreate(BaseModel):

    invoice_id: int

    payment_reference: str

    payment_date: date

    amount: float

    payment_method: Optional[str] = None

    status: str = "Completed"

    transaction_id: Optional[str] = None

    notes: Optional[str] = None


# ==========================================================
# PAYMENT UPDATE
# ==========================================================

class PaymentUpdate(BaseModel):

    payment_date: Optional[date] = None

    amount: Optional[float] = None

    payment_method: Optional[str] = None

    status: Optional[str] = None

    transaction_id: Optional[str] = None

    notes: Optional[str] = None


# ==========================================================
# PAYMENT RESPONSE
# ==========================================================

class PaymentResponse(BaseModel):

    id: int

    invoice_id: int

    payment_reference: str

    payment_date: date

    amount: float

    payment_method: Optional[str]

    status: str

    transaction_id: Optional[str]

    notes: Optional[str]

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# KPI
# ==========================================================


# ============================================================
# FINANCE DASHBOARD RESPONSE SCHEMAS
# ============================================================

class FinanceOfficerKPIResponse(BaseModel):

    total_budget: float = 0

    total_expenses: float = 0

    total_revenue: float = 0

    budget_utilization: float = 0

    pending_approvals: int = 0


# ==========================================================
# BUDGET UTILIZATION
# ==========================================================

class BudgetUtilizationResponse(BaseModel):

    percentage: float = 0.0

    used: float = 0.0

    budget: float = 0.0


class BudgetCreateRequest(BaseModel):
    department: str = Field(..., min_length=1, max_length=100)
    budget: float = Field(..., ge=0)
    allocated: float = Field(0, ge=0)
    year: int = Field(..., ge=2000, le=2100)
    status: str = "Active"


class BudgetAllocateRequest(BaseModel):
    budget_id: int
    amount: float = Field(..., gt=0)


class BudgetTransferRequest(BaseModel):
    from_budget_id: int
    to_budget_id: int
    amount: float = Field(..., gt=0)


class BudgetUpdateRequest(BaseModel):
    budget: Optional[float] = Field(None, ge=0)
    allocated: Optional[float] = Field(None, ge=0)
    actual: Optional[float] = Field(None, ge=0)
    status: Optional[str] = None


class BudgetDepartmentResponse(BaseModel):
    id: int
    department: str
    budget: float = 0
    allocated: float = 0
    actual: float = 0
    remaining: float = 0
    utilization: float = 0
    status: str = "On Track"


class BudgetActivityResponse(BaseModel):
    id: int
    title: str = ""
    description: str = ""
    amount: float = 0
    date: Optional[str] = None
    action: str = ""
    status: str = "Success"


class BudgetManagementResponse(BaseModel):
    year: int

    kpis: Dict[str, Any] = Field(default_factory=dict)

    summary: Dict[str, Any] = Field(default_factory=dict)

    departments: List[BudgetDepartmentResponse] = Field(
        default_factory=list
    )

    activities: List[BudgetActivityResponse] = Field(
        default_factory=list
    )


# ==========================================================
# EXPENSE TREND
# ==========================================================

class ExpenseTrendResponse(BaseModel):

    months: List[str] = Field(default_factory=list)

    actual: List[float] = Field(default_factory=list)

    budget: List[float] = Field(default_factory=list)


# ==========================================================
# EXPENSE CATEGORY
# ==========================================================

class FinanceOfficerExpenseCategoryResponse(BaseModel):

    category: str = "Others"

    amount: float = 0.0


# ==========================================================
# PAYMENT STATUS
# ==========================================================

class PaymentStatusResponse(BaseModel):

    status: str = ""

    amount: float = 0.0


# ==========================================================
# CASH FLOW
# ==========================================================

class FinanceOfficerCashFlowResponse(BaseModel):

    months: List[str] = Field( default_factory=list )

    revenue: List[float] = Field( default_factory=list )

    expenditure: List[float] = Field( default_factory=list )

    net_cash_flow: List[float] = Field( default_factory=list )

    # Compatibility fields
    inflow: List[float] = Field( default_factory=list )

    outflow: List[float] = Field( default_factory=list )

    net: List[float] = Field( default_factory=list )


# ==========================================================
# AP AGING
# ==========================================================

class APAgingResponse(BaseModel):

    zero_30: float = 0.0

    thirty_one_60: float = 0.0

    sixty_one_90: float = 0.0

    ninety_plus: float = 0.0


# ==========================================================
# RECENT PAYMENT
# ==========================================================

class RecentPaymentResponse(BaseModel):

    invoice_no: str = ""

    vendor: str = ""

    amount: float = 0.0

    payment_date: str = ""

    status: str = ""


# ==========================================================
# DEPARTMENT BUDGET
# ==========================================================

class DepartmentBudgetResponse(BaseModel):

    department: str = ""

    budget: float = 0.0

    actual: float = 0.0

    utilization: float = 0.0

    variance: float = 0.0


# ==========================================================
# ALERT
# ==========================================================

class FinanceOfficerAlertResponse(BaseModel):

    id: Optional[int] = None

    title: str = ""

    description: str = ""

    severity: str = "info"

    time: str = ""


# ==========================================================
# OBLIGATION
# ==========================================================

class FinanceObligationResponse(BaseModel):

    type: str = ""

    reference: str = ""

    amount: float = 0.0

    due_date: str = ""


# ==========================================================
# RATIOS
# ==========================================================

class FinanceRatioResponse(BaseModel):

    gross_margin: float = 0.0

    operating_margin: float = 0.0

    expense_ratio: float = 0.0

    current_ratio: float = 0.0

    quick_ratio: float = 0.0

    return_on_assets: float = 0.0


# ==========================================================
# COMPLETE DASHBOARD RESPONSE
# ==========================================================

class FinanceOfficerDashboardResponse(BaseModel):

    kpis: FinanceOfficerKPIResponse = Field( default_factory=FinanceOfficerKPIResponse )

    budget_utilization: float = 0.0

    cash_flow: FinanceOfficerCashFlowResponse = Field( default_factory=FinanceOfficerCashFlowResponse )

    expense_categories: List[ FinanceOfficerExpenseCategoryResponse ] = Field( default_factory=list )

    budget_vs_actual: List[ FinanceOfficerBudgetActualResponse ] = Field( default_factory=list )

    recent_transactions: List[ FinanceOfficerTransactionResponse ] = Field( default_factory=list )

    alerts: List[ FinanceOfficerAlertResponse ] = Field( default_factory=list )

    expense_trend: List[ Dict[str, Any] ] = Field( default_factory=list )

    payment_status: List[ Dict[str, Any] ] = Field( default_factory=list )

    ap_aging: List[ Dict[str, Any] ] = Field( default_factory=list )

    recent_payments: List[ Dict[str, Any] ] = Field( default_factory=list )

    budget_departments: List[ Dict[str, Any] ] = Field( default_factory=list )

    obligations: List[ Dict[str, Any] ] = Field( default_factory=list )

    ratios: Dict[str, Any] = Field( default_factory=dict )


class FinanceOfficerBudgetActualResponse(BaseModel):

    department: str = ""

    budget: float = 0

    actual: float = 0


class FinanceOfficerTransactionResponse(BaseModel):

    id: int

    title: str = ""

    category: str = "General"

    transaction_type: str = ""

    display_type: str = "expense"

    amount: float = 0.0

    status: Optional[str] = None

    date: Optional[str] = None


class ExpenditureCreate(BaseModel):
    transaction_date: date
    category: str = Field(..., min_length=1, max_length=100)
    department: str | None = Field(
        default=None,
        max_length=100
    )
    amount: float = Field(..., gt=0)
    status: str = "Pending"


class ExpenditureUpdateStatus(BaseModel):
    status: str


class ExpenditureRecentResponse(BaseModel):
    id: int
    title: str
    category: str
    department: str | None
    amount: float
    status: str | None
    date: str | None


class ExpenditureOverviewResponse(BaseModel):
    category: str
    budget: float
    actual: float
    variance: float
    variance_percent: float
    status: str


class ExpenditureDashboardResponse(BaseModel):
    total_expenditure: float
    this_month: float
    average_monthly_expense: float
    total_transactions: int
    budget_utilization: float

    trend_months: List[str]
    this_year_trend: List[float]
    last_year_trend: List[float]

    categories: List[dict]

    overview: List[ExpenditureOverviewResponse]

    recent_expenditures: List[
        ExpenditureRecentResponse
    ]

    pending_approvals: int


class FinanceRevenueDashboardResponse(BaseModel):
    year: int
    month: int

    kpis: dict

    trend: dict

    sources: list

    departments: list

    overview: list

    recent_transactions: list

    insights: list


# ============================================================
# ACCOUNTS PAYABLE DASHBOARD
# ============================================================

class APKPIResponse(BaseModel):
    total_payable: float
    overdue_amount: float
    due_within_7_days: float
    paid_this_month: float
    pending_bills: int


class APAgingDetailResponse(BaseModel):
    label: str
    amount: float
    percentage: float


class APVendorResponse(BaseModel):
    rank: int
    vendor: str
    amount: float
    percentage: float


class APRecentBillResponse(BaseModel):
    id: int
    invoice_no: str
    vendor: str
    bill_date: Optional[str] = None
    due_date: Optional[str] = None
    amount: float
    status: str


class APPaymentSummaryResponse(BaseModel):
    total_payments_made: float
    total_bills_paid: int
    average_payment_days: float
    early_payments: float
    discounts_taken: float


class APTrendResponse(BaseModel):
    months: List[str]
    total_payable: List[float]
    paid_amount: List[float]


class AccountsPayableDashboardResponse(BaseModel):
    kpis: APKPIResponse
    aging: List[APAgingDetailResponse]
    top_vendors: List[APVendorResponse]
    trend: APTrendResponse
    recent_bills: List[APRecentBillResponse]
    payment_summary: APPaymentSummaryResponse

    pagination: dict

    overdue_count: int
    overdue_amount: float


# ============================================================
# ACCOUNTS RECEIVABLE SCHEMAS
# ============================================================

class ARInvoiceCreate(BaseModel):
    invoice_number: str = Field(
        ...,
        min_length=1,
        max_length=50
    )

    customer_id: int

    amount: float = Field(
        ...,
        ge=0
    )

    invoice_date: date

    due_date: date

    status: str = "Pending"

    vendor_id: Optional[str] = None

    po_id: Optional[int] = None


class ARPaymentCreate(BaseModel):
    invoice_id: int

    payment_reference: str = Field(
        ...,
        min_length=1,
        max_length=100
    )

    payment_date: date

    amount: float = Field(
        ...,
        gt=0
    )

    payment_method: Optional[str] = None

    status: str = "Completed"

    transaction_id: Optional[str] = None

    notes: Optional[str] = None


# ============================================================
# ACCOUNTS PAYABLE CREATE / PAYMENT REQUEST SCHEMAS
# ============================================================

class APBillCreate(BaseModel):
    invoice_no: str = Field(
        ...,
        min_length=1,
        max_length=50
    )

    vendor: str = Field(
        ...,
        min_length=1,
        max_length=150
    )

    amount: float = Field(
        ...,
        gt=0
    )

    bill_date: date

    due_date: date

    payment_status: str = "Pending"


class APPaymentCreate(BaseModel):
    invoice_no: str = Field(
        ...,
        min_length=1,
        max_length=50
    )

    vendor: str = Field(
        ...,
        min_length=1,
        max_length=150
    )

    amount: float = Field(
        ...,
        gt=0
    )

    payment_date: date

    status: str = "Completed"

    early_payment: bool = False

    discount_amount: float = Field(
        default=0,
        ge=0
    )


# ============================================================
# BANKING DASHBOARD SCHEMAS
# ============================================================

class BankAccountDashboardResponse(BaseModel):

    id: int
    account_name: str
    account_number: str
    bank_name: str
    account_type: str
    balance: float
    reconciled_balance: float
    status: str


class ReconciliationDashboardResponse(BaseModel):

    id: int
    account: str
    statement_date: Optional[str] = None
    reconciled_on: Optional[str] = None
    status: str
    difference: float


class BankingDashboardResponse(BaseModel):

    kpis: Dict[str, Any] = Field(
        default_factory=dict
    )

    cash_flow: Dict[str, Any] = Field(
        default_factory=dict
    )

    reconciliation_status: Dict[str, Any] = Field(
        default_factory=dict
    )

    reconciliation_overview: Dict[str, Any] = Field(
        default_factory=dict
    )

    bank_accounts: List[
        Dict[str, Any]
    ] = Field(
        default_factory=list
    )

    recent_reconciliations: List[
        Dict[str, Any]
    ] = Field(
        default_factory=list
    )

    reconciliation_summary: Dict[
        str, Any
    ] = Field(
        default_factory=dict
    )


class FinancialReportPageResponse(BaseModel):

    success: bool

    kpis: dict

    trend: dict

    categories: list

    recent_reports: list

    pagination: dict

    data_sources: list


class FinanceApprovalDashboardResponse(BaseModel):

    profile: dict

    kpis: dict

    approval_summary: dict

    requests_by_type: List[dict]

    approval_status: List[dict]

    pending_approvals: dict

    recent_activity: List[dict]


# ============================================================
# APPROVAL DELEGATION SCHEMAS
# ============================================================

class ApprovalDelegationCreate(BaseModel):
    """
    Request body for creating an approval delegation.
    """

    delegate_user_id: int = Field(
        ...,
        gt=0
    )

    approval_type: str = Field(
        default="All Approvals",
        min_length=1,
        max_length=100
    )

    start_date: date

    end_date: date

    @field_validator("end_date")
    @classmethod
    def validate_end_date(
        cls,
        value,
        info
    ):
        start_date = info.data.get("start_date")

        if start_date and value < start_date:
            raise ValueError(
                "End date cannot be earlier than start date."
            )

        return value


# ============================================================
# FINANCE NOTIFICATION PREFERENCES SCHEMAS
# ============================================================

class FinanceNotificationPreferenceBase(BaseModel):
    budget_alerts: bool = True
    payment_alerts: bool = True
    approval_alerts: bool = True
    compliance_alerts: bool = True
    system_notifications: bool = True
    email_notifications: bool = True
    sms_notifications: bool = False


class FinanceNotificationPreferenceUpdate(
    FinanceNotificationPreferenceBase
):
    pass


class FinanceNotificationPreferenceResponse(
    FinanceNotificationPreferenceBase
):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# SYSTEM ANNOUNCEMENT SCHEMAS
# ============================================================

class SystemAnnouncementResponse(BaseModel):
    id: int
    title: str
    message: str
    category: str
    priority: str
    published_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# AUDIT ASSIGNMENT SCHEMAS
# ============================================================

class AuditAssignmentCreate(BaseModel):
    """
    Creates a new Audit + AuditAssignment.

    If audit_id is supplied, the existing audit will be assigned.
    If audit_id is omitted, a new audit will be created.
    """

    audit_id: Optional[int] = None

    title: Optional[str] = None
    audit_type: Optional[str] = None
    entity_name: Optional[str] = None
    entity_type: Optional[str] = None
    description: Optional[str] = None

    scheduled_date: Optional[datetime] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    auditor_id: int

    assigned_date: Optional[date] = None
    due_date: Optional[date] = None

    priority: str = "Medium"
    status: str = "Not Started"
    progress: float = 0

    risk_level: str = "Medium"
    compliance_score: float = 0


class AuditAssignmentUpdate(BaseModel):
    auditor_id: Optional[int] = None
    due_date: Optional[date] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[float] = None


class AuditAssignmentResponse(BaseModel):
    id: int

    audit_id: int
    audit_number: str
    audit_title: str
    audit_type: str

    entity_name: Optional[str] = None
    entity_type: Optional[str] = None

    auditor_id: int
    auditor_name: Optional[str] = None
    auditor_email: Optional[str] = None

    department: Optional[str] = None

    assigned_date: Optional[date] = None
    due_date: Optional[date] = None

    priority: str
    status: str
    progress: float

    scheduled_date: Optional[datetime] = None

    risk_level: Optional[str] = None
    compliance_score: Optional[float] = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# PLANNING & RISK SCHEMAS
# ============================================================

class AuditPlanCreate(BaseModel):

    title: str = Field(
        ...,
        min_length=2,
        max_length=255
    )

    audit_type: str = Field(
        ...,
        min_length=2,
        max_length=100
    )

    entity_name: Optional[str] = Field(
        default=None,
        max_length=255
    )

    entity_type: Optional[str] = Field(
        default=None,
        max_length=100
    )

    description: Optional[str] = None

    scheduled_date: Optional[datetime] = None

    start_date: Optional[date] = None

    end_date: Optional[date] = None

    status: str = "Not Started"

    progress: float = Field(
        default=0,
        ge=0,
        le=100
    )

    risk_level: str = "Medium"

    compliance_score: float = Field(
        default=0,
        ge=0,
        le=100
    )


class AuditPlanResponse(BaseModel):

    id: int
    audit_number: str
    title: str
    audit_type: str

    entity_name: Optional[str] = None
    entity_type: Optional[str] = None
    description: Optional[str] = None

    scheduled_date: Optional[datetime] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    status: str
    progress: float
    risk_level: str
    compliance_score: float

    created_by: Optional[int] = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class AuditRiskCreate(BaseModel):

    audit_id: Optional[int] = None

    risk_title: str = Field(
        ...,
        min_length=2,
        max_length=255
    )

    category: str = Field(
        default="Operational",
        max_length=100
    )

    description: Optional[str] = None

    impact: str = "Medium"

    likelihood: str = "Medium"

    status: str = "Open"

    treatment: str = "Pending Decision"

    owner_id: Optional[int] = None

    due_date: Optional[date] = None


class AuditRiskUpdate(BaseModel):

    risk_title: Optional[str] = None

    category: Optional[str] = None

    description: Optional[str] = None

    impact: Optional[str] = None

    likelihood: Optional[str] = None

    status: Optional[str] = None

    treatment: Optional[str] = None

    owner_id: Optional[int] = None

    due_date: Optional[date] = None


class AuditRiskResponse(BaseModel):

    id: int
    audit_id: Optional[int] = None

    risk_title: str
    category: str

    description: Optional[str] = None

    impact: str
    likelihood: str
    risk_score: int

    status: str
    treatment: str

    owner_id: Optional[int] = None
    due_date: Optional[date] = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class AuditFindingCreate(BaseModel):
    audit_id: int
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    category: str = "Operational"
    severity: str = "Medium"
    status: str = "Open"
    identified_date: Optional[date] = None
    due_date: Optional[date] = None
    assigned_to: Optional[int] = None


class AuditFindingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[date] = None
    resolved_date: Optional[date] = None
    assigned_to: Optional[int] = None


class AuditFindingResponse(BaseModel):
    id: int
    audit_id: int
    title: str
    description: Optional[str] = None
    category: str
    severity: str
    status: str
    identified_date: Optional[date] = None
    due_date: Optional[date] = None
    resolved_date: Optional[date] = None
    assigned_to: Optional[int] = None

    model_config = ConfigDict(
        from_attributes=True
    )


class AuditorComplianceDashboardResponse(BaseModel):
    success: bool
    user: Optional[dict] = None
    kpis: dict
    status_overview: dict
    frameworks: list
    trend: list
    requirements: dict
    upcoming_reviews: list
    gaps: list
    activities: list


# ============================================================
# AUDIT RECOMMENDATION SCHEMAS
# ============================================================

class AuditRecommendationCreate(BaseModel):

    audit_id: int

    title: str = Field(
        ...,
        min_length=3,
        max_length=255
    )

    description: Optional[str] = None

    category: str = "Operational"

    priority: str = "Medium"

    status: str = "Pending"

    assigned_to: Optional[int] = None

    due_date: Optional[date] = None

    impact: str = "Medium"

    risk_reduction: float = Field(
        default=0,
        ge=0,
        le=100
    )

    control_improvement: float = Field(
        default=0,
        ge=0,
        le=100
    )

    cost_savings: float = Field(
        default=0,
        ge=0
    )


class AuditRecommendationUpdate(BaseModel):

    title: Optional[str] = None

    description: Optional[str] = None

    category: Optional[str] = None

    priority: Optional[str] = None

    status: Optional[str] = None

    assigned_to: Optional[int] = None

    due_date: Optional[date] = None

    implemented_date: Optional[date] = None

    impact: Optional[str] = None

    risk_reduction: Optional[float] = Field(
        default=None,
        ge=0,
        le=100
    )

    control_improvement: Optional[float] = Field(
        default=None,
        ge=0,
        le=100
    )

    cost_savings: Optional[float] = Field(
        default=None,
        ge=0
    )


class AuditRecommendationResponse(BaseModel):

    id: int

    recommendation_id: str

    audit_id: int

    audit_number: Optional[str] = None

    audit_title: Optional[str] = None

    title: str

    description: Optional[str] = None

    category: str

    priority: str

    status: str

    assigned_to: Optional[int] = None

    assigned_to_name: Optional[str] = None

    due_date: Optional[date] = None

    implemented_date: Optional[date] = None

    impact: str

    risk_reduction: float

    control_improvement: float

    cost_savings: float

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class AuditorAnalyticsDashboardResponse(BaseModel):
    success: bool
    user: dict
    filters: dict
    kpis: dict

    audit_activity: list
    issues_trend: list
    compliance_trend: list

    findings_by_category: list
    top_areas: list
    status_distribution: list

    recent_performance: list
    insights: list


# ============================================================
# CALENDAR EVENT SCHEMAS
# ============================================================

class CalendarEventCreate(BaseModel):

    title: str = Field(
        ...,
        min_length=2,
        max_length=255
    )

    description: Optional[str] = None

    event_type: str = Field(
        default="Other",
        max_length=50
    )

    start_datetime: datetime

    end_datetime: Optional[datetime] = None

    all_day: bool = False

    location: Optional[str] = None

    status: str = "Scheduled"

    audit_id: Optional[int] = None

    assignment_id: Optional[int] = None


class CalendarEventUpdate(BaseModel):

    title: Optional[str] = None

    description: Optional[str] = None

    event_type: Optional[str] = None

    start_datetime: Optional[datetime] = None

    end_datetime: Optional[datetime] = None

    all_day: Optional[bool] = None

    location: Optional[str] = None

    status: Optional[str] = None

    audit_id: Optional[int] = None

    assignment_id: Optional[int] = None


class CalendarEventResponse(BaseModel):

    id: int

    title: str

    description: Optional[str] = None

    event_type: str

    start_datetime: datetime

    end_datetime: Optional[datetime] = None

    all_day: bool

    location: Optional[str] = None

    status: str

    audit_id: Optional[int] = None

    assignment_id: Optional[int] = None

    created_by: Optional[int] = None

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# AUDITOR NOTIFICATION SCHEMAS
# ============================================================

class AuditorNotificationPreferenceBase(BaseModel):

    email_notifications: bool = True

    in_app_notifications: bool = True

    sms_notifications: bool = False

    important_alerts: bool = True

    audit_reminders: bool = True


class AuditorNotificationPreferenceUpdate(
    AuditorNotificationPreferenceBase
):
    pass


class AuditorNotificationPreferenceResponse(
    AuditorNotificationPreferenceBase
):

    id: int

    user_id: int

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# SEND MESSAGE
# ==========================================================

class SendDirectMessage(BaseModel):

    message: str = Field(
        min_length=1,
        max_length=5000
    )


# ==========================================================
# CREATE CONVERSATION
# ==========================================================

class CreateConversation(BaseModel):

    user_id: int


# ==========================================================
# CREATE GROUP
# ==========================================================

class CreateChatGroup(BaseModel):

    name: str

    description: Optional[str] = None

    member_ids: List[int] = []


# ==========================================================
# MESSAGE RESPONSE
# ==========================================================

class MessageResponse(BaseModel):

    id: int

    conversation_id: int

    sender_id: Optional[int]

    sender_name: Optional[str]

    message: Optional[str]

    message_type: str

    created_at: Optional[str]


class FinanceCommunicationMessage(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=5000
    )


# ============================================================
# SUPPLY CHAIN COMMUNICATION SCHEMAS
# ============================================================

class SupplyChainCommunicationMessage(BaseModel):

    message: str = Field(
        ...,
        min_length=1,
        max_length=5000
    )

    model_config = ConfigDict(
        from_attributes=True
    )


class AuditorCommunicationMessage(BaseModel):

    message: str

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# VENDOR COMMUNICATION SCHEMAS
# ============================================================

class VendorCommunicationSendRequest(BaseModel):

    message: str = Field(
        ...,
        min_length=1,
        max_length=5000
    )


class VendorCommunicationMessageResponse(BaseModel):

    id: int

    vendor_id: str

    sender_user_id: Optional[int] = None

    recipient_user_id: Optional[int] = None

    sender_type: str

    sender_name: str

    message: str

    message_type: str

    is_read: bool

    created_at: Optional[str] = None


class VendorCommunicationContactResponse(BaseModel):

    user_id: int

    name: str

    email: Optional[str] = None

    role: str

    department: str

    status: str

    unread_count: int = 0


class VendorCommunicationProfileResponse(BaseModel):

    vendor_id: str

    vendor_name: str

    email: Optional[str] = None


class VendorCommunicationConversationResponse(BaseModel):

    vendor_id: str

    recipient_user_id: int

    recipient_name: str

    recipient_role: str

    messages: List[
        VendorCommunicationMessageResponse
    ]


# ==========================================================
# MESSAGE ATTACHMENT
# ==========================================================

class MessageAttachmentResponse(BaseModel):

    id: int

    file_name: str

    file_path: str

    file_type: Optional[str]

    file_size: float


# ============================================================
# AUDITOR SETTINGS PAGE SCHEMAS
# ============================================================

class AuditorSettingsProfileUpdate(BaseModel):

    name: str = Field(
        ...,
        min_length=2,
        max_length=100
    )

    email: EmailStr

    mobile: Optional[str] = None

    employee_id: Optional[str] = None

    job_title: Optional[str] = None

    department: Optional[str] = None

    reporting_manager_id: Optional[int] = None

    date_of_joining: Optional[date] = None

    timezone: Optional[str] = None

    language: Optional[str] = None

    about_me: Optional[str] = None


class AuditorSystemPreferencesUpdate(BaseModel):

    theme: Optional[str] = "Light"

    date_format: Optional[str] = "DD MMM YYYY"

    time_format: Optional[str] = "12 Hour (AM/PM)"

    language: Optional[str] = None

    timezone: Optional[str] = None


class AuditorPasswordChangeRequest(BaseModel):

    current_password: str

    new_password: str = Field(
        ...,
        min_length=6,
        max_length=128
    )

    confirm_password: str


class AuditorTwoFactorUpdate(BaseModel):

    enabled: bool


class AuditorProfileResponse(BaseModel):

    id: int

    name: str

    email: str

    mobile: Optional[str] = None

    employee_id: Optional[str] = None

    job_title: Optional[str] = None

    department: Optional[str] = None

    manager: Optional[str] = None

    date_of_joining: Optional[date] = None

    timezone: Optional[str] = None

    language: Optional[str] = None

    about_me: Optional[str] = None

    profile_image: Optional[str] = None

    role: Optional[str] = None

    two_factor_enabled: bool = False

    password_changed_at: Optional[datetime] = None

    active_sessions: int = 0

    model_config = ConfigDict(
        from_attributes=True
    )


class AuditorEmailPreferencesUpdate(BaseModel):
    audit_reminders: bool = True
    audit_assignments: bool = True
    finding_notifications: bool = True
    report_notifications: bool = True


class AuditorNotificationSettingsUpdate(BaseModel):
    audit_assignments: bool = True
    findings: bool = True
    compliance: bool = True
    system: bool = True


# ============================================================
# PASSWORD RESET REQUEST MODELS
# ============================================================

class PasswordResetBaseRequest(BaseModel):
    """
    Common identity information.

    account_type:
        user   -> identifier is users.email
        vendor -> identifier is vendors.vendor_id
    """

    account_type: str = Field(
        ...,
        min_length=4,
        max_length=10
    )

    identifier: str = Field(
        ...,
        min_length=3,
        max_length=150
    )

    mobile: str = Field(
        ...,
        min_length=10,
        max_length=20
    )


# ============================================================
# SEND OTP REQUEST
# ============================================================

class SendOTPRequest(PasswordResetBaseRequest):
    pass


# ============================================================
# VERIFY OTP REQUEST
# ============================================================

class VerifyOTPRequest(PasswordResetBaseRequest):

    otp: str = Field(
        ...,
        min_length=6,
        max_length=6
    )


# ============================================================
# RESET PASSWORD REQUEST
# ============================================================

class ResetPasswordRequest(PasswordResetBaseRequest):

    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128
    )


# ============================================================
# APPLICATION STARTUP HELPER
# ============================================================

def initialize_database():
    """
    Convenience helper for local development.

    Production deployments should normally use migrations instead of
    create_all().
    """
    create_tables()