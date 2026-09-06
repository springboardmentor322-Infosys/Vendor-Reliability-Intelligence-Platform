from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/procurements")
def add_procurement(procurement: dict, db: Session = Depends(get_db)):
    try:
        new_p = models.Procurement(
            item_name=procurement.get("item_name") or procurement.get("itemName", ""),
            quantity=int(procurement.get("quantity") or 0),
            estimated_cost=int(procurement.get("estimated_cost") or procurement.get("estimatedCost") or 0),
            department=procurement.get("department", ""),
            status=procurement.get("status", "Pending")
        )
        db.add(new_p)
        db.commit()
        db.refresh(new_p)
        return {
            "message": "Procurement Request Saved Successfully",
            "data": new_p
        }
    except Exception as e:
        db.rollback()
        return {"message": "Error saving procurement", "error": str(e)}

@router.get("/procurements")
def get_procurements(db: Session = Depends(get_db)):
    try:
        procurements = db.query(models.Procurement).all()
        return procurements
    except Exception as e:
        return []

@router.delete("/procurements/{procurement_id}")
def delete_procurement(procurement_id: int, db: Session = Depends(get_db)):
    try:
        p = db.query(models.Procurement).filter(models.Procurement.id == procurement_id).first()
        if p:
            db.delete(p)
            db.commit()
            return {"message": "Procurement Deleted Successfully"}
        return {"message": "Procurement Not Found"}
    except Exception as e:
        return {"message": "Error deleting procurement", "error": str(e)}

@router.put("/procurements/{procurement_id}")
def update_procurement(procurement_id: int, updated_data: dict, db: Session = Depends(get_db)):
    try:
        p = db.query(models.Procurement).filter(models.Procurement.id == procurement_id).first()
        if p:
            if "item_name" in updated_data: p.item_name = updated_data["item_name"]
            if "quantity" in updated_data: p.quantity = int(updated_data["quantity"])
            if "estimated_cost" in updated_data: p.estimated_cost = int(updated_data["estimated_cost"])
            if "department" in updated_data: p.department = updated_data["department"]
            if "status" in updated_data: p.status = updated_data["status"]
            db.commit()
            db.refresh(p)
            return {"message": "Procurement Updated Successfully", "data": p}
        return {"message": "Procurement Not Found"}
    except Exception as e:
        return {"message": "Error updating procurement", "error": str(e)}