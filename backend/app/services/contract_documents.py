"""Service for uploading contract files."""

import os
import uuid
from pathlib import Path

from fastapi import UploadFile

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "contracts"
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".rtf"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


async def save_contract_file(file: UploadFile) -> str:
    ext = Path(file.filename or "contract.pdf").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Invalid file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise ValueError(f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)} MB")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_name

    with open(file_path, "wb") as f:
        f.write(content)

    return f"/uploads/contracts/{unique_name}"


def ensure_contract_upload_dir() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
