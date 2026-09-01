from sqlalchemy import Column, Integer, String

from app.database import Base


class Vendor(Base):

    __tablename__ = "vendors"


    # ==========================================
    # PRIMARY KEY
    # ==========================================

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )


    # ==========================================
    # BASIC INFORMATION
    # ==========================================

    vendor_name = Column(
        String
    )

    email = Column(
        String,
        unique=True
    )

    phone = Column(
        String
    )

    address = Column(
        String
    )

    gst_number = Column(
        String
    )


    # ==========================================
    # VENDOR CATEGORY
    # ==========================================

    category = Column(
        String,
        default="Service Provider"
    )


    # ==========================================
    # CONTACT PERSON
    # ==========================================

    contact_person = Column(
        String,
        nullable=True
    )


    # ==========================================
    # APPROVAL STATUS
    # ==========================================

    approval_status = Column(
        String,
        default="Pending"
    )


    # ==========================================
    # VENDOR STATUS
    # ==========================================

    status = Column(
        String,
        default="Active"
    )