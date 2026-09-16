"""Idempotent, production-shaped development data for VendorIQ Milestones 1 and 2."""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

from sqlalchemy import delete, func, select

from app.core.config import settings
from app.core.security import get_password_hash
from app.database.database import SessionLocal
from app.models import AuditLog, Contract, ContractDocument, Message, POFulfillment, POItem, ProcurementRequest, PurchaseOrder, Role, User, UserRole, Vendor, VendorCategory, VendorContact, VendorReliabilityHistory


TARGETS = {"users": 20, "categories": 10, "vendors": 50, "contacts": 100, "requests": 150, "orders": 100, "po_items": 500, "fulfillments": 55, "contracts": 80, "documents": 80, "messages": 1000, "audits": 3000}
ROLE_DESCRIPTIONS = {
    "Administrator": "Full access to VendorIQ platform administration.", "Procurement Manager": "Manages procurement operations and purchasing workflows.",
    "Supply Chain Manager": "Oversees supply chain coordination and continuity.", "Finance Officer": "Manages financial oversight for procurement activity.",
    "Vendor": "External vendor account with vendor-facing access.", "Auditor": "Reviews platform activity and compliance information.",
}
DEMO_USERS = (
    ("Administrator", "Aditi", "Sharma", "admin@vendoriq.com", "Admin@123", "+91 98765 10001"), ("Administrator", "Neha", "Bansal", "admin.demo@vendoriq.com", "AdminDemo@123", "+91 98765 10011"), ("Administrator", "Karan", "Sethi", "admin.ops@vendoriq.com", "AdminOps@123", "+91 98765 10017"),
    ("Procurement Manager", "Rohan", "Mehta", "procurement@vendoriq.com", "Procurement@123", "+91 98765 10002"), ("Procurement Manager", "Ishaan", "Kulkarni", "procurement.demo@vendoriq.com", "ProcurementDemo@123", "+91 98765 10012"), ("Procurement Manager", "Tanvi", "Singh", "procurement.ops@vendoriq.com", "ProcurementOps@123", "+91 98765 10018"),
    ("Supply Chain Manager", "Kavya", "Iyer", "supplychain@vendoriq.com", "SupplyChain@123", "+91 98765 10003"), ("Supply Chain Manager", "Nikhil", "Desai", "supplychain.demo@vendoriq.com", "SupplyDemo@123", "+91 98765 10013"), ("Supply Chain Manager", "Harish", "Pillai", "supplychain.ops@vendoriq.com", "SupplyOps@123", "+91 98765 10019"),
    ("Finance Officer", "Arjun", "Nair", "finance@vendoriq.com", "Finance@123", "+91 98765 10004"), ("Finance Officer", "Pooja", "Malhotra", "finance.demo@vendoriq.com", "FinanceDemo@123", "+91 98765 10014"), ("Finance Officer", "Ritu", "Jain", "finance.ops@vendoriq.com", "FinanceOps@123", "+91 98765 10020"),
    ("Vendor", "Vikram", "Kapoor", "vendor@vendoriq.com", "Vendor@123", "+91 98765 10005"), ("Vendor", "Sneha", "Agarwal", "vendor.demo@vendoriq.com", "VendorDemo@123", "+91 98765 10015"), ("Vendor", "Rahul", "Bose", "vendor.east@vendoriq.com", "VendorEast@123", "+91 98765 10021"), ("Vendor", "Maya", "Thomas", "vendor.south@vendoriq.com", "VendorSouth@123", "+91 98765 10022"), ("Vendor", "Sandeep", "Arora", "vendor.north@vendoriq.com", "VendorNorth@123", "+91 98765 10023"),
    ("Auditor", "Meera", "Rao", "auditor@vendoriq.com", "Auditor@123", "+91 98765 10006"), ("Auditor", "Dev", "Chatterjee", "auditor.demo@vendoriq.com", "AuditorDemo@123", "+91 98765 10016"), ("Auditor", "Farah", "Khan", "auditor.ops@vendoriq.com", "AuditorOps@123", "+91 98765 10024"),
)
CATEGORIES = (
    ("Raw Material Suppliers", "Suppliers of production-grade raw materials."), ("Equipment Vendors", "Industrial equipment, tools, and machinery suppliers."), ("IT Vendors", "Technology hardware, software, and managed service providers."), ("Service Providers", "Professional, facility, and operational service providers."), ("Logistics Partners", "Freight, warehousing, and last-mile delivery partners."), ("Maintenance Vendors", "Maintenance, repair, and annual service partners."), ("Packaging Suppliers", "Sustainable and industrial packaging material providers."), ("Safety Equipment Vendors", "Workplace safety equipment and compliance suppliers."), ("Energy Suppliers", "Power, fuel, solar, and energy-efficiency providers."), ("Consulting Partners", "Business, legal, engineering, and process advisory partners."),
)
COMPANIES = (
    "Tata Steel Industrial Solutions", "Bharat Alloy Works", "Mahindra Industrial Equipment", "Kirloskar Power Systems", "Infosys Digital Services", "Wipro Enterprise Technologies", "Blue Dart Supply Chain", "Delhivery Logistics Network", "Larsen Facility Services", "Apex Maintenance India", "Hindustan Polymer Traders", "Godrej Office Systems", "Crompton Engineering Supplies", "Sundaram Fasteners Ltd", "Jindal Packaging Solutions", "Tech Mahindra Business Systems", "Safexpress Freight Services", "TVS Industrial Components", "Voltas Facility Management", "Nippon Paint Industrial Coatings", "Reliance Industrial Polymers", "Adani Warehousing Services", "Thermax Energy Systems", "Havells Safety Solutions", "Motherson Auto Components", "Bajaj Electrical Projects", "Schaeffler India Bearings", "Honeywell Automation India", "Siemens Industry Software", "Bosch Rexroth India", "Dixon Technology Solutions", "Aurobindo Packaging Works", "Kuehne Nagel Logistics India", "G4S Secure Facilities", "Schneider Electric India", "Carrier Airconditioning Services", "JK Cement Enterprise Supply", "Apollo Tyres Industrial", "Asian Paints Protective Coatings", "CEAT Fleet Solutions", "Bharat Petroleum Commercial", "Indian Oil Bulk Supply", "HCL Managed Services", "Zoho Enterprise Systems", "L&T Technology Services", "Quess Workforce Solutions", "TeamLease Facilities", "Ecom Express Logistics", "Sriram Transport Solutions", "Udaan Business Supplies",
)
CITIES = (("Mumbai", "Maharashtra", "India", "400"), ("Pune", "Maharashtra", "India", "411"), ("Bengaluru", "Karnataka", "India", "560"), ("Chennai", "Tamil Nadu", "India", "600"), ("Hyderabad", "Telangana", "India", "500"), ("Ahmedabad", "Gujarat", "India", "380"), ("Gurugram", "Haryana", "India", "122"), ("Kolkata", "West Bengal", "India", "700"), ("Kochi", "Kerala", "India", "682"), ("Noida", "Uttar Pradesh", "India", "201"))
PRODUCTS = ("Stainless Steel Sheets", "Industrial Safety Helmets", "ERP Support Licenses", "Forklift Rental", "Network Switches", "Packaging Cartons", "Diesel Generator Service", "Warehouse Racking", "Laptop Computers", "HVAC Spare Parts", "Pallet Trucks", "Fire Safety Extinguishers", "Cable Assemblies", "Office Workstations", "Solar Inverter Units")
DEPARTMENTS = ("Manufacturing", "Information Technology", "Facilities", "Operations", "Supply Chain", "Quality Assurance", "Finance", "Human Resources", "Engineering", "Corporate Services")


def one(session, model, **criteria):
    return session.scalar(select(model).filter_by(**criteria))


def get_or_create(session, model, defaults=None, **criteria):
    item = one(session, model, **criteria)
    if item is None:
        item = model(**criteria, **(defaults or {})); session.add(item); session.flush()
        return item, True
    return item, False


def count(session, model): return session.scalar(select(func.count()).select_from(model))


def placeholder(directory: str, filename: str, body: bytes) -> str:
    root = Path(settings.uploads_dir) / directory; root.mkdir(parents=True, exist_ok=True)
    target = root / filename
    if not target.exists(): target.write_bytes(body)
    return target.relative_to(Path(settings.uploads_dir)).as_posix()


def seed_users(session):
    roles = {}
    for name, description in ROLE_DESCRIPTIONS.items(): roles[name], _ = get_or_create(session, Role, {"description": description}, name=name)
    users_by_role: dict[str, list[User]] = {name: [] for name in roles}
    for role_name, first, last, email, password, phone in DEMO_USERS:
        user = one(session, User, email=email)
        if user is None:
            user = User(first_name=first, last_name=last, email=email, phone=phone, password_hash=get_password_hash(password), is_active=True)
            session.add(user); session.flush()
        if not one(session, UserRole, user_id=user.id, role_id=roles[role_name].id): session.add(UserRole(user_id=user.id, role_id=roles[role_name].id))
        users_by_role[role_name].append(user)
    session.flush(); return users_by_role


def seed_vendors(session, users):
    categories = []
    for name, description in CATEGORIES:
        category, _ = get_or_create(session, VendorCategory, {"description": description}, name=name); categories.append(category)
    vendor_users = users["Vendor"]; statuses = ("Approved", "Approved", "Approved", "Under Review", "Pending", "Rejected")
    
    # Realistic indicator mappings to generate varying risk profiles
    fin_healths = ("Healthy", "Healthy", "Medium Risk", "Healthy", "Critical", "Healthy")
    pay_issues = (0, 0, 1, 0, 2, 0)
    sec_assessments = ("Passed", "Passed", "Pending", "Passed", "Failed", "Passed")
    sec_certs = ("Certified", "Certified", "Expired", "Certified", "None", "Certified")
    sec_incidents = (0, 0, 0, 0, 2, 0)
    alt_counts = (3, 2, 1, 4, 0, 1)
    critical_flags = (False, False, True, False, True, False)

    vendors = []
    for index, company in enumerate(COMPANIES, 1):
        city, state, country, pin = CITIES[(index - 1) % len(CITIES)]; category = categories[(index - 1) % len(categories)]; owner = vendor_users[(index - 1) % len(vendor_users)]
        defaults = {
            "company_name": company, 
            "gst_number": f"27AAE{index:04d}F1Z{index % 10}", 
            "email": f"contact{index:02d}@vendoriq-demo.in", 
            "phone": f"+91 98{index:03d} {10000 + index:05d}", 
            "address": f"{10 + index}, Enterprise Business Park, Sector {(index - 1) % 18 + 1}", 
            "city": city, 
            "state": state, 
            "country": country, 
            "postal_code": f"{pin}{index:03d}", 
            "website": f"https://www.{company.lower().replace(' ', '-').replace('&', 'and')[:42]}.example.com", 
            "category_id": category.id, 
            "approval_status": statuses[(index - 1) % len(statuses)], 
            "created_by": owner.id,
            "financial_health_indicator": fin_healths[(index - 1) % len(fin_healths)],
            "payment_issues_count": pay_issues[(index - 1) % len(pay_issues)],
            "security_assessment_status": sec_assessments[(index - 1) % len(sec_assessments)],
            "security_certification_status": sec_certs[(index - 1) % len(sec_certs)],
            "security_incidents_count": sec_incidents[(index - 1) % len(sec_incidents)],
            "alternative_vendors_count": alt_counts[(index - 1) % len(alt_counts)],
            "is_critical_supplier": critical_flags[(index - 1) % len(critical_flags)]
        }
        vendor, _ = get_or_create(session, Vendor, defaults, registration_number=f"VND-REG-2026-{index:03d}")
        for field, value in defaults.items(): setattr(vendor, field, value)
        existing_contacts = list(session.scalars(select(VendorContact).where(VendorContact.vendor_id == vendor.id).order_by(VendorContact.id)))
        for contact_number in range(len(existing_contacts) + 1, 3):
            email = f"contact{index:02d}-team{contact_number}@vendoriq-demo.in"
            get_or_create(session, VendorContact, {"name": f"{('Priya', 'Rahul', 'Ananya', 'Sanjay', 'Divya')[((index + contact_number) % 5)]} {('Shah', 'Verma', 'Menon', 'Gupta', 'Reddy')[((index * contact_number) % 5)]}", "designation": "Key Account Manager" if contact_number == 1 else "Operations Coordinator", "phone": f"+91 97{index:03d} {20000 + contact_number * 100 + index:05d}", "is_primary": contact_number == 1}, vendor_id=vendor.id, email=email)
        vendors.append(vendor)
    # Supplier portal accounts must have an explicit company scope.  The
    # Vendor.created_by field is an onboarding audit record, not ownership;
    # assigning user.vendor_id prevents a demo Vendor account from seeing an
    # empty portal or relying on a guessed vendor relationship.
    approved_vendors = [vendor for vendor in vendors if vendor.approval_status == "Approved"]
    for index, vendor_user in enumerate(vendor_users):
        vendor_user.vendor_id = approved_vendors[index % len(approved_vendors)].id
    session.flush(); return vendors


def request_items(index):
    rows = []
    for offset in range(2):
        quantity = Decimal(str(8 + (index * (offset + 2)) % 60)); price = Decimal(str(2500 + (index * 137) + offset * 875))
        rows.append({"item_name": PRODUCTS[(index + offset) % len(PRODUCTS)], "quantity": float(quantity), "estimated_price": float(price), "subtotal": float(quantity * price)})
    return rows


def seed_requests(session, users):
    finance = users["Finance Officer"]; procurement = users["Procurement Manager"]; requests = []
    for index in range(1, TARGETS["requests"] + 1):
        items = request_items(index); total = sum((Decimal(str(row["subtotal"])) for row in items), Decimal("0"))
        status = "Approved" if index <= 100 else ("Pending Approval" if index <= 120 else ("Rejected" if index <= 130 else "Draft"))
        owner = procurement[(index - 1) % len(procurement)]; approver = finance[(index - 1) % len(finance)] if status == "Approved" else None
        # The original Milestone 2 seed used its first ten products in this natural key.
        # Retaining that convention lets this enhanced seeder reuse existing development rows.
        title = f"PR-2026-{index:03d} {PRODUCTS[index % 10]}"
        request, _ = get_or_create(session, ProcurementRequest, {"department": DEPARTMENTS[(index - 1) % len(DEPARTMENTS)], "description": f"Planned procurement for {PRODUCTS[index % len(PRODUCTS)].lower()} to support scheduled enterprise operations and service continuity.", "estimated_cost": total, "priority": ("Low", "Medium", "High", "Critical")[index % 4], "required_date": date.today() + timedelta(days=7 + index * 2), "status": status, "line_items": items, "created_by": owner.id, "approved_by": approver.id if approver else None}, title=title)
        request.department = DEPARTMENTS[(index - 1) % len(DEPARTMENTS)]; request.status = status; request.line_items = items; request.estimated_cost = total; request.created_by = owner.id; request.approved_by = approver.id if approver else None
        requests.append(request)
    session.flush(); return requests


def remove_duplicate_demo_requests(session, requests):
    """Remove only obsolete demo PR rows created by an older product-key convention."""
    expected_ids = {request.id for request in requests}
    obsolete = list(session.scalars(select(ProcurementRequest).where(ProcurementRequest.title.like("PR-2026-%"), ProcurementRequest.id.not_in(expected_ids))))
    occupied = {request_id for request_id in session.scalars(select(PurchaseOrder.procurement_request_id))}
    replacements = [request for request in requests if request.status == "Approved" and request.id not in occupied]
    obsolete_ids = []
    for request in obsolete:
        order = one(session, PurchaseOrder, procurement_request_id=request.id)
        if order:
            replacement = replacements.pop(0)
            order.procurement_request_id = replacement.id
            order.total_amount = replacement.estimated_cost
        obsolete_ids.append(request.id)
    # Flush replacement foreign keys before directly deleting legacy rows. Direct SQL
    # prevents SQLAlchemy's relationship delete synchronization from nulling the FK.
    session.flush()
    if obsolete_ids:
        session.execute(delete(ProcurementRequest).where(ProcurementRequest.id.in_(obsolete_ids)))
    session.flush()


def seed_orders(session, users, vendors, requests):
    approved_vendors = [vendor for vendor in vendors if vendor.approval_status == "Approved"] or vendors; procurement = users["Procurement Manager"]
    existing_orders = list(session.scalars(select(PurchaseOrder).order_by(PurchaseOrder.id)))
    used_request_ids = {order.procurement_request_id for order in existing_orders}
    available_requests = [request for request in requests if request.status == "Approved" and request.id not in used_request_ids]
    orders = existing_orders[:TARGETS["orders"]]
    for index in range(len(orders) + 1, TARGETS["orders"] + 1):
        request = available_requests.pop(0); vendor = approved_vendors[(index - 1) % len(approved_vendors)]
        order, _ = get_or_create(session, PurchaseOrder, {"vendor_id": vendor.id, "procurement_request_id": request.id, "issue_date": date.today() - timedelta(days=index % 45 + 2), "expected_delivery_date": date.today() + timedelta(days=8 + index % 65), "status": ("Created", "Sent", "Accepted", "In Progress", "Shipped", "Delivered", "Completed")[index % 7], "total_amount": request.estimated_cost, "created_by": procurement[(index - 1) % len(procurement)].id}, po_number=f"PO-2026-{index:04d}")
        orders.append(order)
    for index, order in enumerate(orders, 1):
        vendor = approved_vendors[(index - 1) % len(approved_vendors)]; order.vendor_id = vendor.id; order.status = ("Created", "Sent", "Accepted", "In Progress", "Shipped", "Delivered", "Completed")[index % 7]
        if order.status in ("Delivered", "Completed"):
            order.issue_date = date.today() - timedelta(days=110 + index)
            order.expected_delivery_date = date.today() - timedelta(days=15 + (index % 45))
        elif index % 9 == 0:
            order.expected_delivery_date = date.today() - timedelta(days=3 + index % 12)
        order.invoice_path = placeholder("purchase-orders", f"{order.po_number}-invoice.pdf", b"%PDF-1.4\n% VendorIQ demo invoice\n%%EOF\n"); order.delivery_proof_path = placeholder("purchase-orders", f"{order.po_number}-delivery-proof.txt", b"VendorIQ demonstration delivery proof.\n")
        current_items = list(order.items)
        for item_number in range(len(current_items) + 1, 6):
            quantity = Decimal(str(2 + (index * item_number) % 25)); price = Decimal(str(1800 + index * 55 + item_number * 330)); order.items.append(POItem(item_name=PRODUCTS[(index + item_number) % len(PRODUCTS)], quantity=quantity, unit_price=price, subtotal=quantity * price))
    session.flush(); return orders


def seed_fulfillments(session, users, orders):
    """Seed operational facts, not arbitrary vendor scores, for realistic reliability evidence."""
    supply = users["Supply Chain Manager"]
    vendor_users = users["Vendor"]
    records = []
    for index, order in enumerate(orders, 1):
        if order.status not in ("Shipped", "Delivered", "Completed"):
            continue
        ordered = sum((Decimal(str(item.quantity)) for item in order.items), Decimal("0"))
        vendor_pattern = order.vendor_id % 5
        is_terminal = order.status in ("Delivered", "Completed")
        actual_date = None
        received = accepted = rejected = None
        quality = "Pending"
        sla = 0
        if is_terminal:
            # Underlying records deliberately vary by supplier pattern: reliable,
            # average, delayed, quantity/quality constrained, and deteriorating.
            delay_days = (0, 1, 4, 7, 10)[vendor_pattern]
            actual_date = order.expected_delivery_date + timedelta(days=delay_days)
            shortfall_ratio = (Decimal("0"), Decimal("0.02"), Decimal("0.05"), Decimal("0.12"), Decimal("0.18"))[vendor_pattern]
            rejection_ratio = (Decimal("0"), Decimal("0.01"), Decimal("0.02"), Decimal("0.05"), Decimal("0.10"))[vendor_pattern]
            received = ordered * (Decimal("1") - shortfall_ratio)
            rejected = (received * rejection_ratio).quantize(Decimal("0.01"))
            accepted = received - rejected
            quality = "Passed" if vendor_pattern < 2 else ("Conditional" if vendor_pattern < 4 else "Failed")
            sla = 0 if vendor_pattern < 2 else (1 if vendor_pattern < 4 else 2)
        fulfillment, _ = get_or_create(session, POFulfillment, {"ordered_quantity": ordered}, purchase_order_id=order.id)
        fulfillment.ordered_quantity = ordered
        fulfillment.fulfillment_status = "Completed" if order.status == "Completed" else ("Received" if is_terminal else "Shipped")
        fulfillment.shipment_reference = f"TM-SHIP-{order.id:05d}"
        fulfillment.shipped_at = order.expected_delivery_date - timedelta(days=2) if is_terminal else date.today() - timedelta(days=index % 7)
        fulfillment.actual_delivery_date = actual_date
        fulfillment.received_at = actual_date
        fulfillment.received_quantity = received
        fulfillment.accepted_quantity = accepted
        fulfillment.rejected_quantity = rejected
        fulfillment.quality_status = quality
        fulfillment.quality_notes = "Receiving inspection recorded from Tata Motors plant operations." if is_terminal else "Shipment dispatched; receipt pending."
        fulfillment.sla_violations = sla
        fulfillment.vendor_notes = "Shipment milestone confirmed in Vendor Portal."
        fulfillment.recorded_by = (supply if is_terminal else vendor_users)[(index - 1) % (len(supply) if is_terminal else len(vendor_users))].id
        records.append(fulfillment)
    session.flush(); return records


def seed_contracts(session, users, vendors):
    approved_vendors = [vendor for vendor in vendors if vendor.approval_status == "Approved"] or vendors; procurement = users["Procurement Manager"]; contracts = []
    for index in range(1, TARGETS["contracts"] + 1):
        vendor = approved_vendors[(index - 1) % len(approved_vendors)]; end_offset = (-30 if index % 20 == 0 else 15 if index % 11 == 0 else 45 if index % 9 == 0 else 75 if index % 7 == 0 else 365 + index)
        contract, _ = get_or_create(session, Contract, {"vendor_id": vendor.id, "start_date": date.today() - timedelta(days=300 + index), "end_date": date.today() + timedelta(days=end_offset), "renewal_notice_days": (30, 45, 60, 90)[index % 4], "compliance_status": ("Compliant", "Pending", "Compliant", "Non-Compliant")[index % 4], "terms": "Enterprise commercial agreement covering pricing, quality, service levels, delivery commitments, confidentiality, statutory compliance, and dispute resolution.", "created_by": procurement[(index - 1) % len(procurement)].id}, contract_number=f"CNT-2026-{index:03d}")
        file_name = f"{contract.contract_number}-agreement.pdf"; path = placeholder("contracts", file_name, b"%PDF-1.4\n% VendorIQ demo contract\n%%EOF\n"); contract.contract_file = path
        get_or_create(session, ContractDocument, {"file_name": file_name, "uploaded_by": procurement[(index - 1) % len(procurement)].id}, contract_id=contract.id, file_path=path)
        contracts.append(contract)
    session.flush(); return contracts


def seed_messages(session, users, vendors, orders, contracts):
    procurement = users["Procurement Manager"]; vendor_users = users["Vendor"]; records = []
    for index in range(count(session, Message) + 1, TARGETS["messages"] + 1):
        order = orders[(index - 1) % len(orders)] if index % 2 else None; contract = contracts[(index - 1) % len(contracts)] if not order else None
        vendor_owner = vendor_users[(index - 1) % len(vendor_users)]; sender = procurement[(index - 1) % len(procurement)] if index % 2 else vendor_owner; receiver = vendor_owner if sender in procurement else procurement[index % len(procurement)]
        subject = f"{('Delivery update', 'Commercial clarification', 'Document review', 'Schedule confirmation')[index % 4]} {index:04d}"
        message, created = get_or_create(session, Message, {"purchase_order_id": order.id if order else None, "contract_id": contract.id if contract else None, "receiver_id": receiver.id, "message": f"{('Please confirm the latest delivery commitment and supporting documents.', 'The vendor has shared the requested commercial clarification for review.', 'Please review the attached compliance and contract documentation.', 'Operations requests confirmation of the next planned milestone.')[index % 4]}", "is_read": index % 3 != 0}, sender_id=sender.id, subject=subject)
        records.append(message)
    session.flush(); return records


def seed_audits(session, users, vendors, requests, orders, contracts, messages):
    actors = [*users["Administrator"], *users["Procurement Manager"], *users["Supply Chain Manager"], *users["Finance Officer"], *users["Vendor"], *users["Auditor"]]
    entities = [("Vendor", item.id) for item in vendors] + [("ProcurementRequest", item.id) for item in requests] + [("PurchaseOrder", item.id) for item in orders] + [("Contract", item.id) for item in contracts] + [("Message", item.id) for item in messages]
    actions = ("Vendor Created", "Vendor Approved", "Vendor Rejected", "Vendor Updated", "Procurement Created", "Procurement Approved", "Procurement Rejected", "Purchase Order Created", "Purchase Order Updated", "Delivery Status Updated", "PO Invoice Uploaded", "Contract Uploaded", "Contract Reviewed", "Message Sent")
    existing = count(session, AuditLog)
    for index in range(existing + 1, TARGETS["audits"] + 1):
        entity, entity_id = entities[(index - 1) % len(entities)]; actor = actors[(index - 1) % len(actors)]; action = f"{actions[(index - 1) % len(actions)]} [demo-{index:04d}]"
        session.add(AuditLog(user_id=actor.id, action=action, entity=entity, entity_id=entity_id))
    session.flush()


def seed() -> None:
    session = SessionLocal()
    try:
        users = seed_users(session); vendors = seed_vendors(session, users); requests = seed_requests(session, users); orders = seed_orders(session, users, vendors, requests); fulfillments = seed_fulfillments(session, users, orders); remove_duplicate_demo_requests(session, requests); contracts = seed_contracts(session, users, vendors); messages = seed_messages(session, users, vendors, orders, contracts); seed_audits(session, users, vendors, requests, orders, contracts, messages)
        
        # Trigger recalculations and seed trend history for all vendors
        print("Calculating baseline reliability & risk scores for all vendors...")
        from app.services.reliability_service import trigger_score_recalculation
        # Purge only legacy placeholder snapshots (their empty breakdown makes
        # them distinguishable from calculated history) and calculate from the
        # delivery, quantity, quality, contract and communication records above.
        session.query(VendorReliabilityHistory).filter(VendorReliabilityHistory.breakdown == "{}").delete(synchronize_session=False)
        admin_user = users["Administrator"][0]
        for vendor in vendors:
            trigger_score_recalculation(session, vendor.id, triggered_by_user_id=admin_user.id)
            
        session.commit()
        print("VendorIQ realistic demonstration data is ready.")
        print("Counts:", {"users": count(session, User), "categories": count(session, VendorCategory), "vendors": count(session, Vendor), "contacts": count(session, VendorContact), "requests": count(session, ProcurementRequest), "orders": count(session, PurchaseOrder), "po_items": count(session, POItem), "fulfillments": count(session, POFulfillment), "contracts": count(session, Contract), "documents": count(session, ContractDocument), "messages": count(session, Message), "audits": count(session, AuditLog)})
        print("Primary demo credentials: admin@vendoriq.com / Admin@123 | procurement@vendoriq.com / Procurement@123 | supplychain@vendoriq.com / SupplyChain@123 | finance@vendoriq.com / Finance@123 | vendor@vendoriq.com / Vendor@123 | auditor@vendoriq.com / Auditor@123")
    except Exception:
        session.rollback(); raise
    finally:
        session.close()


if __name__ == "__main__": seed()
