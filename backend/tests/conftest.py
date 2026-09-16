"""
conftest.py — Shared pytest fixtures for VendorIQ backend tests.

Strategy: Use the REAL PostgreSQL database in a transactional fixture.
Every test runs inside a SAVEPOINT; after the test the savepoint is
rolled back so no data escapes into the development database.

This approach:
  - requires NO separate test database
  - requires NO schema migration at test time
  - is fast (no DDL per test)
  - is safe (changes never commit)
"""

from __future__ import annotations

import uuid
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.database.database import Base, get_db
from app.main import app
from app.models import Role, User, UserRole, Vendor, VendorCategory


# ---------------------------------------------------------------------------
# Database engine — uses the same URL as the app (dev DB) but wraps
# every test in a nested transaction (SAVEPOINT) that is rolled back.
# ---------------------------------------------------------------------------

TEST_ENGINE = create_engine(settings.database_url, pool_pre_ping=True)
TestSessionLocal = sessionmaker(bind=TEST_ENGINE, autoflush=False, autocommit=False)


@pytest.fixture(scope="session", autouse=True)
def _ensure_tables():
    """Ensure all tables exist (idempotent; safe on existing dev DB)."""
    Base.metadata.create_all(bind=TEST_ENGINE)


@pytest.fixture()
def db() -> Generator[Session, None, None]:
    """
    Yield a session whose work is wrapped in a SAVEPOINT.
    After the test, the savepoint is rolled back — dev data is untouched.
    """
    connection = TEST_ENGINE.connect()
    # Begin an outer transaction that we will NEVER commit
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)

    # Create a nested (SAVEPOINT) transaction inside the outer one
    nested = connection.begin_nested()

    yield session

    session.close()
    # Roll back to the SAVEPOINT, then roll back the outer transaction
    if nested.is_active:
        nested.rollback()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db: Session) -> TestClient:
    """HTTP test client that uses the transactional test session."""
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Role helpers
# ---------------------------------------------------------------------------

def _get_or_create_role(db: Session, name: str) -> Role:
    role = db.query(Role).filter_by(name=name).first()
    if role is None:
        role = Role(name=name)
        db.add(role)
        db.flush()
    return role


def _make_user(db: Session, role_name: str, email: str | None = None, password: str = "Passw0rd!") -> User:
    """Create a test user with a given role, return the User object."""
    if email is None:
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    role = _get_or_create_role(db, role_name)
    user = User(
        first_name="Test",
        last_name=role_name,
        email=email,
        password_hash=get_password_hash(password),
        is_active=True,
    )
    db.add(user)
    db.flush()
    db.add(UserRole(user_id=user.id, role_id=role.id))
    db.flush()
    # Reload with roles
    db.refresh(user)
    return user


def _token(user: User) -> str:
    role_names = [r.name for r in user.roles]
    return create_access_token(subject=user.id, roles=role_names)


def _auth(user: User) -> dict:
    return {"Authorization": f"Bearer {_token(user)}"}


# ---------------------------------------------------------------------------
# Named role fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def admin_user(db: Session) -> User:
    return _make_user(db, "Administrator")

@pytest.fixture()
def pm_user(db: Session) -> User:
    return _make_user(db, "Procurement Manager")

@pytest.fixture()
def scm_user(db: Session) -> User:
    return _make_user(db, "Supply Chain Manager")

@pytest.fixture()
def finance_user(db: Session) -> User:
    return _make_user(db, "Finance Officer")

@pytest.fixture()
def vendor_user(db: Session) -> User:
    return _make_user(db, "Vendor")

@pytest.fixture()
def auditor_user(db: Session) -> User:
    return _make_user(db, "Auditor")


# ---------------------------------------------------------------------------
# Shared entity fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def category(db: Session) -> VendorCategory:
    cat = VendorCategory(name=f"Category_{uuid.uuid4().hex[:6]}")
    db.add(cat)
    db.flush()
    return cat


@pytest.fixture()
def approved_vendor(db: Session, category: VendorCategory, admin_user: User) -> Vendor:
    """An approved vendor with no performance data yet."""
    uid = uuid.uuid4().hex[:6]
    vendor = Vendor(
        company_name=f"Test Vendor {uid}",
        registration_number=f"REG-{uid}",
        gst_number=f"GST-{uid}",
        email=f"vendor{uid}@test.com",
        phone="9000000000",
        address="123 Test Street",
        city="Mumbai",
        state="Maharashtra",
        country="India",
        postal_code="400001",
        category_id=category.id,
        approval_status="Approved",
        created_by=admin_user.id,
    )
    db.add(vendor)
    db.flush()
    return vendor
