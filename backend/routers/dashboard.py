import datetime as dt
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from database import get_db
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard & Analytics"])


@router.get("/summary")
def summary(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    total_vendors = db.query(models.Vendor).count()
    approved_vendors = db.query(models.Vendor).filter(models.Vendor.status == models.VendorStatusEnum.APPROVED).count()
    pending_vendors = db.query(models.Vendor).filter(models.Vendor.status == models.VendorStatusEnum.PENDING).count()

    total_pos = db.query(models.PurchaseOrder).count()
    active_pos = (
        db.query(models.PurchaseOrder)
        .filter(models.PurchaseOrder.status.in_([
            models.ProcurementStatusEnum.PENDING,
            models.ProcurementStatusEnum.APPROVED,
            models.ProcurementStatusEnum.ORDERED,
        ]))
        .count()
    )
    completed_pos = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.status == models.ProcurementStatusEnum.COMPLETED).count()
    total_spend = db.query(func.coalesce(func.sum(models.PurchaseOrder.total_amount), 0.0)).scalar()

    po_by_status = dict(
        db.query(models.PurchaseOrder.status, func.count(models.PurchaseOrder.id))
        .group_by(models.PurchaseOrder.status)
        .all()
    )
    po_by_status = {k.value: v for k, v in po_by_status.items()}

    vendor_by_category = dict(
        db.query(models.Vendor.category, func.count(models.Vendor.id))
        .group_by(models.Vendor.category)
        .all()
    )
    vendor_by_category = {k.value: v for k, v in vendor_by_category.items()}

    vendor_by_risk = dict(
        db.query(models.Vendor.risk_level, func.count(models.Vendor.id))
        .group_by(models.Vendor.risk_level)
        .all()
    )
    vendor_by_risk = {k.value: v for k, v in vendor_by_risk.items()}

    avg_reliability = db.query(func.coalesce(func.avg(models.Vendor.reliability_score), 0.0)).scalar()

    upcoming_expiry_cutoff = dt.datetime.utcnow() + dt.timedelta(days=30)
    contracts_expiring = (
        db.query(models.Contract)
        .filter(models.Contract.end_date <= upcoming_expiry_cutoff, models.Contract.end_date >= dt.datetime.utcnow())
        .count()
    )

    top_vendors = (
        db.query(models.Vendor)
        .order_by(models.Vendor.reliability_score.desc())
        .limit(5)
        .all()
    )

    return {
        "vendors": {
            "total": total_vendors,
            "approved": approved_vendors,
            "pending": pending_vendors,
            "by_category": vendor_by_category,
            "by_risk_level": vendor_by_risk,
            "average_reliability_score": round(avg_reliability, 2),
        },
        "procurement": {
            "total_purchase_orders": total_pos,
            "active_purchase_orders": active_pos,
            "completed_purchase_orders": completed_pos,
            "total_spend": round(total_spend, 2),
            "by_status": po_by_status,
        },
        "contracts_expiring_next_30_days": contracts_expiring,
        "top_vendors": [
            {"id": v.id, "name": v.name, "reliability_score": v.reliability_score, "risk_level": v.risk_level.value}
            for v in top_vendors
        ],
    }


@router.get("/admin-summary")
def admin_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(models.RoleEnum.ADMIN)),
):
    total_users = db.query(models.User).count()
    active_users = db.query(models.User).filter(models.User.is_active == True).count()  # noqa: E712
    users_by_role = dict(
        db.query(models.User.role, func.count(models.User.id)).group_by(models.User.role).all()
    )
    users_by_role = {k.value: v for k, v in users_by_role.items()}

    total_vendors = db.query(models.Vendor).count()
    vendor_by_category = dict(
        db.query(models.Vendor.category, func.count(models.Vendor.id)).group_by(models.Vendor.category).all()
    )
    vendor_by_category = {k.value: v for k, v in vendor_by_category.items()}
    vendor_by_risk = dict(
        db.query(models.Vendor.risk_level, func.count(models.Vendor.id)).group_by(models.Vendor.risk_level).all()
    )
    vendor_by_risk = {k.value: v for k, v in vendor_by_risk.items()}
    avg_reliability = db.query(func.coalesce(func.avg(models.Vendor.reliability_score), 0.0)).scalar()

    contracts_by_compliance = dict(
        db.query(models.Contract.compliance_status, func.count(models.Contract.id))
        .group_by(models.Contract.compliance_status)
        .all()
    )
    contracts_by_compliance = {k.value: v for k, v in contracts_by_compliance.items()}

    total_pos = db.query(models.PurchaseOrder).count()
    total_spend = db.query(func.coalesce(func.sum(models.PurchaseOrder.total_amount), 0.0)).scalar()
    total_messages = db.query(models.Message).count()
    total_notifications = db.query(models.Notification).count()

    top_vendors = db.query(models.Vendor).order_by(models.Vendor.reliability_score.desc()).limit(5).all()

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
            "average_reliability_score": round(avg_reliability, 2),
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
            {"id": v.id, "name": v.name, "reliability_score": v.reliability_score, "risk_level": v.risk_level.value}
            for v in top_vendors
        ],
    }
