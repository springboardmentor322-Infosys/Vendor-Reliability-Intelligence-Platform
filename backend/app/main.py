from fastapi import FastAPI

from app.routes import auth

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Vendor Reliability Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)

@app.get("/")
def root():
    return {
        "message": "Vendor Reliability Platform API is Running"
    }