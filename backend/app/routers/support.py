from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.vendoriq import SupportTicket
from app.schemas.support import SupportTicketCreate, SupportTicketResponse

router = APIRouter(prefix="/support", tags=["support"])


@router.post("/tickets", response_model=SupportTicketResponse, status_code=status.HTTP_201_CREATED)
def create_support_ticket(
    payload: SupportTicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SupportTicket:
    ticket = SupportTicket(
        user_id=current_user.id,
        name=payload.name.strip(),
        email=current_user.email,
        subject=payload.subject.strip(),
        message=payload.message.strip(),
        status="open",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket
