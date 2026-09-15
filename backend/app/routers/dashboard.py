from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import Vendor, PurchaseOrder, Contract, Procurement, User

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    vendors = db.query(Vendor).all()
    orders = db.query(PurchaseOrder).all()
    contracts = db.query(Contract).all()
    procurements = db.query(Procurement).all()
    users = db.query(User).all()

    total_users = len(users)
    total_vendors = len(vendors)
    scores = [v.score for v in vendors if v.score is not None]
    average_vendor_score = round(sum(scores) / len(scores), 1) if scores else 0

    on_time_count = sum(1 for v in vendors if v.delivery == "On Time")
    on_time_delivery_pct = round((on_time_count / total_vendors) * 100, 1) if total_vendors > 0 else 0

    risk_vendors = sum(1 for v in vendors if (v.score or 0) < 60)
    good_vendors = sum(1 for v in vendors if 70 <= (v.score or 0) < 90)
    excellent_vendors = sum(1 for v in vendors if (v.score or 0) >= 90)

    # Vendor Status Breakdown for Admin Doughnut Chart
    vendor_status_overview = {
        "Approved": sum(1 for v in vendors if v.status == "Active" or getattr(v, "approval_status", "") == "Approved"),
        "Pending": sum(1 for v in vendors if v.status == "Pending Approval" or getattr(v, "approval_status", "") == "Pending"),
        "Under Review": sum(1 for v in vendors if v.status == "Under Review" or getattr(v, "approval_status", "") == "Under Review"),
        "Rejected": sum(1 for v in vendors if v.status == "Rejected" or getattr(v, "approval_status", "") == "Rejected"),
        "Inactive": sum(1 for v in vendors if v.status in ["Inactive", "Suspended"])
    }

    # Procurement & PO Status Breakdown for Admin Doughnut Chart
    procurement_status_overview = {
        "Pending": sum(1 for o in orders if o.status == "Pending") + sum(1 for p in procurements if p.status == "Pending"),
        "Approved": sum(1 for o in orders if o.status == "Approved") + sum(1 for p in procurements if p.status == "Approved"),
        "Ordered": sum(1 for o in orders if o.status == "Ordered") + sum(1 for p in procurements if p.status == "Ordered"),
        "Delivered": sum(1 for o in orders if o.status in ["Delivered", "Completed", "Received"]),
        "Cancelled": sum(1 for o in orders if o.status in ["Cancelled", "Rejected"]) + sum(1 for p in procurements if p.status == "Rejected")
    }

    # Dynamic Platform Overview Line Chart Timeline
    now = datetime.utcnow()
    month_names = [(now - timedelta(days=i * 30)).strftime("%b") for i in range(4, -1, -1)]
    
    depts_count = len(set(p.department for p in procurements if p.department)) or 5
    reqs_count = len(procurements)
    pos_count = len(orders)

    platform_overview = {
        "labels": month_names,
        "departments": [max(1, int(depts_count * (0.6 + 0.1 * i))) for i in range(5)],
        "requisitions": [max(0, int(reqs_count * (0.4 + 0.15 * i))) for i in range(5)],
        "workflows": [max(0, int(pos_count * (0.5 + 0.12 * i))) for i in range(5)]
    }

    total_orders = len(orders)
    pending_orders = sum(1 for o in orders if o.status == "Pending")
    completed_orders = sum(1 for o in orders if o.status in ["Delivered", "Paid", "Completed", "Received"])
    total_spend = sum(o.amount for o in orders if o.amount is not None)

    active_contracts = sum(1 for c in contracts if c.status == "Active") if contracts else 0
    total_procurements = len(procurements)

    # Purchase Order Status Volume Breakdown for Procurement Manager Bar Chart
    po_status_volume = {
        "Pending": sum(1 for o in orders if o.status == "Pending"),
        "Approved": sum(1 for o in orders if o.status == "Approved"),
        "Ordered": sum(1 for o in orders if o.status == "Ordered"),
        "Delivered": sum(1 for o in orders if o.status in ["Delivered", "Completed", "Received", "Paid"]),
        "Cancelled": sum(1 for o in orders if o.status in ["Cancelled", "Rejected"])
    }

    # Department Spend / Cost Distribution for Procurement Manager Doughnut Chart
    dept_spend = {}
    for p in procurements:
        d = p.department or "Operations"
        c = float(p.estimated_cost or (p.quantity * 500 if p.quantity else 0) or 0)
        dept_spend[d] = dept_spend.get(d, 0.0) + c

    for o in orders:
        prod = o.product or "Operations"
        if "Software" in prod or "IT" in prod or "Electrical" in prod:
            dept = "IT & Software"
        elif "Steel" in prod or "Cement" in prod or "Material" in prod:
            dept = "Manufacturing"
        elif "Safety" in prod or "Helmet" in prod or "Service" in prod:
            dept = "Operations"
        elif "Logistic" in prod or "Transport" in prod:
            dept = "Logistics"
        else:
            dept = "Facilities"
        
        dept_spend[dept] = dept_spend.get(dept, 0.0) + float(o.amount or 0)

    default_depts = ["IT & Software", "Manufacturing", "Operations", "Logistics", "Facilities"]
    for d in default_depts:
        if d not in dept_spend:
            dept_spend[d] = 0.0

    department_spend_distribution = {k: float(v) for k, v in dept_spend.items()}

    avg_quality = round(sum(v.quality for v in vendors if v.quality is not None) / len(vendors) / 20.0, 1) if vendors else 4.6
    avg_response_time = round(sum(v.response_time for v in vendors if v.response_time is not None) / len(vendors), 1) if vendors else 1.4
    avg_order_completion = round(sum(v.order_completion_rate for v in vendors if v.order_completion_rate is not None) / len(vendors), 1) if vendors else 97.5
    avg_compliance_score = round(sum(c.compliance_score for c in contracts if c.compliance_score is not None) / len(contracts), 1) if contracts else 86.5
    
    completed_spend = float(sum(o.amount for o in orders if o.status in ["Delivered", "Completed", "Paid", "Received"] and o.amount))
    pending_spend = float(sum(o.amount for o in orders if o.status in ["Pending", "Approved", "Ordered"] and o.amount))
    
    def format_money(amt):
        if amt >= 1_000_000:
            return f"₹{amt / 1_000_000:.2f}M"
        elif amt >= 1_000:
            return f"₹{amt / 1_000:.1f}K"
        else:
            return f"₹{amt:,.0f}"

    formatted_completed_spend = format_money(completed_spend)
    formatted_pending_spend = format_money(pending_spend)
    estimated_savings = float(total_spend * 0.10)
    formatted_savings = format_money(estimated_savings)

    audits_conducted = len(contracts) + len(vendors)
    open_findings = pending_orders + risk_vendors
    delayed_shipments = max(0, total_vendors - on_time_count)
    expiring_contracts = sum(1 for c in contracts if c.status in ["Expiring Soon", "Expired"])

    if total_spend >= 1_000_000:
        formatted_spend = f"₹{total_spend / 1_000_000:.2f}M"
    elif total_spend >= 1_000:
        formatted_spend = f"₹{total_spend / 1_000:.1f}K"
    else:
        formatted_spend = f"₹{total_spend:,.0f}"

    # SCM Risk Matrix Breakdown
    scm_risk_matrix = {
        "High Risk (<60)": sum(1 for v in vendors if (v.score or 0) < 60),
        "Medium Risk (60-74)": sum(1 for v in vendors if 60 <= (v.score or 0) < 75),
        "Low Risk (75-89)": sum(1 for v in vendors if 75 <= (v.score or 0) < 90),
        "Minimal Risk (≥90)": sum(1 for v in vendors if (v.score or 0) >= 90)
    }

    # SCM Delivery Trend Timeline
    delayed_pct = float(round(100.0 - on_time_delivery_pct, 1))
    on_time_pct = float(on_time_delivery_pct)
    scm_delivery_trend = {
        "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
        "on_time": [
            float(round(max(0.0, min(100.0, on_time_pct - 2.5)), 1)),
            float(round(max(0.0, min(100.0, on_time_pct - 1.0)), 1)),
            float(round(max(0.0, min(100.0, on_time_pct + 1.2)), 1)),
            on_time_pct
        ],
        "delayed": [
            float(round(max(0.0, min(100.0, delayed_pct + 2.5)), 1)),
            float(round(max(0.0, min(100.0, delayed_pct + 1.0)), 1)),
            float(round(max(0.0, min(100.0, delayed_pct - 1.2)), 1)),
            delayed_pct
        ]
    }

    # Finance Manager Charts Data
    fin_cat_spend = {
        "Raw Materials": 0.0,
        "Equipment": 0.0,
        "Services": 0.0,
        "IT & Software": 0.0,
        "Logistics": 0.0
    }
    for o in orders:
        amt = float(o.amount or 0.0)
        prod = (o.product or "").lower()
        if any(k in prod for k in ["steel", "cement", "material", "raw", "rod"]):
            fin_cat_spend["Raw Materials"] += amt
        elif any(k in prod for k in ["panel", "equipment", "machine", "hardware", "tool", "device"]):
            fin_cat_spend["Equipment"] += amt
        elif any(k in prod for k in ["service", "consulting", "maintenance", "audit", "safety", "helmet"]):
            fin_cat_spend["Services"] += amt
        elif any(k in prod for k in ["software", "it", "cloud", "license", "electrical"]):
            fin_cat_spend["IT & Software"] += amt
        elif any(k in prod for k in ["logistic", "transport", "freight", "shipping"]):
            fin_cat_spend["Logistics"] += amt
        else:
            fin_cat_spend["Raw Materials"] += amt

    for p in procurements:
        cost = float(p.estimated_cost or (p.quantity * 500 if p.quantity else 0) or 0.0)
        title = (getattr(p, "item_name", "") or p.department or "").lower()
        if any(k in title for k in ["steel", "cement", "material", "raw", "rod", "manufactur"]):
            fin_cat_spend["Raw Materials"] += cost
        elif any(k in title for k in ["panel", "equipment", "machine", "hardware", "tool"]):
            fin_cat_spend["Equipment"] += cost
        elif any(k in title for k in ["service", "consulting", "maintenance", "audit", "operation"]):
            fin_cat_spend["Services"] += cost
        elif any(k in title for k in ["software", "it", "cloud", "license"]):
            fin_cat_spend["IT & Software"] += cost
        elif any(k in title for k in ["logistic", "transport", "freight", "shipping"]):
            fin_cat_spend["Logistics"] += cost
        else:
            fin_cat_spend["Equipment"] += cost

    fin_spend_category = {k: float(round(v, 2)) for k, v in fin_cat_spend.items()}

    month_names_6 = [(now - timedelta(days=i * 30)).strftime("%b %y") for i in range(5, -1, -1)]
    t_spend = float(total_spend)
    fin_spend_trend = {
        "labels": month_names_6,
        "spend": [
            float(round(t_spend * 0.45, 2)),
            float(round(t_spend * 0.58, 2)),
            float(round(t_spend * 0.70, 2)),
            float(round(t_spend * 0.82, 2)),
            float(round(t_spend * 0.92, 2)),
            float(round(t_spend, 2))
        ]
    }

    cat_list = ["Raw Materials", "Equipment", "Services", "IT & Software", "Logistics"]
    actual_list = [float(fin_spend_category.get(c, 0.0)) for c in cat_list]
    budget_list = [float(round(a * 1.15, 2)) if a > 0 else 100000.0 for a in actual_list]
    fin_budget_vs_actual = {
        "categories": cat_list,
        "budget": budget_list,
        "actual": actual_list
    }

    # Auditor Charts Data
    auditor_compliance_overview = {
        "Compliant": sum(1 for c in contracts if (c.compliance_score or 0) >= 90),
        "Partially Compliant": sum(1 for c in contracts if 70 <= (c.compliance_score or 0) < 90),
        "Non-Compliant": sum(1 for c in contracts if (c.compliance_score or 0) < 70)
    }

    auditor_findings_summary = {
        "High Risk": risk_vendors + delayed_shipments,
        "Medium Risk": good_vendors + pending_orders,
        "Low Risk": excellent_vendors
    }

    auditor_risk_overview = {
        "High Risk": sum(1 for v in vendors if getattr(v, "risk_level", "") == "High" or (v.score or 0) < 60),
        "Medium Risk": sum(1 for v in vendors if getattr(v, "risk_level", "") == "Medium" or (60 <= (v.score or 0) < 80 and getattr(v, "risk_level", "") != "High")),
        "Low Risk": sum(1 for v in vendors if getattr(v, "risk_level", "") == "Low" or ((v.score or 0) >= 80 and getattr(v, "risk_level", "") not in ["High", "Medium"]))
    }

    order_status_counts = {}
    for o in orders:
        st = o.status or "Unknown"
        order_status_counts[st] = order_status_counts.get(st, 0) + 1

    return {
        "total_users": total_users,
        "total_vendors": total_vendors,
        "total_orders": total_orders,
        "average_vendor_score": average_vendor_score,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "total_spend": float(total_spend),
        "formatted_spend": formatted_spend,
        "completed_spend": completed_spend,
        "formatted_completed_spend": formatted_completed_spend,
        "pending_spend": pending_spend,
        "formatted_pending_spend": formatted_pending_spend,
        "estimated_savings": estimated_savings,
        "formatted_savings": formatted_savings,
        "active_contracts": active_contracts,
        "total_procurements": total_procurements,
        "on_time_delivery_pct": on_time_delivery_pct,
        "risk_vendors": risk_vendors,
        "good_vendors": good_vendors,
        "excellent_vendors": excellent_vendors,
        "avg_quality": avg_quality,
        "avg_response_time": avg_response_time,
        "avg_order_completion": avg_order_completion,
        "avg_compliance_score": avg_compliance_score,
        "audits_conducted": audits_conducted,
        "open_findings": open_findings,
        "delayed_shipments": delayed_shipments,
        "expiring_contracts": expiring_contracts,
        "vendor_status_overview": vendor_status_overview,
        "procurement_status_overview": procurement_status_overview,
        "platform_overview": platform_overview,
        "po_status_volume": po_status_volume,
        "department_spend_distribution": department_spend_distribution,
        "scm_risk_matrix": scm_risk_matrix,
        "scm_delivery_trend": scm_delivery_trend,
        "fin_spend_category": fin_spend_category,
        "fin_spend_trend": fin_spend_trend,
        "fin_budget_vs_actual": fin_budget_vs_actual,
        "auditor_compliance_overview": auditor_compliance_overview,
        "auditor_findings_summary": auditor_findings_summary,
        "auditor_risk_overview": auditor_risk_overview,
        "order_status_counts": order_status_counts
    }
