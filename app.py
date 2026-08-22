from fastapi import FastAPI, Depends, HTTPException, UploadFile, File

from fastapi.middleware.cors import CORSMiddleware

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from pydantic import BaseModel

from jose import jwt, JWTError

from datetime import datetime, timedelta

from database import SessionLocal, engine, Base, get_db

from sqlalchemy.orm import Session

import models

import redis

redis_client = redis.Redis(
    host="localhost",
    port=6379,
    decode_responses=True
)
models.Base.metadata.create_all(bind=engine)

# ==================================================
# APP
# ==================================================

app = FastAPI(
    title="Vendor Reliability Platform",
    version="1.0.0"
)


# ==================================================
# CORS
# ==================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# JWT SETTINGS
# ==================================================

SECRET_KEY = "vrip-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# ==================================================
# HTTP BEARER
# ==================================================

security = HTTPBearer(auto_error=False)


# ==================================================
# REQUEST MODELS
# ==================================================

class VendorCreate(BaseModel):
    name: str
    email: str
    phone: str
    category_id: int | None = None


class VendorUpdate(BaseModel):
    name: str
    email: str
    phone: str
    category_id: int | None = None


class VendorCategoryCreate(BaseModel):
    name: str


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str
class ProcurementRequestCreate(BaseModel):
    requester: str
    department: str
    item: str
    quantity: int
    estimated_cost: float


class PurchaseOrderCreate(BaseModel):
    vendor_name: str
    item_service: str
    total_cost: str
    status: str
class ProcurementRequestCreate(BaseModel):
    requester: str
    department: str
    item: str
    quantity: int
    estimated_cost: float
    status: str
class ContractCreate(BaseModel):
    vendor_id: int
    start_date: str
    expiry_date: str
    renewal_notice_period: int
    terms: str
    compliance_flags: str
class ContractDocumentCreate(BaseModel):
    contract_id: int
    document_name: str
    document_path: str


class InvoiceCreate(BaseModel):
    po_id: int
    invoice_number: str
    amount: float
    status: str
    # ==================================================
# JWT TOKEN CREATION
# ==================================================

def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({
        "exp": expire,
        "type": "access"
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def create_refresh_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(days=7)

    to_encode.update({
        "exp": expire,
        "type": "refresh"
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    # ==================================================
# ==================================================
# JWT TOKEN VERIFICATION
# ==================================================

def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authorization token missing"
        )

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        email = payload.get("sub")

        if email is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )

        return email

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
    # ==================================================
# RBAC ROLE VERIFICATION
# ==================================================

def require_role(allowed_roles: list[str]):

    def role_checker(
        current_user: str = Depends(verify_token)
    ):
        db = SessionLocal()

        try:
            user = (
                db.query(models.User)
                .filter(models.User.email == current_user)
                .first()
            )

            if not user:
                raise HTTPException(
                    status_code=401,
                    detail="User not found"
                )

            user_role = (
                db.query(models.UserRole)
                .filter(
                    models.UserRole.user_id == user.id
                )
                .first()
            )

            if not user_role:
                raise HTTPException(
                    status_code=403,
                    detail="User role not assigned"
                )

            role = (
                db.query(models.Role)
                .filter(
                    models.Role.id == user_role.role_id
                )
                .first()
            )

            if not role:
                raise HTTPException(
                    status_code=403,
                    detail="Role not found"
                )

            if role.name not in allowed_roles:
                raise HTTPException(
                    status_code=403,
                    detail="Access denied"
                )

            return {
                "email": current_user,
                "role": role.name
            }

        finally:
            db.close()

    return role_checker

# ==================================================
# HOME
# ==================================================

@app.get("/")
def home():
    return {
        "message": "Vendor Reliability Platform Backend"
    }


# ==================================================
# REGISTER
# ==================================================
@app.post("/register")
def register_user(user: UserCreate):

    db = SessionLocal()

    try:

        existing_user = (
            db.query(models.User)
            .filter(models.User.email == user.email)
            .first()
        )

        if existing_user:
            return {
                "message": "User email already exists"
            }

        new_user = models.User(
            name=user.name,
            email=user.email,
            password=user.password
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Assign Administrator role
        admin_role = (
            db.query(models.Role)
            .filter(models.Role.name == "Administrator")
            .first()
        )

        if not admin_role:
            admin_role = models.Role(
                name="Administrator"
            )
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)

        user_role = models.UserRole(
            user_id=new_user.id,
            role_id=admin_role.id
        )

        db.add(user_role)
        db.commit()

        return {
            "message": "Registration Successful"
        }

    finally:
        db.close()

        # ==================================================
# LOGIN
# ==================================================

@app.post("/login")
def login_user(user: UserLogin):

    db = SessionLocal()

    try:
        existing_user = (
            db.query(models.User)
            .filter(models.User.email == user.email)
            .first()
        )

        if not existing_user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        if existing_user.password != user.password:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        access_token = create_access_token({
            "sub": existing_user.email
        })

        refresh_token = create_refresh_token({
            "sub": existing_user.email
        })
        redis_client.setex(
    f"refresh_token:{existing_user.email}",
    7 * 24 * 60 * 60,
    refresh_token
)
        return {
            "message": "Login successful",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

    finally:
        db.close()
class ProcurementRequestCreate(BaseModel):
    requester: str
    department: str
    item: str
    quantity: int
    estimated_cost: float
    status: str = "Pending"

        # ==================================================
# REFRESH TOKEN
# ==================================================

class RefreshTokenRequest(BaseModel):
    refresh_token: str


@app.post("/refresh-token")
def refresh_token(request: RefreshTokenRequest):

    try:
        payload = jwt.decode(
            request.refresh_token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        email = payload.get("sub")
        token_type = payload.get("type")

        if email is None or token_type != "refresh":
            raise HTTPException(
                status_code=401,
                detail="Invalid refresh token"
            )

        new_access_token = create_access_token({
            "sub": email
        })

        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh token"
        )


# ==================================================
# 

# ==================================================
# VENDOR CATEGORY
# ==================================================

@app.post("/vendor-categories")
def create_vendor_category(
    category: VendorCategoryCreate,
    current_user = Depends(require_role(["Administrator"]))
):

    db = SessionLocal()

    try:

        existing_category = (
            db.query(models.VendorCategory)
            .filter(
                models.VendorCategory.name == category.name
            )
            .first()
        )

        if existing_category:
            raise HTTPException(
                status_code=400,
                detail="Category already exists"
            )

        new_category = models.VendorCategory(
            name=category.name
        )

        db.add(new_category)
        db.commit()
        db.refresh(new_category)

        return {
            "message": "Vendor category created successfully",
            "category": {
                "id": new_category.id,
                "name": new_category.name
            }
        }

    finally:
        db.close()


# ==================================================
# GET VENDOR CATEGORIES
# ==================================================

@app.get("/vendor-categories")
def get_vendor_categories(
    current_user: str = Depends(verify_token)
):

    db = SessionLocal()

    try:

        categories = (
            db.query(models.VendorCategory)
            .order_by(models.VendorCategory.id)
            .all()
        )

        return [
            {
                "id": category.id,
                "name": category.name
            }
            for category in categories
        ]

    finally:
        db.close()


# ==================================================
# GET VENDORS
# ==================================================

@app.get("/vendors")
def get_vendors(
    search: str | None = None,
    category_id: int | None = None,
    approval_status: str | None = None,
    current_user: str = Depends(verify_token)
):
    db = SessionLocal()

    try:
        query = db.query(models.Vendor)

        if search:
            query = query.filter(
                (models.Vendor.name.ilike(f"%{search}%")) |
                (models.Vendor.email.ilike(f"%{search}%"))
            )

        if category_id is not None:
            query = query.filter(
                models.Vendor.category_id == category_id
            )

        if approval_status:
            query = query.filter(
                models.Vendor.approval_status == approval_status
            )

        vendors = query.order_by(models.Vendor.id).all()

        result = []

        for vendor in vendors:
            result.append({
        "id": vendor.id,
        "name": vendor.name,
        "email": vendor.email,
        "phone": vendor.phone,
        "category_id": vendor.category_id,
        "approval_status": vendor.approval_status,

        "on_time_delivery": getattr(vendor, "on_time_delivery", 0) or 0,
        "quality_score": getattr(vendor, "quality_score", 0) or 0,
        "reliability_score": getattr(vendor, "reliability_score", 0) or 0
    })
            

        return result

    except Exception as e:
        print("🔥 GET VENDORS ERROR:", repr(e))
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        db.close()

# ==================================================
# GET SINGLE VENDOR
# ==================================================

@app.get("/vendors/{vendor_id}")
def get_vendor(
    vendor_id: int,
    current_user: str = Depends(verify_token)
):

    db = SessionLocal()

    try:

        vendor = (
            db.query(models.Vendor)
            .filter(models.Vendor.id == vendor_id)
            .first()
        )

        if not vendor:
            raise HTTPException(
                status_code=404,
                detail="Vendor not found"
            )

        category_name = None

        if vendor.category:
            category_name = vendor.category.name

        contacts = [
            {
                "id": contact.id,
                "contact_name": contact.contact_name,
                "email": contact.email,
                "phone": contact.phone
            }
            for contact in vendor.contacts
        ]

        return {
            "id": vendor.id,
            "name": vendor.name,
            "email": vendor.email,
            "phone": vendor.phone,
            "category_id": vendor.category_id,
            "category_name": category_name,
            "approval_status": vendor.approval_status,
            "contacts": contacts
        }

    finally:
        db.close()


# ==================================================
# ADD VENDOR
# ==================================================

@app.post("/vendors")
def add_vendor(
    vendor: VendorCreate,
    current_user: str = Depends(verify_token)
):

    db = SessionLocal()

    try:

        existing_vendor = (
            db.query(models.Vendor)
            .filter(models.Vendor.email == vendor.email)
            .first()
        )

        if existing_vendor:
            raise HTTPException(
                status_code=400,
                detail="Vendor email already exists"
            )

        # Check category
        if vendor.category_id is not None:

            category = (
                db.query(models.VendorCategory)
                .filter(
                    models.VendorCategory.id == vendor.category_id
                )
                .first()
            )

            if not category:
                raise HTTPException(
                    status_code=404,
                    detail="Vendor category not found"
                )

        new_vendor = models.Vendor(
            name=vendor.name,
            email=vendor.email,
            phone=vendor.phone,
            category_id=vendor.category_id,
            approval_status="Pending"
        )

        db.add(new_vendor)
        db.commit()
        db.refresh(new_vendor)

        category_name = None

        if new_vendor.category:
            category_name = new_vendor.category.name

        return {
            "message": "Vendor added successfully",
            "vendor": {
                "id": new_vendor.id,
                "name": new_vendor.name,
                "email": new_vendor.email,
                "phone": new_vendor.phone,
                "category_id": new_vendor.category_id,
                "category_name": category_name,
                "approval_status": new_vendor.approval_status
            }
        }

    finally:
        db.close()


# ==================================================
# UPDATE VENDOR
# ==================================================

@app.put("/vendors/{vendor_id}")
def update_vendor(
    vendor_id: int,
    vendor_data: VendorUpdate,
    current_user: str = Depends(verify_token)
):

    db = SessionLocal()

    try:

        vendor = (
            db.query(models.Vendor)
            .filter(models.Vendor.id == vendor_id)
            .first()
        )

        if not vendor:
            raise HTTPException(
                status_code=404,
                detail="Vendor not found"
            )

        # Check duplicate email
        existing_vendor = (
            db.query(models.Vendor)
            .filter(
                models.Vendor.email == vendor_data.email,
                models.Vendor.id != vendor_id
            )
            .first()
        )

        if existing_vendor:
            raise HTTPException(
                status_code=400,
                detail="Another vendor already uses this email"
            )

        # Check category
        if vendor_data.category_id is not None:

            category = (
                db.query(models.VendorCategory)
                .filter(
                    models.VendorCategory.id == vendor_data.category_id
                )
                .first()
            )

            if not category:
                raise HTTPException(
                    status_code=404,
                    detail="Vendor category not found"
                )

        vendor.name = vendor_data.name
        vendor.email = vendor_data.email
        vendor.phone = vendor_data.phone
        vendor.category_id = vendor_data.category_id

        db.commit()
        db.refresh(vendor)

        return {
            "message": "Vendor updated successfully",
            "vendor": {
                "id": vendor.id,
                "name": vendor.name,
                "email": vendor.email,
                "phone": vendor.phone,
                "category_id": vendor.category_id,
                "approval_status": vendor.approval_status
            }
        }

    finally:
        db.close()


# ==================================================
# DELETE VENDOR
# ==================================================

@app.delete("/vendors/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    current_user: str = Depends(verify_token)
):

    db = SessionLocal()

    try:

        vendor = (
            db.query(models.Vendor)
            .filter(models.Vendor.id == vendor_id)
            .first()
        )

        if not vendor:
            raise HTTPException(
                status_code=404,
                detail="Vendor not found"
            )

        db.delete(vendor)
        db.commit()

        return {
            "message": "Vendor deleted successfully"
        }
    finally:
        db.close()
# ==================================================
# ==================================================
# REVIEW VENDOR
# ==================================================

@app.put("/vendors/{vendor_id}/review")
def review_vendor(
    vendor_id: int,
    current_user: str = Depends(verify_token)
):
    db = SessionLocal()

    try:
        vendor = (
            db.query(models.Vendor)
            .filter(models.Vendor.id == vendor_id)
            .first()
        )

        if not vendor:
            raise HTTPException(
                status_code=404,
                detail="Vendor not found"
            )

        vendor.approval_status = "Under Review"

        db.commit()
        db.refresh(vendor)

        return {
            "message": "Vendor moved to Under Review",
            "vendor_id": vendor.id,
            "approval_status": vendor.approval_status
        }

    finally:
        db.close()


# ==================================================
# APPROVE VENDOR
# ==================================================

@app.put("/vendors/{vendor_id}/approve")
def approve_vendor(
    vendor_id: int,
    current_user: str = Depends(verify_token)
):
    db = SessionLocal()

    try:
        vendor = (
            db.query(models.Vendor)
            .filter(models.Vendor.id == vendor_id)
            .first()
        )

        if not vendor:
            raise HTTPException(
                status_code=404,
                detail="Vendor not found"
            )

        vendor.approval_status = "Approved"

        db.commit()
        db.refresh(vendor)

        return {
            "message": "Vendor approved successfully",
            "vendor_id": vendor.id,
            "approval_status": vendor.approval_status
        }

    finally:
        db.close()


# ==================================================
# REJECT VENDOR
# ==================================================

@app.put("/vendors/{vendor_id}/reject")
def reject_vendor(
    vendor_id: int,
    current_user: str = Depends(verify_token)
):
    db = SessionLocal()

    try:
        vendor = (
            db.query(models.Vendor)
            .filter(models.Vendor.id == vendor_id)
            .first()
        )

        if not vendor:
            raise HTTPException(
                status_code=404,
                detail="Vendor not found"
            )

        vendor.approval_status = "Rejected"

        db.commit()
        db.refresh(vendor)

        return {
            "message": "Vendor rejected successfully",
            "vendor_id": vendor.id,
            "approval_status": vendor.approval_status
        }

    finally:
        db.close()

# =========================
# PURCHASE ORDERS
# =========================
@app.post("/purchase-orders")
def create_purchase_order(po: PurchaseOrderCreate):
    db = SessionLocal()

    try:
        new_po = models.PurchaseOrder(
            vendor_name=po.vendor_name,
            item_service=po.item_service,
            total_cost=po.total_cost,
            status=po.status,

            quantity=1,
            unit_price=float(po.total_cost),
            total_amount=float(po.total_cost),
            order_status=po.status
        )

        db.add(new_po)
        db.commit()
        db.refresh(new_po)

        return {
            "message": "Purchase Order Created Successfully",
            "data": new_po
        }

    finally:
        db.close()


@app.get("/purchase-orders")
def get_purchase_orders():

    db = SessionLocal()

    try:

        orders = (
            db.query(models.PurchaseOrder)
            .order_by(models.PurchaseOrder.id)
            .all()
        )


        result = []


        for order in orders:

            result.append({

                "id": order.id,

                "vendor_name":
                    order.vendor_name,

                "item_service":
                    order.item_service,

                "total_cost":
                    float(order.total_cost or 0),

                "status":
                    order.status,

                "quantity":
                    order.quantity,

                "unit_price":
                    float(order.unit_price or 0),

                "total_amount":
                    float(order.total_amount or 0),

                "order_status":
                    order.order_status

            })


        return result


    except Exception as e:

        print(
            "PURCHASE ORDERS ERROR:",
            repr(e)
        )


        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


    finally:

        db.close()


# =========================
# PURCHASE ORDER DELIVERY TRACKING
# =========================

@app.put("/purchase-orders/{po_id}/shipped")
def mark_po_shipped(po_id: int):
    db = SessionLocal()

    try:
        po = db.query(models.PurchaseOrder).filter(
            models.PurchaseOrder.id == po_id
        ).first()

        if not po:
            raise HTTPException(status_code=404, detail="Purchase Order not found")

        po.status = "Shipped"

        db.commit()
        db.refresh(po)

        return {
            "message": "Purchase Order marked as Shipped",
            "data": po
        }

    finally:
        db.close()


@app.put("/purchase-orders/{po_id}/partial-delivery")
def mark_po_partial_delivery(po_id: int):
    db = SessionLocal()

    try:
        po = db.query(models.PurchaseOrder).filter(
            models.PurchaseOrder.id == po_id
        ).first()

        if not po:
            raise HTTPException(status_code=404, detail="Purchase Order not found")

        po.status = "Partial Delivery"

        db.commit()
        db.refresh(po)

        return {
            "message": "Purchase Order marked as Partial Delivery",
            "data": po
        }

    finally:
        db.close()


@app.put("/purchase-orders/{po_id}/delivered")
def mark_po_delivered(po_id: int):
    db = SessionLocal()

    try:
        po = db.query(models.PurchaseOrder).filter(
            models.PurchaseOrder.id == po_id
        ).first()

        if not po:
            raise HTTPException(status_code=404, detail="Purchase Order not found")

        po.status = "Delivered"

        db.commit()
        db.refresh(po)

        return {
            "message": "Purchase Order marked as Delivered",
            "data": po
        }

    finally:
        db.close()


# =========================
# PROCUREMENT REQUESTS
# =========================

@app.post("/procurement-requests")
def create_procurement_request(
    request: ProcurementRequestCreate,
    current_user: str = Depends(verify_token)
):
    db = SessionLocal()

    try:
        new_request = models.ProcurementRequest(
            requester=request.requester,
            department=request.department,
            item=request.item,
            quantity=request.quantity,
            estimated_cost=request.estimated_cost,
            status="Pending"
        )

        db.add(new_request)
        db.commit()
        db.refresh(new_request)

        return {
            "message": "Procurement Request Created Successfully",
            "request_id": new_request.id,
            "requester": new_request.requester,
            "department": new_request.department,
            "item": new_request.item,
            "quantity": new_request.quantity,
            "estimated_cost": new_request.estimated_cost,
            "status": new_request.status
        }

    finally:
        db.close()

@app.get("/procurement-requests")
def get_procurement_requests():
    db = SessionLocal()

    try:
        return db.query(models.ProcurementRequest).all()
    finally:
        db.close()

@app.get("/vendor-performance")
def get_vendor_performance():

    db = SessionLocal()

    try:

        vendors = db.query(
            models.Vendor
        ).all()


        performance_data = []


        for vendor in vendors:

            reliability = (
                vendor.reliability_score
                or 0
            )


            quality = (
                vendor.quality_score
                or 0
            )


            delivery = (
                vendor.on_time_delivery
                or 0
            )


            overall_score = round(
                (
                    reliability
                    + quality
                    + delivery
                ) / 3,
                2
            )


            if overall_score >= 80:

                risk_level = "Low"

            elif overall_score >= 50:

                risk_level = "Medium"

            else:

                risk_level = "High"


            performance_data.append({

                "vendor_id": vendor.id,

                "vendor_name": vendor.name,

                "on_time_delivery_percentage": delivery,

                "quality_score": quality,

                "reliability_score": reliability,

                "overall_score": overall_score,

                "risk_level": risk_level

            })


        return performance_data


    finally:

        db.close()
# =========================
# PROCUREMENT APPROVAL
# =========================

@app.put("/procurement-requests/{request_id}/approve")
def approve_procurement_request(request_id: int):
    db = SessionLocal()

    try:
        pr = db.query(models.ProcurementRequest).filter(
            models.ProcurementRequest.id == request_id
        ).first()

        if not pr:
            raise HTTPException(status_code=404, detail="Request not found")

        pr.status = "Approved"

        db.commit()
        db.refresh(pr)

        return {
            "message": "Procurement Request Approved",
            "data": pr
        }

    finally:
        db.close()


@app.put("/procurement-requests/{request_id}/ordered")
def ordered_procurement_request(request_id: int):
    db = SessionLocal()

    try:
        pr = db.query(models.ProcurementRequest).filter(
            models.ProcurementRequest.id == request_id
        ).first()

        if not pr:
            raise HTTPException(status_code=404, detail="Request not found")

        pr.status = "Ordered"

        db.commit()
        db.refresh(pr)

        return {
            "message": "Status changed to Ordered",
            "data": pr
        }

    finally:
        db.close()


@app.put("/procurement-requests/{request_id}/delivered")
def delivered_procurement_request(request_id: int):
    db = SessionLocal()

    try:
        pr = db.query(models.ProcurementRequest).filter(
            models.ProcurementRequest.id == request_id
        ).first()

        if not pr:
            raise HTTPException(status_code=404, detail="Request not found")

        pr.status = "Delivered"

        db.commit()
        db.refresh(pr)

        return {
            "message": "Status changed to Delivered",
            "data": pr
        }

    finally:
        db.close()


@app.put("/procurement-requests/{request_id}/completed")
def completed_procurement_request(request_id: int):
    db = SessionLocal()

    try:
        pr = db.query(models.ProcurementRequest).filter(
            models.ProcurementRequest.id == request_id
        ).first()

        if not pr:
            raise HTTPException(status_code=404, detail="Request not found")

        pr.status = "Completed"

        db.commit()
        db.refresh(pr)

        return {
            "message": "Status changed to Completed",
            "data": pr
        }

    finally:
        db.close()  
        # =========================
# CONTRACTS
# =========================

@app.post("/contracts")
def create_contract(contract: ContractCreate):
    db = SessionLocal()

    try:
        new_contract = models.Contract(
            vendor_id=contract.vendor_id,
            start_date=contract.start_date,
            expiry_date=contract.expiry_date,
            renewal_notice_period=contract.renewal_notice_period,
            terms=contract.terms,
            compliance_flags=contract.compliance_flags
        )

        db.add(new_contract)
        db.commit()
        db.refresh(new_contract)

        return {
            "message": "Contract Created Successfully",
            "data": new_contract
        }

    finally:
        db.close()


@app.get("/contracts")
def get_contracts():
    db = SessionLocal()

    try:
        return db.query(models.Contract).all()
    finally:
        db.close()


# =========================
# CONTRACT DOCUMENTS
# =========================

@app.post("/contract-documents")
def create_contract_document(doc: ContractDocumentCreate):
    db = SessionLocal()

    try:
        new_doc = models.ContractDocument(
            contract_id=doc.contract_id,
            document_name=doc.document_name,
            document_path=doc.document_path
        )

        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)

        return {
            "message": "Contract Document Added Successfully",
            "data": new_doc
        }

    finally:
        db.close()


@app.get("/contract-documents")
def get_contract_documents():
    db = SessionLocal()

    try:
        return db.query(models.ContractDocument).all()
    finally:
        db.close()
        # =========================
# INVOICES
# =========================

@app.post("/invoices")
def create_invoice(invoice: InvoiceCreate):
    db = SessionLocal()

    try:
        new_invoice = models.Invoice(
            po_id=invoice.po_id,
            invoice_number=invoice.invoice_number,
            amount=invoice.amount,
            status=invoice.status
        )

        db.add(new_invoice)
        db.commit()
        db.refresh(new_invoice)

        return {
            "message": "Invoice Created Successfully",
            "data": new_invoice
        }

    finally:
        db.close()


@app.get("/invoices")
def get_invoices():
    db = SessionLocal()

    try:
        return db.query(models.Invoice).all()
    finally:
        db.close()


@app.put("/invoices/{invoice_id}/paid")
def mark_invoice_paid(invoice_id: int):
    db = SessionLocal()

    try:
        invoice = db.query(models.Invoice).filter(
            models.Invoice.id == invoice_id
        ).first()

        if not invoice:
            raise HTTPException(
                status_code=404,
                detail="Invoice not found"
            )

        invoice.status = "Paid"

        db.commit()
        db.refresh(invoice)

        return {
            "message": "Invoice Marked as Paid",
            "data": invoice
        }

    finally:
        db.close()


# =========================
# PO ITEMS
# =========================

class POItemCreate(BaseModel):
    po_id: int
    item: str
    quantity: int
    cost: float

@app.post("/po-items")
def create_po_item(item: POItemCreate):
    db = SessionLocal()

    try:
        new_item = models.POItem(
            po_id=item.po_id,
            item=item.item,
            quantity=item.quantity,
            cost=item.cost
        )

        db.add(new_item)
        db.commit()
        db.refresh(new_item)

        return {
            "message": "PO Item Created Successfully",
            "data": new_item
        }

    finally:
        db.close()


@app.get("/po-items")
def get_po_items():
    db = SessionLocal()

    try:
        return db.query(models.POItem).all()
    finally:
        db.close()

@app.get("/contracts/expiring")
def get_expiring_contracts():
    db = SessionLocal()

    try:
        today = datetime.today().date()
        date_30 = today + timedelta(days=30)
        date_60 = today + timedelta(days=60)
        date_90 = today + timedelta(days=90)

        contracts = db.query(models.Contract).filter(
            models.Contract.expiry_date >= today,
            models.Contract.expiry_date <= date_90
        ).all()

        result = []

        for contract in contracts:

            days_left = (contract.expiry_date - today).days

            if days_left <= 30:
                warning = "Expires within 30 days"
            elif days_left <= 60:
                warning = "Expires within 60 days"
            else:
                warning = "Expires within 90 days"

            result.append({
                "id": contract.id,
                "vendor_name": contract.vendor_name,
                "contract_name": contract.contract_name,
                "start_date": contract.start_date,
                "expiry_date": contract.expiry_date,
                "days_left": days_left,
                "warning": warning,
                "status": contract.status
            })

        return {
            "message": "Expiring Contracts",
            "data": result
        }

    except Exception as e:
        print("CONTRACT EXPIRY ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        db.close()


        # =========================
# CONTRACT EXPIRY ALERTS
# =========================

@app.get("/contracts/expiry-alerts")
def get_contract_expiry_alerts():
    db = SessionLocal()

    try:
        today = datetime.today().date()

        contracts = db.query(models.Contract).all()

        alerts = []

        for contract in contracts:

            if contract.expiry_date:

                days_remaining = (
                    contract.expiry_date - today
                ).days

                if days_remaining <= 90:

                    if days_remaining <= 30:
                        alert_type = "30 Days Alert"

                    elif days_remaining <= 60:
                        alert_type = "60 Days Alert"

                    else:
                        alert_type = "90 Days Alert"

                    alerts.append({
                        "contract_id": contract.id,
                        "contract_name": contract.contract_name,
                        "vendor_name": contract.vendor_name,
                        "expiry_date": contract.expiry_date,
                        "days_remaining": days_remaining,
                        "alert": alert_type
                    })

        return {
            "message": "Contract expiry alerts retrieved successfully",
            "data": alerts
        }

    finally:
        db.close()

# VENDOR CONTACTS
# =========================

class VendorContactCreate(BaseModel):
    vendor_id: int
    contact_name: str
    email: str
    phone: str


@app.post("/vendor-contacts")
def create_vendor_contact(contact: VendorContactCreate):
    db = SessionLocal()

    try:
        new_contact = models.VendorContact(
            vendor_id=contact.vendor_id,
            contact_name=contact.contact_name,
            email=contact.email,
            phone=contact.phone,
            designation=None
        )

        db.add(new_contact)
        db.commit()
        db.refresh(new_contact)

        return {
            "message": "Vendor Contact Created Successfully",
            "data": {
                "id": new_contact.id,
                "vendor_id": new_contact.vendor_id,
                "contact_name": new_contact.contact_name,
                "email": new_contact.email,
                "phone": new_contact.phone,
                "designation": new_contact.designation
            }
        }

    except Exception as e:
        db.rollback()

        print("VENDOR CONTACT CREATE ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        db.close()

@app.get("/vendor-contacts")
def get_vendor_contacts():
    db = SessionLocal()

    try:
        contacts = db.query(models.VendorContact).all()

        result = []

        for contact in contacts:
            result.append({
                "id": contact.id,
                "vendor_id": contact.vendor_id,
                "contact_name": contact.contact_name,
                "email": contact.email,
                "phone": contact.phone
            })

        return result

    except Exception as e:
        print("VENDOR CONTACT ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        db.close()

        # =========================================================
# COMMUNICATION THREADS
# =========================================================

class CommunicationCreate(BaseModel):
    po_id: int | None = None
    contract_id: int | None = None
    sender: str
    message: str


@app.post("/communications")
def create_communication(data: CommunicationCreate):
    db = SessionLocal()

    try:
        new_message = models.Communication(
            po_id=data.po_id,
            contract_id=data.contract_id,
            sender=data.sender,
            message=data.message,
            created_at=datetime.today().date()
        )

        db.add(new_message)
        db.commit()
        db.refresh(new_message)

        return {
            "message": "Communication added successfully",
            "data": new_message
        }

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        db.close()


@app.get("/communications")
def get_communications():
    db = SessionLocal()

    try:
        communications = db.query(
            models.Communication
        ).all()

        return communications

    finally:
        db.close()



        # =========================
# AUDIT LOGS
# =========================

class AuditLogCreate(BaseModel):
    user_email: str
    action: str
    description: str | None = None


@app.post("/audit-logs")
def create_audit_log(audit_log: AuditLogCreate):

    db = SessionLocal()

    try:
        new_audit_log = models.AuditLog(
            user_email=audit_log.user_email,
            action=audit_log.action,
            description=audit_log.description,
            created_at=datetime.today().date()
        )

        db.add(new_audit_log)
        db.commit()
        db.refresh(new_audit_log)

        return {
            "message": "Audit Log Created Successfully",
            "data": new_audit_log
        }

    finally:
        db.close()


@app.get("/audit-logs")
def get_audit_logs():

    db = SessionLocal()

    try:
        audit_logs = db.query(
            models.AuditLog
        ).all()

        return audit_logs

    finally:
        db.close()



# NOTIFICATIONS
# =========================
class NotificationCreate(BaseModel):
    message: str
    notification_type: str = "General"


@app.post("/notifications")
def create_notification(notification: NotificationCreate):

    db = SessionLocal()

    try:

        new_notification = models.Notification(
            message=notification.message,
            notification_type=notification.notification_type,
            is_read="No",
            created_at=datetime.today().date()
        )

        db.add(new_notification)
        db.commit()
        db.refresh(new_notification)

        return {
            "message": "Notification Created Successfully",
            "data": new_notification
        }

    finally:
        db.close()


@app.get("/notifications")
def get_notifications():

    db = SessionLocal()

    try:
        return db.query(models.Notification).all()

    finally:
        db.close()


@app.put("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int):

    db = SessionLocal()

    try:
        notification = db.query(models.Notification).filter(
            models.Notification.id == notification_id
        ).first()

        if not notification:
            raise HTTPException(
                status_code=404,
                detail="Notification not found"
            )

        notification.is_read = "Yes"

        db.commit()
        db.refresh(notification)

        return {
            "message": "Notification Marked as Read",
            "data": notification
        }

    finally:
        db.close()

# FILE UPLOADS
# =========================

import os
import shutil

UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.post("/upload-file")
async def upload_file(file: UploadFile = File(...)):

    try:

        file_path = os.path.join(
            UPLOAD_FOLDER,
            file.filename
        )

        with open(file_path, "wb") as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )

        return {
            "message": "File uploaded successfully",
            "filename": file.filename,
            "path": file_path
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


    # =========================
# CONTRACT DOCUMENT STORAGE
# =========================

import os
import shutil

CONTRACT_UPLOAD_FOLDER = "contract_documents"

os.makedirs(CONTRACT_UPLOAD_FOLDER, exist_ok=True)


@app.post("/contracts/{contract_id}/upload-document")
async def upload_contract_document(
    contract_id: int,
    file: UploadFile = File(...)
):

    try:
        file_path = os.path.join(
            CONTRACT_UPLOAD_FOLDER,
            file.filename
        )

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(
                file.file,
                buffer
            )

        return {
            "message": "Contract document uploaded successfully",
            "contract_id": contract_id,
            "filename": file.filename,
            "path": file_path
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.get("/contracts/documents")
def get_contract_documents():

    try:
        files = os.listdir(CONTRACT_UPLOAD_FOLDER)

        return {
            "message": "Contract documents retrieved successfully",
            "documents": files
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    # =========================
# CREATE VENDOR PERFORMANCE
# =========================

class VendorPerformanceCreate(BaseModel):
    vendor_id: int
    total_orders: int
    completed_orders: int
    on_time_delivery_percentage: float
    average_delay_days: float
    quality_score: float
    average_response_time_hours: float
    contract_compliance_percentage: float
    reliability_score: float
    risk_level: str


@app.post("/vendor-performance")
def create_vendor_performance(
    performance: VendorPerformanceCreate
):

    db = SessionLocal()

    try:
        new_performance = models.VendorPerformance(
            vendor_id=performance.vendor_id,
            total_orders=performance.total_orders,
            completed_orders=performance.completed_orders,
            on_time_delivery_percentage=performance.on_time_delivery_percentage,
            average_delay_days=performance.average_delay_days,
            quality_score=performance.quality_score,
            average_response_time_hours=performance.average_response_time_hours,
            contract_compliance_percentage=performance.contract_compliance_percentage,
            reliability_score=performance.reliability_score,
            risk_level=performance.risk_level,
            calculated_on=datetime.today().date()
        )

        db.add(new_performance)
        db.commit()
        db.refresh(new_performance)

        return {
            "message": "Vendor Performance Created Successfully",
            "data": new_performance
        }

    finally:
        db.close()

        # =========================
# CALCULATE RELIABILITY SCORE
# =========================

@app.get("/vendor-performance/{vendor_id}/reliability-score")
def calculate_reliability_score(vendor_id: int):

    db = SessionLocal()

    try:
        performance = (
            db.query(models.VendorPerformance)
            .filter(
                models.VendorPerformance.vendor_id == vendor_id
            )
            .order_by(
                models.VendorPerformance.calculated_on.desc()
            )
            .first()
        )

        if not performance:
            raise HTTPException(
                status_code=404,
                detail="Vendor performance data not found"
            )

        completion_rate = (
            performance.completed_orders /
            performance.total_orders
        ) * 100 if performance.total_orders > 0 else 0

        reliability_score = (
            performance.on_time_delivery_percentage * 0.30 +
            completion_rate * 0.25 +
            performance.quality_score * 0.20 +
            performance.contract_compliance_percentage * 0.15 +
            max(0, 100 - performance.average_delay_days * 10) * 0.10
        )

        reliability_score = round(reliability_score, 2)

        if reliability_score >= 80:
            risk_level = "Low"
        elif reliability_score >= 60:
            risk_level = "Medium"
        else:
            risk_level = "High"

        performance.reliability_score = reliability_score
        performance.risk_level = risk_level

        db.commit()

        return {
            "vendor_id": vendor_id,
            "reliability_score": reliability_score,
            "risk_level": risk_level,
            "message": "Reliability Score Calculated Successfully"
        }

    finally:
        db.close()

# =========================
# ANALYTICS DASHBOARD
# =========================


@app.get("/analytics")
def get_analytics():

    db = SessionLocal()

    try:

        # =========================
        # VENDOR ANALYTICS
        # =========================

        vendors = db.query(
            models.Vendor
        ).all()

        total_vendors = len(vendors)

        approved_vendors = len([
            vendor for vendor in vendors
            if vendor.approval_status == "Approved"
        ])

        rejected_vendors = len([
            vendor for vendor in vendors
            if vendor.approval_status == "Rejected"
        ])

        under_review_vendors = len([
            vendor for vendor in vendors
            if vendor.approval_status == "Under Review"
        ])


        # =========================
        # VENDOR PERFORMANCE
        # =========================

        if total_vendors > 0:

            average_reliability = sum(
                vendor.reliability_score or 0
                for vendor in vendors
            ) / total_vendors

            average_quality = sum(
                vendor.quality_score or 0
                for vendor in vendors
            ) / total_vendors

            average_delivery = sum(
                vendor.on_time_delivery or 0
                for vendor in vendors
            ) / total_vendors

        else:

            average_reliability = 0
            average_quality = 0
            average_delivery = 0


        # =========================
        # PROCUREMENT ANALYTICS
        # =========================

        orders = db.query(
            models.PurchaseOrder
        ).all()

        total_orders = len(orders)

        delivered_orders = len([
            order for order in orders
            if order.status == "Delivered"
        ])

        pending_orders = len([
            order for order in orders
            if order.status == "Pending"
        ])

        partial_delivery_orders = len([
            order for order in orders
            if order.status == "Partial Delivery"
        ])


        # TOTAL PROCUREMENT COST

        total_procurement_cost = sum(
            float(order.total_cost or 0)
            for order in orders
        )


        # =========================
        # RETURN ALL ANALYTICS
        # =========================

        return {

            # Vendor Analytics

            "total_vendors": total_vendors,

            "approved_vendors": approved_vendors,

            "rejected_vendors": rejected_vendors,

            "under_review_vendors": under_review_vendors,


            # Vendor Performance

            "average_reliability": round(
                average_reliability,
                2
            ),

            "average_quality": round(
                average_quality,
                2
            ),

            "average_delivery": round(
                average_delivery,
                2
            ),


            # Procurement Analytics

            "total_orders": total_orders,

            "delivered_orders": delivered_orders,

            "pending_orders": pending_orders,

            "partial_delivery_orders":
                partial_delivery_orders,

            "total_procurement_cost":
                total_procurement_cost

        }


    except Exception as e:

        print(
            "ANALYTICS ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        db.close()

