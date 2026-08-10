from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user, get_current_user_with_role
from app.db.session import get_db
from app.models.user import Role, User
from app.models.vendoriq import (
    ProcurementRequest,
    ProcurementRequestItem,
    ProcurementRequestStatus,
)
from app.schemas.procurement import (
    ProcurementRequestCreate,
    ProcurementRequestReject,
    ProcurementRequestResponse,
)
from app.services.email import notify_procurement_decision
from app.services.in_app_notifications import create_notification

router = APIRouter(prefix="/procurement-requests", tags=["procurement-requests"])

HIGH_VALUE_THRESHOLD = Decimal("10000")


def _get_request_or_404(request_id: int, db: Session) -> ProcurementRequest:
    pr = db.scalar(
        select(ProcurementRequest)
        .options(selectinload(ProcurementRequest.items))
        .where(ProcurementRequest.id == request_id)
    )
    if pr is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Procurement request not found",
        )
    return pr


@router.post("", response_model=ProcurementRequestResponse, status_code=status.HTTP_201_CREATED)
def create_procurement_request(
    payload: ProcurementRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user_with_role([Role.SUPPLY_CHAIN_MANAGER])
    ),
) -> ProcurementRequest:
    """Create a new procurement request with line items.

    Only Supply Chain Managers may create procurement requests.
    total_estimated_cost is auto-calculated from the line items.
    """
    total = sum(
        Decimal(str(item.quantity)) * Decimal(str(item.estimated_unit_cost))
        for item in payload.items
    )

    pr = ProcurementRequest(
        requested_by=current_user.id,
        department=payload.department,
        status=ProcurementRequestStatus.PENDING,
        total_estimated_cost=total,
    )

    pr.items = [
        ProcurementRequestItem(
            item_name=item.item_name,
            quantity=item.quantity,
            estimated_unit_cost=Decimal(str(item.estimated_unit_cost)),
        )
        for item in payload.items
    ]

    db.add(pr)
    db.commit()
    db.refresh(pr)
    return pr


@router.get("", response_model=list[ProcurementRequestResponse])
def list_procurement_requests(
    department: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProcurementRequest]:
    """List procurement requests with optional filters."""
    query = (
        select(ProcurementRequest)
        .options(selectinload(ProcurementRequest.items))
        .order_by(ProcurementRequest.id.desc())
    )

    if department:
        query = query.where(ProcurementRequest.department.ilike(f"%{department}%"))

    if status_filter:
        query = query.where(ProcurementRequest.status == status_filter)

    return list(db.scalars(query))


@router.get("/{request_id}", response_model=ProcurementRequestResponse)
def get_procurement_request(
    request_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ProcurementRequest:
    """Get a single procurement request with its line items."""
    return _get_request_or_404(request_id, db)


@router.put("/{request_id}/approve", response_model=ProcurementRequestResponse)
def approve_procurement_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProcurementRequest:
    """Approve a procurement request.

    Approval rules:
    - If total_estimated_cost > $10,000: only Finance Officer can approve.
    - If total_estimated_cost <= $10,000: Procurement Manager or Finance Officer can approve.
    """
    pr = _get_request_or_404(request_id, db)

    if pr.status != ProcurementRequestStatus.PENDING:
        current = pr.status.value if hasattr(pr.status, "value") else pr.status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve a request with status '{current}'",
        )

    is_high_value = pr.total_estimated_cost > HIGH_VALUE_THRESHOLD

    if is_high_value:
        if current_user.role != Role.FINANCE_OFFICER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Requests over $10,000 require Finance Officer approval",
            )
    else:
        if current_user.role not in {Role.PROCUREMENT_MANAGER, Role.FINANCE_OFFICER}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Procurement Managers or Finance Officers can approve requests",
            )

    pr.status = ProcurementRequestStatus.APPROVED
    pr.rejection_reason = None
    db.commit()
    db.refresh(pr)

    requester = db.get(User, pr.requested_by)
    if requester:
        notify_procurement_decision(
            requester_email=requester.email,
            requester_name=requester.name,
            request_id=pr.id,
            department=pr.department,
            approved=True,
        )
        create_notification(
            db,
            user_id=requester.id,
            notification_type="procurement_approved",
            title=f"Procurement Request #{pr.id} Approved",
            message=f"Your procurement request for {pr.department} has been approved.",
            related_entity_type="procurement_request",
            related_entity_id=pr.id,
        )
        db.commit()

    return pr


@router.put("/{request_id}/reject", response_model=ProcurementRequestResponse)
def reject_procurement_request(
    request_id: int,
    payload: ProcurementRequestReject,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user_with_role([Role.PROCUREMENT_MANAGER, Role.FINANCE_OFFICER])
    ),
) -> ProcurementRequest:
    """Reject a procurement request with a reason."""
    pr = _get_request_or_404(request_id, db)

    if pr.status != ProcurementRequestStatus.PENDING:
        current = pr.status.value if hasattr(pr.status, "value") else pr.status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject a request with status '{current}'",
        )

    pr.status = ProcurementRequestStatus.CANCELLED
    pr.rejection_reason = payload.reason
    db.commit()
    db.refresh(pr)

    requester = db.get(User, pr.requested_by)
    if requester:
        notify_procurement_decision(
            requester_email=requester.email,
            requester_name=requester.name,
            request_id=pr.id,
            department=pr.department,
            approved=False,
            rejection_reason=payload.reason,
        )
        create_notification(
            db,
            user_id=requester.id,
            notification_type="procurement_rejected",
            title=f"Procurement Request #{pr.id} Rejected",
            message=f"Your procurement request for {pr.department} was rejected. Reason: {payload.reason}",
            related_entity_type="procurement_request",
            related_entity_id=pr.id,
        )
        db.commit()

    return pr
