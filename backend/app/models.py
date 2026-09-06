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
    quality = Column(Integer)
    response_time = Column(Integer)

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
    invoice_file = Column(String, nullable=True)
    proof_of_delivery = Column(String, nullable=True)

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(String, unique=True, index=True)
    vendor = Column(String)
    contract_name = Column(String)
    start_date = Column(String)
    expiry_date = Column(String)
    renewal_notice_period = Column(Integer, default=30)
    terms = Column(String, nullable=True)
    status = Column(String, default="Active")

class Procurement(Base):
    __tablename__ = "procurements"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String)
    quantity = Column(Integer)
    estimated_cost = Column(Integer)
    department = Column(String)
    status = Column(String, default="Pending")
