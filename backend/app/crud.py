
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app import models, schemas
from app.auth import hash_password


# ============================================================
# USER
# ============================================================

def create_user(db: Session, user: schemas.UserCreate):
    existing_user = get_user_by_email(db, user.email)

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    hashed_password = hash_password(user.password)

    db_user = models.User(
        full_name=user.full_name,
        email=user.email,
        password=hashed_password,
        role=user.role
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(
        models.User.email == email
    ).first()


# ============================================================
# VENDORS
# ============================================================

def create_vendor(
    db: Session,
    vendor: schemas.VendorCreate,
    reliability_score: float = 0,
    risk_level: str = "Pending"
):
    db_vendor = models.Vendor(
        vendor_name=vendor.vendor_name,
        category=vendor.category,
        contact_person=vendor.contact_person,
        email=vendor.email,
        phone=vendor.phone,
        address=vendor.address,
        delivery_score=vendor.delivery_score,
        quality_score=vendor.quality_score,
        payment_score=vendor.payment_score,
        compliance_score=vendor.compliance_score,
        reliability_score=reliability_score,
        risk_level=risk_level,
        status="Pending"
    )

    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)

    return db_vendor


def get_all_vendors(db: Session):
    return db.query(models.Vendor).all()


def get_vendor_by_id(db: Session, vendor_id: int):
    return db.query(models.Vendor).filter(
        models.Vendor.id == vendor_id
    ).first()


def update_vendor(
    db: Session,
    vendor_id: int,
    vendor: schemas.VendorCreate,
    reliability_score: float,
    risk_level: str
):
    db_vendor = get_vendor_by_id(db, vendor_id)

    if not db_vendor:
        return None

    # Basic vendor information
    db_vendor.vendor_name = vendor.vendor_name
    db_vendor.category = vendor.category
    db_vendor.contact_person = vendor.contact_person
    db_vendor.email = vendor.email
    db_vendor.phone = vendor.phone
    db_vendor.address = vendor.address

    # Performance scores
    db_vendor.delivery_score = vendor.delivery_score
    db_vendor.quality_score = vendor.quality_score
    db_vendor.payment_score = vendor.payment_score
    db_vendor.compliance_score = vendor.compliance_score

    # Automatically calculated values
    db_vendor.reliability_score = reliability_score
    db_vendor.risk_level = risk_level

    db.commit()
    db.refresh(db_vendor)

    return db_vendor


# ============================================================
# PROCUREMENT
# ============================================================

def create_procurement(
    db: Session,
    procurement: schemas.ProcurementCreate
):
    db_procurement = models.Procurement(
        vendor_id=procurement.vendor_id,
        item_name=procurement.item_name,
        quantity=procurement.quantity,
        budget=procurement.budget,
        request_date=procurement.request_date,
        status="Pending"
    )

    db.add(db_procurement)
    db.commit()
    db.refresh(db_procurement)

    return db_procurement


def get_all_procurements(db: Session):
    return db.query(models.Procurement).all()


def get_procurement_by_id(
    db: Session,
    procurement_id: int
):
    return db.query(models.Procurement).filter(
        models.Procurement.id == procurement_id
    ).first()


# ============================================================
# PURCHASE ORDERS
# ============================================================

def create_purchase_order(
    db: Session,
    purchase_order: schemas.PurchaseOrderCreate
):
    db_purchase_order = models.PurchaseOrder(
        order_number=purchase_order.order_number,
        vendor_id=purchase_order.vendor_id,
        procurement_id=purchase_order.procurement_id,
        order_date=purchase_order.order_date,
        delivery_date=purchase_order.delivery_date,
        item_category=purchase_order.item_category,
        quantity=purchase_order.quantity,
        unit_price=purchase_order.unit_price,
        negotiated_price=purchase_order.negotiated_price,
        defective_units=purchase_order.defective_units,
        compliance=purchase_order.compliance,
        amount=purchase_order.amount,
        status="Pending"
    )

    db.add(db_purchase_order)
    db.commit()
    db.refresh(db_purchase_order)

    return db_purchase_order


def get_all_purchase_orders(db: Session):
    return db.query(models.PurchaseOrder).all()


def get_purchase_order_by_id(
    db: Session,
    purchase_order_id: int
):
    return db.query(models.PurchaseOrder).filter(
        models.PurchaseOrder.id == purchase_order_id
    ).first()