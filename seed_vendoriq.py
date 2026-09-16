"""
VendorIQ append-only development database seeder.

Purpose
-------
Adds realistic Indian supply-chain development data without deleting,
truncating, updating, replacing, or reusing existing primary keys.

IMPORTANT
---------
1. Set DATABASE_URL in the environment before running.
2. Run with --plan first. It only inspects the database and prints the plan.
3. Run with --seed to insert.
4. The script skips requested tables that do not exist.
5. It discovers columns, PKs, FKs, UNIQUE constraints, CHECK constraints,
   PostgreSQL enums, defaults, and existing values before inserting.
6. Existing users/vendors are loaded from PostgreSQL and referenced; they are never generated.
7. The whole seed runs in one transaction. Any constraint failure rolls the
   transaction back, so no partial seed remains.
7. Existing rows are never modified.

Example PowerShell:
    $env:DATABASE_URL="postgresql+psycopg://postgres:<PASSWORD>@localhost:5432/Vendor-Reliability"
    python seed_vendoriq.py --plan
    python seed_vendoriq.py --seed

If your project uses psycopg2 instead:
    postgresql+psycopg2://postgres:<PASSWORD>@localhost:5432/Vendor-Reliability
"""

from __future__ import annotations

import argparse
import calendar
import json
import math
import os
import random
import re
import sys
import uuid
from collections import defaultdict, deque
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    Integer,
    MetaData,
    Numeric,
    String,
    Text,
    create_engine,
    inspect,
    select,
    text,
)
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.sql.sqltypes import LargeBinary


# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------

SEED_VERSION = "VendorIQ-DevSeed-2026-09"
TODAY = date(2026, 9, 16)
START_DATE = date(2025, 9, 1)
END_DATE = date(2027, 3, 31)

# User-requested counts. A missing table is skipped.
REQUESTED_COUNTS: dict[str, int] = {
    "compliance_frameworks": 15,
    "compliance_areas": 15,

    "invoices": 250,
    "invoice_items": 500,
    "invoice_history": 150,
    "invoice_workflows": 100,
    "invoice_workflow_steps": 200,
    "invoice_attachments": 150,
    "payments": 200,

    "contracts": 100,
    "compliance_activities": 100,
    "compliance_deadlines": 100,
    "compliance_alerts": 100,
    "compliance_report_history": 100,
    "compliance_requirement_history": 100,
    "compliance_requirements": 150,

    "alerts": 100,
    "alert_rules": 50,
    "alert_escalations": 50,
    "notifications": 100,
    "notification_logs": 50,
    "system_alerts": 50,

    "finance_transactions": 100,
    "finance_payments": 100,
    "finance_payables": 100,
    "finance_obligations": 100,
    "finance_budgets": 50,
    "finance_cash_flow": 50,
    "finance_monthly_expenses": 50,
    "finance_recurring_expenses": 50,
    "finance_revenue_plans": 50,
    "finance_metrics": 50,
    "finance_alerts": 50,

    "audits": 50,
    "audit_assignments": 100,
    "audit_findings": 100,
    "audit_milestones": 100,
    "audit_progress_history": 100,
    "audit_recommendations": 100,
    "audit_risks": 100,
    "audit_logs": 50,

    "demand_plans": 50,
    "demand_plan_items": 100,
    "demand_forecasts": 150,
    "forecast_runs": 50,
    "analytics_snapshots": 50,
}

RNG = random.Random(20260916)

INDIAN_FIRST_NAMES = [
    "Aarav", "Aditi", "Aditya", "Akash", "Amar", "Ananya", "Arjun",
    "Bhavna", "Charan", "Deepak", "Divya", "Gaurav", "Harish", "Isha",
    "Karan", "Kavya", "Lakshmi", "Manish", "Meera", "Mohan", "Neha",
    "Nikhil", "Pooja", "Pradeep", "Priya", "Rahul", "Rakesh", "Ravi",
    "Rohit", "Sakshi", "Sameer", "Sanjay", "Shreya", "Siddharth",
    "Sneha", "Srinivas", "Swati", "Varun", "Vijay", "Vikram",
]

INDIAN_LAST_NAMES = [
    "Kumar", "Sharma", "Reddy", "Rao", "Naidu", "Patel", "Mehta",
    "Gupta", "Iyer", "Nair", "Verma", "Singh", "Das", "Joshi",
    "Kulkarni", "Choudhary", "Mishra", "Bhat", "Menon", "Pillai",
]

CITIES = [
    ("Hyderabad", "Telangana", "500081"),
    ("Vijayawada", "Andhra Pradesh", "520010"),
    ("Visakhapatnam", "Andhra Pradesh", "530016"),
    ("Guntur", "Andhra Pradesh", "522001"),
    ("Ongole", "Andhra Pradesh", "523001"),
    ("Chennai", "Tamil Nadu", "600032"),
    ("Bengaluru", "Karnataka", "560048"),
    ("Pune", "Maharashtra", "411019"),
    ("Mumbai", "Maharashtra", "400072"),
    ("Ahmedabad", "Gujarat", "380015"),
    ("Pune", "Maharashtra", "411057"),
    ("Delhi", "Delhi", "110037"),
    ("Noida", "Uttar Pradesh", "201301"),
    ("Kolkata", "West Bengal", "700091"),
    ("Coimbatore", "Tamil Nadu", "641014"),
]

COMPANY_PREFIXES = [
    "Apex", "Bharat", "Deccan", "Eastern", "Southern", "Shree",
    "Sree", "Triveni", "Sai", "Sri Lakshmi", "Pragati", "Vardhan",
    "Kaveri", "Godavari", "Krishna", "Nandi", "Andhra", "Telugu",
    "Horizon", "Vertex", "Prime", "Metro", "Reliable", "Precision",
]

COMPANY_TYPES = [
    "Industrial Supplies", "Engineering Components", "Packaging Solutions",
    "Electrical Systems", "Safety Products", "IT Services",
    "Logistics Services", "Chemical Products", "Warehouse Equipment",
    "MRO Supplies", "Food Ingredients", "Textile Materials",
]

PRODUCTS = [
    ("ITM-DEV-001", "Industrial Safety Gloves", "Safety Equipment", 120.0),
    ("ITM-DEV-002", "Corrugated Shipping Boxes", "Packaging", 38.0),
    ("ITM-DEV-003", "HDPE Packaging Bags", "Packaging", 24.0),
    ("ITM-DEV-004", "Stainless Steel Fasteners", "Raw Materials", 18.5),
    ("ITM-DEV-005", "Electrical Control Panels", "Electrical Equipment", 18500.0),
    ("ITM-DEV-006", "Copper Cable 4 sq mm", "Electrical Equipment", 145.0),
    ("ITM-DEV-007", "Pallet Stretch Film", "Packaging", 165.0),
    ("ITM-DEV-008", "Industrial Lubricant 20L", "MRO Supplies", 3250.0),
    ("ITM-DEV-009", "Warehouse Barcode Labels", "Warehouse Supplies", 2.8),
    ("ITM-DEV-010", "Pallet Racking Beam", "Warehouse Equipment", 4200.0),
    ("ITM-DEV-011", "Nitrile Chemical Gloves", "Safety Equipment", 175.0),
    ("ITM-DEV-012", "PLC Communication Module", "Electrical Equipment", 8200.0),
    ("ITM-DEV-013", "Industrial Cleaning Chemical", "Chemical Products", 290.0),
    ("ITM-DEV-014", "Thermal Transfer Ribbon", "Warehouse Supplies", 680.0),
    ("ITM-DEV-015", "HDMI/DisplayPort Adapters", "IT Services", 450.0),
]

FRAMEWORK_DATA = [
    ("ISO 9001", "ISO9001", "Quality Management System"),
    ("ISO 27001", "ISO27001", "Information Security Management"),
    ("ISO 14001", "ISO14001", "Environmental Management"),
    ("ISO 45001", "ISO45001", "Occupational Health and Safety"),
    ("ISO 22301", "ISO22301", "Business Continuity Management"),
    ("SOC 2 Type II", "SOC2-T2", "Service Organization Controls"),
    ("GDPR", "GDPR", "Data Protection and Privacy"),
    ("COBIT 2019", "COBIT2019", "IT Governance and Controls"),
    ("PCI DSS", "PCI-DSS", "Payment Card Data Security"),
    ("NIST CSF", "NIST-CSF", "Cybersecurity Risk Management"),
    ("CIS Controls", "CIS", "Cybersecurity Controls"),
    ("SA8000", "SA8000", "Social Accountability"),
    ("SEDEX/SMETA", "SMETA", "Ethical Supply Chain"),
    ("IATF 16949", "IATF16949", "Automotive Quality"),
    ("FSSC 22000", "FSSC22000", "Food Safety Management"),
]

AREA_DATA = [
    ("Supplier Quality", "SQ", "Supplier quality assurance and incoming quality"),
    ("Information Security", "IS", "Information security and access controls"),
    ("Data Privacy", "DP", "Personal data protection and privacy"),
    ("Business Continuity", "BC", "Continuity and recovery planning"),
    ("Environmental Management", "ENV", "Environmental controls and reporting"),
    ("Occupational Safety", "OH", "Worker health and safety"),
    ("Procurement Controls", "PROC", "Sourcing, approvals and segregation of duties"),
    ("Contract Management", "CON", "Contract obligations and renewals"),
    ("Financial Controls", "FIN", "Invoice, payment and financial controls"),
    ("Inventory Controls", "INV", "Stock accuracy, valuation and replenishment"),
    ("Warehouse Operations", "WH", "Warehouse handling and storage"),
    ("Transportation Safety", "TRANS", "Transport planning and carrier controls"),
    ("Document Control", "DOC", "Controlled records and document retention"),
    ("Access Management", "IAM", "User access lifecycle and privileges"),
    ("IT Governance", "ITG", "Technology governance and risk management"),
]

AUDIT_TYPES = [
    "Supplier Audit", "Procurement Audit", "Vendor Performance Audit",
    "Compliance Audit", "Invoice Control Audit", "Inventory Audit",
    "Warehouse Audit", "Information Security Audit",
]

DEPARTMENTS = [
    "Procurement", "Finance", "Supply Chain", "Warehouse",
    "IT", "Quality", "Compliance", "Logistics",
]

STATUS_FALLBACKS = {
    "invoice": ["Paid", "Pending", "Overdue", "Partially Paid"],
    "payment": ["Completed", "Pending", "Failed", "Partially Paid"],
    "compliance": ["Compliant", "Pending", "Expiring", "Non-Compliant", "Overdue"],
    "audit": ["Not Started", "In Progress", "Completed", "On Hold"],
    "generic": ["Active", "Pending", "Completed", "Open", "Closed", "In Progress"],
}


# ---------------------------------------------------------------------------
# DATABASE INTROSPECTION
# ---------------------------------------------------------------------------

class TableInfo:
    def __init__(self, inspector, name: str):
        self.name = name
        self.columns = inspector.get_columns(name)
        self.column_names = [c["name"] for c in self.columns]
        self.colmap = {c["name"]: c for c in self.columns}
        self.pk = inspector.get_pk_constraint(name).get("constrained_columns") or []
        self.fks = inspector.get_foreign_keys(name)
        self.uniques = inspector.get_unique_constraints(name)
        self.indexes = inspector.get_indexes(name)
        self.checks = inspector.get_check_constraints(name)

        self.fk_by_col: dict[str, dict[str, Any]] = {}
        for fk in self.fks:
            local = fk.get("constrained_columns") or []
            remote = fk.get("referred_columns") or []
            for lcol, rcol in zip(local, remote):
                self.fk_by_col[lcol] = {
                    "table": fk["referred_table"],
                    "column": rcol,
                }

        self.unique_columns: set[str] = set()
        for u in self.uniques:
            for col in u.get("column_names") or []:
                self.unique_columns.add(col)

        for ix in self.indexes:
            if ix.get("unique"):
                for col in ix.get("column_names") or []:
                    self.unique_columns.add(col)

        for col in self.pk:
            self.unique_columns.add(col)


def get_engine() -> Engine:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Example:\n"
            '$env:DATABASE_URL="postgresql+psycopg://postgres:<PASSWORD>@localhost:5432/Vendor-Reliability"'
        )
    return create_engine(url, future=True, pool_pre_ping=True)


def load_schema(engine: Engine) -> dict[str, TableInfo]:
    insp = inspect(engine)
    return {name: TableInfo(insp, name) for name in insp.get_table_names()}


def discover_enum_values(engine: Engine) -> dict[str, list[str]]:
    """
    Discover PostgreSQL enum labels. This is used only as a source of
    database-supported status/value choices.
    """
    result: dict[str, list[str]] = {}
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT t.typname, e.enumlabel
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = current_schema()
            ORDER BY t.typname, e.enumsortorder
        """)).fetchall()

    for typname, label in rows:
        result.setdefault(typname, []).append(label)
    return result


def constraint_values(info: TableInfo, column: str) -> list[str]:
    """
    Extract simple IN (...) CHECK values for one column.
    """
    values: list[str] = []
    pattern = re.compile(
        rf'\b"?{re.escape(column)}"?\s+IN\s*\((.*?)\)',
        flags=re.IGNORECASE | re.DOTALL,
    )

    for chk in info.checks:
        sql = chk.get("sqltext") or ""
        m = pattern.search(sql)
        if not m:
            continue
        for raw in m.group(1).split(","):
            raw = raw.strip().strip("'").strip('"')
            if raw:
                values.append(raw)

    return list(dict.fromkeys(values))


def existing_values(engine: Engine, table: str, column: str) -> set[str]:
    """
    Small-column distinct scan used for statuses, enum-like values and
    category discovery. No data is modified.
    """
    sql = text(f'SELECT DISTINCT "{column}" FROM "{table}" WHERE "{column}" IS NOT NULL')
    with engine.connect() as conn:
        try:
            rows = conn.execute(sql).fetchall()
        except SQLAlchemyError:
            return set()

    return {str(row[0]) for row in rows if row[0] is not None}


def db_default(info: TableInfo, column: str) -> Any:
    return info.colmap.get(column, {}).get("default")


# ---------------------------------------------------------------------------
# SAFE VALUE HELPERS
# ---------------------------------------------------------------------------

def person_name(i: int) -> str:
    return f"{INDIAN_FIRST_NAMES[i % len(INDIAN_FIRST_NAMES)]} {INDIAN_LAST_NAMES[(i * 3) % len(INDIAN_LAST_NAMES)]}"


def email_for(name: str, i: int, domain="vendoriq.example.in") -> str:
    clean = re.sub(r"[^a-z0-9]+", ".", name.lower()).strip(".")
    return f"{clean}{i+1}@{domain}"


def phone_for(i: int) -> str:
    # Indian 10-digit mobile pattern, generated as development data.
    return f"{9 + (i % 2)}{700000000 + i:09d}"[-10:]


def address_for(i: int) -> str:
    city, state, pin = CITIES[i % len(CITIES)]
    road = 11 + (i * 7) % 89
    return f"Plot {road}, Industrial Estate, {city}, {state} {pin}"


def gstin_for(i: int) -> str:
    state_codes = ["37", "36", "29", "27", "33", "24", "07", "09", "19"]
    sc = state_codes[i % len(state_codes)]
    pan = f"ABCPM{i % 9}{(i * 7) % 9}EFG"
    # Keep it GST-shaped. These are development identifiers, not real tax IDs.
    return f"{sc}{pan}1Z{(i % 9) + 1}"


def company_name(i: int) -> str:
    prefix = COMPANY_PREFIXES[i % len(COMPANY_PREFIXES)]
    ctype = COMPANY_TYPES[(i * 5) % len(COMPANY_TYPES)]
    suffix = "Private Limited"
    return f"{prefix} {ctype} {suffix}"


def money(value: float) -> float:
    return float(
        Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    )


def month_start(offset: int) -> date:
    y = 2025 + (8 + offset) // 12
    m = (8 + offset) % 12 + 1
    return date(y, m, 1)


def add_months(d: date, n: int) -> date:
    m = d.month - 1 + n
    y = d.year + m // 12
    m = m % 12 + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def random_date(start=START_DATE, end=END_DATE) -> date:
    span = (end - start).days
    return start + timedelta(days=RNG.randint(0, max(0, span)))


def random_datetime(start=START_DATE, end=END_DATE) -> datetime:
    d = random_date(start, end)
    return datetime(
        d.year, d.month, d.day,
        RNG.randint(8, 18),
        RNG.randint(0, 59),
        RNG.randint(0, 59),
    )


def product(i: int) -> tuple[str, str, str, float]:
    return PRODUCTS[i % len(PRODUCTS)]


def status_values(engine: Engine, info: TableInfo, column: str, kind: str) -> list[str]:
    # Highest confidence: database CHECK values.
    vals = constraint_values(info, column)
    if vals:
        return vals

    # Next: actual existing distinct values.
    existing = sorted(existing_values(engine, info.name, column))
    if existing:
        return existing

    # PostgreSQL enum type.
    col = info.colmap.get(column)
    if col:
        typ = str(col.get("type"))
        enum_match = re.search(r"ENUM\((.*?)\)", typ, re.I)
        if enum_match:
            return [x.strip().strip("'") for x in enum_match.group(1).split(",")]

    # Column default is a database-supported application value.
    default = db_default(info, column)
    if default:
        m = re.search(r"'([^']+)'", str(default))
        if m:
            return [m.group(1)]

    return STATUS_FALLBACKS.get(kind, STATUS_FALLBACKS["generic"])


def load_reference_pools(engine: Engine) -> dict[str, list[Any]]:
    """Read authoritative parent IDs from the live database.

    These pools are read-only snapshots used by the seed generator.  In
    particular, users and vendors are NEVER generated by this script.
    """
    pools: dict[str, list[Any]] = {}
    queries = {
        "users": 'SELECT id FROM "users" WHERE id IS NOT NULL',
        "vendors": 'SELECT vendor_id FROM "vendors" WHERE vendor_id IS NOT NULL',
    }
    with engine.connect() as conn:
        for name, sql in queries.items():
            try:
                pools[name] = [r[0] for r in conn.execute(text(sql)).fetchall()]
            except SQLAlchemyError:
                pools[name] = []
    return pools


def choose_existing_fk(
    engine: Engine,
    info: TableInfo,
    column: str,
    inserted_ids: dict[tuple[str, str], list[Any]],
    reference_pools: dict[str, list[Any]] | None = None,
) -> Any | None:
    fk = info.fk_by_col.get(column)
    if not fk:
        return None

    key = (fk["table"], fk["column"])
    if inserted_ids.get(key):
        return RNG.choice(inserted_ids[key])

    # Prefer explicitly loaded authoritative pools for users/vendors.
    # This guarantees those entities come only from existing DB records.
    if reference_pools and fk["table"] in reference_pools:
        vals = reference_pools[fk["table"]]
        if vals:
            return RNG.choice(vals)

    sql = text(
        f'SELECT "{fk["column"]}" FROM "{fk["table"]}" '
        f'WHERE "{fk["column"]}" IS NOT NULL LIMIT 500'
    )
    with engine.connect() as conn:
        try:
            rows = conn.execute(sql).fetchall()
        except SQLAlchemyError:
            return None

    vals = [r[0] for r in rows if r[0] is not None]
    return RNG.choice(vals) if vals else None


def safe_identifier_value(table: str, column: str, i: int) -> str:
    low = column.lower()
    prefix = table[:8].upper().replace("_", "")

    if "invoice_number" == low or low in {"invoice_no", "invoice"}:
        return f"INV-DEV-{2025 + i // 100:04d}-{i + 1:05d}"
    if "contract_number" == low:
        return f"CON-DEV-{i + 1:05d}"
    if low in {"audit_number", "audit_no"}:
        return f"AUD-DEV-{i + 1:05d}"
    if low in {"vendor_code", "carrier_code", "warehouse_code"}:
        return f"{prefix}-DEV-{i + 1:04d}"
    if "code" in low:
        return f"{prefix}-{i + 1:05d}"
    if "reference" in low or "ref_no" in low:
        return f"REF-DEV-{i + 1:06d}"
    if "name" in low:
        return f"{prefix} Dev {i + 1}"
    if "title" in low:
        return f"{prefix} Control {i + 1}"
    if "email" in low:
        return email_for(person_name(i), i)
    if low in {"phone", "mobile", "contact_phone"}:
        return phone_for(i)
    if "gst" in low or "tax" in low:
        return gstin_for(i)
    if "address" in low:
        return address_for(i)
    return f"{prefix}-{i + 1:06d}"


# ---------------------------------------------------------------------------
# SCHEMA-SAFE VALUE HELPERS
# ---------------------------------------------------------------------------

def column_max_length(info: TableInfo, column: str) -> int | None:
    col = info.colmap.get(column)
    if not col:
        return None
    typ = col.get("type")
    length = getattr(typ, "length", None)
    return int(length) if length is not None else None


def fit_string(value: Any, max_length: int | None) -> Any:
    if not isinstance(value, str) or not max_length:
        return value
    if len(value) <= max_length:
        return value
    return value[:max_length]


def domain_values_for_column(
    engine: Engine, info: TableInfo, column: str, preferred: list[str], kind: str = "generic"
) -> list[str]:
    """Return database-supported values first, then preferred development values."""
    supported = status_values(engine, info, column, kind)
    if not supported:
        return preferred

    result: list[str] = []
    for wanted in preferred:
        exact = next((v for v in supported if str(v).lower() == wanted.lower()), None)
        if exact is not None and exact not in result:
            result.append(exact)
    if result:
        return result
    return supported


def make_alert_escalation_row(engine, info, i, inserted):
    row = base_context(engine, info, i, inserted)

    categories = [
        "Safety Equipment",
        "Raw Materials",
        "IT Services",
        "Packaging",
        "Electrical Equipment",
    ]
    priorities = ["Low", "Medium", "High", "Critical"]
    notify_roles = [
        "Admin",
        "Procurement Manager",
        "Finance Officer",
        "Supply Chain Manager",
        "Auditor",
    ]

    set_if(info, row, ["category"], categories[i % len(categories)])

    priority_col = first_column(info, ["priority"])
    if priority_col:
        vals = domain_values_for_column(
            engine, info, priority_col, priorities, "generic"
        )
        row[priority_col] = vals[i % len(vals)]

    # Escalation levels are intentionally small; the generic integer generator
    # previously produced values such as 679, which are not meaningful levels.
    set_if(info, row, ["escalation_level", "level"], (i % 4) + 1)
    set_if(info, row, ["delay_minutes", "delay"], [15, 30, 60, 120][i % 4])

    role_col = first_column(info, ["notify_role", "notification_role", "role"])
    if role_col:
        row[role_col] = notify_roles[i % len(notify_roles)]

    set_if(info, row, ["email_enabled"], True)
    set_if(info, row, ["sms_enabled"], i % 3 != 0)
    set_if(info, row, ["in_app_enabled"], True)
    set_if(info, row, ["active"], True)

    return row


def enforce_schema_string_lengths(info: TableInfo, row: dict[str, Any]) -> None:
    """Ensure reflected VARCHAR values cannot exceed their database length."""
    for name, value in list(row.items()):
        max_length = column_max_length(info, name)
        if max_length and isinstance(value, str) and len(value) > max_length:
            row[name] = fit_string(value, max_length)


# ---------------------------------------------------------------------------
# TARGETED ROW BUILDERS
# ---------------------------------------------------------------------------

def base_context(
    engine: Engine,
    info: TableInfo,
    i: int,
    inserted_ids: dict[tuple[str, str], list[Any]],
    reference_pools: dict[str, list[Any]] | None = None,
) -> dict[str, Any]:
    """
    Build values for common columns. Targeted table builders add semantic
    values afterward.
    """
    row: dict[str, Any] = {}
    reference_pools = reference_pools or REFERENCE_POOLS

    for col in info.columns:
        name = col["name"]
        low = name.lower()

        if name in info.pk and col.get("autoincrement", False):
            continue

        if name in info.fk_by_col:
            value = choose_existing_fk(engine, info, name, inserted_ids, reference_pools)
            if value is not None:
                row[name] = value
            continue

        typ = col["type"]

        if isinstance(typ, Boolean):
            row[name] = True
        elif isinstance(typ, (DateTime,)):
            row[name] = random_datetime()
        elif isinstance(typ, Date):
            row[name] = random_date()
        elif isinstance(typ, (Integer,)):
            if low in {"year"}:
                row[name] = RNG.choice([2025, 2026])
            elif "month" in low and "amount" not in low:
                row[name] = RNG.randint(1, 12)
            elif any(k in low for k in ["quantity", "units", "count", "total", "planned_orders"]):
                row[name] = RNG.randint(10, 5000)
            elif "score" in low or "accuracy" in low or "progress" in low:
                row[name] = RNG.randint(65, 98)
            else:
                row[name] = RNG.randint(1, 1000)
        elif isinstance(typ, Numeric):
            if any(k in low for k in ["rate", "percentage", "score", "accuracy"]):
                row[name] = round(RNG.uniform(1, 25), 2)
            else:
                row[name] = money(RNG.uniform(5000, 900000))
        elif isinstance(typ, Float):
            if any(k in low for k in ["rate", "percentage", "score", "accuracy", "progress"]):
                row[name] = round(RNG.uniform(1, 99), 2)
            else:
                row[name] = money(RNG.uniform(5000, 900000))
        elif isinstance(typ, LargeBinary):
            row[name] = b""
        elif isinstance(typ, String):
            if low == "status":
                vals = status_values(engine, info, name, "generic")
                row[name] = vals[i % len(vals)]
            elif "email" in low:
                row[name] = email_for(person_name(i), i)
            elif low in {"phone", "mobile", "contact_phone"}:
                row[name] = phone_for(i)
            elif "address" in low:
                row[name] = address_for(i)
            elif "gst" in low or "tax" in low:
                row[name] = gstin_for(i)
            elif low in {"country"}:
                row[name] = "India"
            elif low in {"currency", "currency_code"}:
                row[name] = "INR"
            elif "description" in low or "message" in low or "notes" in low:
                row[name] = "Development record for Indian supplier and supply-chain operations."
            elif "category" in low:
                row[name] = product(i)[2]
            elif "name" in low:
                row[name] = company_name(i)
            elif "person" in low or "manager" in low or "assignee" in low:
                row[name] = person_name(i)
            else:
                row[name] = safe_identifier_value(info.name, name, i)
        elif isinstance(typ, Text):
            row[name] = "Development record for VendorIQ supply-chain management."
        else:
            # Leave unknown nullable columns unset.
            if not col.get("nullable", True):
                row[name] = safe_identifier_value(info.name, name, i)

    return row


def first_column(info: TableInfo, candidates: list[str]) -> str | None:
    lower = {c.lower(): c for c in info.column_names}
    for c in candidates:
        if c.lower() in lower:
            return lower[c.lower()]
    return None


def set_if(info: TableInfo, row: dict[str, Any], candidates: list[str], value: Any):
    c = first_column(info, candidates)
    if c:
        row[c] = value


def make_framework_row(engine, info, i, inserted):
    row = base_context(engine, info, i, inserted)
    name, code, desc = FRAMEWORK_DATA[i % len(FRAMEWORK_DATA)]
    set_if(info, row, ["name", "framework_name", "title"], name)
    set_if(info, row, ["code", "framework_code"], code + f"-D{i+1:02d}")
    set_if(info, row, ["description", "details"], desc)
    return row


def make_area_row(engine, info, i, inserted):
    row = base_context(engine, info, i, inserted)
    name, code, desc = AREA_DATA[i % len(AREA_DATA)]
    set_if(info, row, ["name", "area_name", "title"], name)
    set_if(info, row, ["code", "area_code"], code + f"-D{i+1:02d}")
    set_if(info, row, ["description", "details"], desc)
    return row


def make_invoice_row(engine, info, i, inserted, invoice_meta):
    row = base_context(engine, info, i, inserted)

    # Required relationships: valid existing/new PO and vendor where schema allows.
    vendor = choose_existing_fk(engine, info, "vendor_id", inserted, REFERENCE_POOLS)
    if vendor is not None:
        row["vendor_id"] = vendor

    po = choose_existing_fk(engine, info, "po_id", inserted, REFERENCE_POOLS)
    if po is not None:
        row["po_id"] = po

    number = f"INV-DEV-{2025 + i // 100:04d}-{i + 1:05d}"
    inv_date = TODAY - timedelta(days=(i * 3) % 360)
    due_date = inv_date + timedelta(days=30)

    # Exactly 60/20/10/10 distribution.
    if i < 150:
        status = "Paid"
    elif i < 200:
        status = "Pending"
    elif i < 225:
        status = "Overdue"
    else:
        status = "Partially Paid"

    # Respect actual DB-supported values when discoverable.
    status_col = first_column(info, ["status"])
    if status_col:
        supported = status_values(engine, info, status_col, "invoice")
        exact = next((x for x in supported if x.lower() == status.lower()), None)
        row[status_col] = exact or supported[i % len(supported)]

    set_if(info, row, ["invoice_number"], number)
    amount = money(RNG.uniform(18500, 875000))
    set_if(info, row, ["amount", "total_amount", "invoice_total"], amount)
    set_if(info, row, ["invoice_date", "date"], inv_date)
    set_if(info, row, ["due_date"], due_date)

    if status == "Paid":
        set_if(info, row, ["paid_date"], min(TODAY, due_date - timedelta(days=2)))

    invoice_meta[i] = {
        "number": number,
        "amount": amount,
        "status": status,
        "invoice_date": inv_date,
        "due_date": due_date,
        "vendor": vendor,
        "po": po,
    }
    return row


def make_invoice_item_row(engine, info, i, inserted, invoice_meta, inserted_invoice_ids):
    row = base_context(engine, info, i, inserted)
    invoice_index = i % len(inserted_invoice_ids)
    invoice_id = inserted_invoice_ids[invoice_index]
    meta = invoice_meta.get(invoice_index, {
        "amount": 50000,
        "number": f"INV-DEV-{invoice_index+1:05d}",
    })

    row["invoice_id"] = invoice_id

    item_code, item_name, category, unit_price = product(i)
    quantity = max(1, int(meta["amount"] / (unit_price * 1.18 * 2)))
    quantity = min(quantity, 1000)
    net = money(quantity * unit_price)
    tax_rate = 18.0
    tax_amount = money(net * tax_rate / 100)
    total = money(net + tax_amount)

    # Keep line values reasonable. Invoice amount itself remains the source
    # amount because the current schema has no guaranteed invoice-item sum check.
    set_if(info, row, ["purchase_order_item_id"], choose_existing_fk(
        engine, info, "purchase_order_item_id", inserted
    ))
    set_if(info, row, ["item_code", "product_code"], item_code)
    set_if(info, row, ["description", "item_name", "product_name"], item_name)
    set_if(info, row, ["quantity", "qty"], quantity)
    set_if(info, row, ["unit_price", "price"], unit_price)
    set_if(info, row, ["tax_rate", "gst_rate"], tax_rate)
    set_if(info, row, ["tax_amount", "gst_amount"], tax_amount)
    set_if(info, row, ["amount", "line_amount", "total_amount"], total)
    return row


def make_contract_row(engine, info, i, inserted):
    row = base_context(engine, info, i, inserted)
    vendor = choose_existing_fk(engine, info, "vendor_id", inserted, REFERENCE_POOLS)
    if vendor is not None:
        row["vendor_id"] = vendor

    set_if(info, row, ["contract_number"], f"CON-DEV-{i+1:05d}")
    start = TODAY - timedelta(days=RNG.randint(30, 540))
    expiry = start + timedelta(days=RNG.randint(180, 730))
    set_if(info, row, ["start_date", "effective_date"], start)
    set_if(info, row, ["expiry_date", "end_date", "expiration_date"], expiry)
    set_if(info, row, ["renewal_date"], expiry + timedelta(days=2))
    set_if(info, row, ["contract_value", "value", "amount"], money(RNG.uniform(150000, 8500000)))

    sc = first_column(info, ["status"])
    if sc:
        vals = status_values(engine, info, sc, "compliance")
        preferred = ["Compliant", "Pending", "Expiring", "Non-Compliant", "Overdue"]
        row[sc] = next((v for v in vals if v == preferred[i % len(preferred)]), vals[i % len(vals)])
    return row


def make_compliance_report_history_row(engine, info, i, inserted):
    """Create a valid historical compliance report tied to an existing vendor."""
    row = base_context(engine, info, i, inserted)

    # vendor_id is a real FK to vendors. Never synthesize or mutate it.
    vendor = choose_existing_fk(engine, info, "vendor_id", inserted, REFERENCE_POOLS)
    if vendor is not None:
        row["vendor_id"] = vendor

    month_col = first_column(info, ["month", "report_month"])
    if month_col:
        preferred_months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ]
        vals = domain_values_for_column(engine, info, month_col, preferred_months, "generic")
        row[month_col] = vals[i % len(vals)]

    year_col = first_column(info, ["year", "report_year"])
    if year_col:
        row[year_col] = 2025 + ((i // 12) % 3)

    # Generate internally consistent compliance counts.
    compliant = RNG.randint(2, 12)
    expiring = RNG.randint(0, 3)
    pending = RNG.randint(0, 3)
    non_compliant = RNG.randint(0, 2)
    overdue = RNG.randint(0, 2)
    total = compliant + expiring + pending + non_compliant + overdue
    score = round((compliant / total) * 100, 2) if total else 100.0

    set_if(info, row, ["compliant_count"], compliant)
    set_if(info, row, ["expiring_count"], expiring)
    set_if(info, row, ["pending_count"], pending)
    set_if(info, row, ["non_compliant_count"], non_compliant)
    set_if(info, row, ["overdue_count"], overdue)
    set_if(info, row, ["compliance_score"], score)
    set_if(info, row, ["created_at"], random_datetime())
    return row


def make_compliance_row(engine, info, i, inserted):
    row = base_context(engine, info, i, inserted)
    vendor = choose_existing_fk(engine, info, "vendor_id", inserted, REFERENCE_POOLS)
    if vendor is not None:
        row["vendor_id"] = vendor

    framework = choose_existing_fk(engine, info, "framework_id", inserted)
    if framework is not None:
        row["framework_id"] = framework

    area = choose_existing_fk(engine, info, "area_id", inserted)
    if area is not None:
        row["area_id"] = area

    sc = first_column(info, ["status"])
    if sc:
        vals = status_values(engine, info, sc, "compliance")
        preferred = ["Compliant", "Pending", "Expiring", "Non-Compliant", "Overdue"]
        row[sc] = next((v for v in vals if v == preferred[i % len(preferred)]), vals[i % len(vals)])

    due = random_date()
    set_if(info, row, ["due_date", "deadline", "expiry_date"], due)
    set_if(info, row, ["review_date", "assessment_date"], due - timedelta(days=RNG.randint(1, 60)))
    set_if(info, row, ["title"], f"Supplier compliance review - {AREA_DATA[i % len(AREA_DATA)][0]}")
    set_if(info, row, ["description"], f"Vendor compliance assessment covering {AREA_DATA[i % len(AREA_DATA)][0]}.")
    return row


def make_audit_row(engine, info, i, inserted):
    row = base_context(engine, info, i, inserted)
    user = choose_existing_fk(engine, info, "created_by", inserted)
    if user is not None:
        row["created_by"] = user

    set_if(info, row, ["audit_number", "audit_no"], f"AUD-DEV-{i+1:05d}")
    audit_type = AUDIT_TYPES[i % len(AUDIT_TYPES)]
    set_if(info, row, ["audit_type", "type"], audit_type)
    set_if(info, row, ["title"], f"{audit_type} - {company_name(i)}")
    set_if(info, row, ["entity_name"], company_name(i))
    set_if(info, row, ["entity_type"], "Supplier")
    start = random_date()
    end = min(END_DATE, start + timedelta(days=RNG.randint(7, 30)))
    set_if(info, row, ["scheduled_date"], datetime.combine(start, datetime.min.time()))
    set_if(info, row, ["start_date"], start)
    set_if(info, row, ["end_date"], end)

    sc = first_column(info, ["status"])
    if sc:
        vals = status_values(engine, info, sc, "audit")
        preferred = ["Completed", "In Progress", "Not Started", "On Hold"]
        row[sc] = next((v for v in vals if v == preferred[i % len(preferred)]), vals[i % len(vals)])

    rc = first_column(info, ["risk_level", "risk"])
    if rc:
        row[rc] = ["Low", "Medium", "High"][i % 3]

    pc = first_column(info, ["progress"])
    if pc:
        row[pc] = [100, 65, 0, 35][i % 4]

    cc = first_column(info, ["compliance_score"])
    if cc:
        row[cc] = round([96, 88, 74, 61][i % 4] + RNG.random(), 2)

    return row


def make_demand_plan_row(engine, info, i, inserted):
    row = base_context(engine, info, i, inserted)
    start = month_start(i % 18)
    end = add_months(start, 5)
    set_if(info, row, ["plan_name", "name", "title"], f"Demand Plan - {start.strftime('%b %Y')}")
    set_if(info, row, ["time_horizon", "horizon"], "6 Months")
    set_if(info, row, ["start_date"], start)
    set_if(info, row, ["end_date"], end)
    total = RNG.randint(18000, 95000)
    set_if(info, row, ["total_demand"], total)
    set_if(info, row, ["planned_orders"], RNG.randint(12, 75))
    set_if(info, row, ["inventory_required"], int(total * RNG.uniform(0.25, 0.45)))
    set_if(info, row, ["service_level_target"], 95.0)
    return row


def make_forecast_run_row(engine, info, i, inserted):
    row = base_context(engine, info, i, inserted)
    set_if(info, row, ["forecast_name", "name", "title"], f"Monthly Forecast Run {i+1:03d}")
    set_if(info, row, ["horizon"], "6 Months")
    set_if(info, row, ["start_date"], add_months(date(2025, 9, 1), i % 18))
    set_if(info, row, ["accuracy"], round(RNG.uniform(82, 97), 2))
    sc = first_column(info, ["status"])
    if sc:
        vals = status_values(engine, info, sc, "generic")
        preferred = ["Completed", "Completed", "Completed", "In Progress"]
        row[sc] = next((v for v in vals if v == preferred[i % len(preferred)]), vals[i % len(vals)])
    set_if(info, row, ["created_by"], person_name(i))
    return row


def make_forecast_row(engine, info, i, inserted, forecast_run_ids, inventory_rows):
    row = base_context(engine, info, i, inserted)
    if forecast_run_ids:
        set_if(info, row, ["forecast_run_id"], forecast_run_ids[i % len(forecast_run_ids)])

    if inventory_rows:
        inv = inventory_rows[i % len(inventory_rows)]
        item_code = inv
    else:
        item_code = product(i)[0]

    item_code_val, item_name, category, _ = product(i)
    set_if(info, row, ["item_code"], item_code if item_code else item_code_val)
    set_if(info, row, ["product_name", "item_name"], item_name)
    set_if(info, row, ["category"], category)

    period = add_months(date(2025, 9, 1), i % 18)
    actual = RNG.randint(500, 12000)
    forecast = int(actual * RNG.uniform(0.88, 1.14))
    accuracy = max(60, min(99, 100 - abs(actual - forecast) / max(actual, 1) * 100))

    set_if(info, row, ["period_start"], period)
    set_if(info, row, ["period_label"], period.strftime("%b %Y"))
    set_if(info, row, ["forecast_units"], forecast)
    set_if(info, row, ["actual_units"], actual if period <= date(2026, 9, 1) else 0)
    set_if(info, row, ["accuracy"], round(accuracy, 2))
    return row


# ---------------------------------------------------------------------------
# GENERIC SPECIALIZED DATA
# ---------------------------------------------------------------------------

def make_row(
    engine: Engine,
    info: TableInfo,
    i: int,
    inserted: dict[tuple[str, str], list[Any]],
    context: dict[str, Any],
) -> dict[str, Any]:
    table = info.name

    if table == "alert_escalations":
        return make_alert_escalation_row(engine, info, i, inserted)

    if table == "compliance_frameworks":
        return make_framework_row(engine, info, i, inserted)

    if table == "compliance_areas":
        return make_area_row(engine, info, i, inserted)

    if table == "invoices":
        return make_invoice_row(engine, info, i, inserted, context["invoice_meta"])

    if table == "invoice_items":
        return make_invoice_item_row(
            engine,
            info,
            i,
            inserted,
            context["invoice_meta"],
            context["invoice_ids"],
        )

    if table == "contracts":
        return make_contract_row(engine, info, i, inserted)

    if table == "compliance_report_history":
        return make_compliance_report_history_row(engine, info, i, inserted)

    if table.startswith("compliance_"):
        return make_compliance_row(engine, info, i, inserted)

    if table == "audits":
        return make_audit_row(engine, info, i, inserted)

    if table == "demand_plans":
        return make_demand_plan_row(engine, info, i, inserted)

    if table == "forecast_runs":
        return make_forecast_run_row(engine, info, i, inserted)

    if table == "demand_forecasts":
        return make_forecast_row(
            engine,
            info,
            i,
            inserted,
            context.get("forecast_run_ids", []),
            context.get("inventory_item_codes", []),
        )

    row = base_context(engine, info, i, inserted)

    # Invoice-related children.
    if table in {
        "invoice_history",
        "invoice_workflows",
        "invoice_attachments",
    }:
        ids = context.get("invoice_ids", [])
        if ids:
            set_if(info, row, ["invoice_id"], ids[i % len(ids)])

    if table == "invoice_workflow_steps":
        ids = context.get("workflow_ids", [])
        if ids:
            set_if(info, row, ["workflow_id", "invoice_workflow_id"], ids[i % len(ids)])

    if table == "payments":
        ids = context.get("invoice_ids", [])
        if ids:
            set_if(info, row, ["invoice_id"], ids[i % len(ids)])
        meta = context.get("invoice_meta", {}).get(i % max(1, len(ids)), {})
        if meta:
            set_if(info, row, ["amount", "payment_amount"], money(meta.get("amount", 10000) * RNG.uniform(0.35, 1.0)))
            set_if(info, row, ["payment_date", "date"], meta.get("due_date", TODAY) - timedelta(days=RNG.randint(0, 10)))

    # Audit children.
    if table.startswith("audit_"):
        ids = context.get("audit_ids", [])
        if ids:
            set_if(info, row, ["audit_id"], ids[i % len(ids)])

    # Demand-plan children.
    if table == "demand_plan_items":
        ids = context.get("demand_plan_ids", [])
        if ids:
            set_if(info, row, ["demand_plan_id", "plan_id"], ids[i % len(ids)])
        code, name, category, price = product(i)
        set_if(info, row, ["item_code", "product_code"], code)
        set_if(info, row, ["product_name", "item_name"], name)
        set_if(info, row, ["category"], category)
        demand = RNG.randint(500, 12000)
        set_if(info, row, ["demand_quantity", "planned_quantity", "quantity"], demand)
        set_if(info, row, ["unit_price"], price)

    # Finance semantics.
    if table == "finance_transactions":
        types = ["expense", "income", "payment", "inflow", "outflow"]
        set_if(info, row, ["transaction_type", "type"], types[i % len(types)])
        set_if(info, row, ["transaction_date", "date"], random_date())
        set_if(info, row, ["category"], ["Vendor Payment", "Freight", "Utilities", "IT Services", "Raw Materials"][i % 5])
        set_if(info, row, ["department"], DEPARTMENTS[i % len(DEPARTMENTS)])
        set_if(info, row, ["amount"], money(RNG.uniform(15000, 1250000)))

    if table == "finance_budgets":
        set_if(info, row, ["department"], DEPARTMENTS[i % len(DEPARTMENTS)])
        set_if(info, row, ["budget"], money(RNG.uniform(3000000, 25000000)))
        set_if(info, row, ["allocated"], money(RNG.uniform(1500000, 18000000)))
        set_if(info, row, ["actual"], money(RNG.uniform(800000, 15000000)))
        set_if(info, row, ["year"], 2026)
        # Avoid the common (department, year) unique constraint.
        set_if(info, row, ["department"], f"{DEPARTMENTS[i % len(DEPARTMENTS)]} - Dev {i+1}")

    if table == "finance_cash_flow":
        set_if(info, row, ["month"], add_months(date(2025, 9, 1), i).strftime("%Y-%m"))
        set_if(info, row, ["inflow"], money(RNG.uniform(5000000, 30000000)))
        set_if(info, row, ["outflow"], money(RNG.uniform(3500000, 24000000)))
        set_if(info, row, ["net_cash_flow"], money(RNG.uniform(-1000000, 9000000)))

    if table in {"finance_monthly_expenses", "finance_recurring_expenses"}:
        set_if(info, row, ["month"], add_months(date(2025, 9, 1), i).strftime("%Y-%m"))
        set_if(info, row, ["expense_month"], add_months(date(2025, 9, 1), i).strftime("%Y-%m"))
        set_if(info, row, ["department"], DEPARTMENTS[i % len(DEPARTMENTS)])
        set_if(info, row, ["amount", "expense_amount"], money(RNG.uniform(50000, 1800000)))

    if table == "finance_revenue_plans":
        set_if(info, row, ["month"], add_months(date(2025, 9, 1), i).strftime("%Y-%m"))
        set_if(info, row, ["target", "target_revenue", "revenue"], money(RNG.uniform(8000000, 45000000)))

    if table == "finance_metrics":
        set_if(info, row, ["metric_name", "name", "title"], ["DSO", "Payables Outstanding", "Procurement Spend", "Gross Margin", "Cash Conversion Cycle"][i % 5])
        set_if(info, row, ["metric_value", "value"], round(RNG.uniform(65, 98), 2))

    # Generic alert severity/status values.
    if "severity" in [x.lower() for x in info.column_names]:
        sc = first_column(info, ["severity"])
        if sc:
            vals = status_values(engine, info, sc, "generic")
            preferred = ["Low", "Medium", "High", "Critical"]
            row[sc] = next((v for v in vals if v in preferred), vals[i % len(vals)])

    if "title" in [x.lower() for x in info.column_names]:
        set_if(info, row, ["title"], [
            "Vendor delivery performance alert",
            "Invoice approval pending",
            "Inventory below reorder level",
            "Compliance deadline approaching",
            "Finance payable ageing alert",
            "Purchase order approval required",
        ][i % 6])

    return row


# ---------------------------------------------------------------------------
# INSERTION SAFETY
# ---------------------------------------------------------------------------

def topological_order(
    schema: dict[str, TableInfo],
    requested: set[str],
) -> list[str]:
    """
    Parent-before-child ordering for requested tables. Existing parent rows
    may satisfy FKs, but ordering still helps when requested parents are
    themselves newly seeded.
    """
    nodes = set(x for x in requested if x in schema)
    deps: dict[str, set[str]] = {x: set() for x in nodes}

    for table in nodes:
        for fk in schema[table].fks:
            parent = fk["referred_table"]
            if parent in nodes and parent != table:
                deps[table].add(parent)

    ready = deque(sorted([t for t in nodes if not deps[t]]))
    result: list[str] = []

    while ready:
        t = ready.popleft()
        result.append(t)
        for child in sorted(nodes):
            if t in deps[child]:
                deps[child].remove(t)
                if not deps[child]:
                    ready.append(child)

    # Cyclic groups are appended deterministically; nullable FKs can normally
    # be left to the database.
    for t in sorted(nodes):
        if t not in result:
            result.append(t)

    return result


def row_is_insertable(info: TableInfo, row: dict[str, Any]) -> bool:
    for col in info.columns:
        name = col["name"]
        if not col.get("nullable", True):
            if name not in row and col.get("default") is None and name not in info.pk:
                return False
    return True


def get_insert_pk_value(result, info: TableInfo, conn) -> Any:
    if len(info.pk) != 1:
        return None
    return result.inserted_primary_key[0]


def insert_one(
    conn,
    info: TableInfo,
    row: dict[str, Any],
    existing_unique_cache: dict[tuple[str, str], set[Any]],
):
    """
    Insert exactly one new row. We do not use ON CONFLICT DO UPDATE.
    For a known unique value collision, a new value is generated by caller.
    """
    # Drop PK only when it is auto-generated.
    clean = {}
    for col in info.columns:
        name = col["name"]
        if name not in row:
            continue
        if name in info.pk and info.colmap[name].get("autoincrement", False):
            continue
        clean[name] = row[name]

    stmt = info_table(info).insert().values(**clean)
    return conn.execute(stmt)


def info_table(info: TableInfo):
    """
    Lazily build a SQLAlchemy Table from a TableInfo using only reflected
    columns. This avoids importing the application's Tables.py and therefore
    avoids accidentally calling create_all().
    """
    from sqlalchemy import Table, MetaData
    md = MetaData()
    return Table(info.name, md, autoload_with=ACTIVE_ENGINE)


ACTIVE_ENGINE: Engine | None = None
REFERENCE_POOLS: dict[str, list[Any]] = {}


def normalize_unique_values(
    engine: Engine,
    info: TableInfo,
    row: dict[str, Any],
    i: int,
    existing_unique_cache,
):
    """
    Prevent obvious unique collisions. Existing values are only read.
    """
    for col in info.unique_columns:
        if col not in row:
            continue

        # Foreign-key values are authoritative relationship IDs. They may
        # legitimately repeat across child/history rows and must never be
        # changed into synthetic values such as VND0000-D1.
        if col in info.fk_by_col:
            continue

        key = (info.name, col)
        if key not in existing_unique_cache:
            existing_unique_cache[key] = set()
            sql = text(f'SELECT "{col}" FROM "{info.name}" WHERE "{col}" IS NOT NULL')
            with engine.connect() as conn:
                try:
                    existing_unique_cache[key] = {r[0] for r in conn.execute(sql)}
                except SQLAlchemyError:
                    existing_unique_cache[key] = set()

        value = row[col]
        if value not in existing_unique_cache[key]:
            existing_unique_cache[key].add(value)
            continue

        # Make collision-free replacements for common identifiers.
        if isinstance(value, str):
            base = value
            suffix = 1
            max_length = column_max_length(info, col)
            while value in existing_unique_cache[key]:
                suffix_text = f"-D{suffix}"
                if max_length:
                    stem = base[: max(1, max_length - len(suffix_text))]
                    value = f"{stem}{suffix_text}"
                else:
                    value = f"{base}{suffix_text}"
                suffix += 1
            row[col] = value
            existing_unique_cache[key].add(value)


# ---------------------------------------------------------------------------
# PLAN / SEED
# ---------------------------------------------------------------------------

def print_plan(engine: Engine, schema: dict[str, TableInfo]):
    print("\nVendorIQ APPEND-ONLY DEVELOPMENT SEED PLAN")
    print("=" * 72)

    available = []
    skipped = []
    total = 0

    for table, count in REQUESTED_COUNTS.items():
        if table in schema:
            available.append((table, count))
            total += count
        else:
            skipped.append(table)

    for table, count in available:
        print(f"{table:40s} {count:>6,d}")

    print("-" * 72)
    print(f"{'TOTAL REQUESTED/AVAILABLE NEW ROWS':40s} {total:>6,d}")

    if skipped:
        print("\nSkipped because table does not exist:")
        for table in skipped:
            print(f"  - {table}")

    order = topological_order(schema, set(REQUESTED_COUNTS))
    print("\nInsert dependency order:")
    for n, table in enumerate(order, 1):
        print(f"{n:3d}. {table}")

    print("\nSafety:")
    print("  - No DELETE")
    print("  - No TRUNCATE")
    print("  - No UPDATE")
    print("  - Existing rows are read only")
    print("  - Existing primary keys are never supplied")
    print("  - One transaction; any failure rolls the complete seed back")


def seed(engine: Engine, schema: dict[str, TableInfo]):
    global ACTIVE_ENGINE, REFERENCE_POOLS
    ACTIVE_ENGINE = engine
    REFERENCE_POOLS = load_reference_pools(engine)

    print(f"Loaded existing users: {len(REFERENCE_POOLS.get('users', [])):,}")
    print(f"Loaded existing vendors: {len(REFERENCE_POOLS.get('vendors', [])):,}")
    if not REFERENCE_POOLS.get("users") and "users" in schema:
        raise RuntimeError("The users table exists but contains no usable user IDs; refusing to invent users.")
    if not REFERENCE_POOLS.get("vendors") and "vendors" in schema:
        raise RuntimeError("The vendors table exists but contains no usable vendor IDs; refusing to invent vendors.")

    requested = {t for t in REQUESTED_COUNTS if t in schema}
    order = topological_order(schema, requested)

    inserted_ids: dict[tuple[str, str], list[Any]] = defaultdict(list)
    existing_unique_cache: dict[tuple[str, str], set[Any]] = {}

    context: dict[str, Any] = {
        "invoice_meta": {},
        "invoice_ids": [],
        "workflow_ids": [],
        "audit_ids": [],
        "demand_plan_ids": [],
        "forecast_run_ids": [],
        "inventory_item_codes": [],
    }

    # Discover valid existing inventory item codes for forecast relationships.
    if "inventory_items" in schema:
        info = schema["inventory_items"]
        code_col = first_column(info, ["item_code", "code"])
        if code_col:
            sql = text(f'SELECT "{code_col}" FROM "inventory_items" WHERE "{code_col}" IS NOT NULL LIMIT 1000')
            with engine.connect() as conn:
                try:
                    context["inventory_item_codes"] = [r[0] for r in conn.execute(sql)]
                except SQLAlchemyError:
                    pass

    print("\nStarting append-only seed...")
    print(f"Tables to process: {len(order)}")
    print(f"Target rows: {sum(REQUESTED_COUNTS[t] for t in order):,}")

    with engine.begin() as conn:
        for table in order:
            info = schema[table]
            target = REQUESTED_COUNTS[table]
            inserted = 0

            for i in range(target):
                row = make_row(engine, info, i, inserted_ids, context)

                # Final schema guard: no reflected VARCHAR column may receive a
                # value longer than the database allows. Domain-specific builders
                # run before this guard, so valid values are preserved.
                enforce_schema_string_lengths(info, row)

                normalize_unique_values(
                    engine, info, row, i, existing_unique_cache
                )

                if not row_is_insertable(info, row):
                    # If a NOT NULL column is missing, try a final generic fill.
                    for col in info.columns:
                        name = col["name"]
                        if (
                            not col.get("nullable", True)
                            and name not in row
                            and name not in info.pk
                            and col.get("default") is None
                        ):
                            typ = col["type"]
                            low = name.lower()
                            if isinstance(typ, String):
                                row[name] = fit_string(
                                    safe_identifier_value(table, name, i),
                                    column_max_length(info, name),
                                )
                            elif isinstance(typ, Date):
                                row[name] = random_date()
                            elif isinstance(typ, DateTime):
                                row[name] = random_datetime()
                            elif isinstance(typ, Boolean):
                                row[name] = True
                            elif isinstance(typ, (Integer, Float, Numeric)):
                                row[name] = 1
                            elif isinstance(typ, Text):
                                row[name] = "VendorIQ development seed record."
                    if not row_is_insertable(info, row):
                        raise RuntimeError(
                            f"Cannot construct NOT NULL-safe row for {table}. "
                            f"Missing columns: "
                            f"{[c['name'] for c in info.columns if not c.get('nullable', True) and c['name'] not in row and c['name'] not in info.pk]}"
                        )

                try:
                    result = insert_one(conn, info, row, existing_unique_cache)
                except Exception as exc:
                    raise RuntimeError(
                        f"Insert failed: table={table}, row_index={i}, "
                        f"columns={sorted(row.keys())}\n{exc}"
                    ) from exc

                inserted += 1

                if len(info.pk) == 1:
                    pk_name = info.pk[0]
                    pk_value = result.inserted_primary_key[0]
                    inserted_ids[(table, pk_name)].append(pk_value)

                    if table == "invoices":
                        context["invoice_ids"].append(pk_value)
                    elif table == "invoice_workflows":
                        context["workflow_ids"].append(pk_value)
                    elif table == "audits":
                        context["audit_ids"].append(pk_value)
                    elif table == "demand_plans":
                        context["demand_plan_ids"].append(pk_value)
                    elif table == "forecast_runs":
                        context["forecast_run_ids"].append(pk_value)

            print(f"  {table:40s} +{inserted:>5,d}")

    print("\nSEED COMPLETED SUCCESSFULLY")
    print("The transaction committed. Existing records were not updated/deleted.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", action="store_true", help="Inspect DB and show seed plan only.")
    parser.add_argument("--seed", action="store_true", help="Insert the append-only development data.")
    args = parser.parse_args()

    if args.plan == args.seed:
        parser.error("Use exactly one of --plan or --seed.")

    engine = get_engine()

    try:
        schema = load_schema(engine)
    except Exception as exc:
        print(f"Database/schema inspection failed: {exc}", file=sys.stderr)
        raise SystemExit(2)

    if args.plan:
        print_plan(engine, schema)
        return

    print_plan(engine, schema)

    answer = input(
        "\nProceed with the append-only seed? Type SEED to continue: "
    ).strip()

    if answer != "SEED":
        print("Cancelled. No database changes were made.")
        return

    try:
        seed(engine, schema)
    except Exception as exc:
        print("\nSEED FAILED - transaction rolled back.", file=sys.stderr)
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()