
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas, crud

router = APIRouter(
    prefix="/procurements",
    tags=["Procurements"]
)

@router.post("/", response_model=schemas.ProcurementResponse)
def create_procurement(
    procurement: schemas.ProcurementCreate,
    db: Session = Depends(get_db)
):
    return crud.create_procurement(db, procurement)

@router.get("/", response_model=list[schemas.ProcurementResponse])
def get_procurements(
    db: Session = Depends(get_db)
):
    return crud.get_all_procurements(db)

@router.get("/{procurement_id}", response_model=schemas.ProcurementResponse)
def get_procurement(
    procurement_id: int,
    db: Session = Depends(get_db)
):
    procurement = crud.get_procurement_by_id(db, procurement_id)

    if procurement is None:
        raise HTTPException(
            status_code=404,
            detail="Procurement not found"
        )

    return procurement

@router.put("/{procurement_id}/approve")
def approve_procurement(
    procurement_id: int,
    db: Session = Depends(get_db)
):
    procurement = crud.get_procurement_by_id(db, procurement_id)

    if procurement is None:
        raise HTTPException(
            status_code=404,
            detail="Procurement not found"
        )

    procurement.status = "Approved"

    db.commit()
    db.refresh(procurement)

    return {
        "message": "Procurement approved successfully",
        "procurement": procurement
    }

@router.put("/{procurement_id}/reject")
def reject_procurement(
    procurement_id: int,
    db: Session = Depends(get_db)
):
    procurement = crud.get_procurement_by_id(db, procurement_id)

    if procurement is None:
        raise HTTPException(
            status_code=404,
            detail="Procurement not found"
        )

    procurement.status = "Rejected"

    db.commit()
    db.refresh(procurement)

    return {
        "message": "Procurement rejected successfully",
        "procurement": procurement
    }

@router.put("/{procurement_id}", response_model=schemas.ProcurementResponse)
def update_procurement(
    procurement_id: int,
    procurement: schemas.ProcurementCreate,
    db: Session = Depends(get_db)
):
    updated_procurement = crud.update_procurement(
        db,
        procurement_id,
        procurement
    )

    if updated_procurement is None:
        raise HTTPException(
            status_code=404,
            detail="Procurement not found"
        )

    return updated_procurement

@router.delete("/{procurement_id}")
def delete_procurement(
    procurement_id: int,
    db: Session = Depends(get_db)
):
    deleted_procurement = crud.delete_procurement(
        db,
        procurement_id
    )

    if deleted_procurement is None:
        raise HTTPException(
            status_code=404,
            detail="Procurement not found"
        )

    return {
        "message": "Procurement deleted successfully"
    }