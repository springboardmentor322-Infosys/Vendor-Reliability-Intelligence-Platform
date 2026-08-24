from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.security import require_finance, require_vendor


router = APIRouter(
    prefix="/purchase-orders",
    tags=["Purchase Orders"]
)



# -------------------- Get All Purchase Orders --------------------

@router.get("/", response_model=list[schemas.PurchaseOrderResponse])
def get_purchase_orders(
    db: Session = Depends(get_db)
):

    return db.query(
        models.PurchaseOrder
    ).all()





# -------------------- Search & Filter Purchase Orders --------------------

@router.get("/search", response_model=list[schemas.PurchaseOrderResponse])
def search_purchase_orders(

    vendor_name: Optional[str] = Query(None),

    product_name: Optional[str] = Query(None),

    status: Optional[str] = Query(None),

    db: Session = Depends(get_db)

):

    query = db.query(
        models.PurchaseOrder
    )


    if vendor_name:

        query = query.filter(
            models.PurchaseOrder.vendor_name.ilike(
                f"%{vendor_name}%"
            )
        )


    if product_name:

        query = query.filter(
            models.PurchaseOrder.product_name.ilike(
                f"%{product_name}%"
            )
        )


    if status:

        query = query.filter(
            models.PurchaseOrder.status.ilike(
                f"%{status}%"
            )
        )


    return query.all()





# -------------------- Get Purchase Order By ID --------------------

@router.get("/{po_id}",
response_model=schemas.PurchaseOrderResponse)

def get_purchase_order(

    po_id:int,

    db:Session = Depends(get_db)

):

    purchase_order = db.query(
        models.PurchaseOrder
    ).filter(
        models.PurchaseOrder.id == po_id
    ).first()



    if not purchase_order:

        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found"
        )


    return purchase_order






# -------------------- Add Purchase Order --------------------

@router.post("/add",
response_model=schemas.PurchaseOrderResponse)

def add_purchase_order(

    purchase_order: schemas.PurchaseOrderCreate,

    db:Session = Depends(get_db),

    current_user = Depends(require_finance)

):


    new_purchase_order = models.PurchaseOrder(
        **purchase_order.model_dump()
    )


    db.add(new_purchase_order)

    db.commit()

    db.refresh(new_purchase_order)


    return new_purchase_order






# -------------------- Update Purchase Order --------------------

@router.put("/{po_id}",
response_model=schemas.PurchaseOrderResponse)

def update_purchase_order(

    po_id:int,

    purchase_order: schemas.PurchaseOrderCreate,

    db:Session = Depends(get_db),

    current_user = Depends(require_finance)

):


    existing_purchase_order = db.query(
        models.PurchaseOrder
    ).filter(
        models.PurchaseOrder.id == po_id
    ).first()



    if not existing_purchase_order:

        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found"
        )



    for key,value in purchase_order.model_dump().items():

        setattr(
            existing_purchase_order,
            key,
            value
        )


    db.commit()

    db.refresh(existing_purchase_order)


    return existing_purchase_order







# -------------------- Approve Purchase Order --------------------

@router.put("/{po_id}/approve",
response_model=schemas.PurchaseOrderResponse)

def approve_purchase_order(

    po_id:int,

    db:Session = Depends(get_db),

    current_user = Depends(require_finance)

):


    purchase_order = db.query(
        models.PurchaseOrder
    ).filter(
        models.PurchaseOrder.id == po_id
    ).first()



    if not purchase_order:

        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found"
        )



    purchase_order.status = "Approved"


    db.commit()

    db.refresh(purchase_order)


    return purchase_order








# -------------------- Ship Purchase Order --------------------

@router.put("/{po_id}/ship",
response_model=schemas.PurchaseOrderResponse)

def ship_purchase_order(

    po_id:int,

    db:Session = Depends(get_db),

    current_user = Depends(require_finance)

):


    purchase_order = db.query(
        models.PurchaseOrder
    ).filter(
        models.PurchaseOrder.id == po_id
    ).first()



    if not purchase_order:

        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found"
        )



    purchase_order.status = "Shipped"


    db.commit()

    db.refresh(purchase_order)


    return purchase_order








# -------------------- Partial Delivery --------------------

@router.put("/{po_id}/partial",
response_model=schemas.PurchaseOrderResponse)

def partial_delivery(

    po_id:int,

    db:Session = Depends(get_db),

    current_user = Depends(require_finance)

):


    purchase_order = db.query(
        models.PurchaseOrder
    ).filter(
        models.PurchaseOrder.id == po_id
    ).first()



    if not purchase_order:

        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found"
        )



    purchase_order.status = "Partial Delivery"


    db.commit()

    db.refresh(purchase_order)


    return purchase_order








# -------------------- Vendor Update Status --------------------

@router.put("/{po_id}/status",
response_model=schemas.PurchaseOrderResponse)

def update_order_status(

    po_id:int,

    status:str,

    db:Session = Depends(get_db),

    current_user = Depends(require_vendor)

):


    purchase_order = db.query(
        models.PurchaseOrder
    ).filter(
        models.PurchaseOrder.id == po_id
    ).first()



    if not purchase_order:

        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found"
        )



    allowed_status = [

        "In Progress",

        "Shipped",

        "Partial Delivery",

        "Delivered"

    ]



    if status not in allowed_status:

        raise HTTPException(
            status_code=400,
            detail="Invalid status"
        )



    purchase_order.status = status



    db.commit()

    db.refresh(purchase_order)



    return purchase_order








# -------------------- Delivered --------------------

@router.put("/{po_id}/deliver",
response_model=schemas.PurchaseOrderResponse)

def deliver_purchase_order(

    po_id:int,

    db:Session = Depends(get_db),

    current_user = Depends(require_finance)

):


    purchase_order = db.query(
        models.PurchaseOrder
    ).filter(
        models.PurchaseOrder.id == po_id
    ).first()



    if not purchase_order:

        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found"
        )



    purchase_order.status = "Delivered"


    db.commit()

    db.refresh(purchase_order)


    return purchase_order







# -------------------- Delete Purchase Order --------------------

@router.delete("/{po_id}")

def delete_purchase_order(

    po_id:int,

    db:Session = Depends(get_db),

    current_user = Depends(require_finance)

):


    purchase_order = db.query(
        models.PurchaseOrder
    ).filter(
        models.PurchaseOrder.id == po_id
    ).first()



    if not purchase_order:

        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found"
        )



    db.delete(purchase_order)

    db.commit()



    return {
        "message":"Purchase Order deleted successfully"
    }