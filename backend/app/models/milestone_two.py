"""Milestone 2 procurement, vendor, contract, and communication ORM models."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.database.database import Base


class TimestampedModel:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class VendorCategory(Base):
    __tablename__ = "vendor_categories"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    vendors: Mapped[list["Vendor"]] = relationship(back_populates="category")


class Vendor(Base, TimestampedModel):
    __tablename__ = "vendors"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    registration_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    gst_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    postal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    website: Mapped[str | None] = mapped_column(String(255))
    category_id: Mapped[int] = mapped_column(ForeignKey("vendor_categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    approval_status: Mapped[str] = mapped_column(String(30), nullable=False, default="Pending", server_default="Pending", index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    reliability_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    risk_category: Mapped[str | None] = mapped_column(String(30), nullable=True)
    score_breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    last_calculated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # New Multi-Dimensional Risk Intelligence Columns
    overall_risk_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    risk_level: Mapped[str | None] = mapped_column(String(30), nullable=True)
    risk_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_trend: Mapped[str | None] = mapped_column(String(30), nullable=True)
    early_warning: Mapped[str | None] = mapped_column(Text, nullable=True)
    operational_risk_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    compliance_risk_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    financial_risk_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    cyber_risk_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    dependency_risk_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    
    # External Simulated/Demo Risk Indicators
    financial_health_indicator: Mapped[str | None] = mapped_column(String(50), nullable=True, default="Healthy", server_default="Healthy")
    outstanding_exposure: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True, default=Decimal("0.0"), server_default="0.0")
    payment_issues_count: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0, server_default="0")
    security_assessment_status: Mapped[str | None] = mapped_column(String(50), nullable=True, default="Passed", server_default="Passed")
    security_certification_status: Mapped[str | None] = mapped_column(String(50), nullable=True, default="Certified", server_default="Certified")
    security_incidents_count: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0, server_default="0")
    alternative_vendors_count: Mapped[int | None] = mapped_column(Integer, nullable=True, default=1, server_default="1")
    is_critical_supplier: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False, server_default="false")
    blast_radius_level: Mapped[str | None] = mapped_column(String(30), nullable=True, default="Low", server_default="Low")
    blast_radius_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)

    category: Mapped[VendorCategory] = relationship(back_populates="vendors")
    contacts: Mapped[list["VendorContact"]] = relationship(back_populates="vendor", cascade="all, delete-orphan")
    vendor_users: Mapped[list["User"]] = relationship(
        back_populates="vendor", foreign_keys="User.vendor_id"
    )


class VendorContact(Base):
    __tablename__ = "vendor_contacts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    designation: Mapped[str | None] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    vendor: Mapped[Vendor] = relationship(back_populates="contacts")


class ProcurementRequest(Base, TimestampedModel):
    __tablename__ = "procurement_requests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    department: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    estimated_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="Medium")
    required_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="Draft", server_default="Draft", index=True)
    line_items: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approval_comment: Mapped[str | None] = mapped_column(Text)
    rejected_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    purchase_order: Mapped["PurchaseOrder | None"] = relationship(back_populates="procurement_request", uselist=False)


class PurchaseOrder(Base, TimestampedModel):
    __tablename__ = "purchase_orders"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    po_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True)
    procurement_request_id: Mapped[int] = mapped_column(ForeignKey("procurement_requests.id", ondelete="RESTRICT"), unique=True, nullable=False)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_delivery_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="Created", server_default="Created", index=True)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    invoice_path: Mapped[str | None] = mapped_column(String(500))
    delivery_proof_path: Mapped[str | None] = mapped_column(String(500))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    vendor: Mapped[Vendor] = relationship()
    procurement_request: Mapped[ProcurementRequest] = relationship(back_populates="purchase_order")
    items: Mapped[list["POItem"]] = relationship(back_populates="purchase_order", cascade="all, delete-orphan")
    fulfillment: Mapped["POFulfillment | None"] = relationship(back_populates="purchase_order", uselist=False, cascade="all, delete-orphan")


class POItem(Base):
    __tablename__ = "po_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    purchase_order_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    purchase_order: Mapped[PurchaseOrder] = relationship(back_populates="items")


class POFulfillment(Base, TimestampedModel):
    """Operational shipment, receiving, quantity and quality evidence for a PO.

    This is intentionally separate from a commercial PO so that supplier
    performance is calculated from recorded operational facts, not a manually
    entered score or a workflow label alone.
    """
    __tablename__ = "po_fulfillments"
    __table_args__ = (
        CheckConstraint("received_quantity IS NULL OR received_quantity >= 0", name="ck_po_fulfillment_received_nonnegative"),
        CheckConstraint("accepted_quantity IS NULL OR accepted_quantity >= 0", name="ck_po_fulfillment_accepted_nonnegative"),
        CheckConstraint("rejected_quantity IS NULL OR rejected_quantity >= 0", name="ck_po_fulfillment_rejected_nonnegative"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    purchase_order_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    shipment_reference: Mapped[str | None] = mapped_column(String(120), index=True)
    fulfillment_status: Mapped[str] = mapped_column(String(40), nullable=False, default="Not Started", server_default="Not Started")
    shipped_at: Mapped[date | None] = mapped_column(Date)
    actual_delivery_date: Mapped[date | None] = mapped_column(Date, index=True)
    received_at: Mapped[date | None] = mapped_column(Date)
    ordered_quantity: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    received_quantity: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    accepted_quantity: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    rejected_quantity: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    quality_status: Mapped[str] = mapped_column(String(30), nullable=False, default="Pending", server_default="Pending")
    quality_notes: Mapped[str | None] = mapped_column(Text)
    sla_violations: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    vendor_notes: Mapped[str | None] = mapped_column(Text)
    recorded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    purchase_order: Mapped[PurchaseOrder] = relationship(back_populates="fulfillment")


class Contract(Base, TimestampedModel):
    __tablename__ = "contracts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    contract_number: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    renewal_notice_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    compliance_status: Mapped[str] = mapped_column(String(30), nullable=False, default="Pending")
    terms: Mapped[str] = mapped_column(Text, nullable=False)
    contract_file: Mapped[str | None] = mapped_column(String(500))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    vendor: Mapped[Vendor] = relationship()
    documents: Mapped[list["ContractDocument"]] = relationship(back_populates="contract", cascade="all, delete-orphan")


class ContractDocument(Base):
    __tablename__ = "contract_documents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    contract_id: Mapped[int] = mapped_column(ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    contract: Mapped[Contract] = relationship(back_populates="documents")


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (CheckConstraint("(purchase_order_id IS NOT NULL AND contract_id IS NULL) OR (purchase_order_id IS NULL AND contract_id IS NOT NULL)", name="ck_messages_one_thread"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    purchase_order_id: Mapped[int | None] = mapped_column(ForeignKey("purchase_orders.id", ondelete="CASCADE"), index=True)
    contract_id: Mapped[int | None] = mapped_column(ForeignKey("contracts.id", ondelete="CASCADE"), index=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    receiver_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    attachment_path: Mapped[str | None] = mapped_column(String(500))
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    entity: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
