from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File
)

from fastapi.responses import FileResponse

from sqlalchemy.orm import Session

from pathlib import Path
from uuid import uuid4


from app.database import get_db

from app.models.communication import Communication
from app.models.vendor import Vendor

from app.schemas.communication import (
    CommunicationCreate,
    CommunicationUpdate
)

from app.utils.permissions import (
    require_roles,
    ADMINISTRATOR,
    PROCUREMENT_MANAGER,
    SUPPLY_CHAIN_MANAGER,
    VENDOR,
    FINANCE_OFFICER,
    AUDITOR
)


router = APIRouter(
    prefix="/communications",
    tags=["Communications"]
)


# ==========================================
# UPLOAD DIRECTORY
# ==========================================

UPLOAD_DIR = (
    Path(__file__).resolve().parent.parent
    / "uploads"
    / "communications"
)

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ==========================================
# CREATE COMMUNICATION
# ==========================================

@router.post("/")
def create_communication(
    data: CommunicationCreate,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR
        )
    )
):

    # ======================================
    # CHECK VENDOR
    # ======================================

    vendor = db.query(
        Vendor
    ).filter(
        Vendor.id == data.vendor_id
    ).first()


    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    # ======================================
    # CREATE COMMUNICATION
    # ======================================

    communication = Communication(

        vendor_id=data.vendor_id,

        sender_email=current_user.email,

        communication_type=
            data.communication_type,

        subject=data.subject,

        message=data.message,

        file_name=data.file_name,

        file_path=data.file_path,

        status="Sent"

    )


    db.add(
        communication
    )

    db.commit()

    db.refresh(
        communication
    )


    return communication


# ==========================================
# UPLOAD COMMUNICATION FILE
# ==========================================

@router.post("/upload")
async def upload_communication_file(
    file: UploadFile = File(...),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR
        )
    )
):

    # ======================================
    # VALIDATE FILE
    # ======================================

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file selected."
        )


    # ======================================
    # ALLOWED FILE TYPES
    # ======================================

    allowed_extensions = {

        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".csv",
        ".txt",
        ".png",
        ".jpg",
        ".jpeg"

    }


    original_name = Path(
        file.filename
    ).name


    extension = Path(
        original_name
    ).suffix.lower()


    if extension not in allowed_extensions:

        raise HTTPException(
            status_code=400,
            detail=(
                "File type not allowed. "
                "Allowed files: PDF, DOC, DOCX, "
                "XLS, XLSX, CSV, TXT, PNG, JPG and JPEG."
            )
        )


    # ======================================
    # GENERATE UNIQUE FILE NAME
    # ======================================

    stored_name = (
        f"{uuid4().hex}"
        f"{extension}"
    )


    file_path = (
        UPLOAD_DIR /
        stored_name
    )


    # ======================================
    # SAVE FILE
    # ======================================

    try:

        with file_path.open(
            "wb"
        ) as buffer:

            while True:

                chunk = await file.read(
                    1024 * 1024
                )


                if not chunk:

                    break


                buffer.write(
                    chunk
                )

    except Exception as error:

        print(
            "File upload error:",
            error
        )


        raise HTTPException(
            status_code=500,
            detail="Failed to upload file."
        )


    # ======================================
    # RETURN FILE INFORMATION
    # ======================================

    return {

        "message":
            "File uploaded successfully.",

        "file_name":
            original_name,

        "file_path":
            stored_name

    }


# ==========================================
# DOWNLOAD COMMUNICATION FILE
# ==========================================

@router.get("/file/{file_name}")
def download_communication_file(
    file_name: str,

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    # ======================================
    # PROTECT AGAINST PATH TRAVERSAL
    # ======================================

    safe_name = Path(
        file_name
    ).name


    file_path = (
        UPLOAD_DIR /
        safe_name
    )


    # ======================================
    # CHECK FILE
    # ======================================

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail="File not found."
        )


    if not file_path.is_file():

        raise HTTPException(
            status_code=404,
            detail="File not found."
        )


    # ======================================
    # RETURN FILE
    # ======================================

    return FileResponse(
        path=file_path
    )


# ==========================================
# GET ALL COMMUNICATIONS
# ==========================================

@router.get("/")
def get_communications(
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    communications = db.query(
        Communication
    ).order_by(
        Communication.created_at.desc()
    ).all()


    return communications


# ==========================================
# GET COMMUNICATION HISTORY BY VENDOR
# ==========================================

@router.get("/vendor/{vendor_id}")
def get_vendor_communications(
    vendor_id: int,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    vendor = db.query(
        Vendor
    ).filter(
        Vendor.id == vendor_id
    ).first()


    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    communications = db.query(
        Communication
    ).filter(
        Communication.vendor_id == vendor_id
    ).order_by(
        Communication.created_at.desc()
    ).all()


    return communications


# ==========================================
# GET BY COMMUNICATION TYPE
# ==========================================

@router.get("/type/{communication_type}")
def get_communications_by_type(
    communication_type: str,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    communications = db.query(
        Communication
    ).filter(
        Communication.communication_type ==
        communication_type
    ).order_by(
        Communication.created_at.desc()
    ).all()


    return communications


# ==========================================
# GET SINGLE COMMUNICATION
# ==========================================

@router.get("/{communication_id}")
def get_communication(
    communication_id: int,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    communication = db.query(
        Communication
    ).filter(
        Communication.id == communication_id
    ).first()


    if not communication:

        raise HTTPException(
            status_code=404,
            detail="Communication not found"
        )


    return communication


# ==========================================
# UPDATE COMMUNICATION
# ==========================================

@router.put("/{communication_id}")
def update_communication(
    communication_id: int,
    data: CommunicationUpdate,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR
        )
    )
):

    communication = db.query(
        Communication
    ).filter(
        Communication.id == communication_id
    ).first()


    if not communication:

        raise HTTPException(
            status_code=404,
            detail="Communication not found"
        )


    update_data = data.model_dump(
        exclude_unset=True
    )


    for field, value in update_data.items():

        setattr(
            communication,
            field,
            value
        )


    db.commit()

    db.refresh(
        communication
    )


    return communication


# ==========================================
# DELETE COMMUNICATION
# ==========================================

@router.delete("/{communication_id}")
def delete_communication(
    communication_id: int,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR
        )
    )
):

    communication = db.query(
        Communication
    ).filter(
        Communication.id == communication_id
    ).first()


    if not communication:

        raise HTTPException(
            status_code=404,
            detail="Communication not found"
        )


    # ======================================
    # DELETE ATTACHED FILE
    # ======================================

    if communication.file_path:

        file_path = (
            UPLOAD_DIR /
            Path(
                communication.file_path
            ).name
        )


        if file_path.exists():

            try:

                file_path.unlink()

            except Exception as error:

                print(
                    "Failed to delete attachment:",
                    error
                )


    # ======================================
    # DELETE COMMUNICATION
    # ======================================

    db.delete(
        communication
    )

    db.commit()


    return {

        "message":
            "Communication deleted successfully."

    }