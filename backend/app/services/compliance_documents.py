"""Upload helpers for vendor compliance certifications."""

import uuid
from pathlib import Path

from fastapi import UploadFile

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "compliance"
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 20 * 1024 * 1024


def ensure_compliance_upload_dir() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def save_compliance_document(vendor_id: int, file: UploadFile) -> str:
    ext = Path(file.filename or "certificate.pdf").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Invalid file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise ValueError(f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)} MB")

    ensure_compliance_upload_dir()
    stored_name = f"{vendor_id}_{uuid.uuid4().hex}{ext}"
    destination = UPLOAD_DIR / stored_name
    destination.write_bytes(content)
    return f"/uploads/compliance/{stored_name}"
