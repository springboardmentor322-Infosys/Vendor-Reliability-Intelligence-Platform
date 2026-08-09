from __future__ import annotations

from datetime import datetime
from typing import Optional

from enum import Enum as PyEnum

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.user import User


class ReliabilityScore(Base):
    __tablename__ = "reliability_scores"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"), nullable=False, index=True)
    overall_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    delivery_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    quality_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    response_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    vendor: Mapped["Vendor"] = relationship(back_populates="reliability_scores")


class PerformanceRecord(Base):
    __tablename__ = "performance_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"), nullable=False, index=True)
    record_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delivery_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    quality_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    response_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    vendor: Mapped["Vendor"] = relationship(back_populates="performance_records")


class ProcurementRequestStatus(str, PyEnum):
    PENDING = "Pending"
    APPROVED = "Approved"
    ORDERED = "Ordered"
    DELIVERED = "Delivered"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class ProcurementRequest(Base):
    __tablename__ = "procurement_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    requested_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    department: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[ProcurementRequestStatus] = mapped_column(
        String(50), nullable=False, default=ProcurementRequestStatus.PENDING
    )
    total_estimated_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    requester: Mapped[User] = relationship(foreign_keys=[requested_by])
    items: Mapped[list["ProcurementRequestItem"]] = relationship(
        back_populates="procurement_request",
        cascade="all, delete-orphan",
    )
    purchase_orders: Mapped[list["PurchaseOrder"]] = relationship(back_populates="procurement_request")


class ProcurementRequestItem(Base):
    __tablename__ = "procurement_request_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    procurement_request_id: Mapped[int] = mapped_column(
        ForeignKey("procurement_requests.id"), nullable=False, index=True
    )
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_unit_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    procurement_request: Mapped["ProcurementRequest"] = relationship(back_populates="items")


class PurchaseOrderStatus(str, PyEnum):
    PENDING = "Pending"
    APPROVED = "Approved"
    ORDERED = "Ordered"
    IN_PROGRESS = "In Progress"
    SHIPPED = "Shipped"
    PARTIAL_DELIVERY = "Partial Delivery"
    DELIVERED = "Delivered"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class DeliveryDocType(str, PyEnum):
    INVOICE = "Invoice"
    RECEIPT = "Receipt"
    PROOF_OF_DELIVERY = "Proof of Delivery"


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    po_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    procurement_request_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("procurement_requests.id"),
        nullable=True,
        index=True,
    )
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"), nullable=False, index=True)
    order_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expected_delivery_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="USD")
    status: Mapped[PurchaseOrderStatus] = mapped_column(
        String(50), nullable=False, default=PurchaseOrderStatus.PENDING
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    procurement_request: Mapped[Optional["ProcurementRequest"]] = relationship(back_populates="purchase_orders")
    vendor: Mapped["Vendor"] = relationship(back_populates="purchase_orders")
    creator: Mapped[User] = relationship(foreign_keys=[created_by])
    items: Mapped[list["POItem"]] = relationship(
        back_populates="purchase_order",
        cascade="all, delete-orphan",
    )
    documents: Mapped[list["DeliveryDocument"]] = relationship(
        back_populates="purchase_order",
        cascade="all, delete-orphan",
        order_by="DeliveryDocument.uploaded_at.desc()",
    )


class POItem(Base):
    __tablename__ = "po_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    purchase_order_id: Mapped[int] = mapped_column(
        ForeignKey("purchase_orders.id"), nullable=False, index=True
    )
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    purchase_order: Mapped["PurchaseOrder"] = relationship(back_populates="items")


class DeliveryDocument(Base):
    __tablename__ = "delivery_documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    purchase_order_id: Mapped[int] = mapped_column(
        ForeignKey("purchase_orders.id"), nullable=False, index=True
    )
    doc_type: Mapped[DeliveryDocType] = mapped_column(String(50), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    purchase_order: Mapped["PurchaseOrder"] = relationship(back_populates="documents")
    uploader: Mapped[User] = relationship(foreign_keys=[uploaded_by])


class ContractStatus(str, PyEnum):
    ACTIVE = "Active"
    EXPIRING_SOON = "Expiring Soon"
    EXPIRED = "Expired"
    DRAFT = "Draft"


class ComplianceFlag(str, PyEnum):
    COMPLIANT = "Compliant"
    NON_COMPLIANT = "Non-Compliant"
    UNDER_REVIEW = "Under Review"


class Contract(Base):
    __tablename__ = "contracts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    contract_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"), nullable=False, index=True)
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expiry_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    renewal_notice_period_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    contract_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="USD")
    terms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    compliance_flag: Mapped[ComplianceFlag] = mapped_column(
        String(50), nullable=False, default=ComplianceFlag.UNDER_REVIEW
    )
    status: Mapped[ContractStatus] = mapped_column(
        String(50), nullable=False, default=ContractStatus.DRAFT
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    vendor: Mapped["Vendor"] = relationship(back_populates="contracts")
    creator: Mapped[User] = relationship(foreign_keys=[created_by_user_id])


class ComplianceDocument(Base):
    __tablename__ = "compliance_documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"), nullable=False, index=True)
    document_type: Mapped[str] = mapped_column(String(100), nullable=False)
    document_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    vendor: Mapped["Vendor"] = relationship(back_populates="compliance_documents")


class Communication(Base):
    __tablename__ = "communications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    channel: Mapped[str] = mapped_column(String(50), nullable=False, default="email")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="open")
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    vendor: Mapped["Vendor"] = relationship(back_populates="communications")
    creator: Mapped[User] = relationship(foreign_keys=[created_by_user_id])
    messages: Mapped[list["Message"]] = relationship(back_populates="communication")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    communication_id: Mapped[int] = mapped_column(ForeignKey("communications.id"), nullable=False, index=True)
    sender_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    recipient_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    is_read: Mapped[bool] = mapped_column(default=False, nullable=False)

    communication: Mapped["Communication"] = relationship(back_populates="messages")
    sender: Mapped[User] = relationship(foreign_keys=[sender_user_id])
    recipient: Mapped[User] = relationship(foreign_keys=[recipient_user_id])


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    notification_type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    related_entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    related_entity_id: Mapped[Optional[int]] = mapped_column(nullable=True)

    recipient: Mapped[User] = relationship(foreign_keys=[user_id])


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    report_type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    generated_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    vendor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vendors.id"), nullable=True, index=True)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    generator: Mapped[User] = relationship(foreign_keys=[generated_by_user_id])
    vendor: Mapped[Optional["Vendor"]] = relationship(back_populates="reports")


__all__ = [
    "VendorCategory",
    "Vendor",
    "ReliabilityScore",
    "PerformanceRecord",
    "ProcurementRequest",
    "ProcurementRequestStatus",
    "PurchaseOrder",
    "PurchaseOrderStatus",
    "POItem",
    "DeliveryDocument",
    "DeliveryDocType",
    "Contract",
    "ContractStatus",
    "ComplianceFlag",
    "ComplianceDocument",
    "Communication",
    "Message",
    "Notification",
    "Report",
]
