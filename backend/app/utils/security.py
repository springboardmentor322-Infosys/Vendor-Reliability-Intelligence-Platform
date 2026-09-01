from datetime import datetime, timedelta, timezone
import os

import bcrypt
from dotenv import load_dotenv

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt


# ==========================================
# LOAD ENVIRONMENT VARIABLES
# ==========================================

load_dotenv()


# ==========================================
# JWT CONFIGURATION
# ==========================================

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:

    raise RuntimeError(
        "SECRET_KEY is not configured. "
        "Please add SECRET_KEY to the backend .env file."
    )


ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 30


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/token"
)


# ==========================================
# PASSWORD HASHING
# ==========================================

def hash_password(password: str) -> str:

    hashed = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    )

    return hashed.decode("utf-8")


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:

    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


# ==========================================
# CREATE JWT
# ==========================================

def create_access_token(data: dict):

    to_encode = data.copy()

    expire = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    to_encode.update({
        "exp": expire
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# ==========================================
# GET CURRENT USER EMAIL
# ==========================================

def get_current_email(
    token: str = Depends(oauth2_scheme)
):

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={
            "WWW-Authenticate": "Bearer"
        }
    )

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        email = payload.get("sub")

        if email is None:

            raise credentials_exception

        return email

    except JWTError:

        raise credentials_exception


# ==========================================
# ROLE BASED ACCESS CONTROL
# ==========================================

def require_roles(*allowed_roles):

    def role_checker(
        email: str = Depends(get_current_email)
    ):

        from app.database import SessionLocal
        from app.models.user import User

        db = SessionLocal()

        try:

            user = (
                db.query(User)
                .filter(
                    User.email == email
                )
                .first()
            )

            if not user:

                raise HTTPException(
                    status_code=404,
                    detail="User not found"
                )

            if user.role not in allowed_roles:

                raise HTTPException(
                    status_code=403,
                    detail="Access denied"
                )

            return user

        finally:

            db.close()

    return role_checker