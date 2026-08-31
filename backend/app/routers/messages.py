from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.communication import ThreadMessage, ThreadType
from app.models.user import Role, User
from app.models.vendor import Vendor
from app.models.vendoriq import Contract, PurchaseOrder
from app.schemas.message import MessageCreate, MessageHistoryItem, MessageResponse, VALID_THREAD_TYPES

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


def _vendor_for_user(user: User, db: Session) -> Vendor | None:
    return db.scalar(
        select(Vendor).where((Vendor.user_id == user.id) | (Vendor.created_by == user.id))
    )


def _ensure_po_access(po: PurchaseOrder, user: User, db: Session) -> None:
    if user.role != Role.VENDOR:
        return
    vendor = db.get(Vendor, po.vendor_id)
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    owner_id = vendor.user_id if vendor.user_id is not None else vendor.created_by
    if owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


def _ensure_contract_access(contract: Contract, user: User, db: Session) -> None:
    if user.role != Role.VENDOR:
        return
    vendor = _vendor_for_user(user, db)
    if vendor is None or contract.vendor_id != vendor.id:
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


def _accessible_ids(user: User, db: Session) -> tuple[list[int], list[int]]:
    if user.role == Role.VENDOR:
        vendor = _vendor_for_user(user, db)
        if vendor is None:
            return [], []
        po_ids = list(db.scalars(select(PurchaseOrder.id).where(PurchaseOrder.vendor_id == vendor.id)))
        contract_ids = list(db.scalars(select(Contract.id).where(Contract.vendor_id == vendor.id)))
        return po_ids, contract_ids
    return list(db.scalars(select(PurchaseOrder.id))), list(db.scalars(select(Contract.id)))


@router.get("", response_model=list[MessageHistoryItem])
def list_message_history(
    vendor_id: int | None = Query(None),
    thread_type: str | None = Query(None),
    reference_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MessageHistoryItem]:
    if thread_type is not None and thread_type not in VALID_THREAD_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid thread_type. Must be one of: {', '.join(sorted(VALID_THREAD_TYPES))}",
        )

    po_ids, contract_ids = _accessible_ids(current_user, db)

    if vendor_id is not None:
        if current_user.role == Role.VENDOR:
            owned = _vendor_for_user(current_user, db)
            if owned is None or owned.id != vendor_id:
                return []
        if po_ids:
            po_ids = list(
                db.scalars(
                    select(PurchaseOrder.id).where(
                        PurchaseOrder.id.in_(po_ids),
                        PurchaseOrder.vendor_id == vendor_id,
                    )
                )
            )
        if contract_ids:
            contract_ids = list(
                db.scalars(
                    select(Contract.id).where(
                        Contract.id.in_(contract_ids),
                        Contract.vendor_id == vendor_id,
                    )
                )
            )

    if reference_id is not None:
        if thread_type == ThreadType.PURCHASE_ORDER.value:
            po_ids = [reference_id] if reference_id in po_ids else []
            contract_ids = []
        elif thread_type == ThreadType.CONTRACT.value:
            contract_ids = [reference_id] if reference_id in contract_ids else []
            po_ids = []
        else:
            po_ids = [reference_id] if reference_id in po_ids else []
            contract_ids = [reference_id] if reference_id in contract_ids else []

    filters = []
    if po_ids and thread_type in {None, ThreadType.PURCHASE_ORDER.value}:
        filters.append(
            (ThreadMessage.thread_type == ThreadType.PURCHASE_ORDER.value)
            & ThreadMessage.reference_id.in_(po_ids)
        )
    if contract_ids and thread_type in {None, ThreadType.CONTRACT.value}:
        filters.append(
            (ThreadMessage.thread_type == ThreadType.CONTRACT.value)
            & ThreadMessage.reference_id.in_(contract_ids)
        )
    if not filters:
        return []

    messages = list(
        db.scalars(
            select(ThreadMessage)
            .options(selectinload(ThreadMessage.sender))
            .where(or_(*filters))
            .order_by(ThreadMessage.created_at.desc())
            .limit(500)
        )
    )

    pos = {
        po.id: po
        for po in db.scalars(
            select(PurchaseOrder)
            .options(selectinload(PurchaseOrder.vendor))
            .where(PurchaseOrder.id.in_(po_ids))
        )
    } if po_ids else {}
    contracts = {
        contract.id: contract
        for contract in db.scalars(
            select(Contract)
            .options(selectinload(Contract.vendor))
            .where(Contract.id.in_(contract_ids))
        )
    } if contract_ids else {}

    history: list[MessageHistoryItem] = []
    for message in messages:
        vendor_ref = None
        vendor_name = None
        label = f"#{message.reference_id}"
        if message.thread_type == ThreadType.PURCHASE_ORDER.value:
            po = pos.get(message.reference_id)
            if po:
                label = po.po_number
                vendor_ref = po.vendor_id
                vendor_name = po.vendor.name if po.vendor else None
        else:
            contract = contracts.get(message.reference_id)
            if contract:
                label = contract.contract_number
                vendor_ref = contract.vendor_id
                vendor_name = contract.vendor.name if contract.vendor else None
        history.append(
            MessageHistoryItem(
                id=message.id,
                thread_type=message.thread_type,
                reference_id=message.reference_id,
                sender_id=message.sender_id,
                sender_name=message.sender.name if message.sender else None,
                content=message.content,
                created_at=message.created_at,
                vendor_id=vendor_ref,
                vendor_name=vendor_name,
                reference_label=label,
            )
        )
    return history


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
