from sqlalchemy import Column, Integer, String

from app.database import Base


class Vendor(Base):

    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)

    vendor_name = Column(String)

    email = Column(String, unique=True)

    phone = Column(String)

    address = Column(String)

    gst_number = Column(String)