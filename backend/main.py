from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Callable
import io
import csv

import models, database, services

# Create tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="VendorIntel API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas for Requests/Responses
class LoginRequest(BaseModel):
    email: str
    password: str

class VendorRegisterRequest(BaseModel):
    company_name: str
    email: str
    password: str
    category: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        orm_mode = True

class VendorCreate(BaseModel):
    company_name: str
    contact_email: str
    approval_status: str = "Pending"
    rating: float = 0.0
    risk_level: str = "Low"
    delivery_rate: float = 100.0
    quality_score: float = 100.0

class VendorResponse(VendorCreate):
    id: int
    user_id: Optional[int] = None
    vendor_code: Optional[str] = None
    gstin: Optional[str] = None
    category: Optional[str] = None

    class Config:
        orm_mode = True

class ApprovalStatusUpdate(BaseModel):
    approval_status: str

class VendorUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_email: Optional[str] = None
    category: Optional[str] = None
    risk_level: Optional[str] = None
    rating: Optional[float] = None
    delivery_rate: Optional[float] = None
    quality_score: Optional[float] = None

from datetime import date, datetime

class ProcurementRequestCreate(BaseModel):
    request_number: str
    department: str
    estimated_cost: float = 0.0
    total_cost: float = 0.0
    approval_status: str = "Pending"

class ProcurementRequestResponse(ProcurementRequestCreate):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

class PRItemCreate(BaseModel):
    item_details: str
    quantity: int
    estimated_cost: float

class PRItemResponse(PRItemCreate):
    id: int

    class Config:
        orm_mode = True

class PurchaseOrderCreate(BaseModel):
    pr_id: Optional[int] = None
    vendor_id: int
    po_number: str
    fulfillment_status: str = "In Progress"

class PurchaseOrderResponse(PurchaseOrderCreate):
    id: int
    invoice_url: Optional[str] = None
    receipt_url: Optional[str] = None
    created_timestamp: datetime
    total_amount: Optional[float] = 0.0

    class Config:
        orm_mode = True

class POStatusUpdate(BaseModel):
    fulfillment_status: str

class UploadInvoiceRequest(BaseModel):
    invoice_receipt_url: str

class ContractCreate(BaseModel):
    vendor_id: int
    start_date: date
    expiry_date: date
    renewal_notice_days: int = 30
    compliance_flags: Optional[str] = None

class ContractResponse(ContractCreate):
    id: int
    document_url: Optional[str] = None
    status: str

    class Config:
        orm_mode = True

class UploadContractRequest(BaseModel):
    document_url: str

class MessageCreate(BaseModel):
    content: str

class MessageResponse(MessageCreate):
    id: int
    sender_id: int
    timestamp: datetime

    class Config:
        orm_mode = True

class MessageThreadResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    created_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        orm_mode = True

class AuditLogResponse(BaseModel):
    id: int
    action: str
    entity_type: str
    entity_id: int
    user_id: Optional[int]
    timestamp: datetime

    class Config:
        orm_mode = True

class PerformanceLogCreate(BaseModel):
    vendor_id: int
    po_number: Optional[str] = None
    promised_delivery_date: Optional[date] = None
    actual_delivery_date: Optional[date] = None
    ordered_quantity: int = 0
    accepted_quantity: int = 0
    service_rating: float = 0.0

class PerformanceLogResponse(PerformanceLogCreate):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

class DisputeCreate(BaseModel):
    vendor_id: int
    title: str
    description: str
    status: str = "Open"

class DisputeResponse(DisputeCreate):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

# --- Auth ---

from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import timedelta
import bcrypt

SECRET_KEY = "super_secret_key_for_vendorintel"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user or not verify_password(req.password[:72], user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if user.role == "vendor":
        vendor = db.query(models.Vendor).filter(models.Vendor.user_id == user.id).first()
        if vendor and vendor.approval_status == "Pending":
            raise HTTPException(status_code=403, detail="Your account is pending admin approval.")
        if vendor and vendor.approval_status == "Rejected":
            raise HTTPException(status_code=403, detail="Your account has been rejected.")
            
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    return {
        "success": True,
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
    }

@app.post("/api/auth/register_vendor")
def register_vendor(req: VendorRegisterRequest, db: Session = Depends(database.get_db)):
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == req.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    new_user = models.User(
        name=req.company_name + " Rep",
        email=req.email,
        password_hash=get_password_hash(req.password),
        role="vendor"
    )
    db.add(new_user)
    db.flush() # Get user ID

    # Create associated vendor profile
    new_vendor = models.Vendor(
        user_id=new_user.id,
        company_name=req.company_name,
        contact_email=req.email,
        category=req.category or "General",
        approval_status="Pending",
        risk_level="Low"
    )
    db.add(new_vendor)
    db.commit()

    return {"success": True, "message": "Vendor registration submitted successfully and is pending approval."}

# --- RBAC Dependencies ---

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: models.User = Depends(get_current_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(status_code=403, detail="Operation not permitted for this role")
        return user

allow_all_authenticated = RoleChecker(["admin", "procumentor", "vendor", "auditor", "finance", "supply_chain"])
allow_admin_procumentor = RoleChecker(["admin", "procumentor", "finance", "supply_chain"])
allow_read_only_and_above = RoleChecker(["admin", "procumentor", "auditor", "vendor", "finance", "supply_chain"])
allow_admin_only = RoleChecker(["admin"])

# --- Endpoints ---

@app.get("/")
def root():
    return {"message": "VendorIntel API is running"}

@app.get("/api/vendors", response_model=List[VendorResponse])
def get_vendors(db: Session = Depends(database.get_db)):
    vendors = db.query(models.Vendor).all()
    return vendors

@app.post("/api/vendors", response_model=VendorResponse)
def create_vendor(vendor: VendorCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_admin_procumentor)):
    # Check if a user already exists for this email
    existing_user = db.query(models.User).filter(models.User.email == vendor.contact_email).first()
    
    if not existing_user:
        # Create new user for the vendor with default password "1234"
        existing_user = models.User(
            name=vendor.company_name + " Rep",
            email=vendor.contact_email,
            password_hash=get_password_hash("1234"),
            role="vendor"
        )
        db.add(existing_user)
        db.flush() # Get user ID
        
    db_vendor = models.Vendor(**vendor.dict())
    db_vendor.user_id = existing_user.id
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

@app.put("/api/vendors/{vendor_id}/status", response_model=VendorResponse)
def update_vendor_status(vendor_id: int, status_update: ApprovalStatusUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_admin_procumentor)):
    db_vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    old_status = db_vendor.approval_status
    db_vendor.approval_status = status_update.approval_status
    db.commit()
    db.refresh(db_vendor)
    
    services.AuditService.log_action(db, f"Vendor {vendor_id} status changed from {old_status} to {status_update.approval_status}", "Vendor", vendor_id, current_user.id)
    return db_vendor

@app.put("/api/vendors/{vendor_id}", response_model=VendorResponse)
def update_vendor(vendor_id: int, vendor_update: VendorUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_admin_procumentor)):
    db_vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    update_data = vendor_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_vendor, key, value)
        
    db.commit()
    db.refresh(db_vendor)
    services.AuditService.log_action(db, f"Vendor {vendor_id} profile updated", "Vendor", vendor_id, current_user.id)
    return db_vendor

@app.get("/api/vendors/{vendor_id}/performance")
def get_vendor_performance(vendor_id: int, db: Session = Depends(database.get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    orders = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.vendor_id == vendor_id).all()
    
    total_orders = len(orders)
    completed_orders = sum(1 for o in orders if o.fulfillment_status == 'Delivered')
    pending_orders = sum(1 for o in orders if o.fulfillment_status in ['Pending', 'In Progress'])
    
    logs = db.query(models.PerformanceLog).filter(models.PerformanceLog.vendor_id == vendor_id).all()
    
    if logs:
        delayed_orders = sum(1 for log in logs if log.actual_delivery_date and log.promised_delivery_date and log.actual_delivery_date > log.promised_delivery_date)
        on_time_pct = ((len(logs) - delayed_orders) / len(logs) * 100) if len(logs) > 0 else 100
        avg_delivery_time = sum((log.actual_delivery_date - log.created_at.date()).days for log in logs if log.actual_delivery_date) / len(logs) if logs else 3.5
        quality = sum(log.service_rating for log in logs) / len(logs) if logs else 4.5
    else:
        delayed_orders = int(total_orders * 0.1)
        on_time_pct = vendor.delivery_rate if vendor.delivery_rate else 100
        avg_delivery_time = 4.2
        quality = vendor.quality_score / 20 if vendor.quality_score else 4.5
        
    completion_rate = (completed_orders / total_orders * 100) if total_orders > 0 else 100
    delivery_score = on_time_pct * 0.40
    completion_score = completion_rate * 0.25
    quality_score = (quality * 20 if quality <= 5 else quality) * 0.20
    response_score = 95 * 0.15 # 95% assumed response rate
    
    total_score = min(100, delivery_score + completion_score + quality_score + response_score)
    
    if total_score >= 80:
        risk_level = "Reliable"
        vendor.risk_level = "Low"
    elif total_score >= 60:
        risk_level = "Moderate Risk"
        vendor.risk_level = "Medium"
    else:
        risk_level = "High Risk"
        vendor.risk_level = "High"
        
    vendor.rating = total_score / 20
    db.commit()
        
    return {
        "total_orders": total_orders,
        "completed_orders": completed_orders,
        "pending_orders": pending_orders,
        "delayed_orders": delayed_orders,
        "on_time_delivery_pct": round(on_time_pct, 1),
        "average_delivery_days": round(avg_delivery_time, 1),
        "reliability_score": round(total_score, 1),
        "risk_level": risk_level,
        "breakdown": {
            "delivery": round(delivery_score, 1),
            "completion": round(completion_score, 1),
            "quality": round(quality_score, 1),
            "response": round(response_score, 1)
        }
    }

@app.get("/api/procurement_requests", response_model=List[ProcurementRequestResponse], tags=["Procurement"])
def get_procurement_requests(db: Session = Depends(database.get_db)):
    return db.query(models.ProcurementRequest).all()

@app.post("/api/procurement_requests", response_model=ProcurementRequestResponse, tags=["Procurement"])
def create_procurement_request(req: ProcurementRequestCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_admin_procumentor)):
    db_pr = models.ProcurementRequest(**req.dict())
    db.add(db_pr)
    db.commit()
    db.refresh(db_pr)
    services.AuditService.log_action(db, f"Created PR {db_pr.request_number}", "ProcurementRequest", db_pr.id, current_user.id)
    return db_pr

@app.put("/api/procurement_requests/{pr_id}/status", response_model=ProcurementRequestResponse, tags=["Procurement"])
def update_pr_status(pr_id: int, status_update: ApprovalStatusUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_admin_procumentor)):
    db_pr = db.query(models.ProcurementRequest).filter(models.ProcurementRequest.id == pr_id).first()
    if not db_pr:
        raise HTTPException(status_code=404, detail="PR not found")
    old_status = db_pr.approval_status
    db_pr.approval_status = status_update.approval_status
    db.commit()
    db.refresh(db_pr)
    services.AuditService.log_action(db, f"PR status changed from {old_status} to {status_update.approval_status}", "ProcurementRequest", pr_id, current_user.id)
    services.NotificationService.send_notification("procurement_manager@vendorintel.local", f"PR {db_pr.request_number} status updated", f"Status changed to {status_update.approval_status}")
    return db_pr

@app.post("/api/procurement_requests/{pr_id}/items", response_model=PRItemResponse, tags=["Procurement"])
def add_pr_item(pr_id: int, item: PRItemCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_admin_procumentor)):
    db_pr = db.query(models.ProcurementRequest).filter(models.ProcurementRequest.id == pr_id).first()
    if not db_pr:
        raise HTTPException(status_code=404, detail="PR not found")
    
    db_item = models.PRItem(**item.dict(), pr_id=pr_id)
    db.add(db_item)
    db_pr.total_cost += (item.quantity * item.estimated_cost)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/api/purchase_orders", response_model=List[PurchaseOrderResponse], tags=["Orders"])
def get_purchase_orders(db: Session = Depends(database.get_db)):
    return db.query(models.PurchaseOrder).all()

@app.post("/api/purchase_orders", response_model=PurchaseOrderResponse, tags=["Orders"])
def create_purchase_order(req: PurchaseOrderCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_admin_procumentor)):
    db_po = models.PurchaseOrder(**req.dict())
    db.add(db_po)
    
    if req.pr_id:
        db_pr = db.query(models.ProcurementRequest).filter(models.ProcurementRequest.id == req.pr_id).first()
        if db_pr:
            db_pr.approval_status = "Ordered"
            
    db.commit()
    db.refresh(db_po)
    services.AuditService.log_action(db, f"Created PO {db_po.po_number}", "PurchaseOrder", db_po.id, current_user.id)
    
    vendor = db.query(models.Vendor).filter(models.Vendor.id == req.vendor_id).first()
    if vendor and vendor.contact_email:
        services.NotificationService.send_notification(vendor.contact_email, f"New Purchase Order {db_po.po_number}", "A new Purchase Order has been assigned to you.")
        
    return db_po

@app.put("/api/purchase_orders/{po_id}/status", response_model=PurchaseOrderResponse, tags=["Orders"])
def update_po_status(po_id: int, status_update: POStatusUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_read_only_and_above)):
    db_po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not db_po:
        raise HTTPException(status_code=404, detail="PO not found")
    
    old_status = db_po.fulfillment_status
    db_po.fulfillment_status = status_update.fulfillment_status
    
    if status_update.fulfillment_status == "Delivered" and db_po.pr_id:
        db_pr = db.query(models.ProcurementRequest).filter(models.ProcurementRequest.id == db_po.pr_id).first()
        if db_pr:
            db_pr.approval_status = "Delivered"
            
    db.commit()
    db.refresh(db_po)
    services.AuditService.log_action(db, f"PO status changed from {old_status} to {status_update.fulfillment_status}", "PurchaseOrder", po_id, current_user.id)
    services.NotificationService.send_notification("procurement_manager@vendorintel.local", f"PO {db_po.po_number} status updated", f"PO fulfillment status changed to {status_update.fulfillment_status}")
    return db_po

@app.post("/api/purchase_orders/{po_id}/upload", response_model=PurchaseOrderResponse, tags=["Orders"])
def upload_po_invoice(po_id: int, req: UploadInvoiceRequest, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_read_only_and_above)):
    db_po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not db_po:
        raise HTTPException(status_code=404, detail="PO not found")
    db_po.invoice_url = req.invoice_receipt_url
    db.commit()
    db.refresh(db_po)
    services.AuditService.log_action(db, f"Uploaded Invoice for PO {po_id}", "PurchaseOrder", po_id, current_user.id)
    return db_po

@app.get("/api/contracts", response_model=List[ContractResponse], tags=["Contracts"])
def get_contracts(db: Session = Depends(database.get_db)):
    return db.query(models.Contract).all()

@app.post("/api/contracts", response_model=ContractResponse, tags=["Contracts"])
def create_contract(req: ContractCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_admin_procumentor)):
    db_contract = models.Contract(**req.dict())
    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)
    services.AuditService.log_action(db, f"Created Contract for Vendor {db_contract.vendor_id}", "Contract", db_contract.id, current_user.id)
    return db_contract

@app.post("/api/contracts/{contract_id}/upload", response_model=ContractResponse, tags=["Contracts"])
def upload_contract_doc(contract_id: int, req: UploadContractRequest, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_admin_procumentor)):
    db_contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    db_contract.document_url = req.document_url
    db.commit()
    db.refresh(db_contract)
    services.AuditService.log_action(db, f"Uploaded Contract Document for {contract_id}", "Contract", contract_id, current_user.id)
    return db_contract

@app.get("/api/threads/{entity_type}/{entity_id}", response_model=MessageThreadResponse, tags=["Communication"])
def get_or_create_thread(entity_type: str, entity_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_read_only_and_above)):
    thread = db.query(models.MessageThread).filter(models.MessageThread.entity_type == entity_type, models.MessageThread.entity_id == entity_id).first()
    if not thread:
        thread = models.MessageThread(entity_type=entity_type, entity_id=entity_id)
        db.add(thread)
        db.commit()
        db.refresh(thread)
    return thread

@app.post("/api/threads/{thread_id}/messages", response_model=MessageResponse, tags=["Communication"])
def post_message(thread_id: int, req: MessageCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_read_only_and_above)):
    thread = db.query(models.MessageThread).filter(models.MessageThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    msg = models.Message(thread_id=thread_id, sender_id=current_user.id, content=req.content)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg

@app.get("/api/audit_logs", response_model=List[AuditLogResponse], tags=["Communication"])
def get_audit_logs(db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_admin_only)):
    return db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).all()

@app.get("/api/v1/reports/csv", tags=["Reports"])
def export_vendors_csv(
    category: Optional[str] = None,
    risk_level: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    query = db.query(models.Vendor)
    if category:
        query = query.filter(models.Vendor.category == category)
    if risk_level:
        query = query.filter(models.Vendor.risk_level == risk_level)
    
    vendors = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Vendor ID", "Company Name", "Vendor Code", "Category", 
        "Status", "Risk Level", "Quality Score", "Delivery Rate", "Rating"
    ])
    for v in vendors:
        writer.writerow([
            v.id, v.company_name, v.vendor_code, v.category,
            v.approval_status, v.risk_level, v.quality_score, v.delivery_rate, v.rating
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv", 
        headers={"Content-Disposition": "attachment; filename=vendor_risk_analysis.csv"}
    )

@app.get("/api/v1/reports/pdf", tags=["Reports"])
def export_vendors_pdf(db: Session = Depends(database.get_db)):
    try:
        from fpdf import FPDF
    except ImportError:
        raise HTTPException(status_code=500, detail="fpdf2 is not installed.")

    vendors = db.query(models.Vendor).all()
    total_vendors = len(vendors)
    high_risk_count = sum(1 for v in vendors if v.risk_level == "High")
    avg_rating = sum(v.rating for v in vendors) / total_vendors if total_vendors > 0 else 0

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", style="B", size=16)
    pdf.cell(200, 10, txt="VendorIntel - Platform Performance Report", ln=True, align='C')
    pdf.ln(10)

    pdf.set_font("Helvetica", size=12)
    pdf.cell(200, 10, txt=f"Total Active Vendors: {total_vendors}", ln=True)
    pdf.cell(200, 10, txt=f"High Risk Vendors: {high_risk_count}", ln=True)
    pdf.cell(200, 10, txt=f"Average Reliability Score: {avg_rating:.1f} / 5.0", ln=True)
    pdf.ln(10)

    pdf.set_font("Helvetica", style="B", size=10)
    pdf.cell(60, 10, "Company Name", 1)
    pdf.cell(40, 10, "Category", 1)
    pdf.cell(30, 10, "Risk Level", 1)
    pdf.cell(30, 10, "Rating", 1)
    pdf.ln()

    pdf.set_font("Helvetica", size=10)
    for v in vendors[:25]:
        pdf.cell(60, 10, str(v.company_name)[:20], 1)
        pdf.cell(40, 10, str(v.category)[:15], 1)
        pdf.cell(30, 10, str(v.risk_level), 1)
        pdf.cell(30, 10, f"{v.rating:.1f}", 1)
        pdf.ln()

    pdf_bytes = pdf.output(dest='S')
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes), 
        media_type="application/pdf", 
        headers={"Content-Disposition": "attachment; filename=platform_report.pdf"}
    )

@app.post("/api/performance_logs", response_model=PerformanceLogResponse, tags=["Dashboard"])
def submit_performance_log(log: PerformanceLogCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_admin_procumentor)):
    db_vendor = db.query(models.Vendor).filter(models.Vendor.id == log.vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    db_log = models.PerformanceLog(**log.dict())
    db.add(db_log)
    
    # Recalculate OTD (On-Time Delivery) and PQR (Product Quality Rate)
    # Simple mock logic for demonstration:
    if log.promised_delivery_date and log.actual_delivery_date:
        if log.actual_delivery_date <= log.promised_delivery_date:
            db_vendor.delivery_rate = min(100.0, db_vendor.delivery_rate + 2.0)
        else:
            db_vendor.delivery_rate = max(0.0, db_vendor.delivery_rate - 5.0)
            
    if log.ordered_quantity > 0:
        defect_rate = (log.ordered_quantity - log.accepted_quantity) / log.ordered_quantity
        if defect_rate == 0:
            db_vendor.quality_score = min(100.0, db_vendor.quality_score + 2.0)
        else:
            db_vendor.quality_score = max(0.0, db_vendor.quality_score - (defect_rate * 100))
            
    # Update Overall Rating and Risk Level
    db_vendor.rating = (db_vendor.delivery_rate + db_vendor.quality_score + (log.service_rating * 20)) / 300 * 5.0
    
    if db_vendor.rating < 2.5:
        db_vendor.risk_level = "High"
    elif db_vendor.rating < 3.8:
        db_vendor.risk_level = "Medium"
    else:
        db_vendor.risk_level = "Low"
        
    db.commit()
    db.refresh(db_log)
    return db_log

@app.get("/api/dashboard/telemetry", tags=["Dashboard"])
def get_dashboard_telemetry(db: Session = Depends(database.get_db)):
    vendors = db.query(models.Vendor).all()
    active_vendors = sum(1 for v in vendors if v.approval_status in ['Active', 'Approved'])
    avg_score = sum(v.rating for v in vendors) / len(vendors) if vendors else 0.0
    critical_risk = sum(1 for v in vendors if v.risk_level == "High" or v.rating < 2.5)
    
    open_disputes = db.query(models.Dispute).filter(models.Dispute.status == "Open").count()
    
    return {
        "active_vendors": active_vendors,
        "platform_avg_reliability": round(avg_score * 20, 1), # out of 100
        "critical_risk_count": critical_risk,
        "open_disputes": open_disputes
    }

@app.get("/api/dashboard/charts", tags=["Dashboard"])
def get_dashboard_charts(db: Session = Depends(database.get_db)):
    # Mock time-series data for the trend chart
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    reliability_trend = [78, 82, 80, 85, 87, 89]
    quality_trend = [85, 84, 88, 86, 90, 92]
    
    # Risk Distribution Pie Chart
    vendors = db.query(models.Vendor).all()
    low = sum(1 for v in vendors if v.risk_level == "Low")
    med = sum(1 for v in vendors if v.risk_level == "Medium")
    high = sum(1 for v in vendors if v.risk_level == "High")
    
    return {
        "trend_labels": months,
        "reliability_data": reliability_trend,
        "quality_data": quality_trend,
        "risk_distribution": {
            "Low": low,
            "Moderate": med,
            "High": high,
            "Critical": 0
        }
    }

@app.get("/api/disputes", tags=["Dashboard"])
def get_disputes(db: Session = Depends(database.get_db)):
    return db.query(models.Dispute).all()

@app.post("/api/disputes", response_model=DisputeResponse, tags=["Dashboard"])
def create_dispute(dispute: DisputeCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_admin_procumentor)):
    db_dispute = models.Dispute(**dispute.dict())
    db.add(db_dispute)
    db.commit()
    db.refresh(db_dispute)
    return db_dispute


# --- MILESTONE 3: INTELLIGENCE APIs ---

@app.get("/api/intelligence/risk_trend/{vendor_id}")
def get_risk_trend(vendor_id: int, db: Session = Depends(database.get_db)):
    history = db.query(models.VendorRiskHistory).filter(models.VendorRiskHistory.vendor_id == vendor_id).order_by(models.VendorRiskHistory.calculated_at.asc()).all()
    return [{"score": h.score, "risk_level": h.risk_level, "date": h.calculated_at.strftime("%b %d")} for h in history]

@app.get("/api/intelligence/notifications")
def get_notifications(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    notes = db.query(models.Notification).filter(models.Notification.user_id == current_user.id).order_by(models.Notification.created_at.desc()).limit(10).all()
    return [{"id": n.id, "type": n.type, "title": n.title, "message": n.message, "severity": n.severity, "is_read": n.is_read, "date": n.created_at.strftime("%Y-%m-%d %H:%M")} for n in notes]

@app.get("/api/analytics/supply_chain")
def supply_chain_analytics(db: Session = Depends(database.get_db)):
    pos = db.query(models.PurchaseOrder).all()
    deliveries = db.query(models.DeliveryTracking).all()
    total = len(pos)
    in_transit = len([d for d in deliveries if d.status == "In Transit" or d.status == "Shipped"])
    delivered = len([d for d in deliveries if d.status == "Delivered"])
    delayed = len([d for d in deliveries if d.status == "Delayed"])
    return {
        "total_pos": total,
        "in_transit": in_transit,
        "delivered": delivered,
        "delayed": delayed,
        "on_time_pct": round((delivered/(delivered+delayed))*100, 1) if (delivered+delayed) > 0 else 100.0,
        "avg_delay": round(sum(d.delay_days for d in deliveries if d.delay_days > 0) / max(delayed, 1), 1)
    }

@app.get("/api/analytics/finance")
def finance_analytics(db: Session = Depends(database.get_db)):
    prs = db.query(models.ProcurementRequest).all()
    invoices = db.query(models.Invoice).all()
    
    total_procurement = sum(pr.total_cost for pr in prs)
    approved_spending = sum(pr.total_cost for pr in prs if pr.approval_status == 'Approved')
    pending_approval = sum(pr.total_cost for pr in prs if pr.approval_status == 'Pending')
    invoice_amount = sum(inv.amount for inv in invoices)
    outstanding = sum(inv.amount for inv in invoices if inv.status != 'Paid')
    
    return {
        "total_procurement": total_procurement,
        "approved_spending": approved_spending,
        "pending_approval": pending_approval,
        "invoice_amount": invoice_amount,
        "outstanding": outstanding
    }

@app.post("/api/intelligence/calculate_score/{vendor_id}")
def calculate_score(vendor_id: int, db: Session = Depends(database.get_db)):
    v = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    deliveries = db.query(models.DeliveryTracking).filter(models.DeliveryTracking.vendor_id == vendor_id).all()
    if not deliveries:
        return {"score": v.rating * 20, "risk_level": v.risk_level}
        
    on_time = len([d for d in deliveries if d.status == 'Delivered' and d.delay_days == 0])
    total_del = len([d for d in deliveries if d.status == 'Delivered' or d.status == 'Delayed'])
    
    on_time_pct = (on_time / total_del * 100) if total_del > 0 else 100
    completion_pct = 95.0
    quality = v.quality_score
    compliance = 100.0
    invoice_acc = 98.0
    
    # Weighting
    score = (0.30 * on_time_pct) + (0.25 * completion_pct) + (0.20 * quality) + (0.15 * compliance) + (0.10 * invoice_acc)
    
    risk_level = "Low" if score >= 80 else ("Medium" if score >= 60 else "High")
    
    # Check if we transitioned to High risk
    if risk_level == "High" and v.risk_level != "High":
        # Notify Admin
        admin_users = db.query(models.User).filter(models.User.role == 'admin').all()
        for admin in admin_users:
            db.add(models.Notification(
                user_id=admin.id,
                type="Risk Alert",
                title=f"High Risk Contract Alert",
                message=f"Vendor {v.company_name} risk level dropped to High (Score: {round(score,1)}). Please review active contracts.",
                severity="Critical"
            ))
        # Notify Vendor
        if v.user_id:
            db.add(models.Notification(
                user_id=v.user_id,
                type="Risk Alert",
                title=f"High Risk Warning",
                message=f"Your reliability score has dropped to {round(score,1)} (High Risk). Your contracts are under review.",
                severity="Critical"
            ))
    
    v.risk_level = risk_level
    # Save history
    db.add(models.VendorRiskHistory(vendor_id=vendor_id, score=score, risk_level=risk_level))
    db.commit()
    
    return {"score": round(score, 1), "risk_level": risk_level, "details": {
        "on_time_delivery": round(on_time_pct, 1),
        "completion_rate": completion_pct,
        "quality_score": quality,
        "compliance": compliance,
        "invoice_accuracy": invoice_acc
    }}


# --- MILESTONE 3: INTERACTIVE ACTIONS ---

@app.post("/api/procurement_requests/{pr_id}/approve")
def approve_pr(pr_id: int, db: Session = Depends(database.get_db)):
    pr = db.query(models.ProcurementRequest).filter(models.ProcurementRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="PR not found")
    pr.approval_status = "Approved"
    
    # Auto-generate PO for demo interactivity
    vendor = db.query(models.Vendor).first() # Assign to first vendor for simplicity
    if vendor:
        po = models.PurchaseOrder(
            pr_id=pr.id,
            vendor_id=vendor.id,
            po_number=f"PO-{pr.request_number}",
            fulfillment_status="In Progress"
        )
        db.add(po)
        db.commit()
        
        # Create DeliveryTracking for the new PO
        dt = models.DeliveryTracking(
            po_id=po.id,
            vendor_id=vendor.id,
            status="Pending"
        )
        db.add(dt)
        db.commit()
    
    db.commit()
    return {"success": True, "message": "PR Approved and PO generated"}

@app.post("/api/delivery/{po_id}/status")
def update_delivery_status(po_id: int, status: str, db: Session = Depends(database.get_db)):
    dt = db.query(models.DeliveryTracking).filter(models.DeliveryTracking.po_id == po_id).first()
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not dt or not po:
        raise HTTPException(status_code=404, detail="Delivery tracking not found")
    
    dt.status = status
    po.fulfillment_status = status
    
    if status == "Delayed":
        dt.delay_days += 2 # Add arbitrary delay for demo
        # Notify Admin/Supply chain
        admin_user = db.query(models.User).filter(models.User.role == 'admin').first()
        if admin_user:
            db.add(models.Notification(
                user_id=admin_user.id,
                type="Risk Alert",
                title=f"PO {po.po_number} Delayed",
                message=f"Vendor {po.vendor_id} has delayed the shipment.",
                severity="Critical"
            ))
            
    db.commit()
    
    # Trigger Intelligence Score Recalculation
    calculate_score(po.vendor_id, db)
    
    return {"success": True, "message": f"Status updated to {status}"}

@app.post("/api/purchase_orders/{po_id}/invoice")
def submit_invoice(po_id: int, db: Session = Depends(database.get_db)):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    
    inv = db.query(models.Invoice).filter(models.Invoice.po_id == po_id).first()
    if inv:
        inv.status = "Paid"
    else:
        inv = models.Invoice(
            po_id=po.id,
            vendor_id=po.vendor_id,
            invoice_number=f"INV-{po.po_number}",
            amount=po.total_amount if po.total_amount else 1500.0,
            status="Paid"
        )
        db.add(inv)
        
    po.invoice_url = f"/invoices/{po.po_number}.pdf"
    
    db.commit()
    
    # Trigger Score Recalculation
    calculate_score(po.vendor_id, db)
    
    return {"success": True, "message": "Invoice Submitted and Paid"}


from pydantic import BaseModel
class PRCreateRequest(BaseModel):
    department: str
    estimated_cost: float
    details: str

@app.post("/api/procurement_requests")
def create_pr(req: PRCreateRequest, db: Session = Depends(database.get_db)):
    import random
    pr = models.ProcurementRequest(
        request_number=f"PR-{random.randint(10000, 99999)}",
        department=req.department,
        estimated_cost=req.estimated_cost,
        total_cost=req.estimated_cost * random.uniform(0.9, 1.1),
        approval_status="Pending"
    )
    db.add(pr)
    db.commit()
    return {"success": True, "message": "Department PR Created Successfully", "pr_id": pr.id}
