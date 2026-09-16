"""Tests for authentication endpoints: register, login, refresh, /me."""

from __future__ import annotations

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import _auth, _make_user


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _reg_payload(**overrides):
    uid = uuid.uuid4().hex[:8]
    base = {
        "first_name": "John",
        "last_name": "Doe",
        "email": f"john_{uid}@example.com",
        "password": "Secure123!",
        "role_name": "Auditor",
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def test_register_success(client: TestClient):
    payload = _reg_payload()
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == payload["email"]


def test_register_duplicate_email(client: TestClient):
    payload = _reg_payload()
    r1 = client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201
    r2 = client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409


def test_register_invalid_role(client: TestClient):
    payload = _reg_payload(role_name="NonExistentRole")
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

def test_login_success(client: TestClient):
    payload = _reg_payload()
    client.post("/api/v1/auth/register", json=payload)
    r = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password(client: TestClient):
    payload = _reg_payload()
    client.post("/api/v1/auth/register", json=payload)
    r = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": "Wrong999!"})
    assert r.status_code == 401


def test_login_nonexistent_user(client: TestClient):
    r = client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "Abc12345!"})
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# Protected endpoint without auth
# ---------------------------------------------------------------------------

def test_protected_endpoint_without_token(client: TestClient):
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401


def test_protected_endpoint_with_garbage_token(client: TestClient):
    r = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# /me
# ---------------------------------------------------------------------------

def test_get_me(client: TestClient, db: Session):
    user = _make_user(db, "Auditor")
    r = client.get("/api/v1/auth/me", headers=_auth(user))
    assert r.status_code == 200
    assert r.json()["email"] == user.email


# ---------------------------------------------------------------------------
# Refresh token
# ---------------------------------------------------------------------------

def test_refresh_token_flow(client: TestClient):
    payload = _reg_payload()
    reg = client.post("/api/v1/auth/register", json=payload).json()
    refresh = reg["refresh_token"]
    r = client.post("/api/v1/auth/refresh-token", json={"refresh_token": refresh})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_refresh_token_invalid(client: TestClient):
    r = client.post("/api/v1/auth/refresh-token", json={"refresh_token": "bad.token.here"})
    assert r.status_code == 401
