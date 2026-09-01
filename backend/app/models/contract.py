from sqlalchemy import Column, Integer, String, Float, Date

from app.database import Base


class Contract(Base):

    __tablename__ = "contracts"


    # ==========================================
    # PRIMARY KEY
    # ==========================================

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )


    # ==========================================
    # VENDOR
    # ==========================================

    vendor_id = Column(
        Integer,
        nullable=False
    )


    # ==========================================
    # CONTRACT INFORMATION
    # ==========================================

    contract_name = Column(
        String,
        nullable=False
    )

    contract_number = Column(
        String,
        nullable=False,
        unique=True
    )

    contract_value = Column(
        Float,
        nullable=False,
        default=0
    )


    # ==========================================
    # CONTRACT DATES
    # ==========================================

    start_date = Column(
        Date,
        nullable=False
    )

    expiry_date = Column(
        Date,
        nullable=False
    )


    # ==========================================
    # CONTRACT STATUS
    # ==========================================

    status = Column(
        String,
        nullable=False,
        default="Active"
    )


    # ==========================================
    # RENEWAL TRACKING
    # ==========================================

    renewal_status = Column(
        String,
        nullable=False,
        default="Pending"
    )

    renewal_date = Column(
        Date,
        nullable=True
    )


    # ==========================================
    # COMPLIANCE
    # ==========================================

    compliance_status = Column(
        String,
        nullable=False,
        default="Compliant"
    )


    # ==========================================
    # DESCRIPTION
    # ==========================================

    description = Column(
        String,
        nullable=True
    )