from sqlalchemy.orm import Session
from sqlalchemy import func

from sqlalchemy import extract
from datetime import datetime

from app.models.vendor import Vendor
from app.models.purchase_order import PurchaseOrder


def get_dashboard_summary(db: Session):

    total_vendors = db.query(Vendor).count()

    active_vendors = (
        db.query(Vendor)
        .filter(Vendor.status == "Active")
        .count()
    )

    total_purchase_orders = db.query(PurchaseOrder).count()

    completed_purchase_orders = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.status == "Completed")
        .count()
    )

    average_reliability = (
        db.query(func.avg(Vendor.reliability_score))
        .scalar() or 0
    )

    pending_purchase_orders = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.status == "Pending")
        .count()
    )

    return {
        "total_vendors": total_vendors,
        "active_vendors": active_vendors,
        "purchase_orders": total_purchase_orders,
        "completed_purchase_orders": completed_purchase_orders,
        "pending_purchase_orders": pending_purchase_orders,
        "average_reliability": round(average_reliability, 2)
   }


def get_vendor_stats(db: Session):

    excellent = (
        db.query(Vendor)
        .filter(Vendor.reliability_score >= 90)
        .count()
    )

    good = (
        db.query(Vendor)
        .filter(
            Vendor.reliability_score >= 75,
            Vendor.reliability_score < 90
        )
        .count()
    )

    average = (
        db.query(Vendor)
        .filter(
            Vendor.reliability_score >= 60,
            Vendor.reliability_score < 75
        )
        .count()
    )

    poor = (
        db.query(Vendor)
        .filter(Vendor.reliability_score < 60)
        .count()
    )

    return {
        "labels": [
            "Excellent",
            "Good",
            "Average",
            "Poor"
        ],
        "values": [
            excellent,
            good,
            average,
            poor
        ]
    }


def get_procurement_trend(db: Session):

    month_names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]

    results = (
        db.query(
            extract("month", PurchaseOrder.order_date).label("month"),
            func.count(PurchaseOrder.id)
        )
        .group_by(extract("month", PurchaseOrder.order_date))
        .order_by(extract("month", PurchaseOrder.order_date))
        .all()
    )

    months = []
    orders = []

    for month, count in results:
        months.append(month_names[int(month) - 1])
        orders.append(count)

    return {
        "months": months,
        "orders": orders
    }

def get_vendor_categories(db: Session):

    result = (
        db.query(
            Vendor.category,
            func.count(Vendor.id)
        )
        .group_by(Vendor.category)
        .all()
    )

    return {
        "categories": [row[0] for row in result],
        "counts": [row[1] for row in result]
    }

def get_compliance_status(db: Session):

    total = db.query(Vendor).count()

    compliant = (
        db.query(Vendor)
        .filter(Vendor.compliance_score >= 80)
        .count()
    )

    pending = (
        db.query(Vendor)
        .filter(
            Vendor.compliance_score >= 50,
            Vendor.compliance_score < 80
        )
        .count()
    )

    expired = (
        db.query(Vendor)
        .filter(Vendor.compliance_score < 50)
        .count()
    )

    return {
        "total": total,
        "labels": [
            "Compliant",
            "Pending",
            "Expired"
        ],
        "values": [
            compliant,
            pending,
            expired
        ]
    }
def get_recent_vendors(db: Session):

    return (
        db.query(Vendor)
        .order_by(Vendor.id.desc())
        .limit(5)
        .all()
    )


def get_recent_purchase_orders(db: Session):

    orders = (
        db.query(PurchaseOrder)
        .order_by(PurchaseOrder.id.desc())
        .limit(5)
        .all()
    )

    return [
        {
            "po_number": order.po_number,
            "vendor": order.vendor.vendor_name,
            "amount": order.amount,
            "status": order.status
        }
        for order in orders
    ]