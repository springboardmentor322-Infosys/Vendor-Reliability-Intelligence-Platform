from sqlalchemy import Column, Integer, String
from app.database import Base

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    delivery = Column(String)
    category = Column(String)
    status = Column(String)
    score = Column(Integer)

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String, unique=True, index=True)
    vendor = Column(String)
    product = Column(String)
    amount = Column(Integer)
    status = Column(String)
    invoice_number = Column(String)
    invoice_status = Column(String)