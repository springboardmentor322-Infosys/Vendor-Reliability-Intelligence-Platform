from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.utils.security import get_current_email


# ==========================================
# ROLE NAMES
# ==========================================

ADMINISTRATOR = "Administrator"

PROCUREMENT_MANAGER = "Procurement Manager"

SUPPLY_CHAIN_MANAGER = "Supply Chain Manager"

VENDOR = "Vendor"

FINANCE_OFFICER = "Finance Officer"

AUDITOR = "Auditor"


# ==========================================
# GET CURRENT USER
# ==========================================

def get_current_user(
    email: str = Depends(get_current_email),
    db: Session = Depends(get_db)
):

    user = db.query(
        User
    ).filter(
        User.email == email
    ).first()

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user


# ==========================================
# REQUIRE SPECIFIC ROLE(S)
# ==========================================

def require_roles(*allowed_roles):

    def role_checker(
        current_user: User = Depends(
            get_current_user
        )
    ):

        if current_user.role not in allowed_roles:

            raise HTTPException(
                status_code=403,
                detail=(
                    "Access denied. "
                    "Required role: "
                    + ", ".join(allowed_roles)
                )
            )

        return current_user

    return role_checker