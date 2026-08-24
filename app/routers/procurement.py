from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.security import require_procurement_manager


router = APIRouter(
    prefix="/procurement",
    tags=["Procurement"]
)



# -------------------- Get All Procurement Requests --------------------

@router.get("/", response_model=list[schemas.ProcurementResponse])
def get_procurement_requests(
    db: Session = Depends(get_db)
):
    return db.query(models.ProcurementRequest).all()



# -------------------- Search & Filter Procurement Requests --------------------

@router.get("/search", response_model=list[schemas.ProcurementResponse])
def search_procurement_requests(
    product_name: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):

    query = db.query(models.ProcurementRequest)


    if product_name:
        query = query.filter(
            models.ProcurementRequest.product_name.ilike(
                f"%{product_name}%"
            )
        )


    if department:
        query = query.filter(
            models.ProcurementRequest.department.ilike(
                f"%{department}%"
            )
        )


    if priority:
        query = query.filter(
            models.ProcurementRequest.priority.ilike(
                f"%{priority}%"
            )
        )


    if status:
        query = query.filter(
            models.ProcurementRequest.status.ilike(
                f"%{status}%"
            )
        )


    return query.all()



# -------------------- Get Procurement Request By ID --------------------

@router.get("/{request_id}",
            response_model=schemas.ProcurementResponse)
def get_procurement_request(
    request_id: int,
    db: Session = Depends(get_db)
):

    request = db.query(models.ProcurementRequest).filter(
        models.ProcurementRequest.id == request_id
    ).first()


    if not request:
        raise HTTPException(
            status_code=404,
            detail="Procurement Request not found"
        )


    return request



# -------------------- Add Procurement Request --------------------

@router.post("/add",
             response_model=schemas.ProcurementResponse)
def add_procurement_request(
    request: schemas.ProcurementCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_procurement_manager)
):

    new_request = models.ProcurementRequest(
        **request.model_dump()
    )


    db.add(new_request)
    db.commit()
    db.refresh(new_request)


    return new_request



# -------------------- Update Procurement Request --------------------

@router.put("/{request_id}",
            response_model=schemas.ProcurementResponse)
def update_procurement_request(
    request_id: int,
    request: schemas.ProcurementCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_procurement_manager)
):

    existing_request = db.query(models.ProcurementRequest).filter(
        models.ProcurementRequest.id == request_id
    ).first()


    if not existing_request:
        raise HTTPException(
            status_code=404,
            detail="Procurement Request not found"
        )


    for key, value in request.model_dump().items():
        setattr(existing_request, key, value)


    db.commit()
    db.refresh(existing_request)


    return existing_request



# -------------------- Approve Procurement --------------------

@router.put("/{request_id}/approve",
            response_model=schemas.ProcurementResponse)
def approve_procurement_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_procurement_manager)
):

    request = db.query(models.ProcurementRequest).filter(
        models.ProcurementRequest.id == request_id
    ).first()


    if not request:
        raise HTTPException(
            status_code=404,
            detail="Procurement Request not found"
        )


    request.status = "Approved"


    db.commit()
    db.refresh(request)


    return request



# -------------------- Move To Ordered --------------------

@router.put("/{request_id}/order",
            response_model=schemas.ProcurementResponse)
def order_procurement_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_procurement_manager)
):

    request = db.query(models.ProcurementRequest).filter(
        models.ProcurementRequest.id == request_id
    ).first()


    if not request:
        raise HTTPException(
            status_code=404,
            detail="Procurement Request not found"
        )


    request.status = "Ordered"


    db.commit()
    db.refresh(request)


    return request



# -------------------- Mark Delivered --------------------

@router.put("/{request_id}/deliver",
            response_model=schemas.ProcurementResponse)
def deliver_procurement_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_procurement_manager)
):

    request = db.query(models.ProcurementRequest).filter(
        models.ProcurementRequest.id == request_id
    ).first()


    if not request:
        raise HTTPException(
            status_code=404,
            detail="Procurement Request not found"
        )


    request.status = "Delivered"


    db.commit()
    db.refresh(request)


    return request



# -------------------- Complete Procurement --------------------

@router.put("/{request_id}/complete",
            response_model=schemas.ProcurementResponse)
def complete_procurement_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_procurement_manager)
):

    request = db.query(models.ProcurementRequest).filter(
        models.ProcurementRequest.id == request_id
    ).first()


    if not request:
        raise HTTPException(
            status_code=404,
            detail="Procurement Request not found"
        )


    request.status = "Completed"


    db.commit()
    db.refresh(request)


    return request



# -------------------- Cancel Procurement --------------------

@router.put("/{request_id}/cancel",
            response_model=schemas.ProcurementResponse)
def cancel_procurement_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_procurement_manager)
):

    request = db.query(models.ProcurementRequest).filter(
        models.ProcurementRequest.id == request_id
    ).first()


    if not request:
        raise HTTPException(
            status_code=404,
            detail="Procurement Request not found"
        )


    request.status = "Cancelled"


    db.commit()
    db.refresh(request)


    return request



# -------------------- Delete Procurement Request --------------------

@router.delete("/{request_id}")
def delete_procurement_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_procurement_manager)
):

    request = db.query(models.ProcurementRequest).filter(
        models.ProcurementRequest.id == request_id
    ).first()


    if not request:
        raise HTTPException(
            status_code=404,
            detail="Procurement Request not found"
        )


    db.delete(request)
    db.commit()


    return {
        "message": "Procurement Request deleted successfully"
    }