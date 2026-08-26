"""
notifications_engine.py — automated checks that generate Notification rows
on their own, instead of relying on manual events elsewhere in the code.

Currently handles: Contract Expiry Alerts. Call check_expiring_contracts(db)
and it will create exactly one notification per contract the first time that
contract enters the "expiring soon" window - the expiry_notified flag on the
Contract row stops it from firing again on every subsequent call.

This is called from a few places rather than a real background scheduler
(no APScheduler/Celery dependency needed for this project's scope):
  - once when the app starts up (main.py)
  - whenever a new contract is created (routers/contracts.py)
  - whenever notifications are fetched (routers/notifications.py) - this is
    what makes it feel "live" during a demo, since opening the notification
    bell re-runs the scan
"""
import datetime as dt
from sqlalchemy.orm import Session

import models

EXPIRY_WARNING_DAYS = 30


def check_expiring_contracts(db: Session, warning_days: int = EXPIRY_WARNING_DAYS) -> int:
    now = dt.datetime.utcnow()
    cutoff = now + dt.timedelta(days=warning_days)

    expiring = (
        db.query(models.Contract)
        .filter(
            models.Contract.expiry_notified == False,  # noqa: E712
            models.Contract.end_date >= now,
            models.Contract.end_date <= cutoff,
        )
        .all()
    )

    created = 0
    for contract in expiring:
        vendor = db.query(models.Vendor).filter(models.Vendor.id == contract.vendor_id).first()
        vendor_name = vendor.name if vendor else f"Vendor #{contract.vendor_id}"
        days_left = (contract.end_date - now).days

        notif = models.Notification(
            title="Contract Expiring Soon",
            message=f"'{contract.contract_title}' with {vendor_name} expires in {days_left} day(s) "
                     f"(on {contract.end_date.strftime('%d %b %Y')}).",
            category="Contract Expiry Alerts",
        )
        db.add(notif)
        contract.expiry_notified = True
        created += 1

    if created:
        db.commit()

    return created
