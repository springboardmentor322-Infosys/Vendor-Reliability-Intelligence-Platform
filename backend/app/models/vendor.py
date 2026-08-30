from __future__ import annotations

from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.user import User


class VendorStatus(str, PyEnum):
    PENDING = "Pending"
    UNDER_REVIEW = "Under Review"
    APPROVED = "Approved"
    REJECTED = "Rejected"


class VendorCategory(Base):
    __tablename__ = "vendor_categories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    vendors: Mapped[list["Vendor"]] = relationship(back_populates="category")


class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("vendor_categories.id"), nullable=False, index=True)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(50), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[VendorStatus] = mapped_column(
        SQLEnum(
            VendorStatus,
            name="vendor_status",
            values_callable=lambda statuses: [status.value for status in statuses],
        ),
        nullable=False,
        default=VendorStatus.PENDING,
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    category: Mapped[VendorCategory] = relationship(back_populates="vendors")
    contacts: Mapped[list["VendorContact"]] = relationship(
        back_populates="vendor",
        cascade="all, delete-orphan",
    )
    reliability_scores: Mapped[list["ReliabilityScore"]] = relationship(
        back_populates="vendor",
        cascade="all, delete-orphan",
    )
    performance_records: Mapped[list["PerformanceRecord"]] = relationship(
        back_populates="vendor",
        cascade="all, delete-orphan",
    )
    purchase_orders: Mapped[list["PurchaseOrder"]] = relationship(back_populates="vendor")
    contracts: Mapped[list["Contract"]] = relationship(back_populates="vendor")
    compliance_documents: Mapped[list["ComplianceDocument"]] = relationship(
        back_populates="vendor",
        cascade="all, delete-orphan",
    )
    status_history: Mapped[list["VendorStatusHistory"]] = relationship(
        back_populates="vendor",
        cascade="all, delete-orphan",
        order_by="VendorStatusHistory.changed_at",
    )
    documents: Mapped[list["VendorDocument"]] = relationship(
        back_populates="vendor",
        cascade="all, delete-orphan",
        order_by="VendorDocument.uploaded_at",
    )
    communications: Mapped[list["Communication"]] = relationship(back_populates="vendor")
    reports: Mapped[list["Report"]] = relationship(back_populates="vendor")
    products: Mapped[list["Product"]] = relationship(
        back_populates="vendor",
        cascade="all, delete-orphan",
    )
    quality_inspections: Mapped[list["QualityInspection"]] = relationship(
        back_populates="vendor",
    )
    owner: Mapped[Optional[User]] = relationship(foreign_keys=[user_id])
    creator: Mapped[Optional[User]] = relationship(foreign_keys=[created_by])


class VendorDocument(Base):
    __tablename__ = "vendor_documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"), nullable=False, index=True)
    doc_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    vendor: Mapped[Vendor] = relationship(back_populates="documents")


class VendorStatusHistory(Base):
    __tablename__ = "vendor_status_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"), nullable=False, index=True)
    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    vendor: Mapped[Vendor] = relationship(back_populates="status_history")
    changed_by_user: Mapped[Optional[User]] = relationship(foreign_keys=[changed_by])


class VendorContact(Base):
    __tablename__ = "vendor_contacts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"), nullable=False, index=True)
    contact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    designation: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)

    vendor: Mapped[Vendor] = relationship(back_populates="contacts")
