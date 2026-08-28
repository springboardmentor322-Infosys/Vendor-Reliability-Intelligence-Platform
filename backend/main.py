import random
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, status, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime
from pydantic import BaseModel, Field
from sqlalchemy import func
import models, schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Vendor Reliability Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

ACTIVE_SESSIONS = {}

# --- Dynamic Score Calculation Functions ---

def calculate_reliability_score(po, db: Session) -> tuple[int, str]:
    base_score = 100
    
    past_orders = db.query(models.PurchaseOrder).filter(
        models.PurchaseOrder.vendor_name == po.vendor_name,
        models.PurchaseOrder.id != po.id
    ).all()
    
    total_past_orders = len(past_orders)
    
    if total_past_orders > 0:
        delayed_past_orders = sum(
            1 for o in past_orders 
            if o.production_status and ("delay" in o.production_status.lower() or "cancel" in o.production_status.lower())
        )
        delay_ratio = delayed_past_orders / total_past_orders
        base_score -= int(delay_ratio * 20)
        
    if po.quantity and po.quantity > 0:
        completed = po.completed_units or 0
        if completed < po.quantity:
            shortage_ratio = (po.quantity - completed) / po.quantity
            base_score -= int(shortage_ratio * 30)
            
    prod_status = str(po.production_status or po.order_status or "").lower()
    if "delay" in prod_status or "pending" in prod_status:
        base_score -= 15
    elif "cancel" in prod_status:
        base_score -= 40

    if po.creation_date and po.expiry_date:
        try:
            created_dt = datetime.strptime(str(po.creation_date).split()[0], "%Y-%m-%d")
            expiry_dt = datetime.strptime(str(po.expiry_date).split()[0], "%Y-%m-%d")
            today = datetime.now()
            
            days_to_expiry = (expiry_dt - today).days
            
            if days_to_expiry < 0:
                base_score -= 35
            elif days_to_expiry <= 7:
                base_score -= 15
        except Exception:
            pass

    final_score = max(0, min(100, base_score))

    if final_score >= 90:
        risk_tier = "Low Risk"
    elif final_score >= 75:
        risk_tier = "Medium Risk"
    else:
        risk_tier = "High Risk"
        
    return final_score, risk_tier


def compute_vendor_dynamic_score(vendor_name: str, db: Session) -> tuple[float, str]:
    orders = db.query(models.PurchaseOrder).filter(
        models.PurchaseOrder.vendor_name == vendor_name
    ).all()
    
    if not orders:
        return 100.0, "Low Risk"
        
    total_score = 0.0
    for po in orders:
        score, _ = calculate_reliability_score(po, db)
        total_score += score
        
    avg_score = round(total_score / len(orders), 2)
    
    if avg_score >= 90:
        risk_tier = "Low Risk"
    elif avg_score >= 75:
        risk_tier = "Medium Risk"
    else:
        risk_tier = "High Risk"
        
    return avg_score, risk_tier


# --- User Management Routes ---

@app.post("/register")
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    initial_status = "approved" if user.role == "admin" else "pending"

    new_user = models.User(
        fullname=user.fullname,
        email=user.email,
        phone=user.phone,
        role=user.role,
        hashed_password=hash_password(user.password),
        status=initial_status
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_entry = models.SystemLog(
        event_type="Pending Approval",
        description=f"{user.fullname} ({user.email}) requested a {user.role.replace('_', ' ').title()} account."
    )
    db.add(log_entry)
    db.commit()

    role_str = str(user.role or "").strip().lower()

    if "vendor" in role_str:
        existing_vendor = db.query(models.Vendor).filter(
            (models.Vendor.vendor_name == user.fullname) | (models.Vendor.email == user.email)
        ).first()

        if not existing_vendor:
            new_vendor = models.Vendor(
                vendor_name=user.fullname,
                contact_person=user.fullname,
                email=user.email,
                phone=user.phone if hasattr(user, 'phone') else "",
                category="General",
                risk_tier="Low Risk",
                reliability_score=100.0,
                status="Accepting Orders"
            )
            db.add(new_vendor)
            db.commit()

    return {"message": "User registered successfully", "user_id": new_user.id}


@app.post("/login")
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    if db_user.role != user.role:
        raise HTTPException(status_code=400, detail=f"Access denied: Account is not registered as '{user.role}'")
    
    if db_user.status == "pending":
        raise HTTPException(status_code=403, detail="Your account is pending admin approval.")
    elif db_user.status == "rejected":
        raise HTTPException(status_code=403, detail="Your account request was rejected.")

    ACTIVE_SESSIONS[db_user.id] = datetime.now()

    return {
        "message": "Login successful",
        "user": {
            "id": db_user.id,
            "fullname": db_user.fullname,
            "email": db_user.email,
            "role": db_user.role
        }
    }


@app.post("/api/v1/logout")
def api_logout(payload: dict):
    user_id = payload.get("user_id")
    if user_id in ACTIVE_SESSIONS:
        del ACTIVE_SESSIONS[user_id]
    return {"message": "Logged out successfully"}


@app.get("/users/verify/{user_id}")
def verify_user_session(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    if db_user.role != "admin" and db_user.status != "approved":
        raise HTTPException(status_code=401, detail="Account status is not approved.")
    
    ACTIVE_SESSIONS[user_id] = datetime.now()
    return {"status": "active", "user": {"id": db_user.id, "email": db_user.email, "role": db_user.role, "fullname": db_user.fullname}}


@app.get("/admin/metrics")
def get_admin_metrics(db: Session = Depends(get_db)):
    all_approved = db.query(models.User).filter(models.User.status == "approved").all()
    all_pending = db.query(models.User).filter(models.User.status == "pending").all()
    
    return {
        "total_users": len(all_approved),
        "pending_approvals": len(all_pending),
        "pm_count": len([u for u in all_approved if str(u.role).strip().lower().replace(" ", "_") == "procurement_manager"]),
        "fo_count": len([u for u in all_approved if str(u.role).strip().lower().replace(" ", "_") in ["finance_officer", "auditor"]]),
        "scm_count": len([u for u in all_approved if str(u.role).strip().lower().replace(" ", "_") == "supply_chain_manager"]),
        "vendor_count": len([u for u in all_approved if str(u.role).strip().lower().replace(" ", "_") == "vendor"])
    }


@app.get("/admin/users")
def get_users(role: str = "All", db: Session = Depends(get_db)):
    query = db.query(models.User).filter(models.User.status == "approved")
    
    if role and role != "All":
        normalized_role = role.strip().lower().replace(" ", "_")
        # Match both exact DB value and normalized variations
        if normalized_role == "finance_officer":
            query = query.filter(func.lower(models.User.role).in_(["finance_officer", "auditor", "finance officer"]))
        else:
            query = query.filter(
                (func.lower(models.User.role) == normalized_role) | 
                (func.lower(func.replace(models.User.role, "_", " ")) == role.strip().lower())
            )
            
    users = query.all()
    return [{"id": u.id, "fullname": u.fullname, "email": u.email, "role": u.role} for u in users]


@app.get("/api/v1/admin/active-sessions-count")
def get_active_sessions_count(db: Session = Depends(get_db)):
    now = datetime.now()
    expired_users = [
        uid for uid, last_seen in ACTIVE_SESSIONS.items() 
        if (now - last_seen).total_seconds() > 15
    ]
    for uid in expired_users:
        del ACTIVE_SESSIONS[uid]

    valid_users = {u.id for u in db.query(models.User).filter(models.User.status == "approved").all()}
    active_online = set(ACTIVE_SESSIONS.keys()).intersection(valid_users)
    return {"active_sessions": len(active_online)}


@app.get("/admin/users")
def get_users(role: str = "All", db: Session = Depends(get_db)):
    query = db.query(models.User).filter(models.User.status == "approved")
    role_map = {
        "Procurement Manager": "procurement_manager",
        "Finance Officer": "finance_officer",
        "Supply Chain Manager": "supply_chain_manager",
        "Vendor": "vendor"
    }
    if role in role_map:
        query = query.filter(models.User.role == role_map[role])
    users = query.all()
    return [{"id": u.id, "fullname": u.fullname, "email": u.email, "role": u.role} for u in users]


@app.get("/admin/pending-users")
def get_pending_users(db: Session = Depends(get_db)):
    pending = db.query(models.User).filter(models.User.status == "pending").all()
    return [{"id": u.id, "fullname": u.fullname, "email": u.email, "role": u.role} for u in pending]


@app.get("/admin/system-logs")
def get_system_logs(db: Session = Depends(get_db)):
    logs = db.query(models.SystemLog).order_by(models.SystemLog.id.desc()).all()
    return [{
        "id": l.id, 
        "event_type": l.event_type, 
        "description": l.description, 
        "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M:%S")
    } for l in logs]


@app.put("/admin/users/{user_id}/approve")
def approve_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.status = "approved"
    
    log_entry = models.SystemLog(
        event_type="Approved",
        description=f"Administrator approved account for {user.fullname} ({user.email}) [{user.role.replace('_', ' ').title()}]."
    )
    db.add(log_entry)
    db.commit()
    return {"message": "User approved successfully"}


@app.delete("/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_name = user.fullname
    user_email = user.email
    user_role = user.role
    user_status = user.status

    if user.role == "vendor":
        vendor_record = db.query(models.Vendor).filter(
            (models.Vendor.email == user.email) | (models.Vendor.vendor_name == user.fullname)
        ).first()
        if vendor_record:
            db.delete(vendor_record)

    if user.id in ACTIVE_SESSIONS:
        del ACTIVE_SESSIONS[user.id]

    event_label = "User Rejected" if user_status == "pending" else "User Deleted"
    desc_text = f"Administrator rejected account request for {user_name} ({user_email}) [{user_role}]." if user_status == "pending" else f"Administrator deleted active user {user_name} ({user_email}) with role [{user_role}]."

    log_entry = models.SystemLog(
        event_type=event_label,
        description=desc_text
    )
    db.add(log_entry)

    db.delete(user)
    db.commit()
    return {"message": "User action processed successfully"}


# --- Purchase Orders Routes ---

@app.post("/api/v1/purchase-orders")
def create_purchase_order(po: schemas.POCreate, db: Session = Depends(get_db)):
    existing_invoice = db.query(models.Invoice).filter(models.Invoice.invoice_no == po.invoice_no).first()
    invoice_no = po.invoice_no
    if existing_invoice:
        invoice_no = f"{po.invoice_no}-{random.randint(100, 999)}"

    db_po = models.PurchaseOrder(
        invoice_no=invoice_no,
        vendor_name=po.vendor_name,
        product_name=po.product_name,
        quantity=po.quantity,
        department=po.department,
        creation_date=po.creation_date,
        expiry_date=po.expiry_date,
        total_value=po.total_value,
        order_status="Pending F.O Approval"
    )
    db.add(db_po)
    
    db_invoice = models.Invoice(
        invoice_no=invoice_no,
        vendor_name=po.vendor_name,
        product_name=po.product_name,
        department=po.department,
        quantity=po.quantity,
        amount=po.total_value,
        status="Pending",
        delivery_status="In Transit",
        quality_status="In Progress",
        payment_status="Unpaid"
    )
    db.add(db_invoice)
    db.commit()
    
    vendor = db.query(models.Vendor).filter(models.Vendor.vendor_name == po.vendor_name).first()
    if vendor:
        score, tier = compute_vendor_dynamic_score(po.vendor_name, db)
        vendor.reliability_score = score
        vendor.risk_tier = tier
        db.commit()

    db.refresh(db_po)
    return db_po


@app.get("/api/v1/purchase-orders")
def get_purchase_orders(vendor: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.PurchaseOrder)
    if vendor:
        query = query.filter(models.PurchaseOrder.vendor_name == vendor)
    return query.all()


@app.put("/api/v1/purchase-orders/{po_id}/status")
def update_po_status(po_id: int, status: str, db: Session = Depends(get_db)):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    po.order_status = status
    invoice = db.query(models.Invoice).filter(models.Invoice.invoice_no == po.invoice_no).first()
    if invoice:
        if hasattr(invoice, 'order_status'):
            invoice.order_status = status

    vendor = db.query(models.Vendor).filter(models.Vendor.vendor_name == po.vendor_name).first()
    if vendor:
        score, tier = compute_vendor_dynamic_score(po.vendor_name, db)
        vendor.reliability_score = score
        vendor.risk_tier = tier

    db.commit()
    return {"message": f"PO and Invoice status updated to {status}"}


@app.put("/api/v1/purchase-orders/{po_id}/progress")
def update_po_progress(po_id: int, progress: schemas.POProgressUpdate, db: Session = Depends(get_db)):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    po.completed_units = progress.completed_units
    po.production_status = progress.production_status

    invoice = db.query(models.Invoice).filter(models.Invoice.invoice_no == po.invoice_no).first()
    if invoice:
        if hasattr(invoice, 'order_status'):
            invoice.order_status = progress.production_status
        if hasattr(invoice, 'delivery_status'):
            invoice.delivery_status = progress.production_status

    vendor = db.query(models.Vendor).filter(models.Vendor.vendor_name == po.vendor_name).first()
    if vendor:
        score, tier = compute_vendor_dynamic_score(po.vendor_name, db)
        vendor.reliability_score = score
        vendor.risk_tier = tier

    db.commit()
    return {"message": "Order progress and dynamic score updated successfully"}


# --- Invoices & Payment Routes ---

@app.post("/api/v1/invoices")
def create_invoice(inv: schemas.InvoiceCreate, db: Session = Depends(get_db)):
    raw_id = f"INV-2026-{random.randint(10000, 99999)}"
    db_invoice = models.Invoice(
        invoice_no=raw_id,
        vendor_name=inv.vendor_name,
        product_name=inv.product_name,
        department=inv.department,
        quantity=inv.quantity,
        amount=inv.amount,
        status="Pending"
    )
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice


@app.get("/api/v1/invoices")
def get_invoices(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Invoice)
    if status:
        query = query.filter(models.Invoice.status == status)
    return query.all()


@app.put("/api/v1/invoices/{inv_id}/status")
def update_invoice_status(inv_id: int, payload: schemas.InvoiceStatusUpdate, db: Session = Depends(get_db)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == inv_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice.status = payload.status
    po_status = "Accepted by F.O" if payload.status == "Approved" else "Rejected by F.O"
    
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.invoice_no == invoice.invoice_no).first()
    if po:
        po.order_status = po_status

    db.commit()
    return {
        "message": f"Invoice marked as {payload.status} and Purchase Order updated to {po_status}",
        "invoice_no": invoice.invoice_no,
        "po_status": po_status
    }


@app.put("/api/v1/invoices/{inv_id}/pay")
def pay_invoice(inv_id: int, payload: schemas.InvoicePaymentUpdate, db: Session = Depends(get_db)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == inv_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice.payment_status = payload.payment_status
    invoice.transaction_id = payload.transaction_id
    
    db.commit()
    db.refresh(invoice)
    
    return {
        "message": "Payment processed successfully", 
        "payment_status": invoice.payment_status,
        "transaction_id": invoice.transaction_id
    }


@app.put("/api/v1/invoices/{inv_id}/inspection")
def update_inspection_status(inv_id: int, payload: schemas.InspectionUpdateSchema, db: Session = Depends(get_db)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == inv_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice or Order not found.")
    
    invoice.inspection_status = payload.inspection_status
    if hasattr(invoice, 'quality_status'):
        invoice.quality_status = payload.inspection_status
    
    if payload.inspection_status == "Checked":
        invoice.order_status = "Delivered"
        if hasattr(invoice, 'delivery_status'):
            invoice.delivery_status = "Delivered"

    try:
        db.commit()
        db.refresh(invoice)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error during inspection update.")
    
    return {
        "message": f"Inspection status successfully updated to {payload.inspection_status}",
        "invoice_id": invoice.id,
        "inspection_status": invoice.inspection_status,
        "order_status": getattr(invoice, 'order_status', None)
    }


# --- Vendor Management Routes ---

@app.post("/api/v1/vendors", response_model=schemas.VendorResponse)
def create_vendor(vendor: schemas.VendorCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Vendor).filter(models.Vendor.vendor_name == vendor.vendor_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vendor name already exists.")

    db_vendor = models.Vendor(
        vendor_name=vendor.vendor_name,
        contact_person=vendor.contact_person,
        email=vendor.email,
        phone=vendor.phone,
        category=vendor.category,
        status=vendor.status,
        reliability_score=100.0,
        risk_tier="Low Risk"
    )
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    return db_vendor


@app.get("/api/v1/vendors", response_model=List[schemas.VendorResponse])
def get_all_vendors(db: Session = Depends(get_db)):
    vendors = db.query(models.Vendor).order_by(models.Vendor.id.desc()).all()
    
    for vendor in vendors:
        score, tier = compute_vendor_dynamic_score(vendor.vendor_name, db)
        vendor.reliability_score = score
        vendor.risk_tier = tier
        
    db.commit()
    return vendors


@app.get("/api/v1/vendors/{vendor_id}", response_model=schemas.VendorResponse)
def get_vendor_by_id(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")
        
    score, tier = compute_vendor_dynamic_score(vendor.vendor_name, db)
    vendor.reliability_score = score
    vendor.risk_tier = tier
    db.commit()
    
    return vendor


@app.put("/api/v1/vendors/{vendor_id}", response_model=schemas.VendorResponse)
def update_vendor_by_id(vendor_id: int, payload: schemas.VendorUpdate, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(vendor, key, value)

    db.commit()
    db.refresh(vendor)
    return vendor


@app.put("/api/v1/vendors/profile")
def update_vendor_profile(payload: schemas.VendorUpdate, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.vendor_name == payload.vendor_name).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")
    
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(vendor, key, value)

    db.commit()
    db.refresh(vendor)
    return {"message": "Vendor profile updated successfully", "vendor": {
        "vendor_name": vendor.vendor_name,
        "email": vendor.email,
        "phone": vendor.phone,
        "status": vendor.status,
        "category": vendor.category
    }}


@app.put("/api/v1/vendors/status")
def update_vendor_status(vendor_name: str, status: str, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.vendor_name == vendor_name).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")
    
    vendor.status = status
    db.commit()
    db.refresh(vendor)
    return {"message": "Vendor status updated successfully", "status": vendor.status}


@app.post("/api/vendor-performance/")
def log_vendor_performance(payload: schemas.VendorPerformanceCreate, db: Session = Depends(get_db)):
    db_log = models.VendorPerformanceLog(**payload.dict())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


@app.get("/api/vendor-performance/{vendor_id}/summary")
def get_vendor_score_summary(vendor_id: int, db: Session = Depends(get_db)):
    logs = db.query(models.VendorPerformanceLog).filter(models.VendorPerformanceLog.vendor_id == vendor_id).all()

    if not logs:
        raise HTTPException(status_code=404, detail="No performance logs found for this vendor")

    total_logs = len(logs)
    avg_quality = sum(log.quality_rating for log in logs) / total_logs
    avg_delivery = (sum(log.delivery_timeliness for log in logs) / total_logs) * 100

    composite_score = (avg_quality * 0.6) + (avg_delivery * 0.4)

    if composite_score >= 85:
        risk_tier = "Low Risk"
    elif composite_score >= 60:
        risk_tier = "Medium Risk"
    else:
        risk_tier = "High Risk"

    return {
        "vendor_id": vendor_id,
        "average_quality": round(avg_quality, 2),
        "average_delivery_rate": round(avg_delivery, 2),
        "composite_score": round(composite_score, 2),
        "risk_tier": risk_tier
    }


@app.get("/api/v1/analytics/processing-time")
def get_average_processing_time(db: Session = Depends(get_db)):
    completed_orders = db.query(models.PurchaseOrder).filter(
        (models.PurchaseOrder.production_status.ilike("%delivered%")) | 
        (models.PurchaseOrder.production_status.ilike("%completed%"))
    ).all()
    
    if not completed_orders:
        logs = db.query(models.VendorPerformanceLog).all()
        if not logs:
            return {"avg_processing_days": 4.8}
        total_hours = sum(log.response_time_hours for log in logs)
        avg_days = (total_hours / len(logs)) / 24.0
        return {"avg_processing_days": round(avg_days, 1)}
    
    total_days = 0.0
    valid_count = 0
    
    for po in completed_orders:
        if po.creation_date:
            try:
                created_dt = datetime.strptime(str(po.creation_date).split()[0], "%Y-%m-%d")
                completion_dt = datetime.now() 
                diff_days = (completion_dt - created_dt).total_seconds() / 86400.0
                if diff_days >= 0:
                    total_days += diff_days
                    valid_count += 1
            except Exception:
                continue
                
    if valid_count == 0:
        return {"avg_processing_days": 4.8}
        
    avg_days = total_days / valid_count
    return {"avg_processing_days": round(max(avg_days, 0.1), 1)}
