from pathlib import Path

from fastapi import HTTPException, status
from fastapi.responses import FileResponse

UPLOADS_ROOT = Path(__file__).resolve().parents[2] / "uploads"

MEDIA_TYPES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def resolve_stored_file(file_url: str | None) -> Path:
    if not file_url or not file_url.startswith("/uploads/"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    relative = file_url.removeprefix("/uploads/").lstrip("/")
    path = (UPLOADS_ROOT / relative).resolve()
    root = UPLOADS_ROOT.resolve()
    if path != root and root not in path.parents:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return path


def file_response(file_url: str | None, download_name: str | None = None) -> FileResponse:
    path = resolve_stored_file(file_url)
    suffix = path.suffix.lower()
    media_type = MEDIA_TYPES.get(suffix, "application/octet-stream")
    filename = download_name or path.name
    return FileResponse(
        path,
        media_type=media_type,
        filename=filename,
        content_disposition_type="inline",
    )
