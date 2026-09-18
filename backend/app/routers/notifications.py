from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)

notifications = [
    {
        "id": 1,
        "title": "Vendor Approved",
        "message": "Vendor ABC Technologies has been approved.",
        "status": "Unread"
    },
    {
        "id": 2,
        "title": "Purchase Order Created",
        "message": "Purchase Order PO-1001 has been created.",
        "status": "Unread"
    }
]

@router.get("/")
def get_notifications():
    return notifications

@router.get("/{notification_id}")
def get_notification(notification_id: int):
    for notification in notifications:
        if notification["id"] == notification_id:
            return notification
    return {
        "message": "Notification not found"
    }

@router.put("/{notification_id}/read")
def mark_as_read(notification_id: int):
    for notification in notifications:
        if notification["id"] == notification_id:
            notification["status"] = "Read"
            return {
                "message": "Notification marked as read",
                "notification": notification
            }
    return {
        "message": "Notification not found"
    }

@router.delete("/{notification_id}")
def delete_notification(notification_id: int):
    for notification in notifications:
        if notification["id"] == notification_id:
            notifications.remove(notification)
            return {
                "message": "Notification deleted successfully"
            }
    return {
        "message": "Notification not found"
    }

@router.get("/vendor/{vendor_id}/alerts")
def get_vendor_alerts(
    vendor_id: int,
    db: Session = Depends(get_db)
):
    vendor = db.query(models.Vendor).filter(
        models.Vendor.id == vendor_id
    ).first()

    if not vendor:
        return {
            "message": "Vendor not found"
        }

    performances = db.query(models.VendorPerformance).filter(
        models.VendorPerformance.vendor_id == vendor_id
    ).all()

    total_delayed = sum(
        performance.delayed_deliveries
        for performance in performances
    )

    if total_delayed > 0:
        return [
            {
                "vendor_id": vendor.id,
                "vendor_name": vendor.vendor_name,
                "title": "Delivery Delay Alert",
                "message": (
                    f"Vendor {vendor.vendor_name} has "
                    f"{total_delayed} delayed deliveries."
                ),
                "status": "Unread"
            }
        ]

    return [
        {
            "vendor_id": vendor.id,
            "vendor_name": vendor.vendor_name,
            "title": "No Delivery Delays",
            "message": (
                f"Vendor {vendor.vendor_name} "
                "has no delayed deliveries."
            ),
            "status": "Read"
        }
    ]

@router.get("/vendor/{vendor_id}/approval")
def get_vendor_approval_notification(
    vendor_id: int,
    db: Session = Depends(get_db)
):
    vendor = db.query(models.Vendor).filter(
        models.Vendor.id == vendor_id
    ).first()

    if not vendor:
        return {
            "message": "Vendor not found"
        }

    if vendor.status == "Approved":
        return {
            "vendor_id": vendor.id,
            "vendor_name": vendor.vendor_name,
            "title": "Vendor Approved",
            "message": (
                f"Vendor {vendor.vendor_name} "
                "has been approved successfully."
            ),
            "status": "Unread"
        }

    return {
        "vendor_id": vendor.id,
        "vendor_name": vendor.vendor_name,
        "title": "Vendor Approval Pending",
        "message": (
            f"Vendor {vendor.vendor_name} "
            "is waiting for approval."
        ),
        "status": "Unread"
    }

@router.get("/procurement/{procurement_id}/alert")
def get_procurement_alert(
    procurement_id: int,
    db: Session = Depends(get_db)
):
    procurement = db.query(models.Procurement).filter(
        models.Procurement.id == procurement_id
    ).first()

    if not procurement:
        return {
            "message": "Procurement not found"
        }

    if procurement.status == "Pending":
        return {
            "procurement_id": procurement.id,
            "item_name": procurement.item_name,
            "title": "Procurement Approval Alert",
            "message": (
                f"Procurement request for "
                f"{procurement.item_name} "
                "is waiting for approval."
            ),
            "status": "Unread"
        }

    if procurement.status == "Approved":
        return {
            "procurement_id": procurement.id,
            "item_name": procurement.item_name,
            "title": "Procurement Approved",
            "message": (
                f"Procurement request for "
                f"{procurement.item_name} "
                "has been approved."
            ),
            "status": "Unread"
        }

    return {
        "procurement_id": procurement.id,
        "item_name": procurement.item_name,
        "title": "Procurement Status Update",
        "message": (
            f"Procurement request for "
            f"{procurement.item_name} "
            f"is currently {procurement.status}."
        ),
        "status": "Read"
    }

@router.get("/contract/{contract_id}/compliance")
def get_contract_compliance_alert(
    contract_id: int,
    db: Session = Depends(get_db)
):
    contract = db.query(models.Contract).filter(
        models.Contract.id == contract_id
    ).first()

    if not contract:
        return {
            "message": "Contract not found"
        }

    if contract.compliance_status == "Non-Compliant":
        return {
            "contract_id": contract.id,
            "contract_name": contract.contract_name,
            "title": "Compliance Alert",
            "message": (
                f"Contract {contract.contract_name} "
                "is non-compliant."
            ),
            "compliance_status": contract.compliance_status,
            "status": "Unread"
        }

    if contract.compliance_status == "Pending":
        return {
            "contract_id": contract.id,
            "contract_name": contract.contract_name,
            "title": "Compliance Review Pending",
            "message": (
                f"Compliance review for "
                f"{contract.contract_name} "
                "is pending."
            ),
            "compliance_status": contract.compliance_status,
            "status": "Unread"
        }

    return {
        "contract_id": contract.id,
        "contract_name": contract.contract_name,
        "title": "Compliance Verified",
        "message": (
            f"Contract {contract.contract_name} "
            "is compliant."
        ),
        "compliance_status": contract.compliance_status,
        "status": "Read"
    }
