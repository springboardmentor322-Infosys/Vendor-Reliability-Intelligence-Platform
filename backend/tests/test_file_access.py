"""Tests for secure file access endpoints and permissions."""

from __future__ import annotations

import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from tests.conftest import _auth, _make_user

def test_file_download_rbac_denied_without_auth(client: TestClient):
    r = client.get("/api/v1/files/download?path=contracts/nonexistent.pdf")
    assert r.status_code == 401

def test_file_download_unauthorized_path_garbage(client: TestClient, admin_user):
    r = client.get("/api/v1/files/download?path=contracts/../../sensitive_info.txt", headers=_auth(admin_user))
    # Safety checks will resolve and reject paths escaping uploads_dir with 400
    assert r.status_code == 400
