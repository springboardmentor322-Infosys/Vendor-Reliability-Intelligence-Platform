from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    ForeignKey
)

from sqlalchemy.orm import relationship

from database import Base


# =========================================================
# ROLE MODEL
# =========================================================

class Role(Base):

    __tablename__ = "roles"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        unique=True,
        nullable=False
    )

    user_roles = relationship(
        "UserRole",
        back_populates="role"
    )


# =========================================================
# USER MODEL
# =========================================================

class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    email = Column(
        String,
        unique=True,
        nullable=False
    )

    password = Column(
        String,
        nullable=False
    )

    user_roles = relationship(
        "UserRole",
        back_populates="user"
    )


# =========================================================
# USER ROLE MODEL
# =========================================================

class UserRole(Base):

    __tablename__ = "user_roles"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id")
    )

    role_id = Column(
        Integer,
        ForeignKey("roles.id")
    )

    user = relationship(
        "User",
        back_populates="user_roles"
    )

    role = relationship(
        "Role",
        back_populates="user_roles"
    )


# =========================================================
# VENDOR CATEGORY MODEL
# =========================================================

class VendorCategory(Base):

    __tablename__ = "vendor_categories"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        unique=True,
        nullable=False
    )

    vendors = relationship(
        "Vendor",
        back_populates="category"
    )


# =========================================================
# VENDOR MODEL
# =========================================================

class Vendor(Base):

    __tablename__ = "vendors"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    email = Column(
        String,
        unique=True,
        nullable=False
    )

    phone = Column(
        String,
        nullable=True
    )

    category_id = Column(
        Integer,
        ForeignKey("vendor_categories.id"),
        nullable=True
    )

    approval_status = Column(
        String,
        default="Pending"
    )

    reliability_score = Column(
        Float,
        default=0
    )

    quality_score = Column(
        Float,
        default=0
    )

    on_time_delivery = Column(
        Float,
        default=0
    )

    category = relationship(
        "VendorCategory",
        back_populates="vendors"
    )

    contacts = relationship(
        "VendorContact",
        back_populates="vendor"
    )


# =========================================================
# VENDOR CONTACT MODEL
# =========================================================

class VendorContact(Base):

    __tablename__ = "vendor_contacts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id")
    )

    contact_name = Column(
        String,
        nullable=False
    )

    email = Column(
        String,
        nullable=True
    )

    phone = Column(
        String,
        nullable=True
    )

    vendor = relationship(
        "Vendor",
        back_populates="contacts"
    )


# =========================================================
# PROCUREMENT REQUEST MODEL
# =========================================================

class ProcurementRequest(Base):

    __tablename__ = "procurement_requests"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    requester = Column(
        String,
        nullable=False
    )

    department = Column(
        String,
        nullable=False
    )

    item = Column(
        String,
        nullable=False
    )

    quantity = Column(
        Integer,
        nullable=False
    )

    estimated_cost = Column(
        Float,
        nullable=False
    )

    status = Column(
        String,
        default="Pending"
    )


# =========================================================
# PURCHASE ORDER MODEL
# =========================================================

class PurchaseOrder(Base):

    __tablename__ = "purchase_orders"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_name = Column(
        String,
        nullable=False
    )

    item_service = Column(
        String,
        nullable=False
    )

    total_cost = Column(
        String,
        nullable=False
    )

    status = Column(
        String,
        default="Pending"
    )

    vendor_id = Column(
        Integer,
        nullable=True
    )

    product_id = Column(
        Integer,
        nullable=True
    )

    po_number = Column(
        String,
        nullable=True
    )

    order_date = Column(
        Date,
        nullable=True
    )

    quantity = Column(
        Integer,
        nullable=True
    )

    unit_price = Column(
        Float,
        nullable=True
    )

    total_amount = Column(
        Float,
        nullable=True
    )

    expected_delivery_date = Column(
        Date,
        nullable=True
    )

    actual_delivery_date = Column(
        Date,
        nullable=True
    )

    order_status = Column(
        String,
        nullable=True
    )

    created_by = Column(
        Integer,
        nullable=True
    )

    items = relationship(
        "POItem",
        back_populates="purchase_order"
    )



# =========================================================
# PURCHASE ORDER ITEM MODEL
# =========================================================

class POItem(Base):

    __tablename__ = "po_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    po_id = Column(
        Integer,
        ForeignKey("purchase_orders.id")
    )

    item = Column(
        String,
        nullable=False
    )

    quantity = Column(
        Integer,
        nullable=False
    )

    cost = Column(
        Float,
        nullable=False
    )

    purchase_order = relationship(
        "PurchaseOrder",
        back_populates="items"
    )


# =========================================================
# CONTRACT MODEL
# =========================================================

class Contract(Base):

    __tablename__ = "contracts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id")
    )

    contract_name = Column(
        String,
        nullable=False
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
        String,
        default="Active"
    )

    documents = relationship(
        "ContractDocument",
        back_populates="contract"
    )


# =========================================================
# CONTRACT DOCUMENT MODEL
# =========================================================

class ContractDocument(Base):

    __tablename__ = "contract_documents"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    contract_id = Column(
        Integer,
        ForeignKey("contracts.id")
    )

    file_name = Column(
        String,
        nullable=False
    )

    file_path = Column(
        String,
        nullable=True
    )

    uploaded_at = Column(
        Date,
        nullable=True
    )

    contract = relationship(
        "Contract",
        back_populates="documents"
    )


# =========================================================
# INVOICE MODEL
# =========================================================

class Invoice(Base):

    __tablename__ = "invoices"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    po_id = Column(
        Integer,
        ForeignKey("purchase_orders.id")
    )

    invoice_number = Column(
        String,
        unique=True,
        nullable=False
    )

    amount = Column(
        Float,
        nullable=False
    )

    status = Column(
        String,
        default="Pending"
    )


# =========================================================
# AUDIT LOG MODEL
# =========================================================

class AuditLog(Base):

    __tablename__ = "audit_logs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_email = Column(
        String,
        nullable=True
    )

    action = Column(
        String,
        nullable=False
    )

    created_at = Column(
        Date,
        nullable=True
    )


# =========================================================
# NOTIFICATION MODEL
# =========================================================

class Notification(Base):

    __tablename__ = "notifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_email = Column(
        String,
        nullable=False
    )

    message = Column(
        String,
        nullable=False
    )

    status = Column(
        String,
        nullable=True
    )

    created_at = Column(
        Date,
        nullable=True
    )

    notification_type = Column(
        String,
        default="General"
    )

    is_read = Column(
        String,
        default="No"
    )