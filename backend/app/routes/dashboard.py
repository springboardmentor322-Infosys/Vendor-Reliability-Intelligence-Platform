from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date

from app.database import get_db

from app.models.user import User
from app.models.vendor import Vendor
from app.models.product import Product
from app.models.purchase_order import PurchaseOrder
from app.models.delivery import Delivery
from app.models.invoice import Invoice
from app.models.quality_inspection import QualityInspection
from app.models.contract import Contract
from app.models.procurement_request import ProcurementRequest

from app.services.authorization import require_roles




router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


# ============================================================
# ADMINISTRATOR DASHBOARD
# ============================================================

@router.get("/administrator")
def administrator_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles("Administrator")
    )
):

    total_users = db.query(User).count()

    total_vendors = db.query(Vendor).count()

    active_vendors = (
        db.query(Vendor)
        .filter(
            Vendor.status == "Active"
        )
        .count()
    )

    total_purchase_orders = (
        db.query(PurchaseOrder).count()
    )

    pending_purchase_orders = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.status == "Pending"
        )
        .count()
    )

    total_invoices = (
        db.query(Invoice).count()
    )

    active_contracts = (
        db.query(Contract)
        .filter(
            Contract.contract_status == "Active"
        )
        .count()
    )

    pending_deliveries = (
        db.query(Delivery)
        .filter(
            Delivery.delivery_status == "Pending"
        )
        .count()
    )

    delayed_deliveries = (
        db.query(Delivery)
        .filter(
            Delivery.delivery_status == "Delayed"
        )
        .count()
    )

    average_reliability = (
        db.query(
            func.avg(
                Vendor.reliability_score
            )
        )
        .scalar()
        or 0
    )

    return {
        "total_users": total_users,
        "total_vendors": total_vendors,
        "active_vendors": active_vendors,
        "purchase_orders": total_purchase_orders,
        "pending_purchase_orders": pending_purchase_orders,
        "total_invoices": total_invoices,
        "active_contracts": active_contracts,
        "pending_deliveries": pending_deliveries,
        "delayed_deliveries": delayed_deliveries,
        "average_reliability": round(
            float(average_reliability),
            2
        )
    }

@router.get("/administrator/vendor-reliability")
def administrator_vendor_reliability(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles("Administrator")
    )
):

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
            Vendor.reliability_score >= 50,
            Vendor.reliability_score < 75
        )
        .count()
    )

    poor = (
        db.query(Vendor)
        .filter(Vendor.reliability_score < 50)
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
    
@router.get("/administrator/procurement-activity")
def administrator_procurement_activity(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles("Administrator")
    )
):

    pending = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.status == "Pending"
        )
        .count()
    )

    processing = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.status == "Processing"
        )
        .count()
    )

    completed = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.status == "Completed"
        )
        .count()
    )

    cancelled = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.status.in_(
                ["Cancelled", "Canceled"]
            )
        )
        .count()
    )

    return {
        "labels": [
            "Pending",
            "Processing",
            "Completed",
            "Cancelled"
        ],
        "values": [
            pending,
            processing,
            completed,
            cancelled
        ]
    }
    
@router.get("/administrator/vendor-categories")
def administrator_vendor_categories(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles("Administrator")
    )
):

    rows = (
        db.query(
            Vendor.category,
            func.count(Vendor.id)
        )
        .group_by(Vendor.category)
        .order_by(
            func.count(Vendor.id).desc()
        )
        .all()
    )

    return {
        "categories": [
            row[0] for row in rows
        ],
        "counts": [
            row[1] for row in rows
        ]
    }
    
# ============================================================
# ADMINISTRATOR COMPLIANCE
# ============================================================

@router.get("/administrator/compliance")
def administrator_compliance(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles("Administrator")
    )
):

    compliant = (
        db.query(Vendor)
        .filter(
            Vendor.compliance_score >= 80
        )
        .count()
    )

    needs_review = (
        db.query(Vendor)
        .filter(
            Vendor.compliance_score >= 50,
            Vendor.compliance_score < 80
        )
        .count()
    )

    non_compliant = (
        db.query(Vendor)
        .filter(
            Vendor.compliance_score < 50
        )
        .count()
    )

    return {
        "labels": [
            "Compliant",
            "Needs Review",
            "Non-Compliant"
        ],
        "values": [
            compliant,
            needs_review,
            non_compliant
        ]
    }
# ============================================================
# SUPPLY CHAIN MANAGER DASHBOARD
# ============================================================

@router.get("/supply-chain")
def supply_chain_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles("Supply Chain Manager")
    )
):

    pending_deliveries = (
        db.query(Delivery)
        .filter(
            Delivery.delivery_status == "Pending"
        )
        .count()
    )

    delayed_deliveries = (
        db.query(Delivery)
        .filter(
            Delivery.delivery_status == "Delayed"
        )
        .count()
    )

    quality_issues = (
        db.query(QualityInspection)
        .filter(
            QualityInspection.status == "Failed"
        )
        .count()
    )

    active_contracts = (
        db.query(Contract)
        .filter(
            Contract.contract_status == "Active"
        )
        .count()
    )

    return {
        "vendors":
            db.query(Vendor).count(),

        "purchase_orders":
            db.query(PurchaseOrder).count(),

        "pending_deliveries":
            pending_deliveries,

        "delayed_deliveries":
            delayed_deliveries,

        "quality_issues":
            quality_issues,

        "active_contracts":
            active_contracts
    }


# ============================================================
# PROCUREMENT MANAGER DASHBOARD
# ============================================================

@router.get("/procurement-manager")
def procurement_manager_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles("Procurement Manager")
    )
):

    pending_requests = (
        db.query(ProcurementRequest)
        .filter(
            ProcurementRequest.status == "Pending"
        )
        .count()
    )

    pending_deliveries = (
        db.query(Delivery)
        .filter(
            Delivery.delivery_status == "Pending"
        )
        .count()
    )

    return {
        "procurement_requests":
            db.query(ProcurementRequest).count(),

        "pending_requests":
            pending_requests,

        "purchase_orders":
            db.query(PurchaseOrder).count(),

        "pending_deliveries":
            pending_deliveries,

        "vendors":
            db.query(Vendor).count()
    }


# ============================================================
# VENDOR DASHBOARD
# ============================================================

@router.get("/vendor")
def vendor_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles("Vendor")
    )
):

    vendor = (
        db.query(Vendor)
        .filter(
            Vendor.email == current_user.email
        )
        .first()
    )

    if not vendor:
        return {
            "purchase_orders": 0,
            "deliveries": 0,
            "contracts": 0,
            "invoices": 0
        }

    purchase_orders = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.vendor_id == vendor.id
        )
        .count()
    )

    deliveries = (
        db.query(Delivery)
        .filter(
            Delivery.vendor_id == vendor.id
        )
        .count()
    )

    contracts = (
        db.query(Contract)
        .filter(
            Contract.vendor_id == vendor.id
        )
        .count()
    )

    invoices = (
        db.query(Invoice)
        .filter(
            Invoice.vendor_id == vendor.id
        )
        .count()
    )

    return {
        "purchase_orders":
            purchase_orders,

        "deliveries":
            deliveries,

        "contracts":
            contracts,

        "invoices":
            invoices
    }


# ============================================================
# FINANCE OFFICER DASHBOARD
# ============================================================

@router.get("/finance-officer")
def finance_officer_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles("Finance Officer")
    )
):

    total_invoices = (
        db.query(Invoice).count()
    )

    pending_payments = (
        db.query(Invoice)
        .filter(
            Invoice.payment_status == "Pending"
        )
        .count()
    )

    overdue_invoices = (
        db.query(Invoice)
        .filter(
            Invoice.payment_status == "Overdue"
        )
        .count()
    )

    total_payable = (
        db.query(
            func.coalesce(
                func.sum(Invoice.amount),
                0
            )
        )
        .scalar()
    )

    return {
        "total_invoices":
            total_invoices,

        "pending_payments":
            pending_payments,

        "overdue_invoices":
            overdue_invoices,

        "total_payable":
            float(total_payable or 0)
    }


# ============================================================
# AUDITOR DASHBOARD
# ============================================================

@router.get("/auditor")
def auditor_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles("Auditor")
    )
):

    total_vendors = (
        db.query(Vendor).count()
    )

    total_purchase_orders = (
        db.query(PurchaseOrder).count()
    )

    total_invoices = (
        db.query(Invoice).count()
    )

    total_contracts = (
        db.query(Contract).count()
    )

    total_inspections = (
        db.query(QualityInspection).count()
    )

    failed_inspections = (
        db.query(QualityInspection)
        .filter(
            QualityInspection.status == "Failed"
        )
        .count()
    )

    pending_deliveries = (
        db.query(Delivery)
        .filter(
            Delivery.delivery_status == "Pending"
        )
        .count()
    )

    return {
        "vendors":
            total_vendors,

        "purchase_orders":
            total_purchase_orders,

        "invoices":
            total_invoices,

        "contracts":
            total_contracts,

        "quality_inspections":
            total_inspections,

        "failed_inspections":
            failed_inspections,

        "pending_deliveries":
            pending_deliveries
    }
    
@router.get(
    "/administrator/recent-vendors",
    dependencies=[Depends(require_roles("Administrator"))]
)
def get_administrator_recent_vendors(
    db: Session = Depends(get_db)
):
    vendors = (
        db.query(Vendor)
        .order_by(
            Vendor.reliability_score.desc()
        )
        .limit(5)
        .all()
    )

    return [
        {
            "id": vendor.id,
            "vendor_name": vendor.vendor_name,
            "category": vendor.category,
            "reliability_score": float(
                vendor.reliability_score or 0
            ),
            "compliance_score": float(
                vendor.compliance_score or 0
            ),
            "status": vendor.status
        }
        for vendor in vendors
    ]


@router.get(
    "/administrator/recent-purchase-orders",
    dependencies=[Depends(require_roles("Administrator"))]
)
def get_administrator_recent_purchase_orders(
    db: Session = Depends(get_db)
):
    orders = (
        db.query(PurchaseOrder)
        .order_by(
            PurchaseOrder.order_date.desc()
        )
        .limit(5)
        .all()
    )

    result = []

    for order in orders:
        vendor_name = None

        if order.vendor:
            vendor_name = order.vendor.vendor_name

        result.append(
            {
                "id": order.id,
                "po_number": order.po_number,
                "vendor": vendor_name,
                "amount": float(
                    order.amount or 0
                ),
                "status": order.status,
                "order_date": (
                    order.order_date.isoformat()
                    if order.order_date
                    else None
                ),
                "delivery_date": (
                    order.delivery_date.isoformat()
                    if order.delivery_date
                    else None
                )
            }
        )

    return result