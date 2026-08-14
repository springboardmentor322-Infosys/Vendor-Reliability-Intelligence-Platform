"""Seed fake Invoice, QualityInspection, Contract, ThreadMessage, and Notification data."""

from __future__ import annotations

import argparse
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from faker import Faker
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.db.session import SessionLocal
from app.models.communication import ThreadMessage
from app.models.supply_chain import Invoice, InvoiceStatus, QualityInspection
from app.models.user import Role, User
from app.models.vendor import Vendor
from app.models.vendoriq import (
    ComplianceFlag,
    Contract,
    ContractStatus,
    Notification,
    PurchaseOrder,
)

DEFAULT_TARGET = 25
fake = Faker()


def count_rows(db, model) -> int:
    return db.scalar(select(func.count()).select_from(model)) or 0


def pick_admin(db) -> User:
    admin = db.scalar(select(User).where(User.role == Role.ADMINISTRATOR).order_by(User.id))
    if admin is None:
        raise RuntimeError("No administrator user found.")
    return admin


def seed_invoices(db, target: int, rng: random.Random) -> int:
    existing = count_rows(db, Invoice)
    if existing >= target:
        return 0

    purchase_orders = list(db.scalars(select(PurchaseOrder).order_by(PurchaseOrder.id)))
    if not purchase_orders:
        print("Warning: no purchase orders found; skipping invoice seeding.")
        return 0

    inserted = 0
    needed = target - existing
    statuses = list(InvoiceStatus)

    for _ in range(needed):
        po = rng.choice(purchase_orders)
        due_date = po.order_date + timedelta(days=rng.randint(15, 60))
        status = rng.choice(statuses)
        paid_date = None
        if status == InvoiceStatus.PAID:
            paid_date = due_date - timedelta(days=rng.randint(0, 10))
        elif status == InvoiceStatus.OVERDUE:
            due_date = datetime.now(timezone.utc) - timedelta(days=rng.randint(1, 30))

        invoice = Invoice(
            purchase_order_id=po.id,
            invoice_number=f"INV-{uuid.uuid4().hex[:10].upper()}",
            amount=po.total_amount,
            status=status,
            due_date=due_date,
            paid_date=paid_date,
        )
        db.add(invoice)
        try:
            db.flush()
            inserted += 1
        except IntegrityError:
            db.rollback()

    db.commit()
    return inserted


def seed_quality_inspections(db, target: int, rng: random.Random) -> int:
    existing = count_rows(db, QualityInspection)
    if existing >= target:
        return 0

    purchase_orders = list(
        db.scalars(select(PurchaseOrder).options().order_by(PurchaseOrder.id))
    )
    if not purchase_orders:
        print("Warning: no purchase orders found; skipping quality inspection seeding.")
        return 0

    inserted = 0
    needed = target - existing

    for _ in range(needed):
        po = rng.choice(purchase_orders)
        inspection_date = po.order_date + timedelta(days=rng.randint(1, 21))
        defects = rng.randint(0, 8)
        quality_score = round(max(40.0, min(100.0, 100 - defects * rng.uniform(2, 7))), 2)

        inspection = QualityInspection(
            vendor_id=po.vendor_id,
            purchase_order_id=po.id,
            inspection_date=inspection_date,
            quality_score=quality_score,
            defects_found=defects,
            inspector_notes=fake.paragraph(nb_sentences=2),
        )
        db.add(inspection)
        db.flush()
        inserted += 1

    db.commit()
    return inserted


def seed_contracts(db, target: int, rng: random.Random) -> int:
    existing = count_rows(db, Contract)
    if existing >= target:
        return 0

    vendors = list(db.scalars(select(Vendor).order_by(Vendor.id)))
    if not vendors:
        print("Warning: no vendors found; skipping contract seeding.")
        return 0

    admin = pick_admin(db)
    inserted = 0
    needed = target - existing

    for _ in range(needed):
        vendor = rng.choice(vendors)
        start_date = datetime.now(timezone.utc) - timedelta(days=rng.randint(30, 400))
        expiry_date = start_date + timedelta(days=rng.randint(180, 730))
        status = ContractStatus.ACTIVE
        if expiry_date < datetime.now(timezone.utc):
            status = ContractStatus.EXPIRED

        contract = Contract(
            contract_number=f"TMP-{uuid.uuid4().hex}",
            vendor_id=vendor.id,
            created_by_user_id=admin.id,
            title=fake.catch_phrase(),
            start_date=start_date,
            expiry_date=expiry_date,
            renewal_notice_period_days=rng.choice([30, 60, 90]),
            contract_value=round(rng.uniform(5000, 250000), 2),
            currency="USD",
            terms=fake.paragraph(nb_sentences=3),
            compliance_flag=rng.choice(list(ComplianceFlag)),
            status=status,
        )
        db.add(contract)
        try:
            db.flush()
            contract.contract_number = f"CTR-SEED-{contract.id:06d}"
            db.commit()
            inserted += 1
        except IntegrityError:
            db.rollback()

    return inserted


def seed_thread_messages(db, target: int, rng: random.Random) -> int:
    existing = count_rows(db, ThreadMessage)
    if existing >= target:
        return 0

    users = list(db.scalars(select(User).where(User.is_active == True).order_by(User.id)))  # noqa: E712
    contracts = list(db.scalars(select(Contract).order_by(Contract.id)))
    purchase_orders = list(db.scalars(select(PurchaseOrder).order_by(PurchaseOrder.id)))

    threads: list[tuple[str, int]] = []
    threads.extend(("purchase_order", po.id) for po in purchase_orders)
    threads.extend(("contract", contract.id) for contract in contracts)

    if not threads or not users:
        print("Warning: need users and PO/contract records to seed thread messages.")
        return 0

    inserted = 0
    needed = target - existing

    for _ in range(needed):
        thread_type, reference_id = rng.choice(threads)
        sender = rng.choice(users)
        message = ThreadMessage(
            thread_type=thread_type,
            reference_id=reference_id,
            sender_id=sender.id,
            content=fake.sentence(nb_words=rng.randint(8, 18)),
        )
        db.add(message)
        db.flush()
        inserted += 1

    db.commit()
    return inserted


def seed_notifications(db, target: int, rng: random.Random) -> int:
    existing = count_rows(db, Notification)
    if existing >= target:
        return 0

    users = list(db.scalars(select(User).where(User.is_active == True).order_by(User.id)))  # noqa: E712
    if not users:
        print("Warning: no active users found; skipping notification seeding.")
        return 0

    notification_types = [
        "invoice_due",
        "delivery_update",
        "quality_alert",
        "contract_expiry",
        "po_status",
    ]
    entity_types = ["invoice", "delivery", "quality_inspection", "contract", "purchase_order"]

    inserted = 0
    needed = target - existing

    for _ in range(needed):
        user = rng.choice(users)
        entity_type = rng.choice(entity_types)
        notification = Notification(
            user_id=user.id,
            notification_type=rng.choice(notification_types),
            title=fake.sentence(nb_words=rng.randint(3, 7)),
            message=fake.paragraph(nb_sentences=2),
            is_read=rng.choice([True, False]),
            related_entity_type=entity_type,
            related_entity_id=rng.randint(1, 500),
        )
        db.add(notification)
        db.flush()
        inserted += 1

    db.commit()
    return inserted


def run_seed(target: int, seed: int) -> dict[str, int]:
    rng = random.Random(seed)
    db = SessionLocal()
    try:
        summary = {
            "invoices": seed_invoices(db, target, rng),
            "quality_inspections": seed_quality_inspections(db, target, rng),
            "contracts": seed_contracts(db, target, rng),
            "thread_messages": seed_thread_messages(db, target, rng),
            "notifications": seed_notifications(db, target, rng),
        }
        return summary
    finally:
        db.close()


def print_summary(summary: dict[str, int], target: int) -> None:
    print("Fake data seed summary")
    print("----------------------")
    print(f"Target per table: {target}+")
    for table, inserted in summary.items():
        print(f"{table:22} inserted: {inserted}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed fake linked supply chain data")
    parser.add_argument(
        "--target",
        type=int,
        default=DEFAULT_TARGET,
        help="Minimum rows per table (default: 25)",
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    if args.target < 1:
        print("Error: --target must be at least 1", file=sys.stderr)
        return 1

    try:
        summary = run_seed(args.target, args.seed)
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print_summary(summary, args.target)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
