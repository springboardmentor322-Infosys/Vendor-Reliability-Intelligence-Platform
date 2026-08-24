import os

from datetime import datetime, timedelta

from dotenv import load_dotenv

from fastapi import Depends, HTTPException, status

from fastapi.security import OAuth2PasswordBearer

from jose import JWTError, jwt

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)


load_dotenv()


SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "vendor_reliability_secret_key"
)


ALGORITHM = os.getenv(
    "ALGORITHM",
    "HS256"
)


ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        "30"
    )
)



# Swagger OAuth Login Endpoint

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/users/token"
)





# ---------------- Password ----------------


def hash_password(password: str):

    return generate_password_hash(password)




def verify_password(
    plain_password: str,
    hashed_password: str
):

    return check_password_hash(
        hashed_password,
        plain_password
    )







# ---------------- JWT ----------------


def create_refresh_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(days=7), "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(data: dict):

    to_encode = data.copy()


    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )


    to_encode.update(
        {
            "exp": expire
        }
    )


    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )







def get_current_user(
    token: str = Depends(oauth2_scheme)
):

    credentials_exception = HTTPException(

        status_code=status.HTTP_401_UNAUTHORIZED,

        detail="Invalid authentication credentials"

    )


    try:

        payload = jwt.decode(

            token,

            SECRET_KEY,

            algorithms=[ALGORITHM]

        )


        email = payload.get("sub")

        role = payload.get("role")



        if email is None:

            raise credentials_exception



        return {

            "email": email,

            "role": role

        }



    except JWTError:

        raise credentials_exception







# ---------------- Role Check ----------------



def require_admin(
    current_user=Depends(get_current_user)
):

    if current_user["role"] not in ["Administrator", "Admin"]:

        raise HTTPException(

            status_code=403,

            detail="Admin access required"

        )


    return current_user






def require_procurement_manager(
    current_user=Depends(get_current_user)
):

    if current_user["role"] not in [

        "Administrator",
        "Admin",
        "Procurement Manager",
        "Supply Chain Manager"

    ]:

        raise HTTPException(

            status_code=403,

            detail="Procurement Manager access required"

        )


    return current_user






def require_finance(
    current_user=Depends(get_current_user)
):

    if current_user["role"] not in [

        "Administrator",
        "Admin",
        "Finance Officer"

    ]:

        raise HTTPException(

            status_code=403,

            detail="Finance Officer access required"

        )


    return current_user






def require_auditor(
    current_user=Depends(get_current_user)
):

    if current_user["role"] not in [

        "Administrator",
        "Admin",
        "Auditor"

    ]:

        raise HTTPException(

            status_code=403,

            detail="Auditor access required"

        )


    return current_user







# ---------------- Vendor Role Check ----------------


def require_vendor(
    current_user=Depends(get_current_user)
):

    if current_user["role"] != "Vendor":

        raise HTTPException(

            status_code=403,

            detail="Vendor access required"

        )


    return current_user