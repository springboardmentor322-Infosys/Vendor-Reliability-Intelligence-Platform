from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "purchase_orders"
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".xls", ".xlsx"}


def ensure_po_upload_dir() -> Path:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    return UPLOAD_ROOT


async def save_po_document(po_id: int, file: UploadFile) -> str:
    ensure_po_upload_dir()

    original_name = Path(file.filename or "document").name
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    stored_name = f"po_{po_id}_{uuid4().hex}{suffix}"
    destination = UPLOAD_ROOT / stored_name

    content = await file.read()
    destination.write_bytes(content)

    return f"/uploads/purchase_orders/{stored_name}"
