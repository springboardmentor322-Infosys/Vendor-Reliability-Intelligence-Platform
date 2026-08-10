from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.communication import ThreadMessage, ThreadType
from app.models.user import Role, User
from app.models.vendor import Vendor
from app.models.vendoriq import Contract, PurchaseOrder
from app.schemas.message import MessageCreate, MessageResponse, VALID_THREAD_TYPES

router = APIRouter(prefix="/messages", tags=["messages"])


def _get_po_or_404(po_id: int, db: Session) -> PurchaseOrder:
    po = db.get(PurchaseOrder, po_id)
    if po is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    return po


def _get_contract_or_404(contract_id: int, db: Session) -> Contract:
    contract = db.get(Contract, contract_id)
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    return contract


def _ensure_po_access(po: PurchaseOrder, user: User, db: Session) -> None:
    if user.role == Role.VENDOR:
        vendor = db.get(Vendor, po.vendor_id)
        if vendor is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        owner_id = vendor.user_id if vendor.user_id else vendor.created_by
        if owner_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


def _ensure_contract_access(contract: Contract, user: User, db: Session) -> None:
    if user.role == Role.VENDOR:
        vendor = db.scalar(select(Vendor).where(Vendor.created_by == user.id))
        if not vendor or contract.vendor_id != vendor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


def _ensure_thread_access(thread_type: str, reference_id: int, user: User, db: Session) -> None:
    if thread_type == ThreadType.PURCHASE_ORDER.value:
        po = _get_po_or_404(reference_id, db)
        _ensure_po_access(po, user, db)
    elif thread_type == ThreadType.CONTRACT.value:
        contract = _get_contract_or_404(reference_id, db)
        _ensure_contract_access(contract, user, db)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid thread_type. Must be one of: {', '.join(sorted(VALID_THREAD_TYPES))}",
        )


def _to_response(message: ThreadMessage) -> MessageResponse:
    return MessageResponse(
        id=message.id,
        thread_type=message.thread_type,
        reference_id=message.reference_id,
        sender_id=message.sender_id,
        sender_name=message.sender.name if message.sender else None,
        content=message.content,
        created_at=message.created_at,
    )


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    _ensure_thread_access(payload.thread_type, payload.reference_id, current_user, db)

    message = ThreadMessage(
        thread_type=payload.thread_type,
        reference_id=payload.reference_id,
        sender_id=current_user.id,
        content=payload.content.strip(),
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    message = db.scalar(
        select(ThreadMessage)
        .options(selectinload(ThreadMessage.sender))
        .where(ThreadMessage.id == message.id)
    )

    return _to_response(message)


@router.get("/{thread_type}/{reference_id}", response_model=list[MessageResponse])
def list_messages(
    thread_type: str,
    reference_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MessageResponse]:
    if thread_type not in VALID_THREAD_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid thread_type. Must be one of: {', '.join(sorted(VALID_THREAD_TYPES))}",
        )

    _ensure_thread_access(thread_type, reference_id, current_user, db)

    messages = db.scalars(
        select(ThreadMessage)
        .options(selectinload(ThreadMessage.sender))
        .where(
            ThreadMessage.thread_type == thread_type,
            ThreadMessage.reference_id == reference_id,
        )
        .order_by(ThreadMessage.created_at.asc())
    ).all()

    return [_to_response(msg) for msg in messages]
