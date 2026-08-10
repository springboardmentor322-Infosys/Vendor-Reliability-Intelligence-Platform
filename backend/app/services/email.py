"""SMTP email notifications via a reusable send_email helper."""

from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _wrap_html(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>{title}</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
    <h2 style="margin: 0; color: #2563eb;">VendorIQ</h2>
  </div>
  {body_html}
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="font-size: 12px; color: #6b7280;">This is an automated notification from VendorIQ. Please do not reply to this email.</p>
</body>
</html>"""


def send_email(to: str, subject: str, body: str) -> bool:
    """Send an HTML email. Returns True on success, False if skipped or failed."""
    settings = get_settings()
    if not settings.SMTP_HOST or not settings.SMTP_USER or not to:
        logger.debug("Email skipped: SMTP not configured or no recipient")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to

    html_part = MIMEText(body, "html", "utf-8")
    msg.attach(html_part)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
            server.starttls()
            if settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, [to], msg.as_string())
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception:
        logger.exception("Failed to send email to %s: %s", to, subject)
        return False


def notify_po_issued(
    *,
    vendor_name: str,
    vendor_email: str,
    po_number: str,
    total_amount: str,
    expected_delivery: str | None,
) -> None:
    delivery_line = (
        f"<p><strong>Expected delivery:</strong> {expected_delivery}</p>"
        if expected_delivery
        else ""
    )
    body = _wrap_html(
        "New Purchase Order",
        f"""<h3>New Purchase Order Issued</h3>
<p>Hello {vendor_name},</p>
<p>A new purchase order has been issued to your organization.</p>
<ul>
  <li><strong>PO Number:</strong> {po_number}</li>
  <li><strong>Total Amount:</strong> {total_amount}</li>
</ul>
{delivery_line}
<p>Please log in to VendorIQ to review the order details and update the status as work progresses.</p>""",
    )
    send_email(vendor_email, f"New Purchase Order: {po_number}", body)


def notify_vendor_status_change(
    *,
    vendor_name: str,
    vendor_email: str,
    new_status: str,
    rejection_reason: str | None = None,
) -> None:
    reason_block = (
        f"<p><strong>Reason:</strong> {rejection_reason}</p>"
        if rejection_reason
        else ""
    )
    body = _wrap_html(
        "Vendor Status Update",
        f"""<h3>Vendor Approval Status Updated</h3>
<p>Hello {vendor_name},</p>
<p>Your vendor profile status has been updated to <strong>{new_status}</strong>.</p>
{reason_block}
<p>Log in to VendorIQ for more details.</p>""",
    )
    send_email(vendor_email, f"Vendor Status: {new_status}", body)


def notify_procurement_decision(
    *,
    requester_email: str,
    requester_name: str,
    request_id: int,
    department: str,
    approved: bool,
    rejection_reason: str | None = None,
) -> None:
    if approved:
        subject = f"Procurement Request #{request_id} Approved"
        detail = "<p>Your procurement request has been <strong style=\"color: #059669;\">approved</strong>.</p>"
    else:
        subject = f"Procurement Request #{request_id} Rejected"
        reason = f"<p><strong>Reason:</strong> {rejection_reason}</p>" if rejection_reason else ""
        detail = f"""<p>Your procurement request has been <strong style="color: #dc2626;">rejected</strong>.</p>
{reason}"""

    body = _wrap_html(
        "Procurement Request Update",
        f"""<h3>Procurement Request Update</h3>
<p>Hello {requester_name},</p>
{detail}
<ul>
  <li><strong>Request ID:</strong> #{request_id}</li>
  <li><strong>Department:</strong> {department}</li>
</ul>
<p>Log in to VendorIQ to view the full request details.</p>""",
    )
    send_email(requester_email, subject, body)


def notify_contract_expiring_soon(
    *,
    recipient_email: str,
    recipient_name: str,
    contract_title: str,
    contract_number: str,
    expiry_date: str,
    days_remaining: int,
) -> None:
    body = _wrap_html(
        "Contract Expiring Soon",
        f"""<h3>Contract Expiring Soon</h3>
<p>Hello {recipient_name},</p>
<p>The following contract is approaching its expiry date and requires your attention:</p>
<ul>
  <li><strong>Contract:</strong> {contract_title}</li>
  <li><strong>Contract Number:</strong> {contract_number}</li>
  <li><strong>Expiry Date:</strong> {expiry_date}</li>
  <li><strong>Days Remaining:</strong> {days_remaining}</li>
</ul>
<p>Please review this contract for renewal or termination.</p>""",
    )
    send_email(
        recipient_email,
        f"Contract Expiring Soon: {contract_title}",
        body,
    )


def notify_password_reset(*, recipient_email: str, recipient_name: str, reset_url: str) -> None:
    body = _wrap_html(
        "Reset Your Password",
        f"""<h3>Password Reset Request</h3>
<p>Hello {recipient_name},</p>
<p>We received a request to reset your VendorIQ password. Click the link below to choose a new password:</p>
<p style="margin: 24px 0;">
  <a href="{reset_url}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Reset Password</a>
</p>
<p>Or copy this link into your browser:</p>
<p style="word-break: break-all; color: #2563eb;">{reset_url}</p>
<p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>""",
    )
    send_email(recipient_email, "Reset your VendorIQ password", body)


def notify_password_reset(*, recipient_email: str, recipient_name: str, reset_url: str) -> None:
    body = _wrap_html(
        "Reset Your Password",
        f"""<h3>Password Reset Request</h3>
<p>Hello {recipient_name},</p>
<p>We received a request to reset your VendorIQ password. Click the button below to choose a new password. This link expires in 1 hour.</p>
<p style="text-align: center; margin: 28px 0;">
  <a href="{reset_url}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Reset Password</a>
</p>
<p>If you did not request this, you can safely ignore this email.</p>
<p style="font-size: 13px; color: #6b7280;">Or copy this link: {reset_url}</p>""",
    )
    send_email(recipient_email, "Reset your VendorIQ password", body)
