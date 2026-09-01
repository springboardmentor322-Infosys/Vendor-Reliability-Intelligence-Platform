from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File
)

from fastapi.responses import FileResponse

from sqlalchemy.orm import Session

from app.database import get_db

from app.models.contract import Contract
from app.models.contract_document import ContractDocument

from app.schemas.contract_document import (
    ContractDocumentResponse
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
    prefix="/contract-documents",
    tags=["Contract Documents"]
)


# ==========================================
# UPLOAD DIRECTORY
# ==========================================

UPLOAD_DIR = Path(
    "uploads/contract_documents"
)

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ==========================================
# ALLOWED FILE TYPES
# ==========================================

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".png",
    ".jpg",
    ".jpeg",
    ".txt"
}


# ==========================================
# GET DOCUMENTS FOR CONTRACT
# ==========================================

@router.get(
    "/contract/{contract_id}",
    response_model=list[ContractDocumentResponse]
)
def get_contract_documents(

    contract_id: int,

    db: Session = Depends(get_db),

    current_user=Depends(
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

    contract = (
        db.query(Contract)
        .filter(
            Contract.id == contract_id
        )
        .first()
    )

    if not contract:

        raise HTTPException(
            status_code=404,
            detail="Contract not found"
        )

    documents = (
        db.query(ContractDocument)
        .filter(
            ContractDocument.contract_id ==
            contract_id
        )
        .order_by(
            ContractDocument.id.desc()
        )
        .all()
    )

    return documents


# ==========================================
# GET SINGLE DOCUMENT
# ==========================================

@router.get(
    "/{document_id}",
    response_model=ContractDocumentResponse
)
def get_contract_document(

    document_id: int,

    db: Session = Depends(get_db),

    current_user=Depends(
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

    document = (
        db.query(ContractDocument)
        .filter(
            ContractDocument.id == document_id
        )
        .first()
    )

    if not document:

        raise HTTPException(
            status_code=404,
            detail="Contract document not found"
        )

    return document


# ==========================================
# CREATE CERTIFICATION DOCUMENT RECORD
# ==========================================

@router.post(
    "/",
    response_model=ContractDocumentResponse
)
def create_contract_document(

    contract_id: int,

    certification_name: str,

    certification_number: str | None = None,

    issue_date: str | None = None,

    expiry_date: str | None = None,

    status: str = "Active",

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER
        )
    )

):

    contract = (
        db.query(Contract)
        .filter(
            Contract.id == contract_id
        )
        .first()
    )

    if not contract:

        raise HTTPException(
            status_code=404,
            detail="Contract not found"
        )


    # --------------------------------------
    # Parse dates
    # --------------------------------------

    parsed_issue_date = None

    parsed_expiry_date = None


    if issue_date:

        try:

            parsed_issue_date = date.fromisoformat(
                issue_date
            )

        except ValueError:

            raise HTTPException(
                status_code=400,
                detail="Invalid issue date. Use YYYY-MM-DD."
            )


    if expiry_date:

        try:

            parsed_expiry_date = date.fromisoformat(
                expiry_date
            )

        except ValueError:

            raise HTTPException(
                status_code=400,
                detail="Invalid expiry date. Use YYYY-MM-DD."
            )


    # --------------------------------------
    # Validate dates
    # --------------------------------------

    if (
        parsed_issue_date
        and
        parsed_expiry_date
        and
        parsed_expiry_date < parsed_issue_date
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Certification expiry date "
                "cannot be before issue date"
            )
        )


    # --------------------------------------
    # Create record
    # --------------------------------------

    document = ContractDocument(

        contract_id=contract_id,

        certification_name=certification_name,

        certification_number=certification_number,

        issue_date=parsed_issue_date,

        expiry_date=parsed_expiry_date,

        status=status

    )


    db.add(document)

    db.commit()

    db.refresh(document)


    return document


# ==========================================
# UPLOAD DOCUMENT FILE
# ==========================================

@router.post(
    "/{document_id}/upload"
)
def upload_contract_document(

    document_id: int,

    file: UploadFile = File(...),

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER
        )
    )

):

    document = (
        db.query(ContractDocument)
        .filter(
            ContractDocument.id == document_id
        )
        .first()
    )

    if not document:

        raise HTTPException(
            status_code=404,
            detail="Contract document not found"
        )


    # --------------------------------------
    # Validate filename
    # --------------------------------------

    original_name = (
        file.filename
        or "document"
    )


    extension = Path(
        original_name
    ).suffix.lower()


    if extension not in ALLOWED_EXTENSIONS:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Allowed: PDF, DOC, DOCX, XLS, XLSX, "
                "PNG, JPG, JPEG, TXT."
            )
        )


    # --------------------------------------
    # Generate unique stored filename
    # --------------------------------------

    stored_name = (
        f"{uuid4().hex}"
        f"{extension}"
    )


    file_path = (
        UPLOAD_DIR /
        stored_name
    )


    # --------------------------------------
    # Save file
    # --------------------------------------

    try:

        with open(
            file_path,
            "wb"
        ) as buffer:

            while True:

                chunk = file.file.read(
                    1024 * 1024
                )

                if not chunk:

                    break

                buffer.write(chunk)

    except Exception as error:

        if file_path.exists():

            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail="Failed to save uploaded document"
        )


    # --------------------------------------
    # Remove old file
    # --------------------------------------

    old_path = document.document_path

    if old_path:

        old_file = Path(old_path)

        if (
            old_file.exists()
            and
            old_file != file_path
        ):

            try:

                old_file.unlink()

            except OSError:

                pass


    # --------------------------------------
    # Update database
    # --------------------------------------

    document.document_name = original_name

    document.document_path = str(
        file_path
    )


    db.commit()

    db.refresh(document)


    return {

        "message":
            "Document uploaded successfully",

        "document_id":
            document.id,

        "document_name":
            document.document_name

    }


# ==========================================
# DOWNLOAD DOCUMENT
# ==========================================

@router.get(
    "/{document_id}/download"
)
def download_contract_document(

    document_id: int,

    db: Session = Depends(get_db),

    current_user=Depends(
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

    document = (
        db.query(ContractDocument)
        .filter(
            ContractDocument.id == document_id
        )
        .first()
    )

    if not document:

        raise HTTPException(
            status_code=404,
            detail="Contract document not found"
        )


    if not document.document_path:

        raise HTTPException(
            status_code=404,
            detail="No file has been uploaded for this document"
        )


    file_path = Path(
        document.document_path
    )


    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail="Document file not found"
        )


    return FileResponse(

        path=file_path,

        filename=(
            document.document_name
            or file_path.name
        )

    )


# ==========================================
# UPDATE DOCUMENT INFORMATION
# ==========================================

@router.put(
    "/{document_id}",
    response_model=ContractDocumentResponse
)
def update_contract_document(

    document_id: int,

    certification_name: str,

    certification_number: str | None = None,

    issue_date: str | None = None,

    expiry_date: str | None = None,

    status: str = "Active",

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER
        )
    )

):

    document = (
        db.query(ContractDocument)
        .filter(
            ContractDocument.id == document_id
        )
        .first()
    )

    if not document:

        raise HTTPException(
            status_code=404,
            detail="Contract document not found"
        )


    # --------------------------------------
    # Parse dates
    # --------------------------------------

    parsed_issue_date = None

    parsed_expiry_date = None


    if issue_date:

        try:

            parsed_issue_date = date.fromisoformat(
                issue_date
            )

        except ValueError:

            raise HTTPException(
                status_code=400,
                detail="Invalid issue date. Use YYYY-MM-DD."
            )


    if expiry_date:

        try:

            parsed_expiry_date = date.fromisoformat(
                expiry_date
            )

        except ValueError:

            raise HTTPException(
                status_code=400,
                detail="Invalid expiry date. Use YYYY-MM-DD."
            )


    # --------------------------------------
    # Validate dates
    # --------------------------------------

    if (
        parsed_issue_date
        and
        parsed_expiry_date
        and
        parsed_expiry_date < parsed_issue_date
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Certification expiry date "
                "cannot be before issue date"
            )
        )


    # --------------------------------------
    # Update
    # --------------------------------------

    document.certification_name = (
        certification_name
    )

    document.certification_number = (
        certification_number
    )

    document.issue_date = (
        parsed_issue_date
    )

    document.expiry_date = (
        parsed_expiry_date
    )

    document.status = status


    db.commit()

    db.refresh(document)


    return document


# ==========================================
# DELETE DOCUMENT
# ==========================================

@router.delete(
    "/{document_id}"
)
def delete_contract_document(

    document_id: int,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR
        )
    )

):

    document = (
        db.query(ContractDocument)
        .filter(
            ContractDocument.id == document_id
        )
        .first()
    )

    if not document:

        raise HTTPException(
            status_code=404,
            detail="Contract document not found"
        )


    # --------------------------------------
    # Delete physical file
    # --------------------------------------

    if document.document_path:

        file_path = Path(
            document.document_path
        )

        if file_path.exists():

            try:

                file_path.unlink()

            except OSError:

                pass


    # --------------------------------------
    # Delete database record
    # --------------------------------------

    db.delete(document)

    db.commit()


    return {

        "message":
            "Contract document deleted successfully"

    }