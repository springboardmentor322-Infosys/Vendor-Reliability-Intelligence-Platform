from fastapi import APIRouter

from fastapi import APIRouter

router = APIRouter()

@router.post("/register")
def register():
    return {
        "message": "Register Successful"
    }

@router.post("/login")
def login():
    return {
        "message": "Login Successful"
    }