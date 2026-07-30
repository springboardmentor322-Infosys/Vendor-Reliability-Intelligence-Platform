import unittest
from types import SimpleNamespace

from app.core.config import Settings
from app.db import seed_admin
from app.models.user import Role


class FakeDB:
    def __init__(self, existing_admin=None):
        self.existing_admin = existing_admin
        self.added = []
        self.committed = False

    def scalar(self, *_args, **_kwargs):
        return self.existing_admin

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.committed = True


class SeedAdminTests(unittest.TestCase):
    def test_creates_admin_when_none_exists(self):
        db = FakeDB(existing_admin=None)
        settings = Settings(ADMIN_EMAIL="admin@example.com", ADMIN_PASSWORD="StrongPass123")

        created = seed_admin.ensure_admin_account(db, settings=settings)

        self.assertTrue(created)
        self.assertEqual(len(db.added), 1)
        self.assertTrue(db.committed)
        self.assertEqual(db.added[0].email, "admin@example.com")
        self.assertEqual(db.added[0].role, Role.ADMINISTRATOR)

    def test_updates_existing_admin_credentials(self):
        existing = SimpleNamespace(
            role=Role.ADMINISTRATOR,
            email="old@example.com",
            hashed_password="old-hash",
            is_active=False,
            name="Old Admin",
        )
        db = FakeDB(existing_admin=existing)
        settings = Settings(ADMIN_EMAIL="admin@example.com", ADMIN_PASSWORD="StrongPass123")

        created = seed_admin.ensure_admin_account(db, settings=settings)

        self.assertTrue(created)
        self.assertEqual(existing.email, "admin@example.com")
        self.assertTrue(existing.is_active)
        self.assertNotEqual(existing.hashed_password, "old-hash")
        self.assertTrue(db.committed)


if __name__ == "__main__":
    unittest.main()
