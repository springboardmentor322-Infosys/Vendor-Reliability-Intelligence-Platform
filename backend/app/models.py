
from datetime import date

from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    vendor_name = Column(String(150), nullable=False)
    category = Column(String(100))
    contact_person = Column(String(100))
    email = Column(String(100), unique=True)
    phone = Column(String(20))
    address = Column(String(250))

    # Vendor performance scores
    delivery_score = Column(Float, default=0.0)
    quality_score = Column(Float, default=0.0)
    payment_score = Column(Float, default=0.0)
    compliance_score = Column(Float, default=0.0)

    # Risk management
    reliability_score = Column(Float, default=0.0)
    risk_level = Column(String(50), default="Pending")
    status = Column(String(50), default="Pending")

    # Relationships
    purchase_orders = relationship(
        "PurchaseOrder",
        back_populates="vendor"
    )

    performance_records = relationship(
        "VendorPerformance",
        back_populates="vendor"
    )


class VendorPerformance(Base):
    __tablename__ = "vendor_performance"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False
    )

    on_time_deliveries = Column(Integer, default=0)
    delayed_deliveries = Column(Integer, default=0)
    quality_rating = Column(Float, default=0.0)
    response_time = Column(Float, default=0.0)
    issue_resolution_time = Column(Float, default=0.0)
    order_completion_rate = Column(Float, default=0.0)
    performance_date = Column(Date, default=date.today)

    vendor = relationship(
        "Vendor",
        back_populates="performance_records"
    )


class Procurement(Base):
    __tablename__ = "procurements"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String(150), nullable=False)
    quantity = Column(Integer)
    budget = Column(Float)
    request_date = Column(Date)
    status = Column(String(50), default="Pending")

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=True
    )

    vendor = relationship("Vendor")

    purchase_orders = relationship(
        "PurchaseOrder",
        back_populates="procurement"
    )


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(
        String(100),
        unique=True,
        index=True
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=True
    )

    procurement_id = Column(
        Integer,
        ForeignKey("procurements.id"),
        nullable=True
    )

    order_date = Column(Date)
    delivery_date = Column(Date)
    item_category = Column(String(100))
    quantity = Column(Integer)
    unit_price = Column(Float)
    negotiated_price = Column(Float)
    defective_units = Column(Integer, default=0)
    compliance = Column(String(20))
    amount = Column(Float)
    status = Column(String(50), default="Pending")

    vendor = relationship(
        "Vendor",
        back_populates="purchase_orders"
    )

    procurement = relationship(
        "Procurement",
        back_populates="purchase_orders"
    )


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False
    )

    contract_name = Column(String(150), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(50), default="Active")
    compliance_status = Column(String(50), default="Pending")

    vendor = relationship("Vendor")


class Communication(Base):
    __tablename__ = "communications"

    id = Column(Integer, primary_key=True, index=True)

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False
    )

    procurement_id = Column(
        Integer,
        ForeignKey("procurements.id"),
        nullable=True
    )

    sender = Column(String(100), nullable=False)
    message = Column(String(500), nullable=False)
    communication_type = Column(String(50), default="Message")
    status = Column(String(50), default="Sent")
    communication_date = Column(Date, default=date.today)

    vendor = relationship("Vendor")
    procurement = relationship("Procurement")