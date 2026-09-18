
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas, crud

router = APIRouter(
    prefix="/purchaseorders",
    tags=["Purchase Orders"]
)


@router.post("/", response_model=schemas.PurchaseOrderResponse)
def create_purchase_order(
    purchase_order: schemas.PurchaseOrderCreate,
    db: Session = Depends(get_db)
):
    return crud.create_purchase_order(db, purchase_order)


@router.get("/", response_model=list[schemas.PurchaseOrderResponse])
def get_purchase_orders(
    db: Session = Depends(get_db)
):
    return crud.get_all_purchase_orders(db)


@router.get("/{purchase_order_id}", response_model=schemas.PurchaseOrderResponse)
def get_purchase_order(
    purchase_order_id: int,
    db: Session = Depends(get_db)
):
    purchase_order = crud.get_purchase_order_by_id(
        db,
        purchase_order_id
    )

    if not purchase_order:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found"
        )

    return purchase_order