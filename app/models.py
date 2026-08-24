from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    password = Column(String, nullable=False)
    role = Column(String, default='Vendor')

class Vendor(Base):
    __tablename__ = 'vendors'
    id = Column(Integer, primary_key=True, index=True)
    vendor_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    contact_person = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    phone = Column(String, nullable=False)
    address = Column(String, nullable=False)
    status = Column(String, default='Pending', nullable=False)
    website = Column(String, default='')
    registration_date = Column(String, default='')
    approval_date = Column(String, default='')

class ProcurementRequest(Base):
    __tablename__ = 'procurement_requests'
    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    department = Column(String, nullable=False)
    requested_by = Column(String, nullable=False)
    priority = Column(String, default='Medium')
    status = Column(String, default='Pending', nullable=False)
    vendor_name = Column(String, default='')
    estimated_cost = Column(Integer, default=0)
    approval_comment = Column(String, default='')

class PurchaseOrder(Base):
    __tablename__ = 'purchase_orders'
    id = Column(Integer, primary_key=True, index=True)
    vendor_name = Column(String, nullable=False)
    product_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    total_amount = Column(Integer, nullable=False)
    status = Column(String, default='Pending', nullable=False)
    expected_delivery_date = Column(String, default='')
    actual_delivery_date = Column(String, default='')
    invoice_status = Column(String, default='Pending')
    proof_of_delivery = Column(String, default='')

class Invoice(Base):
    __tablename__ = 'invoices'
    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, nullable=False)
    vendor_name = Column(String, nullable=False)
    invoice_number = Column(String, nullable=False)
    amount = Column(Integer, default=0)
    status = Column(String, default='Pending')
    invoice_date = Column(String, default='')
    due_date = Column(String, default='')
    document_path = Column(String, default='')

class VendorPerformance(Base):
    __tablename__ = 'vendor_performance'
    id = Column(Integer, primary_key=True, index=True)
    vendor_name = Column(String, nullable=False)
    delivery_score = Column(Integer, nullable=False)
    quality_score = Column(Integer, nullable=False)
    reliability_score = Column(Integer, nullable=False)
    overall_score = Column(Integer, nullable=False)
    on_time_deliveries = Column(Integer, default=0, nullable=False)
    delayed_deliveries = Column(Integer, default=0, nullable=False)
    response_time_hours = Column(Integer, default=0, nullable=False)
    issue_resolution_time_hours = Column(Integer, default=0, nullable=False)
    service_rating = Column(Integer, default=0, nullable=False)
    order_completion_rate = Column(Integer, default=0, nullable=False)
    performance_period = Column(String, default='Current', nullable=False)

class PerformanceHistory(Base):
    __tablename__ = 'performance_history'
    id = Column(Integer, primary_key=True, index=True)
    vendor_name = Column(String, nullable=False)
    period = Column(String, nullable=False)
    overall_score = Column(Integer, default=0)
    delivery_score = Column(Integer, default=0)
    quality_score = Column(Integer, default=0)
    service_rating = Column(Integer, default=0)
    response_time_hours = Column(Integer, default=0)
    issue_resolution_time_hours = Column(Integer, default=0)
    order_completion_rate = Column(Integer, default=0)

class Contract(Base):
    __tablename__ = 'contracts'
    id = Column(Integer, primary_key=True, index=True)
    vendor_name = Column(String, nullable=False)
    contract_title = Column(String, nullable=False)
    start_date = Column(String, nullable=False)
    expiry_date = Column(String, nullable=False)
    renewal_notice_period = Column(Integer, default=30)
    terms = Column(Text, default='')
    compliance_flag = Column(String, default='Active')
    document_path = Column(String, default='')
    status = Column(String, default='Active')

class Certification(Base):
    __tablename__ = 'certifications'
    id = Column(Integer, primary_key=True, index=True)
    vendor_name = Column(String, nullable=False)
    certification_name = Column(String, nullable=False)
    certificate_number = Column(String, default='')
    issue_date = Column(String, default='')
    expiry_date = Column(String, default='')
    status = Column(String, default='Valid')
    document_path = Column(String, default='')

class VendorDocument(Base):
    __tablename__ = 'vendor_documents'
    id = Column(Integer, primary_key=True, index=True)
    vendor_name = Column(String, nullable=False)
    document_type = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, default='')
    uploaded_by = Column(String, default='')
    uploaded_at = Column(DateTime, default=datetime.utcnow)

class Communication(Base):
    __tablename__ = 'communications'
    id = Column(Integer, primary_key=True, index=True)
    vendor_name = Column(String, nullable=False)
    sender = Column(String, nullable=False)
    recipient = Column(String, default='')
    subject = Column(String, default='')
    message = Column(Text, nullable=False)
    channel = Column(String, default='In-App')
    file_name = Column(String, default='')
    created_at = Column(DateTime, default=datetime.utcnow)

class ActivityLog(Base):
    __tablename__ = 'activity_logs'
    id = Column(Integer, primary_key=True, index=True)
    actor = Column(String, nullable=False)
    action = Column(String, nullable=False)
    module = Column(String, nullable=False)
    details = Column(Text, default='')
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = 'notifications'
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, default='')
    notification_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String, default='info')
    channel = Column(String, default='In-App')
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
