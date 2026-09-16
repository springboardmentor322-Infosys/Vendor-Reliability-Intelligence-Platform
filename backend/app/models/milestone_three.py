"""Milestone 3 models: Vendor reliability scoring history, user notifications, and password resets."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


class VendorReliabilityHistory(Base):
    __tablename__ = "vendor_reliability_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vendor_id: Mapped[int] = mapped_column(
        ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    risk_category: Mapped[str] = mapped_column(String(30), nullable=False)
    
    # Track the rate values (0-100) or null if not applicable
    on_time_delivery_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    contract_compliance_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    communication_response_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    purchase_order_performance_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    quantity_fulfillment_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    quality_acceptance_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    
    breakdown: Mapped[dict] = mapped_column(Text, nullable=False)  # Stored as JSON string or text breakdown
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    vendor: Mapped["Vendor"] = relationship()


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    recipient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)       # e.g., 'reliability', 'contract', 'procurement', 'po'
    severity: Mapped[str] = mapped_column(String(30), nullable=False, index=True)   # e.g., 'info', 'warning', 'error', 'critical'
    related_entity: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g., 'Vendor', 'Contract', 'PurchaseOrder'
    related_entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false", index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    recipient: Mapped["User"] = relationship()


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship()
