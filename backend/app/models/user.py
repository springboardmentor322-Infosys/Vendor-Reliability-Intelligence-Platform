from sqlalchemy import Column, Integer, String, ForeignKey

from app.database import Base


class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    full_name = Column(
        String,
        nullable=False
    )

    email = Column(
        String,
        unique=True,
        nullable=False
    )

    password = Column(
        String,
        nullable=False
    )

    role = Column(
        String,
        nullable=False,
        default="Vendor"
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=True,
        index=True
    )