from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
)


ALLOWED_REGISTRATION_ROLES = {
    "Administrator",
    "Vendor",
    "Procurement Manager",
    "Supply Chain Manager",
    "Finance Officer",
    "Auditor",
}


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)



# ---------------- REGISTER ---------------- #

@router.post("/register", response_model=schemas.UserResponse)
def register_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db)
):

    if user.role not in ALLOWED_REGISTRATION_ROLES:

        raise HTTPException(
            status_code=400,
            detail="Invalid role for self-registration"
        )


    existing_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()


    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )


    new_user = models.User(

        full_name=user.full_name,

        email=user.email,

        password=hash_password(user.password),

        role=user.role

    )


    db.add(new_user)

    db.commit()

    db.refresh(new_user)


    return new_user





# ---------------- LOGIN (Frontend JSON Login) ---------------- #

@router.post("/login", response_model=schemas.Token)
def login(
    user: schemas.UserLogin,
    db: Session = Depends(get_db)
):


    db_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()



    if db_user is None or not verify_password(
        user.password,
        db_user.password
    ):

        raise HTTPException(

            status_code=status.HTTP_401_UNAUTHORIZED,

            detail="Invalid email or password"

        )



    token = create_access_token(

        {

            "sub": db_user.email,

            "role": db_user.role

        }

    )



    return {
        "access_token": token,
        "refresh_token": create_refresh_token({"sub": db_user.email, "role": db_user.role}),
        "token_type": "bearer"
    }





# ---------------- SWAGGER OAUTH LOGIN ---------------- #

@router.post("/token", response_model=schemas.Token)
def oauth_login(

    form_data: OAuth2PasswordRequestForm = Depends(),

    db: Session = Depends(get_db)

):


    db_user = db.query(models.User).filter(

        models.User.email == form_data.username

    ).first()



    if db_user is None or not verify_password(

        form_data.password,

        db_user.password

    ):


        raise HTTPException(

            status_code=status.HTTP_401_UNAUTHORIZED,

            detail="Invalid email or password"

        )



    token = create_access_token(

        {

            "sub": db_user.email,

            "role": db_user.role

        }

    )



    return {
        "access_token": token,
        "refresh_token": create_refresh_token({"sub": db_user.email, "role": db_user.role}),
        "token_type": "bearer"
    }





# ---------------- PROFILE ---------------- #

@router.get("/me", response_model=schemas.UserResponse)
def get_me(

    current_user = Depends(get_current_user),

    db: Session = Depends(get_db)

):


    db_user = db.query(models.User).filter(

        models.User.email == current_user["email"]

    ).first()



    if db_user is None:

        raise HTTPException(

            status_code=status.HTTP_404_NOT_FOUND,

            detail="User not found"

        )


    return db_user

@router.post("/refresh", response_model=schemas.Token)
def refresh_token(payload: dict):
    from jose import jwt, JWTError
    from app.security import SECRET_KEY, ALGORITHM
    token = payload.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="Refresh token required")
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if data.get("type") != "refresh" or not data.get("sub"):
            raise ValueError
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    access = create_access_token({"sub": data["sub"], "role": data.get("role")})
    return {"access_token": access, "refresh_token": token, "token_type": "bearer"}


@router.post("/password-reset")
def password_reset(payload: dict, db: Session = Depends(get_db)):
    email = payload.get("email")
    new_password = payload.get("new_password")
    if not email or not new_password:
        raise HTTPException(status_code=400, detail="Email and new password are required")
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password = hash_password(new_password)
    db.commit()
    return {"message": "Password reset successfully"}

@router.get('/', response_model=list[schemas.UserResponse])
def list_users(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(models.User).order_by(models.User.id.desc()).all()
