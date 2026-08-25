"""Downloadable PDF and Excel reports generated from live database data."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import Role, User
from app.services.reports import (
    build_report,
    collect_compliance,
    collect_procurement_summary,
    collect_vendor_performance,
)

router = APIRouter(prefix="/reports", tags=["reports"])

REPORT_ROLES = {
    Role.ADMINISTRATOR,
    Role.FINANCE_OFFICER,
    Role.SUPPLY_CHAIN_MANAGER,
    Role.AUDITOR,
    Role.PROCUREMENT_MANAGER,
}


def _ensure_report_access(user: User) -> None:
    if user.role not in REPORT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


def _parse_format(fmt: str) -> str:
    normalized = fmt.lower().strip()
    if normalized in {"pdf"}:
        return "pdf"
    if normalized in {"xlsx", "excel", "xls"}:
        return "xlsx"
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="format must be pdf or xlsx",
    )


def _file_response(payload: dict, fmt: str) -> Response:
    content, filename, media_type = build_report(payload, fmt)
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/vendor-performance")
def download_vendor_performance_report(
    format: str = Query("pdf"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    _ensure_report_access(current_user)
    return _file_response(collect_vendor_performance(db), _parse_format(format))


@router.get("/procurement-summary")
def download_procurement_summary_report(
    format: str = Query("pdf"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    _ensure_report_access(current_user)
    return _file_response(collect_procurement_summary(db), _parse_format(format))


@router.get("/compliance")
def download_compliance_report(
    format: str = Query("pdf"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    _ensure_report_access(current_user)
    return _file_response(collect_compliance(db), _parse_format(format))
