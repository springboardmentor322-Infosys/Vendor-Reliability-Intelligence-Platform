from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models.certification import Certification
from app.models.contract import Contract
from app.models.invoice import Invoice
from app.models.user import User
from app.models.vendor import Vendor
from app.models.order import Order
from app.models.vendor_performance import VendorPerformance
from app.models.procurement_request import ProcurementRequest
from app.models.communication import Communication
from app.models.notification import Notification
from app.models.password_reset_token import PasswordResetToken
from app.models.contract_document import ContractDocument
from app.models.product import Product
from app.models.delivery import Delivery
from app.models.quality_inspection import QualityInspection

from app.routers.quality_inspection import router as quality_inspection_router
from app.routers import (
    auth,
    vendor,
    order,
    vendor_performance,
    procurement,
    invoice,
    contract,
    communication,
    notification,
    dashboard,
    reports,
    delivery,
    certification
)


from app.routers.user_management import (
    router as user_management_router
)

from app.routers.contract_documents import (
    router as contract_documents_router
)


from dotenv import load_dotenv


# ==========================================
# LOAD ENVIRONMENT VARIABLES
# ==========================================

load_dotenv()


# ==========================================
# CREATE DATABASE TABLES
# ==========================================

Base.metadata.create_all(
    bind=engine
)


# ==========================================
# CREATE FASTAPI APP
# ==========================================

app = FastAPI()


# ==========================================
# CORS
# ==========================================

origins = [

    "http://localhost:4200",

    "http://127.0.0.1:4200"

]


app.add_middleware(

    CORSMiddleware,

    allow_origins=origins,

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]

)


# ==========================================
# ROUTERS
# ==========================================

app.include_router(
    auth.router
)


app.include_router(
    vendor.router
)


app.include_router(
    order.router
)


app.include_router(
    vendor_performance.router
)


app.include_router(
    procurement.router
)


app.include_router(
    contract.router
)


app.include_router(
    invoice.router
)


app.include_router(
    communication.router
)


app.include_router(
    notification.router
)


app.include_router(
    delivery.router
)


app.include_router(
    dashboard.router
)


app.include_router(
    reports.router
)


app.include_router(
    user_management_router
)


app.include_router(
    contract_documents_router
)

app.include_router(
    quality_inspection_router
)

app.include_router(
    certification.router
)




# ==========================================
# HOME
# ==========================================

@app.get("/")
def home():

    return {
        "message": "Hello, VendorIQ!"
    }