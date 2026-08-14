from __future__ import annotations

from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InvoiceStatus(str, PyEnum):
    PAID = "Paid"
    PENDING = "Pending"
    OVERDUE = "Overdue"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"), nullable=False, index=True)

    vendor: Mapped["Vendor"] = relationship(back_populates="products")


class Delivery(Base):
    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    purchase_order_id: Mapped[int] = mapped_column(
        ForeignKey("purchase_orders.id"), nullable=False, unique=True, index=True
    )
    scheduled_shipping_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    actual_shipping_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    shipping_mode: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    late_delivery_risk: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    delivery_status: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    purchase_order: Mapped["PurchaseOrder"] = relationship(back_populates="deliveries")


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    purchase_order_id: Mapped[int] = mapped_column(
        ForeignKey("purchase_orders.id"), nullable=False, index=True
    )
    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(String(50), nullable=False, default=InvoiceStatus.PENDING)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    paid_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    purchase_order: Mapped["PurchaseOrder"] = relationship(back_populates="invoices")


class QualityInspection(Base):
    __tablename__ = "quality_inspections"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"), nullable=False, index=True)
    purchase_order_id: Mapped[int] = mapped_column(
        ForeignKey("purchase_orders.id"), nullable=False, index=True
    )
    inspection_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    quality_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    defects_found: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    inspector_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    vendor: Mapped["Vendor"] = relationship(back_populates="quality_inspections")
    purchase_order: Mapped["PurchaseOrder"] = relationship(back_populates="quality_inspections")


__all__ = [
    "Product",
    "Delivery",
    "Invoice",
    "InvoiceStatus",
    "QualityInspection",
]
