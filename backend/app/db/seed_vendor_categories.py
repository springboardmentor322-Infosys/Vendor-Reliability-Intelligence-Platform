"""Seed default vendor categories if the table is empty."""

from sqlalchemy import func, select

from app.models.vendor import VendorCategory

VENDOR_CATEGORY_NAMES = (
    "Raw Material Suppliers",
    "Equipment",
    "IT",
    "Logistics",
    "Services",
    "Maintenance",
)


def ensure_vendor_categories(db) -> bool:
    count = db.scalar(select(func.count()).select_from(VendorCategory))
    if count and count > 0:
        return False

    for name in VENDOR_CATEGORY_NAMES:
        db.add(VendorCategory(name=name))

    db.commit()
    print(f"Seeded {len(VENDOR_CATEGORY_NAMES)} vendor categories")
    return True
