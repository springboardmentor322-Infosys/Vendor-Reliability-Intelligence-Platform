"""Pydantic contracts for all Milestone 2 modules."""
from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

VendorStatus = Literal["Pending", "Under Review", "Approved", "Rejected"]
RequestStatus = Literal["Draft", "Pending Approval", "Approved", "Rejected", "Purchase Order Created"]
POStatus = Literal["Created", "Sent", "Accepted", "Rejected", "In Progress", "Processing", "Ready for Shipment", "Shipped", "Delivered", "Received", "Completed", "Cancelled"]

class ORM(BaseModel): model_config = ConfigDict(from_attributes=True)
class CategoryCreate(BaseModel): name: str = Field(min_length=2, max_length=100); description: str | None = Field(default=None, max_length=255)
class CategoryRead(ORM): id: int; name: str; description: str | None; created_at: datetime
class ContactCreate(BaseModel): name: str = Field(min_length=2, max_length=150); designation: str | None = Field(default=None, max_length=100); email: EmailStr; phone: str | None = Field(default=None, max_length=30); is_primary: bool = False
class ContactRead(ContactCreate, ORM): id: int; vendor_id: int
class VendorBase(BaseModel):
    company_name: str = Field(min_length=2, max_length=255); registration_number: str = Field(min_length=2, max_length=100); gst_number: str = Field(min_length=2, max_length=50); email: EmailStr; phone: str = Field(min_length=7, max_length=30); address: str = Field(min_length=3); city: str = Field(min_length=2, max_length=100); state: str = Field(min_length=2, max_length=100); country: str = Field(min_length=2, max_length=100); postal_code: str = Field(min_length=2, max_length=20); website: str | None = Field(default=None, max_length=255); category_id: int
class VendorCreate(VendorBase): contacts: list[ContactCreate] = Field(default_factory=list)
class VendorUpdate(VendorBase): approval_status: VendorStatus | None = None
class VendorRead(VendorBase, ORM):
    id: int
    approval_status: str
    created_by: int
    created_at: datetime
    updated_at: datetime
    contacts: list[ContactRead] = Field(default_factory=list)
    reliability_score: Decimal | None = None
    risk_category: str | None = None
    overall_risk_score: Decimal | None = None
    risk_level: str | None = None
    risk_explanation: str | None = None
    risk_trend: str | None = None
    early_warning: str | None = None
    operational_risk_score: Decimal | None = None
    compliance_risk_score: Decimal | None = None
    financial_risk_score: Decimal | None = None
    cyber_risk_score: Decimal | None = None
    dependency_risk_score: Decimal | None = None
    financial_health_indicator: str | None = None
    outstanding_exposure: Decimal | None = None
    payment_issues_count: int | None = None
    security_assessment_status: str | None = None
    security_certification_status: str | None = None
    security_incidents_count: int | None = None
    alternative_vendors_count: int | None = None
    is_critical_supplier: bool | None = None
    blast_radius_level: str | None = None
    blast_radius_explanation: str | None = None

class LineItem(BaseModel):
    item_name: str = Field(min_length=1, max_length=255); quantity: Decimal = Field(gt=0); estimated_price: Decimal = Field(ge=0); subtotal: Decimal | None = Field(default=None, ge=0)
    @model_validator(mode="after")
    def calculate_subtotal(self): self.subtotal = self.quantity * self.estimated_price; return self
class RequestBase(BaseModel): title: str = Field(min_length=3, max_length=255); department: str = Field(min_length=2, max_length=150); description: str = Field(min_length=3); priority: Literal["Low", "Medium", "High", "Critical"] = "Medium"; required_date: date; line_items: list[LineItem] = Field(min_length=1)
class RequestCreate(RequestBase): pass
class RequestUpdate(RequestBase): pass
class ApprovalDecision(BaseModel): comment: str | None = Field(default=None, max_length=2000)
class RequestRead(RequestBase, ORM):
    id: int; estimated_cost: Decimal; status: str; created_by: int; approved_by: int | None; approved_at: datetime | None; approval_comment: str | None; rejected_by: int | None; rejected_at: datetime | None; rejection_reason: str | None; created_at: datetime; updated_at: datetime

class POItemCreate(BaseModel): item_name: str = Field(min_length=1, max_length=255); quantity: Decimal = Field(gt=0); unit_price: Decimal = Field(ge=0)
class POItemRead(POItemCreate, ORM): id: int; purchase_order_id: int; subtotal: Decimal
class POCreate(BaseModel): vendor_id: int; procurement_request_id: int; issue_date: date; expected_delivery_date: date; items: list[POItemCreate] = Field(min_length=1)
class POUpdate(BaseModel): expected_delivery_date: date | None = None; status: POStatus | None = None
class PORead(ORM): id: int; po_number: str; vendor_id: int; procurement_request_id: int; issue_date: date; expected_delivery_date: date; status: str; total_amount: Decimal; invoice_path: str | None; delivery_proof_path: str | None; created_by: int; created_at: datetime; updated_at: datetime; items: list[POItemRead] = Field(default_factory=list)

class VendorFulfillmentUpdate(BaseModel):
    fulfillment_status: Literal["In Progress", "Processing", "Ready for Shipment", "Shipped"]
    shipment_reference: str | None = Field(default=None, max_length=120)
    shipped_at: date | None = None
    vendor_notes: str | None = Field(default=None, max_length=2000)

class ReceiptRecord(BaseModel):
    actual_delivery_date: date
    received_at: date | None = None
    received_quantity: Decimal = Field(ge=0)
    accepted_quantity: Decimal = Field(ge=0)
    rejected_quantity: Decimal = Field(default=Decimal("0"), ge=0)
    quality_status: Literal["Passed", "Conditional", "Failed"]
    quality_notes: str | None = Field(default=None, max_length=2000)
    sla_violations: int = Field(default=0, ge=0, le=100)

    @model_validator(mode="after")
    def validate_quantities(self):
        if self.accepted_quantity + self.rejected_quantity > self.received_quantity:
            raise ValueError("Accepted plus rejected quantity cannot exceed received quantity.")
        return self

class POFulfillmentRead(ORM):
    id: int
    purchase_order_id: int
    shipment_reference: str | None
    fulfillment_status: str
    shipped_at: date | None
    actual_delivery_date: date | None
    received_at: date | None
    ordered_quantity: Decimal
    received_quantity: Decimal | None
    accepted_quantity: Decimal | None
    rejected_quantity: Decimal | None
    quality_status: str
    quality_notes: str | None
    sla_violations: int
    vendor_notes: str | None
    recorded_by: int | None
    created_at: datetime
    updated_at: datetime

class POModificationRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=2000)

class ContractBase(BaseModel):
    contract_number: str = Field(min_length=2, max_length=80)
    vendor_id: int
    start_date: date
    end_date: date
    renewal_notice_days: int = Field(default=30, ge=1, le=365)
    compliance_status: Literal["Pending", "Compliant", "Non-Compliant"] = "Pending"
    terms: str = Field(min_length=3)
    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date <= self.start_date: raise ValueError("End date must be after start date.")
        return self
class ContractCreate(ContractBase): pass
class ContractUpdate(ContractBase): pass
class DocumentRead(ORM): id: int; contract_id: int; file_name: str; file_path: str; uploaded_by: int; created_at: datetime
class ContractRead(ContractBase, ORM): id: int; contract_file: str | None; created_by: int; created_at: datetime; updated_at: datetime; documents: list[DocumentRead] = Field(default_factory=list); expiry_bucket: int | None = None

class MessageCreate(BaseModel):
    purchase_order_id: int | None = None
    contract_id: int | None = None
    receiver_id: int
    subject: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1)
    @model_validator(mode="after")
    def one_thread_only(self):
        if bool(self.purchase_order_id) == bool(self.contract_id): raise ValueError("Select exactly one purchase order or contract thread.")
        return self
class MessageRead(ORM): id: int; purchase_order_id: int | None; contract_id: int | None; sender_id: int; receiver_id: int; subject: str; message: str; attachment_path: str | None; is_read: bool; created_at: datetime
