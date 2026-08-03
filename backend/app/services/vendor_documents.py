from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "vendors"
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"}


def ensure_upload_dir() -> Path:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    return UPLOAD_ROOT


async def save_vendor_document(vendor_id: int, file: UploadFile) -> str:
    ensure_upload_dir()

    original_name = Path(file.filename or "document").name
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    stored_name = f"{vendor_id}_{uuid4().hex}{suffix}"
    destination = UPLOAD_ROOT / stored_name

    content = await file.read()
    destination.write_bytes(content)

    return f"/uploads/vendors/{stored_name}"
