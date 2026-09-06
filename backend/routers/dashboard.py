import datetime as dt

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from database import get_db
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard & Analytics"])


def _enum_counts(query_result):
    return {key.value: value for key, value in query_result if key is not None}


def _contract_expiry_count(db, vendor_id=None, days=30):
    now = dt.datetime.utcnow()
    cutoff = now + dt.timedelta(days=days)

    query = db.query(models.Contract).filter(
        models.Contract.end_date >= now,
        models.Contract.end_date <= cutoff,
    )

    if vendor_id is not None:
        query = query.filter(models.Contract.vendor_id == vendor_id)

    return query.count()


# ============================================================
# MAIN ROLE-BASED DASHBOARD
# ============================================================

@router.get("/summary")
def summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    role = current_user.role

    # ========================================================
    # ADMINISTRATOR
    # ========================================================

    if role == models.RoleEnum.ADMIN:

        total_users = db.query(models.User).count()
        active_users = db.query(models.User).filter(
            models.User.is_active == True
        ).count()

        inactive_users = total_users - active_users

        total_vendors = db.query(models.Vendor).count()
        approved_vendors = db.query(models.Vendor).filter(
            models.Vendor.status == models.VendorStatusEnum.APPROVED
        ).count()

        pending_vendors = db.query(models.Vendor).filter(
            models.Vendor.status == models.VendorStatusEnum.PENDING
        ).count()

        total_pos = db.query(models.PurchaseOrder).count()

        total_spend = db.query(
            func.coalesce(
                func.sum(models.PurchaseOrder.total_amount), 0.0
            )
        ).scalar()

        total_contracts = db.query(models.Contract).count()

        compliance = _enum_counts(
            db.query(
                models.Contract.compliance_status,
                func.count(models.Contract.id)
            )
            .group_by(models.Contract.compliance_status)
            .all()
        )

        unread_notifications = db.query(
            models.Notification
        ).filter(
            models.Notification.is_read == False
        ).count()

        users_by_role = _enum_counts(
            db.query(
                models.User.role,
                func.count(models.User.id)
            )
            .group_by(models.User.role)
            .all()
        )

        risk_distribution = _enum_counts(
            db.query(
                models.Vendor.risk_level,
                func.count(models.Vendor.id)
            )
            .group_by(models.Vendor.risk_level)
            .all()
        )

        return {
            "role": "Administrator",

            "users": {
                "total": total_users,
                "active": active_users,
                "inactive": inactive_users,
                "by_role": users_by_role,
            },

            "vendors": {
                "total": total_vendors,
                "approved": approved_vendors,
                "pending": pending_vendors,
                "risk_distribution": risk_distribution,
            },

            "procurement": {
                "total_purchase_orders": total_pos,
                "total_spend": round(total_spend, 2),
            },

            "contracts": {
                "total": total_contracts,
                "expiring_next_30_days":
                    _contract_expiry_count(db),
                "compliance": compliance,
            },

            "system": {
                "unread_notifications": unread_notifications,
                "total_messages": db.query(models.Message).count(),
                "total_notifications": db.query(models.Notification).count(),
            },
        }

    # ========================================================
    # PROCUREMENT MANAGER
    # ========================================================

    if role == models.RoleEnum.PROCUREMENT_MANAGER:

        status_counts = _enum_counts(
            db.query(
                models.PurchaseOrder.status,
                func.count(models.PurchaseOrder.id)
            )
            .group_by(models.PurchaseOrder.status)
            .all()
        )

        total_spend = db.query(
            func.coalesce(
                func.sum(models.PurchaseOrder.total_amount), 0.0
            )
        ).scalar()

        pending_approval = db.query(
            models.PurchaseOrder
        ).filter(
            models.PurchaseOrder.status ==
            models.ProcurementStatusEnum.PENDING
        ).count()

        active_orders = db.query(
            models.PurchaseOrder
        ).filter(
            models.PurchaseOrder.status.in_([
                models.ProcurementStatusEnum.PENDING,
                models.ProcurementStatusEnum.APPROVED,
                models.ProcurementStatusEnum.ORDERED,
            ])
        ).count()

        delivered_orders = db.query(
            models.PurchaseOrder
        ).filter(
            models.PurchaseOrder.status ==
            models.ProcurementStatusEnum.DELIVERED
        ).count()

        completed_orders = db.query(
            models.PurchaseOrder
        ).filter(
            models.PurchaseOrder.status ==
            models.ProcurementStatusEnum.COMPLETED
        ).count()

        delayed_orders = db.query(
            models.PurchaseOrder
        ).filter(
            models.PurchaseOrder.expected_delivery < dt.datetime.utcnow(),
            models.PurchaseOrder.status.notin_([
                models.ProcurementStatusEnum.COMPLETED,
                models.ProcurementStatusEnum.CANCELLED,
            ])
        ).count()

        top_vendors = (
            db.query(models.Vendor)
            .filter(
                models.Vendor.status ==
                models.VendorStatusEnum.APPROVED
            )
            .order_by(
                models.Vendor.reliability_score.desc()
            )
            .limit(5)
            .all()
        )

        return {
            "role": "Procurement Manager",

            "procurement_overview": {
                "total_purchase_orders":
                    db.query(models.PurchaseOrder).count(),
                "pending_approval": pending_approval,
                "active_orders": active_orders,
                "delivered_orders": delivered_orders,
                "completed_orders": completed_orders,
                "delayed_orders": delayed_orders,
                "total_spend": round(total_spend, 2),
                "by_status": status_counts,
            },

            "vendor_performance": [
                {
                    "id": v.id,
                    "name": v.name,
                    "reliability_score": v.reliability_score,
                    "risk_level": v.risk_level.value,
                }
                for v in top_vendors
            ],

            "delivery_status": {
                "delayed_orders": delayed_orders,
                "upcoming_contracts":
                    _contract_expiry_count(db),
            },
        }

    # ========================================================
    # SUPPLY CHAIN MANAGER
    # ========================================================

    if role == models.RoleEnum.SUPPLY_CHAIN_MANAGER:

        vendors = (
            db.query(models.Vendor)
            .order_by(models.Vendor.reliability_score.asc())
            .all()
        )

        delayed_orders = (
            db.query(models.PurchaseOrder)
            .filter(
                models.PurchaseOrder.expected_delivery < dt.datetime.utcnow(),
                models.PurchaseOrder.status.notin_([
                    models.ProcurementStatusEnum.COMPLETED,
                    models.ProcurementStatusEnum.CANCELLED,
                ])
            )
            .all()
        )

        total_on_time = db.query(
            func.coalesce(
                func.sum(models.PerformanceRecord.on_time_deliveries),
                0
            )
        ).scalar()

        total_delayed = db.query(
            func.coalesce(
                func.sum(models.PerformanceRecord.delayed_deliveries),
                0
            )
        ).scalar()

        avg_quality = db.query(
            func.coalesce(
                func.avg(models.PerformanceRecord.quality_rating),
                0.0
            )
        ).scalar()

        risk_distribution = _enum_counts(
            db.query(
                models.Vendor.risk_level,
                func.count(models.Vendor.id)
            )
            .group_by(models.Vendor.risk_level)
            .all()
        )

        return {
            "role": "Supply Chain Manager",

            "supplier_reliability": {
                "average_score": round(
                    db.query(
                        func.coalesce(
                            func.avg(models.Vendor.reliability_score),
                            0.0
                        )
                    ).scalar(),
                    2
                ),
                "total_on_time_deliveries": total_on_time,
                "total_delayed_deliveries": total_delayed,
                "average_quality_rating": round(avg_quality, 2),
            },

            "risk_distribution": risk_distribution,

            "vendors": [
                {
                    "id": v.id,
                    "name": v.name,
                    "reliability_score": v.reliability_score,
                    "risk_level": v.risk_level.value,
                    "status": v.status.value,
                }
                for v in vendors
            ],

            "delayed_orders": [
                {
                    "po_number": po.po_number,
                    "vendor_id": po.vendor_id,
                    "item": po.item_description,
                    "expected_delivery": po.expected_delivery,
                    "status": po.status.value,
                }
                for po in delayed_orders
            ],

            "contracts_expiring_next_30_days":
                _contract_expiry_count(db),
        }

    # ========================================================
    # VENDOR
    # ========================================================

    if role == models.RoleEnum.VENDOR:

        if not current_user.vendor_id:
            return {
                "role": "Vendor",
                "vendor_linked": False,
                "message":
                    "No vendor profile is linked to this account.",
            }

        vendor = db.query(models.Vendor).filter(
            models.Vendor.id == current_user.vendor_id
        ).first()

        if not vendor:
            return {
                "role": "Vendor",
                "vendor_linked": False,
                "message":
                    "No vendor profile is linked to this account.",
            }

        performance = (
            db.query(models.PerformanceRecord)
            .filter(
                models.PerformanceRecord.vendor_id ==
                vendor.id
            )
            .order_by(
                models.PerformanceRecord.recorded_at.desc()
            )
            .all()
        )

        orders = (
            db.query(models.PurchaseOrder)
            .filter(
                models.PurchaseOrder.vendor_id == vendor.id
            )
            .order_by(
                models.PurchaseOrder.order_date.desc()
            )
            .all()
        )

        contracts = (
            db.query(models.Contract)
            .filter(
                models.Contract.vendor_id == vendor.id
            )
            .order_by(
                models.Contract.end_date.asc()
            )
            .all()
        )

        messages = (
            db.query(models.Message)
            .filter(
                models.Message.vendor_id == vendor.id
            )
            .order_by(
                models.Message.sent_at.desc()
            )
            .limit(10)
            .all()
        )

        latest_performance = performance[0] if performance else None

        return {
            "role": "Vendor",
            "vendor_linked": True,

            "vendor": {
                "id": vendor.id,
                "name": vendor.name,
                "category": vendor.category.value,
                "status": vendor.status.value,
                "reliability_score": vendor.reliability_score,
                "risk_level": vendor.risk_level.value,
            },

            "performance": {
                "on_time_deliveries":
                    latest_performance.on_time_deliveries
                    if latest_performance else 0,

                "delayed_deliveries":
                    latest_performance.delayed_deliveries
                    if latest_performance else 0,

                "quality_rating":
                    latest_performance.quality_rating
                    if latest_performance else 0,

                "response_time_hours":
                    latest_performance.response_time_hours
                    if latest_performance else 0,

                "issue_resolution_hours":
                    latest_performance.issue_resolution_hours
                    if latest_performance else 0,

                "completion_rate":
                    latest_performance.order_completion_rate
                    if latest_performance else 0,
            },

            "orders": [
                {
                    "po_number": po.po_number,
                    "item": po.item_description,
                    "quantity": po.quantity,
                    "total_amount": po.total_amount,
                    "status": po.status.value,
                    "order_date": po.order_date,
                    "expected_delivery": po.expected_delivery,
                    "actual_delivery": po.actual_delivery,
                }
                for po in orders
            ],

            "contracts": [
                {
                    "title": c.contract_title,
                    "start_date": c.start_date,
                    "end_date": c.end_date,
                    "compliance": c.compliance_status.value,
                }
                for c in contracts
            ],

            "communication": [
                {
                    "sender": m.sender,
                    "content": m.content,
                    "sent_at": m.sent_at,
                }
                for m in messages
            ],
        }

     # ========================================================
    # FINANCE OFFICER
    # ========================================================

    if role == models.RoleEnum.FINANCE_OFFICER:

        total_spend = db.query(
            func.coalesce(
                func.sum(models.PurchaseOrder.total_amount),
                0.0
            )
        ).scalar()

        paid_count = db.query(
            models.PurchaseOrder
        ).filter(
            models.PurchaseOrder.invoice_paid == True
        ).count()

        unpaid_count = db.query(
            models.PurchaseOrder
        ).filter(
            models.PurchaseOrder.invoice_paid == False
        ).count()

        invoiced_count = db.query(
            models.PurchaseOrder
        ).filter(
            models.PurchaseOrder.invoice_number.isnot(None)
        ).count()

        uninvoiced_count = db.query(
            models.PurchaseOrder
        ).filter(
            models.PurchaseOrder.invoice_number.is_(None)
        ).count()

        paid_amount = db.query(
            func.coalesce(
                func.sum(models.PurchaseOrder.total_amount),
                0.0
            )
        ).filter(
            models.PurchaseOrder.invoice_paid == True
        ).scalar()

        unpaid_amount = db.query(
            func.coalesce(
                func.sum(models.PurchaseOrder.total_amount),
                0.0
            )
        ).filter(
            models.PurchaseOrder.invoice_paid == False
        ).scalar()

        vendor_spending = (
            db.query(
                models.Vendor.name,
                func.sum(models.PurchaseOrder.total_amount)
            )
            .join(
                models.PurchaseOrder,
                models.PurchaseOrder.vendor_id ==
                models.Vendor.id
            )
            .group_by(models.Vendor.name)
            .order_by(
                func.sum(
                    models.PurchaseOrder.total_amount
                ).desc()
            )
            .all()
        )

        # Vendor payment history
        payment_history = (
            db.query(
                models.PurchaseOrder,
                models.Vendor.name
            )
            .join(
                models.Vendor,
                models.PurchaseOrder.vendor_id ==
                models.Vendor.id
            )
            .order_by(
                models.PurchaseOrder.order_date.desc()
            )
            .all()
        )

        return {
            "role": "Finance Officer",

            "financial_overview": {
                "total_procurement_spend": round(
                    total_spend or 0,
                    2
                ),
                "paid_amount": round(
                    paid_amount or 0,
                    2
                ),
                "unpaid_amount": round(
                    unpaid_amount or 0,
                    2
                ),
                "paid_orders": paid_count,
                "unpaid_orders": unpaid_count,
                "invoiced_orders": invoiced_count,
                "uninvoiced_orders": uninvoiced_count,
            },

            "vendor_spending": [
                {
                    "vendor": name,
                    "amount": round(
                        amount or 0,
                        2
                    ),
                }
                for name, amount in vendor_spending
            ],

            "payment_history": [
                {
                    "vendor": vendor_name,
                    "po_number": po.po_number,
                    "item": po.item_description,
                    "amount": round(
                        po.total_amount or 0,
                        2
                    ),
                    "invoice_number": po.invoice_number,
                    "payment_status": (
                        "Paid"
                        if po.invoice_paid
                        else "Unpaid"
                    ),
                    "order_date": po.order_date,
                    "status": po.status.value,
                }
                for po, vendor_name in payment_history
            ],
        }

    # ========================================================
    # AUDITOR
    # ========================================================

    if role == models.RoleEnum.AUDITOR:

        total_contracts = db.query(
            models.Contract
        ).count()

        compliance = _enum_counts(
            db.query(
                models.Contract.compliance_status,
                func.count(models.Contract.id)
            )
            .group_by(models.Contract.compliance_status)
            .all()
        )

        missing_documents = db.query(
            models.Vendor
        ).filter(
            ~models.Vendor.id.in_(
                db.query(models.VendorDocument.vendor_id)
            )
        ).count()

        vendors = db.query(models.Vendor).all()

        purchase_orders = (
            db.query(models.PurchaseOrder)
            .order_by(
                models.PurchaseOrder.order_date.desc()
            )
            .limit(20)
            .all()
        )

        return {
            "role": "Auditor",

            "compliance": {
                "total_contracts": total_contracts,
                "by_status": compliance,
                "expiring_next_30_days":
                    _contract_expiry_count(db),
                "vendors_without_documents":
                    missing_documents,
            },

            "vendor_review": [
                {
                    "vendor_id": v.id,
                    "vendor": v.name,
                    "status": v.status.value,
                    "risk_level": v.risk_level.value,
                    "reliability_score": v.reliability_score,
                }
                for v in vendors
            ],

            "recent_purchase_orders": [
                {
                    "po_number": po.po_number,
                    "vendor_id": po.vendor_id,
                    "requested_by": po.requested_by,
                    "amount": po.total_amount,
                    "status": po.status.value,
                    "order_date": po.order_date,
                    "invoice_number": po.invoice_number,
                    "invoice_paid": po.invoice_paid,
                }
                for po in purchase_orders
            ],

            "system_activity": {
                "messages": db.query(models.Message).count(),
                "notifications": db.query(models.Notification).count(),
            },
        }

    # ========================================================
    # FALLBACK
    # ========================================================

    return {
        "role": role.value,
        "message": "Dashboard is not configured for this role."
    }


# ============================================================
# ADMIN SUMMARY
# Existing endpoint kept for compatibility
# ============================================================

@router.get("/admin-summary")
def admin_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(models.RoleEnum.ADMIN)
    ),
):
    total_users = db.query(models.User).count()

    active_users = db.query(models.User).filter(
        models.User.is_active == True
    ).count()

    users_by_role = _enum_counts(
        db.query(
            models.User.role,
            func.count(models.User.id)
        )
        .group_by(models.User.role)
        .all()
    )

    total_vendors = db.query(models.Vendor).count()

    vendor_by_category = _enum_counts(
        db.query(
            models.Vendor.category,
            func.count(models.Vendor.id)
        )
        .group_by(models.Vendor.category)
        .all()
    )

    vendor_by_risk = _enum_counts(
        db.query(
            models.Vendor.risk_level,
            func.count(models.Vendor.id)
        )
        .group_by(models.Vendor.risk_level)
        .all()
    )

    avg_reliability = db.query(
        func.coalesce(
            func.avg(models.Vendor.reliability_score),
            0.0
        )
    ).scalar()

    contracts_by_compliance = _enum_counts(
        db.query(
            models.Contract.compliance_status,
            func.count(models.Contract.id)
        )
        .group_by(models.Contract.compliance_status)
        .all()
    )

    total_pos = db.query(models.PurchaseOrder).count()

    total_spend = db.query(
        func.coalesce(
            func.sum(models.PurchaseOrder.total_amount),
            0.0
        )
    ).scalar()

    total_messages = db.query(models.Message).count()
    total_notifications = db.query(models.Notification).count()

    top_vendors = (
        db.query(models.Vendor)
        .order_by(
            models.Vendor.reliability_score.desc()
        )
        .limit(5)
        .all()
    )

    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "by_role": users_by_role,
        },

        "vendors": {
            "total": total_vendors,
            "by_category": vendor_by_category,
            "by_risk_level": vendor_by_risk,
            "average_reliability_score":
                round(avg_reliability, 2),
        },

        "compliance": {
            "by_status": contracts_by_compliance,
        },

        "system": {
            "total_purchase_orders": total_pos,
            "total_spend": round(total_spend, 2),
            "total_messages": total_messages,
            "total_notifications": total_notifications,
        },

        "top_vendors": [
            {
                "id": v.id,
                "name": v.name,
                "reliability_score":
                    v.reliability_score,
                "risk_level":
                    v.risk_level.value,
            }
            for v in top_vendors
        ],
    }