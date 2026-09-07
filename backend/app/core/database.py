from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# Import all models to ensure SQLAlchemy registers them before any queries
from app.modules.auth.models import User, Role
from app.modules.vendors.models import Vendor, VendorCategory, VendorContact
from app.modules.contracts.models import Contract, ContractDocument
from app.modules.procurement.models import ProcurementRequest, PRItem, PurchaseOrder, POItem
from app.modules.audit.models import AuditLog
from app.modules.notifications.models import Notification
