from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from app.database import Base, engine
from app.models.user import User
from app.models.order import Order

from app.routers.auth import router as auth_router
from app.routers import auth, vendor, order

# Create all tables in the database
Base.metadata.create_all(bind=engine)

app = FastAPI()
origins = [
    "http://localhost:4200"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(vendor.router)
app.include_router(auth_router)
app.include_router(order.router)
@app.get("/")
def home():
    return {"message": "Hello, VendorIQ!"}