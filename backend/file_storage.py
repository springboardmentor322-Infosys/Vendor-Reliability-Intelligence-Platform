"""
file_storage.py — shared helper for saving uploaded files (contract copies,
vendor certifications/documents) to local disk.

Kept deliberately simple for this project's scope: local filesystem storage
under backend/uploads/, not S3 (the original brief's architecture diagram
lists AWS S3, but that needs cloud credentials this build doesn't have -
swapping this module for an S3-backed version later wouldn't require
touching the routers that call it, since they only see save_upload()/
get_upload_path()).
"""
import os
import uuid
from fastapi import HTTPException, UploadFile

UPLOAD_ROOT = os.path.join(os.path.dirname(__file__), "uploads")

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def save_upload(file: UploadFile, subfolder: str) -> tuple[str, str]:
    """Validates and saves an uploaded file. Returns (stored_relative_path, original_filename)."""
    original_name = file.filename or "upload"
    ext = os.path.splitext(original_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds the 10MB upload limit.")

    folder = os.path.join(UPLOAD_ROOT, subfolder)
    os.makedirs(folder, exist_ok=True)

    stored_name = f"{uuid.uuid4().hex}{ext}"
    relative_path = os.path.join(subfolder, stored_name)
    full_path = os.path.join(UPLOAD_ROOT, relative_path)

    with open(full_path, "wb") as f:
        f.write(contents)

    return relative_path, original_name


def get_upload_path(relative_path: str) -> str:
    return os.path.join(UPLOAD_ROOT, relative_path)
