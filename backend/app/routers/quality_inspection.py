from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.quality_inspection import QualityInspection
from app.models.order import Order
from app.models.vendor import Vendor
from app.utils.security import get_current_email

router = APIRouter(
    prefix="/quality-inspections",
    tags=["Quality Inspections"]
)


# ==========================================
# CREATE QUALITY INSPECTION
# ==========================================

@router.post("/")
def create_quality_inspection(
    data: dict,
    db: Session = Depends(get_db),
    current_email: str = Depends(get_current_email)
):

    required_fields = [
        "order_id",
        "vendor_id",
        "inspection_date",
        "inspector_name",
        "quality_score",
        "result"
    ]

    for field in required_fields:

        if field not in data:

            raise HTTPException(
                status_code=400,
                detail=f"Missing required field: {field}"
            )


    # ==========================================
    # CHECK ORDER
    # ==========================================

    order = db.query(Order).filter(
        Order.id == data["order_id"]
    ).first()

    if not order:

        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )


    # ==========================================
    # CHECK VENDOR
    # ==========================================

    vendor = db.query(Vendor).filter(
        Vendor.id == data["vendor_id"]
    ).first()

    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    # ==========================================
    # VALIDATE QUALITY SCORE
    # ==========================================

    quality_score = data["quality_score"]

    if quality_score < 0 or quality_score > 5:

        raise HTTPException(
            status_code=400,
            detail="Quality score must be between 0 and 5"
        )


    # ==========================================
    # VALIDATE RESULT
    # ==========================================

    allowed_results = [
        "Passed",
        "Failed"
    ]

    if data["result"] not in allowed_results:

        raise HTTPException(
            status_code=400,
            detail="Result must be Passed or Failed"
        )


    # ==========================================
    # VALIDATE DEFECT COUNT
    # ==========================================

    defect_count = data.get(
        "defect_count",
        0
    )

    if defect_count < 0:

        raise HTTPException(
            status_code=400,
            detail="Defect count cannot be negative"
        )


    # ==========================================
    # CREATE INSPECTION
    # ==========================================
    inspection = QualityInspection(

        order_id=data["order_id"],

        vendor_id=data["vendor_id"],

        inspection_date=date.fromisoformat(
            data["inspection_date"]
        ),

        inspector_name=data["inspector_name"],

        quality_score=quality_score,

        result=data["result"],

        defect_count=defect_count,

        notes=data.get("notes")

    )


    db.add(inspection)

    db.commit()

    db.refresh(inspection)


    return inspection


# ==========================================
# GET ALL QUALITY INSPECTIONS
# ==========================================

@router.get("/")
def get_quality_inspections(
    db: Session = Depends(get_db),
    current_email: str = Depends(get_current_email)
):

    inspections = db.query(
        QualityInspection
    ).all()

    return inspections


# ==========================================
# GET SINGLE QUALITY INSPECTION
# ==========================================

@router.get("/{inspection_id}")
def get_quality_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_email: str = Depends(get_current_email)
):

    inspection = db.query(
        QualityInspection
    ).filter(
        QualityInspection.id == inspection_id
    ).first()


    if not inspection:

        raise HTTPException(
            status_code=404,
            detail="Quality inspection not found"
        )


    return inspection


# ==========================================
# GET INSPECTIONS BY VENDOR
# ==========================================

@router.get("/vendor/{vendor_id}")
def get_vendor_quality_inspections(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_email: str = Depends(get_current_email)
):

    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id
    ).first()


    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    inspections = db.query(
        QualityInspection
    ).filter(
        QualityInspection.vendor_id == vendor_id
    ).all()


    return inspections


# ==========================================
# UPDATE QUALITY INSPECTION
# ==========================================

@router.put("/{inspection_id}")
def update_quality_inspection(
    inspection_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_email: str = Depends(get_current_email)
):

    inspection = db.query(
        QualityInspection
    ).filter(
        QualityInspection.id == inspection_id
    ).first()


    if not inspection:

        raise HTTPException(
            status_code=404,
            detail="Quality inspection not found"
        )


    # ==========================================
    # VALIDATE QUALITY SCORE
    # ==========================================

    if "quality_score" in data:

        if (
            data["quality_score"] < 0
            or data["quality_score"] > 5
        ):

            raise HTTPException(
                status_code=400,
                detail="Quality score must be between 0 and 5"
            )


    # ==========================================
    # VALIDATE RESULT
    # ==========================================

    if "result" in data:

        allowed_results = [
            "Passed",
            "Failed"
        ]

        if data["result"] not in allowed_results:

            raise HTTPException(
                status_code=400,
                detail="Result must be Passed or Failed"
            )


    # ==========================================
    # VALIDATE DEFECT COUNT
    # ==========================================

    if "defect_count" in data:

        if data["defect_count"] < 0:

            raise HTTPException(
                status_code=400,
                detail="Defect count cannot be negative"
            )


    # ==========================================
    # UPDATE FIELDS
    # ==========================================

    if "order_id" in data:

        order = db.query(Order).filter(
            Order.id == data["order_id"]
        ).first()

        if not order:

            raise HTTPException(
                status_code=404,
                detail="Order not found"
            )

        inspection.order_id = data["order_id"]


    if "vendor_id" in data:

        vendor = db.query(Vendor).filter(
            Vendor.id == data["vendor_id"]
        ).first()

        if not vendor:

            raise HTTPException(
                status_code=404,
                detail="Vendor not found"
            )

        inspection.vendor_id = data["vendor_id"]


    if "inspection_date" in data:

        inspection.inspection_date = data[
            "inspection_date"
        ]


    if "inspector_name" in data:

        inspection.inspector_name = data[
            "inspector_name"
        ]


    if "quality_score" in data:

        inspection.quality_score = data[
            "quality_score"
        ]


    if "result" in data:

        inspection.result = data[
            "result"
        ]


    if "defect_count" in data:

        inspection.defect_count = data[
            "defect_count"
        ]


    if "notes" in data:

        inspection.notes = data[
            "notes"
        ]


    db.commit()

    db.refresh(inspection)


    return inspection


# ==========================================
# DELETE QUALITY INSPECTION
# ==========================================

@router.delete("/{inspection_id}")
def delete_quality_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_email: str = Depends(get_current_email)
):

    inspection = db.query(
        QualityInspection
    ).filter(
        QualityInspection.id == inspection_id
    ).first()


    if not inspection:

        raise HTTPException(
            status_code=404,
            detail="Quality inspection not found"
        )


    db.delete(inspection)

    db.commit()


    return {
        "message":
        "Quality inspection deleted successfully"
    }