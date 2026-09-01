from sqlalchemy import Column, Integer, String, Date, ForeignKey

from app.database import Base


class Certification(Base):

    __tablename__ = "certifications"


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
        ForeignKey("vendors.id"),
        nullable=False,
        index=True
    )


    # ==========================================
    # CERTIFICATION INFORMATION
    # ==========================================

    certification_name = Column(
        String,
        nullable=False
    )

    certificate_number = Column(
        String,
        nullable=False,
        unique=True,
        index=True
    )

    issuing_authority = Column(
        String,
        nullable=True
    )


    # ==========================================
    # DATES
    # ==========================================

    issue_date = Column(
        Date,
        nullable=False
    )

    expiry_date = Column(
        Date,
        nullable=False
    )


    # ==========================================
    # STATUS
    # ==========================================

    status = Column(
        String,
        nullable=False,
        default="Active"
    )


    # ==========================================
    # NOTES
    # ==========================================

    notes = Column(
        String,
        nullable=True
    )