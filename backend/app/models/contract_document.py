from sqlalchemy import Column, Integer, String, Date, ForeignKey

from app.database import Base


class ContractDocument(Base):

    __tablename__ = "contract_documents"


    # ==========================================
    # PRIMARY KEY
    # ==========================================

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )


    # ==========================================
    # CONTRACT
    # ==========================================

    contract_id = Column(
        Integer,
        ForeignKey("contracts.id"),
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

    certification_number = Column(
        String,
        nullable=True
    )

    issue_date = Column(
        Date,
        nullable=True
    )

    expiry_date = Column(
        Date,
        nullable=True
    )

    status = Column(
        String,
        nullable=False,
        default="Active"
    )


    # ==========================================
    # DOCUMENT INFORMATION
    # ==========================================

    document_name = Column(
        String,
        nullable=True
    )

    document_path = Column(
        String,
        nullable=True
    )