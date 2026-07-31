from fastapi import APIRouter

router = APIRouter()

@router.post("/login")
def login():
    return {"message": "Login Successful"}

from fastapi import APIRouter

router = APIRouter()

@router.post("/register")
def register_user():
    return {
        "message": "Register Successful"
    }