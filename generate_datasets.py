import csv
import os
import random
from datetime import date, timedelta

# ============================================================
# VENDORIQ DATASET GENERATOR
# ============================================================
#
# This script generates realistic sample data for:
# Vendor Reliability Intelligence &
# Procurement Risk Management Platform
#
# Run:
#     python generate_datasets.py
#
# Output:
#     datasets/*.csv
#
# ============================================================

random.seed(42)

# ------------------------------------------------------------
# PROJECT / OUTPUT LOCATION
# ------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "datasets")

os.makedirs(DATASET_DIR, exist_ok=True)


# ------------------------------------------------------------
# COMMON MASTER DATA
# ------------------------------------------------------------

CATEGORIES = [
    "Raw Materials",
    "Electronics",
    "Logistics",
    "Packaging",
    "IT Services",
    "Office Supplies",
    "Industrial Equipment",
    "Maintenance Services",
]

COUNTRIES = [
    "India",
    "USA",
    "UK",
    "Germany",
    "Singapore",
    "Australia",
    "Canada",
    "Netherlands",
]

FIRST_NAMES = [
    "Arjun",
    "Priya",
    "Rahul",
    "Sneha",
    "Vikram",
    "Ananya",
    "Rohan",
    "Kavya",
    "Aditya",
    "Neha",
    "Karthik",
    "Meera",
    "Sanjay",
    "Divya",
    "Amit",
]

LAST_NAMES = [
    "Mehta",
    "Nair",
    "Verma",
    "Kapoor",
    "Rao",
    "Sharma",
    "Patel",
    "Iyer",
    "Gupta",
    "Singh",
    "Kumar",
    "Menon",
    "Reddy",
    "Joshi",
]

VENDOR_PREFIXES = [
    "Nova",
    "Prime",
    "Global",
    "Vertex",
    "Apex",
    "Reliable",
    "Summit",
    "Metro",
    "BlueLine",
    "Green",
    "Titan",
    "Eastern",
    "United",
    "Advanced",
    "Precision",
]

VENDOR_SUFFIXES = [
    "Industries",
    "Solutions",
    "Technologies",
    "Suppliers",
    "Enterprises",
    "Systems",
    "Logistics",
    "Manufacturing",
    "Services",
    "Corporation",
]


# ------------------------------------------------------------
# HELPER FUNCTIONS
# ------------------------------------------------------------

def random_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def random_date(start_year=2024, end_year=2026):
    start = date(start_year, 1, 1)
    end = date(end_year, 8, 31)

    days = (end - start).days

    return start + timedelta(days=random.randint(0, days))


def write_csv(filename, rows, fields):

    path = os.path.join(DATASET_DIR, filename)

    with open(
        path,
        "w",
        newline="",
        encoding="utf-8"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fields
        )

        writer.writeheader()
        writer.writerows(rows)

    print(
        f"Created {filename:<30} "
        f"{len(rows):>5} records"
    )


# ============================================================
# 1. USERS
# ============================================================

print("\nGenerating USERS...")

roles = [
    ("Administrator", "admin"),
    ("Procurement Manager", "procurement"),
    ("Supply Chain Manager", "scm"),
    ("Vendor", "vendor"),
    ("Finance Officer", "finance"),
    ("Auditor", "auditor"),
]

users = []

for user_id, (role_name, role_code) in enumerate(roles, start=1):

    name = random_name()

    email = (
        role_code
        + "@vendoriq.io"
    )

    users.append({
        "id": user_id,
        "name": name,
        "email": email,
        "role": role_code,
        "roleName": role_name,
        "active": "true",
        "createdAt": str(random_date(2024, 2025)),
    })


write_csv(
    "users.csv",
    users,
    [
        "id",
        "name",
        "email",
        "role",
        "roleName",
        "active",
        "createdAt",
    ],
)


# ============================================================
# 2. VENDORS
# ============================================================

print("\nGenerating VENDORS...")

vendors = []

for vendor_id in range(1, 101):

    vendor_name = (
        f"{random.choice(VENDOR_PREFIXES)} "
        f"{random.choice(VENDOR_SUFFIXES)} "
        f"{vendor_id:03d}"
    )

    reliability_score = round(
        random.uniform(45, 98),
        1
    )

    if reliability_score >= 85:
        risk_level = "Low"
    elif reliability_score >= 70:
        risk_level = "Medium"
    elif reliability_score >= 50:
        risk_level = "High"
    else:
        risk_level = "Critical"

    # Most vendors are approved.
    status = random.choices(
        [
            "Approved",
            "Pending",
            "Rejected",
        ],
        weights=[
            75,
            20,
            5,
        ],
        k=1,
    )[0]

    vendors.append({
        "id": vendor_id,
        "name": vendor_name,
        "category": random.choice(CATEGORIES),
        "status": status,
        "email": f"vendor{vendor_id}@supplier.com",
        "phone": f"+91 90000 {vendor_id:05d}",
        "country": random.choice(COUNTRIES),
        "contactPerson": random_name(),
        "onboardedAt": str(
            random_date(2024, 2026)
        ),
        "reliabilityScore": reliability_score,
        "riskLevel": risk_level,
        "totalSpend": random.randint(
            25000,
            950000
        ),
    })


write_csv(
    "vendors.csv",
    vendors,
    [
        "id",
        "name",
        "category",
        "status",
        "email",
        "phone",
        "country",
        "contactPerson",
        "onboardedAt",
        "reliabilityScore",
        "riskLevel",
        "totalSpend",
    ],
)


# ============================================================
# 3. PROCUREMENT REQUESTS
# ============================================================

print("\nGenerating PROCUREMENT REQUESTS...")

procurement_requests = []

for request_id in range(1, 501):

    estimated_cost = random.randint(
        5000,
        500000
    )

    status = random.choices(
        [
            "Pending",
            "Approved",
            "Rejected",
            "Completed",
        ],
        weights=[
            25,
            45,
            10,
            20,
        ],
        k=1,
    )[0]

    procurement_requests.append({
        "id": request_id,
        "requestNumber": f"PR-{2026}-{request_id:05d}",
        "title": f"Procurement Requirement {request_id:04d}",
        "category": random.choice(CATEGORIES),
        "quantity": random.randint(10, 2000),
        "estimatedCost": estimated_cost,
        "requestedBy": random_name(),
        "priority": random.choice([
            "Low",
            "Medium",
            "High",
            "Critical",
        ]),
        "status": status,
        "requestDate": str(
            random_date(2024, 2026)
        ),
    })


write_csv(
    "procurement_requests.csv",
    procurement_requests,
    [
        "id",
        "requestNumber",
        "title",
        "category",
        "quantity",
        "estimatedCost",
        "requestedBy",
        "priority",
        "status",
        "requestDate",
    ],
)


# ============================================================
# 4. PURCHASE ORDERS
# ============================================================

print("\nGenerating PURCHASE ORDERS...")

purchase_orders = []

po_statuses = [
    "Draft",
    "Pending Approval",
    "Approved",
    "Ordered",
    "Delivered",
    "Completed",
    "Cancelled",
]

for po_id in range(1, 1001):

    vendor_id = random.randint(1, 100)

    request_id = random.randint(
        1,
        500
    )

    amount = random.randint(
        5000,
        450000
    )

    order_date = random_date(
        2024,
        2026
    )

    expected_date = (
        order_date
        + timedelta(
            days=random.randint(
                7,
                60
            )
        )
    )

    status = random.choice(
        po_statuses
    )

    actual_delivery = ""

    if status in [
        "Delivered",
        "Completed",
    ]:

        delay_days = random.choices(
            [
                0,
                1,
                3,
                7,
                14,
                30,
            ],
            weights=[
                55,
                15,
                12,
                10,
                6,
                2,
            ],
            k=1,
        )[0]

        actual_delivery = str(
            expected_date
            + timedelta(
                days=delay_days
            )
        )

    purchase_orders.append({
        "id": po_id,
        "poNumber": f"PO-{2026}-{po_id:06d}",
        "vendorId": vendor_id,
        "requestId": request_id,
        "amount": amount,
        "status": status,
        "category": random.choice(CATEGORIES),
        "itemName": f"Supply Item {random.randint(1, 200)}",
        "quantity": random.randint(10, 2000),
        "orderDate": str(order_date),
        "expectedDeliveryDate": str(
            expected_date
        ),
        "actualDeliveryDate": actual_delivery,
    })


write_csv(
    "purchase_orders.csv",
    purchase_orders,
    [
        "id",
        "poNumber",
        "vendorId",
        "requestId",
        "amount",
        "status",
        "category",
        "itemName",
        "quantity",
        "orderDate",
        "expectedDeliveryDate",
        "actualDeliveryDate",
    ],
)


# ============================================================
# 5. INVOICES
# ============================================================

print("\nGenerating INVOICES...")

invoices = []

for invoice_id in range(1, 1001):

    po = purchase_orders[
        invoice_id - 1
    ]

    invoice_status = random.choices(
        [
            "Paid",
            "Pending",
            "Overdue",
        ],
        weights=[
            60,
            25,
            15,
        ],
        k=1,
    )[0]

    due_date = (
        date.fromisoformat(
            po["orderDate"]
        )
        + timedelta(
            days=random.randint(
                30,
                90
            )
        )
    )

    payment_date = ""

    if invoice_status == "Paid":

        payment_date = str(
            due_date
            - timedelta(
                days=random.randint(
                    0,
                    15
                )
            )
        )

    invoices.append({
        "id": invoice_id,
        "invoiceNumber": f"INV-{2026}-{invoice_id:06d}",
        "vendorId": po["vendorId"],
        "poNumber": po["poNumber"],
        "amount": po["amount"],
        "status": invoice_status,
        "invoiceDate": po["orderDate"],
        "dueDate": str(due_date),
        "paymentDate": payment_date,
    })


write_csv(
    "invoices.csv",
    invoices,
    [
        "id",
        "invoiceNumber",
        "vendorId",
        "poNumber",
        "amount",
        "status",
        "invoiceDate",
        "dueDate",
        "paymentDate",
    ],
)


# ============================================================
# 6. CONTRACTS
# ============================================================

print("\nGenerating CONTRACTS...")

contracts = []

for contract_id in range(1, 201):

    vendor_id = random.randint(
        1,
        100
    )

    start_date = random_date(
        2024,
        2025
    )

    end_date = (
        start_date
        + timedelta(
            days=random.randint(
                180,
                730
            )
        )
    )

    status = random.choices(
        [
            "Active",
            "Expiring",
            "Expired",
            "Draft",
        ],
        weights=[
            65,
            15,
            10,
            10,
        ],
        k=1,
    )[0]

    contracts.append({
        "id": contract_id,
        "contractNumber": f"CTR-{2026}-{contract_id:05d}",
        "vendorId": vendor_id,
        "title": f"Supplier Agreement {contract_id:04d}",
        "value": random.randint(
            25000,
            1000000
        ),
        "startDate": str(start_date),
        "endDate": str(end_date),
        "status": status,
        "complianceStatus": random.choice([
            "Compliant",
            "Compliant",
            "Review Required",
            "Non-Compliant",
        ]),
    })


write_csv(
    "contracts.csv",
    contracts,
    [
        "id",
        "contractNumber",
        "vendorId",
        "title",
        "value",
        "startDate",
        "endDate",
        "status",
        "complianceStatus",
    ],
)


# ============================================================
# 7. PERFORMANCE RECORDS
# ============================================================

print("\nGenerating PERFORMANCE RECORDS...")

performance_records = []

for record_id in range(1, 2001):

    vendor_id = random.randint(
        1,
        100
    )

    on_time_delivery = random.randint(
        45,
        99
    )

    quality_rating = round(
        random.uniform(
            2.5,
            5.0
        ),
        2
    )

    response_time = random.randint(
        1,
        72
    )

    issue_resolution = random.randint(
        1,
        15
    )

    defect_rate = round(
        random.uniform(
            0.1,
            15.0
        ),
        2
    )

    order_completion = random.randint(
        60,
        100
    )

    performance_records.append({
        "id": record_id,
        "vendorId": vendor_id,
        "date": str(
            random_date(
                2024,
                2026
            )
        ),
        "onTimeDeliveryPercent": on_time_delivery,
        "qualityRating": quality_rating,
        "responseTimeHours": response_time,
        "issueResolutionDays": issue_resolution,
        "defectRatePercent": defect_rate,
        "orderCompletionPercent": order_completion,
    })


write_csv(
    "performance_records.csv",
    performance_records,
    [
        "id",
        "vendorId",
        "date",
        "onTimeDeliveryPercent",
        "qualityRating",
        "responseTimeHours",
        "issueResolutionDays",
        "defectRatePercent",
        "orderCompletionPercent",
    ],
)


# ============================================================
# 8. RELIABILITY SCORES
# ============================================================

print("\nGenerating RELIABILITY SCORES...")

reliability_scores = []

for score_id in range(1, 2001):

    vendor_id = random.randint(
        1,
        100
    )

    score = round(
        random.uniform(
            45,
            98
        ),
        2
    )

    if score >= 85:
        risk = "Low"
    elif score >= 70:
        risk = "Medium"
    elif score >= 50:
        risk = "High"
    else:
        risk = "Critical"

    reliability_scores.append({
        "id": score_id,
        "vendorId": vendor_id,
        "date": str(
            random_date(
                2024,
                2026
            )
        ),
        "reliabilityScore": score,
        "riskLevel": risk,
        "deliveryScore": round(
            random.uniform(
                40,
                100
            ),
            2
        ),
        "qualityScore": round(
            random.uniform(
                40,
                100
            ),
            2
        ),
        "communicationScore": round(
            random.uniform(
                40,
                100
            ),
            2
        ),
        "complianceScore": round(
            random.uniform(
                40,
                100
            ),
            2
        ),
    })


write_csv(
    "reliability_scores.csv",
    reliability_scores,
    [
        "id",
        "vendorId",
        "date",
        "reliabilityScore",
        "riskLevel",
        "deliveryScore",
        "qualityScore",
        "communicationScore",
        "complianceScore",
    ],
)


# ============================================================
# 9. MESSAGES
# ============================================================

print("\nGenerating MESSAGES...")

messages = []

subjects = [
    "Delivery Update",
    "Purchase Order Query",
    "Contract Clarification",
    "Performance Review",
    "Supplier Documentation",
    "Invoice Follow-up",
    "Quality Issue",
    "Delivery Delay",
]

for message_id in range(1, 501):

    messages.append({
        "id": message_id,
        "fromUserId": random.randint(
            1,
            6
        ),
        "toUserId": random.randint(
            1,
            6
        ),
        "subject": random.choice(
            subjects
        ),
        "message": (
            "VendorIQ communication regarding "
            "procurement and supplier operations."
        ),
        "date": str(
            random_date(
                2024,
                2026
            )
        ),
        "read": random.choice([
            "true",
            "false",
        ]),
    })


write_csv(
    "messages.csv",
    messages,
    [
        "id",
        "fromUserId",
        "toUserId",
        "subject",
        "message",
        "date",
        "read",
    ],
)


# ============================================================
# 10. NOTIFICATIONS
# ============================================================

print("\nGenerating NOTIFICATIONS...")

notifications = []

notification_messages = [
    "Vendor reliability score requires review.",
    "Purchase order delivery is approaching.",
    "Contract is approaching expiry.",
    "Invoice payment is overdue.",
    "New procurement request requires attention.",
    "Supplier performance has changed.",
    "Vendor compliance document requires renewal.",
    "Purchase order has been delayed.",
]

for notification_id in range(1, 501):

    notifications.append({
        "id": notification_id,
        "userId": random.randint(
            1,
            6
        ),
        "message": random.choice(
            notification_messages
        ),
        "type": random.choice([
            "info",
            "success",
            "warning",
            "danger",
        ]),
        "read": random.choice([
            "true",
            "false",
        ]),
        "date": str(
            random_date(
                2024,
                2026
            )
        ),
    })


write_csv(
    "notifications.csv",
    notifications,
    [
        "id",
        "userId",
        "message",
        "type",
        "read",
        "date",
    ],
)


# ============================================================
# 11. AUDIT LOGS
# ============================================================

print("\nGenerating AUDIT LOGS...")

audit_logs = []

actions = [
    "Vendor Approved",
    "Vendor Rejected",
    "Vendor Updated",
    "Purchase Order Created",
    "Purchase Order Approved",
    "Purchase Order Updated",
    "Procurement Request Created",
    "Procurement Request Approved",
    "Contract Created",
    "Contract Updated",
    "Invoice Reviewed",
    "User Account Updated",
    "Reliability Score Calculated",
    "Compliance Review Completed",
]

entities = [
    "Vendor",
    "PurchaseOrder",
    "ProcurementRequest",
    "Contract",
    "Invoice",
    "User",
    "Reliability",
]

for log_id in range(1, 1001):

    audit_logs.append({
        "id": log_id,
        "userId": random.randint(
            1,
            6
        ),
        "action": random.choice(
            actions
        ),
        "entity": random.choice(
            entities
        ),
        "entityId": random.randint(
            1,
            1000
        ),
        "timestamp": str(
            random_date(
                2024,
                2026
            )
        ),
    })


write_csv(
    "audit_logs.csv",
    audit_logs,
    [
        "id",
        "userId",
        "action",
        "entity",
        "entityId",
        "timestamp",
    ],
)


# ============================================================
# FINAL SUMMARY
# ============================================================

print("\n")
print("=" * 65)
print("VENDORIQ DATASET GENERATION COMPLETED")
print("=" * 65)

print("\nGenerated files:")

for filename in sorted(
    os.listdir(DATASET_DIR)
):

    if filename.endswith(".csv"):

        filepath = os.path.join(
            DATASET_DIR,
            filename
        )

        with open(
            filepath,
            "r",
            encoding="utf-8"
        ) as file:

            row_count = sum(
                1
                for _ in file
            ) - 1

        print(
            f"  {filename:<30} "
            f"{row_count:>5} records"
        )

print("\nDataset location:")
print(DATASET_DIR)

print("\nDone!")