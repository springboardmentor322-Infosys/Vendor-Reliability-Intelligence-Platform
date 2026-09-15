from typing import List, Optional
from fastapi import Depends, FastAPI, HTTPException, Query, status, Request, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract, or_, text, desc, case, and_
from decimal import Decimal
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path
from fastapi import UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, date, timedelta, timezone
from collections import defaultdict
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
)
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
from xml.sax.saxutils import escape
import bcrypt
import os
import uuid
import shutil
import subprocess
import csv
import io
import time
import psutil
import random

import crud
import Tables as db


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="VendorIQ Reliability System",
    version="1.0.0",
    description=("VendorIQ Vendor Reliability Intelligence & Procurement Risk Management Platform"),
)

# IMPORTANT:
# For production, replace "*" with the exact frontend origin(s).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


templates = Jinja2Templates( directory="templates" )


app.mount( "/static", StaticFiles(directory="static"), name="static", )


app.mount( "/uploads", StaticFiles(directory="uploads"), name="uploads" )


@app.get("/api/auth/me", tags=["Authentication"] )
def get_current_user_profile( current_user: db.User = Depends(crud.get_current_user) ):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role
    }


@app.get( "/home", response_class=HTMLResponse, tags=["Home"], )
def home_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="Home.html",
        context={ "request": request }
    )


@app.get( "/api/home", tags=["Home"] )
def get_home_page_data( database: Session = Depends(db.get_db) ):

    # ========================================================
    # 1. TOTAL VENDORS
    # ========================================================
    total_vendors = ( database.query( func.count(db.Vendor.id) ) .scalar() )

    total_vendors = (
        total_vendors
        if total_vendors is not None
        else 0
    )

    # ========================================================
    # 2. AVERAGE RELIABILITY
    # ========================================================

    average_reliability = ( database.query( func.avg( db.Vendor.reliability_score ) ) .scalar() )

    average_reliability = (
        float(average_reliability)
        if average_reliability is not None
        else 0.0
    )

    # ========================================================
    # 3. RELIABILITY DISTRIBUTION
    # ========================================================

    excellent = ( database.query(db.Vendor) .filter( db.Vendor.reliability_score >= 80 ) .count() )

    good = ( database.query(db.Vendor) .filter( db.Vendor.reliability_score >= 60, db.Vendor.reliability_score < 80 ) .count() )

    average = ( database.query(db.Vendor) .filter( db.Vendor.reliability_score >= 40, db.Vendor.reliability_score < 60 ) .count() )

    poor = ( database.query(db.Vendor) .filter( db.Vendor.reliability_score >= 20, db.Vendor.reliability_score < 40 ) .count() )

    critical = ( database.query(db.Vendor) .filter( db.Vendor.reliability_score < 20 ) .count() )

    # ========================================================
    # 4. TOTAL PURCHASE ORDERS
    # ========================================================

    total_purchase_orders = ( database.query( func.count( db.PurchaseOrder.id ) ) .scalar() )

    total_purchase_orders = (
        total_purchase_orders
        if total_purchase_orders is not None
        else 0
    )

    # ========================================================
    # 5. TOTAL PROCUREMENT SPEND
    # ========================================================

    total_spend = ( database.query( func.sum( db.PurchaseOrder.amount ) ) .scalar() )

    total_spend = (
        float(total_spend)
        if total_spend is not None
        else 0.0
    )

    # ========================================================
    # 6. PENDING PURCHASE ORDERS
    # ========================================================

    pending_approvals = ( database.query(db.PurchaseOrder) .filter( db.PurchaseOrder.status.ilike( "%pending%" ) ) .count() )

    # ========================================================
    # 7. CONTRACT ALERTS
    # ========================================================
    # If you have a Contract model, you can replace this
    # with the actual expiry calculation.
    # For now this is safely returned as 0.
    # ========================================================

    contract_alerts = 0

    # ========================================================
    # 8. COMPLIANCE SCORE
    # ========================================================
    # Calculated from vendors having reliability >= 70.
    # You can later replace this with your actual
    # compliance table/logic.
    # ========================================================

    compliance_vendors = ( database.query(db.Vendor) .filter( db.Vendor.reliability_score >= 70 ) .count() )

    if total_vendors > 0:
        compliance_score = ( compliance_vendors / total_vendors ) * 100

    else:
        compliance_score = 0

    # ========================================================
    # 9. MONTHLY SPEND TREND
    # ========================================================

    spend_trend = []

    months = [ ("Jan", 1), ("Feb", 2), ("Mar", 3), ("Apr", 4), ("May", 5), ("Jun", 6), ("July", 7), ("Aug", 8), ("Sep", 9), ("Oct", 10), ("Nov", 11), ("Dec", 12) ]

    for month_name, month_number in months:

        monthly_spend = ( database.query( func.sum( db.PurchaseOrder.amount ) ) .filter( extract( "month", db.PurchaseOrder.order_date ) == month_number ) .scalar() )

        monthly_spend = (
            float(monthly_spend)
            if monthly_spend is not None
            else 0.0
        )

        # ----------------------------------------------------
        # Budget
        # ----------------------------------------------------
        # Currently budget is estimated at 85% of actual.
        # If you have a Budget table, replace this value
        # with the real budget.

        monthly_budget = ( monthly_spend * 0.85 )

        spend_trend.append( { "month": month_name, "actual": monthly_spend, "budget": monthly_budget } )

    # ========================================================
    # 10. RETURN HOME PAGE DATA
    # ========================================================
    return {

        # ----------------------------------------------------
        # Main KPI
        # ----------------------------------------------------
        "total_vendors":total_vendors,

        "total_purchase_orders": total_purchase_orders,

        "total_spend": round( total_spend, 2 ),

        "average_reliability": round( average_reliability, 2 ),

        # ----------------------------------------------------
        # Homepage cards
        # ----------------------------------------------------
        "contract_alerts": contract_alerts,

        "pending_approvals": pending_approvals,

        "compliance_score": round( compliance_score, 2 ),

        # ----------------------------------------------------
        # Reliability donut
        # ----------------------------------------------------
        "reliability_distribution": {
            "excellent": excellent,
            "good": good,
            "average": average,
            "poor": poor,
            "critical": critical
        },

        # ----------------------------------------------------
        # Procurement spend chart
        # ----------------------------------------------------
        "spend_trend": spend_trend
    }


# ==========================================================
# FORGET AND RESET PASSWORD
# ==========================================================

@app.get("/ForgetPassword", response_class=HTMLResponse, tags=["Reset Password"])
def forget_password_page(request:Request):
    return templates.TemplateResponse(
            request=request,
            name="ForgetPassword.html",
            context={ "request": request }
        )


# ============================================================
# SEND OTP
# ============================================================

@app.post(
    "/api/password-reset/send-otp",
    tags=["Password Reset"]
)
def send_password_reset_otp(
    request: db.SendOTPRequest,
    database: Session = Depends(db.get_db)
):

    account = crud.get_reset_account(
        request.account_type,
        request.identifier,
        request.mobile,
        database
    )

    account_type = account["account_type"]
    mobile = account["mobile"]

    # --------------------------------------------------------
    # CHECK RECENT OTP
    # --------------------------------------------------------

    one_minute_ago = (
        datetime.utcnow()
        - timedelta(seconds=60)
    )

    identity_filter = crud.get_otp_identity_filter(
        account_type,
        mobile
    )

    recent_otp = (
        database.query(db.PasswordResetOTP)
        .filter(
            identity_filter,
            db.PasswordResetOTP.created_at >= one_minute_ago
        )
        .order_by(
            db.PasswordResetOTP.created_at.desc()
        )
        .first()
    )

    if recent_otp:

        raise HTTPException(
            status_code=429,
            detail=(
                "Please wait 60 seconds before "
                "requesting another OTP."
            )
        )

    # --------------------------------------------------------
    # DELETE OLD ACTIVE OTPs
    #
    # Do NOT mark old OTPs as verified.
    # Verified must mean genuinely verified.
    # --------------------------------------------------------

    old_otps = (
        database.query(db.PasswordResetOTP)
        .filter(
            identity_filter,
            db.PasswordResetOTP.verified == False
        )
        .all()
    )

    for old_otp in old_otps:
        database.delete(old_otp)

    database.flush()

    # --------------------------------------------------------
    # GENERATE OTP
    # --------------------------------------------------------

    otp = str(
        random.SystemRandom().randint(
            100000,
            999999
        )
    )

    # --------------------------------------------------------
    # HASH OTP
    # --------------------------------------------------------

    otp_hash = db.hash_otp(otp)

    # --------------------------------------------------------
    # EXPIRATION
    # --------------------------------------------------------

    now = datetime.utcnow()

    expires_at = (
        now + timedelta(minutes=5)
    )

    # --------------------------------------------------------
    # CREATE OTP RECORD
    # --------------------------------------------------------

    if account_type == "user":

        otp_record = db.PasswordResetOTP(
            user_mobile=mobile,
            vendor_phone=None,
            otp_hash=otp_hash,
            expires_at=expires_at,
            verified=False,
            attempts=0,
            created_at=now
        )

    else:

        otp_record = db.PasswordResetOTP(
            user_mobile=None,
            vendor_phone=mobile,
            otp_hash=otp_hash,
            expires_at=expires_at,
            verified=False,
            attempts=0,
            created_at=now
        )

    database.add(otp_record)
    database.commit()
    database.refresh(otp_record)

    # --------------------------------------------------------
    # SEND SMS
    # --------------------------------------------------------

    try:

        crud.send_sms(
            mobile,
            otp
        )

    except Exception:

        database.delete(otp_record)
        database.commit()

        raise HTTPException(
            status_code=500,
            detail="Unable to send OTP."
        )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    masked_mobile = (
        "*" * max(0, len(mobile) - 4)
        + mobile[-4:]
    )

    return {
        "success": True,
        "account_type": account_type,
        "message": (
            "OTP has been sent to your "
            "registered mobile number."
        ),
        "masked_mobile": masked_mobile,
        "expires_in": 300
    }


# ============================================================
# VERIFY OTP
# ============================================================

@app.post(
    "/api/password-reset/verify-otp",
    tags=["Password Reset"]
)
def verify_password_reset_otp(
    request: db.VerifyOTPRequest,
    database: Session = Depends(db.get_db)
):

    account = crud.get_reset_account(
        request.account_type,
        request.identifier,
        request.mobile,
        database
    )

    account_type = account["account_type"]
    mobile = account["mobile"]

    # --------------------------------------------------------
    # FIND LATEST UNVERIFIED OTP
    # --------------------------------------------------------

    identity_filter = crud.get_otp_identity_filter(
        account_type,
        mobile
    )

    otp_record = (
        database.query(db.PasswordResetOTP)
        .filter(
            identity_filter,
            db.PasswordResetOTP.verified == False
        )
        .order_by(
            db.PasswordResetOTP.created_at.desc()
        )
        .first()
    )

    if not otp_record:

        raise HTTPException(
            status_code=400,
            detail=(
                "No active OTP was found. "
                "Please request a new OTP."
            )
        )

    # --------------------------------------------------------
    # CHECK EXPIRATION
    # --------------------------------------------------------

    if datetime.utcnow() > otp_record.expires_at:

        database.delete(otp_record)
        database.commit()

        raise HTTPException(
            status_code=400,
            detail=(
                "OTP has expired. "
                "Please request a new OTP."
            )
        )

    # --------------------------------------------------------
    # CHECK ATTEMPTS
    # --------------------------------------------------------

    if otp_record.attempts >= 5:

        database.delete(otp_record)
        database.commit()

        raise HTTPException(
            status_code=400,
            detail=(
                "Maximum OTP attempts exceeded. "
                "Please request a new OTP."
            )
        )

    # --------------------------------------------------------
    # VERIFY OTP
    # --------------------------------------------------------

    is_valid = db.verify_otp(
        request.otp,
        otp_record.otp_hash
    )

    if not is_valid:

        otp_record.attempts += 1

        database.commit()

        remaining = (
            5 - otp_record.attempts
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid OTP. "
                f"{remaining} attempts remaining."
            )
        )

    # --------------------------------------------------------
    # MARK OTP VERIFIED
    # --------------------------------------------------------

    otp_record.verified = True
    otp_record.verified_at = datetime.utcnow()

    database.commit()

    return {
        "success": True,
        "account_type": account_type,
        "message": "OTP verified successfully."
    }


# ============================================================
# RESET PASSWORD
# ============================================================

@app.post(
    "/api/password-reset/reset-password",
    tags=["Password Reset"]
)
def reset_password(
    request: db.ResetPasswordRequest,
    database: Session = Depends(db.get_db)
):

    account = crud.get_reset_account(
        request.account_type,
        request.identifier,
        request.mobile,
        database
    )

    account_type = account["account_type"]
    account_object = account["account"]
    mobile = account["mobile"]

    # --------------------------------------------------------
    # PASSWORD VALIDATION
    # --------------------------------------------------------

    password = request.new_password

    if len(password) < 8:

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must contain at least "
                "8 characters."
            )
        )

    if not any(
        character.isupper()
        for character in password
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must contain at least "
                "one uppercase letter."
            )
        )

    if not any(
        character.islower()
        for character in password
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must contain at least "
                "one lowercase letter."
            )
        )

    if not any(
        character.isdigit()
        for character in password
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must contain at least "
                "one number."
            )
        )

    # --------------------------------------------------------
    # FIND VERIFIED OTP
    # --------------------------------------------------------

    identity_filter = crud.get_otp_identity_filter(
        account_type,
        mobile
    )

    otp_record = (
        database.query(db.PasswordResetOTP)
        .filter(
            identity_filter,
            db.PasswordResetOTP.verified == True,
            db.PasswordResetOTP.verified_at.isnot(None)
        )
        .order_by(
            db.PasswordResetOTP.verified_at.desc()
        )
        .first()
    )

    if not otp_record:

        raise HTTPException(
            status_code=400,
            detail=(
                "Please verify the OTP before "
                "resetting your password."
            )
        )

    # --------------------------------------------------------
    # CHECK VERIFIED OTP EXPIRATION
    # --------------------------------------------------------

    if datetime.utcnow() > otp_record.expires_at:

        database.delete(otp_record)
        database.commit()

        raise HTTPException(
            status_code=400,
            detail=(
                "The OTP verification has expired. "
                "Please request a new OTP."
            )
        )

    # --------------------------------------------------------
    # HASH NEW PASSWORD
    # --------------------------------------------------------

    new_password_hash = db.hash_password(
        password
    )

    # --------------------------------------------------------
    # UPDATE USER PASSWORD
    # --------------------------------------------------------

    if account_type == "user":

        account_object.hashed_password = (
            new_password_hash
        )

    # --------------------------------------------------------
    # UPDATE VENDOR PASSWORD
    # --------------------------------------------------------

    else:

        account_object.hashed_password = (
            new_password_hash
        )

    # --------------------------------------------------------
    # CONSUME VERIFIED OTP
    # --------------------------------------------------------

    database.delete(otp_record)

    # --------------------------------------------------------
    # COMMIT
    # --------------------------------------------------------

    try:

        database.commit()

    except Exception:

        database.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to update the password. "
                "Please try again."
            )
        )

    return {
        "success": True,
        "account_type": account_type,
        "message": (
            "Password reset successfully. "
            "You can now log in with your new password."
        )
    }


# ============================================================
# LOGIN PAGE
# ============================================================

@app.get( "/login", response_class=HTMLResponse, tags=["Login"], )
def login_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="Login Page.html",
        context={ "request": request }
    )


# ============================================================
# REGISTRATION PAGES
# ============================================================

@app.get("/register_vendor", tags=["Vendor Registration"])
def vendor_registration_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="Registration Form.html",
        context={ "request": request }
    )


@app.get( "/register", response_class=HTMLResponse, tags=["User Registration"], )
def register_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="UserRegistration.html",
        context={ "request": request }
    )


# ============================================================
# ADMIN DASHBOARD HTML PAGES
# ============================================================
@app.get( "/AdminDashboard.html", response_class=HTMLResponse, tags=["Admin Dashboard Pages"], )
def admin_dashboard_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AdminDashboard.html",
        context={ "request": request }
    )


# ==========================================================
# ADMIN PROFILE PAGE
# ==========================================================

@app.get( "/admin/profile", response_class=HTMLResponse, tags=["Admin Profile Pages"] )
def admin_profile_page(request:Request):
    return templates.TemplateResponse(
        request=request,
        name="AdminProfile.html",
        context={
            "request": request
        }
    )


@app.get( "/admin/profile/edit", response_class=HTMLResponse, tags=["Admin Profile Pages"] )
def edit_admin_profile_page(request:Request):
    return templates.TemplateResponse(
            request=request,
            name="EditAdminProfile.html",
            context={
                "request": request
            }
        )


# ==========================================================
# USER MANAGEMENT PAGE
# ==========================================================

@app.get( "/UserManagement", response_class=HTMLResponse, tags=["Admin Dashbaord Pages"] )
def user_management_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="UserManagement.html",
        context={ "request": request }
    )


@app.get( "/UserEdit", response_class=HTMLResponse, tags=["Admin Dashbaord Pages"] )
def user_edit_page( request: Request ):
    return templates.TemplateResponse(
        request=request,
        name="EditUser.html",
        context={ "request": request }
    )


# ==========================================================
# VENDOR MANAGEMENT
# ==========================================================

@app.get( "/VendorManagement", response_class=HTMLResponse, tags=["Admin Dashbaord Pages"], )
def vendor_management_page(request: Request):
    return templates.TemplateResponse( 
        request=request, 
        name="VendorManagement.html", 
        context={ "request": request } 
    )


@app.get( "/admin/add-vendor", response_class=HTMLResponse, tags=["Admin Dashbaord Pages"] )
def admin_add_vendor_page( request: Request ):
    return templates.TemplateResponse( "AdminAddVendor.html", { "request": request } )


# ==========================================================
# EDIT VENDOR PAGE
# ==========================================================
@app.get( "/admin/vendors/{vendor_id}/edit", response_class=HTMLResponse, tags=["Admin Dashbaord Pages"] )
def edit_vendor_page( request: Request, vendor_id: str ):
    return templates.TemplateResponse( 
        "EditVendor.html", 
        { 
            "request": request, 
            "vendor_id": vendor_id 
        } 
    )


# ==========================================================
# PROCUREMENT OVERVIEW
# ==========================================================

@app.get( "/ProcurementOverview", response_class=HTMLResponse, tags=["Admin Dashbaord Pages"] )
def procurement_overview_page( request: Request ):
    return templates.TemplateResponse(
        request=request,
        name="ProcurementOverview.html",
        context={ "request": request }
    )


# ==========================================================
# CONTRACTS AND COMPLIANCE
# ==========================================================

@app.get("/ContractCompliance", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def contract_compliance_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="ContractCompliance.html",
        context={"request": request}
    )


# ==========================================================
# INVOICES AND PAYMENTS
# ==========================================================

@app.get("/InvoicesPayments", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def invoices_payments_page(request:Request):
    return templates.TemplateResponse(
        request=request,
        name="InvoicesPayments.html",
        context={"request":request}
    )


# ==========================================================
# COMMUNICATION
# ==========================================================

@app.get("/Communication", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def communication_page(request:Request):
    return templates.TemplateResponse(
        request=request,
        name="Communication.html",
        context={"request":request}
    )


# ==========================================================
# PERFORMANCE ANALYTICS
# ==========================================================

@app.get("/PerformanceAnalytics", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def performance_analytics_page(request:Request):
    return templates.TemplateResponse(
        request=request,
        name="PerformanceAnalytics.html",
        context={"request":request}
    )


# ==========================================================
# REPORTS AND EXPORTS
# ==========================================================

@app.get("/ReportsExports", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def reports_exports_page(request:Request):
    return templates.TemplateResponse(
        request=request,
        name="ReportsExports.html",
        context={"request":request}
    )


# ==========================================================
# NOTIFICATIONS
# ==========================================================

@app.get("/Notifications", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def notifications_page(request:Request):
    return templates.TemplateResponse(
        request=request,
        name="Notifications.html",
        context={"request":request}
    )


@app.get("/NotificationSettings", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def notificationsettings_page(request:Request):
    return templates.TemplateResponse(
        request=request,
        name="NotificationSettings.html",
        context={"request":request}
    )


@app.get("/EmailTemplates", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def emailtemplates_page(request:Request):
    return templates.TemplateResponse(
        request=request,
        name="EmailTemplates.html",
        context={"request":request}
    )


@app.get("/SMSTemplates", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def smstemplates_page(request:Request):
    return templates.TemplateResponse(
        request=request,
        name="SMSTemplates.html",
        context={"request":request}
    )


@app.get("/NotificationLogs", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def notificationlogs_page(request:Request):
    return templates.TemplateResponse(
        request=request,
        name="NotificationLogs.html",
        context={"request":request}
    )


# ==============================================================
# ROLES AND PERMISSIONS
# ==============================================================

@app.get("/RolesPermissions", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def roles_permissions_page(request:Request):
    return templates.TemplateResponse(
        request=request,
        name="RolesPermissions.html",
        context={"request":request}
    )


# ==============================================================
# SYSTEM SETTINGS
# ==============================================================

@app.get("/SystemSettings", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def system_settings_page(request:Request):
    return templates.TemplateResponse(
        request=request,
        name="SystemSettings.html",
        context={"request":request}
    )


# ==============================================================
# AUDIT LOGS
# ==============================================================

@app.get("/AuditLogs", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def audit_logs_page(request:Request):
    return templates.TemplateResponse(
        request=request,
        name="AuditLogs.html",
        context={"request":request}
    )


# ==============================================================
# DATA MANAGEMENT
# ==============================================================

@app.get("/DataManagement", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def data_management_page(request:Request):
    return templates.TemplateResponse(
        request=request,
        name="DataManagement.html",
        context={"request":request}
    )


# ==========================================================
# PERFORMANCE MIDDLEWARE
# ==========================================================

@app.middleware("http")
async def performance_middleware( request: Request, call_next ):

    start = time.perf_counter()

    crud.register_request_start()

    try:

        response = await call_next( request )

        return response

    finally:

        elapsed = ( time.perf_counter() - start )

        crud.record_response_time( elapsed * 1000 )

        crud.register_request_end()


# ===========================================================
# SYSTEM HEALTH
# ===========================================================

@app.get("/SystemHealth", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def system_health_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="SystemHealth.html",
        context={"request":request}
    )


# ===========================================================
# HELP & SUPPORT
# ===========================================================

@app.get("/HelpSupport", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def help_support_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="HelpSupport.html",
        context={"request":request}
    )


# ===========================================================
# FEEDBACK
# ===========================================================

@app.get("/Feedback", response_class=HTMLResponse, tags=["Admin Dashboard Pages"])
def feedback_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="Feedback.html",
        context={"request":request}
    )


# ==============================================================
# MANAGER DASHBOARD HTML PAGES
# ==============================================================

@app.get( "/ManagerDashboard", response_class=HTMLResponse, tags=["Manager Dashboard Pages"] )
def manager_dashboard_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="ProcurementDashboard.html",
        context={ "request": request }
    )


@app.get( "/ProcurementRequests", response_class=HTMLResponse, tags=["Manager Dashboard Pages"] )
def procurement_requests_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="ProcurementRequests.html",
        context={ "request": request }
    )


@app.get( "/ProcurementPurchaseOrder", response_class=HTMLResponse, tags=["Manager Dashboard Pages"] )
def procurement_purchase_order_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="ProcurementPurchaseOrder.html",
        context={ "request": request }
    )


@app.get( "/ProcurementApprovals", response_class=HTMLResponse, tags=["Manager Dashboard Pages"] )
def procurement_approvals_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="Approvals.html",
        context={ "request": request }
    )


@app.get( "/ProcurementVendors", response_class=HTMLResponse, tags=["Manager Dashboard Pages"] )
def procurement_vendors_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="ProcurementVendors.html",
        context={ "request": request }
    )


@app.get( "/OrderTracking", response_class=HTMLResponse, tags=["Manager Dashboard Pages"] )
def orders_tracking_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="OrderTracking.html",
        context={ "request": request }
    )


@app.get( "/ProcurementInvoices", response_class=HTMLResponse, tags=["Manager Dashboard Pages"] )
def procurement_invoices_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="ProcurementInvoices.html",
        context={ "request": request }
    )


@app.get( "/ProcurementReports", response_class=HTMLResponse, tags=["Manager Dashboard Pages"] )
def procurement_reports_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="ProcurementReports.html",
        context={ "request": request }
    )


@app.get( "/ProcurementAnalytics", response_class=HTMLResponse, tags=["Manager Dashboard Pages"] )
def procurement_analytics_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="ProcurementAnalytics.html",
        context={ "request": request }
    )


@app.get( "/ProcurementNotifications", response_class=HTMLResponse, tags=["Manager Dashboard Pages"] )
def procurement_notifications_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="ProcurementNotifications.html",
        context={ "request": request }
    )


@app.get( "/Messages", response_class=HTMLResponse, tags=["Manager Dashboard Pages"] )
def procurement_messages_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="Messages.html",
        context={ "request": request }
    )


@app.get( "/ProcurementHelpSupport", response_class=HTMLResponse, tags=["Manager Dashboard Pages"] )
def procurement_help_support_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="ProcurementHelpSupport.html",
        context={ "request": request }
    )


@app.get( "/ProcurementSettings", response_class=HTMLResponse, tags=["Manager Dashboard Pages"] )
def procurement_settings_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="ProcurementSettings.html",
        context={ "request": request }
    )


@app.get("/ProcurementProfile", response_class=HTMLResponse, tags=["Manager Profile"])
def procurement_profile_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="ProcurementProfile.html",
        context={ "request": request }
    )


# ==============================================================
# SUPPLY CHAIN MANAGER HTML PAGES
# ==============================================================

@app.get("/supplychaindashboard", response_class=HTMLResponse, tags=["Supply Chain Dashboard Pages"])
def supplychain_dashboard_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="SupplyChainDashboard.html",
        context={ "request":request }
    )


@app.get("/demand-planning", response_class=HTMLResponse, tags=["Supply Chain Dashboard Pages"])
def supplychain_demandplanning_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="SupplyChainDemandPlanning.html",
        context={ "request":request }
    )


@app.get("/supplychainprocurement", response_class=HTMLResponse, tags=["Supply Chain Dashboard Pages"])
def supplychain_procurement_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="SupplyChainProcurement.html",
        context={ "request":request }
    )


@app.get("/suppliers", response_class=HTMLResponse, tags=["Supply Chain Dashboard Pages"])
def suppliers_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="Suppliers.html",
        context={ "request":request }
    )


@app.get("/inventory", response_class=HTMLResponse, tags=["Supply Chain Dashboard Pages"])
def inventory_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="SupplyChainInventory.html",
        context={ "request":request }
    )


@app.get("/ordersshipments", response_class=HTMLResponse, tags=["Supply Chain Dashboard Pages"])
def orders_shipment_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="OrdersShipments.html",
        context={ "request":request }
    )


@app.get("/warehouses", response_class=HTMLResponse, tags=["Supply Chain Dashboard Pages"])
def warehouses_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="Warehouse.html",
        context={ "request":request }
    )


@app.get("/transportation", response_class=HTMLResponse, tags=["Supply Chain Dashboard Pages"])
def transportation_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="Transportation.html",
        context={ "request":request }
    )


@app.get("/analyticsreports", response_class=HTMLResponse, tags=["Supply Chain Dashboard Pages"])
def analytics_reports_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AnalyticsReports.html",
        context={ "request":request }
    )


@app.get("/alertsnotifications", response_class=HTMLResponse, tags=["Supply Chain Dashboard Pages"])
def alerts_notifications_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AlertsNotifications.html",
        context={ "request":request }
    )


@app.get("/documents", response_class=HTMLResponse, tags=["Supply Chain Dashboard Pages"])
def documents_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="Documents.html",
        context={ "request":request }
    )


@app.get("/supplychainsettings", response_class=HTMLResponse, tags=["Supply Chain Dashboard Pages"])
def settings_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="SupplyChainSettings.html",
        context={ "request":request }
    )


@app.get("/CreatePurchaseOrder", response_class=HTMLResponse, tags=["Supply Chain Dashboard Pages"])
def create_purchase_order_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="CreatePurchaseOrders.html",
        context={ "request":request }
    )


@app.get("/AddSupplier", response_class=HTMLResponse, tags=["Supply Chain Dashboard Pages"])
def add_supplier_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AddSupplier.html",
        context={ "request":request }
    )


@app.get("/CreateShipment", response_class=HTMLResponse, tags=["Supply Chain Dashboard Pages"])
def create_shipment_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="CreateShipment.html",
        context={ "request":request }
    )


@app.get("/UploadDocument", response_class=HTMLResponse, tags=["Supply Chain Dashboard Pages"])
def upload_document_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="UploadDocument.html",
        context={ "request":request }
    )


# ============================================================
# SUPPLY CHAIN COMMUNICATION PAGE
# ============================================================

@app.get("/SupplyChainCommunication", response_class=HTMLResponse, tags=["Supply Chain Communication"])
def supply_chain_communication_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="SupplyChainCommunication.html",
        context={
            "request": request
        }
    )


@app.get("/SupplyChainProfile", response_class=HTMLResponse, tags=["Supply Chain Profile"])
def supply_chain_profile(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="SupplyChainProfile.html",
        context={ "request":request }
    )


# ==============================================================
# FINANCER DASHBOARD HTML PAGES
# ==============================================================

@app.get( "/financerdashboard", response_class=HTMLResponse, tags=["Financer Dashboard Pages"], )
def financer_dashboard_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="FinancerDashboard.html",
        context={ "request": request }
    )


@app.get("/BudgetManagement", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def financer_budget_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="BudgetManagement.html",
        context={ "request": request }
    )


@app.get("/Expenditure", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def financer_expenditure_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="Expenditure.html",
        context={ "request": request }
    )


@app.get("/Revenue", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def financer_revenue_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="Revenue.html",
        context={ "request": request }
    )


@app.get("/AccountsPayable", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def financer_accounts_payable_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AccountsPayable.html",
        context={ "request": request }
    )


@app.get("/AccountsPayable/CreateBill", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def create_bill_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="CreateBill.html",
        context={ "request": request }
    )


@app.get("/AccountsPayable/RecordPayment", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def record_payment_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="RecordPayment.html",
        context={ "request": request }
    )


@app.get("/AccountsPayable/VendorPayments", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def vendor_payments_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="VendorPayments.html",
        context={ "request": request }
    )


@app.get("/AccountsReceivable", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def financer_accounts_receivable_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AccountsReceivable.html",
        context={ "request": request }
    )


@app.get("/AccountsReceivable/CreateInvoice", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def create_invoice_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="CreateInvoice.html",
        context={ "request": request }
    )


@app.get("/AccountsReceivable/CustomerStatements", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def customer_statement_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="CustomerStatements.html",
        context={ "request": request }
    )


@app.get("/AccountsReceivable/OverdueInvoices", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def overdue_invoice_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="OverDueInvoices.html",
        context={ "request": request }
    )


@app.get("/AccountsReceivable/Agingreport", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def aging_report_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AgingReport.html",
        context={ "request": request }
    )


@app.get("/BankingReconciliation", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def financer_banking_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="BankingReconciliation.html",
        context={ "request": request }
    )


@app.get("/FinancialReports", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def financial_reports_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="FinancialReports.html",
        context={ "request": request }
    )


@app.get("/Compliance", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def financer_compliance_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="Compliance.html",
        context={ "request": request }
    )


@app.get("/FinancerApprovals", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def financer_approvals_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="FinancerApprovals.html",
        context={ "request": request }
    )


@app.get("/FinanceRequests", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def finance_requests_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="FinanceRequests.html",
        context={"request": request}
    )


@app.get("/FinanceApprovalRequests", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def finance_approval_requests_page( request: Request ):
    return templates.TemplateResponse(
        request=request,
        name="FinanceApprovalRequests.html",
        context={"request": request}
    )


@app.get("/ApprovalDelegation", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def approval_delegation_page( request: Request ):
    return templates.TemplateResponse(
        request=request,
        name="ApprovalDelegation.html",
        context={"request": request}
    )


@app.get("/ApprovalWorkflow", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def approval_workflow_page( request: Request ):
    return templates.TemplateResponse(
        request=request,
        name="ApprovalWorkflow.html",
        context={"request": request}
    )


@app.get("/FinanceApprovalActivity", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def finance_approval_activity_page( request: Request ):
    return templates.TemplateResponse(
        request=request,
        name="FinanceApprovalActivity.html",
        context = {"request": request}
    )


@app.get("/FinancerNotifications", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def financer_notifications_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="FinancerNotifications.html",
        context={ "request": request }
    )


# ============================================================
# FINANCE COMMUNICATION PAGE
# ============================================================

@app.get("/FinanceCommunication", tags=["Finance Communication"])
def finance_communication_page(
    request: Request
):
    return templates.TemplateResponse(
        request=request,
        name="FinanceCommunication.html",
        context={ "request": request }
    )


@app.get("/FinancerDocument", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def financer_document_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="FinancerDocument.html",
        context={ "request": request }
    )


@app.get("/FinancerSettings", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def financer_settings_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="Settings.html",
        context={ "request": request }
    )


@app.get("/FinancerHelp", response_class=HTMLResponse, tags=["Financer Dashboard Pages"])
def financer_help_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="FinancerHelp.html",
        context={ "request": request }
    )


# ==============================================================
# AUDITOR DASHBOARD HTML PAGES
# ==============================================================

@app.get("/AuditorDashboard", response_class=HTMLResponse, tags=["Auditor Dashboard Pages"])
def auditor_dashboard_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AuditorDashboard.html",
        context={ "request": request }
    )


@app.get("/AuditAssignments", response_class=HTMLResponse, tags=["Auditor Dashboard Pages"])
def audit_assignments_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AuditAssignments.html",
        context={ "request": request }
    )


@app.get("/PlanningRisk", response_class=HTMLResponse, tags=["Auditor Dashboard Pages"])
def planning_risk_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="PlanningRisk.html",
        context={ "request": request }
    )


@app.get("/AuditsInProgress", response_class=HTMLResponse, tags=["Auditor Dashboard Pages"])
def audits_in_progress_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AuditsInProgress.html",
        context={ "request": request }
    )


@app.get("/EvidenceDocuments", response_class=HTMLResponse, tags=["Auditor Dashboard Pages"])
def evidence_documents_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="EvidenceDocuments.html",
        context={ "request": request }
    )


@app.get("/IssuesFindings", response_class=HTMLResponse, tags=["Auditor Dashboard Pages"])
def issues_findings_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="IssuesFindings.html",
        context={ "request": request }
    )


@app.get("/AuditorReports", response_class=HTMLResponse, tags=["Auditor Dashboard Pages"])
def auditor_reports_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AuditorReports.html",
        context={ "request": request }
    )


@app.get("/ComplianceTracker", response_class=HTMLResponse, tags=["Auditor Dashboard Pages"])
def compliance_tracker_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="ComplianceTracker.html",
        context={ "request": request }
    )


@app.get("/Recommendations", response_class=HTMLResponse, tags=["Auditor Dashboard Pages"])
def recommendations_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="Recommendations.html",
        context={ "request": request }
    )


@app.get("/AuditorAnalytics", response_class=HTMLResponse, tags=["Auditor Dashboard Pages"])
def auditor_analytics_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AuditorAnalytics.html",
        context={ "request": request }
    )


@app.get("/Calendar", response_class=HTMLResponse, tags=["Auditor Dashboard Pages"])
def auditor_calendar_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AuditorCalendar.html",
        context={ "request": request }
    )


@app.get("/AuditorNotifications", response_class=HTMLResponse, tags=["Auditor Dashboard Pages"])
def auditor_notifications_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AuditorNotifications.html",
        context={ "request": request }
    )


@app.get("/AuditorMessages", response_class=HTMLResponse, tags=["Auditor Dashboard Pages"])
def auditor_messages_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AuditorMessages.html",
        context={ "request": request }
    )


@app.get("/AuditorSettings", response_class=HTMLResponse, tags=["Auditor Dashboard Pages"])
def auditor_settings_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AuditorSettings.html",
        context={ "request": request }
    )


@app.get("/AuditorHelp", response_class=HTMLResponse, tags=["Auditor Dashboard Pages"])
def auditor_help_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="AuditorHelp.html",
        context={ "request": request }
    )


# ==============================================================
# VENDOR DASHBOARD HTML PAGES
# ==============================================================

@app.get("/VendorDashboard", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"],)
def vendor_dashboard_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="VendorDashboard.html",
        context={
            "request": request
        }
    )


@app.get("/VendorProfile", response_class=HTMLResponse, tags=["Vendor Profile"],)
def vendor_profile(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="VendorProfile.html",
        context={
            "request": request
        }
    )


@app.get("/EditVendorProfile", response_class=HTMLResponse, tags=["Vendor Profile"],)
def edit_vendor_profile(request: Request):
    return templates.TemplateResponse( 
        request=request, 
        name="EditVendorProfile.html", 
        context={ "request": request } 
    )


@app.get("/PerformanceOverview", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"],)
def performance_overview_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="PerformanceOverview.html",
        context={ "request": request }
    )


@app.get("/PurchaseOrders", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"],)
def purchase_orders_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="VendorPurchaseOrders.html",
        context={ "request": request }
    )


@app.get("/VendorContract", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"])
def vendor_contract_compliance_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="VendorContractCompliance.html",
        context={ "request": request }
    )


@app.get("/VendorInvoices",response_class=HTMLResponse, tags=["Vendor Dashboard Pages"])
def vendor_invoices_payments_page(request:Request):
    return templates.TemplateResponse(
        request=request,
        name="VendorInvoicesPayments.html",
        context={"request":request}
    )


@app.get( "/vendor/payment-history", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"] )
def payment_history_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="PaymentHistory.html",
        context={ "request": request }
    )


@app.get( "/vendor/upload-invoice", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"] )
def upload_invoice_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="VendorUploadInvoice.html",
        context={ "request": request }
    )


@app.get( "/vendor/payment-methods", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"] )
def payment_methods_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="PaymentMethods.html",
        context={ "request": request }
    )


@app.get("/vendor/upcomingpayments", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"])
def upcoming_payments_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="UpcomingPayments.html",
        context={ "request": request }
    )


@app.get("/VendorCommunication", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"])
def vendor_communication_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="VendorCommunication.html",
        context={ "request": request }
    )


@app.get("/VendorDocument", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"])
def vendor_document_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="VendorDocuments.html",
        context={ "request":request }
    )


@app.get("/VendorNotifications", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"])
def vendor_notifications_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="VendorNotifications.html",
        context={ "request":request }
    )


@app.get("/PerformanceReports", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"])
def performance_reports_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="PerformanceReports.html",
        context={ "request":request }
    )


@app.get("/OrderReports", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"])
def order_reports_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="OrderReports.html",
        context={ "request":request }
    )


@app.get("/ComplianceReports", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"])
def compliance_reports_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="VendorComplianceReports.html",
        context={ "request":request }
    )


@app.get("/ExportReports", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"])
def export_reports_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="ExportReports.html",
        context={ "request":request }
    )


@app.get("/VendorSettings", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"])
def vendor_settings_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="VendorSettings.html",
        context={ "request":request }
    )


@app.get("/VendorHelpSupport", response_class=HTMLResponse, tags=["Vendor Dashboard Pages"])
def vendor_helpsupport_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="VendorHelpSupport.html",
        context={ "request":request }
    )


# ============================================================
# HEALTH CHECK
# ============================================================
@app.get("/health", tags=["System"])
def health_check():
    return { "success": True, "status": "healthy", }


# ============================================================
# AUTHENTICATION OF LOGIN PAGES
# ============================================================

@app.post("/login", tags=["Login"])
def common_login(
    login_data: db.UserLogin,
    database: Session = Depends(db.get_db)
):

    login_id = str(login_data.username).strip()

    # ======================================================
    # FIRST CHECK USER TABLE USING EMAIL
    # ======================================================

    user = (
        database.query(db.User)
        .filter(
            db.User.email == login_id.lower()
        )
        .first()
    )

    # ======================================================
    # USER FOUND
    # ======================================================

    if user:

        if not user.active:
            raise HTTPException(
                status_code=403,
                detail="Your account is inactive"
            )

        # Verify password
        if not db.verify_password(
            login_data.password,
            user.hashed_password
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # Update last login
        user.last_login = datetime.utcnow()
        database.commit()

        # Create token
        access_token = db.create_access_token(
            data={
                "sub": user.email,
                "user_id": user.id,
                "role": user.role
            },
            expires_delta=timedelta(hours=8)
        )

        return {
            "success": True,
            "message": "Login successful",
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }

    # ======================================================
    # USER NOT FOUND
    # CHECK VENDOR TABLE USING VENDOR ID
    # ======================================================

    vendor = (
        database.query(db.Vendor)
        .filter(
            db.Vendor.vendor_id == login_id
        )
        .first()
    )

    # ======================================================
    # VENDOR FOUND
    # ======================================================

    if vendor:

        # Optional: Check vendor active status
        if hasattr(vendor, "active") and not vendor.active:
            raise HTTPException(
                status_code=403,
                detail="Your vendor account is inactive"
            )

        # Verify password
        if not db.verify_password(
            login_data.password,
            vendor.hashed_password
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid Vendor ID or password"
            )

        # Create vendor token
        access_token = db.create_access_token(
            data={
                "sub": vendor.vendor_id,
                "vendor_id": vendor.vendor_id,
                "role": "vendor"
            },
            expires_delta=timedelta(hours=8)
        )

        return {
            "success": True,
            "message": "Vendor login successful",
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": vendor.vendor_id,
            "vendor_id": vendor.vendor_id,
            "name": vendor.vendor_name,
            "email": vendor.email,
            "role": "vendor"
        }

    # ======================================================
    # NO USER OR VENDOR FOUND
    # ======================================================

    raise HTTPException(
        status_code=401,
        detail="Invalid credentials"
    )


@app.post("/adminlogin")
def adminlogin(
    form_data: OAuth2PasswordRequestForm = Depends(),
    database: Session = Depends(db.get_db)
):
    user = database.query(db.User).filter(
        db.User.email == form_data.username
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not db.verify_password(
        form_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = db.create_access_token(
        data={
            "sub": user.email,
            "role": user.role
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@app.get("/settings", tags=["System"])
def settings(
    current_user: db.User = Depends(crud.is_active_user),
):
    return {
        "success": True,
        "user_id": current_user.id,
        "message": "Settings endpoint available.",
    }

# ==========================================================
# USER REGISTRATION
# ==========================================================

@app.post( "/register", status_code=status.HTTP_201_CREATED, tags=["User Registration"] )
def register_user( user_data: db.UserRegister, database: Session = Depends(db.get_db) ):

    # ----------------------------------------
    # 1. Validate password confirmation
    # ----------------------------------------

    if user_data.password != user_data.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match"
        )

    # ----------------------------------------
    # 2. Check email
    # ----------------------------------------

    existing_email = (
        database.query(db.User)
        .filter(
            db.User.email == user_data.email
        )
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered"
        )

    # ----------------------------------------
    # 3. Check mobile
    # ----------------------------------------

    if user_data.mobile:

        existing_mobile = (
            database.query(db.User)
            .filter(
                db.User.mobile == user_data.mobile
            )
            .first()
        )

        if existing_mobile:
            raise HTTPException(
                status_code=409,
                detail="Mobile number is already registered"
            )

    # ----------------------------------------
    # 4. Hash password
    # ----------------------------------------

    hashed_password = db.hash_password(
        user_data.password
    )

    # ----------------------------------------
    # 5. Create user
    # ----------------------------------------

    new_user = db.User(
        name=user_data.name.strip(),

        email=str(user_data.email).lower().strip(),

        mobile=user_data.mobile,

        gender=user_data.gender,

        role=user_data.role,

        hashed_password=hashed_password,

        address=user_data.address,

        active=True
    )

    # ----------------------------------------
    # 6. Save to PostgreSQL
    # ----------------------------------------

    try:

        database.add(new_user)

        database.commit()

        database.refresh(new_user)

    except Exception:

        database.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to create user"
        )

    # ----------------------------------------
    # 8. Response
    # ----------------------------------------

    return {
        "success": True,
        "message": "User registered successfully",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role
        }
    }


@app.post("/api/vendor/generate-id", tags=["Vendor Registration"])
def generate_vendor_registration_id(database: Session = Depends(db.get_db)):
    return {"success": True, "vendor_id": crud.generate_vendor_id(database), "message": "Vendor ID generated successfully."}


@app.post("/api/vendor/register", status_code=status.HTTP_201_CREATED, tags=["Vendor Registration"])
def register_vendor(vendor: db.VendorRegistration, database: Session = Depends(db.get_db)):
    return crud.register_vendor(database, vendor)


# ============================================================
# ADMIN USER CRUD
# ============================================================

@app.get("/api/admin/users", tags=["Users"])
def list_users(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_admin),
):
    users = database.query(db.User).all()

    return [
        {
            "id": user.id,
            "name": getattr(
                user,
                "name",
                getattr(user, "fullname", None),
            ),
            "email": getattr(user, "email", None),
            "username": getattr(user, "username", None),
            "role": getattr(user, "role", None),
            "active": getattr(user, "active", None),
            "created_at": getattr(user, "created_at", None),
        }
        for user in users
    ]


@app.post("/api/users", tags=["Users"])
def create_user(
    user: db.UserCreate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_admin),
):
    return crud.create_user(database, user)


@app.put("/api/users/{user_id}", tags=["Users"])
def update_user(
    user_id: int,
    user: db.UserCreate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_admin),
):
    updated = crud.update_user(
        database,
        user_id,
        user,
    )

    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return updated


@app.delete("/api/users/{user_id}", tags=["Users"])
def delete_user(
    user_id: int,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_admin),
):
    deleted = crud.delete_user(
        database,
        user_id,
    )

    if deleted is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return {
        "success": True,
        "message": "User deleted successfully.",
    }


# ============================================================
# ADMIN DASHBOARD
# ============================================================

@app.get("/admin/Dashboard", tags=["Admin Dashboard"])
def admin_dashboard(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_admin),
):
    """
    One API call for the complete Admin Dashboard.

    Contains:
      - KPI summary
      - vendor reliability analytics
      - procurement analytics
      - compliance analytics
      - invoice overview
      - system activity
    """
    pending_vendors = ( database.query(db.Vendor) .filter(db.Vendor.status.in_(["Pending", "Pending Approval"])) .order_by(db.Vendor.id.asc()) .all() )
    return {
        "success": True,
        "dashboard": "admin",
        "user": {
            "id": current_user.id,
            "name": getattr(
                current_user,
                "name",
                getattr(
                    current_user,
                    "fullname",
                    None
                ),
            ),
            "email": current_user.email,
            "role": current_user.role,
        },
        "summary": crud.dashboard_summary(database),
        "vendor_analytics": crud.vendor_dashboard(database),
        "procurement": crud.procurement_dashboard(database),
        "compliance": crud.compliance_dashboard(database),
        "invoice_overview": crud.invoice_overview(database),
        #"activity": crud.activity_dashboard(database),

        # ---------------------------------------------
        # NEW
        # ---------------------------------------------

        "pending_vendor_registrations": [
            {
                "id": vendor.id,
                "vendor_id": vendor.vendor_id,
                "vendor_name": vendor.vendor_name,
                "country": vendor.country,
                "email": vendor.email,
                "phone": vendor.phone,
                "business_type": vendor.business_type,
                "address": vendor.address,
                "category": vendor.category,
                "contact_person": vendor.contact_person,
                "status": vendor.status,
            }
            for vendor in pending_vendors
        ],
    }


@app.get("/api/admin/vendor-registrations", tags=["Admin Dashbaord"])
def get_pending_vendor_registrations( database: Session = Depends(db.get_db), current_user: db.User = Depends(crud.require_admin) ):
    vendors = ( database .query(db.Vendor) .filter( db.Vendor.status.in_([ "Pending", "Pending Approval" ]) ) .order_by(db.Vendor.id.asc()) .all() )
    return [
        {
            "id": v.id,
            "vendor_id": v.vendor_id,
            "vendor_name": v.vendor_name,
            "country": v.country,
            "email": v.email,
            "phone": v.phone,
            "business_type": v.business_type,
            "address": v.address,
            "category": v.category,
            "contact_person": v.contact_person,
            "status": v.status
        }
        for v in vendors
    ]


@app.put("/api/admin/vendor-registrations/{vendor_id}/approve", tags=["Admin Dashboard"])
def approve_vendor_registration(vendor_id: str, database: Session = Depends(db.get_db), current_user: db.User = Depends(crud.require_admin)):
    vendor = crud.get_vendor_by_vendor_id(database, vendor_id)
    if vendor is None: 
        raise HTTPException(status_code=404, detail="Vendor registration not found.")
    if vendor.status in {"Active", "Approved"}: 
        raise HTTPException(status_code=400, detail="Vendor is already approved.")
    if vendor.status in {"Blacklisted", "Rejected"}: 
        raise HTTPException(status_code=400, detail="Rejected vendor cannot be approved.")
    vendor.status = "Approved"
    vendor.approved_by = current_user.id
    database.commit()
    database.refresh(vendor)
    return {"success": True, "message": "Vendor approved successfully.", 
            "vendor_id": vendor.vendor_id, "status": vendor.status, "approved_by": vendor.approved_by}


@app.put("/api/admin/vendor-registrations/{vendor_id}/reject", tags=["Admin Dashboard"])
def reject_vendor_registration(vendor_id: str, database: Session = Depends(db.get_db), current_user: db.User = Depends(crud.require_admin)):
    vendor = crud.get_vendor_by_vendor_id(database, vendor_id)
    if vendor is None: 
        raise HTTPException(status_code=404, detail="Vendor registration not found.")
    if vendor.status in {"Active", "Approved"}: 
        raise HTTPException(status_code=400, detail="Approved vendor cannot be rejected.")
    if vendor.status in {"Blacklisted", "Rejected"}: 
        raise HTTPException(status_code=400, detail="Vendor is already rejected.")
    vendor.status = "Rejected"
    vendor.approved_by = current_user.id
    database.commit()
    database.refresh(vendor)
    return {"success": True, "message": "Vendor rejected successfully.", 
            "vendor_id": vendor.vendor_id, "status": vendor.status, "approved_by": vendor.approved_by}


# ==========================================================
# GET ADMIN PROFILE API
# ==========================================================
@app.get(
    "/adminprofile",
    response_model=db.AdminProfileResponse, tags=["Admin Profile"]
)
def get_admin_profile( database: Session = Depends(db.get_db), current_user: db.User = Depends(crud.get_current_user) ):

    user = ( database .query(db.User) .filter( db.User.id == current_user.id ) .first() )

    if user is None:
        raise HTTPException( status_code= status.HTTP_404_NOT_FOUND, detail= "Admin user not found." )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "mobile": user.mobile,
        "gender": user.gender,
        "address": user.address,
        "active": user.active,
        "role": user.role,
        "last_login": (
            user.last_login.isoformat()
            if user.last_login
            else None
        ),
        "created_at": (
            user.created_at.isoformat()
            if user.created_at
            else None
        )
    }


# ==========================================================
# UPDATE ADMIN PROFILE API
# ==========================================================
@app.put( "/api/admin/profile", response_model=db.AdminProfileResponse, tags=["Admin Profile"] )
def update_admin_profile( profile: db.AdminProfileUpdate, database: Session = Depends(db.get_db), current_user: db.User = Depends(crud.get_current_user) ):
    user = ( database .query(db.User) .filter( db.User.id == current_user.id ) .first() )

    if user is None:
        raise HTTPException( status_code= status.HTTP_404_NOT_FOUND, detail= "Admin user not found." )

    # ======================================================
    # EMAIL DUPLICATE CHECK
    # ======================================================
    existing_email = ( database .query(db.User) .filter( db.User.email == profile.email, db.User.id != user.id ) .first() )

    if existing_email:
        raise HTTPException( status_code= status.HTTP_409_CONFLICT, detail= "Email address is already registered." )

    # ======================================================
    # UPDATE BASIC INFORMATION
    # ======================================================
    user.name = profile.name.strip()
    user.email = str(profile.email).strip()
    user.mobile = profile.mobile
    user.gender = profile.gender
    user.address = profile.address
    user.active = profile.active

    # ======================================================
    # UPDATE PASSWORD
    # ======================================================
    if profile.new_password:
        if len(profile.new_password) < 8:
            raise HTTPException( status_code= status.HTTP_400_BAD_REQUEST, detail= "Password must contain at least 8 characters." )

        user.hashed_password = db.hash_password( profile.new_password)

    # ======================================================
    # SAVE
    # ======================================================
    database.commit()
    database.refresh(user)

    # ======================================================
    # RETURN
    # ======================================================
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "mobile": user.mobile,
        "gender": user.gender,
        "address": user.address,
        "active": user.active,
        "role": user.role,
        "last_login": crud.serialize_datetime( user.last_login ),
        "created_at": crud.serialize_datetime( user.created_at )
    }


# ==========================================================
# USER MANAGEMENT IN ADMIN DASHBOARD
# ==========================================================

@app.get("/api/admin/users/stats", tags=["Admin Dashbaord"])
def get_user_statistics(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_admin),
):

    try:

        total_users = (
            database.query(db.User)
            .count()
        )

        active_users = (
            database.query(db.User)
            .filter(
                db.User.active == True
            )
            .count()
        )

        inactive_users = (
            database.query(db.User)
            .filter(
                db.User.active == False
            )
            .count()
        )

        now = datetime.utcnow()

        month_start = datetime(
            now.year,
            now.month,
            1
        )

        new_this_month = (
            database.query(db.User)
            .filter(
                db.User.created_at >= month_start
            )
            .count()
        )

        return {

            "total_users": total_users,

            "active_users": active_users,

            "inactive_users": inactive_users,

            "new_this_month": new_this_month

        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Unable to load user statistics: {str(e)}"
        )


@app.get("/api/admin/userpage", tags=["Admin Dashbaord"])
def get_admin_users(
    search: str = Query("", description="Search users"),
    role: str = Query("", description="Filter by role"),
    status: str = Query("", description="Filter by status"),
    page: int = Query(1, ge=1),
    limit: int = Query(8, ge=1, le=100),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_admin),
):

    try:

        query = database.query(db.User)

        # ==============================================
        # SEARCH
        # ==============================================

        if search:

            search_value = f"%{search}%"

            query = query.filter(
                or_(
                    db.User.name.ilike(search_value),
                    db.User.email.ilike(search_value),
                    db.User.role.ilike(search_value)
                )
            )

        # ==============================================
        # ROLE FILTER
        # ==============================================

        if role:

            query = query.filter(
                db.User.role == role
            )

        # ==============================================
        # STATUS FILTER
        # ==============================================

        if status:

            if status.lower() == "active":

                query = query.filter(
                    db.User.active == True
                )

            elif status.lower() == "inactive":

                query = query.filter(
                    db.User.active == False
                )

        # ==============================================
        # TOTAL
        # ==============================================

        total = query.count()

        # ==============================================
        # PAGINATION
        # ==============================================

        pages = (
            (total + limit - 1) // limit
            if total > 0
            else 1
        )

        offset = (page - 1) * limit

        users = (
            query
            .order_by(db.User.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        # ==============================================
        # RESPONSE
        # ==============================================

        user_list = []

        for user in users:

            user_list.append({

                "id": user.id,

                "name": user.name,

                "email": user.email,

                "mobile": user.mobile,

                "gender": user.gender,

                "role": user.role,

                "address": user.address,

                "active": user.active,

                "status":
                    "Active"
                    if user.active
                    else "Inactive",

                "last_login": None,

                "created_at": user.created_at

            })

        return {

            "users": user_list,

            "total": total,

            "page": page,

            "limit": limit,

            "pages": pages

        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Unable to load users: {str(e)}"
        )


@app.get("/api/admin/users/{user_id}", tags=["Admin Dashbaord"])
def get_admin_user(
    user_id: int,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_admin),
):

    user = (
        database
        .query(db.User)
        .filter(
            db.User.id == user_id
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {

        "id": user.id,

        "name": user.name,

        "email": user.email,

        "mobile": user.mobile,

        "gender": user.gender,

        "role": user.role,

        "address": user.address,

        "active": user.active,

        "status":
            "Active"
            if user.active
            else "Inactive",

        "last_login": None,

        "created_at": (
            user.created_at.isoformat()
            if user.created_at
            else None
        )
    }


@app.post(
    "/api/admin/users",
    tags=["Admin Dashbaord"]
)
def create_admin_user(

    user_data: db.AdminUserCreate,

    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(crud.require_admin)

):

    # ==================================================
    # CHECK EMAIL
    # ==================================================

    existing_user = (
        database
        .query(db.User)
        .filter(
            db.User.email == user_data.email
        )
        .first()
    )

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists."
        )

    # ==================================================
    # VALIDATE PASSWORD
    # ==================================================

    if not user_data.password:

        raise HTTPException(
            status_code=400,
            detail="Password is required."
        )

    # ==================================================
    # HASH PASSWORD
    # ==================================================

    hashed_password = db.hash_password(
        user_data.password
    )

    # ==================================================
    # CREATE USER
    # ==================================================

    new_user = db.User(

        name=user_data.name,

        email=user_data.email,

        mobile=user_data.mobile,

        gender=user_data.gender,

        role=user_data.role,

        address=user_data.address,

        active=user_data.active,

        hashed_password=hashed_password,

        created_at=datetime.utcnow()

    )

    # ==================================================
    # SAVE
    # ==================================================

    database.add(
        new_user
    )

    try:

        database.commit()

        database.refresh(
            new_user
        )

    except Exception:

        database.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to create user."
        )

    # ==================================================
    # RESPONSE
    # ==================================================

    return {

        "message":
            "User created successfully",

        "user": {

            "id":
                new_user.id,

            "name":
                new_user.name,

            "email":
                new_user.email,

            "mobile":
                new_user.mobile,

            "gender":
                new_user.gender,

            "role":
                new_user.role,

            "address":
                new_user.address,

            "active":
                new_user.active,

            "status":
                "Active"
                if new_user.active
                else "Inactive",

            "created_at":
                new_user.created_at.isoformat()

        }

    }


@app.put(
    "/api/admin/users/{user_id}",
    tags=["Admin Dashbaord"]
)
def update_admin_user(

    user_id: int,

    user_data: db.AdminUserUpdate,

    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(crud.require_admin)

):

    # ==================================================
    # FIND USER
    # ==================================================

    user = (
        database
        .query(db.User)
        .filter(
            db.User.id == user_id
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # ==================================================
    # CHECK DUPLICATE EMAIL
    # ==================================================

    duplicate_email = (
        database
        .query(db.User)
        .filter(
            db.User.email == user_data.email,
            db.User.id != user_id
        )
        .first()
    )

    if duplicate_email:

        raise HTTPException(
            status_code=400,
            detail="Another user already uses this email."
        )

    # ==================================================
    # UPDATE BASIC INFORMATION
    # ==================================================

    user.name = user_data.name

    user.email = user_data.email

    user.mobile = user_data.mobile

    user.gender = user_data.gender

    user.role = user_data.role

    user.address = user_data.address

    # ==================================================
    # UPDATE ACTIVE STATUS
    # ==================================================

    user.active = user_data.active

    # ==================================================
    # UPDATE PASSWORD ONLY IF PROVIDED
    # ==================================================

    if (
        hasattr(user_data, "password")
        and user_data.password
    ):

        user.hashed_password = db.hash_password(
            user_data.password
        )

    # ==================================================
    # SAVE
    # ==================================================

    try:

        database.commit()

        database.refresh(
            user
        )

    except Exception:

        database.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to update user."
        )

    # ==================================================
    # RESPONSE
    # ==================================================

    return {

        "message":
            "User updated successfully",

        "user": {

            "id":
                user.id,

            "name":
                user.name,

            "email":
                user.email,

            "mobile":
                user.mobile,

            "gender":
                user.gender,

            "role":
                user.role,

            "address":
                user.address,

            "active":
                user.active,

            "status":
                "Active"
                if user.active
                else "Inactive",

            "created_at":
                user.created_at.isoformat()
                if user.created_at
                else None

        }

    }


@app.delete(
    "/api/admin/users/{user_id}",
    tags=["Admin Dashbaord"]
)
def delete_admin_user(

    user_id: int,

    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(crud.require_admin)

):

    user = (
        database
        .query(db.User)
        .filter(
            db.User.id == user_id
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    try:

        database.delete(
            user
        )

        database.commit()

    except Exception:

        database.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to delete user."
        )

    return {

        "message":
            "User deleted successfully"

    }


@app.patch(
    "/api/admin/users/{user_id}/status",
    tags=["Admin Dashbaord"]
)
def change_user_status(

    user_id: int,

    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(crud.require_admin)

):

    user = (
        database
        .query(db.User)
        .filter(
            db.User.id == user_id
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # ==================================================
    # TOGGLE ACTIVE
    # ==================================================

    user.active = not user.active

    try:

        database.commit()

        database.refresh(
            user
        )

    except Exception:

        database.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to update user status."
        )

    return {

        "message":
            "User status updated successfully",

        "active":
            user.active,

        "status":
            "Active"
            if user.active
            else "Inactive"

    }


# =============================================================
# VENDOR MANAGEMENT IN ADMIN DASHBOARD
# =============================================================

@app.get("/api/admin/vendors/statistics", tags=["Admin Dashbaord"])
def admin_vendor_statistics(database: Session = Depends(db.get_db), current_user: db.User = Depends(crud.require_admin)):
    try:    
        total = database.query(db.Vendor).count()
        active = database.query(db.Vendor).filter(db.Vendor.status == "Active").count()
        pending = database.query(db.Vendor).filter(db.Vendor.status == "Pending").count()
        under_review = database.query(db.Vendor).filter(db.Vendor.status == "Under Review").count()
        blacklisted = database.query(db.Vendor).filter(db.Vendor.status == "Blacklisted").count()
        average = crud.average_vendor_reliability(database)
        top_vendor_data = crud.top_vendors(database,5)
        reliability_data = crud.reliability_distribution(database)
        category = crud.category_reliability(database)
        status_distribution = { "Active": active, "Pending Approval": pending, "Under Review": under_review, "Blacklisted": blacklisted, "Total": total }
        return {
                "success": True,
                "statistics": {
                    "total_vendors": total,
                    "active_vendors": active,
                    "pending_vendors": pending,
                    "under_review_vendors": under_review,
                    "blacklisted_vendors": blacklisted,
                    "average_reliability": average
                },
                "status_distribution": status_distribution,
                "top_vendors": top_vendor_data,
                "reliability_distribution": reliability_data,
                "category_reliability": category
            }
    except Exception as exc:
        print( "Vendor statistics error:", repr(exc) )
        raise HTTPException( status_code=500, detail=( "Unable to load vendor statistics: " f"{str(exc)}" ) )


@app.get("/api/admin/vendors/status-distribution", tags=["Admin Dashbaord"])
def admin_vendor_status_distribution(database: Session = Depends(db.get_db), current_user: db.User = Depends(crud.require_admin)):
    distribution = {}
    for name in ["Active", "Approved", "Pending", "Pending Approval", "Under Review", "Blacklisted", "Rejected"]:
        distribution[name] = database.query(db.Vendor).filter(db.Vendor.status == name).count()
    return {"success": True, "distribution": distribution}


@app.get("/api/admin/vendors", tags=["Admin Dashbaord"])
def admin_get_vendors(
    search: str = Query( "", description="Search vendors" ),
    status: str = Query( "All", description="Vendor status" ),
    category: str = Query( "All", description="Vendor category" ),
    rating: str = Query( "All", description="Reliability rating" ),
    page: int = Query( 1, ge=1 ),
    limit: int = Query( 10, ge=1, le=100 ),
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_admin )
):
    query = database.query(db.Vendor)
    if search:
        value = f"%{search}%"
        query = query.filter(or_(db.Vendor.vendor_id.ilike(value), db.Vendor.vendor_name.ilike(value), db.Vendor.email.ilike(value), db.Vendor.category.ilike(value), db.Vendor.category.ilike(value)))
    if status and status != "All": query = query.filter(db.Vendor.status == status)
    if category and category != "All": query = query.filter(db.Vendor.category == category)
    if rating and rating == "Excellent": query = query.filter(db.Vendor.reliability_score >= 80)
    elif rating == "Good": query = query.filter(db.Vendor.reliability_score >= 60, db.Vendor.reliability_score < 80)
    elif rating == "Average": query = query.filter(db.Vendor.reliability_score >= 40, db.Vendor.reliability_score < 60)
    elif rating == "Poor": query = query.filter(db.Vendor.reliability_score < 40)
    total = query.count()
    pages = max(1, (total + limit - 1) // limit)
    vendors = query.order_by(db.Vendor.id.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "success": True,
        "vendors": [
            {
                "id": vendor.id,
                "vendor_id": vendor.vendor_id,
                "vendor_name": vendor.vendor_name,
                "category": vendor.category,
                "contact_person": vendor.contact_person,
                "email": vendor.email,
                "phone": vendor.phone,
                "status": vendor.status,
                "reliability_score": vendor.reliability_score,
                "trend": vendor.trend,
                "quality_score": vendor.quality_score,
                "delivery_score": vendor.delivery_score,
                "service_score": vendor.service_score,
                "contract_count": vendor.contract_count
            }
            for vendor in vendors
        ],
        "pagination": { "total": total, "page": page, "limit": limit, "pages": pages }
 }


@app.post( "/api/admin/vendors/register", status_code=status.HTTP_201_CREATED, tags=["Admin Dashbaord"] )
def admin_register_vendor( vendor: db.VendorRegistrationDetails, database: Session = Depends(db.get_db), current_user: db.User = Depends(crud.require_admin) ):
    try:
        # ======================================================
        # CHECK EMAIL
        # ======================================================
        existing_vendor = ( database .query(db.Vendor) .filter( db.Vendor.email == vendor.email ) .first() )
        if existing_vendor:
            raise HTTPException( status_code=400, detail="A vendor with this email already exists." )

        # ======================================================
        # GENERATE VENDOR ID
        # ======================================================
        vendor_id = crud.generate_vendor_id( database )

        # ======================================================
        # CREATE VENDOR
        # ======================================================
        new_vendor = db.Vendor(
            vendor_id=vendor_id,
            vendor_name=vendor.vendor_name,
            country=vendor.country,
            email=vendor.email,
            phone=vendor.phone,
            business_type=vendor.business_type,
            category=vendor.category,
            contact_person=vendor.contact_person,
            address=vendor.address,
            # The vendors table requires hashed_password to be NOT NULL.
            # Step 3 replaces this temporary value with the real password.
            hashed_password=db.hash_password(uuid.uuid4().hex),
            # Initial status
            status="Pending",
            reliability_score=0,
            quality_score=0,
            delivery_score=0,
            service_score=0
        )
        database.add(new_vendor)
        database.commit()
        database.refresh(new_vendor)

        # ======================================================
        # RETURN GENERATED ID
        # ======================================================
        return { "message": "Vendor registered successfully.", "vendor_id": new_vendor.vendor_id, "status": new_vendor.status }

    except HTTPException:
        raise

    except Exception as e:
        database.rollback()
        print( "Vendor registration error:", str(e) )
        raise HTTPException( status_code=500, detail=str(e) )


@app.post( "/api/admin/vendors/create-account", status_code=status.HTTP_200_OK, tags=["Admin Dashbaord"] )
def admin_create_vendor_account( account: db.VendorAccountCreate, database: Session = Depends( db.get_db ), current_user: db.User = Depends( crud.require_admin ) ):
    try:
        vendor = crud.create_vendor_account( database=database, vendor_id= account.vendor_id, password= account.password )
        return { "message": "Vendor account created successfully.", "vendor_id": vendor.vendor_id, "status": vendor.status }

    except HTTPException:
        raise

    except Exception as e:
        database.rollback()
        raise HTTPException( status_code=500, detail=( "Unable to create vendor account: " + str(e) ) )


@app.delete("/api/admin/vendors/{vendor_id}", tags=["Admin Dashbaord"])
def admin_delete_vendor(vendor_id: str, database: Session = Depends(db.get_db), current_user: db.User = Depends(crud.require_admin)):
    existing = crud.get_vendor_by_vendor_id(database, vendor_id)
    if existing is None: raise HTTPException(status_code=404, detail="Vendor not found.")
    crud.delete_vendor(database, existing.id)
    return {"success": True, "message": "Vendor deleted successfully."}


@app.get( "/api/admin/vendors/categories", tags=["Admin Dashbaord"] )
def admin_vendor_categories( database: Session = Depends( db.get_db ), current_user: db.User = Depends( crud.require_admin ) ):
    categories = ( database .query(db.Vendor.category) .filter( db.Vendor.category.isnot(None) ) .filter( db.Vendor.category != "" ) .distinct() .order_by( db.Vendor.category.asc() ) .all() )
    return { "success": True, "categories": [ row[0] for row in categories ] }


# ==========================================================
# GET / UPDATE VENDOR FOR ADMIN EDIT PAGE
# ==========================================================

@app.get("/api/admin/vendors/{vendor_id}", tags=["Admin Dashbaord"])
def get_vendor_for_edit(
    vendor_id: str,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_admin),
):
    vendor = (
        database.query(db.Vendor)
        .filter(db.Vendor.vendor_id == vendor_id)
        .first()
    )

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    return {
        "success": True,
        "vendor": {
            "id": vendor.id,
            "vendor_id": vendor.vendor_id,
            "vendor_name": vendor.vendor_name,
            "country": vendor.country,
            "email": vendor.email,
            "phone": vendor.phone,
            "business_type": vendor.business_type,
            "address": vendor.address,
            "category": vendor.category,
            "contact_person": vendor.contact_person,
            "status": vendor.status,
            "reliability_score": vendor.reliability_score or 0,
            "trend": vendor.trend,
            "quality_score": vendor.quality_score or 0,
            "delivery_score": vendor.delivery_score or 0,
            "service_score": vendor.service_score or 0,
            "contract_count": vendor.contract_count or 0,
            "approved_by": vendor.approved_by,
        },
    }


@app.put("/api/admin/vendors/{vendor_id}", tags=["Admin Dashbaord"])
def update_admin_vendor(
    vendor_id: str,
    vendor_data: dict,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_admin),
):
    """
    Update an administrator-managed vendor.

    A plain JSON object is intentionally accepted here instead of
    VendorEditRequest so that the edit page can omit password when
    the administrator is only changing profile information.
    """
    vendor = (
        database.query(db.Vendor)
        .filter(db.Vendor.vendor_id == vendor_id)
        .first()
    )

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    allowed_fields = {
        "vendor_name", "country", "email", "phone",
        "business_type", "address", "category",
        "contact_person", "status", "approved_by",
        "reliability_score", "trend", "quality_score",
        "delivery_score", "service_score", "contract_count",
    }

    for field in allowed_fields:
        if field in vendor_data and vendor_data[field] is not None:
            if field == "email":
                duplicate = (
                    database.query(db.Vendor)
                    .filter(
                        db.Vendor.email == str(vendor_data[field]).strip(),
                        db.Vendor.id != vendor.id,
                    )
                    .first()
                )
                if duplicate:
                    raise HTTPException(
                        status_code=400,
                        detail="Email address is already used by another vendor.",
                    )
                setattr(vendor, field, str(vendor_data[field]).strip())
            else:
                setattr(vendor, field, vendor_data[field])

    # Password is optional on edit. Only replace it when the frontend sends one.
    password = vendor_data.get("password")
    if password:
        vendor.hashed_password = db.hash_password(str(password))

    try:
        database.commit()
        database.refresh(vendor)
    except Exception as exc:
        database.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Unable to update vendor: {str(exc)}",
        )

    return {
        "success": True,
        "message": "Vendor updated successfully",
        "vendor": {
            "vendor_id": vendor.vendor_id,
            "vendor_name": vendor.vendor_name,
            "country": vendor.country,
            "email": vendor.email,
            "phone": vendor.phone,
            "business_type": vendor.business_type,
            "address": vendor.address,
            "category": vendor.category,
            "contact_person": vendor.contact_person,
            "status": vendor.status,
            "reliability_score": vendor.reliability_score or 0,
            "quality_score": vendor.quality_score or 0,
            "delivery_score": vendor.delivery_score or 0,
            "service_score": vendor.service_score or 0,
            "contract_count": vendor.contract_count or 0,
            "approved_by": vendor.approved_by,
        },
    }


# ============================================================
# PROCUREMENT OVERVIEW IN ADMIN DASHBOARD
# ============================================================

@app.get( "/api/procurement/overview", tags=["Admin Dashboard"] )
def procurement_overview(
    from_date: date | None = Query( None, description="Start date" ),
    to_date: date | None = Query( None, description="End date" ),
    database: Session = Depends( db.get_db ), current_user: db.User = Depends( crud.require_admin ) ):

    """
    Procurement Overview Dashboard.
    Uses the existing PostgreSQL tables:
        - procurement_requests
        - purchase_orders
        - vendors
        - contracts
    Returns:
        - KPI summary
        - procurement status
        - monthly spend
        - spend by category
        - top vendors
        - vendor performance
        - delivery status
        - recent purchase orders
        - active contracts
    """

    try:
        # ====================================================
        # DEFAULT DATE RANGE
        # ====================================================
        today = date.today()
        if from_date is None:
            from_date = date( today.year, 1, 1 )

        if to_date is None:
            to_date = today

        if from_date > to_date:
            raise HTTPException( status_code=400, detail=( "from_date cannot be greater than to_date." ) )

        # ====================================================
        # CURRENT USER
        # ====================================================
        user_data = {
            "id": current_user.id,
            "name": getattr( current_user, "name", None ),
            "email": getattr( current_user, "email", None ),
            "role": getattr( current_user, "role", None )
        }

        # ====================================================
        # PURCHASE ORDER QUERY
        # ====================================================
        po_query = ( database .query(db.PurchaseOrder) .filter( db.PurchaseOrder.order_date >= from_date, db.PurchaseOrder.order_date <= to_date ) )
        purchase_orders = ( po_query .order_by( db.PurchaseOrder.order_date.desc() ) .all() )

        # ====================================================
        # TOTAL PURCHASE ORDERS
        # ====================================================
        total_purchase_orders = len( purchase_orders )

        # ====================================================
        # TOTAL PROCUREMENT SPEND
        # ====================================================
        total_spend = sum(
            float( order.amount or 0 )
            for order in purchase_orders
        )

        # ====================================================
        # AVERAGE PO VALUE
        # ====================================================
        if total_purchase_orders > 0:
            average_po_value = ( total_spend / total_purchase_orders )
        else:
            average_po_value = 0

        # ====================================================
        # VENDOR COUNT
        # ====================================================
        total_vendors = ( database .query( func.count( db.Vendor.id ) ) .scalar() or 0 )

        # ====================================================
        # ACTIVE VENDOR COUNT
        # ====================================================
        active_vendors = ( database .query( func.count( db.Vendor.id ) ) .filter( db.Vendor.status == "Active" ) .scalar() or 0 )

        # ====================================================
        # VENDOR RELIABILITY
        # ====================================================
        reliability_value = ( database .query( func.avg( db.Vendor.reliability_score ) ) .filter( db.Vendor.reliability_score.isnot(None) ) .scalar() )
        average_reliability = (
            float( reliability_value )
            if reliability_value is not None
            else 0
        )

        # ====================================================
        # DELIVERY ANALYSIS
        # ====================================================
        total_deliveries = 0
        on_time_deliveries = 0
        delayed_deliveries = 0
        total_delay_days = 0
        for order in purchase_orders:
            actual_delivery = ( order.actual_delivery )
            expected_delivery = ( order.expected_delivery )

            # ----------------------------------------------
            # Only completed deliveries
            # ----------------------------------------------
            if actual_delivery is not None:
                total_deliveries += 1
                if ( expected_delivery is not None ):
                    delay_days = ( actual_delivery - expected_delivery ).days
                    if delay_days <= 0:
                        on_time_deliveries += 1
                    else:
                        delayed_deliveries += 1
                        total_delay_days += ( delay_days )
                else:
                    on_time_deliveries += 1

        # ====================================================
        # ON-TIME DELIVERY RATE
        # ====================================================
        if total_deliveries > 0:
            on_time_delivery_rate = round( ( on_time_deliveries / total_deliveries ) * 100, 2 )
        else:
            on_time_delivery_rate = 0

        # ====================================================
        # DELAYED DELIVERY RATE
        # ====================================================
        if total_deliveries > 0:
            delayed_delivery_rate = round( ( delayed_deliveries / total_deliveries ) * 100, 2 )
        else:
            delayed_delivery_rate = 0

        # ====================================================
        # AVERAGE DELAY
        # ====================================================
        if delayed_deliveries > 0:
            average_delay_days = round( total_delay_days / delayed_deliveries, 2 )
        else:
            average_delay_days = 0

        # ====================================================
        # PROCUREMENT STATUS
        # ====================================================
        status_counts = { "Pending": 0, "Approved": 0, "Ordered": 0, "In Transit": 0, "Delivered": 0, "Completed": 0, "Cancelled": 0 }
        for order in purchase_orders:
            raw_status = ( str( order.status or "Pending" ) .strip() )
            status_lower = ( raw_status .lower() )

            # ----------------------------------------------
            # Normalize statuses
            # ----------------------------------------------
            if status_lower == "pending":
                status = "Pending"
            elif status_lower == "approved":
                status = "Approved"
            elif status_lower == "ordered":
                status = "Ordered"
            elif status_lower in [ "in transit", "in_transit", "transit" ]:
                status = "In Transit"
            elif status_lower == "delivered":
                status = "Delivered"
            elif status_lower in [ "completed", "complete" ]:
                status = "Completed"
            elif status_lower in [ "cancelled", "canceled" ]:
                status = "Cancelled"
            else:
                status = raw_status
                if status not in status_counts:
                    status_counts[ status ] = 0
            status_counts[ status ] += 1

        # ====================================================
        # STATUS DISTRIBUTION
        # ====================================================
        status_distribution = []
        for status, count in ( status_counts.items() ):
            if count == 0:
                continue
            percentage = (
                ( count / total_purchase_orders ) * 100
                if total_purchase_orders > 0
                else 0
            )
            status_distribution.append({ "status": status, "count": count, "percent": round( percentage, 2 ) })

        # ====================================================
        # PROCUREMENT REQUESTS
        # ====================================================
        request_query = ( database .query( db.ProcurementRequest ) .filter( db.ProcurementRequest.created_at >= datetime.combine( from_date, datetime.min.time() ), db.ProcurementRequest.created_at <= datetime.combine( to_date, datetime.max.time() ) ) )
        procurement_requests = ( request_query .all() )
        total_requests = len( procurement_requests )
        pending_requests = sum( 1
            for request in procurement_requests
            if str( request.status or "" ).lower() == "pending"
        )
        approved_requests = sum( 1
            for request in procurement_requests
            if str( request.status or "" ).lower() == "approved"
        )

        # ====================================================
        # SPEND BY CATEGORY
        # ====================================================
        category_spend = {}
        for order in purchase_orders:
            vendor = ( order.vendor )

            # ------------------------------------------------
            # Vendor category is the available category
            # in the existing database model.
            # ------------------------------------------------
            category = (
                vendor.category
                if vendor and vendor.category
                else "Other"
            )
            amount = float( order.amount or 0 )
            category_spend[ category ] = ( category_spend.get( category, 0 ) + amount )
        categories = []
        for category, amount in sorted( category_spend.items(), key=lambda item: item[1], reverse=True ):
            percentage = (
                ( amount / total_spend ) * 100
                if total_spend > 0
                else 0
            )
            categories.append({
                "category": category,
                "amount": round( amount, 2 ),
                "percent": round( percentage, 2 )
            })

        # ====================================================
        # TOP SPENDING VENDORS
        # ====================================================
        vendor_spend = {}
        for order in purchase_orders:
            vendor = ( order.vendor )
            if vendor:
                vendor_name = ( vendor.vendor_name )
                vendor_id = ( vendor.vendor_id )
            else:
                vendor_name = ( "Unknown Vendor" )
                vendor_id = None
            amount = float( order.amount or 0 )
            if vendor_name not in vendor_spend:
                vendor_spend[ vendor_name ] = {
                    "vendor": vendor_name,
                    "vendor_id": vendor_id,
                    "spend": 0
                }
            vendor_spend[ vendor_name ]["spend"] += amount
        top_vendors = []
        for item in sorted( vendor_spend.values(), key=lambda x: x["spend"], reverse=True )[:5]:
            percentage = (
                ( item["spend"] / total_spend ) * 100
                if total_spend > 0
                else 0
            )
            top_vendors.append({
                "vendor": item["vendor"],
                "vendor_id": item["vendor_id"],
                "spend": round( item["spend"], 2 ),
                "percent": round( percentage, 2 )
            })

        # ====================================================
        # VENDOR PERFORMANCE
        # ====================================================
        vendors = ( database .query( db.Vendor ) .filter( db.Vendor.reliability_score.isnot(None) ) .order_by( db.Vendor.reliability_score.desc() ) .limit(5) .all() )
        vendor_performance = []
        for vendor in vendors:
            reliability = float( vendor.reliability_score or 0 )
            quality = float( vendor.quality_score or reliability )
            delivery = float( vendor.delivery_score or reliability )
            service = float( vendor.service_score or reliability )
            vendor_performance.append({
                "vendor": vendor.vendor_name,
                "vendor_id": vendor.vendor_id,
                "quality": quality,
                "delivery": delivery,
                "service": service,
                "score": reliability,
                "trend": vendor.trend or "flat"
            })
        # ====================================================
        # MONTHLY SPEND
        # ====================================================
        monthly_spend = {}
        for order in purchase_orders:
            if not order.order_date:
                continue
            month_key = ( order.order_date .strftime("%Y-%m") )
            month_name = ( order.order_date .strftime("%b") )

            if month_key not in monthly_spend:
                monthly_spend[ month_key ] = { "month": month_name, "actual": 0 }

            monthly_spend[ month_key ]["actual"] += float( order.amount or 0 )
        spend_trend = []
        for key in sorted( monthly_spend.keys() ):
            item = ( monthly_spend[key] )
            spend_trend.append({
                "month": item["month"],
                "actual": round( item["actual"], 2 ),
                # There is no procurement
                # budget column in the existing
                # PurchaseOrder model.
                "budget": 0
            })

        # ====================================================
        # RECENT PURCHASE ORDERS
        # ====================================================
        recent_orders = []
        recent = ( database .query( db.PurchaseOrder ) .order_by( db.PurchaseOrder.order_date.desc() ) .limit(5) .all() )
        for order in recent:
            vendor = ( order.vendor )
            vendor_name = (
                vendor.vendor_name
                if vendor
                else "Unknown Vendor"
            )
            recent_orders.append({
                "id": order.id,
                "po_number": order.po_number,
                "vendor": vendor_name,
                "vendor_id":
                    (
                        vendor.vendor_id
                        if vendor
                        else None
                    ),
                "amount": float( order.amount or 0 ),
                "status": order.status or "Pending",
                "order_date":
                    (
                        order.order_date.isoformat()
                        if order.order_date
                        else None
                    ),
                "delivery_date":
                    (
                        order.actual_delivery.isoformat()
                        if order.actual_delivery
                        else None
                    ),
                "expected_delivery":
                    (
                        order.expected_delivery.isoformat()
                        if order.expected_delivery
                        else None
                    )
            })

        # ====================================================
        # ACTIVE PURCHASE ORDERS
        # ====================================================
        active_statuses = [ "Pending", "Approved", "Ordered", "In Transit" ]
        active_orders_query = ( database .query( db.PurchaseOrder ) .filter( db.PurchaseOrder.status.in_( active_statuses ) ) .order_by( db.PurchaseOrder.order_date.desc() ) .limit(50) .all() )
        active_orders = []
        for order in active_orders_query:
            vendor = ( order.vendor )
            active_orders.append({
                "id": order.id,
                "po_number": order.po_number,
                "vendor":
                    (
                        vendor.vendor_name
                        if vendor
                        else
                        "Unknown Vendor"
                    ),
                "vendor_id":
                    (
                        vendor.vendor_id
                        if vendor
                        else None
                    ),
                "amount": float( order.amount or 0 ),
                "status": order.status or "Pending",
                "order_date":
                    (
                        order.order_date.isoformat()
                        if order.order_date
                        else None
                    ),
                "expected_delivery":
                    (
                        order.expected_delivery.isoformat()
                        if order.expected_delivery
                        else None
                    ),
                "delivery_date":
                    (
                        order.actual_delivery.isoformat()
                        if order.actual_delivery
                        else None
                    )
            })

        # ====================================================
        # ACTIVE CONTRACTS
        # ====================================================
        active_contracts = ( database .query( db.Contract ) .filter( func.lower( db.Contract.status ).in_( [ "active", "approved" ] ) ) .order_by( db.Contract.expiry_date.asc() ) .limit(10) .all() )
        active_contract_list = []
        for contract in active_contracts:
            vendor = ( contract.vendor )
            vendor_name = (
                vendor.vendor_name
                if vendor
                else "Unknown Vendor"
            )
            vendor_category = (
                vendor.category
                if vendor and vendor.category
                else "General"
            )
            contract_value = float( contract.contract_value or 0 )
            active_contract_list.append({
                "contract_number": contract.contract_number,
                "vendor": vendor_name,
                "category": vendor_category,

                # Your current Contract model
                # has expiry_date/renewal_date,
                # not start_date.
                "start_date": None,
                "end_date":
                    (
                        contract.expiry_date.isoformat()
                        if contract.expiry_date
                        else None
                    ),
                "contract_value": contract_value,
                # No utilization column exists
                # in the current Contract model.
                "utilized": 0,
                "utilized_percent": 0,
                "status": contract.status,

                # Use vendor reliability as
                # the available performance value.
                "performance_score": float( vendor.reliability_score or 0 )
                    if vendor
                    else 0
            })

        # ====================================================
        # BUSINESS UNIT DATA
        # ====================================================
        # The current PurchaseOrder table does not contain
        # a business_unit/department column.
        # ProcurementRequest contains requester/category,
        # therefore category-based procurement data is used
        # instead of inventing a database column.
        # ====================================================
        business_unit_data = []
        requester_spend = {}
        for request in procurement_requests:
            requester = ( request.requester if request.requester else "Other" )
            requester_spend[ requester ] = ( requester_spend.get( requester, 0 ) + float( request.amount or 0 ) )
        total_request_spend = sum( requester_spend.values() )

        for requester, amount in sorted( requester_spend.items(), key=lambda x: x[1], reverse=True )[:10]:

            percentage = (
                ( amount / total_request_spend ) * 100
                if total_request_spend > 0
                else 0
            )

            business_unit_data.append({
                "unit": requester,
                "amount": round( amount, 2 ),
                "percent": round( percentage, 2 )
            })

        # ====================================================
        # FINAL RESPONSE
        # ====================================================
        return {
            "success": True,
            "dashboard": "procurement_overview",

            # =================================================
            # USER
            # =================================================
            "user": user_data,

            # =================================================
            # DATE RANGE
            # =================================================
            "date_range": {
                "from_date": from_date.isoformat(),
                "to_date": to_date.isoformat()
            },

            # =================================================
            # KPI DATA
            # =================================================
            "kpis": {
                "total_spend": round( total_spend, 2 ),
                "last_year_spend": 0,
                "total_purchase_orders": total_purchase_orders,
                "last_year_purchase_orders": 0,
                "active_contracts": len( active_contracts ),
                "last_year_contracts": 0,
                "average_po_value": round( average_po_value, 2 ),
                "savings": 0,
                "on_time_delivery": on_time_delivery_rate,
                "total_vendors": total_vendors,
                "active_vendors": active_vendors,
                "average_reliability": round( average_reliability, 2 ),
                "total_requests": total_requests,
                "pending_requests":pending_requests,
                "approved_requests": approved_requests
            },

            # =================================================
            # PROCUREMENT STATUS
            # =================================================
            "procurement_overview": {
                "delivered": status_counts.get( "Delivered", 0 ),
                "in_transit": status_counts.get( "In Transit", 0 ),
                "pending": status_counts.get( "Pending", 0 ),
                "approved": status_counts.get( "Approved", 0 ),
                "ordered": status_counts.get( "Ordered", 0 ),
                "completed": status_counts.get( "Completed", 0 ),
                "cancelled": status_counts.get( "Cancelled", 0 )
            },

            # =================================================
            # STATUS CHART
            # =================================================
            "status_distribution": status_distribution,

            # =================================================
            # PURCHASE ORDERS
            # =================================================
            "purchase_orders": active_orders,
            "recent_orders": recent_orders,

            # =================================================
            # VENDOR PERFORMANCE
            # =================================================
            "vendor_performance": vendor_performance,
            "top_vendors": top_vendors,

            # =================================================
            # DELIVERY
            # =================================================
            "delivery": {
                "on_time": on_time_delivery_rate,
                "delayed": delayed_delivery_rate,
                "avg_delay": average_delay_days,
                "total_deliveries": total_deliveries
            },

            # =================================================
            # SPEND
            # =================================================
            "spend_trend": spend_trend,
            "monthly": spend_trend,
            "categories": categories,
            "top_spending": top_vendors,

            # =================================================
            # BUSINESS UNIT / REQUESTER
            # =================================================
            "business_units": business_unit_data,

            # =================================================
            # ACTIVE CONTRACTS
            # =================================================
            "active_contracts_list": active_contract_list,

            # =================================================
            # REQUESTS
            # =================================================
            "procurement_requests": {
                "total": total_requests,
                "pending": pending_requests,
                "approved": approved_requests
            },

            # =================================================
            # NOTIFICATIONS
            # =================================================
            "notifications": [],

            # =================================================
            # MESSAGES
            # =================================================
            "messages": []
        }

    except HTTPException:
        raise

    except Exception as e:
        import traceback
        print( "\n========================================" )
        print( "PROCUREMENT OVERVIEW ERROR" )
        print( "========================================" )
        traceback.print_exc()
        print( "========================================\n" )
        raise HTTPException( status_code=500, detail=( "Procurement Overview failed: " f"{type(e).__name__}: {str(e)}" ) )


@app.get( "/api/procurementoverview/notifications/count", tags=["Admin Dashboard"] )
def procurementoverview_notification_count( database: Session = Depends(db.get_db), current_user: db.User = Depends( crud.require_admin ), ):
    try:

        if hasattr(database, "Notification"):
            query = database.query( db.Notification )

            if hasattr( db.Notification, "is_read" ):
                count = query.filter( db.Notification.status == "Unread" ).count()

            elif hasattr( db.Notification, "status" ): count = query.filter( db.Notification.status == "Unread" ).count()

            else:
                count = query.count()

        else:
            count = 0

        return { "success": True, "count": count }

    except Exception as e:
        print( "Notification count error:", e )
        return { "success": True, "count": 0 }


# ==========================================================
# CONTRACT & COMPLIANCE DASHBOARD
# ==========================================================

@app.get("/api/admin/contracts/dashboard", tags=["Admin Dashbaord"])
def get_contract_compliance_dashboard( database: Session = Depends(db.get_db) ):
    today = date.today()
    next_30_days = today + timedelta(days=30)
    next_60_days = today + timedelta(days=60)
    next_90_days = today + timedelta(days=90)

    # ======================================================
    # TOTAL CONTRACTS
    # ======================================================
    total_contracts = ( database.query(db.Contract) .count() )

    # ======================================================
    # ACTIVE CONTRACTS
    # ======================================================
    active_contracts = ( database.query(db.Contract) .filter( func.lower( db.Contract.status ) == "active" ) .count() )

    # ======================================================
    # CONTRACTS EXPIRING IN 30 DAYS
    # ======================================================
    expiring_soon = ( database.query(db.Contract) .filter( db.Contract.expiry_date >= today, db.Contract.expiry_date <= next_30_days, func.lower( db.Contract.status ) == "active" ) .count() )

    # ======================================================
    # EXPIRED CONTRACTS
    # ======================================================
    expired_contracts = ( database.query(db.Contract) .filter( db.Contract.expiry_date < today ) .count() )

    # ======================================================
    # COMPLIANCE COUNTS
    # ======================================================
    compliant_count = ( database.query(db.Contract) .filter( func.lower( db.Contract.compliance_status ) == "compliant" ) .count() )
    at_risk_count = ( database.query(db.Contract) .filter( func.lower( db.Contract.compliance_status ) == "at risk" ) .count() )
    non_compliant_count = ( database.query(db.Contract) .filter( func.lower( db.Contract.compliance_status ).in_([ "non-compliant", "non compliant" ]) ) .count() )

    # ======================================================
    # COMPLIANCE SCORE
    # Score is calculated from Contract.compliance_status
    # ======================================================
    if total_contracts > 0:
        compliance_score = round( ( compliant_count / total_contracts ) * 100, 1 )
    else:
        compliance_score = 0

    # ======================================================
    # CONTRACT REPOSITORY
    # ======================================================
    contracts = ( database.query(db.Contract) .join( db.Vendor, db.Contract.vendor_id == db.Vendor.vendor_id ) .order_by( db.Contract.expiry_date.asc() ) .limit(100) .all() )
    repository = []
    for contract in contracts:
        repository.append({
            "id": contract.id,
            "contract_number": contract.contract_number,
            "vendor_id": contract.vendor_id,
            "vendor_code":
                contract.vendor.vendor_id
                if contract.vendor
                else None,
            "vendor_name":
                contract.vendor.vendor_name
                if contract.vendor
                else "Unknown Vendor",
            "contract_status": contract.status,
            "expiry_date":
                contract.expiry_date.isoformat()
                if contract.expiry_date
                else None,
            "renewal_date":
                contract.renewal_date.isoformat()
                if contract.renewal_date
                else None,
            "contract_value":
                float(contract.contract_value)
                if contract.contract_value is not None
                else 0,
            "compliance_status": contract.compliance_status,
            "risk_level": contract.risk_level,
            "renewal_status": contract.renewal_status
        })

    # ======================================================
    # RENEWAL TRACKING
    # ======================================================
    renewal_contracts = ( database.query(db.Contract) .join( db.Vendor, db.Contract.vendor_id == db.Vendor.vendor_id ) .filter( db.Contract.renewal_date != None, db.Contract.renewal_date >= today, db.Contract.renewal_date <= next_90_days ) .order_by( db.Contract.renewal_date.asc() ) .limit(20) .all() )
    renewals = []
    renewal_0_30 = 0
    renewal_31_60 = 0
    renewal_61_90 = 0
    for contract in renewal_contracts:
        days_left = ( contract.renewal_date - today ).days
        if days_left <= 30:
            renewal_0_30 += 1
        elif days_left <= 60:
            renewal_31_60 += 1
        else:
            renewal_61_90 += 1
        renewals.append({
            "contract_number": contract.contract_number,
            "vendor_name":
                contract.vendor.vendor_name
                if contract.vendor
                else "Unknown Vendor",
            "renewal_date": contract.renewal_date.isoformat(),
            "days_left": days_left,
            "renewal_status": contract.renewal_status,
            "risk_level": contract.risk_level
        })

    # ======================================================
    # CONTRACT EXPIRY NOTIFICATIONS
    # ======================================================
    expiry_contracts = ( database.query(db.Contract) .join( db.Vendor, db.Contract.vendor_id == db.Vendor.vendor_id ) .filter( db.Contract.expiry_date != None, db.Contract.expiry_date >= today, db.Contract.expiry_date <= next_90_days ) .order_by( db.Contract.expiry_date.asc() ) .limit(50) .all() )
    expiry_notifications = []
    for contract in expiry_contracts:
        days_left = ( contract.expiry_date - today ).days
        if days_left <= 30:
            alert_level = "High"
        elif days_left <= 60:
            alert_level = "Medium"
        else:
            alert_level = "Low"

        expiry_notifications.append({
            "contract_number": contract.contract_number,
            "vendor_name":
                contract.vendor.vendor_name
                if contract.vendor
                else "Unknown Vendor",
            "expiry_date": contract.expiry_date.isoformat(),
            "days_left": days_left,
            "alert_level": alert_level,
            "status": contract.status,
            "risk_level": contract.risk_level
        })

    # ======================================================
    # NOTIFICATIONS
    # ======================================================
    notification_count = ( database.query(db.Notification) .filter( db.Notification.status == "Unread" ) .count() )

    # ======================================================
    # HIGH RISK CONTRACTS
    # ======================================================
    high_risk_contracts = ( database.query(db.Contract) .filter( func.lower( db.Contract.risk_level ) == "high" ) .count() )

    # ======================================================
    # RETURN RESPONSE
    # ======================================================
    return {
        "kpis": {
            "total_contracts": total_contracts,
            "active_contracts": active_contracts,
            "expiring_soon": expiring_soon,
            "expired_contracts": expired_contracts,
            "compliance_score": compliance_score,
            "notification_count": notification_count,
            "high_risk_contracts": high_risk_contracts
        },
        "repository": repository,
        "renewals": {
            "total": len(renewals),
            "zero_to_thirty": renewal_0_30,
            "thirty_one_to_sixty": renewal_31_60,
            "sixty_one_to_ninety": renewal_61_90,
            "items": renewals
        },
        "compliance": {
            "score": compliance_score,
            "compliant": compliant_count,
            "at_risk": at_risk_count,
            "non_compliant": non_compliant_count
        },
        "certifications": {
            "total": 0,
            "valid": 0,
            "expiring_soon": 0,
            "expired": 0,
            "available": False
        },
        "documents": {
            "total": 0,
            "active": 0,
            "pending": 0,
            "expired": 0,
            "available": False
        },
        "expiry_notifications": expiry_notifications
    }


# ==========================================================
# INVOICES AND PAYMENTS
# ==========================================================

@app.get( "/api/admin/invoices/dashboard", tags=["Admin Dashboard"] )
def invoices_dashboard( database: Session = Depends(db.get_db),
    current_user=Depends(crud.require_admin_or_procurement_manager)
):

    # ==========================================================
    # LOAD INVOICES
    # ==========================================================

    invoices = ( database.query(db.Invoice) .order_by( db.Invoice.invoice_date.desc(), db.Invoice.id.desc() ) .all() )

    total_invoices = len(invoices)

    # ==========================================================
    # INITIAL TOTALS
    # ==========================================================
    total_invoice_amount = 0.0
    paid_amount = 0.0
    pending_amount = 0.0
    overdue_amount = 0.0
    paid_count = 0
    pending_count = 0
    overdue_count = 0
    today = date.today()

    # ==========================================================
    # MONTHLY TREND
    # ==========================================================

    monthly = defaultdict( lambda: { "invoice": 0.0, "paid": 0.0, "pending": 0.0, "overdue": 0.0 } )

    # ==========================================================
    # PAYMENT STATUS DISTRIBUTION
    # ==========================================================

    for invoice in invoices:
        invoice_amount = float(invoice.amount or 0)
        total_invoice_amount += invoice_amount

        # ------------------------------------------------------
        # READ STATUS FROM INVOICE TABLE
        # ------------------------------------------------------

        status = ( str(invoice.status or "") .strip() .lower() )

        # ------------------------------------------------------
        # READ DUE DATE FROM INVOICE TABLE
        # ------------------------------------------------------
        due_date = invoice.due_date

        # ------------------------------------------------------
        # CALCULATE ACTUAL STATUS
        # ------------------------------------------------------
        # Paid invoices
        if status == "paid":
            calculated_status = "paid"
            paid_amount += invoice_amount
            paid_count += 1

        # Overdue invoices
        elif status == "overdue":
            calculated_status = "overdue"
            overdue_amount += invoice_amount
            overdue_count += 1

        # Partially Paid invoices
        elif status == "partially paid":

            # No paid amount column exists in the supplied table.
            # Therefore, the full invoice amount is treated as
            # outstanding for the dashboard calculation.
            calculated_status = "pending"
            pending_amount += invoice_amount
            pending_count += 1

        # Pending / Approved invoices
        elif status in ("pending", "approved"):

            # If the invoice is past its due date and is not paid,
            # classify it as overdue.
            if due_date and today > due_date:
                calculated_status = "overdue"
                overdue_amount += invoice_amount
                overdue_count += 1

            else:
                calculated_status = "pending"
                pending_amount += invoice_amount
                pending_count += 1

        # Any unknown status
        else:
            if due_date and today > due_date:
                calculated_status = "overdue"
                overdue_amount += invoice_amount
                overdue_count += 1

            else:
                calculated_status = "pending"
                pending_amount += invoice_amount
                pending_count += 1

        # ======================================================
        # MONTHLY TREND
        # ======================================================

        if invoice.invoice_date:
            month_key = invoice.invoice_date.strftime("%Y-%m")
            monthly[month_key]["invoice"] += invoice_amount

            # Paid amount
            if calculated_status == "paid":
                monthly[month_key]["paid"] += invoice_amount

            # Overdue amount
            elif calculated_status == "overdue":
                monthly[month_key]["overdue"] += invoice_amount

            # Pending amount
            else:
                monthly[month_key]["pending"] += invoice_amount

    # ==========================================================
    # SIX MONTH TREND
    # ==========================================================

    sorted_months = sorted(monthly.keys())[-6:]

    trends = []

    for month_key in sorted_months:
        year, month_number = month_key.split("-")
        month_name = date( int(year), int(month_number), 1 ).strftime("%b")
        trends.append(
            {
                "month": month_name,
                "invoice_amount": round( monthly[month_key]["invoice"], 2 ),
                "paid_amount": round( monthly[month_key]["paid"], 2 ),
                "pending_amount": round( monthly[month_key]["pending"], 2 ),
                "overdue_amount": round( monthly[month_key]["overdue"], 2 )
            }
        )

    # ==========================================================
    # ON-TIME PAYMENT RATE
    # ==========================================================
    on_time_count = 0

    for invoice in invoices:

        invoice_amount = float(invoice.amount or 0)

        if invoice_amount <= 0:
            continue

        status = ( str(invoice.status or "") .strip() .lower() )

        due_date = invoice.due_date
        paid_date = invoice.paid_date

        # Only completely paid invoices qualify
        # for the on-time payment calculation.
        if status != "paid":
            continue

        if not due_date or not paid_date:
            continue

        if paid_date <= due_date:
            on_time_count += 1

    # ----------------------------------------------------------
    # CALCULATE RATE
    # ----------------------------------------------------------

    if total_invoices > 0:
        on_time_rate = ( on_time_count / total_invoices ) * 100

    else:
        on_time_rate = 0.0

    # ==========================================================
    # TOP VENDORS BY INVOICE AMOUNT
    # ==========================================================
    vendor_totals = defaultdict(float)

    for invoice in invoices:

        vendor_name = "Unknown Vendor"
        if invoice.vendor:
            vendor_name = (
                getattr(invoice.vendor, "vendor_name", None)
                or getattr(invoice.vendor, "company_name", None)
                or "Unknown Vendor"
            )

        vendor_totals[vendor_name] += float( invoice.amount or 0 )

    top_vendors = sorted(
        [ { "vendor": name, "amount": round(amount, 2) }
            for name, amount in vendor_totals.items() ],
        key=lambda x: x["amount"], reverse=True )[:5]

    # ==========================================================
    # AGING SUMMARY
    # ==========================================================

    aging = { "0_30": 0.0, "31_60": 0.0, "61_90": 0.0, "90_plus": 0.0 }

    for invoice in invoices:
        invoice_amount = float(invoice.amount or 0)
        status = ( str(invoice.status or "") .strip() .lower() )
        due_date = invoice.due_date

        # Paid invoices do not have outstanding amounts.
        if status == "paid":
            continue

        if not due_date:
            continue

        # ------------------------------------------------------
        # DETERMINE OUTSTANDING AMOUNT
        # ------------------------------------------------------
        # The supplied invoice table has no paid amount column.
        # Use the invoice amount for unpaid/partially paid records.
        outstanding = invoice_amount

        if outstanding <= 0:
            continue

        # ------------------------------------------------------
        # DAYS PAST DUE
        # ------------------------------------------------------
        days = (today - due_date).days

        # Future due dates belong to 0-30 days.

        if days < 0:
            days = 0

        # ------------------------------------------------------
        # AGING BUCKET
        # ------------------------------------------------------
        if days <= 30:
            aging["0_30"] += outstanding

        elif days <= 60:
            aging["31_60"] += outstanding

        elif days <= 90:
            aging["61_90"] += outstanding

        else:
            aging["90_plus"] += outstanding

    # ==========================================================
    # RETURN DASHBOARD
    # ==========================================================

    return {

        # KPI CARDS
        "kpis": {
            "total_invoices": total_invoices,
            "total_invoice_amount": round( total_invoice_amount, 2 ),
            "paid_amount": round( paid_amount, 2 ),
            "pending_amount": round( pending_amount, 2 ),
            "overdue_amount": round( overdue_amount, 2 ),
            "on_time_payment_rate": round( on_time_rate, 1 )
        },

        # PAYMENT STATUS DISTRIBUTION
        "payment_distribution": {
            "paid": paid_count,
            "pending": pending_count,
            "overdue": overdue_count
        },

        # SIX MONTH TREND
        "trends": trends,

        # TOP VENDORS
        "top_vendors": top_vendors,

        # AGING SUMMARY
        "aging": {
            "0_30": round( aging["0_30"], 2 ),
            "31_60": round( aging["31_60"], 2 ),
            "61_90": round( aging["61_90"], 2 ),
            "90_plus": round( aging["90_plus"], 2 )
        }
    }


# ==========================================================
# LIST INVOICES
# ==========================================================
@app.get( "/api/admin/invoices", tags=["Admin Dashboard"] )
def list_invoices(
    search: Optional[str] = None,
    status: Optional[str] = None,
    vendor_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    due_status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    database: Session = Depends(db.get_db),
    current_user=Depends( crud.require_admin_or_procurement_manager )
):
    query = ( database.query(db.Invoice)
        .outerjoin( db.Vendor, db.Invoice.vendor_id == db.Vendor.vendor_id )
    )

    # -------------------------
    # SEARCH
    # -------------------------

    if search:
        value = f"%{search.strip()}%"
        query = query.filter( or_(
                db.Invoice.invoice_number.ilike(value),
                db.Vendor.vendor_name.ilike(value),
                db.Invoice.vendor_id.ilike(value)
            )
        )

    # -------------------------
    # STATUS
    # -------------------------

    if status and status.lower() != "all":

        if status.lower() == "pending approval":
            query = query.filter( func.lower(db.Invoice.status) == "pending approval" )

        else:
            query = query.filter( func.lower(db.Invoice.status) == status.lower() )

    # -------------------------
    # VENDOR
    # -------------------------

    if vendor_id and vendor_id != "All":
        query = query.filter( db.Invoice.vendor_id == vendor_id )

    # -------------------------
    # DATE RANGE
    # -------------------------

    if from_date:
        try:
            start = datetime.strptime( from_date, "%Y-%m-%d" ).date()
            query = query.filter( db.Invoice.invoice_date >= start )

        except ValueError:
            raise HTTPException( status_code=400, detail="Invalid from_date" )

    if to_date:
        try:
            end = datetime.strptime( to_date, "%Y-%m-%d" ).date()
            query = query.filter( db.Invoice.invoice_date <= end )

        except ValueError:
            raise HTTPException( status_code=400, detail="Invalid to_date" )

    # -------------------------
    # DUE STATUS
    # -------------------------

    today = date.today()

    if due_status == "Overdue":
        query = query.filter( db.Invoice.due_date < today, func.lower(db.Invoice.status) != "paid" )

    elif due_status == "Due Soon":
        query = query.filter( db.Invoice.due_date >= today, db.Invoice.due_date <= ( today + timedelta(days=7) ) )

    # -------------------------
    # TOTAL
    # -------------------------
    total = query.count()

    # -------------------------
    # DATA
    # -------------------------
    invoices = ( query.order_by( db.Invoice.invoice_date.desc().nullslast(),db.Invoice.id.desc() )
                 .offset((page - 1) * limit) .limit(limit) .all() 
                )

    # -------------------------
    # RESPONSE
    # -------------------------
    items = []

    for invoice in invoices:

        vendor = ( database.query(db.Vendor) .filter( db.Vendor.vendor_id == invoice.vendor_id ) .first() )

        po = None

        if invoice.po_id:
            po = ( database.query(db.PurchaseOrder) .filter( db.PurchaseOrder.id == invoice.po_id ) .first() )

        items.append({
            "id": invoice.id,

            "invoice_number": invoice.invoice_number,

            "vendor_id": invoice.vendor_id,

            "vendor_name": vendor.vendor_name
                if vendor else "Unknown Vendor",

            "po_id": invoice.po_id,

            "po_number": po.po_number
                if po else None,

            "amount": float(invoice.amount or 0),

            "status": invoice.status,

            "invoice_date": invoice.invoice_date.isoformat()
                if invoice.invoice_date
                else None,

            "due_date": invoice.due_date.isoformat()
                if invoice.due_date
                else None,

            "paid_date": invoice.paid_date.isoformat()
                if invoice.paid_date
                else None
        })

    return {
        "items": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": max( 1, (total + limit - 1) // limit )
        }
    }


# ==========================================================
# GET SINGLE INVOICE
# ==========================================================

@app.get("/api/admin/invoices/{invoice_id}", tags=["Admin Dashboard"])
def get_admin_invoices( invoice_id: int, database: Session = Depends(db.get_db), current_user=Depends(crud.require_admin) ):
    invoice = ( database.query(db.Invoice) .filter( db.Invoice.id == invoice_id ) .first() )

    if not invoice:
        raise HTTPException( status_code=404, detail="Invoice not found" )
    
    return crud.serialize_invoice( invoice )


# ==========================================================
# UPDATE INVOICE STATUS
# ==========================================================

@app.put("/api/admin/invoices/{invoice_id}/status", tags=["Admin Dashbaord"])
def update_invoice_status( invoice_id: int, payload: db.InvoiceStatusUpdate, database: Session = Depends(db.get_db), current_user=Depends(crud.require_admin) ):
    invoice = ( database.query(db.Invoice) .filter( db.Invoice.id == invoice_id ) .first() )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )
    
    allowed_statuses = [ "Pending", "Paid", "Overdue", "Cancelled" ]

    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=( "Invalid invoice status. " "Allowed values: " + ", ".join(allowed_statuses) ) )
    
    invoice.status = payload.status
    database.commit()
    database.refresh(invoice)
    return crud.serialize_invoice( invoice )


@app.get( "/api/admin/invoices/{invoice_id}/details", tags=["Admin Dashboard"] )
def get_invoice_details(
    invoice_id: int, database: Session = Depends(db.get_db),
    current_user=Depends( crud.require_admin_or_procurement_manager )
):

    invoice = ( database.query(db.Invoice) .filter( db.Invoice.id == invoice_id ) .first() )

    if not invoice:
        raise HTTPException( status_code=404, detail="Invoice not found" )

    vendor = ( database.query(db.Vendor) .filter( db.Vendor.vendor_id == invoice.vendor_id ) .first() )

    po = None

    if invoice.po_id:
        po = ( database.query(db.PurchaseOrder) .filter( db.PurchaseOrder.id == invoice.po_id ) .first() )

    # -------------------------
    # PAYMENTS
    # -------------------------

    payments = ( database.query(db.Payment) .filter( db.Payment.invoice_id == invoice.id )
        .order_by( db.Payment.payment_date.desc() ) .all()
    )

    total_paid = sum( float(p.amount or 0)
        for p in payments
        if str(p.status).lower() in ["completed", "paid"]
    )

    balance_due = max( float(invoice.amount or 0) - total_paid, 0 )

    # -------------------------
    # ITEMS
    # -------------------------

    items = []

    if hasattr(db, "InvoiceItem"):
        invoice_items = ( database.query(db.InvoiceItem) .filter( db.InvoiceItem.invoice_id == invoice.id ) .all() )

        for item in invoice_items:
            items.append({
                "id": item.id,
                "item_code": item.item_code,
                "description": item.description,
                "quantity": float( item.quantity or 0 ),
                "unit_price": float( item.unit_price or 0 ),
                "tax_rate": float( item.tax_rate or 0 ),
                "tax_amount": float( item.tax_amount or 0 ),
                "amount": float( item.amount or 0 )
            })

    # -------------------------
    # HISTORY
    # -------------------------

    history = []

    if hasattr(db, "InvoiceHistory"):
        records = ( database.query(db.InvoiceHistory)
            .filter( db.InvoiceHistory.invoice_id == invoice.id )
            .order_by( db.InvoiceHistory.created_at.desc() ) .all()
        )

        for record in records:
            history.append({
                "action": record.action,
                "old_status": record.old_status,
                "new_status": record.new_status,
                "description": record.description,
                "created_at": record.created_at.isoformat()
                    if record.created_at
                    else None
            })

    # -------------------------
    # ATTACHMENTS
    # -------------------------

    attachments = []

    if hasattr(db, "InvoiceAttachment"):
        records = ( database.query( db.InvoiceAttachment )
            .filter( db.InvoiceAttachment.invoice_id == invoice.id )
            .order_by( db.InvoiceAttachment.created_at.desc() ) .all()
        )

        for record in records:
            attachments.append({
                "id": record.id,
                "file_name": record.file_name,
                "file_type": record.file_type,
                "file_size": record.file_size,
                "file_path": record.file_path
            })

    # -------------------------
    # WORKFLOW
    # -------------------------

    workflow = []

    if hasattr(db, "InvoiceWorkflow"):
        wf = ( database.query( db.InvoiceWorkflow ) .filter( db.InvoiceWorkflow.invoice_id == invoice.id ) .first() )

        if wf:
            for step in wf.steps:
                workflow.append({
                    "step_order": step.step_order,
                    "step_name": step.step_name,
                    "status": step.status,
                    "completed_at": step.completed_at.isoformat()
                        if step.completed_at
                        else None,
                    "notes": step.notes
                })

    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "vendor_id": invoice.vendor_id,
        "vendor_name": vendor.vendor_name
            if vendor else None,
        "po_id": invoice.po_id,
        "po_number": po.po_number
            if po else None,
        "amount": float(invoice.amount or 0),
        "status": invoice.status,
        "invoice_date": invoice.invoice_date.isoformat()
            if invoice.invoice_date
            else None,
        "due_date": invoice.due_date.isoformat()
            if invoice.due_date
            else None,
        "paid_date": invoice.paid_date.isoformat()
            if invoice.paid_date
            else None,
        "total_paid": total_paid,
        "balance_due": balance_due,
        "payments": [
            {
                "id": p.id,
                "payment_reference": p.payment_reference,
                "payment_date": p.payment_date.isoformat()
                    if p.payment_date
                    else None,
                "amount": float(p.amount or 0),
                "payment_method": p.payment_method,
                "status": p.status,
                "transaction_id": p.transaction_id
            }
            for p in payments
        ],
        "items": items,
        "history": history,
        "attachments": attachments,
        "workflow": workflow
    }


@app.put( "/api/admin/invoices/{invoice_id}/decision", tags=["Admin Dashboard"] )
def invoice_decision(
    invoice_id: int, decision: str = Query(...), database: Session = Depends(db.get_db),
    current_user=Depends( crud.require_admin_or_procurement_manager )
):

    invoice = ( database.query(db.Invoice) .filter( db.Invoice.id == invoice_id ) .first() )

    if not invoice:
        raise HTTPException( status_code=404, detail="Invoice not found" )

    decision = decision.strip().lower()

    if decision == "approve":
        old_status = invoice.status
        invoice.status = "Paid"
        new_status = "Paid"

    elif decision == "reject":
        old_status = invoice.status
        invoice.status = "Rejected"
        new_status = "Rejected"

    else:
        raise HTTPException( status_code=400, detail="Decision must be approve or reject" )

    # -------------------------
    # HISTORY
    # -------------------------

    if hasattr(db, "InvoiceHistory"):
        history = db.InvoiceHistory(
            invoice_id=invoice.id,
            action=( "Invoice Approved"
                if decision == "approve"
                else "Invoice Rejected"
            ),
            old_status=old_status,
            new_status=new_status,
            description=( "Invoice approved by procurement manager."
                if decision == "approve"
                else "Invoice rejected by procurement manager."
            ),
            performed_by=current_user.id
        )

        database.add(history)

    database.commit()
    database.refresh(invoice)

    return {
        "success": True,
        "message": "Invoice approved successfully."
            if decision == "approve"
            else "Invoice rejected successfully.",
        "invoice": crud.serialize_invoice( invoice )
    }


@app.post("/api/admin/payments", tags=["Admin Dashboard"])
def create_payment( payment_data: db.PaymentCreate, database: Session = Depends(db.get_db), current_user=Depends(crud.require_admin) ):
    invoice = ( database.query(db.Invoice) .filter( db.Invoice.id == payment_data.invoice_id ) .first() )

    if not invoice:

        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    if payment_data.amount <= 0:

        raise HTTPException(
            status_code=400,
            detail="Payment amount must be greater than zero"
        )

    existing_payment = ( database.query(db.Payment) .filter( db.Payment.payment_reference == payment_data.payment_reference ) .first() )
    if existing_payment:
        raise HTTPException(
            status_code=400,
            detail="Payment reference already exists"
        )
    payment = db.Payment(
        invoice_id=payment_data.invoice_id,
        payment_reference= payment_data.payment_reference,
        payment_date=datetime.utcnow().date(),
        amount= payment_data.amount,
        payment_method= payment_data.payment_method,
        status= payment_data.status,
        transaction_id= payment_data.transaction_id,
        notes= payment_data.notes
    )
    database.add(payment)
    database.commit()
    database.refresh(payment)
    return { "message": "Payment recorded successfully", "payment": payment }


@app.get("/api/admin/payments/invoice/{invoice_id}", tags=["Admin Dashboard"])
def get_invoice_payments( invoice_id: int, database: Session = Depends(db.get_db), current_user=Depends(crud.require_admin) ):
    invoice = ( database.query(db.Invoice) .filter( db.Invoice.id == invoice_id ) .first() )
    if not invoice:
        raise HTTPException( status_code=404, detail="Invoice not found" )
    payments = ( database.query(db.Payment) .filter( db.Payment.invoice_id == invoice_id ) .order_by( db.Payment.payment_date.desc() ) .all() )
    total_paid = sum(
        float(payment.amount or 0)
        for payment in payments
        if ( payment.status or "" ).lower() == "completed"
    )
    invoice_amount = float( invoice.amount or 0 )
    outstanding = max( invoice_amount - total_paid, 0 )
    return {
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "invoice_amount": invoice_amount,
        "total_paid": total_paid,
        "outstanding": outstanding,
        "payments": [
            {
                "id": payment.id,
                "payment_reference": payment.payment_reference,
                "payment_date": payment.payment_date,
                "amount": float(payment.amount or 0),
                "payment_method": payment.payment_method,
                "status": payment.status,
                "transaction_id": payment.transaction_id,
                "notes": payment.notes
            }
            for payment in payments
        ]
    }


# ==========================================================
# COMMUNICATION DASHBOARD
# ==========================================================
@app.get( "/api/admin/communication/dashboard", tags=["Admin Dashboard"] )
def admin_communication_dashboard( database: Session = Depends(db.get_db), current_user=Depends(crud.require_admin) ):

    user_id = crud.get_authenticated_user_id(current_user)

    # ======================================================
    # KPI
    # ======================================================
    total_messages = ( database .query(db.CommunicationMessage) .count() )
    active_discussions = ( database .query(db.CommunicationMessage.vendor_id) .filter( db.CommunicationMessage.vendor_id.isnot(None) ) .distinct() .count() )
    emails_sent = ( database .query(db.CommunicationActivity) .filter( db.CommunicationActivity.activity_type.ilike("Email") ) .count() )
    files_shared = ( database .query(db.CommunicationFile) .count() )
    communication_logs = ( database .query(db.CommunicationActivity) .count() )
    unread_messages = ( database .query(db.CommunicationMessage) .filter( db.CommunicationMessage.is_read == False ) .count() )
    vendors_communicated = ( database .query(db.CommunicationMessage.vendor_id) .filter( db.CommunicationMessage.vendor_id.isnot(None) ) .distinct() .count() )

    # ======================================================
    # RECENT FILES
    # ======================================================

    files = ( database .query(db.CommunicationFile) .order_by( db.CommunicationFile.created_at.desc() ) .limit(10) .all() )
    recent_files = []
    for item in files:
        vendor_name = "Unknown Vendor"
        if item.vendor:
            vendor_name = item.vendor.vendor_name
        recent_files.append({
            "id": item.id,
            "vendor_id": item.vendor_id,
            "vendor": vendor_name,
            "file_name": item.file_name or "",
            "file_size": item.file_size or 0,
            "file_type": item.file_type or "",
            "created_at":
                item.created_at.isoformat()
                if item.created_at
                else None
        })

    # ======================================================
    # RECENT ACTIVITY
    # ======================================================

    activities = ( database .query(db.CommunicationActivity) .order_by( db.CommunicationActivity.created_at.desc() ) .limit(10) .all() )
    recent_activity = []
    for activity in activities:
        vendor_name = "Unknown Vendor"
        if activity.vendor:
            vendor_name = activity.vendor.vendor_name
        recent_activity.append({
            "id": activity.id,
            "vendor": vendor_name,
            "type": activity.activity_type or "Message",
            "subject": activity.subject or "",
            "description": activity.description or "",
            "status": activity.status or "Sent",
            "created_at":
                activity.created_at.isoformat()
                if activity.created_at
                else None
        })

    # ======================================================
    # 30 DAY TREND
    # ======================================================
    today = datetime.utcnow().date()
    trend = []
    for i in range(29, -1, -1):
        day = today - timedelta(days=i)
        next_day = day + timedelta(days=1)
        count = (
            database .query(db.CommunicationMessage)
            .filter(
                db.CommunicationMessage.created_at >= datetime.combine( day, datetime.min.time() ),
                db.CommunicationMessage.created_at < datetime.combine( next_day, datetime.min.time() )
            )
            .count()
        )
        trend.append({ "date": day.isoformat(), "messages": count })

    # ======================================================
    # RETURN
    # ======================================================
    return {
        "kpis": {
            "total_messages": total_messages,
            "active_discussions": active_discussions,
            "emails_sent": emails_sent,
            "files_shared": files_shared,
            "communication_logs": communication_logs,
            "unread_messages": unread_messages
        },
        "overview": {
            "total_vendors_communicated": vendors_communicated,
            "active_conversations": active_discussions,
            "messages_this_month": total_messages,
            "avg_response_time": 0,
            "satisfaction_rate": 0
        },
        "recent_files": recent_files,
        "recent_activity": recent_activity,
        "trend": trend
    }


# ==========================================================
# GET CONVERSATIONS
# ==========================================================
@app.get( "/api/admin/communication/conversations", tags=["Admin Dashboard"] )
def get_conversations( search: str = "", database: Session = Depends(db.get_db), current_user=Depends(crud.require_admin_or_procurement_manager) ):

    user_id = crud.get_authenticated_user_id(current_user)
    vendors = ( database .query(db.Vendor) .join( db.CommunicationMessage, db.CommunicationMessage.vendor_id == db.Vendor.vendor_id ) .distinct() .all() )
    conversations = []
    for vendor in vendors:

        # --------------------------------------------------
        # SEARCH
        # --------------------------------------------------

        if search:
            search_value = ( f"%{search.strip()}%" )
            matching_message = (
                database .query(db.CommunicationMessage)
                .filter( db.CommunicationMessage.vendor_id == vendor.vendor_id )
                .filter( db.CommunicationMessage.message.ilike( search_value ) ) .first()
            )
            vendor_matches = ( search.strip().lower() in vendor.vendor_name.lower() )
            if not matching_message and not vendor_matches:
                continue

        # --------------------------------------------------
        # LAST MESSAGE
        # --------------------------------------------------

        last_message = (
            database .query(db.CommunicationMessage)
            .filter( db.CommunicationMessage.vendor_id == vendor.vendor_id )
            .order_by( db.CommunicationMessage.created_at.desc() ) .first()
        )

        if not last_message:
            continue

        # --------------------------------------------------
        # UNREAD VENDOR MESSAGES
        # --------------------------------------------------

        unread_count = (
            database .query(db.CommunicationMessage)
            .filter( db.CommunicationMessage.vendor_id == vendor.vendor_id )
            .filter( db.CommunicationMessage.sender_type == "vendor" )
            .filter( db.CommunicationMessage.is_read == False ) .count()
        )
        conversations.append({
            "id": vendor.id,
            "vendor_id": vendor.vendor_id,
            "vendor_name": vendor.vendor_name,
            "last_message": last_message.message or "",
            "last_message_time":
                last_message.created_at.isoformat()
                if last_message.created_at
                else None,
            "unread": unread_count
        })
    conversations.sort( key=lambda x: x["last_message_time"] or "", reverse=True )
    return conversations


# ==========================================================
# GET MESSAGES FOR VENDOR
# ==========================================================

@app.get("/api/admin/communication/conversations/{vendor_id}", tags=["Admin Dashboard"])
def get_vendor_messages( vendor_id: str, database: Session = Depends(db.get_db), current_user=Depends(crud.require_admin) ):
    user_id = crud.get_authenticated_user_id( current_user )

    # ------------------------------------------------------
    # FIND VENDOR
    # ------------------------------------------------------
    vendor = ( database .query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )
    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    # ------------------------------------------------------
    # GET MESSAGES
    # ------------------------------------------------------
    messages = (
        database
        .query(db.CommunicationMessage)
        .filter( db.CommunicationMessage.vendor_id == vendor_id )
        .order_by( db.CommunicationMessage.created_at.asc() )
        .all()
    )

    # ------------------------------------------------------
    # MARK VENDOR MESSAGES AS READ
    # ------------------------------------------------------
    for message in messages:
        if ( message.sender_type == "vendor" and not message.is_read ):
            message.is_read = True
    database.commit()

    # ------------------------------------------------------
    # RESPONSE
    # ------------------------------------------------------
    return {
        "vendor": {
            "id": vendor.id,
            "vendor_id": vendor.vendor_id,
            "vendor_name": vendor.vendor_name
        },
        "messages": [
            {
                "id": message.id,
                "message": message.message or "",
                "sender_type": message.sender_type or "vendor",
                "message_type": message.message_type or "Message",
                "is_read": message.is_read,
                "created_at":
                    (
                        message.created_at.isoformat()
                        if message.created_at
                        else None
                    )
            }
            for message in messages
        ]
    }


# ==========================================================
# SEND MESSAGE
# ==========================================================

@app.post("/api/admin/communication/conversations/{vendor_id}/messages", tags=["Admin Dashboard"])
def send_message_admin( vendor_id: str, payload: dict, database: Session = Depends(db.get_db), current_user=Depends(crud.require_admin) ):

    # ------------------------------------------------------
    # GET ADMIN ID
    # ------------------------------------------------------
    sender_id = crud.get_authenticated_user_id( current_user )

    # ------------------------------------------------------
    # FIND VENDOR
    # ------------------------------------------------------
    vendor = ( database .query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )
    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    # ------------------------------------------------------
    # MESSAGE
    # ------------------------------------------------------
    message_text = ( payload.get("message") or "" ).strip()
    if not message_text:
        raise HTTPException( status_code=400, detail="Message cannot be empty" )
    message = db.CommunicationMessage(
        vendor_id= vendor.vendor_id,
        sender_user_id= sender_id,
        sender_type= "admin",
        message= message_text,
        message_type= payload.get( "message_type", "Message" ),
        is_read= True
    )
    database.add(message)

    # ------------------------------------------------------
    # ACTIVITY
    # ------------------------------------------------------
    activity = db.CommunicationActivity(
        vendor_id= vendor.vendor_id,
        user_id= sender_id,
        activity_type= "Message",
        subject= f"Message to {vendor.vendor_name}",
        description= message_text,
        status= "Delivered"
    )
    database.add(activity)
    database.commit()
    database.refresh( message )
    return {
        "success": True,
        "message": {
            "id": message.id,
            "message": message.message,
            "sender_type": message.sender_type,
            "created_at":
            (
                message.created_at.isoformat()
                if message.created_at
                else None
            )
        }
    }


# ============================================================
# ADMIN COMMUNICATION - UNIFIED CONTACTS
# ============================================================

@app.get(
    "/api/admin/communication/contacts",
    tags=["Admin Dashboard"]
)
def admin_communication_contacts(
    target_type: str = Query("all"),
    search: str = Query(""),
    database: Session = Depends(db.get_db),
    current_user=Depends(crud.require_admin)
):

    return crud.get_admin_communication_contacts(
        database=database,
        current_user=current_user,
        target_type=target_type,
        search=search
    )


# ============================================================
# ADMIN COMMUNICATION - GET CONVERSATION
# ============================================================

@app.get(
    "/api/admin/communication/contacts/{target_type}/{target_id}",
    tags=["Admin Dashboard"]
)
def admin_get_target_conversation(
    target_type: str,
    target_id: str,
    database: Session = Depends(db.get_db),
    current_user=Depends(crud.require_admin)
):

    return crud.get_admin_target_messages(
        database=database,
        current_user=current_user,
        target_type=target_type,
        target_id=target_id
    )


# ============================================================
# ADMIN COMMUNICATION - SEND MESSAGE
# ============================================================

@app.post(
    "/api/admin/communication/contacts/{target_type}/{target_id}/messages",
    tags=["Admin Dashboard"]
)
def admin_send_target_message(
    target_type: str,
    target_id: str,
    payload: db.SendDirectMessage,
    database: Session = Depends(db.get_db),
    current_user=Depends(crud.require_admin)
):

    return crud.send_admin_target_message(
        database=database,
        current_user=current_user,
        target_type=target_type,
        target_id=target_id,
        message_text=payload.message
    )


# ==========================================================
# FILE UPLOAD
# ==========================================================
UPLOAD_DIR = Path("uploads/communication")

UPLOAD_DIR.mkdir( parents=True, exist_ok=True )

@app.post("/api/admin/communication/files/{vendor_id}", tags=["Admin Dashboard"])
def upload_communication_file( vendor_id: str, file: UploadFile = File(...), database: Session = Depends(db.get_db), current_user=Depends(crud.require_admin) ):

    # ------------------------------------------------------
    # ADMIN ID
    # ------------------------------------------------------
    admin_id = crud.get_authenticated_user_id( current_user )

    # ------------------------------------------------------
    # VENDOR
    # ------------------------------------------------------
    vendor = ( database .query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )
    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    # ------------------------------------------------------
    # FILE NAME
    # ------------------------------------------------------
    original_name = ( file.filename or "uploaded_file" )
    safe_name = ( f"{datetime.utcnow().timestamp()}_" f"{original_name}" )
    file_path = ( UPLOAD_DIR / safe_name )

    # ------------------------------------------------------
    # SAVE FILE
    # ------------------------------------------------------
    with open( file_path, "wb" ) as buffer:
        shutil.copyfileobj( file.file, buffer )

    # ------------------------------------------------------
    # FILE SIZE
    # ------------------------------------------------------
    size = os.path.getsize( file_path )
    size_mb = round( size / 1024 / 1024, 2 )

    # ------------------------------------------------------
    # DATABASE FILE
    # ------------------------------------------------------
    uploaded_file = db.CommunicationFile(
        vendor_id= vendor.vendor_id,
        uploaded_by= admin_id,
        file_name= original_name,
        file_path= str(file_path),
        file_size= size_mb,
        file_type= file.content_type or "application/octet-stream"
    )
    database.add( uploaded_file )

    # ------------------------------------------------------
    # ACTIVITY
    # ------------------------------------------------------
    activity = db.CommunicationActivity(
        vendor_id= vendor.vendor_id,
        user_id= admin_id,
        activity_type= "File Shared",
        subject= original_name,
        description= f"File shared with {vendor.vendor_name}",
        status= "Delivered"
    )
    database.add( activity )
    database.commit()
    database.refresh( uploaded_file )
    return {
        "success": True,
        "file": {
            "id": uploaded_file.id,
            "file_name": uploaded_file.file_name,
            "file_size": uploaded_file.file_size,
            "file_type": uploaded_file.file_type
        }
    }


# ==========================================================
# COMMUNICATION HISTORY
# ==========================================================
@app.get( "/api/admin/communication/history", tags=["Admin Dashboard"] )
def communication_history( database: Session = Depends(db.get_db), current_user=Depends(crud.require_admin) ):

    user_id = crud.get_authenticated_user_id(current_user)
    activities = ( database .query(db.CommunicationActivity) .order_by( db.CommunicationActivity.created_at.desc() ) .limit(100) .all() )
    result = []
    for item in activities:
        vendor_name = "Unknown Vendor"
        if item.vendor:
            vendor_name = item.vendor.vendor_name
        result.append({
            "id": item.id,
            "vendor": vendor_name,
            "type": item.activity_type or "Message",
            "subject": item.subject or "",
            "description": item.description or "",
            "status": item.status or "Sent",
            "created_at":
                item.created_at.isoformat()
                if item.created_at
                else None
        })
    return result


# ==========================================================
# PROCUREMENT DISCUSSIONS
# ==========================================================
@app.get( "/api/admin/communication/discussions", tags=["Admin Dashboard"] )
def procurement_discussions( database: Session = Depends(db.get_db), current_user=Depends(crud.require_admin) ):

    user_id = crud.get_authenticated_user_id(current_user)
    messages = ( database .query(db.CommunicationMessage) .order_by( db.CommunicationMessage.created_at.desc() ) .limit(100) .all() )
    result = []
    for message in messages:
        vendor_name = "Unknown Vendor"
        vendor = ( database .query(db.Vendor) .filter( db.Vendor.vendor_id == message.vendor_id ) .first() )
        if vendor:
            vendor_name = vendor.vendor_name
        result.append({
            "id": message.id,
            "vendor_id": message.vendor_id,
            "vendor": vendor_name,
            "message": message.message or "",
            "message_type": message.message_type or "Message",
            "sender_type": message.sender_type or "",
            "is_read": message.is_read,
            "created_at":
                message.created_at.isoformat()
                if message.created_at
                else None
        })
    return result


# ==========================================================
# EMAIL NOTIFICATIONS
# ==========================================================
@app.get( "/api/admin/communication/email-notifications", tags=["Admin Dashboard"] )
def email_notifications( database: Session = Depends(db.get_db), current_user=Depends(crud.require_admin) ):

    user_id = crud.get_authenticated_user_id(current_user)
    activities = ( database
        .query(db.CommunicationActivity)
        .filter( db.CommunicationActivity.activity_type.ilike( "Email" ) )
        .order_by( db.CommunicationActivity.created_at.desc() ) .limit(100) .all() )
    result = []
    for activity in activities:
        vendor_name = "Unknown Vendor"
        if activity.vendor:
            vendor_name = activity.vendor.vendor_name
        result.append({
            "id": activity.id,
            "vendor_id": activity.vendor_id,
            "vendor": vendor_name,
            "type": activity.activity_type or "Email",
            "subject": activity.subject or "",
            "description": activity.description or "",
            "status": activity.status or "Sent",
            "created_at":
                activity.created_at.isoformat()
                if activity.created_at
                else None
        })
    return result


# ==========================================================
# GET SHARED FILES
# ==========================================================
@app.get( "/api/admin/communication/files", tags=["Admin Dashboard"] )
def get_shared_files( database: Session = Depends(db.get_db), current_user=Depends(crud.require_admin) ):

    user_id = crud.get_authenticated_user_id(current_user)
    files = ( database .query(db.CommunicationFile) .order_by( db.CommunicationFile.created_at.desc() ) .limit(100) .all() )
    result = []
    for item in files:
        vendor_name = "Unknown Vendor"
        if item.vendor:
            vendor_name = item.vendor.vendor_name
        result.append({
            "id": item.id,
            "vendor_id": item.vendor_id,
            "vendor": vendor_name,
            "file_name": item.file_name or "",
            "file_size": item.file_size or 0,
            "file_type": item.file_type or "",
            "created_at":
                item.created_at.isoformat()
                if item.created_at
                else None
        })
    return result


# ==========================================================
# ACTIVITY LOGS
# ==========================================================
@app.get( "/api/admin/communication/activity", tags=["Admin Dashboard"] )
def communication_activity_logs( database: Session = Depends(db.get_db), current_user=Depends(crud.require_admin) ):

    user_id = crud.get_authenticated_user_id(current_user)
    activities = ( database .query(db.CommunicationActivity) .order_by( db.CommunicationActivity.created_at.desc() ) .limit(100) .all() )

    result = []
    for activity in activities:
        vendor_name = "Unknown Vendor"
        if activity.vendor:
            vendor_name = activity.vendor.vendor_name
        result.append({
            "id": activity.id,
            "vendor_id": activity.vendor_id,
            "vendor": vendor_name,
            "type": activity.activity_type or "Message",
            "subject": activity.subject or "",
            "description": activity.description or "",
            "status": activity.status or "Sent",
            "created_at":
                activity.created_at.isoformat()
                if activity.created_at
                else None
        })
    return result


# ============================================================
# PERFORMANCE REPORTS DASHBOARD
# ============================================================

@app.get( "/api/admin/performance/dashboard", tags=["Admin Dashboard"] )
def performance_reports_dashboard(
    from_date: Optional[date] = Query( None ),
    to_date: Optional[date] = Query( None ),
    category: Optional[str] = Query( None ),
    vendor_id: Optional[str] = Query( None ),
    database: Session = Depends( db.get_db )
):

    return crud.build_performance_report(
        database=database, from_date=from_date, to_date=to_date, category=category, vendor_id=vendor_id
    )


# ============================================================
# PERFORMANCE REPORT - VENDORS
# ============================================================

@app.get( "/api/admin/performance/vendors", tags=["Admin Dashboard"] )
def performance_report_vendors(
    search: Optional[str] = Query( None ),
    category: Optional[str] = Query( None ),
    database: Session = Depends( db.get_db )
):

    query = database.query( db.Vendor )

    if search:
        query = query.filter( db.Vendor.vendor_name.ilike( f"%{search}%" ) )

    if category:
        query = query.filter( db.Vendor.category == category )

    vendors = query.all()

    return {
        "vendors": [
            {
                "vendor_id": vendor.vendor_id,
                "vendor_name": vendor.vendor_name,
                "category": vendor.category or "General",
                "reliability_score": float( vendor.reliability_score or 0 ),
                "quality_score": float( vendor.quality_score or 0 ),
                "delivery_score": float( vendor.delivery_score or 0 ),
                "service_score": float( vendor.service_score or 0 ),
                "trend": vendor.trend or "flat"
            }
            for vendor in vendors
        ],
        "total": len(vendors)
    }


# ==========================================================
# REPORT DIRECTORY
# ==========================================================

REPORT_DIR = Path("generated_reports")

REPORT_DIR.mkdir(
    exist_ok=True
)


# ==========================================================
# REPORT CATEGORY COUNTS
# ==========================================================

@app.get("/api/admin/reports/categories", tags=["Admin Dashboard"])
def report_categories( database: Session = Depends(db.get_db) ):

    vendor_count = database.query(db.Vendor).count()
    purchase_order_count = database.query( db.PurchaseOrder ).count()
    contract_count = database.query( db.Contract ).count()
    invoice_count = database.query( db.Invoice ).count()

    return {
        "vendor_performance": vendor_count,
        "procurement": purchase_order_count,
        "purchase_orders": purchase_order_count,
        "compliance": contract_count,
        "contracts": contract_count,
        "custom": 0
    }


# ==========================================================
# DASHBOARD SUMMARY
# ==========================================================

@app.get( "/api/admin/reports/dashboard", tags=["Admin Dashboard"] )
def reports_dashboard( database: Session = Depends(db.get_db) ):

    now = datetime.now()

    month_start = datetime( now.year, now.month, 1 )

    total_reports = ( database .query(db.Report) .count() )

    generated_this_month = ( database.query(db.Report) .filter( db.Report.generated_at >= month_start ) .count() )

    total_downloads = ( database .query( func.coalesce( func.sum( db.Report.download_count ), 0 ) ) .scalar() )

    scheduled_reports = ( database .query(db.ScheduledReport) .filter( db.ScheduledReport.is_active == True ) .count() )

    return {
        "total_reports": total_reports,
        "generated_this_month": generated_this_month,
        "total_downloads": int( total_downloads or 0 ),
        "scheduled_reports": scheduled_reports
    }


@app.get( "/api/admin/reports/export/csv/{report_type}", tags=["Admin Dashboard"] )
def export_csv(
    report_type: str, from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None), database: Session = Depends(db.get_db)
):

    if report_type == "vendor-performance":
        title = "Vendor Performance"
        headers = [ "Vendor ID", "Vendor", "Category", "Reliability", "Quality", "Delivery", "Service", "Status" ]
        data = crud.vendor_performance_data( database )
        category = "vendor-performance"
        description = ( "Overall vendor performance score and KPIs" )

    elif report_type == "procurement":
        title = "Procurement"
        headers = [ "PO Number", "Vendor", "Amount", "Status", "Order Date", "Expected", "Actual" ]
        data = crud.procurement_data( database )
        category = "procurement"
        description = ( "Procurement summary, status and trends" )

    elif report_type == "purchase-orders":
        title = "Purchase Orders"
        headers = [ "PO Number", "Vendor", "Amount", "Status", "Order Date", "Expected", "Actual" ]
        data = crud.purchase_order_data( database )
        category = "purchase-orders"
        description = ( "Purchase orders summary, status and trends" )

    elif report_type == "compliance":
        title = "Compliance"
        headers = [ "Contract", "Vendor",  "Status", "Compliance" ]
        data = crud.compliance_data( database )
        category = "compliance"
        description = ( "Compliance status, documents and expiries" )

    elif report_type == "contracts":
        title = "Contracts"
        headers = [ "Contract", "Vendor", "Status", "Start Date", "End Date" ]
        data = crud.contract_data( database )
        category = "contracts"
        description = ( "Contract details, values and expiry overview" )

    else:
        raise HTTPException( status_code=400, detail="Invalid report type" )


    timestamp = datetime.now().strftime( "%Y%m%d_%H%M%S" )

    filename = ( f"{report_type}_{timestamp}.csv" )

    filepath = REPORT_DIR / filename


    with open( filepath, "w", newline="", encoding="utf-8" ) as csv_file:

        writer = csv.writer(csv_file)

        writer.writerow(headers)

        writer.writerows(data)


    file_size_bytes = filepath.stat().st_size


    report = db.Report(
        report_name=title,
        category=category,
        report_type=report_type,
        description=description,
        generated_by="System",
        generated_at=datetime.utcnow(),
        from_date=from_date,
        to_date=to_date,
        format="CSV",
        file_path=str(filepath),
        file_size=crud.format_bytes( file_size_bytes ),
        download_count=0
    )

    database.add(report)

    database.commit()

    database.refresh(report)


    return FileResponse( path=str(filepath), filename=filename, media_type="text/csv" )


# ==========================================================
# AUDITOR REPORTS OVERVIEW API
# ==========================================================

@app.get( "/api/admin/reports/overview", tags=["Auditor Dashboard"] )
def auditor_reports_overview(
    search: Optional[str] = Query(None),
    report_type: Optional[str] = Query(None),
    audit: Optional[str] = Query(None),
    prepared_by: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    trend_months: int = Query( 6, ge=1, le=12 ),
    database: Session = Depends( db.get_db )
):

    return crud.get_auditor_reports_overview(
        database=database,
        search=search,
        report_type=report_type,
        audit=audit,
        prepared_by=prepared_by,
        from_date=from_date,
        to_date=to_date,
        trend_months=trend_months
    )


# ==========================================================
# AUDITOR REPORT FILTER OPTIONS
# ==========================================================

@app.get( "/api/admin/reports/filter-options", tags=["Auditor Dashboard"] )
def auditor_report_filter_options( database: Session = Depends(db.get_db) ):

    reports = ( database .query(db.Report) .order_by( db.Report.generated_at.desc() ) .all() )

    # --------------------------------------------------------
    # Audit / Assignment values
    # --------------------------------------------------------

    audits = []

    seen_audits = set()

    for report in reports:
        value = ( report.description or "" ).strip()
        if ( value and value not in seen_audits ):
            seen_audits.add(value)
            audits.append(value)

    # --------------------------------------------------------
    # Prepared By
    # --------------------------------------------------------

    auditors = []

    seen_auditors = set()

    for report in reports:
        value = ( report.generated_by or "" ).strip()
        if ( value and value not in seen_auditors ):
            seen_auditors.add(value)
            auditors.append(value)

    return {
        "report_types": [
            "Audit Report",
            "Compliance Report",
            "Summary Report",
            "Exception Report",
            "Other Reports"
        ],
        "audits": audits,
        "prepared_by": auditors
    }


@app.get( "/api/admin/reports/{report_id}/download", tags=["Admin Dashboard"] )
def download_report( report_id: int, database: Session = Depends(db.get_db) ):

    report = ( database .query(db.Report).filter( db.Report.id == report_id ) .first() )

    if not report:
        raise HTTPException( status_code=404, detail="Report not found" )


    if not report.file_path:
        raise HTTPException( status_code=404, detail="Report file path is not available" )


    filepath = Path( report.file_path )


    if not filepath.exists():
        raise HTTPException( status_code=404, detail="Physical report file not found" )


    report.download_count = ( report.download_count or 0 ) + 1

    report.last_downloaded_at = ( datetime.utcnow() )

    database.commit()


    media_types = {
        "PDF": "application/pdf",
        "CSV": "text/csv",
        "EXCEL": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "XLSX": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }


    return FileResponse(
        path=str(filepath),
        filename=filepath.name,
        media_type=media_types.get( report.format.upper(), "application/octet-stream" )
    )


# ============================================================
# PERFORMANCE REPORT FILTERS
# ============================================================

@app.get( "/api/admin/performance/filters", tags=["Admin Dashboard"] )
def performance_report_filters( database: Session = Depends( db.get_db ) ):

    categories = (
        database .query(db.Vendor.category) .filter( db.Vendor.category.isnot(None) )
        .distinct() .order_by( db.Vendor.category.asc() ) .all()
    )

    vendors = (
        database .query( db.Vendor.vendor_id, db.Vendor.vendor_name )
        .order_by( db.Vendor.vendor_name.asc() ) .all()
    )

    return {
        "categories": [
            row[0]
            for row in categories
        ],
        "vendors": [
            { "vendor_id": row.vendor_id, "vendor_name": row.vendor_name }
            for row in vendors
        ]
    }


# ==========================================================
# RECENT REPORTS
# ==========================================================

@app.get("/api/admin/reports/recent", tags=["Admin Dashboard"])
def recent_reports(
    limit: int = Query( 10, ge=1, le=100 ), database: Session = Depends(db.get_db) ):
    reports = ( database.query(db.Report) .order_by( db.Report.generated_at.desc() ) .limit(limit) .all() )

    return [
        {
            "id": report.id,
            "report_name": report.report_name,
            "category": report.category,
            "generated_by": report.generated_by,
            "generated_at": report.generated_at,
            "format": report.format,
            "file_size": report.file_size
        }
        for report in reports
    ]


# ==========================================================
# SCHEDULED REPORTS
# ==========================================================

@app.get("/api/admin/reports/scheduled",tags=["Admin Dashboard"])
def scheduled_reports( database: Session = Depends(db.get_db) ):

    reports = ( database.query(db.ScheduledReport).order_by( db.ScheduledReport.next_run.asc() ) .all() )
    
    return [
        {
            "id": report.id,
            "report_name": report.report_name,
            "schedule": report.schedule,
            "next_run": report.next_run,
            "recipients": report.recipients,
            "format": report.format,
            "status": report.status,
            "is_active": report.is_active
        }
        for report in reports
    ]


@app.post( "/api/admin/reports/scheduled", response_model=db.PerformanceReportScheduleResponse, tags=["Admin Dashboard"] )
def create_performance_report_schedule( data: db.PerformanceReportScheduleCreate, database: Session = Depends( db.get_db ) ):

    schedule = db.ScheduledReport(
        report_name=data.report_name,
        schedule=data.schedule,
        next_run=data.next_run,
        recipients=data.recipients,
        format=data.format,
        status=data.status,
        is_active=data.is_active
    )

    database.add(schedule)

    database.commit()

    database.refresh(schedule)

    return schedule


@app.put(
    "/api/admin/reports/scheduled/{schedule_id}",
    response_model=db.PerformanceReportScheduleResponse,
    tags=["Admin Dashboard"]
)
def update_performance_report_schedule(
    schedule_id: int,
    data: db.PerformanceReportScheduleCreate,
    database: Session = Depends( db.get_db )
):

    schedule = ( database .query(db.ScheduledReport) .filter( db.ScheduledReport.id == schedule_id ) .first() )

    if schedule is None:
        raise HTTPException( status_code=404, detail="Scheduled report not found." )

    schedule.report_name = data.report_name
    schedule.schedule = data.schedule
    schedule.next_run = data.next_run
    schedule.recipients = data.recipients
    schedule.format = data.format
    schedule.status = data.status
    schedule.is_active = data.is_active

    database.commit()

    database.refresh(schedule)

    return schedule


@app.delete( "/api/admin/reports/scheduled/{schedule_id}", tags=["Admin Dashboard"] )
def delete_performance_report_schedule( schedule_id: int, database: Session = Depends( db.get_db ) ):

    schedule = (
        database.query(db.ScheduledReport).filter( db.ScheduledReport.id == schedule_id ).first()
    )

    if schedule is None:
        raise HTTPException( status_code=404, detail="Scheduled report not found." )

    database.delete(schedule)

    database.commit()

    return { "success": True, "message": "Schedule deleted successfully." }


# ==========================================================
# GENERATE PDF
# ==========================================================

@app.get("/api/admin/reports/export/pdf/{report_type}", tags=["Admin Dashboard"])
def export_pdf( report_type: str, database: Session = Depends(db.get_db) ):

    if report_type == "vendor-performance":
        title = "Vendor Performance Report"
        headers = [ "Vendor ID", "Vendor", "Category", "Reliability", "Quality", "Delivery", "Service", "Status" ]
        data = crud.vendor_performance_data(database)

    elif report_type == "procurement":
        title = "Procurement Report"
        headers = [ "PO Number", "Vendor", "Amount", "Status", "Order Date", "Expected", "Actual" ]
        data = crud.procurement_data(database)

    elif report_type == "purchase-orders":
        title = "Purchase Order Report"
        headers = [ "PO Number", "Vendor", "Amount", "Status", "Order Date", "Expected", "Actual" ]
        data = crud.purchase_order_data(database)

    elif report_type == "compliance":
        title = "Compliance Report"
        headers = [ "Contract", "Vendor", "Status", "Compliance" ]
        data = crud.compliance_data(database)

    elif report_type == "contracts":
        title = "Contract Report"
        headers = [ "Contract", "Vendor", "Status", "Start Date", "End Date" ]
        data = crud.contract_data(database)

    else:
        raise HTTPException( status_code=400, detail="Invalid report type" )

    timestamp = datetime.now().strftime( "%Y%m%d_%H%M%S" )
    filename = ( f"{report_type}_{timestamp}.pdf" )
    filepath = REPORT_DIR / filename

    document = SimpleDocTemplate(
        str(filepath),
        pagesize=landscape(A4),
        rightMargin=20,
        leftMargin=20,
        topMargin=30,
        bottomMargin=30
    )

    styles = getSampleStyleSheet()
    elements = [ Paragraph( title, styles["Title"] ), Spacer( 1, 20 ) ]
    table_data = [ headers ] + data
    table = Table( table_data, repeatRows=1 )

    table.setStyle(
        TableStyle([
            ( "BACKGROUND", (0, 0), (-1, 0), colors.HexColor( "#312e81" ) ),

            ( "TEXTCOLOR", (0, 0), (-1, 0), colors.white ),

            ( "FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold" ),

            ( "FONTSIZE", (0, 0), (-1, -1), 7 ),

            ( "GRID", (0, 0), (-1, -1), 0.3, colors.grey ),

            ( "VALIGN", (0, 0), (-1, -1), "MIDDLE" ),

            ( "ROWBACKGROUNDS", (0, 1), (-1, -1), [ colors.white, colors.HexColor("#f8faff") ] )
        ])
    )
    elements.append(table)
    document.build(elements)

    file_size_bytes = filepath.stat().st_size

    report = db.Report(
        report_name=title,
        category=report_type,
        report_type=report_type,
        description=title,
        generated_by="System",
        generated_at=datetime.utcnow(),
        format="PDF",
        file_path=str(filepath),
        file_size=crud.format_bytes(file_size_bytes),
        download_count=0
    )

    database.add(report)
    database.commit()
    database.refresh(report)

    return FileResponse(
        path=str(filepath),
        filename=filename,
        media_type="application/pdf"
    )


# ==========================================================
# GENERATE EXCEL
# ==========================================================

@app.get("/api/admin/reports/export/excel/{report_type}", tags=["Admin Dashboard"])
def export_excel( report_type: str, database: Session = Depends(db.get_db) ):

    if report_type == "vendor-performance":
        title = "Vendor Performance"
        headers = [ "Vendor ID", "Vendor", "Category", "Reliability", "Quality", "Delivery", "Service", "Status" ]
        data = crud.vendor_performance_data(database)

    elif report_type == "procurement":
        title = "Procurement"
        headers = [ "PO Number", "Vendor", "Amount", "Status", "Order Date", "Expected", "Actual" ]
        data = crud.procurement_data(database)

    elif report_type == "purchase-orders":
        title = "Purchase Orders"
        headers = [ "PO Number", "Vendor", "Amount", "Status", "Order Date", "Expected", "Actual" ]
        data = crud.purchase_order_data(database)

    elif report_type == "compliance":
        title = "Compliance"
        headers = [ "Contract", "Vendor", "Status", "Compliance" ]
        data = crud.compliance_data(database)

    elif report_type == "contracts":
        title = "Contracts"
        headers = [ "Contract", "Vendor", "Status", "Start Date", "End Date" ]
        data = crud.contract_data(database)

    else:
        raise HTTPException( status_code=400, detail="Invalid report type" )

    timestamp = datetime.now().strftime( "%Y%m%d_%H%M%S" )
    filename = ( f"{report_type}_{timestamp}.xlsx" )
    filepath = REPORT_DIR / filename
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = title[:31]
    worksheet.append(headers)

    for cell in worksheet[1]:
        cell.font = Font( bold=True )
        cell.alignment = Alignment( horizontal="center" )

    for row in data:
        worksheet.append(row)

    for column in worksheet.columns:
        max_length = 0
        column_letter = ( column[0].column_letter )

        for cell in column:
            try:
                max_length = max( max_length, len(str(cell.value or "")) )
            except:
                pass

        worksheet.column_dimensions[ column_letter ].width = min( max_length + 3, 35 )

    workbook.save(filepath)

    file_size_bytes = filepath.stat().st_size

    report = db.Report(
        report_name=title,
        category=report_type,
        report_type=report_type,
        description=title,
        generated_by="System",
        generated_at=datetime.utcnow(),
        format="EXCEL",
        file_path=str(filepath),
        file_size=crud.format_bytes(file_size_bytes),
        download_count=0
    )

    database.add(report)

    database.commit()

    database.refresh(report)

    return FileResponse(
        path=str(filepath),
        filename=filename,
        media_type=( "application/vnd.openxmlformats-" "officedocument.spreadsheetml.sheet" )
    )


@app.get( "/api/admin/reports/page", response_model=db.FinancialReportPageResponse, tags=["Admin Dashboard"] )
def financial_reports_page_data(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query( 1, ge=1 ),
    limit: int = Query( 5, ge=1, le=100 ),
    database: Session = Depends( db.get_db ),
    current_user=Depends( crud.require_roles( [ "Admin", "Finance Officer" ] ) )
):

    if ( from_date and to_date and from_date > to_date ):
        raise HTTPException( status_code=400, detail=( "from_date cannot be after to_date" ) )

    return crud.get_financial_reports_page(
        database=database, from_date=from_date, to_date=to_date, 
        search=search, page=page, limit=limit
    )


@app.post( "/api/admin/reports/{report_id}/view", tags=["Admin Dashboard"] )
def view_report(
    report_id: int,
    database: Session = Depends( db.get_db ),
    current_user=Depends( crud.require_roles( [ "Admin", "Finance Officer" ]
        )
    )
):

    report = crud.mark_report_viewed( database, report_id )

    return {
        "success": True,
        "id": report.id,
        "report_name": report.report_name,
        "category": report.category,
        "format": report.format,
        "status": getattr( report, "status", "Completed" ),
        "view_count": report.view_count,
        "download_count": report.download_count
    }


# ==========================================================
# VIEW SINGLE REPORT
# ==========================================================

@app.get("/api/admin/reports/{report_id}", tags=["Admin Dashboard"])
def get_report( report_id: int, database: Session = Depends(db.get_db) ):

    report = ( database.query(db.Report) .filter( db.Report.id == report_id ) .first() )
    
    if not report:
        raise HTTPException( status_code=404, detail="Report not found" )
    
    return {
        "id": report.id,
        "report_name": report.report_name,
        "category": report.category,
        "generated_by": report.generated_by,
        "generated_at": report.generated_at,
        "format": report.format,
        "file_size": report.file_size
    }


# ==========================================================
# NOTIFICATION SETTINGS
# ==========================================================

@app.get( "/api/notifications/settings", response_model=db.NotificationSettingsResponse, tags=["Admin Dashboard"] )
def get_notification_settings( database: Session = Depends(db.get_db), current_user=Depends(crud.get_current_user) ):

    user_id = crud.get_user_id(current_user)

    settings = ( database.query(db.NotificationSettings) .filter( db.NotificationSettings.user_id == user_id ) .first() )

    if settings is None:
        settings = db.NotificationSettings( user_id=user_id )

        database.add(settings)
        database.commit()
        database.refresh(settings)

    return settings


@app.put( "/api/notifications/settings", response_model=db.NotificationSettingsResponse, tags=["Admin Dashboard"] )
def update_notification_settings(
    data: db.NotificationSettingsUpdate,
    database: Session = Depends(db.get_db),
    current_user=Depends(crud.get_current_user)
):

    user_id = crud.get_user_id(current_user)

    settings = ( database.query(db.NotificationSettings) .filter( db.NotificationSettings.user_id == user_id ) .first() )

    if settings is None:
        settings = db.NotificationSettings( user_id=user_id )

        database.add(settings)

    settings.email_enabled = data.email_enabled
    settings.vendor_registration = data.vendor_registration
    settings.po_updates = data.po_updates
    settings.contract_expiration = data.contract_expiration
    settings.sms_enabled = data.sms_enabled
    settings.urgent_sms = data.urgent_sms
    settings.browser_notifications = data.browser_notifications
    settings.notification_sound = data.notification_sound

    database.commit()
    database.refresh(settings)

    return settings


# ==========================================================
# EMAIL TEMPLATES
# ==========================================================

@app.get( "/api/notifications/email-templates", response_model=list[db.EmailTemplateResponse], tags=["Admin Dashboard"] )
def get_email_templates(
    database: Session = Depends(db.get_db),
    current_user=Depends(crud.get_current_user)
):

    templates = ( database.query(db.EmailTemplate) .order_by( db.EmailTemplate.created_at.desc() ) .all() )

    return templates


@app.post(
    "/api/notifications/email-templates",
    response_model=db.EmailTemplateResponse,
    status_code=status.HTTP_201_CREATED, tags=["Admin Dashboard"]
)
def create_email_template(
    template_data: db.EmailTemplateCreate,
    database: Session = Depends(db.get_db),
    current_user=Depends(crud.get_current_user)
):

    existing_template = ( database.query(db.EmailTemplate) .filter( db.EmailTemplate.template_name == template_data.template_name ) .first() )


    if existing_template:
        raise HTTPException( status_code=400, detail="An email template with this name already exists." )


    template = db.EmailTemplate(

        template_name = template_data.template_name,

        subject = template_data.subject,

        body = template_data.body,

        status = template_data.status,

        created_by = current_user.id

    )

    database.add(template)
    database.commit()
    database.refresh(template)

    return template


@app.put(
    "/api/notifications/email-templates/{template_id}",
    response_model=db.EmailTemplateResponse, tags=["Admin Dashboard"]
)
def update_email_template(
    template_id: int,
    data: db.EmailTemplateUpdate,
    database: Session = Depends(db.get_db),
    current_user=Depends(crud.get_current_user)
):

    template = ( database.query(db.EmailTemplate) .filter( db.EmailTemplate.id == template_id ) .first() )

    if template is None:
        raise HTTPException( status_code=404, detail="Email template not found" )

    duplicate = ( database.query(db.EmailTemplate) .filter( db.EmailTemplate.template_name == data.template_name, db.EmailTemplate.id != template_id ) .first() )

    if duplicate:
        raise HTTPException( status_code=400, detail="Another email template with this name already exists." )

    template.template_name = data.template_name
    template.subject = data.subject
    template.body = data.body
    template.status = data.status

    database.commit()
    database.refresh(template)

    return template


@app.delete( "/api/notifications/email-templates/{template_id}", tags=["Admin Dashboard"])
def delete_email_template(
    template_id: int,
    database: Session = Depends(db.get_db),
    current_user=Depends(crud.get_current_user)
):

    template = ( database.query(db.EmailTemplate) .filter( db.EmailTemplate.id == template_id ) .first() )

    if template is None:
        raise HTTPException( status_code=404, detail="Email template not found" )

    database.delete(template)
    database.commit()

    return { "success": True, "message": "Email template deleted successfully", "id": template_id }


# ==========================================================
# SMS TEMPLATES
# ==========================================================

@app.get( "/api/notifications/sms-templates", response_model=list[db.SMSTemplateResponse], tags=["Admin Dashboard"] )
def get_sms_templates(
    database: Session = Depends(db.get_db),
    current_user=Depends(crud.get_current_user)
):

    templates = ( database.query(db.SMSTemplate) .order_by( db.SMSTemplate.created_at.desc() ) .all() )

    return templates


@app.post( "/api/notifications/sms-templates", response_model=db.SMSTemplateResponse, status_code=status.HTTP_201_CREATED, tags=["Admin Dashboard"] )
def create_sms_template( data: db.SMSTemplateCreate, database: Session = Depends(db.get_db), current_user=Depends(crud.get_current_user) ):

    user_id = crud.get_user_id(current_user)

    if len(data.message) > 160:
        raise HTTPException( status_code=422, detail="SMS message cannot exceed 160 characters" )

    template = db.SMSTemplate(
        template_name=data.template_name,
        message=data.message,
        status=data.status,
        created_by=user_id
    )

    database.add(template)
    database.commit()
    database.refresh(template)

    return template


@app.put( "/api/notifications/sms-templates/{template_id}", response_model=db.SMSTemplateResponse, tags=["Admin Dashboard"] )
def update_sms_template(
    template_id: int,
    data: db.SMSTemplateUpdate,
    database: Session = Depends(db.get_db),
    current_user=Depends(crud.get_current_user)
):

    if len(data.message) > 160:
        raise HTTPException( status_code=422, detail="SMS message cannot exceed 160 characters" )

    template = ( database.query(db.SMSTemplate) .filter( db.SMSTemplate.id == template_id ) .first() )

    if template is None:
        raise HTTPException( status_code=404, detail="SMS template not found" )

    template.template_name = data.template_name
    template.message = data.message
    template.status = data.status

    database.commit()
    database.refresh(template)

    return template


@app.delete( "/api/notifications/sms-templates/{template_id}", tags=["Admin Dashboard"] )
def delete_sms_template(
    template_id: int,
    database: Session = Depends(db.get_db),
    current_user=Depends(crud.get_current_user)
):

    template = ( database.query(db.SMSTemplate) .filter( db.SMSTemplate.id == template_id ) .first() )

    if template is None:
        raise HTTPException( status_code=404, detail="SMS template not found" )

    database.delete(template)
    database.commit()

    return { "success": True, "message": "SMS template deleted successfully" }


# ==========================================================
# NOTIFICATION LOGS
# ==========================================================

@app.get( "/api/notifications/logs", response_model=list[db.NotificationLogResponse], tags=["Admin Dashboard"] )
def get_notification_logs(
    search: Optional[str] = None,
    notification_type: Optional[str] = None,
    log_status: Optional[str] = None,
    database: Session = Depends(db.get_db),
    current_user=Depends(crud.get_current_user)
):

    query = database.query(db.NotificationLog)

    if search:
        search_value = f"%{search}%"
        query = query.filter(
            ( db.NotificationLog.recipient.ilike( search_value ) )
            |
            ( db.NotificationLog.subject.ilike( search_value ) )
        )

    if notification_type and notification_type != "All":
        query = query.filter( db.NotificationLog.notification_type == notification_type )

    if log_status and log_status != "All":
        query = query.filter( db.NotificationLog.status == log_status )

    return ( query .order_by( db.NotificationLog.id.desc() ) .all() )


# ==========================================================
# LOG STATISTICS
# ==========================================================

@app.get( "/api/notifications/logs/statistics", tags=["Admin Dashboard"] )
def get_notification_log_statistics( database: Session = Depends(db.get_db), current_user=Depends(crud.get_current_user) ):

    total = ( database.query(db.NotificationLog) .count() )

    successful = ( database.query(db.NotificationLog) .filter( db.NotificationLog.status == "Sent" ) .count() )

    failed = ( database.query(db.NotificationLog) .filter( db.NotificationLog.status == "Failed" ) .count() )

    return { "total_sent": total, "successful": successful, "failed": failed }


# ==========================================================
# GET ALL NOTIFICATIONS
# ==========================================================

@app.get( "/api/notifications", response_model=dict, tags=["Admin Dashboard"] )
def get_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    channel: Optional[str] = None,
    status: Optional[str] = None,
    database: Session = Depends(db.get_db),
    current_user=Depends(crud.get_current_user)
):

    # ------------------------------------------------------
    # BASE QUERY
    # ------------------------------------------------------

    query = database.query(db.Notification)

    # ------------------------------------------------------
    # SEARCH
    # ------------------------------------------------------

    if search:
        search_value = f"%{search}%"
        query = query.filter(
            (db.Notification.title.ilike(search_value)) | (db.Notification.message.ilike(search_value))
        )

    # ------------------------------------------------------
    # CATEGORY
    # ------------------------------------------------------

    if category:
        query = query.filter( db.Notification.category == category )

    # ------------------------------------------------------
    # PRIORITY
    # ------------------------------------------------------

    if priority:
        query = query.filter( db.Notification.priority == priority )

    # ------------------------------------------------------
    # CHANNEL
    # ------------------------------------------------------

    if channel:
        query = query.filter( db.Notification.channel == channel )

    # ------------------------------------------------------
    # STATUS
    # ------------------------------------------------------

    if status:
        query = query.filter( db.Notification.status == status )

    # ------------------------------------------------------
    # TOTAL
    # ------------------------------------------------------

    total = query.count()

    # ------------------------------------------------------
    # PAGINATION
    # ------------------------------------------------------

    offset = (page - 1) * limit

    notifications = ( query .order_by(db.Notification.created_at.desc())
        .offset(offset) .limit(limit) .all()
    )

    # ------------------------------------------------------
    # CONVERT SQLALCHEMY OBJECTS TO JSON-SAFE DATA
    # ------------------------------------------------------

    items = []

    for notification in notifications:

        items.append({
            "id": notification.id,
            "notification_type": getattr( notification, "notification_type", None ),
            "title": getattr( notification, "title", None ),
            "message": getattr( notification, "message", None ),
            "category": getattr( notification, "category", None ),
            "priority": getattr( notification, "priority", None ),
            "channel": getattr( notification, "channel", None ),
            "status": getattr( notification, "status", None ),
            "reference_id": getattr( notification, "reference_id", None ),
            "recipient_email": getattr( notification, "recipient_email", None ),
            "recipient_phone": getattr( notification, "recipient_phone", None ),
            "is_email_sent": getattr( notification, "is_email_sent", False ),
            "is_sms_sent": getattr( notification, "is_sms_sent", False ),
            "created_at": (
                notification.created_at.isoformat()
                if getattr(notification, "created_at", None)
                else None
            ),
            "updated_at": (
                notification.updated_at.isoformat()
                if getattr(notification, "updated_at", None)
                else None
            )
        })

    # ------------------------------------------------------
    # TOTAL PAGES
    # ------------------------------------------------------

    total_pages = ( (total + limit - 1) // limit if total else 1 )

    # ------------------------------------------------------
    # JSON-SAFE RESPONSE
    # ------------------------------------------------------

    return {
        "items": items, "total": total, "page": page, "limit": limit, "total_pages": total_pages
    }


# ==========================================================
# STATISTICS
# ==========================================================

@app.get("/api/notifications/statistics", response_model=db.NotificationStats, tags=["Admin Dashboard"])
def get_notification_statistics( database: Session = Depends(db.get_db), current_user = Depends(crud.get_current_user) ):

    total = database.query( db.Notification ).count()
    unread = database.query( db.Notification ).filter( db.Notification.status == "Unread" ).count()
    high_priority = database.query( db.Notification ).filter( db.Notification.priority == "High" ).count()
    email_sent = database.query( db.Notification ).filter( db.Notification.is_email_sent == True ).count()
    sms_sent = database.query( db.Notification ).filter( db.Notification.is_sms_sent == True ).count()
    action_required = database.query( db.Notification ).filter( db.Notification.priority == "High", db.Notification.status == "Unread" ).count()

    return {
        "total_notifications": total,
        "unread_notifications": unread,
        "high_priority_alerts": high_priority,
        "email_sent": email_sent,
        "sms_sent": sms_sent,
        "action_required": action_required
    }


# ==========================================================
# CREATE NOTIFICATION
# ==========================================================

@app.post( "/api/notifications", response_model=db.NotificationResponse, tags=["Admin Dashboard"] )
def create_notification( data: db.NotificationCreate, database: Session = Depends(db.get_db) ):

    notification = db.Notification(
        notification_type=data.notification_type,
        title=data.title,
        message=data.message,
        category=data.category,
        priority=data.priority,
        channel=data.channel,
        status="Unread",
        reference_id=data.reference_id,
        recipient_email=data.recipient_email,
        recipient_phone=data.recipient_phone
    )

    database.add(notification)
    database.commit()
    database.refresh(notification)
    return notification


# ==========================================================
# CATEGORY COUNTS
# ==========================================================

@app.get( "/api/notifications/category-counts", response_model=dict, tags=["Admin Dashboard"] )
def get_notification_category_counts( database: Session = Depends(db.get_db), current_user = Depends(crud.get_current_user) ):
    return {
        "all": database.query(db.Notification).count(),
        "procurement_alerts": ( database.query(db.Notification) .filter(db.Notification.category == "Procurement") .count() ),
        "delivery_delays": ( database.query(db.Notification) .filter(db.Notification.category == "Delivery") .count() ),
        "vendor_approvals": ( database.query(db.Notification) .filter(db.Notification.category == "Vendor") .count() ),
        "contract_expiry": ( database.query(db.Notification) .filter(db.Notification.category == "Contract") .count() ),
        "compliance": ( database.query(db.Notification) .filter(db.Notification.category == "Compliance") .count() ),
        "email": ( database.query(db.Notification) .filter(db.Notification.category == "Email") .count() ),
        "sms": ( database.query(db.Notification) .filter(db.Notification.category == "SMS") .count() )
    }


# ==========================================================
# MARK ALL AS READ
# ==========================================================

@app.put("/api/notifications/read-all", tags=["Admin Dashboard"])
def admin_mark_all_notifications_read( database: Session = Depends(db.get_db) ):

    updated = (
        database.query(db.Notification) .filter( db.Notification.status == "Unread" )
        .update( { db.Notification.status: "Read" }, synchronize_session=False )
    )

    database.commit()

    return { "message": "All notifications marked as read", "updated": updated }


# ==========================================================
# GET SINGLE NOTIFICATION
# ==========================================================

@app.get( "/api/notifications/{notification_id}", response_model=db.NotificationResponse, tags=["Admin Dashboard"] )
def get_notification( notification_id: int, database: Session = Depends(db.get_db) ):
    notification = ( database.query(db.Notification) .filter(db.Notification.id == notification_id) .first() )

    if not notification:
        raise HTTPException( status_code=404, detail="Notification not found" )

    return notification


# ==========================================================
# MARK ONE AS READ
# ==========================================================

@app.put("/api/notifications/{notification_id}/read", tags=["Admin Dashboard"])
def mark_notification_read( notification_id: int, database: Session = Depends(db.get_db) ):

    notification = ( database.query(db.Notification) .filter( db.Notification.id == notification_id ) .first() )

    if not notification:
        raise HTTPException( status_code=404, detail="Notification not found" )

    notification.status = "Read"

    database.commit()

    return { "message": "Notification marked as read", "id": notification_id }


# ==========================================================
# MARK AS UNREAD
# ==========================================================

@app.put("/api/notifications/{notification_id}/unread", tags=["Admin Dashboard"])
def mark_notification_unread( notification_id: int, database: Session = Depends(db.get_db) ):

    notification = ( database.query(db.Notification) .filter( db.Notification.id == notification_id ) .first() )

    if not notification:
        raise HTTPException( status_code=404, detail="Notification not found" )

    notification.status = "Unread"

    database.commit()

    return { "message": "Notification marked as unread" }


# ==========================================================
# DELETE NOTIFICATION
# ==========================================================

@app.delete("/api/notifications/{notification_id}", tags=["Admin Dashboard"])
def delete_notification( notification_id: int, database: Session = Depends(db.get_db) ):

    notification = ( database.query(db.Notification) .filter( db.Notification.id == notification_id ) .first() )

    if not notification:
        raise HTTPException( status_code=404, detail="Notification not found" )

    database.delete(notification)
    database.commit()

    return { "message": "Notification deleted" }


# ==========================================================
# GET ALL ROLES
# ==========================================================

@app.get( "/api/roles", response_model=list[db.RoleResponse], tags=["Admin Dashboard"] )
def get_roles( database: Session = Depends(db.get_db) ):

    roles = ( database.query(db.Role) .order_by(db.Role.id) .all() )


    # ======================================================
    # USER ROLE COUNTS
    # ======================================================

    procurement_manager_count = ( database.query(db.User) .filter( db.User.role == "Procurement Manager" ) .count() )

    finance_officer_count = ( database.query(db.User) .filter( db.User.role == "Finance Officer" ) .count() )

    supply_chain_manager_count = ( database.query(db.User) .filter( db.User.role == "Supply Chain Manager") .count() )

    auditor_count = ( database.query(db.User) .filter( db.User.role == "Auditor") .count() )

    # ======================================================
    # VENDOR COUNT
    # ======================================================

    vendor_count = ( database.query(db.Vendor) .count() )


    # ======================================================
    # COUNT MAP
    # ======================================================

    role_counts = {
        "Procurement Manager": procurement_manager_count,
        "Finance Officer": finance_officer_count,
        "Supply Chain Manager": supply_chain_manager_count,
        "Auditor": auditor_count,
        "Vendor": vendor_count
    }


    # ======================================================
    # RESPONSE
    # ======================================================

    result = []

    for role in roles:
        result.append(
            db.RoleResponse(
                id=role.id,
                name=role.name,
                description=role.description,
                role_type=role.role_type,
                user_count= role_counts.get( role.name, 0 )
            )
        )

    return result


# ==========================================================
# GET SINGLE ROLE
# ==========================================================

@app.get( "/api/roles/{role_id}", response_model=db.RoleResponse, tags=["Admin Dashboard"] )
def get_role( role_id: int, database: Session = Depends(db.get_db) ):

    role = ( database.query(db.Role) .filter( db.Role.id == role_id ) .first() )

    if not role:
        raise HTTPException( status_code=404, detail="Role not found" )

    user_count = ( database.query(db.User) .filter( db.User.role == role.name ) .count() )

    return db.RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        role_type=role.role_type,
        user_count=user_count
    )


# ==========================================================
# GET ROLE PERMISSIONS
# ==========================================================

@app.get( "/api/roles/{role_id}/permissions", response_model=list[db.PermissionResponse], tags=["Admin Dashboard"] )
def get_role_permissions( role_id: int, database: Session = Depends(db.get_db) ):

    role = ( database.query(db.Role) .filter( db.Role.id == role_id ) .first() )

    if not role:
        raise HTTPException( status_code=404, detail="Role not found" )

    permissions = (
        database.query(db.RolePermission)
        .filter( db.RolePermission.role_id == role_id )
        .order_by( db.RolePermission.module, db.RolePermission.id ) .all()
    )

    return permissions


# ==========================================================
# CREATE ROLE
# ==========================================================

@app.post( "/api/roles", response_model=db.RoleResponse, tags=["Admin Dashboard"] )
def create_role( data: db.RoleCreate, database: Session = Depends(db.get_db) ):

    existing = ( database.query(db.Role) .filter( db.Role.name == data.name ) .first() )

    if existing:
        raise HTTPException( status_code=400, detail="Role already exists" )

    role = db.Role( name=data.name, description=data.description, role_type=data.role_type )

    database.add(role)

    database.commit()

    database.refresh(role)

    return db.RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        role_type=role.role_type,
        user_count=0
    )


# ==========================================================
# UPDATE ROLE PERMISSIONS
# ==========================================================

@app.put( "/api/roles/{role_id}/permissions", tags=["Admin Dashboard"] )
def update_permissions( role_id: int, data: db.RolePermissionsUpdate, database: Session = Depends(db.get_db) ):

    role = ( database.query(db.Role) .filter( db.Role.id == role_id ) .first() )

    if not role:
        raise HTTPException( status_code=404, detail="Role not found" )

    for item in data.permissions:

        existing = (
            database.query(db.RolePermission)
            .filter(
                db.RolePermission.role_id == role_id,
                db.RolePermission.module == item.module,
                db.RolePermission.permission == item.permission
            ) .first() )

        if existing:
            existing.access = item.access

        else:
            permission = db.RolePermission( role_id=role_id, module=item.module, permission=item.permission, access=item.access )

            database.add(permission)
    database.commit()

    return { "success": True, "message": "Permissions updated successfully" }


# ==========================================================
# DELETE ROLE
# ==========================================================

@app.delete(
    "/api/roles/{role_id}", tags=["Admin Dashboard"] )
def delete_role( role_id: int, database: Session = Depends(db.get_db) ):

    role = ( database.query(db.Role) .filter( db.Role.id == role_id ) .first() )

    if not role:
        raise HTTPException( status_code=404, detail="Role not found" )

    if role.name in [ "Procurement Manager", "Finance Officer", "Vendor", "Supply Chain Manager", "Auditor" ]:
        raise HTTPException( status_code=400, detail="System roles cannot be deleted" )

    database.delete(role)

    database.commit()

    return { "success": True, "message": "Role deleted successfully" }


# ==========================================================
# DEFAULT SETTINGS
# ==========================================================

DEFAULT_SETTINGS = {

    "platform_name": "VendorIQ",

    "platform_tagline":
        "Vendor Reliability Platform",

    "default_language":
        "English (US)",

    "default_timezone":
        "(UTC+05:30) Asia/Kolkata",

    "date_format":
        "01 May 2024",

    "time_format":
        "12 Hour (03:30 PM)",

    "items_per_page":
        10,

    "currency":
        "USD - US Dollar ($)",


    "allow_user_registration":
        True,

    "require_email_verification":
        True,

    "password_minimum_length":
        8,

    "session_timeout":
        "30 Minutes",


    "password_complexity":
        True,

    "password_expiry":
        "90 Days",

    "max_login_attempts":
        5,

    "two_factor_authentication":
        True,


    "in_app_notifications":
        True,

    "email_notifications":
        True,

    "sms_notifications":
        False,

    "digest_frequency":
        "Daily",


    "smtp_host":
        "smtp.vendoriq.com",

    "smtp_port":
        587,

    "from_email":
        "noreply@vendoriq.com",

    "from_name":
        "VendorIQ Platform",


    "data_retention_period":
        "2 Years",

    "file_storage_limit":
        "25 MB",


    "automatic_backups":
        True,

    "backup_frequency":
        "Daily",

    "backup_time":
        "02:00 AM"
}


# ==========================================================
# GET SETTINGS
# ==========================================================

@app.get( "/api/system-settings", response_model=db.SystemSettingsResponse, tags=["Admin Dashboard"] )
def get_system_settings( database: Session = Depends(db.get_db) ):

    settings = ( database.query(db.SystemSettings) .order_by(db.SystemSettings.id.asc()) .first() )

    # ------------------------------------------------------
    # If table is empty, create the first settings row
    # ------------------------------------------------------

    if not settings:
        settings = db.SystemSettings( **DEFAULT_SETTINGS )

        database.add(settings)

        database.commit()

        database.refresh(settings)

    return settings


# ==========================================================
# UPDATE SETTINGS
# ==========================================================

@app.put( "/api/system-settings", response_model=db.SystemSettingsResponse, tags=["Admin Dashboard"] )
def update_system_settings( settings_data: db.SystemSettingsUpdate, database: Session = Depends(db.get_db) ):

    settings = ( database.query(db.SystemSettings) .order_by(db.SystemSettings.id.asc()) .first() )

    # ------------------------------------------------------
    # Create if no row exists
    # ------------------------------------------------------

    if not settings:
        settings = db.SystemSettings( **DEFAULT_SETTINGS )

        database.add(settings)

        database.commit()

        database.refresh(settings)


    # ------------------------------------------------------
    # Only update values sent by frontend
    # ------------------------------------------------------

    update_data = ( settings_data.model_dump( exclude_unset=True ) )


    for field, value in update_data.items():

        if hasattr(settings, field):

            setattr( settings, field, value )


    database.commit()

    database.refresh(settings)

    return settings


# ==========================================================
# TEST EMAIL
# ==========================================================

@app.post( "api/system-settings/test-email", tags=["Admin Dashboard"])
def test_email( database: Session = Depends(db.get_db) ):

    try:

        # --------------------------------------------------
        # Get current system settings
        # --------------------------------------------------

        settings = ( database.query(db.SystemSettings) .order_by(db.SystemSettings.id.asc()) .first() )

        if settings is None:
            raise HTTPException( status_code=404, detail="System settings not found" )


        # --------------------------------------------------
        # Validate SMTP settings
        # --------------------------------------------------

        if not settings.smtp_host:
            raise HTTPException( status_code=400, detail="SMTP host is not configured" )


        if not settings.smtp_port:
            raise HTTPException( status_code=400, detail="SMTP port is not configured" )


        if not settings.from_email:
            raise HTTPException( status_code=400, detail="From email is not configured" )


        # --------------------------------------------------
        # IMPORTANT
        #
        # This endpoint currently only verifies that the
        # SMTP configuration exists.
        #
        # It does NOT send an email yet.
        # --------------------------------------------------

        return {
            "success": True,
            "message": ( "SMTP settings are configured successfully." ),
            "smtp_host": settings.smtp_host,
            "smtp_port": settings.smtp_port,
            "from_email": settings.from_email
        }


    except HTTPException:
        raise


    except Exception as e:
        database.rollback()

        print( "TEST EMAIL ERROR:", str(e) )

        raise HTTPException( status_code=500, detail="Unable to test email settings" )


# ==========================================================
# DATABASE BACKUP
# ==========================================================

@app.post("/api/system-settings/backup", tags=["Admin Dashboard"])
def backup_database( database: Session = Depends(db.get_db) ):
    """
    Create a PostgreSQL database backup using pg_dump.

    Endpoint:
        POST /api/system-settings/backup
    """

    try:

        # --------------------------------------------------
        # DATABASE URL
        # --------------------------------------------------

        database_url = os.getenv( "DATABASE_URL" )

        if not database_url:
            raise HTTPException( status_code=500, detail=( "DATABASE_URL environment variable is not configured" ) )


        # --------------------------------------------------
        # FIND PG_DUMP
        # --------------------------------------------------

        pg_dump_path = shutil.which( "pg_dump" )


        # --------------------------------------------------
        # Windows fallback locations
        # --------------------------------------------------

        if not pg_dump_path:

            possible_paths = [

                r"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",

                r"C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",

                r"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",

                r"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",

                r"C:\Program Files\PostgreSQL\14\bin\pg_dump.exe"

            ]


            for path in possible_paths:
                if os.path.exists(path):
                    pg_dump_path = path
                    break


        # --------------------------------------------------
        # pg_dump still not found
        # --------------------------------------------------

        if not pg_dump_path:
            raise HTTPException(
                status_code=500,
                detail=(
                    "pg_dump was not found. "
                    "Please install PostgreSQL or add "
                    "PostgreSQL\\bin to the Windows PATH."
                )
            )


        print( "Using pg_dump:", pg_dump_path )


        # --------------------------------------------------
        # BACKUP DIRECTORY
        # --------------------------------------------------

        backup_directory = Path( "backups" )

        backup_directory.mkdir( parents=True, exist_ok=True )


        # --------------------------------------------------
        # BACKUP FILE NAME
        # --------------------------------------------------

        timestamp = datetime.now().strftime( "%Y%m%d_%H%M%S" )


        backup_filename = ( f"vendoriq_backup_{timestamp}.sql" )


        backup_path = ( backup_directory / backup_filename )


        # --------------------------------------------------
        # PG_DUMP COMMAND
        # --------------------------------------------------

        command = [ pg_dump_path, database_url, "-F", "p", "-f", str(backup_path) ]


        print( "Starting database backup..." )


        # --------------------------------------------------
        # EXECUTE
        # --------------------------------------------------

        result = subprocess.run( command, capture_output=True, text=True )


        # --------------------------------------------------
        # CHECK RESULT
        # --------------------------------------------------

        if result.returncode != 0:
            print( "pg_dump stderr:", result.stderr )

            if backup_path.exists():

                try:
                    backup_path.unlink()

                except Exception:
                    pass


            raise HTTPException(
                status_code=500,
                detail=(
                    "Database backup failed: "
                    +
                    ( result.stderr.strip() or "Unknown pg_dump error" )
                )
            )


        # --------------------------------------------------
        # VERIFY FILE
        # --------------------------------------------------

        if not backup_path.exists():
            raise HTTPException( status_code=500, detail=( "Backup command completed but backup file was not created." ) )


        # --------------------------------------------------
        # FILE SIZE
        # --------------------------------------------------

        backup_size = ( backup_path.stat().st_size )


        # --------------------------------------------------
        # RESPONSE
        # --------------------------------------------------

        return {
            "success": True,
            "message": "Database backup created successfully",
            "filename": backup_filename,
            "path": str(backup_path),
            "size": backup_size,
            "created_at": datetime.now().isoformat()
        }


    except HTTPException:
        raise


    except Exception as e:
        print( "DATABASE BACKUP ERROR:", str(e) )
        raise HTTPException( status_code=500, detail=( "Unable to create database backup" ) )


# ==========================================================
# AUDIT LOGS
# ==========================================================

@app.get("/api/system-settings/audit-logs", tags=["Admin Dashboard"])
def get_settings_audit_logs( database: Session = Depends(db.get_db) ):
    """
    Return recent system activity/audit logs.

    Endpoint:
        GET /api/system-settings/audit-logs
    """

    try:

        # --------------------------------------------------
        # Query system activity
        # --------------------------------------------------

        activities = (
            database.query( db.SystemActivity, db.User )
            .outerjoin( db.User, db.SystemActivity.user_id == db.User.id )
            .order_by( db.SystemActivity.created_at.desc() )
            .limit(100)
            .all()
        )

        logs = []


        # --------------------------------------------------
        # Convert database records to JSON
        # --------------------------------------------------

        for activity, user in activities:

            # ----------------------------------------------
            # User name
            # ----------------------------------------------
            user_name = "System"


            if user:
                user_name = (
                    getattr( user, "name", None )
                    or
                    getattr( user, "full_name", None )
                    or
                    getattr( user, "email", None )
                    or
                    "System"
                )


            # ----------------------------------------------
            # Action
            # ----------------------------------------------

            action = ( getattr( activity, "action", None ) or "System activity" )


            # ----------------------------------------------
            # Status
            # ----------------------------------------------

            status = ( getattr( activity, "status", None ) or "Success" )


            # ----------------------------------------------
            # Created date
            # ----------------------------------------------

            created_at = ( getattr( activity, "created_at", None ) )


            if created_at:
                created_at = (
                    created_at.isoformat()
                    if hasattr( created_at, "isoformat" )
                    else str(created_at)
                )

            else:
                created_at = "-"


            # ----------------------------------------------
            # Add log
            # ----------------------------------------------

            logs.append({ "id": getattr( activity, "id", None ), "user_name": user_name, "action": action, "created_at": created_at, "status": status })


        # --------------------------------------------------
        # Return logs
        # --------------------------------------------------

        return logs


    except Exception as e:
        print( "AUDIT LOG ERROR:", str(e) )
        raise HTTPException( status_code=500, detail=( "Unable to load audit logs" )  )


# ==========================================================
# SUMMARY
# ==========================================================

@app.get("/api/admin/audit-logs/summary", tags=["Admin Dashboard"])
def get_audit_summary( database: Session = Depends(db.get_db) ):

    thirty_days_ago = ( datetime.utcnow() - timedelta(days=30) )

    total_logs = ( database.query(func.count(db.AuditLog.id)) .scalar() or 0 )

    recent_logs = ( database.query(func.count(db.AuditLog.id)) .filter( db.AuditLog.created_at >= thirty_days_ago ) .scalar() or 0 )

    unique_users = ( database.query( func.count( func.distinct(db.AuditLog.user_id) ) ) .filter( db.AuditLog.user_id.isnot(None) ) .scalar() or 0 )

    unique_ips = ( database.query( func.count( func.distinct(db.AuditLog.ip_address) ) ) .filter( db.AuditLog.ip_address.isnot(None) ) .scalar() or 0 )

    actions = ( database.query( func.count( func.distinct(db.AuditLog.action) ) ) .scalar() or 0 )

    critical_events = (
        database.query(func.count(db.AuditLog.id))
        .filter(
            or_(
                db.AuditLog.status == "Critical",
                db.AuditLog.action.in_([
                    "DELETE",
                    "LOGIN_FAILED",
                    "SUSPEND",
                    "REJECT"
                ])
            )
        )
        .scalar()
        or 0
    )

    failed_events = ( database.query(func.count(db.AuditLog.id)) .filter( db.AuditLog.status == "Failed" ) .scalar() or 0 )

    return {

        "total_logs": total_logs,

        "users": unique_users,

        "actions": actions,

        "critical_events": critical_events,

        "failed_events": failed_events,

        "unique_ips": unique_ips,

        "recent_logs": recent_logs
    }


# ==========================================================
# GET FILTER OPTIONS
# ==========================================================

@app.get("/api/admin/audit-logs/filters", tags=["Admin Dashboard"])
def get_audit_filters( database: Session = Depends(db.get_db) ):

    users = (
        database.query( db.AuditLog.user_email )
        .filter( db.AuditLog.user_email.isnot(None) )
        .distinct()
        .order_by( db.AuditLog.user_email )
        .all()
    )

    actions = (
        database.query( db.AuditLog.action )
        .distinct()
        .order_by( db.AuditLog.action )
        .all()
    )

    statuses = (
        database.query( db.AuditLog.status )
        .distinct()
        .order_by( db.AuditLog.status )
        .all()
    )

    return {

        "users": [
            row[0]
            for row in users
        ],

        "actions": [
            row[0]
            for row in actions
        ],

        "statuses": [
            row[0]
            for row in statuses
        ]
    }


# ==========================================================
# GET AUDIT LOGS
# ==========================================================

@app.get("/api/admin/audit-logs", tags=["Admin Dashboard"])
def get_audit_logs(

    search: Optional[str] = Query( None ),

    user: Optional[str] = Query( None ),

    action: Optional[str] = Query( None ),

    status: Optional[str] = Query( None ),

    from_date: Optional[str] = Query( None ),

    to_date: Optional[str] = Query( None ),

    page: int = Query( 1, ge=1 ),

    limit: int = Query( 10, ge=1, le=100 ),

    database: Session = Depends(db.get_db)
):

    query = database.query(db.AuditLog)


    # ------------------------------------------------------
    # SEARCH
    # ------------------------------------------------------

    if search:

        search_value = f"%{search}%"

        query = query.filter(
            or_(
                db.AuditLog.user_email.ilike( search_value ),

                db.AuditLog.user_name.ilike( search_value ),

                db.AuditLog.action.ilike( search_value ),

                db.AuditLog.description.ilike( search_value ),

                db.AuditLog.resource.ilike( search_value ),

                db.AuditLog.resource_id.ilike( search_value ),

                db.AuditLog.ip_address.ilike( search_value )
            )
        )


    # ------------------------------------------------------
    # USER FILTER
    # ------------------------------------------------------

    if user and user != "All Users":
        query = query.filter( db.AuditLog.user_email == user )


    # ------------------------------------------------------
    # ACTION FILTER
    # ------------------------------------------------------

    if action and action != "All Actions":
        query = query.filter( db.AuditLog.action == action )


    # ------------------------------------------------------
    # STATUS FILTER
    # ------------------------------------------------------

    if status and status != "All Status":
        query = query.filter( db.AuditLog.status == status )


    # ------------------------------------------------------
    # DATE FILTER
    # ------------------------------------------------------

    if from_date:

        try:
            start_date = datetime.strptime( from_date, "%Y-%m-%d" )
            query = query.filter( db.AuditLog.created_at >= start_date )

        except ValueError:
            raise HTTPException( status_code=400, detail="Invalid from_date" )


    if to_date:

        try:
            end_date = datetime.strptime( to_date, "%Y-%m-%d" )
            end_date = ( end_date + timedelta(days=1) )
            query = query.filter( db.AuditLog.created_at < end_date )

        except ValueError:
            raise HTTPException( status_code=400, detail="Invalid to_date" )


    # ------------------------------------------------------
    # TOTAL
    # ------------------------------------------------------

    total = query.count()


    # ------------------------------------------------------
    # PAGINATION
    # ------------------------------------------------------

    offset = ( page - 1 ) * limit

    logs = ( query .order_by( db.AuditLog.created_at.desc() ) .offset(offset) .limit(limit) .all() )


    return {

        "items": logs,

        "pagination": {

            "page": page,

            "limit": limit,

            "total": total,

            "pages": (
                (total + limit - 1) // limit
                if total
                else 1
            )
        }
    }


# ==========================================================
# GET SINGLE LOG
# ==========================================================

@app.get("/api/admin/audit-logs/{log_id}", tags=["Admin Dashboard"])
def get_audit_log( log_id: int, database: Session = Depends(db.get_db) ):

    log = ( database.query(db.AuditLog) .filter( db.AuditLog.id == log_id ) .first() )

    if not log:
        raise HTTPException( status_code=404, detail="Audit log not found" )

    return log


# ==========================================================
# EXPORT CSV
# ==========================================================

@app.get("/api/admin/audit-logs/export/csv", tags=["Admin Dashboard"])
def export_audit_logs( search: Optional[str] = None, user: Optional[str] = None, action: Optional[str] = None, status: Optional[str] = None, database: Session = Depends(db.get_db) ):

    query = database.query(db.AuditLog)

    if search:

        search_value = f"%{search}%"

        query = query.filter(
            or_(
                db.AuditLog.user_email.ilike( search_value ),

                db.AuditLog.user_name.ilike( search_value ),

                db.AuditLog.action.ilike( search_value ),

                db.AuditLog.description.ilike( search_value ),

                db.AuditLog.resource.ilike( search_value ),

                db.AuditLog.resource_id.ilike( search_value ),

                db.AuditLog.ip_address.ilike( search_value )
            )
        )


    if user and user != "All Users":
        query = query.filter( db.AuditLog.user_email == user )


    if action and action != "All Actions":
        query = query.filter( db.AuditLog.action == action )


    if status and status != "All Status":
        query = query.filter( db.AuditLog.status == status )


    logs = ( query .order_by( db.AuditLog.created_at.desc() ) .all() )


    output = io.StringIO()

    writer = csv.writer(output)


    writer.writerow([
        "ID",
        "Date & Time",
        "User",
        "Email",
        "Role",
        "Action",
        "Description",
        "Resource",
        "Resource ID",
        "Status",
        "IP Address"
    ])


    for log in logs:

        writer.writerow([

            log.id,

            log.created_at.strftime( "%Y-%m-%d %H:%M:%S" )
            if log.created_at
            else "",

            log.user_name or "",

            log.user_email or "",

            log.role or "",

            log.action,

            log.description or "",

            log.resource or "",

            log.resource_id or "",

            log.status,

            log.ip_address or ""
        ])


    output.seek(0)


    return StreamingResponse(

        iter([ output.getvalue() ]),

        media_type="text/csv",

        headers={ "Content-Disposition": "attachment; filename=audit_logs.csv" }
    )


# ==========================================================
# SUMMARY
# ==========================================================

@app.get( "/api/data-management/summary", tags=["Admin Dashboard"])
def get_summary( database: Session = Depends(db.get_db) ):

    entities = []

    for config in crud.ENTITY_CONFIG.values():
        entities.append( crud.build_entity( database, config ) )

    total_records = sum(
        entity["records"]
        for entity in entities
    )

    storage = crud.get_storage_usage(database)

    quality = crud.get_data_quality(database)

    duplicates = crud.get_duplicate_count(database)

    existing_tables = sum(
        1
        for entity in entities
        if entity["exists"]
    )

    return {
        "success": True,
        "summary": {
            "total_records": total_records,
            "data_sources": existing_tables,
            "storage_used_gb": storage["gb"],
            "storage_limit_gb": 200,
            "quality_score": quality["score"],
            "duplicates": duplicates,
            "last_backup": "Not configured",
        },
        "entities": entities,
        "quality": quality,
        "storage": storage,
    }


# ==========================================================
# ENTITY DETAILS
# ==========================================================

@app.get( "/api/data-management/entities/{entity_name}", tags=["Admin Dashboard"])
def get_entity_details( entity_name: str, database: Session = Depends(db.get_db), page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100), search: Optional[str] = None, ):

    if entity_name not in crud.ENTITY_CONFIG:
        raise HTTPException( status_code=404, detail="Entity not found" )

    config = crud.ENTITY_CONFIG[ entity_name ]

    table_name = config["table"]

    if not crud.table_exists( database, table_name ):

        return {
            "success": True,
            "columns": [],
            "rows": [],
            "total": 0,
        }

    offset = ( page - 1 ) * limit

    columns_query = text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = :table_name
        ORDER BY ordinal_position
    """)

    columns = database.execute( columns_query, { "table_name": table_name } ).scalars().all()

    if not columns:
        return {
            "success": True,
            "columns": [],
            "rows": [],
            "total": 0,
        }

    # ------------------------------------------------------
    # Search
    # ------------------------------------------------------

    where_sql = ""
    params = { "limit": limit, "offset": offset, }

    if search:

        searchable_columns = columns[:8]

        conditions = []

        for index, column in enumerate( searchable_columns ):

            param_name = ( f"search_{index}" )

            conditions.append( f'CAST("{column}" AS TEXT) ILIKE :{param_name}' )

            params[param_name] = ( f"%{search}%" )

        where_sql = ( " WHERE " + " OR ".join(conditions) )

    # ------------------------------------------------------
    # Total
    # ------------------------------------------------------

    total_query = text(
        f'''
        SELECT COUNT(*)
        FROM "{table_name}"
        {where_sql}
        '''
    )

    total = database.execute( total_query, params ).scalar()

    # ------------------------------------------------------
    # Rows
    # ------------------------------------------------------

    safe_columns = ", ".join(
        f'"{column}"'
        for column in columns[:10]
    )

    rows_query = text(
        f'''
        SELECT {safe_columns}
        FROM "{table_name}"
        {where_sql}
        ORDER BY 1 DESC
        LIMIT :limit
        OFFSET :offset
        '''
    )

    rows = database.execute( rows_query, params ).mappings().all()

    rows = [
        dict(row)
        for row in rows
    ]

    return {
        "success": True,
        "columns": columns[:10],
        "rows": rows,
        "total": int(total or 0),
        "page": page,
        "limit": limit,
    }


# ==========================================================
# HEALTH
# ==========================================================

@app.get( "/api/data-management/health",tags=["Admin Dashboard"])
def data_management_health( database: Session = Depends(db.get_db) ):

    try:
        database.execute( text("SELECT 1") )
        return { "database": "Healthy", "api": "Healthy", "status": "Healthy", }

    except Exception:
        return { "database": "Unavailable", "api": "Healthy", "status": "Degraded", }


# ==========================================================
# OPERATIONS
# ==========================================================

@app.get( "/api/data-management/operations", tags=["Admin Dashboard"])
def recent_operations( database: Session = Depends(db.get_db) ):

    operations = []

    # ------------------------------------------------------
    # system_activity
    # ------------------------------------------------------

    if crud.table_exists( database, "system_activity" ):

        try:

            columns_query = text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = 'system_activity'
            """)

            columns = database.execute( columns_query ).scalars().all()

            time_column = None

            for candidate in [ "created_at", "timestamp", "activity_date" ]:

                if candidate in columns:
                    time_column = candidate
                    break

            message_column = None

            for candidate in [ "description", "action", "activity", "message" ]:

                if candidate in columns:
                    message_column = candidate
                    break

            if time_column and message_column:
                query = text(
                    f'''
                    SELECT
                        "{message_column}" AS message,
                        "{time_column}" AS created_at
                    FROM system_activity
                    ORDER BY "{time_column}" DESC
                    LIMIT 5
                    '''
                )

                rows = database.execute( query ).mappings().all()

                for row in rows:
                    operations.append( { "message": str( row["message"] ), "created_at": str( row["created_at"] ), } )

        except Exception:
            pass

    # ------------------------------------------------------
    # Fallback
    # ------------------------------------------------------

    if not operations:
        operations = [
            {
                "message": "Database connection verified",
                "created_at": datetime.now().strftime( "%d %b %Y, %I:%M %p" ),
            },

            {
                "message": "Data management dashboard loaded",
                "created_at": datetime.now().strftime( "%d %b %Y, %I:%M %p" ),
            },
        ]

    return { "success": True, "operations": operations, }


# ==========================================================
# SYSTEM HEALTH ENDPOINT
# ==========================================================

@app.get("/api/system-health/overview", tags=["Admin Dashboard"])
def system_health_overview( database: Session = Depends(db.get_db) ):

    cpu = crud.get_cpu_usage()

    memory = crud.get_memory_usage()

    disk = crud.get_disk_usage()

    network = crud.get_network_usage()

    avg_response = crud.average_response_time()

    db_performance = ( crud.get_database_performance(database) )

    services = [
        crud.check_backend(),
        crud.check_database(database),
        crud.check_storage(),
        crud.check_redis(),
        crud.check_email(),
        crud.check_gateway()
    ]

    healthy_services = sum( 1
        for service in services
        if service["status"] == "Healthy"
    )

    health_score = round( ( healthy_services / len(services) ) * 100 )

    return {

        "timestamp":
            datetime.utcnow().isoformat(),

        "uptime": { "value": round( 100 - min( cpu / 20, 5 ), 2 ) },

        "system_performance": {
            "cpu": round(cpu, 2),
            "memory": round(memory, 2),
            "disk": round(disk, 2),
            "network": round(network, 2)
        },

        "api": {
            "average_response_time": round( avg_response, 2 ),
            "total_requests": len(crud.response_times),
            "error_rate": 0
        },

        "database": db_performance,

        "dashboard_loading": { "average": round( avg_response / 1000, 2 ) },

        "concurrency": {

            "active_users": crud.active_requests,

            "peak_users": crud.peak_concurrent_users
        },

        "services": services,

        "health_score": health_score
    }


# ==========================================================
# SYSTEM METRIC HISTORY
# ==========================================================

@app.get("/api/system-health/metrics", tags=["Admin Dashboard"])
def get_metrics(
    database: Session = Depends(db.get_db)
):

    now = datetime.utcnow()

    start_time = ( now - timedelta(days=7) )

    metrics = (
        database.query(db.SystemMetric)
        .filter( db.SystemMetric.recorded_at >= start_time )
        .order_by( db.SystemMetric.recorded_at.asc() )
        .all()
    )

    return [
        {
            "type": metric.metric_type,
            "value": metric.metric_value,
            "timestamp": metric.recorded_at.isoformat()
        }
        for metric in metrics
    ]


# ==========================================================
# SYSTEM ALERTS
# ==========================================================

@app.get("/api/system-health/alerts", tags=["Admin Dashboard"])
def get_system_alerts( database: Session = Depends(db.get_db) ):

    alerts = ( database.query(db.SystemAlert) .order_by( db.SystemAlert.detected_at.desc() ) .limit(20) .all() )

    return [
        {
            "id": alert.id,
            "issue": alert.issue,
            "severity": alert.severity,
            "status": alert.status,
            "detected_at":
                alert.detected_at.isoformat()
                if alert.detected_at
                else None,
            "resolved_at":
                alert.resolved_at.isoformat()
                if alert.resolved_at
                else None
        }
        for alert in alerts
    ]


# ==========================================================
# DASHBOARD STATISTICS
# ==========================================================

@app.get("/api/support/statistics", tags=["Admin Dashboard"])
def get_statistics( database: Session = Depends(db.get_db) ):

    open_tickets = ( database.query(db.SupportTicket) .filter( db.SupportTicket.status.in_( ["Open", "In Progress"] ) ) .count() )

    resolved_tickets = ( database.query(db.SupportTicket) .filter( db.SupportTicket.status == "Resolved" ) .count() )

    total_tickets = ( database.query(db.SupportTicket) .count() )

    return {

        "open_tickets": open_tickets,

        "resolved_tickets": resolved_tickets,

        "total_tickets": total_tickets,

        "avg_response_time": "2.4 hrs",

        "customer_satisfaction": "4.7/5",

        "support_availability": "24/7"

    }


# ==========================================================
# RECENT TICKETS
# ==========================================================

@app.get( "/api/support/tickets", response_model=list[db.SupportTicketResponse], tags=["Admin Dashboard"])
def get_tickets(
    page: int = Query( 1, ge=1 ),
    limit: int = Query( 10, ge=1, le=100 ),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    database: Session = Depends(db.get_db)
):

    query = database.query( db.SupportTicket )

    if status:
        query = query.filter( db.SupportTicket.status == status )

    if priority:
        query = query.filter( db.SupportTicket.priority == priority )

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            ( db.SupportTicket.subject.ilike( pattern ) )
            |
            ( db.SupportTicket.ticket_id.ilike( pattern ) )
        )

    tickets = ( query .order_by( db.SupportTicket.created_on.desc() ) .offset( (page - 1) * limit ) .limit(limit) .all() )

    return tickets


# ==========================================================
# GET SINGLE TICKET
# ==========================================================

@app.get( "/api/support/tickets/{ticket_id}", response_model=db.SupportTicketResponse, tags=["Admin Dashboard"])
def get_ticket( ticket_id: str, database: Session = Depends(db.get_db) ):

    ticket = ( database.query(db.SupportTicket) .filter( db.SupportTicket.ticket_id == ticket_id ) .first() )

    if not ticket:
        raise HTTPException( status_code=404, detail="Support ticket not found" )

    return ticket


# ==========================================================
# CREATE TICKET
# ==========================================================

@app.post( "/api/support/tickets", response_model=db.SupportTicketResponse, tags=["Admin Dashboard"])
def create_ticket( ticket_data: db.SupportTicketCreate, database: Session = Depends(db.get_db) ):

    ticket = db.SupportTicket(

        ticket_id=crud.generate_ticket_id(database),

        vendor_id=ticket_data.vendor_id,

        subject=ticket_data.subject,

        description=ticket_data.description,

        category=ticket_data.category,

        priority=ticket_data.priority,

        status="Open",

        created_by=ticket_data.created_by
    )

    database.add(ticket)

    database.commit()

    database.refresh(ticket)

    return ticket


# ==========================================================
# FAQ
# ==========================================================

@app.get( "/api/support/faqs", response_model=list[db.FAQResponse], tags=["Admin Dashboard"])
def get_faqs( search: Optional[str] = None, database: Session = Depends(db.get_db) ):

    query = ( database.query(db.SupportFAQ) .filter( db.SupportFAQ.is_active == True ) )

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            ( db.SupportFAQ.question.ilike( pattern ) )
            |
            ( db.SupportFAQ.answer.ilike( pattern ) )
        )

    return ( query .order_by( db.SupportFAQ.display_order.asc() ) .all() )


# ==========================================================
# QUICK LINKS
# ==========================================================

@app.get( "/api/support/quick-links", response_model=list[db.QuickLinkResponse], tags=["Admin Dashboard"])
def get_quick_links( database: Session = Depends(db.get_db) ):

    return (
        database.query( db.SupportQuickLink )
        .filter( db.SupportQuickLink.is_active == True )
        .order_by( db.SupportQuickLink.display_order.asc() )
        .all()
    )


# ==========================================================
# CONTACT SUPPORT
# ==========================================================

@app.get( "/api/support/contacts", response_model=list[db.ContactResponse], tags=["Admin Dashboard"] )
def get_contacts( database: Session = Depends(db.get_db) ):

    return ( database.query( db.SupportContact ) .filter( db.SupportContact.is_active == True  ) .all() )


# ==========================================================
# HELPER
# ==========================================================

VALID_STATUSES = { "Pending", "Reviewed", "Resolved" }


VALID_CATEGORIES = { "General", "Vendor", "Procurement", "Purchase Order", "Invoice", "Contract", "Support", "Performance", "Other" }


def validate_status(value: str):
    if value not in VALID_STATUSES:
        raise HTTPException( status_code=400, detail=( "Invalid status. Allowed values: Pending, Reviewed, Resolved" ) )


# ==========================================================
# GET STATISTICS
# ==========================================================

@app.get( "/api/feedback/statistics", response_model=db.FeedbackStatistics, tags=["Admin Dashboard"])
def get_feedback_statistics( database: Session = Depends(db.get_db), current_admin=Depends(crud.get_current_admin) ):

    total = ( database.query( func.count(db.Feedback.id) ) .scalar() or 0 )

    average = ( database.query( func.avg(db.Feedback.rating) ) .scalar() )

    positive = ( database.query( func.count(db.Feedback.id) ) .filter( db.Feedback.rating >= 4 ) .scalar() or 0 )

    negative = ( database.query( func.count(db.Feedback.id) ) .filter( db.Feedback.rating <= 2 ) .scalar() or 0 )

    pending = ( database.query( func.count(db.Feedback.id) ) .filter( db.Feedback.status == "Pending" ) .scalar() or 0 )

    reviewed = ( database.query( func.count(db.Feedback.id) ) .filter( db.Feedback.status == "Reviewed" ) .scalar() or 0 )

    resolved = ( database.query( func.count(db.Feedback.id) ) .filter( db.Feedback.status == "Resolved" ) .scalar() or 0 )

    return db.FeedbackStatistics(
        total_feedback=total,
        average_rating=round( float(average or 0), 2 ),
        positive_feedback=positive,
        pending_feedback=pending,
        reviewed_feedback=reviewed,
        resolved_feedback=resolved,
        negative_feedback=negative
    )


# ==========================================================
# GET FEEDBACK LIST
# ==========================================================

@app.get( "/api/feedback", response_model=dict, tags=["Admin Dashboard"])
def get_feedback(
    search: Optional[str] = Query( None ),
    rating: Optional[int] = Query( None, ge=1, le=5 ),
    category: Optional[str] = Query( None ),
    feedback_status: Optional[str] = Query( None, alias="status" ), 
    page: int = Query( 1, ge=1 ), limit: int = Query( 10, ge=1, le=100 ),
    database: Session = Depends(db.get_db), current_admin=Depends( crud.get_current_admin ) ):

    query = ( database.query(db.Feedback) .options( joinedload( db.Feedback.user ) ) )

    # ------------------------------------------------------
    # SEARCH
    # ------------------------------------------------------

    if search:
        search_value = f"%{search.strip()}%"
        query = query.filter(
            or_(
                db.Feedback.subject.ilike( search_value ),
                db.Feedback.message.ilike( search_value ),
                db.Feedback.category.ilike( search_value ),
                db.Feedback.admin_response.ilike( search_value )
            )
        )

    # ------------------------------------------------------
    # RATING
    # ------------------------------------------------------

    if rating is not None:
        query = query.filter( db.Feedback.rating == rating )

    # ------------------------------------------------------
    # CATEGORY
    # ------------------------------------------------------

    if category and category != "All":
        query = query.filter( db.Feedback.category == category )

    # ------------------------------------------------------
    # STATUS
    # ------------------------------------------------------

    if feedback_status and feedback_status != "All":
        validate_status( feedback_status )
        query = query.filter( db.Feedback.status == feedback_status )

    # ------------------------------------------------------
    # TOTAL
    # ------------------------------------------------------

    total = query.count()

    total_pages = (
        (total + limit - 1) // limit
        if total > 0
        else 1
    )

    if page > total_pages:
        page = total_pages

    offset = ( (page - 1) * limit )

    feedback_items = ( query .order_by( db.Feedback.created_at.desc() ) .offset(offset) .limit(limit) .all() )

    result = []

    for item in feedback_items:
        user_data = None

        if item.user:
            user_name = None

            if hasattr( item.user, "name" ):
                user_name = item.user.name

            elif hasattr( item.user, "full_name" ):
                user_name = item.user.full_name

            elif hasattr( item.user, "username" ):
                user_name = item.user.username

            result.append({
                "id": item.id,
                "user_id": item.user_id,
                "rating": item.rating,
                "category": item.category,
                "subject": item.subject,
                "message": item.message,
                "status": item.status,
                "admin_response": item.admin_response,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
                "user": {
                    "id": item.user.id,
                    "name": user_name,
                    "email": getattr( item.user, "email", None ),
                    "role": getattr( item.user, "role", None )
                }
            })

        else:
            result.append({
                "id": item.id,
                "user_id": item.user_id,
                "rating": item.rating,
                "category": item.category,
                "subject": item.subject,
                "message": item.message,
                "status": item.status,
                "admin_response": item.admin_response,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
                "user": None
            })

    return {
        "items": result,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }


# ==========================================================
# GET SINGLE FEEDBACK
# ==========================================================

@app.get( "/api/feedback/{feedback_id}", tags=["Admin Dashboard"])
def get_feedback_by_id( feedback_id: int, database: Session = Depends(db.get_db), current_admin=Depends( crud.get_current_admin ) ):

    feedback = ( database.query(db.Feedback) .options( joinedload( db.Feedback.user ) ) .filter( db.Feedback.id == feedback_id ) .first() )

    if not feedback:
        raise HTTPException( status_code=404, detail="Feedback not found" )

    user_data = None

    if feedback.user:
        user_name = getattr( feedback.user, "name", None )

        if not user_name:
            user_name = getattr( feedback.user, "full_name", None )

        if not user_name:
            user_name = getattr( feedback.user, "username", None )

        user_data = {
            "id": feedback.user.id,
            "name": user_name,
            "email": getattr( feedback.user, "email", None ),
            "role": getattr( feedback.user, "role", None )
        }

    return {
        "id": feedback.id,
        "user_id": feedback.user_id,
        "rating": feedback.rating,
        "category": feedback.category,
        "subject": feedback.subject,
        "message": feedback.message,
        "status": feedback.status,
        "admin_response": feedback.admin_response,
        "created_at": feedback.created_at,
        "updated_at": feedback.updated_at,
        "user": user_data
    }


# ==========================================================
# CREATE FEEDBACK
# ==========================================================

@app.post( "/api/feedback", response_model=db.FeedbackResponse, status_code=status.HTTP_201_CREATED, tags=["Admin Dashboard"])
def create_feedback( feedback_data: db.FeedbackCreate, database: Session = Depends(db.get_db) ):

    feedback = db.Feedback(
        user_id=feedback_data.user_id,
        rating=feedback_data.rating,
        category=feedback_data.category,
        subject=feedback_data.subject,
        message=feedback_data.message,
        status="Pending"
    )

    database.add(feedback)

    database.commit()

    database.refresh(feedback)

    return feedback


# ==========================================================
# UPDATE FEEDBACK
# ==========================================================

@app.put( "/api/feedback/{feedback_id}", response_model=db.FeedbackResponse, tags=["Admin Dashboard"])
def update_feedback( feedback_id: int, feedback_data: db.FeedbackUpdate, database: Session = Depends(db.get_db), current_admin=Depends( crud.get_current_admin ) ):

    feedback = ( database.query(db.Feedback) .filter( db.Feedback.id == feedback_id ) .first() )

    if not feedback:
        raise HTTPException( status_code=404, detail="Feedback not found" )

    update_data = ( feedback_data.model_dump( exclude_unset=True ) )

    if "status" in update_data:
        validate_status( update_data["status"] )

    for field, value in update_data.items():
        setattr( feedback, field, value )

    database.commit()

    database.refresh(feedback)

    return feedback


# ==========================================================
# UPDATE STATUS
# ==========================================================

@app.put( "/api/feedback/{feedback_id}/status", response_model=db.FeedbackResponse, tags=["Admin Dashboard"])
def update_feedback_status( feedback_id: int, status_data: db.FeedbackStatusUpdate, database: Session = Depends(db.get_db), current_admin=Depends( crud.get_current_admin ) ):

    validate_status( status_data.status )

    feedback = ( database.query(db.Feedback) .filter( db.Feedback.id == feedback_id ) .first() )

    if not feedback:
        raise HTTPException( status_code=404, detail="Feedback not found" )

    feedback.status = ( status_data.status )

    database.commit()

    database.refresh(feedback)

    return feedback


# ==========================================================
# ADMIN RESPONSE
# ==========================================================

@app.post( "/api/feedback/{feedback_id}/response", response_model=db.FeedbackResponse, tags=["Admin Dashboard"])
def respond_to_feedback( feedback_id: int, response_data: db.FeedbackResponseCreate, database: Session = Depends(db.get_db), current_admin=Depends( crud.get_current_admin ) ):

    feedback = ( database.query(db.Feedback) .filter( db.Feedback.id == feedback_id ) .first() )

    if not feedback:
        raise HTTPException( status_code=404, detail="Feedback not found" )

    feedback.admin_response = ( response_data.response )

    feedback.status = "Reviewed"

    database.commit()

    database.refresh(feedback)

    return feedback


# ==========================================================
# DELETE FEEDBACK
# ==========================================================

@app.delete( "/api/feedback/{feedback_id}", tags=["Admin Dashboard"])
def delete_feedback( feedback_id: int, database: Session = Depends(db.get_db), current_admin=Depends( crud.get_current_admin ) ):

    feedback = ( database.query(db.Feedback) .filter( db.Feedback.id == feedback_id ) .first() )

    if not feedback:
        raise HTTPException( status_code=404, detail="Feedback not found" )

    database.delete(feedback)

    database.commit()

    return { "message": "Feedback deleted successfully", "id": feedback_id }


# ===============================================================
# PROCUREMENT MANAGER DASHBOARD
# ===============================================================
@app.get( "/api/procurement/dashboard", tags=["Manager Dashboard"] )
def procurement_manager_dashboard( database: Session = Depends(db.get_db), current_user: db.User = Depends( crud.require_procurement_manager ), ):
    """
    Procurement Manager Dashboard API.

    JSON structure matches dashboard.js.
    """

    try:

        procurement = crud.procurement_dashboard(database) or {}
        vendor_data = crud.vendor_dashboard(database) or {}
        delivery = crud.delivery_status_dashboard(database) or {}

        # ACTIVE PURCHASE ORDERS
        active_orders = [
            {
                "id": order.get("id"),
                "po_number": order.get( "po_number" ),
                "vendor": order.get( "vendor" ),
                "vendor_id": order.get( "vendor_id" ),
                "amount": order.get( "amount", 0 ),
                "status": order.get( "status" ),
                "order_date": order.get( "order_date" ),
                "actual_delivery": order.get( "actual_delivery" ),
                "expected_delivery": order.get( "expected_delivery" ),
            }
            for order in crud.active_purchase_orders( database, 50 )
        ]

        # RECENT PURCHASE ORDERS
        recent_orders = crud.recent_purchase_orders( database, 5 )

        # MONTHLY SPEND
        monthly_spend = procurement.get( "monthly_spend", [] )
        monthly = [
            {
                "month": item.get( "month" ),
                "actual_spend": item.get( "total_spend", 0 ),
                "budget": item.get( "budget", 0 ),
            }
            for item in monthly_spend
        ]

        # SPEND BY CATEGORY
        categories = [
            {
                "category": item.get( "category", "Other" ),
                "spend": item.get( "total_spend", 0 ),
                "percentage": item.get( "percentage", 0 ),
            }
            for item in procurement.get( "spend_by_category", [] )
        ]

        # TOP SPENDING VENDORS
        top_spending = [
            {
                "vendor": item.get( "vendor", "-" ),
                "total_spend": item.get( "total_spend", 0 ),
                "percentage": item.get( "percentage", 0 ),
            }
            for item in procurement.get( "vendor_spend", [] )[:5]
        ]

        # VENDOR PERFORMANCE

        vendors = []

        for vendor in vendor_data.get( "top_vendors", [] ):
            score = vendor.get( "reliability_score", 0 )
            vendors.append(
                {
                    "vendor": vendor.get( "vendor_name", "-" ),
                    "quality": score,
                    "delivery": score,
                    "service": score,
                    "score": score,
                    "trend": vendor.get( "trend", "flat" ),
                }
            )

        # DELIVERY MONTHLY DATA
        delivery_monthly = []

        for item in delivery.get( "monthly_performance", [] ):
            on_time = item.get( "on_time_percentage", 0 )
            delayed = max( 0, 100 - float( on_time or 0 ) )
            delivery_monthly.append( { "month": item.get( "month" ), "on_time_pct": on_time, "delayed_pct": delayed, } )

        # DELIVERY BY VENDOR
        delivery_vendors = []

        for vendor in delivery.get( "by_vendor", [] ):
            delivery_vendors.append(
                {
                    "vendor": vendor.get( "vendor", vendor.get( "vendor_name", "-" ) ),
                    "on_time": vendor.get( "on_time", vendor.get( "on_time_percentage", 0 ) ),
                    "total_deliveries": vendor.get( "total_deliveries", vendor.get( "total", 0 ) ),
                }
            )

        # RETURN RESPONSE
        # EXACT NAMES EXPECTED BY dashboard.js
        return {
            "success": True,
            "dashboard": "procurement_manager",

            # USER
            "user": {
                "id": current_user.id,
                "name": getattr( current_user, "name", getattr( current_user, "fullname", None ) ),
                "email": getattr( current_user, "email", None ),
                "role": getattr( current_user, "role", None ),
            },

            # KPIs
            "kpis": {
                "total_spend": procurement.get( "total_spend", 0 ),
                "total_pos": procurement.get( "total_purchase_orders", 0 ),
                "suppliers": crud.total_vendors( database ),
                "vendor_average": vendor_data.get( "average_reliability", 0 ),
                "on_time_delivery": delivery.get( "on_time_delivery_rate", 0 ),
            },

            # PROCUREMENT OVERVIEW
            "procurement_overview": {
                "delivered": crud.delivered_orders( database ),
                "in_transit": crud.in_transit_orders( database ),
                "pending": crud.pending_orders( database ),
                "partial": crud.partial_orders( database ),
                "cancelled": crud.cancelled_orders( database ),
            },

            # PURCHASE ORDERS
            "purchase_orders": active_orders,

            # VENDOR PERFORMANCE
            "vendor_performance": vendors,

            # DELIVERY
            "delivery": {
                "on_time": delivery.get( "on_time_delivery_rate", 0 ),
                "delayed": delivery.get( "delayed_delivery_rate", 0 ),
                "avg_delay": delivery.get( "average_delay_days", 0 ),
                "total_deliveries": delivery.get( "total_deliveries", 0 ),
                "monthly": delivery_monthly,
                "by_vendor": delivery_vendors,
            },

            # NOTIFICATIONS
            "notifications": [],

            # MESSAGES
            "messages": [],

            # ADDITIONAL SPENDING DATA
            "monthly": monthly,
            "categories": categories,
            "top_spending": top_spending,

            # RECENT ORDERS
            "recent_orders": recent_orders,
        }

    except Exception as e:
        import traceback
        print( "\n============================================" )
        print( "PROCUREMENT DASHBOARD ERROR" )
        print( "============================================" )
        traceback.print_exc()
        print( "============================================\n" )
        raise HTTPException( status_code=500, detail=f"{type(e).__name__}: {str(e)}" )


# ============================================================
# PROCUREMENT NOTIFICATION COUNT
# ============================================================

@app.get(
    "/api/procurement/notifications/count",
    tags=["Manager Dashboard"]
)
def procurement_notification_count(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_procurement_manager
    ),
):

    try:

        query = database.query(db.Notification)

        if hasattr(db.Notification, "is_read"):

            count = query.filter(
                db.Notification.is_read == 0
            ).count()

        elif hasattr(db.Notification, "status"):

            count = query.filter(
                db.Notification.status == "Unread"
            ).count()

        else:

            count = query.count()


        return {
            "success": True,
            "count": count
        }


    except Exception as e:

        print(
            "Notification count error:",
            e
        )

        return {
            "success": True,
            "count": 0
        }


# ============================================================
# PROCUREMENT MESSAGE COUNT
# ============================================================

@app.get(
    "/api/procurement/messages/count",
    tags=["Manager Dashboard"]
)
def procurement_message_count(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_procurement_manager
    ),
):

    try:

        query = database.query(db.Message)

        if hasattr(db.Message, "is_read"):

            count = query.filter(
                db.Message.is_read == 0
            ).count()

        elif hasattr(db.Message, "status"):

            count = query.filter(
                db.Message.status == "Unread"
            ).count()

        else:

            count = query.count()


        return {
            "success": True,
            "count": count
        }


    except Exception as e:

        print(
            "Message count error:",
            e
        )

        return {
            "success": True,
            "count": 0
        }


# ============================================================
# PROCUREMENT COMMUNICATION CONTACTS
# ============================================================

@app.get(
    "/api/procurement/communication/contacts",
    tags=["Procurement Communication"]
)
def procurement_communication_contacts(
    search: Optional[str] = Query(
        default=None
    ),

    target_type: str = Query(
        default="all"
    ),

    database: Session = Depends(
        db.get_db
    ),

    current_user=Depends(
        crud.require_procurement_manager
    )
):

    return crud.get_procurement_communication_contacts(
        database=database,
        current_user=current_user,
        search=search,
        target_type=target_type
    )


# ============================================================
# GET COMPLETE PROCUREMENT CONVERSATION
# ============================================================

@app.get(
    "/api/procurement/communication/conversation/{target_type}/{target_id}",
    tags=["Procurement Communication"]
)
def procurement_get_conversation(
    target_type: str,
    target_id: str,

    database: Session = Depends(
        db.get_db
    ),

    current_user=Depends(
        crud.require_procurement_manager
    )
):

    return crud.get_procurement_conversation(
        database=database,
        current_user=current_user,
        target_type=target_type,
        target_id=target_id
    )


# ============================================================
# SEND PROCUREMENT MESSAGE
# ============================================================

@app.post(
    "/api/procurement/communication/conversation/{target_type}/{target_id}",
    tags=["Procurement Communication"]
)
def procurement_send_message(
    target_type: str,
    target_id: str,

    payload: dict,

    database: Session = Depends(
        db.get_db
    ),

    current_user=Depends(
        crud.require_procurement_manager
    )
):

    message_text = (
        payload.get("message") or ""
    ).strip()

    return crud.send_procurement_message(
        database=database,
        current_user=current_user,
        target_type=target_type,
        target_id=target_id,
        message_text=message_text
    )


# ============================================================
# LIST REQUESTS
# ============================================================

@app.get("/api/procurement-requests/", tags=["Manager Dashboard"])
def get_procurement_requests(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    tab: str = Query("all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_procurement_manager)
):

    query = database.query(db.ProcurementRequest)

    # --------------------------------------------------------
    # SEARCH
    # --------------------------------------------------------

    if search:
        search_value = f"%{search}%"

        query = query.filter(
            or_(
                db.ProcurementRequest.request_number.ilike( search_value ),
                db.ProcurementRequest.requester.ilike( search_value ),
                db.ProcurementRequest.department.ilike( search_value ),
                db.ProcurementRequest.category.ilike( search_value ),
                db.ProcurementRequest.description.ilike( search_value )
            )
        )

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    if status and status != "All":
        query = query.filter( db.ProcurementRequest.status == status )

    # --------------------------------------------------------
    # DEPARTMENT
    # --------------------------------------------------------

    if department and department != "All":
        query = query.filter( db.ProcurementRequest.department == department )

    # --------------------------------------------------------
    # PRIORITY
    # --------------------------------------------------------

    if priority and priority != "All":
        query = query.filter( db.ProcurementRequest.priority == priority )

    # --------------------------------------------------------
    # DATE FILTER
    # --------------------------------------------------------

    if start_date:
        query = query.filter( func.date( db.ProcurementRequest.created_at ) >= start_date )

    if end_date:
        query = query.filter( func.date( db.ProcurementRequest.created_at ) <= end_date )

    # --------------------------------------------------------
    # TABS
    # --------------------------------------------------------

    if tab == "mine":

        # Prefer requester_user_id when the column exists.
        if hasattr( db.ProcurementRequest, "requester_user_id" ):
            query = query.filter( db.ProcurementRequest.requester_user_id == current_user.id )
        else:
            query = query.filter( db.ProcurementRequest.requester == current_user.name )

    elif tab == "pending":
        query = query.filter( db.ProcurementRequest.status == "Pending Approval" )

    # --------------------------------------------------------
    # TOTAL
    # --------------------------------------------------------

    total = query.count()

    # --------------------------------------------------------
    # PAGINATION
    # --------------------------------------------------------

    offset = (page - 1) * page_size

    requests = ( query .order_by( db.ProcurementRequest.created_at.desc() ) .offset(offset) .limit(page_size) .all() )

    return {
        "requests": [
            crud.serialize_request(item)
            for item in requests
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": ( (total + page_size - 1) // page_size )
    }


# ============================================================
# KPI STATISTICS
# ============================================================

@app.get("/api/procurement-requests/statistics", tags=["Manager Dashboard"])
def procurement_statistics(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_procurement_manager)
):

    query = database.query(db.ProcurementRequest)

    if start_date:
        query = query.filter( func.date( db.ProcurementRequest.created_at ) >= start_date )

    if end_date:
        query = query.filter( func.date( db.ProcurementRequest.created_at ) <= end_date )

    total = query.count()

    draft = query.filter( db.ProcurementRequest.status == "Draft" ).count()

    pending = query.filter( db.ProcurementRequest.status == "Pending Approval" ).count()

    approved = query.filter( db.ProcurementRequest.status == "Approved" ).count()

    rejected = query.filter( db.ProcurementRequest.status == "Rejected" ).count()

    completed = query.filter( db.ProcurementRequest.status == "Completed" ).count()

    return {
        "total": total,
        "draft": draft,
        "pending_approval": pending,
        "approved": approved,
        "rejected": rejected,
        "completed": completed
    }


# ============================================================
# DEPARTMENTS
# ============================================================

@app.get("/api/procurement-requests/departments", tags=["Manager Dashboard"])
def get_departments(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_procurement_manager)
):

    rows = (
        database.query( db.ProcurementRequest.department )
        .filter( db.ProcurementRequest.department.isnot(None) )
        .distinct() .order_by( db.ProcurementRequest.department ) .all()
    )

    return [
        row[0]
        for row in rows
        if row[0]
    ]


# ============================================================
# CREATE REQUEST
# ============================================================

@app.post( "/api/procurement-requests/", response_model=db.ProcurementRequestListItem, tags=["Manager Dashboard"] )
def create_procurement_request(
    payload: db.ProcurementRequestCreateAPI,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_procurement_manager )
):

    request_number = crud.generate_request_number(database)

    request = db.ProcurementRequest(
        request_number=request_number,
        requester=current_user.name,
        department=( payload.department or current_user.department ),
        category=payload.category,
        description=payload.description,
        amount=payload.amount,
        required_date=payload.required_date,
        priority=payload.priority,
        status="Draft",
        created_at=datetime.utcnow(),
        submitted_at=datetime.utcnow()
    )

    # Works after adding requester_user_id
    if hasattr( db.ProcurementRequest, "requester_user_id" ):
        request.requester_user_id = current_user.id

    if hasattr( db.ProcurementRequest, "title" ):
        request.title = payload.title

    database.add(request)
    database.commit()
    database.refresh(request)

    return crud.serialize_request(request)


# ============================================================
# GET ONE REQUEST
# ============================================================

@app.get( "/api/procurement-requests/{request_id}", response_model=db.ProcurementRequestListItem, tags=["Manager Dashboard"])
def get_procurement_request(
    request_id: int,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_procurement_manager )
):

    request = ( database.query(db.ProcurementRequest) .filter( db.ProcurementRequest.id == request_id ) .first() )

    if not request:
        raise HTTPException( status_code=404, detail="Procurement request not found" )

    return crud.serialize_request(request)


# ============================================================
# UPDATE STATUS
# ============================================================

@app.patch( "/api/procurement-requests/{request_id}/status", tags=["Manager Dashboard"])
def update_procurement_status(
    request_id: int,
    payload: db.ProcurementRequestStatusUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_procurement_manager )
):

    allowed_statuses = { "Draft", "Pending Approval", "Approved", "Rejected", "Completed", "Cancelled" }

    if payload.status not in allowed_statuses:
        raise HTTPException( status_code=400, detail="Invalid procurement request status" )

    request = ( database.query(db.ProcurementRequest) .filter( db.ProcurementRequest.id == request_id ) .first() )

    if not request:
        raise HTTPException( status_code=404, detail="Procurement request not found" )

    request.status = payload.status

    if payload.status == "Approved":
        request.approved_at = datetime.utcnow()
        request.approved_by = current_user.id

    if payload.status == "Rejected":
        if hasattr( request, "rejection_reason" ):
            request.rejection_reason = ( payload.rejection_reason )

    database.commit()
    database.refresh(request)

    return {
        "message": "Procurement request updated",
        "request": crud.serialize_request(request)
    }


# ============================================================
# DELETE
# ============================================================

@app.delete("/api/procurement-requests/{request_id}", tags=["Manager Dashboard"])
def delete_procurement_request(
    request_id: int,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_procurement_manager )
):

    request = ( database.query(db.ProcurementRequest) .filter( db.ProcurementRequest.id == request_id ) .first() )

    if not request:
        raise HTTPException( status_code=404, detail="Procurement request not found" )

    database.delete(request)
    database.commit()

    return { "message": "Procurement request deleted" }


# ============================================================
# PURCHASE ORDER OPTIONS
# ============================================================

@app.get( "/api/procurement/purchase-orders/options", tags=["Manager Dashboard"] )
def purchase_order_options(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_admin_or_procurement_manager )
):

    vendors = ( database.query(db.Vendor)
        .filter( db.Vendor.status.in_( ["approved", "active", "Approved", "Active"] ) )
        .order_by(db.Vendor.vendor_id.asc()) .all()
    )

    departments = ( database.query( db.PurchaseOrder.department )
        .filter( db.PurchaseOrder.department.isnot(None) ) .distinct()
        .order_by( db.PurchaseOrder.department.asc() ) .all()
    )

    return {
        "success": True,

        "vendors": [
            {
                "vendor_id": vendor.vendor_id,
                "vendor_name": vendor.vendor_name,
                "contact_person": vendor.contact_person,
                "phone": vendor.phone,
                "email": vendor.email
            }
            for vendor in vendors
        ],

        "departments": [ row[0]
            for row in departments
            if row[0] ]
    }


# ============================================================
# PURCHASE ORDER LIST
# ============================================================

@app.get( "/api/procurement/purchase-orders/page", tags=["Manager Dashboard"] )
def procurement_purchase_orders_page(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query("All"),
    department: Optional[str] = Query("All"),
    vendor_id: Optional[str] = Query("All"),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    tab: str = Query("all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_admin_or_procurement_manager )
):

    query = ( database.query(db.PurchaseOrder)
        .outerjoin(
            db.Vendor, db.PurchaseOrder.vendor_id == db.Vendor.vendor_id
        )
    )


    # --------------------------------------------------------
    # SEARCH
    # --------------------------------------------------------

    if search:
        value = f"%{search.strip()}%"
        query = query.filter(
            or_(
                db.PurchaseOrder.po_number.ilike(value),
                db.PurchaseOrder.vendor_id.ilike(value),
                db.Vendor.vendor_name.ilike(value),
                db.PurchaseOrder.department.ilike(value),
                db.PurchaseOrder.pr_number.ilike(value)
            )
        )


    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    if status and status != "All":
        query = query.filter( db.PurchaseOrder.status == status )


    # --------------------------------------------------------
    # DEPARTMENT
    # --------------------------------------------------------

    if department and department != "All":
        query = query.filter( db.PurchaseOrder.department == department )


    # --------------------------------------------------------
    # VENDOR
    # --------------------------------------------------------

    if vendor_id and vendor_id != "All":
        query = query.filter( db.PurchaseOrder.vendor_id == vendor_id )


    # --------------------------------------------------------
    # DATE RANGE
    # --------------------------------------------------------

    if from_date:
        query = query.filter( db.PurchaseOrder.order_date >= from_date )

    if to_date:
        query = query.filter( db.PurchaseOrder.order_date <= to_date )


    # --------------------------------------------------------
    # TABS
    # --------------------------------------------------------

    if tab == "mine":
        query = query.filter( db.PurchaseOrder.created_by == current_user.id )

    elif tab == "drafts":
        query = query.filter( db.PurchaseOrder.status == "Draft" )


    # --------------------------------------------------------
    # TOTAL
    # --------------------------------------------------------

    total = query.count()


    # --------------------------------------------------------
    # PAGINATION
    # --------------------------------------------------------

    offset = (page - 1) * page_size

    orders = ( query .order_by( db.PurchaseOrder.id.desc() ) .offset(offset) .limit(page_size) .all() )

    items = []

    for order in orders:
        received_percentage = 0
        if order.items:
            ordered_quantity = sum(
                float(item.quantity or 0)
                for item in order.items
            )
            received_quantity = sum(
                float( getattr( item, "received_quantity", 0 ) or 0 )
                for item in order.items
            )
            if ordered_quantity > 0:
                received_percentage = min( 100, round( received_quantity / ordered_quantity * 100, 1 ) )


        items.append({
            "id": order.id,
            "po_number": order.po_number,
            "vendor_id": order.vendor_id,
            "vendor_name":
                ( order.vendor.vendor_name
                    if order.vendor
                    else order.vendor_id ),
            "department": getattr( order, "department", None ),
            "order_date": ( order.order_date.isoformat()
                    if order.order_date
                    else None ),
            "expected_delivery": ( order.expected_delivery.isoformat()
                    if order.expected_delivery
                    else None ),
            "status": order.status,
            "amount": float(order.amount or 0),
            "received_percentage": received_percentage
        })


    return {
        "success": True,
        "items": items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages":
                (
                    (total + page_size - 1) // page_size
                    if total
                    else 1
                )
        }
    }


# ============================================================
# CREATE PROCUREMENT PURCHASE ORDER
# ============================================================

@app.post(
    "/api/procurement/purchase-orders",
    tags=["Manager Dashboard"]
)
def create_procurement_purchase_order(
    purchase_order: db.PurchaseOrderCreate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_admin_or_procurement_manager
    )
):
    try:

        created_po = crud.create_purchase_order(
            database,
            purchase_order,
            current_user
        )

        return {
            "success": True,

            "message": (
                "Purchase order created successfully "
                "and sent to Finance Officer for approval."
            ),

            "purchase_order": {
                "id": created_po.id,

                "po_number": created_po.po_number,

                "vendor_id": created_po.vendor_id,

                "category": created_po.category,

                "amount": float(
                    created_po.amount or 0
                ),

                "status": created_po.status,

                "order_date": (
                    created_po.order_date.isoformat()
                    if created_po.order_date
                    else None
                ),

                "expected_delivery": (
                    created_po.expected_delivery.isoformat()
                    if created_po.expected_delivery
                    else None
                ),

                "department": created_po.department,

                "created_by": created_po.created_by
            }
        }

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except HTTPException:
        raise

    except Exception as e:

        print(
            "PROCUREMENT PURCHASE ORDER ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to create purchase order."
        )


# ============================================================
# PURCHASE ORDER STATISTICS
# ============================================================

@app.get( "/api/procurement/purchase-orders/statistics", tags=["Manager Dashboard"] )
def procurement_purchase_order_statistics(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_admin_or_procurement_manager )
):

    today = date.today()

    month_start = today.replace(day=1)

    previous_month_end = month_start - timedelta(days=1)

    previous_month_start = previous_month_end.replace( day=1 )


    # --------------------------------------------------------
    # TOTAL
    # --------------------------------------------------------

    total_pos = ( database.query( func.count(db.PurchaseOrder.id) ) .scalar() or 0 )


    # --------------------------------------------------------
    # MTD SPEND
    # --------------------------------------------------------

    mtd_spend = (
        database.query( func.sum(db.PurchaseOrder.amount) )
        .filter( db.PurchaseOrder.order_date >= month_start )
        .filter( db.PurchaseOrder.order_date <= today ) .scalar() or 0
    )


    # --------------------------------------------------------
    # PREVIOUS MONTH SPEND
    # --------------------------------------------------------

    previous_spend = (
        database.query( func.sum(db.PurchaseOrder.amount) )
        .filter( db.PurchaseOrder.order_date >= previous_month_start )
        .filter( db.PurchaseOrder.order_date <= previous_month_end ) .scalar() or 0
    )


    # --------------------------------------------------------
    # STATUS COUNTS
    # --------------------------------------------------------

    pending = ( database.query(db.PurchaseOrder) .filter( db.PurchaseOrder.status == "Pending" ) .count() )

    ordered = ( database.query(db.PurchaseOrder) .filter( db.PurchaseOrder.status == "Ordered" ) .count() )

    partially_received = ( database.query(db.PurchaseOrder) .filter( db.PurchaseOrder.status == "Partially Received" ) .count() )

    completed = ( database.query(db.PurchaseOrder) .filter( db.PurchaseOrder.status == "Completed" ) .count() )


    # --------------------------------------------------------
    # PERCENTAGE HELPER
    # --------------------------------------------------------

    def percentage_change(current, previous):
        current = float(current or 0)
        previous = float(previous or 0)
        if previous == 0:
            return 100 if current > 0 else 0
        return round( ((current - previous) / previous) * 100, 1 )


    # --------------------------------------------------------
    # RETURN
    # --------------------------------------------------------

    return {
        "success": True,
        "statistics": {
            "total_pos": total_pos,
            "mtd_spend": round( float(mtd_spend), 2 ),
            "pending": pending,
            "ordered": ordered,
            "partially_received": partially_received,
            "completed": completed,
            "total_change": 0,
            "spend_change": percentage_change( mtd_spend, previous_spend ),
            "pending_change": 0,
            "ordered_change": 0,
            "partial_change": 0,
            "completed_change": 0
        }
    }


# ============================================================
# PURCHASE ORDER CSV EXPORT
# ============================================================

@app.get( "/api/procurement/purchase-orders/export/csv", tags=["Manager Dashboard"] )
def export_purchase_orders_csv(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query("All"),
    department: Optional[str] = Query("All"),
    vendor_id: Optional[str] = Query("All"),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_admin_or_procurement_manager )
):

    query = ( database.query(db.PurchaseOrder)
        .outerjoin( db.Vendor, db.PurchaseOrder.vendor_id == db.Vendor.vendor_id )
    )


    if search:
        value = f"%{search.strip()}%"
        query = query.filter(
            or_(
                db.PurchaseOrder.po_number.ilike(value), db.PurchaseOrder.vendor_id.ilike(value),
                db.Vendor.vendor_name.ilike(value), db.PurchaseOrder.department.ilike(value)
            )
        )


    if status and status != "All":
        query = query.filter( db.PurchaseOrder.status == status )


    if department and department != "All":
        query = query.filter( db.PurchaseOrder.department == department )


    if vendor_id and vendor_id != "All":
        query = query.filter( db.PurchaseOrder.vendor_id == vendor_id )


    if from_date:
        query = query.filter( db.PurchaseOrder.order_date >= from_date )


    if to_date:
        query = query.filter( db.PurchaseOrder.order_date <= to_date )


    orders = ( query .order_by( db.PurchaseOrder.id.desc() ) .all() )


    output = io.StringIO()

    writer = csv.writer(output)

    writer.writerow([ "PO Number", "Vendor", "Department", "Order Date", "Expected Delivery", "Status", "Amount" ])


    for order in orders:
        writer.writerow([
            order.po_number,
            ( order.vendor.vendor_name
                if order.vendor
                else order.vendor_id ),
            getattr( order, "department", "" ),
            ( order.order_date.isoformat()
                if order.order_date
                else "" ),
            ( order.expected_delivery.isoformat()
                if order.expected_delivery
                else "" ),
            order.status,
            float(order.amount or 0)
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={ "Content-Disposition": "attachment; filename=purchase_orders.csv" }
    )


@app.get( "/api/approvals/summary", tags=["Manager Dashboard"] )
def get_approval_summary(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_procurement_manager )
):
    return crud.approval_statistics( database, current_user, start_date, end_date )


@app.get( "/api/approvals", tags=["Manager Dashboard"] )
def get_approvals(
    search: Optional[str] = Query(None), reference_type: Optional[str] = Query(None),
    department: Optional[str] = Query(None), priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None), start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None), tab: str = Query("mine"),
    page: int = Query( 1, ge=1 ), page_size: int = Query( 10, ge=1, le=100 ),
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_procurement_manager )
):

    return crud.get_approval_workflows(
        database=database, current_user=current_user,
        search=search, reference_type=reference_type,
        department=department, priority=priority,
        status=status, start_date=start_date,
        end_date=end_date, tab=tab,
        page=page, page_size=page_size
    )


@app.get( "/api/approvals/{workflow_id}", tags=["Manager Dashboard"] )
def get_approval_details(
    workflow_id: int, database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_procurement_manager )
):

    workflow = ( database.query( db.ApprovalWorkflow ) .filter( db.ApprovalWorkflow.id == workflow_id ) .first() )

    if not workflow:
        raise HTTPException( status_code=404, detail="Approval not found" )

    steps = ( database.query( db.ApprovalStep )
        .filter( db.ApprovalStep.workflow_id == workflow_id )
        .order_by( db.ApprovalStep.step_order.asc() ) .all()
    )

    return {
        "workflow": {
            "id": workflow.id,
            "reference_type": workflow.reference_type,
            "reference_number": workflow.reference_number,
            "title": workflow.title,
            "requested_by": ( workflow.requested_by.name
                if workflow.requested_by
                else None
            ),
            "department": workflow.department,
            "amount": float(workflow.amount or 0),
            "priority": workflow.priority,
            "status": workflow.status,
            "current_step": workflow.current_step,
            "created_at": ( workflow.created_at.isoformat()
                if workflow.created_at
                else None
            )
        },

        "steps": [
            {
                "id": step.id,
                "step_order": step.step_order,
                "step_name": step.step_name,
                "approver_user_id": step.approver_user_id,
                "approver_name": ( step.approver.name
                    if step.approver
                    else None
                ),
                "status": step.status,
                "comments": step.comments,
                "acted_at": ( step.acted_at.isoformat()
                    if step.acted_at
                    else None
                )
            }
            for step in steps
        ]
    }


@app.post( "/api/approvals/{workflow_id}/decision", tags=["Manager Dashboard"] )
def approval_decision(
    workflow_id: int,
    payload: db.ApprovalDecision,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_procurement_manager )
):

    workflow = crud.process_approval_decision(
        database=database, workflow_id=workflow_id, current_user=current_user,
        decision=payload.status, comments=payload.comments
    )

    return {
        "success": True, "message": ( "Approval updated successfully" ),
        "workflow_id": workflow.id, "status": workflow.status
    }


def backfill_approval_workflows(database):

    requests = ( database.query( db.ProcurementRequest )
        .filter( db.ProcurementRequest.status == "Pending Approval" ) .all()
    )

    for request in requests:

        existing = ( database.query( db.ApprovalWorkflow ) .filter(
                db.ApprovalWorkflow.reference_type == "PR",
                db.ApprovalWorkflow.reference_id == request.id
            ) .first()
        )

        if existing:
            continue

        crud.create_approval_workflow(
            database=database, reference_type="PR", reference_id=request.id,
            reference_number=request.request_number, title=( request.title or request.description ),
            requested_by_user_id=( request.requester_user_id ), department=request.department,
            amount=request.amount, priority=request.priority
        )

    return { "success": True, "message": "Approval workflows created" }


# ============================================================
# PROCUREMENT MANAGER - VENDORS PAGE
# ============================================================

@app.get("/api/procurement/vendors/dashboard", tags=["Manager Dashboard"])
def procurement_vendors_dashboard(
    search: str = Query(""), status: str = Query("All"), category: str = Query("All"),
    location: str = Query("All"), risk_level: str = Query("All"), tab: str = Query("all"),
    page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100), database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_procurement_manager),
):
    """
    Vendors page for Procurement Manager.

    Returns:
        KPI cards
        filters
        paginated vendors
    """

    try:
        query = database.query(db.Vendor)

        # --------------------------------------------------------
        # SEARCH
        # --------------------------------------------------------

        if search:
            value = f"%{search.strip()}%"

            query = query.filter( or_(
                    db.Vendor.vendor_id.ilike(value), db.Vendor.vendor_name.ilike(value),
                    db.Vendor.email.ilike(value), db.Vendor.category.ilike(value),
                    db.Vendor.contact_person.ilike(value), db.Vendor.country.ilike(value),
                )
            )

        # --------------------------------------------------------
        # STATUS
        # --------------------------------------------------------

        if status != "All":
            query = query.filter( db.Vendor.status == status )

        # --------------------------------------------------------
        # CATEGORY
        # --------------------------------------------------------

        if category != "All":
            query = query.filter( db.Vendor.category == category )

        # --------------------------------------------------------
        # PREFERRED TAB
        # --------------------------------------------------------

        if tab == "preferred":
            if hasattr(db.Vendor, "is_preferred"):
                query = query.filter( db.Vendor.is_preferred == True )

        elif tab == "blacklisted":
            query = query.filter( db.Vendor.status == "Blacklisted" )

        # --------------------------------------------------------
        # LOCATION
        # --------------------------------------------------------

        if location != "All":

            address_model = getattr( database, "SupplierAddress", None )

            if address_model is not None:

                query = query.outerjoin(
                    address_model,
                    address_model.vendor_id == db.Vendor.vendor_id
                ).filter( or_(
                        db.Vendor.country == location,
                        address_model.city == location,
                        address_model.state_province == location
                    )
                )

            else:
                query = query.filter( db.Vendor.country == location )

        # --------------------------------------------------------
        # RISK
        # --------------------------------------------------------
        # Risk is derived from reliability score because the
        # current Vendor model does not have a risk_level column.

        if risk_level == "Low":
            query = query.filter( db.Vendor.reliability_score >= 80 )

        elif risk_level == "Medium":
            query = query.filter( db.Vendor.reliability_score >= 60, db.Vendor.reliability_score < 80 )

        elif risk_level == "High":
            query = query.filter( db.Vendor.reliability_score < 60 )

        # --------------------------------------------------------
        # DISTINCT
        # --------------------------------------------------------

        query = query.distinct()

        total = query.count()

        pages = max( 1, (total + limit - 1) // limit )

        vendors = (
            query .order_by(db.Vendor.vendor_name.asc())
            .offset((page - 1) * limit) .limit(limit) .all()
        )

        # --------------------------------------------------------
        # VENDOR ROWS
        # --------------------------------------------------------

        vendor_rows = []

        for vendor in vendors:

            score = float( vendor.reliability_score or 0 )

            # Derive 1-5 display score
            display_score = round( score / 20, 1 )

            # Derive risk
            if score >= 80:
                derived_risk = "Low"
            elif score >= 60:
                derived_risk = "Medium"
            else:
                derived_risk = "High"

            # Actual contract count
            actual_contract_count = ( database.query( func.count(db.Contract.id) )
                .filter( db.Contract.vendor_id == vendor.vendor_id ) .scalar() or 0 
            )

            vendor_rows.append({
                "id": vendor.id,
                "vendor_id": vendor.vendor_id,
                "vendor_name": vendor.vendor_name,
                "category": vendor.category or "General",
                "contact_person": vendor.contact_person or "-",
                "email": vendor.email,
                "phone": vendor.phone,
                "country": vendor.country,
                "address": vendor.address,
                "status": vendor.status,
                "reliability_score": score,
                "display_score": display_score,

                "quality_score": float( vendor.quality_score or 0 ),

                "delivery_score": float( vendor.delivery_score or 0 ),

                "service_score": float( vendor.service_score or 0 ),

                "risk_level": derived_risk,

                "is_preferred": ( bool(vendor.is_preferred)
                    if hasattr(vendor, "is_preferred")
                    else False
                ),

                "contract_count": actual_contract_count,

                "created_at": ( vendor.created_at.isoformat()
                    if vendor.created_at
                    else None
                ),

                "member_since": ( vendor.member_since.isoformat()
                    if vendor.member_since
                    else None
                ),
            })

        # --------------------------------------------------------
        # KPI
        # --------------------------------------------------------

        total_vendors = ( database.query( func.count(db.Vendor.id) ).scalar() or 0 )

        active_vendors = ( database.query(db.Vendor) .filter( db.Vendor.status == "Active" or db.Vendor.status == "active") .count() )

        blacklisted_vendors = ( database.query(db.Vendor) .filter( db.Vendor.status == "Blacklisted" ) .count() )

        preferred_vendors = 0

        if hasattr(db.Vendor, "is_preferred"):
            preferred_vendors = ( database.query(db.Vendor) .filter( db.Vendor.is_preferred == True ) .count() )

        first_day = date.today().replace(day=1)

        new_this_month = ( database.query(db.Vendor)
            .filter( db.Vendor.created_at >= datetime.combine( first_day, datetime.min.time() )
            ) .count()
        )

        average_score = ( database.query( func.avg( db.Vendor.reliability_score ) )
            .filter( db.Vendor.reliability_score.isnot(None) ) .scalar() or 0
        )

        return {
            "success": True,

            "statistics": {
                "total_vendors": total_vendors,
                "active_vendors": active_vendors,
                "preferred_vendors": preferred_vendors,
                "blacklisted_vendors": blacklisted_vendors,
                "new_this_month": new_this_month,
                "average_score": round(float(average_score) / 20, 1)
            },

            "vendors": vendor_rows,

            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "pages": pages
            }
        }

    except Exception as exc:
        database.rollback()
        print( "Vendors dashboard error:", repr(exc) )
        raise HTTPException( status_code=500, detail=f"Unable to load vendors: {str(exc)}" )


@app.get( "/api/procurement/vendors/filters", tags=["Manager Dashboard"] )
def procurement_vendor_filters(
    database: Session = Depends(db.get_db)
):

    categories = ( database.query(db.Vendor.category) .filter(db.Vendor.category.isnot(None))
        .distinct() .order_by(db.Vendor.category) .all()
    )

    countries = ( database.query(db.Vendor.country) .filter(db.Vendor.country.isnot(None))
        .distinct() .order_by(db.Vendor.country) .all()
    )

    statuses = ( database.query(db.Vendor.status) .filter(db.Vendor.status.isnot(None))
        .distinct() .order_by(db.Vendor.status) .all()
    )

    business_types = ( database.query(db.Vendor.business_type) .filter(db.Vendor.business_type.isnot(None))
        .distinct() .order_by(db.Vendor.business_type) .all()
    )

    return {
        "categories": [ row[0]
            for row in categories
            if row[0]
        ],
        "countries": [ row[0]
            for row in countries
            if row[0]
        ],
        "statuses": [ row[0]
            for row in statuses
            if row[0]
        ],
        "business_types": [ row[0]
            for row in business_types
            if row[0]
        ]
    }


# ============================================================
# SINGLE VENDOR DETAILS
# ============================================================

@app.get( "/api/procurement/vendors/{vendor_id}", tags=["Manager Dashboard"] )
def procurement_vendor_details(
    vendor_id: str, database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_procurement_manager ),
):

    vendor = ( database.query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    # --------------------------------------------------------
    # PRIMARY ADDRESS
    # --------------------------------------------------------

    primary_address = None

    if hasattr(db, "SupplierAddress"):
        primary_address = ( database.query(db.SupplierAddress)
            .filter( db.SupplierAddress.vendor_id == vendor.vendor_id ) .order_by(
                db.SupplierAddress.is_primary.desc(), db.SupplierAddress.id.asc()
            ) .first()
        )

    # --------------------------------------------------------
    # PRIMARY CONTACT
    # --------------------------------------------------------

    primary_contact = None

    if hasattr(db, "SupplierContact"):
        primary_contact = ( database.query(db.SupplierContact)
            .filter( db.SupplierContact.vendor_id == vendor.vendor_id ) .order_by(
                db.SupplierContact.is_primary.desc(), db.SupplierContact.id.asc()
            ) .first()
        )

    # --------------------------------------------------------
    # LATEST ASSESSMENT
    # --------------------------------------------------------

    assessment = None

    if hasattr(db, "SupplierAssessment"):
        assessment = ( database.query(db.SupplierAssessment)
            .filter( db.SupplierAssessment.vendor_id == vendor.vendor_id )
            .order_by( db.SupplierAssessment.assessment_date.desc() ) .first()
        )

    # --------------------------------------------------------
    # CONTRACTS
    # --------------------------------------------------------

    contracts = ( database.query(db.Contract)
        .filter( db.Contract.vendor_id == vendor.vendor_id )
        .order_by( db.Contract.expiry_date.asc() ) .all()
    )

    # --------------------------------------------------------
    # DOCUMENTS
    # --------------------------------------------------------

    documents = []

    if hasattr(db, "Document"):
        documents = ( database.query(db.Document)
            .filter( db.Document.vendor_id == vendor.vendor_id )
            .order_by( db.Document.uploaded_on.desc() ) .limit(20) .all()
        )

    # --------------------------------------------------------
    # PURCHASE ORDERS
    # --------------------------------------------------------

    purchase_orders = ( database.query(db.PurchaseOrder)
        .filter( db.PurchaseOrder.vendor_id == vendor.vendor_id )
        .order_by( db.PurchaseOrder.order_date.desc() ) .limit(100) .all()
    )

    # --------------------------------------------------------
    # AVERAGE DELIVERY TIME
    # --------------------------------------------------------

    delivery_days = []

    for po in purchase_orders:
        if ( po.order_date and po.actual_delivery ):
            days = ( po.actual_delivery - po.order_date ).days
            if days >= 0:
                delivery_days.append(days)

    average_delivery_time = ( round( sum(delivery_days) / len(delivery_days), 1 )
        if delivery_days
        else 0 )

    # --------------------------------------------------------
    # PAYMENT TERMS
    # --------------------------------------------------------

    payment_terms = None

    if hasattr(db, "PurchaseOrderDetails"):
        latest_po = ( database.query(db.PurchaseOrderDetails) .join(
                db.PurchaseOrder,
                db.PurchaseOrder.id == db.PurchaseOrderDetails.purchase_order_id
            ) .filter( db.PurchaseOrder.vendor_id == vendor.vendor_id )
            .order_by( db.PurchaseOrder.id.desc() ) .first()
        )
        if latest_po:
            payment_terms = latest_po.payment_terms

    # --------------------------------------------------------
    # RISK
    # --------------------------------------------------------

    score = float( vendor.reliability_score or 0 )

    if score >= 80:
        risk_level = "Low"
    elif score >= 60:
        risk_level = "Medium"
    else:
        risk_level = "High"

    # --------------------------------------------------------
    # LOCATION
    # --------------------------------------------------------

    location = {
        "city": None,
        "state": None,
        "postal_code": None,
        "country": vendor.country,
        "address": vendor.address
    }

    if primary_address:
        location = {
            "city": primary_address.city,
            "state": primary_address.state_province,
            "postal_code": primary_address.postal_code,
            "country": primary_address.country,
            "address": primary_address.address_line1
        }

    # --------------------------------------------------------
    # RETURN
    # --------------------------------------------------------

    return {
        "success": True,

        "vendor": {
            "id": vendor.id,
            "vendor_id": vendor.vendor_id,
            "vendor_name": vendor.vendor_name,
            "category": vendor.category,
            "business_type": vendor.business_type,
            "email": vendor.email,
            "phone": vendor.phone,
            "contact_person": ( primary_contact.contact_name
                    if primary_contact
                    else vendor.contact_person ),
            "contact_email": ( primary_contact.email
                    if primary_contact
                    else vendor.email ),
            "contact_phone": ( primary_contact.phone
                    if primary_contact
                    else vendor.phone ),
            "status": vendor.status,
            "is_preferred": ( bool(vendor.is_preferred)
                    if hasattr(vendor, "is_preferred")
                    else False ),
            "reliability_score": score,
            "display_score": round(score / 20, 1),
            "quality_score": float(vendor.quality_score or 0),
            "delivery_score": float(vendor.delivery_score or 0),
            "service_score": float(vendor.service_score or 0),
            "risk_level": risk_level,
            "gst_vat_number": vendor.gst_vat_number,
            "pan_number": vendor.pan_number,
            "payment_terms": payment_terms,
            "average_delivery_time": average_delivery_time,
            "member_since": ( vendor.member_since.isoformat()
                    if vendor.member_since
                    else None ),
            "created_at": ( vendor.created_at.isoformat()
                    if vendor.created_at
                    else None ),
            "notes": ( assessment.notes
                    if assessment
                    else None ),
            "location": location,
            "contract_count": len(contracts)
        },

        "contracts": [
            {
                "id": contract.id,
                "contract_number": contract.contract_number,
                "status": contract.status,
                "expiry_date": ( contract.expiry_date.isoformat()
                        if contract.expiry_date
                        else None ),
                "renewal_date": ( contract.renewal_date.isoformat()
                        if contract.renewal_date
                        else None ),
                "contract_value": float(contract.contract_value or 0),
                "compliance_status": contract.compliance_status,
                "risk_level": contract.risk_level
            }
            for contract in contracts
        ],

        "documents": [
            {
                "id": document.id,
                "document_name": document.document_name,
                "category": document.category,
                "document_type": document.document_type,
                "status": document.status,
                "expiry_date": ( document.expiry_date.isoformat()
                        if document.expiry_date
                        else None )
            }
            for document in documents
        ]
    }


@app.get( "/api/order-tracking/dashboard", tags=["Manager Dashboard"] )
def get_order_tracking_dashboard(
    search: str = Query(""), status: str = Query("All"),
    vendor_id: str = Query("All"), date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None), page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100), database: Session = Depends(db.get_db)
):

    # ---------------------------------------------------------
    # BASE PURCHASE ORDERS
    # ---------------------------------------------------------

    query = ( database.query(db.PurchaseOrder)
        .options( joinedload(db.PurchaseOrder.vendor), joinedload(db.PurchaseOrder.items) )
    )

    # ---------------------------------------------------------
    # SEARCH
    # ---------------------------------------------------------

    if search.strip():
        keyword = f"%{search.strip().lower()}%"
        query = query.filter( or_(
                func.lower(db.PurchaseOrder.po_number).like(keyword),
                func.lower(db.PurchaseOrder.vendor_id).like(keyword)
            )
        )

    # ---------------------------------------------------------
    # VENDOR FILTER
    # ---------------------------------------------------------

    if vendor_id and vendor_id != "All":
        query = query.filter( db.PurchaseOrder.vendor_id == vendor_id )

    # ---------------------------------------------------------
    # DATE FILTER
    # ---------------------------------------------------------

    if date_from:
        query = query.filter( db.PurchaseOrder.order_date >= date_from )

    if date_to:
        query = query.filter( db.PurchaseOrder.order_date <= date_to )

    # ---------------------------------------------------------
    # GET PURCHASE ORDERS
    # ---------------------------------------------------------

    all_orders = ( query .order_by(db.PurchaseOrder.order_date.desc()) .all() )

    # ---------------------------------------------------------
    # BUILD ORDER DATA
    # ---------------------------------------------------------

    order_rows = []

    for po in all_orders:

        # Get latest shipment for this PO
        shipment = ( database.query(db.Shipment)
            .filter( db.Shipment.po_id == po.id )
            .order_by( db.Shipment.created_at.desc() ) .first()
        )

        shipment_status = ( shipment.status
            if shipment
            else po.status
        )

        # Status filter
        if status and status != "All":
            if shipment_status.lower() != status.lower():
                continue

        # -----------------------------------------------------
        # CURRENT LOCATION
        # -----------------------------------------------------

        current_location = None

        if shipment:
            current_location = getattr( shipment, "current_location", None )

            if not current_location:
                current_location = shipment.destination

        # -----------------------------------------------------
        # PROGRESS
        # -----------------------------------------------------

        status_key = ( shipment_status or "" ).strip().lower()

        progress_map = {
            "draft": 10,
            "pending": 20,
            "approved": 30,
            "ordered": 40,
            "confirmed": 45,
            "dispatched": 55,
            "in transit": 60,
            "out for delivery": 90,
            "delivered": 100,
            "completed": 100,
            "delayed": 20,
            "exception": 10,
            "exceptions": 10,
            "cancelled": 0
        }

        progress = progress_map.get( status_key, 20 )

        # -----------------------------------------------------
        # VENDOR
        # -----------------------------------------------------

        vendor_name = None

        if po.vendor:
            vendor_name = (
                getattr(po.vendor,"vendor_name", None) or getattr(po.vendor,"company_name", None)
            )

        # -----------------------------------------------------
        # RESPONSE
        # -----------------------------------------------------

        order_rows.append({
            "id": po.id,
            "po_number": po.po_number,
            "vendor": { "vendor_id": po.vendor_id, "vendor_name": vendor_name },
            "order_date": ( po.order_date.isoformat()
                if po.order_date
                else None ),
            "expected_delivery": ( (shipment.expected_delivery
                    if shipment
                    else po.expected_delivery ).isoformat()
                if ( shipment and shipment.expected_delivery ) or po.expected_delivery
                else None ),
            "status": shipment_status,
            "current_location": current_location,
            "progress": progress,
            "shipment_id": ( shipment.id
                if shipment
                else None ),
            "tracking_number": ( shipment.tracking_number
                if shipment
                else None ),
            "carrier": ( getattr( shipment, "carrier", None )
                if shipment
                else None )
        })

    # ---------------------------------------------------------
    # SUMMARY COUNTS
    # ---------------------------------------------------------

    total_orders = len(order_rows)

    in_transit = sum( 1
        for row in order_rows
        if str(row["status"]).lower() == "in transit"
    )

    out_for_delivery = sum( 1
        for row in order_rows
        if str(row["status"]).lower() == "out for delivery"
    )

    delivered = sum( 1
        for row in order_rows
        if str(row["status"]).lower() == "delivered"
    )

    delayed = sum( 1
        for row in order_rows
        if str(row["status"]).lower() == "delayed"
    )

    exceptions = sum( 1
        for row in order_rows
        if str(row["status"]).lower() in ["exception", "exceptions"]
    )

    # ---------------------------------------------------------
    # PAGINATION
    # ---------------------------------------------------------

    total = len(order_rows)

    start = ( (page - 1) * page_size )

    end = start + page_size

    paginated_orders = order_rows[ start:end ]

    # ---------------------------------------------------------
    # VENDORS
    # ---------------------------------------------------------

    vendors = ( database.query(db.Vendor) .order_by(db.Vendor.vendor_name) .all() )

    vendor_rows = [
        {
            "vendor_id": vendor.vendor_id,
            "vendor_name": (
                getattr( vendor, "vendor_name", None ) or getattr( vendor, "company_name", None )
            )
        }
        for vendor in vendors
    ]

    return {
        "success": True,
        "summary": {
            "total_orders": total_orders,
            "in_transit": in_transit,
            "out_for_delivery": out_for_delivery,
            "delivered": delivered,
            "delayed": delayed,
            "exceptions": exceptions
        },
        "orders": paginated_orders,
        "vendors": vendor_rows,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": ( (total + page_size - 1) // page_size )
        }
    }


@app.get( "/api/order-tracking/orders/{po_id}", tags=["Manager Dashboard"] )
def get_order_tracking_detail( po_id: int, database: Session = Depends(db.get_db) ):

    po = ( database.query(db.PurchaseOrder) .options(
            joinedload(db.PurchaseOrder.vendor),
            joinedload(db.PurchaseOrder.items)
        ) .filter( db.PurchaseOrder.id == po_id ) .first()
    )

    if not po:
        raise HTTPException( status_code=404, detail="Purchase order not found" )

    # ---------------------------------------------------------
    # LATEST SHIPMENT
    # ---------------------------------------------------------

    shipment = ( database.query(db.Shipment)
        .filter( db.Shipment.po_id == po.id ) 
        .order_by( db.Shipment.created_at.desc() ) .first() 
    )

    # ---------------------------------------------------------
    # VENDOR
    # ---------------------------------------------------------

    vendor_name = None

    if po.vendor:
        vendor_name = (
            getattr(po.vendor, "vendor_name", None) or getattr( po.vendor, "company_name", None )
        )

    # ---------------------------------------------------------
    # ITEMS
    # ---------------------------------------------------------

    items = []

    for item in po.items:
        items.append({
            "id": item.id,
            "item_code": item.item_code,
            "item_description": item.item_description,
            "quantity": float(item.quantity or 0),
            "uom": item.uom,
            "delivered_quantity": 0
        })

    # ---------------------------------------------------------
    # SHIPMENT ITEMS
    # ---------------------------------------------------------

    if shipment:
        shipment_items = ( database.query(db.ShipmentItem) .filter( db.ShipmentItem.shipment_id == shipment.id ) .all() )

        for shipment_item in shipment_items:
            delivered_quantity = getattr( shipment_item, "delivered_quantity",  0 )
            for item in items:
                if ( item["item_code"] == shipment_item.item_code ):
                    item[ "delivered_quantity"  ] = float( delivered_quantity or 0 )

    # ---------------------------------------------------------
    # TRACKING TIMELINE
    # ---------------------------------------------------------

    timeline = []

    # PO created
    if po.created_at:
        timeline.append({
            "event": "Order Created",
            "time": po.created_at.isoformat(),
            "location": None,
            "completed": True
        })

    # Approved
    if po.approved_at:
        timeline.append({
            "event": "Order Confirmed",
            "time": po.approved_at.isoformat(),
            "location": None,
            "completed": True
        })

    if shipment:

        # Shipment created
        if shipment.created_at:
            timeline.append({
                "event": "Dispatched",
                "time": shipment.created_at.isoformat(),
                "location": shipment.origin,
                "completed": True
            })

        # Shipped
        if shipment.shipped_date:
            timeline.append({
                "event": "In Transit",
                "time": shipment.shipped_date.isoformat(),
                "location": shipment.origin,
                "completed": (
                    str(shipment.status).lower() in ["in transit","out for delivery","delivered"]
                )
            })

        # Current status
        if str(shipment.status).lower() == "out for delivery":
            timeline.append({
                "event": "Out for Delivery",
                "time": ( shipment.tracking_updated_at.isoformat()
                    if getattr( shipment, "tracking_updated_at", None )
                    else None
                ),
                "location":getattr( shipment, "current_location", None ) or shipment.destination,
                "completed": True
            })

        # Delivered
        if shipment.actual_delivery:
            timeline.append({
                "event": "Delivered",
                "time": shipment.actual_delivery.isoformat(),
                "location": shipment.destination,
                "completed": True
            })

    # ---------------------------------------------------------
    # RESPONSE
    # ---------------------------------------------------------

    return {
        "success": True,
        "order": {
            "id": po.id,
            "po_number": po.po_number,
            "vendor": vendor_name,
            "vendor_id": po.vendor_id,
            "order_date": ( po.order_date.isoformat()
                if po.order_date
                else None
            ),
            "expected_delivery": (
                ( shipment.expected_delivery 
                    if shipment 
                    else po.expected_delivery ).isoformat()
                if ( shipment and shipment.expected_delivery ) or po.expected_delivery
                else None
            ),
            "status": ( shipment.status
                if shipment
                else po.status
            )
        },
        "shipment": (
            {
                "id": shipment.id,
                "shipment_number": shipment.shipment_number,
                "carrier": getattr( shipment, "carrier", None ),
                "tracking_number": shipment.tracking_number,
                "origin": shipment.origin,
                "destination": shipment.destination,
                "current_location": getattr( shipment, "current_location", None ),
                "status": shipment.status
            }
            if shipment
            else None
        ),
        "timeline": timeline,
        "items": items
    }


@app.post( "/api/order-tracking/events", tags=["Manager Dashboard"] )
def create_tracking_event( payload: db.TrackingEventCreate, database: Session = Depends(db.get_db) ):

    shipment = ( database.query(db.Shipment) .filter( db.Shipment.id == payload.shipment_id ) .first() )

    if not shipment:
        raise HTTPException( status_code=404, detail="Shipment not found" )

    event = db.OrderTrackingEvent(
        shipment_id= payload.shipment_id,
        event_type= payload.event_type,
        event_time=( payload.event_time or datetime.utcnow() ),
        location= payload.location,
        note= payload.note
    )

    database.add(event)

    # Keep shipment current status synchronized
    shipment.status = payload.event_type

    if hasattr( shipment, "current_location" ) and payload.location:
        shipment.current_location = payload.location

    if hasattr( shipment, "tracking_updated_at" ):
        shipment.tracking_updated_at = payload.event_time or datetime.utcnow()

    database.commit()

    database.refresh(event)

    return {
        "success": True,
        "event": {
            "id": event.id,
            "shipment_id": event.shipment_id,
            "event_type": event.event_type,
            "event_time": event.event_time.isoformat(),
            "location": event.location,
            "note": event.note
        }
    }


# ============================================================
# REPORTS DASHBOARD
# ============================================================

@app.get( "/api/reports/dashboard", tags=["Manager Dashboard"] )
def reports_page_dashboard(
    from_date: Optional[date] = Query(None), to_date: Optional[date] = Query(None),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_admin_or_procurement_manager )
):

    try:

        today = date.today()

        # ----------------------------------------------------
        # DEFAULT DATE RANGE
        # ----------------------------------------------------

        if to_date is None:
            to_date = today

        if from_date is None:
            from_date = date( to_date.year, to_date.month, 1 )

        if from_date > to_date:
            raise HTTPException( status_code=400, detail="from_date cannot be greater than to_date" )

        # ====================================================
        # PURCHASE ORDERS
        # ====================================================

        purchase_orders = ( database.query(db.PurchaseOrder) .filter(
                db.PurchaseOrder.order_date >= from_date,
                db.PurchaseOrder.order_date <= to_date
            ) .all()
        )

        total_pos = len(purchase_orders)

        total_spend = sum( float(po.amount or 0)
            for po in purchase_orders
        )

        average_po_value = ( total_spend / total_pos
            if total_pos
            else 0
        )

        # ====================================================
        # ON-TIME DELIVERY
        # ====================================================

        total_deliveries = 0
        on_time_deliveries = 0

        for po in purchase_orders:

            if po.actual_delivery:

                total_deliveries += 1

                if ( po.expected_delivery is None or po.actual_delivery <= po.expected_delivery ):
                    on_time_deliveries += 1

        on_time_delivery = ( (on_time_deliveries / total_deliveries) * 100
            if total_deliveries
            else 0
        )

        # ====================================================
        # SPEND BY CATEGORY
        # ====================================================

        category_totals = defaultdict(float)

        for po in purchase_orders:

            category = ( po.category or "Other" )

            category_totals[category] += float( po.amount or 0 )

        spend_by_category = []

        for category, amount in sorted( category_totals.items(), key=lambda x: x[1], reverse=True ):

            percent = ( amount / total_spend * 100
                if total_spend
                else 0
            )

            spend_by_category.append({
                "category": category,
                "amount": round(amount, 2),
                "percent": round(percent, 2)
            })

        # ====================================================
        # TOP SPENDING VENDORS
        # ====================================================

        vendor_totals = defaultdict(float)

        for po in purchase_orders:
            vendor = po.vendor

            if vendor:
                vendor_totals[ vendor.vendor_id ] += float(po.amount or 0)

        top_vendors = []

        for vendor_id, amount in sorted( vendor_totals.items(), key=lambda x: x[1], reverse=True )[:10]:
            vendor = ( database.query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )

            percent = ( amount / total_spend * 100
                if total_spend
                else 0
            )

            top_vendors.append({
                "vendor_id": vendor_id,
                "vendor": ( vendor.vendor_name
                    if vendor
                    else "Unknown Vendor"
                ),
                "spend": round(amount, 2),
                "percent": round(percent, 2)
            })

        # ====================================================
        # DEPARTMENT SPEND
        # ====================================================

        department_totals = defaultdict(float)

        for po in purchase_orders:

            department = ( po.department or "Other" )

            department_totals[ department ] += float(po.amount or 0)

        department_spend = []

        for department, amount in sorted( department_totals.items(), key=lambda x: x[1], reverse=True ):

            percent = ( amount / total_spend * 100
                if total_spend
                else 0
            )

            department_spend.append({
                "department": department,
                "amount": round(amount, 2),
                "percent": round(percent, 2)
            })

        # ====================================================
        # MONTHLY SPEND
        # ====================================================

        monthly_data = defaultdict( lambda: { "actual": 0, "budget": 0 } )

        for po in purchase_orders:

            if not po.order_date:
                continue

            key = ( po.order_date.year, po.order_date.month )

            monthly_data[key]["actual"] += float( po.amount or 0 )

        # ----------------------------------------------------
        # REAL BUDGET DATA
        # ----------------------------------------------------

        try:

            budgets = ( database.query( db.ProcurementBudget ) .filter(
                    db.ProcurementBudget.year >= from_date.year,
                    db.ProcurementBudget.year <= to_date.year
                ) .all()
            )

            for budget in budgets:
                key = ( budget.year, budget.month )
                monthly_data[key]["budget"] += float( budget.budget_amount or 0 )

        except Exception:
            # Allows Reports page to work before
            # ProcurementBudget migration is applied.
            pass

        months = []

        cursor = date( from_date.year, from_date.month, 1 )

        end_month = date( to_date.year, to_date.month, 1 )

        while cursor <= end_month:

            key = ( cursor.year, cursor.month )

            months.append({
                "month": cursor.strftime("%b %Y"),
                "actual": round( monthly_data[key]["actual"], 2 ),
                "budget": round( monthly_data[key]["budget"], 2 )
            })

            if cursor.month == 12:
                cursor = date( cursor.year + 1, 1, 1 )

            else:
                cursor = date( cursor.year, cursor.month + 1, 1 )

        # ====================================================
        # MONTHLY SUMMARY
        # ====================================================

        monthly_summary = []

        for row in months:

            actual = row["actual"]
            budget = row["budget"]

            variance = actual - budget

            variance_percent = ( (variance / budget) * 100
                if budget
                else 0
            )

            monthly_summary.append({
                "month": row["month"],
                "actual": actual,
                "budget": budget,
                "variance": round( variance, 2 ),
                "variance_percent": round( variance_percent, 2 )
            })

        # ====================================================
        # INVOICES
        # ====================================================

        invoices = ( database.query(db.Invoice)
            .filter(db.Invoice.invoice_date >= from_date,db.Invoice.invoice_date <= to_date) .all()
        )

        cycle_times = []

        for invoice in invoices:

            if ( invoice.invoice_date and invoice.paid_date ):
                cycle = ( invoice.paid_date - invoice.invoice_date ).days

                if cycle >= 0:
                    cycle_times.append(cycle)

        invoice_cycle_time = ( sum(cycle_times) / len(cycle_times)
            if cycle_times
            else 0
        )

        # ====================================================
        # SAVINGS
        # ====================================================

        # Preferred calculation:
        # actual ProcurementSavings table.
        estimated_savings = 0

        try:

            if hasattr( database, "ProcurementSavings" ):
                savings_value = (
                    database.query( func.coalesce( func.sum( db.ProcurementSavings.savings_amount ), 0 )
                    ) .filter( db.ProcurementSavings.savings_date >= date( to_date.year, 1, 1 ),
                        db.ProcurementSavings.savings_date <= to_date ) .scalar()
                )

                estimated_savings = float( savings_value or 0 )

            else:
                # Temporary estimate using
                # Procurement Request vs PO.
                requests = ( database.query( db.ProcurementRequest ) .filter(
                        db.ProcurementRequest.created_at >= datetime( to_date.year, 1, 1 ) ) .all()
                )

                request_map = { request.id: float(request.amount or 0)
                    for request in requests
                }

                for po in purchase_orders:
                    if po.pr_id in request_map:
                        requested = request_map[ po.pr_id ]
                        actual = float( po.amount or 0 )

                        if requested > actual:
                            estimated_savings += ( requested - actual )

        except Exception:
            estimated_savings = 0

        # ====================================================
        # RECENT REPORTS
        # ====================================================

        reports = ( database.query(db.Report) .order_by( db.Report.generated_at.desc() ) .limit(10) .all() )

        recent_reports = []

        for report in reports:
            recent_reports.append({
                "id": report.id,
                "report_name": report.report_name,
                "category": report.category,
                "generated_by": report.generated_by,
                "generated_at": ( report.generated_at.isoformat()
                    if report.generated_at
                    else None ),
                "format": report.format,
                "file_size": report.file_size
            })

        # ====================================================
        # REPORT CATEGORIES
        # ====================================================

        report_categories = {
            "spend_analysis": total_pos,
            "purchase_order_reports": total_pos,
            "vendor_performance": database.query( db.Vendor ).count(),
            "delivery_performance": total_deliveries,
            "invoice_payment_reports": database.query( db.Invoice ).count(),
            "compliance_reports": database.query( db.Contract ).count()
        }

        # ====================================================
        # RETURN
        # ====================================================

        return {
            "success": True,
            "date_range": {
                "from_date": from_date.isoformat(),
                "to_date": to_date.isoformat()
            },
            "kpis": {
                "total_spend": round(total_spend, 2),
                "total_pos": total_pos,
                "average_po_value": round( average_po_value, 2 ),
                "on_time_delivery": round( on_time_delivery, 2 ),
                "savings_ytd": round( estimated_savings, 2 ),
                "invoice_cycle_time": round( invoice_cycle_time, 1 )
            },
            "spend_trend": months,
            "spend_by_category": spend_by_category,
            "top_vendors": top_vendors,
            "department_spend": department_spend,
            "monthly_summary": monthly_summary,
            "recent_reports": recent_reports,
            "report_categories": report_categories
        }

    except HTTPException:
        raise

    except Exception as exc:
        import traceback
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=( f"Reports dashboard failed: {type(exc).__name__}: {str(exc)}" )
        )


# ============================================================
# PROCUREMENT MANAGER ANALYTICS
# ============================================================

@app.get( "/api/procurement/analytics/dashboard", response_model=db.ProcurementAnalyticsDashboardResponse, tags=["Manager Dashboard"] )
def procurement_analytics_dashboard(
    start_date: Optional[date] = Query(None), end_date: Optional[date] = Query(None),
    department: Optional[str] = Query(None), category: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None), location: Optional[str] = Query(None),
    database: Session = Depends(db.get_db), current_user: db.User = Depends(crud.require_procurement_manager)
):

    # ========================================================
    # DEFAULT DATE RANGE
    # ========================================================

    today = date.today()

    if end_date is None:
        end_date = today

    if start_date is None:
        start_date = date(end_date.year, end_date.month, 1)

    if start_date > end_date:
        raise HTTPException( status_code=400, detail="start_date cannot be after end_date" )

    # ========================================================
    # BASE PURCHASE ORDER QUERY
    # ========================================================

    base_query = ( database.query(db.PurchaseOrder)
        .outerjoin( db.Vendor, db.PurchaseOrder.vendor_id == db.Vendor.vendor_id )
        .outerjoin( db.ProcurementRequest, db.PurchaseOrder.pr_id == db.ProcurementRequest.id )
        .outerjoin( db.PurchaseOrderDetails,
            db.PurchaseOrderDetails.purchase_order_id == db.PurchaseOrder.id )
        .outerjoin(db.Warehouse, db.PurchaseOrderDetails.delivery_warehouse_id == db.Warehouse.id)
        .filter(db.PurchaseOrder.order_date >= start_date,db.PurchaseOrder.order_date <= end_date)
    )

    # ========================================================
    # FILTERS
    # ========================================================

    if department and department != "All":
        base_query = base_query.filter( db.ProcurementRequest.department == department )

    if category and category != "All":
        base_query = base_query.filter( db.PurchaseOrder.category == category )

    if vendor_id and vendor_id != "All":
        base_query = base_query.filter( db.PurchaseOrder.vendor_id == vendor_id )

    if location and location != "All":
        base_query = base_query.filter( db.Warehouse.location == location )

    # ========================================================
    # CURRENT PURCHASE ORDERS
    # ========================================================

    purchase_orders = base_query.all()

    total_pos = len(purchase_orders)

    total_spend = sum( float(po.amount or 0)
        for po in purchase_orders
    )

    avg_po_value = ( total_spend / total_pos
        if total_pos
        else 0
    )

    # ========================================================
    # ON-TIME DELIVERY
    # ========================================================

    delivered = [ po
        for po in purchase_orders
        if po.actual_delivery is not None and po.expected_delivery is not None
    ]

    on_time = [ po
        for po in delivered
        if po.actual_delivery <= po.expected_delivery
    ]

    on_time_delivery = ( len(on_time) / len(delivered) * 100
        if delivered
        else 0
    )

    # ========================================================
    # SAVINGS
    # ========================================================

    savings = 0

    for po in purchase_orders:

        if not po.pr_id:
            continue

        pr = ( database.query(db.ProcurementRequest) .filter( db.ProcurementRequest.id == po.pr_id ) .first() )

        if pr:
            requested = float(pr.amount or 0)
            ordered = float(po.amount or 0)

            if requested > ordered:
                savings += requested - ordered

    # ========================================================
    # SUPPLIER PERFORMANCE
    # ========================================================

    vendor_scores = []

    vendor_ids = list({ po.vendor_id
        for po in purchase_orders
        if po.vendor_id
    })

    if vendor_ids:

        vendors = ( database.query(db.Vendor) .filter( db.Vendor.vendor_id.in_(vendor_ids) ) .all() )

        vendor_scores = [ float(v.reliability_score or 0)
            for v in vendors
            if v.reliability_score is not None
        ]

    supplier_performance = ( sum(vendor_scores) / len(vendor_scores) / 20
        if vendor_scores
        else 0
    )

    # ========================================================
    # PREVIOUS PERIOD
    # ========================================================

    period_days = ( end_date - start_date ).days + 1

    previous_end = start_date - timedelta(days=1)

    previous_start = ( previous_end - timedelta(days=period_days - 1) )

    previous_query = ( database.query(db.PurchaseOrder)
        .filter( db.PurchaseOrder.order_date >= previous_start,
            db.PurchaseOrder.order_date <= previous_end ) )

    if category and category != "All":
        previous_query = previous_query.filter( db.PurchaseOrder.category == category )

    if vendor_id and vendor_id != "All":
        previous_query = previous_query.filter( db.PurchaseOrder.vendor_id == vendor_id )

    previous_orders = previous_query.all()

    previous_spend = sum( float(po.amount or 0)
        for po in previous_orders
    )

    previous_count = len(previous_orders)

    previous_avg = ( previous_spend / previous_count
        if previous_count
        else 0
    )

    def percent_change(current, previous):

        if previous == 0:
            return 0

        return round( ((current - previous) / previous) * 100, 1 )

    # ========================================================
    # SPEND TREND
    # ========================================================

    spend_rows = ( base_query.with_entities(
            func.date_trunc( "month", db.PurchaseOrder.order_date ).label("month"),
            func.coalesce( func.sum(db.PurchaseOrder.amount), 0 ).label("amount")
        ) .group_by("month") .order_by("month") .all()
    )

    spend_map = {
        row.month.strftime("%b %Y"): float(row.amount or 0)
        for row in spend_rows
    }

    trend_labels = []
    actual_values = []
    budget_values = []

    cursor = date( start_date.year, start_date.month, 1 )

    while cursor <= end_date:

        label = cursor.strftime("%b %Y")

        trend_labels.append(label)

        actual = spend_map.get( label, 0 )

        actual_values.append( round(actual, 2) )

        # Budget is taken from FinanceBudget.
        budget_row = ( database.query( func.coalesce( func.sum(db.FinanceBudget.budget), 0 ) )
            .filter( db.FinanceBudget.year == cursor.year ) .scalar()
        )

        budget_values.append( round( float(budget_row or 0), 2 ) )

        if cursor.month == 12:
            cursor = date( cursor.year + 1, 1, 1 )
        else:
            cursor = date( cursor.year, cursor.month + 1, 1 )

    # ========================================================
    # SPEND BY CATEGORY
    # ========================================================

    category_rows = ( base_query.with_entities( db.PurchaseOrder.category,
            func.coalesce( func.sum(db.PurchaseOrder.amount), 0 ).label("amount")
        ) .group_by(db.PurchaseOrder.category)
        .order_by( func.sum( db.PurchaseOrder.amount ).desc() ) .all()
    )

    spend_by_category = []

    for row in category_rows:
        amount = float(row.amount or 0)
        percentage = ( amount / total_spend * 100
            if total_spend
            else 0 )
        spend_by_category.append(
            { "category": row.category or "Other",
                "amount": round(amount, 2),
                "percentage": round(percentage, 1) } )

    # ========================================================
    # SPEND BY DEPARTMENT
    # ========================================================

    department_rows = ( base_query.with_entities( db.ProcurementRequest.department,
            func.coalesce( func.sum(db.PurchaseOrder.amount), 0 ).label("amount")
        ) .group_by( db.ProcurementRequest.department )
        .order_by( func.sum( db.PurchaseOrder.amount ).desc() ) .all()
    )

    spend_by_department = []

    for row in department_rows:
        amount = float(row.amount or 0)
        percentage = ( amount / total_spend * 100
            if total_spend
            else 0 )
        spend_by_department.append(
            { "department": row.department or "Other",
                "amount": round(amount, 2),
                "percentage": round(percentage, 1) } )

    # ========================================================
    # TOP SPENDING VENDORS
    # ========================================================

    vendor_rows = ( base_query.with_entities(
            db.Vendor.vendor_id, db.Vendor.vendor_name, db.Vendor.reliability_score,
            func.coalesce( func.sum(db.PurchaseOrder.amount), 0 ).label("amount")
        ) .group_by( db.Vendor.vendor_id, db.Vendor.vendor_name, db.Vendor.reliability_score )
        .order_by( func.sum( db.PurchaseOrder.amount ).desc() ) .limit(10) .all()
    )

    top_vendors = []

    for row in vendor_rows:
        amount = float(row.amount or 0)
        top_vendors.append(
            {
                "vendor_id": row.vendor_id,
                "vendor_name": row.vendor_name,
                "amount": round(amount, 2),
                "percentage": round( amount / total_spend * 100, 1 ) if total_spend else 0,
                "score": round( float( row.reliability_score or 0 ) / 20, 2 )
            }
        )

    # ========================================================
    # PO STATUS
    # ========================================================

    status_map = defaultdict(int)

    for po in purchase_orders:
        status_value = ( str(po.status or "Pending") .strip() )
        status_map[status_value] += 1

    po_status = []

    for status_name, count in status_map.items():

        po_status.append(
            {
                "status": status_name,
                "count": count,
                "percentage": round( count / total_pos * 100, 1 ) if total_pos else 0
            }
        )

    po_status.sort( key=lambda x: x["count"], reverse=True )

    # ========================================================
    # INVOICE AGING
    # ========================================================

    invoices = ( database.query(db.Invoice) .filter( db.Invoice.due_date.isnot(None) ) .all() )

    aging = { "zero_30": 0, "thirty_one_60": 0, "sixty_one_90": 0, "ninety_plus": 0 }

    for invoice in invoices:
        if str(invoice.status or "").lower() in [ "paid", "completed" ]:
            continue

        balance = float( invoice.amount or 0 )

        payments = (
            database.query( func.coalesce( func.sum(db.Payment.amount), 0 ) ) .filter(
                db.Payment.invoice_id == invoice.id, db.Payment.status.in_(["Completed", "Paid"])
            ) .scalar()
        )

        balance -= float(payments or 0)

        if balance <= 0:
            continue

        days_old = ( today - invoice.due_date ).days

        if days_old <= 30:
            aging["zero_30"] += balance

        elif days_old <= 60:
            aging["thirty_one_60"] += balance

        elif days_old <= 90:
            aging["sixty_one_90"] += balance

        else:
            aging["ninety_plus"] += balance

    aging = {
        key: round(value, 2)
        for key, value in aging.items()
    }

    # ========================================================
    # ON-TIME DELIVERY TREND
    # ========================================================

    delivery_labels = []
    delivery_values = []

    delivery_rows = (
        base_query.with_entities(
            func.date_trunc( "month", db.PurchaseOrder.order_date ).label("month"),
            func.count( db.PurchaseOrder.id ).label("total"),
            func.sum( case(
                    (
                        ( db.PurchaseOrder.actual_delivery .isnot(None) )
                        &
                        ( db.PurchaseOrder.expected_delivery .isnot(None) )
                        &
                        ( db.PurchaseOrder.actual_delivery <= db.PurchaseOrder.expected_delivery ), 1
                    ), else_=0
                )
            ).label("on_time")
        ) .group_by("month") .order_by("month") .all()
    )

    for row in delivery_rows:
        total = int(row.total or 0)
        on_time_count = int(row.on_time or 0)
        delivery_labels.append( row.month.strftime("%b %Y") )
        delivery_values.append( round( on_time_count / total * 100, 1 ) if total else 0 )

    # ========================================================
    # SUPPLIER PERFORMANCE DISTRIBUTION
    # ========================================================

    suppliers = ( database.query(db.Vendor) .filter( db.Vendor.reliability_score.isnot(None) ) .all() )

    rating_counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

    for vendor in suppliers:
        score = float( vendor.reliability_score or 0 )
        rating = max( 1, min( 5, int(round(score / 20)) ) )
        rating_counts[rating] += 1

    supplier_distribution = []

    supplier_total = sum( rating_counts.values() )

    for rating in [5, 4, 3, 2, 1]:
        count = rating_counts[rating]
        supplier_distribution.append(
            {
                "rating": rating, "count": count,
                "percentage": round( count / supplier_total * 100, 1 ) if supplier_total else 0
            }
        )

    # ========================================================
    # SAVINGS TREND
    # ========================================================

    savings_labels = []
    savings_values = []

    savings_rows = (
        database.query( func.date_trunc( "month", db.PurchaseOrder.order_date ).label("month"),
            func.coalesce( func.sum( case( (
                            db.ProcurementRequest.amount > db.PurchaseOrder.amount,
                            db.ProcurementRequest.amount - db.PurchaseOrder.amount
                        ), else_=0 ) ), 0
            ).label("savings")
        ) .join(
            db.ProcurementRequest, db.PurchaseOrder.pr_id == db.ProcurementRequest.id
        ) .filter(
            db.PurchaseOrder.order_date >= start_date, db.PurchaseOrder.order_date <= end_date
        ) .group_by("month") .order_by("month") .all()
    )

    for row in savings_rows:
        savings_labels.append( row.month.strftime("%b %Y") )
        savings_values.append( round( float(row.savings or 0), 2 ) )

    # ========================================================
    # RESPONSE
    # ========================================================

    kpis = {
        "total_spend": round(total_spend, 2),
        "total_pos": total_pos,
        "avg_po_value": round(avg_po_value, 2),
        "savings_ytd": round(savings, 2),
        "on_time_delivery": round(on_time_delivery, 1),
        "supplier_performance": round(supplier_performance, 2),
        "spend_change": percent_change( total_spend, previous_spend ),
        "po_change": percent_change( total_pos, previous_count ),
        "avg_po_change": percent_change( avg_po_value, previous_avg ),
        "savings_change": 0,
        "delivery_change": 0,
        "supplier_change": 0
    }

    return {
        "kpis": kpis,
        "spend_trend": {
            "labels": trend_labels,
            "actual": actual_values,
            "budget": budget_values
        },
        "spend_by_category": spend_by_category,
        "spend_by_department": spend_by_department,
        "top_vendors": top_vendors,
        "po_status": po_status,
        "invoice_aging": aging,
        "delivery_trend": {
            "labels": delivery_labels,
            "values": delivery_values
        },
        "supplier_distribution": supplier_distribution,
        "savings_trend": {
            "labels": savings_labels,
            "values": savings_values
        }
    }


@app.get( "/api/procurement/analytics/categories", tags=["Manager Dashboard"] )
def analytics_categories(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_procurement_manager )
):

    rows = ( database.query( db.PurchaseOrder.category ) .filter( db.PurchaseOrder.category.isnot(None) )
        .distinct() .order_by( db.PurchaseOrder.category ) .all()
    )

    return [ row[0]
        for row in rows
        if row[0]
    ]


@app.get( "/api/procurement/analytics/locations", tags=["Manager Dashboard"] )
def analytics_locations(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_procurement_manager )
):

    rows = ( database.query( db.Warehouse.location ) .filter( db.Warehouse.location.isnot(None) ) 
        .distinct() .order_by( db.Warehouse.location ) .all()
    )

    return [ row[0]
        for row in rows
        if row[0]
    ]


# ============================================================
# PROCUREMENT MANAGER NOTIFICATIONS
# ============================================================

@app.get( "/api/procurement/notifications", tags=["Manager Dashboard"] )
def procurement_notifications(
    page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None, category: Optional[str] = None,
    priority: Optional[str] = None, status: Optional[str] = None,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_procurement_manager )
):

    query = database.query(db.Notification)

    # Only notifications belonging to this manager
    if hasattr(db.Notification, "recipient_user_id"):
        query = query.filter( db.Notification.recipient_user_id == current_user.id )

    # Search
    if search:
        value = f"%{search.strip()}%"
        query = query.filter( or_(
                db.Notification.title.ilike(value),
                db.Notification.message.ilike(value),
                db.Notification.reference_id.ilike(value)
            )
        )

    # Category mapping
    if category and category != "All":
        category_map = {
            "Procurement Alerts": [ "Procurement", "Procurement Alerts" ],
            "Delivery Updates": [ "Delivery", "Delivery Updates" ],
            "Approvals": [ "Approval", "Approvals", "Vendor" ],
            "Invoices & Payments": [ "Invoice", "Invoices & Payments", "Payment" ],
            "System Updates": [ "System", "System Updates" ]
        }
        allowed = category_map.get( category, [category] )
        query = query.filter( db.Notification.category.in_(allowed) )

    # Priority
    if priority and priority != "All":
        query = query.filter( db.Notification.priority == priority )

    # Status
    if status and status != "All":
        query = query.filter( db.Notification.status == status )

    total = query.count()

    unread = query.filter( db.Notification.status == "Unread" ).count()

    offset = (page - 1) * limit

    notifications = ( query .order_by( db.Notification.created_at.desc() ) .offset(offset) .limit(limit) .all() )

    items = []

    for n in notifications:

        display_category = n.category

        category_mapping = {
            "Procurement": "Procurement Alerts",
            "Procurement Alerts": "Procurement Alerts",
            "Delivery": "Delivery Updates",
            "Delivery Updates": "Delivery Updates",
            "Vendor": "Approvals",
            "Approval": "Approvals",
            "Approvals": "Approvals",
            "Invoice": "Invoices & Payments",
            "Payment": "Invoices & Payments",
            "Invoices & Payments": "Invoices & Payments",
            "System": "System Updates",
            "System Updates": "System Updates"
        }

        display_category = category_mapping.get( n.category, n.category )

        items.append({
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "notification_type": n.notification_type,
            "category": display_category,
            "priority": n.priority,
            "status": n.status,
            "reference_id": n.reference_id,
            "related_type": getattr( n, "related_type", None ),
            "vendor_id": n.vendor_id,
            "created_at": n.created_at
        })

    return {
        "items": items,
        "total": total,
        "unread": unread,
        "page": page,
        "limit": limit,
        "total_pages": ( (total + limit - 1) // limit
            if total
            else 1
        )
    }


@app.get( "/api/procurement/notifications/statistics", tags=["Manager Dashboard"] )
def procurement_notification_statistics(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_procurement_manager )
):

    query = database.query(db.Notification)

    if hasattr(db.Notification, "recipient_user_id"):
        query = query.filter( db.Notification.recipient_user_id == current_user.id )

    total = query.count()

    unread = query.filter( db.Notification.status == "Unread" ).count()

    def count_categories(categories):
        return query.filter( db.Notification.category.in_(categories) ).count()

    procurement = count_categories([ "Procurement", "Procurement Alerts" ])

    delivery = count_categories([ "Delivery", "Delivery Updates" ])

    approvals = count_categories([ "Vendor", "Approval", "Approvals" ])

    invoices = count_categories([ "Invoice", "Payment", "Invoices & Payments" ])

    system = count_categories([ "System", "System Updates" ])

    return {
        "total": total,
        "unread": unread,
        "categories": {
            "procurement_alerts": procurement,
            "delivery_updates": delivery,
            "approvals": approvals,
            "invoices_payments": invoices,
            "system_updates": system
        }
    }


@app.get( "/api/procurement/notifications/category-counts", tags=["Manager Dashboard"] )
def procurement_notification_category_counts(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_procurement_manager )
):

    query = database.query(db.Notification)

    if hasattr(db.Notification, "recipient_user_id"):
        query = query.filter( db.Notification.recipient_user_id == current_user.id )

    def total(categories):
        return query.filter( db.Notification.category.in_(categories) ).count()

    def unread(categories):
        return query.filter( db.Notification.category.in_(categories), db.Notification.status == "Unread" ).count()

    return {
        "all": query.count(),
        "unread": query.filter( db.Notification.status == "Unread" ).count(),
        "procurement_alerts": total([ "Procurement", "Procurement Alerts" ]),
        "delivery_updates": total([ "Delivery", "Delivery Updates" ]),
        "approvals": total([ "Vendor", "Approval", "Approvals" ]),
        "invoices_payments": total([ "Invoice", "Payment", "Invoices & Payments" ]),
        "system_updates": total([ "System", "System Updates" ])
    }


@app.put( "/api/procurement/notifications/{notification_id}/read", tags=["Manager Dashboard"] )
def procurement_mark_notification_read(
    notification_id: int, database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_procurement_manager )
):

    query = database.query( db.Notification ).filter( db.Notification.id == notification_id )

    if hasattr(db.Notification, "recipient_user_id"):
        query = query.filter( db.Notification.recipient_user_id == current_user.id )

    notification = query.first()

    if not notification:
        raise HTTPException( status_code=404, detail="Notification not found" )

    notification.status = "Read"

    if hasattr(notification, "read_at"):
        notification.read_at = datetime.utcnow()

    database.commit()

    return { "success": True, "id": notification_id, "status": "Read" }


@app.put( "/api/procurement/notifications/read-all", tags=["Manager Dashboard"] )
def procurement_mark_all_read(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_procurement_manager )
):

    query = database.query( db.Notification ).filter( db.Notification.status == "Unread" )

    if hasattr(db.Notification, "recipient_user_id"):
        query = query.filter( db.Notification.recipient_user_id == current_user.id )

    updated = query.update( { db.Notification.status: "Read" }, synchronize_session=False )

    database.commit()

    return { "success": True, "updated": updated }


@app.get( "/api/procurement/notifications/{notification_id}/details", tags=["Manager Dashboard"] )
def procurement_notification_details(
    notification_id: int, database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_procurement_manager )
):

    query = database.query( db.Notification ).filter( db.Notification.id == notification_id )

    if hasattr(db.Notification, "recipient_user_id"):
        query = query.filter( db.Notification.recipient_user_id == current_user.id )

    notification = query.first()

    if not notification:
        raise HTTPException( status_code=404, detail="Notification not found" )

    result = {
        "id": notification.id,
        "title": notification.title,
        "message": notification.message,
        "category": notification.category,
        "priority": notification.priority,
        "status": notification.status,
        "reference_id": notification.reference_id,
        "related_type": getattr( notification, "related_type", None ),
        "created_at": notification.created_at,
        "related_to": None,
        "po_number": None,
        "vendor": None,
        "amount": None,
        "requested_by": None,
        "requested_on": None
    }

    related_type = getattr( notification, "related_type", None )

    reference_id = notification.reference_id

    # ---------------------------------------------------------
    # PURCHASE ORDER
    # ---------------------------------------------------------

    if ( related_type == "Purchase Order" or notification.notification_type in ["Approval", "Purchase Order"] ):
        po = ( database.query(db.PurchaseOrder)
            .filter( db.PurchaseOrder.po_number == reference_id ) .first()
        )

        if po:

            result["related_to"] = "Purchase Order"
            result["po_number"] = po.po_number
            result["amount"] = float( po.amount or 0 )

            if po.vendor:
                result["vendor"] = ( po.vendor.vendor_name )

            if po.creator:
                result["requested_by"] = ( po.creator.name )

            result["requested_on"] = ( po.created_at )

    # ---------------------------------------------------------
    # INVOICE
    # ---------------------------------------------------------

    elif related_type == "Invoice":
        invoice = ( database.query(db.Invoice)
            .filter( db.Invoice.invoice_number == reference_id ) .first()
        )

        if invoice:

            result["related_to"] = "Invoice"
            result["amount"] = float( invoice.amount or 0 )

            if invoice.vendor:
                result["vendor"] = ( invoice.vendor.vendor_name )

            result["requested_on"] = ( invoice.invoice_date )

            if invoice.po_id:

                po = ( database.query( db.PurchaseOrder )
                    .filter( db.PurchaseOrder.id == invoice.po_id ) .first()
                )

                if po:
                    result["po_number"] = ( po.po_number )

    return result


@app.get( "/api/procurement/messages/conversations", tags=["Manager Dashboard"] )
def get_procurement_conversations(
    search: str = "", database: Session = Depends(db.get_db),
    current_user=Depends( crud.require_procurement_manager )
):

    vendors = ( database .query(db.Vendor) .join(
            db.CommunicationMessage, db.CommunicationMessage.vendor_id == db.Vendor.vendor_id 
        ) .distinct() .all()
    )

    conversations = []

    search = search.strip().lower()

    for vendor in vendors:
        messages = ( database .query(db.CommunicationMessage)
            .filter( db.CommunicationMessage.vendor_id == vendor.vendor_id )
            .order_by( db.CommunicationMessage.created_at.desc() ) .all()
        )

        if not messages:
            continue

        last_message = messages[0]

        if search:
            vendor_match = ( search in (vendor.vendor_name or "").lower() )
            message_match = any( search in (m.message or "").lower()
                for m in messages )
            if not vendor_match and not message_match:
                continue

        unread = ( database .query(db.CommunicationMessage)
            .filter( db.CommunicationMessage.vendor_id == vendor.vendor_id )
            .filter( db.CommunicationMessage.sender_type == "vendor" )
            .filter( db.CommunicationMessage.is_read == False ) .count()
        )

        conversations.append({
            "vendor_id": vendor.vendor_id,
            "vendor_name": vendor.vendor_name,
            "email": vendor.email,
            "phone": vendor.phone,
            "contact_person": vendor.contact_person,
            "last_message": ( last_message.message or "" ),
            "last_message_time": ( last_message.created_at.isoformat()
                if last_message.created_at
                else None ),
            "unread": unread
        })

    conversations.sort( key=lambda x: x["last_message_time"] or "", reverse=True )

    return { "success": True, "items": conversations }


@app.get( "/api/procurement/messages/conversations/{vendor_id}", tags=["Manager Dashboard"] )
def get_procurement_conversation(
    vendor_id: str, database: Session = Depends(db.get_db),
    current_user=Depends( crud.require_procurement_manager )
):

    vendor = ( database .query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    messages = ( database .query(db.CommunicationMessage)
        .filter( db.CommunicationMessage.vendor_id == vendor_id )
        .order_by( db.CommunicationMessage.created_at.asc() ) .all()
    )

    response_messages = []

    for message in messages:
        sender_name = None

        if message.sender:
            sender_name = message.sender.name

        elif message.sender_type == "vendor":
            sender_name = ( vendor.contact_person or vendor.vendor_name )

        response_messages.append({
            "id": message.id,
            "message": message.message or "",
            "sender_type": ( message.sender_type or "vendor" ),
            "sender_name": sender_name,
            "message_type": ( message.message_type or "Message" ),
            "is_read": message.is_read,
            "created_at": ( message.created_at.isoformat()
                if message.created_at
                else None )
        })

        if ( message.sender_type == "vendor" and not message.is_read ):
            message.is_read = True

    database.commit()

    files = ( database .query(db.CommunicationFile)
        .filter( db.CommunicationFile.vendor_id == vendor_id )
        .order_by( db.CommunicationFile.created_at.desc() ) .limit(20) .all()
    )

    return {
        "success": True,

        "vendor": {
            "vendor_id": vendor.vendor_id,
            "vendor_name": vendor.vendor_name,
            "email": vendor.email,
            "phone": vendor.phone,
            "contact_person": vendor.contact_person
        },

        "messages": response_messages,

        "files": [
            {
                "id": f.id,
                "file_name": f.file_name,
                "file_size": f.file_size or 0,
                "file_type": f.file_type,
                "created_at": ( f.created_at.isoformat()
                    if f.created_at
                    else None )
            }
            for f in files
        ]
    }


@app.post( "/api/procurement/messages/conversations/{vendor_id}/messages", tags=["Manager Dashboard"] )
def send_procurement_message(
    vendor_id: str, payload: db.MessageCreate,
    database: Session = Depends(db.get_db),
    current_user=Depends( crud.require_procurement_manager )
):

    vendor = ( database .query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    text = payload.message.strip()

    if not text:
        raise HTTPException( status_code=400, detail="Message cannot be empty" )

    message = db.CommunicationMessage(
        vendor_id=vendor.vendor_id,
        sender_user_id=current_user.id,
        sender_type="admin",
        message=text,
        message_type=payload.message_type,
        is_read=True,
        created_at=datetime.utcnow()
    )

    database.add(message)

    activity = db.CommunicationActivity(
        vendor_id=vendor.vendor_id,
        user_id=current_user.id,
        activity_type="Message",
        subject=f"Message to {vendor.vendor_name}",
        description=text,
        status="Delivered",
        created_at=datetime.utcnow()
    )

    database.add(activity)
    database.commit()
    database.refresh(message)

    return {
        "success": True,
        "message": {
            "id": message.id,
            "message": message.message,
            "sender_type": message.sender_type,
            "sender_name": current_user.name,
            "created_at": ( message.created_at.isoformat()
                if message.created_at
                else None )
        }
    }


UPLOAD_DIR = Path( "uploads/communication" )

UPLOAD_DIR.mkdir( parents=True, exist_ok=True )


@app.post( "/api/procurement/messages/files/{vendor_id}", tags=["Manager Dashboard"] )
async def upload_procurement_file(
    vendor_id: str, file: UploadFile = File(...),
    database: Session = Depends(db.get_db),
    current_user=Depends( crud.require_procurement_manager )
):

    vendor = ( database .query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    if not file.filename:
        raise HTTPException( status_code=400, detail="File name is required" )

    safe_name = (
        f"{datetime.utcnow().timestamp()}_{file.filename}" )

    destination = ( UPLOAD_DIR / safe_name )

    with open( destination, "wb" ) as buffer:
        shutil.copyfileobj( file.file, buffer )

    file_size = destination.stat().st_size

    new_file = db.CommunicationFile(
        vendor_id=vendor.vendor_id,
        uploaded_by=current_user.id,
        file_name=file.filename,
        file_path=str(destination),
        file_size=file_size,
        file_type=file.content_type
        or "application/octet-stream",
        created_at=datetime.utcnow()
    )

    database.add(new_file)

    activity = db.CommunicationActivity(
        vendor_id=vendor.vendor_id,
        user_id=current_user.id,
        activity_type="File Upload",
        subject=file.filename,
        description=f"{file.filename} uploaded",
        status="Delivered",
        created_at=datetime.utcnow()
    )

    database.add(activity)
    database.commit()
    database.refresh(new_file)

    return {
        "success": True,
        "file": {
            "id": new_file.id,
            "file_name": new_file.file_name,
            "file_size": new_file.file_size,
            "file_type": new_file.file_type
        }
    }


@app.get( "/api/procurement/messages/files/{file_id}/download", tags=["Manager Dashboard"] )
def download_procurement_file(
    file_id: int, vendor_id: str,
    database: Session = Depends(db.get_db),
    current_user=Depends( crud.require_procurement_manager )
):

    communication_file = ( database .query(db.CommunicationFile)
        .filter( db.CommunicationFile.id == file_id,
            db.CommunicationFile.vendor_id == vendor_id ) .first()
    )

    if not communication_file:
        raise HTTPException( status_code=404, detail="File not found" )

    path = Path( communication_file.file_path )

    if not path.exists():
        raise HTTPException( status_code=404, detail="Physical file not found" )

    return FileResponse(
        path=str(path),
        filename=communication_file.file_name,
        media_type=( communication_file.file_type or "application/octet-stream" )
    )


# ============================================================
# PROCUREMENT MANAGER HELP & SUPPORT
# ============================================================

@app.get( "/api/procurement/support/dashboard", tags=["Manager Dashboard"] )
def procurement_support_dashboard( database: Session = Depends(db.get_db) ):

    categories = ( database .query(db.SupportCategory) .filter( db.SupportCategory.is_active == True )
        .order_by( db.SupportCategory.display_order.asc() ) .all() )

    articles = ( database .query(db.SupportArticle) .filter( db.SupportArticle.is_active == True )
        .order_by( db.SupportArticle.display_order.asc() ) .limit(20) .all() )

    contacts = ( database .query(db.SupportContact) .filter( db.SupportContact.is_active == True ) .all() )

    services = ( database .query(db.SupportServiceStatus) .order_by( db.SupportServiceStatus.service_name.asc() ) .all() )

    faqs = ( database .query(db.SupportFAQ) .filter( db.SupportFAQ.is_active == True )
        .order_by( db.SupportFAQ.display_order.asc() ) .limit(10) .all() )

    return {
        "categories": [
            {
                "id": item.id, "name": item.name,
                "description": item.description, "icon": item.icon, "color": item.color
            }
            for item in categories
        ],

        "articles": [
            {
                "id": item.id, "title": item.title, "slug": item.slug,
                "summary": item.summary, "content": item.content,
                "category": item.category, "icon": item.icon,
                "views": item.views, "helpful_yes": item.helpful_yes,
                "helpful_no": item.helpful_no, "is_popular": item.is_popular
            }
            for item in articles
        ],

        "contacts": [
            {
                "id": item.id, "contact_type": item.contact_type,
                "title": item.title, "value": item.value, "description": item.description
            }
            for item in contacts
        ],

        "services": [
            {
                "service_name": item.service_name,
                "status": item.status,
                "message": item.message,
                "checked_at": ( item.checked_at.isoformat()
                    if item.checked_at
                    else None )
            }
            for item in services
        ],

        "faqs": [
            { "id": item.id,"question": item.question, "answer": item.answer, "category": item.category }
            for item in faqs
        ]
    }


@app.post( "/api/procurement/support/tickets", response_model=db.SupportTicketResponse, status_code=201, tags=["Manager Dashboard"] )
def create_procurement_support_ticket(
    ticket_data: db.SupportTicketCreate, database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.get_current_user )
):

    ticket = db.SupportTicket(
        ticket_id= crud.generate_ticket_id( database ),
        subject= ticket_data.subject,
        description= ticket_data.description,
        category= ticket_data.category,
        priority= ticket_data.priority,
        status="Open",
        created_by= current_user.name
            if getattr( current_user, "name", None )
            else current_user.email,
        vendor_id=None
    )

    database.add(ticket)

    database.commit()

    database.refresh(ticket)

    return ticket


@app.post( "/api/procurement/support/tickets/{ticket_id}/attachments", tags=["Manager Dashboard"] )
async def upload_support_ticket_attachment(
    ticket_id: int, file: UploadFile = File(...),
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.get_current_user )
):

    ticket = ( database .query(db.SupportTicket) .filter( db.SupportTicket.id == ticket_id ) .first() )

    if not ticket:
        raise HTTPException( status_code=404, detail="Support ticket not found" )

    upload_dir = Path( "uploads/support_tickets" )

    upload_dir.mkdir( parents=True, exist_ok=True )

    extension = Path( file.filename or "" ).suffix

    stored_name = ( f"{uuid.uuid4().hex} {extension}" )

    destination = upload_dir / stored_name

    content = await file.read()

    with open( destination, "wb" ) as output:
        output.write(content)

    attachment = db.SupportTicketAttachment(
            ticket_id=ticket.id,
            file_name=file.filename,
            stored_name=stored_name,
            file_path=str( destination ),
            file_type=file.content_type,
            file_size=len(content)
        )

    database.add( attachment )

    database.commit()

    database.refresh( attachment )

    return {
        "success": True,
        "attachment": {
            "id": attachment.id, "ticket_id": attachment.ticket_id,
            "file_name": attachment.file_name, "file_size": attachment.file_size
        }
    }


@app.put( "/api/settings/page", tags=["Manager Dashboard"] )
def update_settings_page(
    payload: db.SettingsPageUpdate, database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):

    # ==========================================
    # COMPANY
    # ==========================================

    if payload.organization_name is not None:
        company = ( database.query(db.CompanyProfile) .first() )

        if not company:
            company = db.CompanyProfile( company_name=payload.organization_name, company_id=f"COMP-{current_user.id}" )
            database.add(company)

        else:
            company.company_name = ( payload.organization_name )

    # ==========================================
    # USER PREFERENCES
    # ==========================================

    preferences = ( database.query(db.UserPreferences) .filter( db.UserPreferences.user_id == current_user.id ) .first() )

    if not preferences:
        preferences = db.UserPreferences( user_id=current_user.id )
        database.add(preferences)

    # ==========================================
    # MAP SETTINGS
    # ==========================================

    mapping = {
        "timezone": "timezone",
        "language": "language",
        "currency": "currency",
        "number_format": "number_format",
        "date_format": "date_format",
        "start_of_week": "start_of_week",
        "dashboard_view": "dashboard_view",
        "compact_mode": "compact_mode",
        "auto_attach_documents": "auto_attach_documents",
        "export_format": "export_format",
        "font_size": "font_size",
        "primary_color": "primary_color",
        "sidebar_position": "sidebar_position",
    }

    for request_field, model_field in mapping.items():
        value = getattr( payload, request_field, None )
        if value is not None:
            setattr( preferences, model_field, value )

    # ==========================================
    # NOTIFICATION SETTINGS
    # ==========================================

    notification_settings = ( database.query(db.NotificationSettings)
        .filter( db.NotificationSettings.user_id == current_user.id ) .first()
    )

    if not notification_settings:
        notification_settings = ( db.NotificationSettings( user_id=current_user.id ) )
        database.add(notification_settings)

    if payload.sound_notifications is not None:
        notification_settings.notification_sound = ( payload.sound_notifications )

    if payload.email_updates is not None:
        notification_settings.email_enabled = ( payload.email_updates )

    # ==========================================
    # DARK MODE
    # ==========================================

    if payload.dark_mode is not None:
        preferences.theme = ( "Dark"
            if payload.dark_mode
            else "Light"
        )

    # ==========================================
    # SYSTEM SETTINGS
    # ==========================================

    system = ( database.query(db.SystemSettings) .first() )

    if not system:
        system = db.SystemSettings()
        database.add(system)

    if payload.items_per_page is not None:
        system.items_per_page = ( payload.items_per_page )

    if payload.session_timeout is not None:
        system.session_timeout = ( payload.session_timeout )

    if payload.date_format is not None:
        system.date_format = ( payload.date_format )

    if payload.currency is not None:
        system.currency = ( payload.currency )

    if payload.number_format is not None:
        system.number_format = ( payload.number_format )

    if payload.language is not None:
        system.default_language = ( payload.language )

    if payload.timezone is not None:
        system.default_timezone = ( payload.timezone )

    # ==========================================
    # COMMIT
    # ==========================================

    database.commit()
    database.refresh(preferences)
    if company:
        database.refresh(company)

    crud.create_audit_log(
        database, current_user,
        "UPDATE", "Settings page updated",
        "user_preferences", str(preferences.id)
    )

    return { "success": True, "message": "Settings saved successfully" }


@app.get( "/api/settings/system-info", tags=["Manager Dashboard"] )
def get_settings_system_info( database: Session = Depends(db.get_db), current_user: db.User = Depends(crud.get_current_user) ):

    database_status = "Connected"

    try:
        database.execute(text("SELECT 1"))
    except Exception:
        database_status = "Disconnected"

    return {
        "version": "2.4.1",
        "environment": os.getenv( "APP_ENV", "Production" ),
        "last_updated": "2024-05-30",
        "database": database_status,
        "server_status": "Operational"
    }


# ============================================================
# PROCUREMENT MANAGER PROFILE
# ============================================================

# ------------------------------------------------------------
# GET MY PROFILE
# ------------------------------------------------------------

@app.get(
    "/api/procurement/profile/me",
    tags=["Manager Profile"]
)
def get_procurement_profile(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.get_current_procurement_manager
    )
):

    try:

        # ======================================================
        # REPORTING MANAGER
        # ======================================================

        manager_name = None

        reporting_manager_id = getattr(
            current_user,
            "reporting_manager_id",
            None
        )

        if reporting_manager_id:

            manager = (
                database.query(db.User)
                .filter(
                    db.User.id ==
                    reporting_manager_id
                )
                .first()
            )

            if manager:
                manager_name = manager.name


        # ======================================================
        # USER PREFERENCES
        # ======================================================

        preferences = None

        try:

            preferences = (
                database.query(db.UserPreferences)
                .filter(
                    db.UserPreferences.user_id ==
                    current_user.id
                )
                .first()
            )

        except Exception as exc:

            print(
                "USER PREFERENCES ERROR:",
                repr(exc)
            )

            database.rollback()

            preferences = None


        # ======================================================
        # CREATE DEFAULT PREFERENCES IF REQUIRED
        # ======================================================

        if preferences is None:

            try:

                preferences = db.UserPreferences( user_id=current_user.id )

                database.add( preferences )

                database.commit()

                database.refresh(
                    preferences
                )

            except Exception as exc:

                print(
                    "CREATE PREFERENCES ERROR:",
                    repr(exc)
                )

                database.rollback()

                preferences = None


        # ======================================================
        # USER SKILLS
        # ======================================================

        skills = []

        try:

            skills = (
                database.query(db.UserSkill)
                .filter(
                    db.UserSkill.user_id ==
                    current_user.id
                )
                .order_by(
                    db.UserSkill.proficiency.desc(),
                    db.UserSkill.skill_name.asc()
                )
                .all()
            )

        except Exception as exc:

            print(
                "USER SKILLS ERROR:",
                repr(exc)
            )

            database.rollback()

            skills = []


        # ======================================================
        # PROFILE FIELDS
        # ======================================================

        profile_fields = [

            getattr(
                current_user,
                "name",
                None
            ),

            getattr(
                current_user,
                "email",
                None
            ),

            getattr(
                current_user,
                "mobile",
                None
            ),

            getattr(
                current_user,
                "gender",
                None
            ),

            getattr(
                current_user,
                "date_of_birth",
                None
            ),

            getattr(
                current_user,
                "nationality",
                None
            ),

            getattr(
                current_user,
                "department",
                None
            ),

            getattr(
                current_user,
                "job_title",
                None
            ),

            getattr(
                current_user,
                "location",
                None
            ),

            getattr(
                current_user,
                "address",
                None
            ),

            getattr(
                current_user,
                "date_of_joining",
                None
            ),

            getattr(
                current_user,
                "about_me",
                None
            ),

            getattr(
                current_user,
                "languages",
                None
            ),

            getattr(
                current_user,
                "work_phone",
                None
            ),

            getattr(
                current_user,
                "employment_type",
                None
            ),

            getattr(
                current_user,
                "business_unit",
                None
            )
        ]


        completed_fields = sum(
            1
            for value in profile_fields
            if value not in [
                None,
                "",
                []
            ]
        )


        completion_percentage = round(
            (
                completed_fields /
                len(profile_fields)
            ) * 100
        )


        # ======================================================
        # SAFE DATE FORMATTER
        # ======================================================

        def iso_date(value):

            if value is None:
                return None

            if hasattr(
                value,
                "isoformat"
            ):
                return value.isoformat()

            return str(value)


        # ======================================================
        # USER RESPONSE
        # ======================================================

        user_data = {

            "id":
                getattr(
                    current_user,
                    "id",
                    None
                ),

            "name":
                getattr(
                    current_user,
                    "name",
                    None
                ),

            "employee_id":
                getattr(
                    current_user,
                    "employee_id",
                    None
                ),

            "email":
                getattr(
                    current_user,
                    "email",
                    None
                ),

            "alternate_email":
                getattr(
                    current_user,
                    "alternate_email",
                    None
                ),

            "mobile":
                getattr(
                    current_user,
                    "mobile",
                    None
                ),

            "gender":
                getattr(
                    current_user,
                    "gender",
                    None
                ),

            "date_of_birth":
                iso_date(
                    getattr(
                        current_user,
                        "date_of_birth",
                        None
                    )
                ),

            "nationality":
                getattr(
                    current_user,
                    "nationality",
                    None
                ),

            "languages":
                getattr(
                    current_user,
                    "languages",
                    None
                ),

            "department":
                getattr(
                    current_user,
                    "department",
                    None
                ),

            "job_title":
                getattr(
                    current_user,
                    "job_title",
                    None
                ),

            "location":
                getattr(
                    current_user,
                    "location",
                    None
                ),

            "reporting_manager_id":
                reporting_manager_id,

            "reporting_manager_name":
                manager_name,

            "date_of_joining":
                iso_date(
                    getattr(
                        current_user,
                        "date_of_joining",
                        None
                    )
                ),

            "address":
                getattr(
                    current_user,
                    "address",
                    None
                ),

            "about_me":
                getattr(
                    current_user,
                    "about_me",
                    None
                ),

            "work_phone":
                getattr(
                    current_user,
                    "work_phone",
                    None
                ),

            "team_size":
                getattr(
                    current_user,
                    "team_size",
                    None
                ),

            "employment_type":
                getattr(
                    current_user,
                    "employment_type",
                    None
                ),

            "business_unit":
                getattr(
                    current_user,
                    "business_unit",
                    None
                ),

            "profile_image":
                getattr(
                    current_user,
                    "profile_image",
                    None
                ),

            "role":
                getattr(
                    current_user,
                    "role",
                    None
                ),

            "active":
                getattr(
                    current_user,
                    "active",
                    True
                ),

            "two_factor_enabled":
                getattr(
                    current_user,
                    "two_factor_enabled",
                    False
                ),

            "login_email_notifications":
                getattr(
                    current_user,
                    "login_email_notifications",
                    True
                ),

            "last_login":
                iso_date(
                    getattr(
                        current_user,
                        "last_login",
                        None
                    )
                ),

            "password_changed_at":
                iso_date(
                    getattr(
                        current_user,
                        "password_changed_at",
                        None
                    )
                ),

            "profile_completion":
                completion_percentage
        }


        # ======================================================
        # PREFERENCES RESPONSE
        # ======================================================

        if preferences:

            preferences_data = {

                "language":
                    getattr(
                        preferences,
                        "language",
                        "English (US)"
                    ),

                "timezone":
                    getattr(
                        preferences,
                        "timezone",
                        "(UTC+05:30) Asia/Kolkata"
                    ),

                "date_format":
                    getattr(
                        preferences,
                        "date_format",
                        "MM/DD/YYYY"
                    ),

                "time_format":
                    getattr(
                        preferences,
                        "time_format",
                        "12 Hour (AM/PM)"
                    ),

                "currency":
                    getattr(
                        preferences,
                        "currency",
                        "USD - US Dollar"
                    ),

                "theme":
                    getattr(
                        preferences,
                        "theme",
                        "Light"
                    )
            }

        else:

            preferences_data = {

                "language":
                    "English (US)",

                "timezone":
                    "(UTC+05:30) Asia/Kolkata",

                "date_format":
                    "MM/DD/YYYY",

                "time_format":
                    "12 Hour (AM/PM)",

                "currency":
                    "USD - US Dollar",

                "theme":
                    "Light"
            }


        # ======================================================
        # SKILLS RESPONSE
        # ======================================================

        skills_data = []

        for skill in skills:

            skills_data.append({

                "id":
                    getattr(
                        skill,
                        "id",
                        None
                    ),

                "skill_name":
                    getattr(
                        skill,
                        "skill_name",
                        ""
                    ),

                "proficiency":
                    float(
                        getattr(
                            skill,
                            "proficiency",
                            0
                        ) or 0
                    )
            })


        # ======================================================
        # FINAL RESPONSE
        # ======================================================

        return {

            "success":
                True,

            "user":
                user_data,

            "preferences":
                preferences_data,

            "skills":
                skills_data
        }


    except HTTPException:

        raise


    except Exception as exc:

        database.rollback()

        print(
            "======================================"
        )

        print(
            "PROCUREMENT PROFILE ERROR"
        )

        print(
            repr(exc)
        )

        import traceback

        traceback.print_exc()

        print(
            "======================================"
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load procurement profile."
        )


# ------------------------------------------------------------
# UPDATE MY PROFILE
# ------------------------------------------------------------

@app.put(
    "/api/procurement/profile/me",
    tags=["Manager Profile"]
)
def update_procurement_profile(
    payload: db.ProfileUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.get_current_procurement_manager
    )
):

    try:

        # =====================================================
        # EMAIL
        # =====================================================

        email = (
            str(payload.email).strip()
            if payload.email
            else ""
        )

        if not email:

            raise HTTPException(
                status_code=400,
                detail="Email address is required."
            )

        duplicate_email = (
            database.query(db.User)
            .filter(
                db.User.email == email,
                db.User.id != current_user.id
            )
            .first()
        )

        if duplicate_email:

            raise HTTPException(
                status_code=400,
                detail="Email address is already in use."
            )

        # =====================================================
        # ALTERNATE EMAIL
        # =====================================================

        alternate_email = None

        if payload.alternate_email:

            alternate_email = (
                str(
                    payload.alternate_email
                ).strip()
            )

            duplicate_alt = (
                database.query(db.User)
                .filter(
                    db.User.alternate_email ==
                    alternate_email,

                    db.User.id !=
                    current_user.id
                )
                .first()
            )

            if duplicate_alt:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Alternate email is already in use."
                    )
                )

        # =====================================================
        # REPORTING MANAGER
        # =====================================================

        if payload.reporting_manager_id:

            if (
                payload.reporting_manager_id ==
                current_user.id
            ):

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "You cannot select yourself "
                        "as reporting manager."
                    )
                )

            manager = (
                database.query(db.User)
                .filter(
                    db.User.id ==
                    payload.reporting_manager_id,

                    db.User.active == True
                )
                .first()
            )

            if not manager:

                raise HTTPException(
                    status_code=400,
                    detail="Reporting manager not found."
                )

        # =====================================================
        # BASIC INFORMATION
        # =====================================================

        current_user.name = (
            payload.name.strip()
            if payload.name
            else current_user.name
        )

        current_user.email = email

        current_user.alternate_email = (
            alternate_email
        )

        current_user.mobile = (
            payload.mobile.strip()
            if payload.mobile
            else None
        )

        current_user.gender = (
            payload.gender.strip()
            if payload.gender
            else None
        )

        # =====================================================
        # PERSONAL INFORMATION
        # =====================================================

        current_user.date_of_birth = (
            payload.date_of_birth
        )

        current_user.nationality = (
            payload.nationality.strip()
            if payload.nationality
            else None
        )

        current_user.about_me = (
            payload.about_me.strip()
            if payload.about_me
            else None
        )

        current_user.languages = (
            payload.languages.strip()
            if payload.languages
            else None
        )

        # =====================================================
        # WORK INFORMATION
        # =====================================================

        current_user.department = (
            payload.department.strip()
            if payload.department
            else None
        )

        current_user.job_title = (
            payload.job_title.strip()
            if payload.job_title
            else None
        )

        current_user.location = (
            payload.location.strip()
            if payload.location
            else None
        )

        current_user.reporting_manager_id = (
            payload.reporting_manager_id
        )

        current_user.date_of_joining = (
            payload.date_of_joining
        )

        current_user.address = (
            payload.address.strip()
            if payload.address
            else None
        )

        # =====================================================
        # AUDIT LOG
        # =====================================================

        crud.create_audit_log(
            database,  current_user,
            "UPDATE",
            "Updated personal profile information",
            "users",
            str(current_user.id)
        )

        # =====================================================
        # SAVE
        # =====================================================

        database.commit()
        database.refresh(current_user)

        return {
            "success": True,
            "message":
                "Profile updated successfully."
        }

    except HTTPException:

        database.rollback()
        raise

    except Exception as exc:

        database.rollback()

        print(
            "PROFILE UPDATE ERROR:",
            str(exc)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to update profile."
        )


# ------------------------------------------------------------
# CHANGE PASSWORD
# ------------------------------------------------------------

@app.put(
    "/api/procurement/profile/password",
    tags=["Manager Profile"]
)
def change_my_password(
    payload: db.PasswordChangeRequest,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.get_current_procurement_manager
    )
):

    try:

        # =====================================================
        # CURRENT PASSWORD
        # =====================================================

        if not db.verify_password(
            payload.current_password,
            current_user.hashed_password
        ):

            raise HTTPException(
                status_code=400,
                detail="Current password is incorrect."
            )

        # =====================================================
        # CONFIRM PASSWORD
        # =====================================================

        if (
            payload.new_password !=
            payload.confirm_password
        ):

            raise HTTPException(
                status_code=400,
                detail="New passwords do not match."
            )

        password = payload.new_password

        # =====================================================
        # PASSWORD RULES
        # =====================================================

        if len(password) < 8:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Password must contain "
                    "at least 8 characters."
                )
            )

        if not any(
            char.isupper()
            for char in password
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Password must contain "
                    "an uppercase letter."
                )
            )

        if not any(
            char.islower()
            for char in password
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Password must contain "
                    "a lowercase letter."
                )
            )

        if not any(
            char.isdigit()
            for char in password
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Password must contain "
                    "a number."
                )
            )

        # =====================================================
        # UPDATE
        # =====================================================

        current_user.hashed_password = (
            db.hash_password(password)
        )

        current_user.password_changed_at = (
            datetime.utcnow()
        )

        # =====================================================
        # AUDIT
        # =====================================================

        crud.create_audit_log(
            database, current_user,
            "PASSWORD_CHANGE",
            "Password changed successfully",
            "users",
            str(current_user.id)
        )

        database.commit()

        return {
            "success": True,
            "message":
                "Password updated successfully."
        }

    except HTTPException:

        database.rollback()
        raise

    except Exception as exc:

        database.rollback()

        print(
            "PASSWORD CHANGE ERROR:",
            str(exc)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to change password."
        )


# ------------------------------------------------------------
# TWO FACTOR AUTHENTICATION
# ------------------------------------------------------------

@app.put(
    "/api/procurement/profile/security/2fa",
    tags=["Manager Profile"]
)
def update_two_factor(
    payload: db.TwoFactorUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.get_current_procurement_manager
    )
):

    try:

        current_user.two_factor_enabled = (
            bool(payload.enabled)
        )

        description = (
            "Enabled two-factor authentication"
            if payload.enabled
            else
            "Disabled two-factor authentication"
        )

        crud.create_audit_log(
            database, current_user,
            "SECURITY_UPDATE",
            description,
            "users",
            str(current_user.id)
        )

        database.commit()
        database.refresh(current_user)

        return {
            "success": True,
            "enabled":
                bool(
                    current_user.two_factor_enabled
                )
        }

    except Exception as exc:

        database.rollback()

        print(
            "2FA UPDATE ERROR:",
            str(exc)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to update two-factor authentication."
        )


# ------------------------------------------------------------
# LOGIN EMAIL NOTIFICATIONS
# ------------------------------------------------------------

@app.put(
    "/api/procurement/profile/security/login-notifications",
    tags=["Manager Profile"]
)
def update_manager_login_notifications(
    payload: db.LoginNotificationUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.get_current_procurement_manager
    )
):

    try:

        current_user.login_email_notifications = (
            bool(payload.enabled)
        )

        description = (
            "Enabled login email notifications"
            if payload.enabled
            else
            "Disabled login email notifications"
        )

        crud.create_audit_log(
            database, current_user,
            "SECURITY_UPDATE",
            description,
            "users",
            str(current_user.id)
        )

        database.commit()
        database.refresh(current_user)

        return {
            "success": True,
            "enabled":
                bool(
                    current_user.login_email_notifications
                )
        }

    except Exception as exc:

        database.rollback()

        print(
            "LOGIN NOTIFICATION ERROR:",
            str(exc)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to update "
                "login notification settings."
            )
        )


# ------------------------------------------------------------
# GET AVAILABLE MANAGERS
# ------------------------------------------------------------

@app.get(
    "/api/procurement/profile/managers",
    tags=["Manager Profile"]
)
def get_managers(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.get_current_procurement_manager
    )
):

    try:

        managers = (
            database.query(db.User)
            .filter(
                db.User.active == True,
                db.User.id != current_user.id
            )
            .order_by(
                db.User.name.asc()
            )
            .all()
        )

        return {
            "success": True,

            "managers": [
                {
                    "id": manager.id,
                    "name": manager.name,
                    "role": manager.role
                }

                for manager in managers
            ]
        }

    except Exception as exc:

        print(
            "GET MANAGERS ERROR:",
            str(exc)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load managers."
        )


# ------------------------------------------------------------
# ACTIVITY
# ------------------------------------------------------------

@app.get(
    "/api/procurement/profile/activity",
    tags=["Manager Profile"]
)
def get_manager_activity(
    limit: int = Query(
        10,
        ge=1,
        le=100
    ),

    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(
        crud.get_current_procurement_manager
    )
):

    try:

        logs = (
            database.query(db.AuditLog)
            .filter(
                db.AuditLog.user_id ==
                current_user.id
            )
            .order_by(
                db.AuditLog.created_at.desc()
            )
            .limit(limit)
            .all()
        )

        return {

            "success": True,

            "items": [

                {
                    "id": log.id,

                    "action": log.action,

                    "description":
                        log.description,

                    "resource":
                        log.resource,

                    "resource_id":
                        log.resource_id,

                    "ip_address":
                        log.ip_address,

                    "status":
                        log.status,

                    "created_at": (
                        log.created_at.isoformat()
                        if log.created_at
                        else None
                    )
                }

                for log in logs
            ]
        }

    except Exception as exc:

        print(
            "ACTIVITY ERROR:",
            str(exc)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load activity."
        )


# ------------------------------------------------------------
# UPDATE PREFERENCES
# ------------------------------------------------------------

@app.put(
    "/api/procurement/profile/preferences",
    tags=["Manager Profile"]
)
def update_procurement_preferences(
    payload: db.ProfilePreferencesUpdate,

    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(
        crud.get_current_procurement_manager
    )
):

    try:

        preferences = (
            database.query(db.UserPreferences)
            .filter(
                db.UserPreferences.user_id ==
                current_user.id
            )
            .first()
        )

        if not preferences:

            preferences = db.UserPreferences(
                user_id=current_user.id
            )

            database.add(preferences)

        # =====================================================
        # UPDATE VALUES
        # =====================================================

        if payload.language:
            preferences.language = (
                payload.language.strip()
            )

        if payload.timezone:
            preferences.timezone = (
                payload.timezone.strip()
            )

        if payload.date_format:
            preferences.date_format = (
                payload.date_format.strip()
            )

        if payload.time_format:
            preferences.time_format = (
                payload.time_format.strip()
            )

        if payload.currency:
            preferences.currency = (
                payload.currency.strip()
            )

        if payload.theme:
            preferences.theme = (
                payload.theme.strip()
            )

        # =====================================================
        # SAVE FIRST
        # =====================================================

        database.flush()

        # =====================================================
        # AUDIT
        # =====================================================

        crud.create_audit_log(
            database, current_user,
            "UPDATE",
            "Updated profile preferences",
            "user_preferences",
            str(preferences.id)
        )

        database.commit()
        database.refresh(preferences)

        return {

            "success": True,

            "message":
                "Preferences updated successfully.",

            "preferences": {

                "language":
                    preferences.language,

                "timezone":
                    preferences.timezone,

                "date_format":
                    preferences.date_format,

                "time_format":
                    preferences.time_format,

                "currency":
                    preferences.currency,

                "theme":
                    preferences.theme
            }
        }

    except Exception as exc:

        database.rollback()

        print(
            "PREFERENCES UPDATE ERROR:",
            str(exc)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to update preferences."
        )


# ------------------------------------------------------------
# UPLOAD PROFILE PHOTO
# ------------------------------------------------------------

@app.post(
    "/api/procurement/profile/photo",
    tags=["Manager Profile"]
)
async def upload_manager_profile_photo(
    file: UploadFile = File(...),

    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(
        crud.get_current_procurement_manager
    )
):

    try:

        # =====================================================
        # VALIDATE CONTENT TYPE
        # =====================================================

        allowed_types = {
            "image/jpeg",
            "image/png",
            "image/webp"
        }

        if file.content_type not in allowed_types:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Only JPG, PNG and WEBP "
                    "images are allowed."
                )
            )

        # =====================================================
        # READ
        # =====================================================

        content = await file.read()

        max_size = 5 * 1024 * 1024

        if len(content) > max_size:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Profile image must be "
                    "smaller than 5 MB."
                )
            )

        if not content:

            raise HTTPException(
                status_code=400,
                detail="Uploaded image is empty."
            )

        # =====================================================
        # DIRECTORY
        # =====================================================

        upload_directory = os.path.join(
            "uploads",
            "profile"
        )

        os.makedirs(
            upload_directory,
            exist_ok=True
        )

        # =====================================================
        # EXTENSION
        # =====================================================

        extension_map = {

            "image/jpeg": ".jpg",

            "image/png": ".png",

            "image/webp": ".webp"
        }

        extension = extension_map[
            file.content_type
        ]

        filename = (
            f"user_"
            f"{current_user.id}_"
            f"{uuid.uuid4().hex}"
            f"{extension}"
        )

        file_path = os.path.join(
            upload_directory,
            filename
        )

        # =====================================================
        # SAVE FILE
        # =====================================================

        with open(
            file_path,
            "wb"
        ) as output_file:

            output_file.write(content)

        # =====================================================
        # URL
        # =====================================================

        profile_url = (
            f"/uploads/profile/{filename}"
        )

        current_user.profile_image = (
            profile_url
        )

        # =====================================================
        # AUDIT
        # =====================================================

        crud.create_audit_log(
            database, current_user,
            "UPDATE",
            "Updated profile photo",
            "users",
            str(current_user.id)
        )

        database.commit()
        database.refresh(current_user)

        return {

            "success": True,

            "message":
                "Profile photo uploaded successfully.",

            "profile_image":
                current_user.profile_image
        }

    except HTTPException:

        database.rollback()
        raise

    except Exception as exc:

        database.rollback()

        print(
            "PROFILE PHOTO ERROR:",
            str(exc)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to upload profile photo."
        )


# ------------------------------------------------------------
# GET SKILLS
# ------------------------------------------------------------

@app.get(
    "/api/procurement/profile/skills",
    tags=["Manager Profile"]
)
def get_my_skills(
    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(
        crud.get_current_procurement_manager
    )
):

    try:

        skills = (
            database.query(db.UserSkill)
            .filter(
                db.UserSkill.user_id ==
                current_user.id
            )
            .order_by(
                db.UserSkill.proficiency.desc(),
                db.UserSkill.skill_name.asc()
            )
            .all()
        )

        return {

            "success": True,

            "skills": [

                {
                    "id": skill.id,

                    "skill_name":
                        skill.skill_name,

                    "proficiency":
                        float(
                            skill.proficiency or 0
                        )
                }

                for skill in skills
            ]
        }

    except Exception as exc:

        print(
            "GET SKILLS ERROR:",
            str(exc)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load skills."
        )


# ------------------------------------------------------------
# UPDATE SKILLS
# ------------------------------------------------------------

@app.put(
    "/api/procurement/profile/skills",
    tags=["Manager Profile"]
)
def update_my_skills(
    payload: db.SkillsUpdate,

    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(
        crud.get_current_procurement_manager
    )
):

    try:

        # =====================================================
        # DELETE OLD
        # =====================================================

        (
            database.query(db.UserSkill)
            .filter(
                db.UserSkill.user_id ==
                current_user.id
            )
            .delete(
                synchronize_session=False
            )
        )

        inserted = 0

        # =====================================================
        # INSERT NEW
        # =====================================================

        for item in payload.skills:

            skill_name = (
                item.skill_name.strip()
            )

            if not skill_name:
                continue

            proficiency = float(
                item.proficiency
            )

            if proficiency < 0:
                proficiency = 0

            if proficiency > 100:
                proficiency = 100

            skill = db.UserSkill(

                user_id=current_user.id,

                skill_name=skill_name,

                proficiency=proficiency
            )

            database.add(skill)

            inserted += 1

        # =====================================================
        # AUDIT
        # =====================================================

        crud.create_audit_log(
            database, current_user,
            "UPDATE",
            "Updated profile skills",
            "user_skills",
            str(current_user.id)
        )

        database.commit()

        return {

            "success": True,

            "message":
                "Skills updated successfully.",

            "count": inserted
        }

    except Exception as exc:

        database.rollback()

        print(
            "SKILLS UPDATE ERROR:",
            str(exc)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to update skills."
        )


# ------------------------------------------------------------
# GET SESSIONS
# ------------------------------------------------------------

@app.get(
    "/api/procurement/profile/sessions",
    tags=["Manager Profile"]
)
def get_my_sessions(
    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(
        crud.get_current_procurement_manager
    )
):

    try:

        sessions = (
            database.query(db.UserSession)
            .filter(
                db.UserSession.user_id ==
                current_user.id
            )
            .order_by(
                db.UserSession.last_active.desc()
            )
            .all()
        )

        return {

            "success": True,

            "active_count": sum(
                1
                for session in sessions
                if session.is_current
            ),

            "items": [

                {

                    "id": session.id,

                    "device": (
                        session.device
                        or "Unknown device"
                    ),

                    "browser": (
                        session.browser
                        or "Unknown browser"
                    ),

                    "ip_address": (
                        session.ip_address
                        or None
                    ),

                    "location": (
                        session.location
                        or None
                    ),

                    "is_current":
                        bool(
                            session.is_current
                        ),

                    "last_active": (
                        session.last_active.isoformat()
                        if session.last_active
                        else None
                    ),

                    "created_at": (
                        session.created_at.isoformat()
                        if session.created_at
                        else None
                    )
                }

                for session in sessions
            ]
        }

    except Exception as exc:

        print(
            "GET SESSIONS ERROR:",
            str(exc)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load sessions."
        )


# ------------------------------------------------------------
# REVOKE ONE SESSION
# ------------------------------------------------------------

@app.delete(
    "/api/procurement/profile/sessions/{session_id}",
    tags=["Manager Profile"]
)
def revoke_my_session(
    session_id: int,

    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(
        crud.get_current_procurement_manager
    )
):

    try:

        session = (
            database.query(db.UserSession)
            .filter(
                db.UserSession.id ==
                session_id,

                db.UserSession.user_id ==
                current_user.id
            )
            .first()
        )

        if not session:

            raise HTTPException(
                status_code=404,
                detail="Session not found."
            )

        if session.is_current:

            raise HTTPException(
                status_code=400,
                detail=(
                    "The current session cannot "
                    "be revoked."
                )
            )

        database.delete(session)

        crud.create_audit_log(
            database, current_user,
            "SECURITY_UPDATE",
            "Revoked login session",
            "user_sessions",
            str(session_id)
        )

        database.commit()

        return {

            "success": True,

            "message":
                "Session revoked successfully."
        }

    except HTTPException:

        database.rollback()
        raise

    except Exception as exc:

        database.rollback()

        print(
            "REVOKE SESSION ERROR:",
            str(exc)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to revoke session."
        )


# ------------------------------------------------------------
# REVOKE ALL OTHER SESSIONS
# ------------------------------------------------------------

@app.delete(
    "/api/procurement/profile/sessions",
    tags=["Manager Profile"]
)
def revoke_other_sessions(
    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(
        crud.get_current_procurement_manager
    )
):

    try:

        sessions = (
            database.query(db.UserSession)
            .filter(
                db.UserSession.user_id ==
                current_user.id,

                db.UserSession.is_current ==
                False
            )
            .all()
        )

        count = len(sessions)

        for session in sessions:
            database.delete(session)

        crud.create_audit_log(
            database, current_user,
            "SECURITY_UPDATE",
            "Revoked all other login sessions",
            "user_sessions",
            str(current_user.id)
        )

        database.commit()

        return {

            "success": True,

            "message":
                f"{count} other session(s) revoked.",

            "revoked_count":
                count
        }

    except Exception as exc:

        database.rollback()

        print(
            "REVOKE OTHER SESSIONS ERROR:",
            str(exc)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to revoke "
                "other sessions."
            )
        )

# ==========================================================
# MAIN DASHBOARD
# ==========================================================

@app.get("/api/supply-chain/dashboard", tags=["Supply Chain Dashboard"])
def get_supply_chain_dashboard( database: Session = Depends(db.get_db) ):

    # ======================================================
    # CURRENT DATE
    # ======================================================

    today = date.today()

    # ======================================================
    # PURCHASE ORDERS
    # ======================================================

    total_orders = ( database.query( func.count(db.PurchaseOrder.id) ) .scalar() or 0 )

    total_order_amount = ( database.query(
            func.coalesce( func.sum(db.PurchaseOrder.amount), 0 )
        ) .scalar() or 0
    )

    # ======================================================
    # INVENTORY
    # ======================================================

    inventory_value = ( database.query(
            func.coalesce( func.sum( db.InventoryItem.quantity * db.InventoryItem.unit_price ), 0 )
        ) .scalar() or 0
    )

    total_items = (
        database.query( func.coalesce( func.sum(db.InventoryItem.quantity), 0 ) ) .scalar() or 0
    )

    low_stock_items = ( database.query( func.count(db.InventoryItem.id) ) .filter(
            db.InventoryItem.quantity <= db.InventoryItem.minimum_stock,
            db.InventoryItem.quantity > 0
        ) .scalar() or 0
    )

    out_of_stock_items = ( database.query( func.count(db.InventoryItem.id) )
        .filter( db.InventoryItem.quantity <= 0 ) .scalar() or 0
    )

    excess_items = ( database.query( func.count(db.InventoryItem.id) ) .filter(
            db.InventoryItem.maximum_stock > 0,
            db.InventoryItem.quantity > db.InventoryItem.maximum_stock
        ) .scalar() or 0
    )

    # ======================================================
    # SHIPMENTS
    # ======================================================

    in_transit_shipments = ( database.query( func.count(db.Shipment.id) ) .filter(
            func.lower(db.Shipment.status) .in_([ "in transit", "shipped", "dispatched" ])
        ) .scalar() or 0
    )

    # ======================================================
    # AT-RISK ORDERS
    # Orders whose expected delivery date has passed
    # and which are not delivered/cancelled.
    # ======================================================

    at_risk_orders = ( database.query( func.count(db.PurchaseOrder.id) ) .filter(
            db.PurchaseOrder.expected_delivery < today, func.lower(db.PurchaseOrder.status)
            .notin_([ "delivered", "cancelled" ])
        ) .scalar() or 0
    )

    # ======================================================
    # ORDER STATUS DISTRIBUTION
    # ======================================================

    status_rows = (
        database.query( db.PurchaseOrder.status, func.count(db.PurchaseOrder.id) )
        .group_by( db.PurchaseOrder.status ) .all()
    )

    status_distribution = []

    for status, count in status_rows:
        status_distribution.append({ "status": status or "Unknown", "count": count })

    # ======================================================
    # DELIVERY STATISTICS
    # ======================================================

    delivered_orders = ( database.query( func.count(db.PurchaseOrder.id) )
        .filter( func.lower(db.PurchaseOrder.status) == "delivered" ) .scalar() or 0
    )

    on_time_orders = ( database.query( func.count(db.PurchaseOrder.id) ) .filter(
            db.PurchaseOrder.actual_delivery.isnot(None),
            db.PurchaseOrder.expected_delivery.isnot(None),
            db.PurchaseOrder.actual_delivery
            <= db.PurchaseOrder.expected_delivery
        ) .scalar() or 0
    )

    delivered_with_dates = ( database.query( func.count(db.PurchaseOrder.id) ) .filter(
            db.PurchaseOrder.actual_delivery.isnot(None),
            db.PurchaseOrder.expected_delivery.isnot(None)
        ) .scalar() or 0
    )

    if total_orders > 0:
        fulfillment_rate = ( delivered_orders / total_orders ) * 100

    else:
        fulfillment_rate = 0

    if delivered_with_dates > 0:
        on_time_delivery = ( on_time_orders / delivered_with_dates ) * 100

    else:
        on_time_delivery = 0

    # ======================================================
    # RECENT ORDERS
    # ======================================================

    recent_orders = (  database.query(db.PurchaseOrder) 
        .order_by( desc(db.PurchaseOrder.order_date), desc(db.PurchaseOrder.id) ) 
        .limit(5) .all() 
    )

    recent_orders_data = []

    for order in recent_orders:

        supplier_name = "Unknown Supplier"

        if order.vendor:
            supplier_name = (
                getattr( order.vendor, "company_name", None )
                or getattr( order.vendor, "name", None ) or order.vendor_id or "Unknown Supplier"
            )

        recent_orders_data.append({
            "po_number": order.po_number,
            "supplier": supplier_name,
            "order_date": order.order_date.isoformat()
                if order.order_date
                else None,
            "status": order.status or "Pending",
            "amount": crud.safe_float(order.amount)
        })

    # ======================================================
    # TOP SUPPLIERS
    # ======================================================

    supplier_rows = (
        database.query( db.PurchaseOrder.vendor_id, func.count(db.PurchaseOrder.id), func.sum(db.PurchaseOrder.amount) )
        .group_by( db.PurchaseOrder.vendor_id ).order_by( desc(func.sum(db.PurchaseOrder.amount)) )
        .limit(5).all()
    )

    top_suppliers = []

    for vendor_id, order_count, amount in supplier_rows:
        supplier_name = vendor_id or "Unknown Supplier"
        vendor = None

        if vendor_id:
            vendor = ( database.query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )

        if vendor:
            supplier_name = (
                getattr( vendor, "company_name", None )
                or getattr( vendor, "name", None )
                or vendor_id
            )

        top_suppliers.append({
            "supplier": supplier_name,
            "orders": crud.safe_int(order_count),
            "amount": crud.safe_float(amount)
        })

    # ======================================================
    # RECENT NOTIFICATIONS / ALERTS
    # ======================================================

    notifications = ( database.query(db.Notification) .order_by( desc(db.Notification.created_at) ) .limit(5) .all() )

    recent_alerts = []

    for notification in notifications:
        recent_alerts.append({
            "id": notification.id,
            "type": notification.notification_type,
            "title": notification.title,
            "message": notification.message or "",
            "category": notification.category,
            "priority": notification.priority,
            "status": notification.status,
            "created_at": notification.created_at.isoformat()
                if notification.created_at
                else None
        })

    # ======================================================
    # SYSTEM ACTIVITIES
    # ======================================================

    activities = ( database.query(db.SystemActivity) .order_by( desc(db.SystemActivity.created_at) ) .limit(5) .all() )

    activity_data = []

    for activity in activities:

        activity_data.append({
            "id": activity.id,
            "message": activity.message,
            "type": activity.activity_type,
            "created_at": activity.created_at.isoformat()
                if activity.created_at
                else None
        })

    # ======================================================
    # UPCOMING SHIPMENTS
    # ======================================================

    upcoming_shipments = ( database.query(db.Shipment)
        .filter(db.Shipment.expected_delivery.isnot(None), db.Shipment.expected_delivery >= today)
        .order_by( db.Shipment.expected_delivery )
        .limit(5)
        .all()
    )

    upcoming_activities = []

    for shipment in upcoming_shipments:

        upcoming_activities.append({
            "type": "Shipment ETA",
            "title": shipment.shipment_number,
            "date": shipment.expected_delivery.isoformat(),
            "status": shipment.status,
            "destination": shipment.destination
        })

    # ======================================================
    # INVENTORY BY CATEGORY
    # ======================================================

    category_rows = (
        database.query( db.InventoryItem.category, func.sum(db.InventoryItem.quantity) )
        .group_by( db.InventoryItem.category ) .all()
    )

    inventory_categories = []

    for category, quantity in category_rows:

        inventory_categories.append({
            "category": category or "Uncategorized", "quantity": crud.safe_int(quantity)
        })

    # ======================================================
    # MONTHLY ORDER TREND
    #
    # PostgreSQL date_trunc is used here.
    # ======================================================

    monthly_rows = (
        database.query(
            func.date_trunc( "month", db.PurchaseOrder.order_date ).label("month"), 
            func.count( db.PurchaseOrder.id ).label("orders") 
        ) .filter( db.PurchaseOrder.order_date.isnot(None) )
        .group_by( func.date_trunc( "month", db.PurchaseOrder.order_date ) )
        .order_by( func.date_trunc( "month", db.PurchaseOrder.order_date ) ) .limit(12) .all()
    )

    monthly_orders = []

    for month, orders in monthly_rows:
        monthly_orders.append({ "month": month.strftime("%b %Y"), "orders": orders })

    # ======================================================
    # RESPONSE
    # ======================================================

    return {
        "success": True,

        "summary": {
            "total_orders": total_orders,
            "inventory_value": crud.safe_float(inventory_value),
            "in_transit_shipments": in_transit_shipments,
            "at_risk_orders": at_risk_orders,
            "total_order_amount": crud.safe_float(total_order_amount),
            "fulfillment_rate": round( fulfillment_rate, 1 ),
            "on_time_delivery": round( on_time_delivery, 1 )
        },

        "inventory": {
            "total_items": crud.safe_int(total_items),
            "low_stock": low_stock_items,
            "out_of_stock": out_of_stock_items,
            "excess": excess_items,
            "categories": inventory_categories
        },

        "orders": {
            "status_distribution": status_distribution,
            "recent": recent_orders_data,
            "monthly": monthly_orders
        },

        "suppliers": top_suppliers,
        "alerts": recent_alerts,
        "activities": activity_data,
        "upcoming": upcoming_activities
    }


# ============================================================
# DASHBOARD
# ============================================================

@app.get("/api/demand-planning/dashboard", tags=["Supply Chain Dashboard"])
def get_demand_dashboard( database: Session = Depends(db.get_db) ):

    # --------------------------------------------------------
    # Forecast data
    # --------------------------------------------------------

    forecasts = ( database.query(db.DemandForecast) .order_by(db.DemandForecast.period_start.asc()) .all() )

    if not forecasts:
        return {
            "total_demand": 0,
            "demand_change_percent": 0,
            "forecast_accuracy": 0,
            "accuracy_change_percent": 0,
            "planned_orders": 0,
            "planned_orders_change_percent": 0,
            "planning_horizon": "12 Weeks",
            "months": [],
            "forecast_values": [],
            "actual_values": [],
            "category_demand": [],
            "top_products": [],
            "category_accuracy": [],
            "recent_forecast_runs": [],
            "insights": [],
            "demand_plans": []
        }

    # --------------------------------------------------------
    # Total demand
    # --------------------------------------------------------

    total_demand = sum(
        f.forecast_units or 0
        for f in forecasts
    )

    total_actual = sum(
        f.actual_units or 0
        for f in forecasts
    )

    # --------------------------------------------------------
    # Accuracy
    # --------------------------------------------------------

    accuracy_values = [
        f.accuracy
        for f in forecasts
        if f.accuracy is not None
    ]

    forecast_accuracy = (
        sum(accuracy_values) / len(accuracy_values)
        if accuracy_values
        else 0
    )

    # --------------------------------------------------------
    # Planned orders
    # --------------------------------------------------------

    planned_orders = ( database.query( func.coalesce( func.sum(db.DemandPlan.planned_orders), 0 ) ) .scalar() )

    # --------------------------------------------------------
    # Planning horizon
    # --------------------------------------------------------

    latest_plan = ( database.query(db.DemandPlan) .order_by( db.DemandPlan.created_at.desc() ) .first() )

    planning_horizon = (
        latest_plan.time_horizon
        if latest_plan
        else "12 Weeks"
    )

    # --------------------------------------------------------
    # Forecast vs Actual
    # --------------------------------------------------------

    monthly = {}

    for row in forecasts:
        label = row.period_label

        if label not in monthly:
            monthly[label] = { "forecast": 0, "actual": 0, "date": row.period_start }

        monthly[label]["forecast"] += ( row.forecast_units or 0 )

        monthly[label]["actual"] += ( row.actual_units or 0 )

    monthly_rows = sorted( monthly.items(), key=lambda x: x[1]["date"] )[-7:]

    months = [
        row[0]
        for row in monthly_rows
    ]

    forecast_values = [
        row[1]["forecast"]
        for row in monthly_rows
    ]

    actual_values = [
        row[1]["actual"]
        for row in monthly_rows
    ]

    # --------------------------------------------------------
    # Demand by category
    # --------------------------------------------------------

    category_map = {}

    for row in forecasts:
        category = ( row.category or "Other" )
        category_map[category] = ( category_map.get(category, 0) + (row.forecast_units or 0) )

    category_demand = [
        { "category": category, "units": units }
        for category, units
        in sorted( category_map.items(), key=lambda x: x[1], reverse=True )
    ]

    # --------------------------------------------------------
    # Top products
    # --------------------------------------------------------

    product_map = {}

    for row in forecasts:
        product = row.product_name
        product_map[product] = ( product_map.get(product, 0) + (row.forecast_units or 0) )

    top_products = [
        { "product": product, "forecast": units }
        for product, units
        in sorted( product_map.items(), key=lambda x: x[1], reverse=True )[:5]
    ]

    # --------------------------------------------------------
    # Category accuracy
    # --------------------------------------------------------

    category_accuracy_map = {}

    for row in forecasts:
        category = ( row.category or "Other" )

        if category not in category_accuracy_map:
            category_accuracy_map[category] = []

        if row.accuracy is not None:
            category_accuracy_map[ category ].append(row.accuracy)

    category_accuracy = []

    for category, values in category_accuracy_map.items():
        category_accuracy.append( { "category": category, "accuracy": round( sum(values) / len(values), 1 ) } )

    category_accuracy.sort( key=lambda x: x["accuracy"], reverse=True )

    # --------------------------------------------------------
    # Recent forecast runs
    # --------------------------------------------------------

    runs = ( database.query(db.ForecastRun) .order_by( db.ForecastRun.created_at.desc() ) .limit(5) .all() )

    recent_forecast_runs = [

        {
            "forecast_name": run.forecast_name,
            "horizon": run.horizon,
            "start_date": ( run.start_date.isoformat() if run.start_date else None ),
            "accuracy": round( run.accuracy or 0, 1 ),
            "status": run.status
        }
        for run in runs
    ]

    # --------------------------------------------------------
    # Demand plans
    # --------------------------------------------------------

    plans = ( database.query(db.DemandPlan) .order_by( db.DemandPlan.created_at.desc() ) .limit(10) .all() )

    demand_plans = [
        {
            "plan_name": plan.plan_name,
            "time_horizon": plan.time_horizon,
            "total_demand": plan.total_demand,
            "planned_orders": plan.planned_orders,
            "inventory_required": plan.inventory_required,
            "service_level_target": plan.service_level_target,
            "created_by": plan.created_by,
            "last_updated":
                plan.last_updated.strftime( "%b %d, %Y" )
                if plan.last_updated
                else "",
            "status": plan.status
        }
        for plan in plans
    ]

    # --------------------------------------------------------
    # Insights
    # --------------------------------------------------------

    insights = []

    if top_products:
        insights.append(
            {
                "type": "high", "text": f"High demand expected for {top_products[0]['product']}."
            }
        )

    if len(top_products) >= 2:
        insights.append(
            {
                "type": "growth", "text": f"{top_products[1]['product']} shows consistent demand." 
            }
        )

    if category_demand:
        insights.append(
            {
                "type": "inventory", "text": f"Consider increasing inventory for {category_demand[0]['category']}."
            }
        )

    if months:
        insights.append( { "type": "seasonal", "text": "Review seasonal demand patterns " "before the next planning cycle." } )

    return {
        "total_demand": total_demand,
        "demand_change_percent": 0,
        "forecast_accuracy": round( forecast_accuracy, 1 ),
        "accuracy_change_percent": 0,
        "planned_orders": int( planned_orders or 0 ),
        "planned_orders_change_percent": 0,
        "planning_horizon": planning_horizon,
        "months": months,
        "forecast_values": forecast_values,
        "actual_values": actual_values,
        "category_demand": category_demand,
        "top_products": top_products,
        "category_accuracy": category_accuracy,
        "recent_forecast_runs": recent_forecast_runs,
        "insights": insights,
        "demand_plans": demand_plans
    }


# ============================================================
# CREATE FORECAST RUN
# ============================================================

@app.post("/api/demand-planning/forecast-runs", tags=["Supply Chain Dashboard"])
def create_forecast_run( data: dict, database: Session = Depends(db.get_db) ):

    run = db.ForecastRun(
        forecast_name=data["forecast_name"],
        horizon=data.get( "horizon", "12 Weeks" ),
        start_date=data.get( "start_date", date.today() ),
        accuracy=data.get( "accuracy", 0 ),
        status=data.get( "status", "Completed" ),
        created_by=data.get( "created_by" )
    )

    database.add(run)
    database.commit()
    database.refresh(run)

    return { "message": "Forecast run created", "id": run.id }


# ============================================================
# CREATE DEMAND PLAN
# ============================================================

@app.post("/api/demand-planning/plans", tags=["Supply Chain Dashboard"])
def create_demand_plan( data: dict, database: Session = Depends(db.get_db) ):

    plan = db.DemandPlan(
        plan_name=data["plan_name"],
        time_horizon=data.get( "time_horizon", "12 Weeks" ),
        start_date=data["start_date"],
        end_date=data["end_date"],
        total_demand=data.get( "total_demand", 0 ),
        planned_orders=data.get( "planned_orders", 0 ),
        inventory_required=data.get( "inventory_required", 0 ),
        service_level_target=data.get( "service_level_target", 95 ),
        created_by=data.get( "created_by" ),
        status=data.get( "status", "Active" )
    )

    database.add(plan)
    database.commit()
    database.refresh(plan)

    return { "message": "Demand plan created", "id": plan.id }


# ============================================================
# FORECAST DATA
# ============================================================

@app.get("/api/demand-planning/forecasts", tags=["Supply Chain Dashboard"])
def get_forecasts( database: Session = Depends(db.get_db) ):

    rows = ( database.query(db.DemandForecast) .order_by( db.DemandForecast.period_start.asc() ) .all() )

    return [
        {
            "id": row.id,
            "item_code": row.item_code,
            "product_name": row.product_name,
            "category": row.category,
            "period_start": row.period_start.isoformat(),
            "period_label": row.period_label,
            "forecast_units": row.forecast_units,
            "actual_units": row.actual_units,
            "accuracy": row.accuracy
        }
        for row in rows
    ]


# ============================================================
# DASHBOARD
# ============================================================

@app.get("/api/supplychain/procurement/dashboard", tags=["Supply Chain Dashboard"])
def supplychain_procurement_dashboard( database: Session = Depends(db.get_db) ):

    total_prs = ( database.query( func.count(db.ProcurementRequest.id) ).scalar() or 0 )

    total_po_value = ( database.query( func.coalesce( func.sum(db.PurchaseOrder.amount), 0 ) ).scalar() or 0 )

    approved_pos = (
        database.query( func.count(db.PurchaseOrder.id) )
        .filter( db.PurchaseOrder.status == "Approved" ) .scalar() or 0
    )

    pending_approvals = (
        database.query( func.count(db.ProcurementRequest.id) )
        .filter( db.ProcurementRequest.status == "Pending Approval" ) .scalar() or 0
    )

    # --------------------------------------------------------
    # PO STATUS
    # --------------------------------------------------------

    status_rows = (
        database.query( db.PurchaseOrder.status, func.count(db.PurchaseOrder.id) )
        .group_by( db.PurchaseOrder.status ) .all()
    )

    po_status = [
        { "status": row[0], "count": row[1] }
        for row in status_rows
    ]

    # --------------------------------------------------------
    # RECENT PURCHASE ORDERS
    # --------------------------------------------------------

    recent_pos = ( database.query( db.PurchaseOrder ) .order_by( db.PurchaseOrder.id.desc() ) .limit(5) .all() )

    recent_purchase_orders = []

    for po in recent_pos:
        vendor_name = "Unknown Vendor"
        if po.vendor:
            vendor_name = (
                getattr( po.vendor, "vendor_name", None )
                or getattr( po.vendor, "company_name", None )
                or "Unknown Vendor"
            )

        recent_purchase_orders.append({
            "id": po.id,
            "po_number": po.po_number,
            "pr_number": po.pr_number,
            "vendor": vendor_name,
            "order_date": (
                po.order_date.isoformat()
                if po.order_date
                else None
            ),
            "status": po.status,
            "amount": float( po.amount or 0 )
        })

    # --------------------------------------------------------
    # PENDING APPROVALS
    # --------------------------------------------------------

    pending = (
        database.query( db.ProcurementRequest )
        .filter( db.ProcurementRequest.status == "Pending Approval" )
        .order_by( db.ProcurementRequest.id.desc() ) .limit(5) .all()
    )

    pending_list = []

    for pr in pending:
        pending_list.append({
            "id": pr.id,
            "pr_number": pr.request_number,
            "requester": pr.requester,
            "amount": float( pr.amount or 0 ),
            "category": pr.category,
            "department": pr.department,
            "priority": pr.priority,
            "created_at": (
                pr.created_at.isoformat()
                if pr.created_at
                else None
            )
        })

    # --------------------------------------------------------
    # MONTHLY SPEND
    # --------------------------------------------------------

    monthly_rows = (
        database.query(
            extract( "month", db.PurchaseOrder.order_date ),
            func.coalesce( func.sum( db.PurchaseOrder.amount ), 0 )
        )
        .filter( db.PurchaseOrder.order_date.isnot(None) )
        .group_by( extract( "month", db.PurchaseOrder.order_date ) )
        .order_by( extract( "month", db.PurchaseOrder.order_date ) ) .all()
    )

    monthly_spend = [
        { "month": int(row[0]), "amount": float(row[1]) }
        for row in monthly_rows
    ]

    # --------------------------------------------------------
    # CATEGORY SPENDING
    # --------------------------------------------------------

    category_rows = (
        database.query(
            db.ProcurementRequest.category,
            func.coalesce( func.sum( db.ProcurementRequest.amount ), 0 )
        )
        .filter( db.ProcurementRequest.category .isnot(None) )
        .group_by( db.ProcurementRequest.category )
        .order_by( func.sum( db.ProcurementRequest.amount ).desc() )
        .limit(10) .all()
    )

    categories = [
        { "category": row[0], "amount": float(row[1]) }
        for row in category_rows
    ]

    # --------------------------------------------------------
    # PURCHASE REQUISITIONS
    # --------------------------------------------------------

    prs = ( database.query( db.ProcurementRequest ) .order_by( db.ProcurementRequest.id.desc() ) .limit(10) .all() )

    requisitions = []

    for pr in prs:
        requisitions.append({
            "id": pr.id,
            "pr_number": pr.request_number,
            "requester": pr.requester,
            "department": pr.department,
            "category": pr.category,
            "pr_date": (
                    pr.created_at.isoformat()
                    if pr.created_at
                    else None
                ),
            "required_date": (
                    pr.required_date.isoformat()
                    if pr.required_date
                    else None
                ),
            "priority": pr.priority,
            "status": pr.status,
            "total_value": float(pr.amount or 0)
        })

    return {
        "total_prs": total_prs,
        "total_po_value": float(total_po_value),
        "approved_pos": approved_pos,
        "pending_approvals": pending_approvals,
        "po_status": po_status,
        "recent_purchase_orders": recent_purchase_orders,
        "pending_approvals_list": pending_list,
        "monthly_spend": monthly_spend,
        "categories": categories,
        "requisitions": requisitions
    }


# ============================================================
# GET PURCHASE REQUISITIONS
# ============================================================

@app.get("/api/supplychain/procurement/requisitions", tags=["Supply Chain Dashboard"])
def get_requisitions( search: Optional[str] = None, status: Optional[str] = None, database: Session = Depends(db.get_db) ):

    query = database.query( db.ProcurementRequest )

    if search:
        search_value = ( f"%{search}%" )
        query = query.filter(
            db.ProcurementRequest.request_number.ilike( search_value )
            |
            db.ProcurementRequest.requester.ilike( search_value )
            |
            db.ProcurementRequest.category.ilike( search_value )
        )

    if status:
        query = query.filter( db.ProcurementRequest.status == status )

    return query.order_by( db.ProcurementRequest.id.desc() ).all()


# ============================================================
# CREATE PURCHASE REQUISITION
# ============================================================

@app.post("/api/supplychain/procurement/requisitions", tags=["Supply Chain Dashboard"])
def create_requisition( data: db.ProcurementRequestCreate, database: Session = Depends(db.get_db) ):

    pr_number = crud.generate_pr_number( database )

    pr = db.ProcurementRequest(
        request_number=pr_number,
        requester=data.requester,
        department=data.department,
        category=data.category,
        description=data.description,
        amount=data.amount,
        required_date=data.required_date,
        priority=data.priority,
        status="Pending Approval"
    )

    database.add(pr)

    database.commit()

    database.refresh(pr)

    return pr


# ============================================================
# UPDATE PR STATUS
# ============================================================

@app.patch( "/api/supplychain/procurement/requisitions/{pr_id}/status", tags=["Supply Chain Dashboard"])
def update_requisition_status( pr_id: int, status: str, database: Session = Depends(db.get_db) ):

    pr = ( database.query( db.ProcurementRequest ) .filter( db.ProcurementRequest.id == pr_id ) .first() )

    if not pr:
        raise HTTPException( status_code=404, detail="Purchase requisition not found" )

    pr.status = status

    if status == "Approved":
        pr.approved_at = datetime.utcnow()

    database.commit()

    database.refresh(pr)

    return { "message": "Purchase requisition updated", "status": pr.status }


# ============================================================
# PURCHASE ORDERS
# ============================================================

@app.get("/api/supplychain/procurement/purchase-orders", tags=["Supply Chain Dashboard"])
def supply_get_purchase_orders( database: Session = Depends(db.get_db) ):

    return ( database.query( db.PurchaseOrder ) .order_by( db.PurchaseOrder.id.desc() ) .all() )


# ============================================================
# CREATE PURCHASE ORDER
# ============================================================

@app.post("/api/supplychain/procurement/purchase-orders", tags=["Supply Chain Dashboard"])
def supply_chain_create_purchase_order( data: db.PurchaseOrderCreate, database: Session = Depends(db.get_db) ):

    po = db.PurchaseOrder(
        po_number=data.po_number,
        pr_id=data.pr_id,
        pr_number=data.pr_number,
        vendor_id=data.vendor_id,
        amount=data.amount,
        status=data.status,
        order_date=data.order_date,
        expected_delivery= data.expected_delivery,
        actual_delivery= data.actual_delivery
    )

    database.add(po)

    database.commit()

    database.refresh(po)

    return po


# ============================================================
# DASHBOARD
# ============================================================

@app.get( "/api/suppliers/dashboard", tags=["Supply Chain Dashboard"] )
def supplier_dashboard( database: Session = Depends(db.get_db) ):

    today = date.today()

    year = today.year

    month = today.month


    # --------------------------------------------------------
    # TOTAL
    # --------------------------------------------------------

    total = database.query( func.count(db.Vendor.id) ).scalar() or 0


    # --------------------------------------------------------
    # ACTIVE
    # --------------------------------------------------------

    active = database.query( func.count(db.Vendor.id) ).filter( func.lower( db.Vendor.status ) == "active" ).scalar() or 0


    # --------------------------------------------------------
    # AT RISK
    # --------------------------------------------------------

    at_risk = database.query( func.count(db.Vendor.id) ).filter(
            func.lower( db.Vendor.status ).in_( [ "at risk", "risk", "critical" ] )
        ).scalar() or 0


    # --------------------------------------------------------
    # NEW THIS MONTH
    # --------------------------------------------------------

    new_this_month = 0

    if hasattr( db.Vendor, "created_at" ):

        new_this_month = database.query( func.count( db.Vendor.id ) ).filter(
                func.extract( "year", db.Vendor.created_at ) == year,
                func.extract( "month", db.Vendor.created_at ) == month
            ).scalar() or 0


    # --------------------------------------------------------
    # YTD SPEND
    # --------------------------------------------------------

    total_spend = database.query( func.coalesce( func.sum( db.PurchaseOrder.amount ), 0 )
        ).filter( func.extract( "year", db.PurchaseOrder.order_date ) == year ).scalar() or 0


    # --------------------------------------------------------
    # PERFORMANCE
    # --------------------------------------------------------

    performance_rows = ( database.query( db.VendorPerformanceHistory )
        .filter( db.VendorPerformanceHistory.year == year )
        .order_by( db.VendorPerformanceHistory.year, db.VendorPerformanceHistory.id ) .all()
    )


    months = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ]


    on_time = [
        0
        for _ in range(12)
    ]

    quality = [
        0
        for _ in range(12)
    ]

    compliance = [
        0
        for _ in range(12)
    ]


    month_map = {
        month_name.lower(): index
        for index, month_name
        in enumerate(months)
    }


    # Aggregate supplier performance
    monthly_count = [ 0 for _ in range(12) ]


    for row in performance_rows:
        month_index = None

        if row.month:
            month_index = month_map.get( row.month[:3].lower() )

        if month_index is None:
            continue

        on_time[ month_index ] += float( row.on_time_deliveries or 0 )

        quality[ month_index ] += float( row.quality_rating or 0 ) * 20

        compliance[ month_index ] += float( getattr( row, "compliance_score", 0 ) or 0 )

        monthly_count[ month_index ] += 1


    for i in range(12):

        if monthly_count[i]:

            on_time[i] = round( on_time[i] / monthly_count[i], 1 )

            quality[i] = round( quality[i] / monthly_count[i], 1 )

            compliance[i] = round( compliance[i] / monthly_count[i], 1 )


    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    status_rows = ( database.query( db.Vendor.status, func.count(db.Vendor.id) ) .group_by( db.Vendor.status ) .all() )


    status_data = []

    for status, count in status_rows:
        percentage = ( count / total * 100 ) if total else 0
        status_data.append(
            {
                "status": status or "Unknown",
                "count": count,
                "percentage": round( percentage, 1 )
            }
        )


    # --------------------------------------------------------
    # TOP SUPPLIERS
    # --------------------------------------------------------

    top_vendors = ( database.query(db.Vendor) .order_by( db.Vendor.reliability_score.desc() ) .limit(5) .all() )


    top_suppliers = []

    for vendor in top_vendors:
        top_suppliers.append(
            {
                "vendor_id": vendor.vendor_id,
                "vendor_name": vendor.vendor_name,
                "category": vendor.category,
                "score": float( vendor.reliability_score or 0 ),
                "trend": crud.parse_trend( vendor.trend )
            }
        )


    # --------------------------------------------------------
    # REGIONS
    # --------------------------------------------------------

    region_column = getattr( db.Vendor, "region", None )

    regions = []

    if region_column is not None:

        region_rows = (
            database.query( region_column, func.count( db.Vendor.id ) )
            .group_by( region_column ) 
            .order_by( func.count( db.Vendor.id ).desc() ) .all() 
        )

        regions = [
            { "region": region or "Unknown", "count": count }
            for region, count in region_rows
        ]


    # --------------------------------------------------------
    # SPEND BY CATEGORY
    # --------------------------------------------------------

    spend_rows = (
        database.query( 
            db.PurchaseOrder.category, 
            func.coalesce( func.sum( db.PurchaseOrder.amount ), 0 ) 
        )
        .filter( func.extract( "year", db.PurchaseOrder.order_date ) == year )
        .group_by( db.PurchaseOrder.category )
        .order_by( func.sum( db.PurchaseOrder.amount ).desc() ) .all()
    )


    spend = [
        { "category": category or "Uncategorized", "amount": float(amount or 0) }
        for category, amount in spend_rows
    ]


    # --------------------------------------------------------
    # ASSESSMENTS
    # --------------------------------------------------------

    assessment_rows = (
        database.query( db.SupplierAssessment, db.Vendor.vendor_name )
        .join( db.Vendor, db.Vendor.vendor_id == db.SupplierAssessment.vendor_id )
        .order_by( db.SupplierAssessment.assessment_date.desc() ) .limit(5) .all()
    )


    assessments = [
        {
            "vendor_name": vendor_name,
            "assessment_date": assessment.assessment_date,
            "score": float( assessment.score or 0 ),
            "status": assessment.status
        }
        for assessment, vendor_name in assessment_rows
    ]


    return {
        "kpis": {
            "total": total,
            "active": active,
            "at_risk": at_risk,
            "new_this_month": new_this_month,
            "total_spend": float(total_spend),
            "total_trend": 8.5,
            "active_trend": 7.2,
            "risk_trend": 20,
            "new_trend": 25,
            "spend_trend": 12.6
        },
        "filters": {
            "categories": crud.get_categories(database),
            "regions": crud.get_regions(database),
            "years": crud.get_years(database)
        },
        "performance": {
            "labels": months,
            "on_time": on_time,
            "quality": quality,
            "compliance": compliance
        },
        "status": status_data,
        "top_suppliers": top_suppliers,
        "regions": regions,
        "spend": spend,
        "assessments": assessments
    }


# ============================================================
# GET SUPPLIERS
# ============================================================

@app.get( "/api/suppliers", tags=["Supply Chain Dashboard"] )
def get_suppliers(
    search: Optional[str] = None,
    category: Optional[str] = None,
    region: Optional[str] = None,
    page: int = Query( 1, ge=1 ),
    page_size: int = Query( 5, ge=1, le=100 ),
    database: Session = Depends(db.get_db)
):

    query = database.query(db.Vendor)


    if search:

        search_value = f"%{search.strip()}%"

        query = query.filter(
                or_(
                    db.Vendor.vendor_name.ilike( search_value ),
                    db.Vendor.email.ilike( search_value ),
                    db.Vendor.contact_person.ilike( search_value ),
                    db.Vendor.vendor_id.ilike( search_value )
                )
            )


    if category:
        query = query.filter( db.Vendor.category == category )


    region_column =getattr(db.Vendor, "region", None )

    if ( region and region_column is not None ):
        query = query.filter( region_column == region )


    total = query.count()


    vendors = query.order_by( db.Vendor.vendor_name.asc()).offset((page - 1) * page_size ).limit( page_size ).all()


    results = []


    for vendor in vendors:

        latest = (
            database.query( db.VendorPerformanceHistory )
            .filter( db.VendorPerformanceHistory.vendor_id == vendor.vendor_id )
            .order_by(
                db.VendorPerformanceHistory.year.desc(),
                db.VendorPerformanceHistory.id.desc()
            ) .first()
        )


        on_time_delivery = 0

        quality_score = ( vendor.quality_score or 0 )

        performance_score = ( vendor.reliability_score or 0 )


        if latest:
            on_time_delivery = latest.on_time_deliveries or 0

            if not quality_score:
                quality_score = ( latest.quality_rating or 0 )


        results.append( crud.supplier_dict( vendor, on_time_delivery, quality_score, performance_score ) )


    return { "total": total, "page": page, "page_size": page_size, "suppliers": results }


# ============================================================
# GET SINGLE SUPPLIER
# ============================================================

@app.get( "/api/suppliers/{vendor_id}", tags=["Supply Chain Dashboard"] )
def get_supplier( vendor_id: str, database: Session = Depends(db.get_db) ):

    vendor = database.query( db.Vendor ).filter( db.Vendor.vendor_id == vendor_id ).first()


    if not vendor:
        raise HTTPException( status_code=404, detail="Supplier not found" )


    latest = ( database.query( db.VendorPerformanceHistory )
            .filter( db.VendorPerformanceHistory.vendor_id == vendor.vendor_id )
            .order_by(
                db.VendorPerformanceHistory.year.desc(),
                db.VendorPerformanceHistory.id.desc()
            ) .first()
        )


    on_time = 0

    quality = ( vendor.quality_score or 0 )


    if latest:
        on_time = latest.on_time_deliveries or 0

        if not quality:
            quality = latest.quality_rating or 0


    return crud.supplier_dict( vendor, on_time, quality, vendor.reliability_score or 0 )


# ============================================================
# CREATE SUPPLIER
# ============================================================

@app.post( "/api/suppliers", tags=["Supply Chain Dashboard"] )
def create_supplier( data: db.SupplierTableCreate, database: Session = Depends(db.get_db) ):

    existing_email = database.query( db.Vendor ).filter( db.Vendor.email == data.email ).first()


    if existing_email:
        raise HTTPException( status_code=400, detail="Email already exists" )


    existing_phone = None

    if data.phone:
        existing_phone = database.query( db.Vendor ).filter( db.Vendor.phone == data.phone ).first()


    if existing_phone:
        raise HTTPException( status_code=400, detail="Phone already exists" )


    last_vendor = database.query( db.Vendor ).order_by( db.Vendor.id.desc() ).first()


    if last_vendor:

        try:
            number = int( last_vendor.vendor_id .replace( "VND", "" ) ) + 1

        except ValueError:
            number = last_vendor.id + 1

    else:
        number = 1


    vendor_id = f"VND{number:07d}"


    vendor = db.Vendor(
            vendor_id= vendor_id,
            vendor_name= data.vendor_name,
            country= data.country,
            email= str(data.email),
            phone= data.phone,
            business_type= data.business_type,
            address= data.address,
            category= data.category,
            contact_person= data.contact_person,
            status= "Active",
            reliability_score= 0,
            quality_score= 0,
            delivery_score= 0,
            service_score= 0,
            contract_count= 0
        )


    if hasattr( vendor, "region" ):
        vendor.region = data.region


    database.add(vendor)

    database.commit()

    database.refresh(vendor)


    return {
        "message": "Supplier created successfully",
        "supplier": crud.supplier_dict( vendor )
    }


# ============================================================
# DELETE SUPPLIER
# ============================================================

@app.delete( "/api/suppliers/{vendor_id}", tags=["Supply Chain Dashboard"] )
def delete_supplier( vendor_id: str, database: Session = Depends(db.get_db) ):

    vendor = database.query( db.Vendor ).filter( db.Vendor.vendor_id == vendor_id ).first()


    if not vendor:
        raise HTTPException( status_code=404, detail="Supplier not found" )


    database.delete(vendor)

    database.commit()


    return { "message": "Supplier deleted successfully" }


# ============================================================
# EXPORT
# ============================================================

@app.get( "/api/suppliers/export", tags=["Supply Chain Dashboard"])
def export_suppliers( database: Session = Depends(db.get_db) ):

    vendors = database.query( db.Vendor ).order_by( db.Vendor.vendor_name ).all()


    return {
        "suppliers": [
            {
                "vendor_id": vendor.vendor_id,
                "vendor_name": vendor.vendor_name,
                "category": vendor.category,
                "region": getattr( vendor, "region", None ),
                "contact_person": vendor.contact_person,
                "email": vendor.email,
                "phone": vendor.phone,
                "status": vendor.status,
                "performance_score": vendor.reliability_score
            }
            for vendor in vendors
        ]
    }


# ============================================================
# INVENTORY DASHBOARD
# ============================================================

@app.get( "/api/inventory/dashboard", tags=["Supply Chain Dashboard"] )
def get_inventory_dashboard( database: Session = Depends(db.get_db) ):

    # =========================================================
    # LOAD INVENTORY ITEMS
    # =========================================================

    items = ( database .query(db.InventoryItem) .all() )

    print( f"[Inventory Dashboard] Inventory items: {len(items)}" )

    # =========================================================
    # BASIC INVENTORY CALCULATIONS
    # =========================================================

    total_value = 0.0
    total_items = 0

    for item in items:

        quantity = float( item.quantity or 0 )

        unit_price = float( item.unit_price or 0 )

        total_value += ( quantity * unit_price )

        total_items += int( quantity )

    # =========================================================
    # LOW STOCK / OUT OF STOCK
    # =========================================================

    low_stock = []
    out_of_stock = []

    for item in items:

        quantity = float( item.quantity or 0 )

        minimum_stock = float( item.minimum_stock or 0 )

        if quantity <= 0:
            out_of_stock.append(item)

        elif quantity <= minimum_stock:
            low_stock.append(item)

    # =========================================================
    # CATEGORY SUMMARY
    # =========================================================

    category_data = {}

    for item in items:

        category_name = ( item.category or "Uncategorized" )

        quantity = float( item.quantity or 0 )

        unit_price = float( item.unit_price or 0 )

        value = ( quantity * unit_price )

        if category_name not in category_data:
            category_data[category_name] = {
                "category": category_name,
                "value": 0.0,
                "items": 0,
                "quantity": 0
            }

        category_data[ category_name ]["value"] += value

        # Number of inventory records
        category_data[ category_name ]["items"] += 1

        # Total physical quantity
        category_data[ category_name ]["quantity"] += int(quantity)

    categories = list( category_data.values() )

    # =========================================================
    # CATEGORY PERCENTAGES
    # =========================================================

    for category in categories:

        category_value = float( category["value"] or 0 )

        if total_value > 0:
            percentage = ( category_value / total_value * 100 )

        else:
            percentage = 0

        category["percentage"] = round( percentage, 1 )

        # Keep value numeric.
        # JavaScript will format it as currency.
        category["value"] = round( category_value, 2 )

    # Sort categories by value
    categories.sort( key=lambda x: x["value"], reverse=True )

    print( "[Inventory Dashboard] Categories:", categories )

    # =========================================================
    # LOCATION SUMMARY
    # =========================================================

    location_data = {}

    for item in items:

        location_name = ( item.warehouse_id or "Unassigned" )

        quantity = float( item.quantity or 0 )

        unit_price = float( item.unit_price or 0 )

        minimum_stock = float( item.minimum_stock or 0 )

        value = ( quantity * unit_price )

        if location_name not in location_data:
            location_data[location_name] = {
                "location": location_name,
                "total_value": 0.0,
                "total_items": 0,
                "low_stock": 0,
                "out_of_stock": 0
            }

        location_data[ location_name ]["total_value"] += value

        location_data[ location_name ]["total_items"] += int( quantity )

        if quantity <= 0:
            location_data[ location_name ]["out_of_stock"] += 1

        elif quantity <= minimum_stock:
            location_data[ location_name ]["low_stock"] += 1

    locations = list( location_data.values() )

    for location in locations:
        location["total_value"] = round( float( location["total_value"] or 0 ), 2 )

    # Sort locations by inventory value
    locations.sort( key=lambda x: x["total_value"], reverse=True )

    # =========================================================
    # INVENTORY HEALTH
    # =========================================================

    healthy = 0
    at_risk = 0

    for item in items:
        quantity = float( item.quantity or 0 )

        minimum_stock = float( item.minimum_stock or 0 )

        if quantity <= 0:
            continue

        elif quantity <= minimum_stock:
            at_risk += 1

        else:
            healthy += 1

    health_total = ( healthy + at_risk + len(out_of_stock) )

    if health_total > 0:
        health_percentage = round( healthy / health_total * 100 )

    else:
        health_percentage = 0

    # =========================================================
    # TOP LOW STOCK ITEMS
    # =========================================================

    top_low_stock = sorted( low_stock, key=lambda item: ( float( item.quantity or 0 ) ) )[:10]

    low_stock_items = []

    for item in top_low_stock:
        reorder_point = getattr( item, "reorder_point", None )

        if reorder_point is None:
            reorder_point = ( item.minimum_stock or 0 )

        low_stock_items.append({
            "id": item.id,
            "item_code": ( item.item_code or "-" ),
            "item_name": ( item.item_name or "Unnamed Item" ),
            "category": ( item.category or "Uncategorized" ),
            "current_stock": ( item.quantity or 0 ),
            "reorder_point": ( reorder_point ),
            "status": "Low Stock"
        })

    # =========================================================
    # RECENT INVENTORY MOVEMENTS
    # =========================================================

    movements = ( database .query(db.InventoryMovement) .order_by( db.InventoryMovement .movement_date .desc() ) .limit(10) .all() )

    recent_movements = []

    for movement in movements:

        item = getattr( movement, "item", None )

        warehouse_name = None

        movement_warehouse = getattr( movement, "warehouse", None )

        if movement_warehouse:
            warehouse_name = getattr( movement_warehouse, "warehouse_name", None )

        if not warehouse_name and item:
            warehouse_name = getattr( item, "warehouse", None )

        movement_type = ( getattr( movement, "movement_type", None ) or "Unknown" )

        movement_date = getattr( movement, "movement_date", None )

        recent_movements.append({
            "date": (
                movement_date.isoformat()
                if movement_date
                else None
            ),
            "item": (
                item.item_name
                if item
                else "-"
            ),
            "type": movement_type,
            "quantity": ( movement.quantity or 0 ),
            "location": ( warehouse_name or "-" )
        })

    # =========================================================
    # CATEGORY CARDS
    # =========================================================

    category_cards = []

    for category in categories:
        category_cards.append({
            "category": ( category["category"] ),
            "value": ( category["value"] ),
            "items": ( category["items"] ),
            "quantity": ( category["quantity"] ),
            "percentage": ( category["percentage"] )
        })

    # =========================================================
    # KPI DATA
    # =========================================================

    kpis = {
        "total_inventory_value": round( total_value, 2 ),
        "total_items": ( total_items ),
        "low_stock_items": ( len(low_stock) ),
        "out_of_stock_items": ( len(out_of_stock) ),

        # Replace with your actual
        # turnover calculation later.
        "inventory_turnover": 0
    }

    # =========================================================
    # FINAL RESPONSE
    # =========================================================

    response = {
        "kpis": kpis,
        "health": {
            "percentage": health_percentage,
            "healthy": healthy,
            "low_stock": len(low_stock),
            "at_risk": at_risk,
            "out_of_stock": len(out_of_stock)
        },
        "categories": categories,
        "locations": locations,
        "low_stock_items": low_stock_items,
        "recent_movements": recent_movements,
        "category_cards": category_cards
    }

    print(
        "[Inventory Dashboard] "
        f"Total value: {total_value}"
    )

    print(
        "[Inventory Dashboard] "
        f"Total quantity: {total_items}"
    )

    print(
        "[Inventory Dashboard] "
        f"Categories returned: {len(categories)}"
    )

    return response


# ============================================================
# INVENTORY ITEMS
# ============================================================

@app.get("/api/inventory/items", tags=["Supply Chain Dashboard"])
def get_inventory_items(
    search: str | None = Query( default=None ),
    category: str | None = Query( default=None ),
    warehouse: str | None = Query( default=None ),
    status: str | None = Query( default=None ),
    database: Session = Depends(db.get_db)
):

    query = database.query( db.InventoryItem )

    if search:
        search_value = f"%{search}%"
        query = query.filter(
            ( db.InventoryItem.item_name.ilike( search_value ) )
            | ( db.InventoryItem.item_code.ilike( search_value ) )
        )

    if category:
        query = query.filter( db.InventoryItem.category == category )

    if warehouse:
        query = query.filter( db.InventoryItem.warehouse == warehouse )

    if status:
        query = query.filter( db.InventoryItem.status == status )

    items = query.order_by( db.InventoryItem.item_name ).all()

    return items


# ============================================================
# CREATE ITEM
# ============================================================

@app.post("/api/inventory/items", tags=["Supply Chain Dashboard"])
def create_inventory_item( payload: dict, database: Session = Depends(db.get_db) ):

    existing = ( database.query( db.InventoryItem ) .filter( db.InventoryItem.item_code == payload["item_code"] ) .first() )

    if existing:
        raise HTTPException( status_code=409, detail="Item code already exists." )

    item = db.InventoryItem(
        item_code=payload["item_code"],
        item_name=payload["item_name"],
        category=payload.get("category"),
        quantity=payload.get( "quantity", 0 ),
        minimum_stock=payload.get( "minimum_stock", 0 ),
        maximum_stock=payload.get( "maximum_stock", 0 ),
        unit_price=payload.get( "unit_price", 0 ),
        warehouse=payload.get( "warehouse" ),
        status=payload.get( "status", "Available" )
    )

    database.add(item)
    database.commit()
    database.refresh(item)

    return item


# ============================================================
# INVENTORY MOVEMENT
# ============================================================

@app.post("/api/inventory/movements", tags=["Supply Chain Dashboard"])
def create_inventory_movement( payload: dict, database: Session = Depends(db.get_db) ):

    item = ( database.query( db.InventoryItem ) .filter( db.InventoryItem.id == payload["item_id"] ) .first() )

    if not item:
        raise HTTPException( status_code=404, detail="Inventory item not found." )

    movement_type = payload[ "movement_type" ].strip().lower()

    quantity = int( payload["quantity"] )

    # --------------------------------------------------------
    # RECEIPT
    # --------------------------------------------------------

    if movement_type == "receipt":
        item.quantity += quantity

    # --------------------------------------------------------
    # ISSUE
    # --------------------------------------------------------

    elif movement_type == "issue":
        if quantity > item.quantity:
            raise HTTPException( status_code=400, detail="Insufficient stock." )
        item.quantity -= quantity

    # --------------------------------------------------------
    # ADJUSTMENT
    # --------------------------------------------------------

    elif movement_type == "adjustment":
        item.quantity = quantity

    else:
        raise HTTPException( status_code=400, detail=( "movement_type must be Receipt, Issue or Adjustment." ) )

    movement = db.InventoryMovement(
        item_id=item.id,
        warehouse_id=payload.get( "warehouse_id" ),
        movement_type=payload[ "movement_type" ],
        quantity=quantity,
        movement_date=(
            datetime.fromisoformat( payload["movement_date"] )
            if payload.get("movement_date")
            else datetime.utcnow()
        ),
        reference_number=payload.get( "reference_number" ),
        notes=payload.get( "notes" )
    )

    database.add(movement)

    item.updated_at = datetime.utcnow()

    database.commit()
    database.refresh(movement)

    return movement


@app.get("/api/inventory/snapshots", tags=["Supply Chain Dashboard"])
def get_inventory_snapshots( days: int = Query( default=30, ge=1, le=365 ), database: Session = Depends(db.get_db) ):

    start_date = ( date.today() - timedelta(days=days - 1) )

    snapshots = (
        database.query( db.InventorySnapshot )
        .filter( db.InventorySnapshot.snapshot_date >= start_date )
        .order_by( db.InventorySnapshot.snapshot_date ) .all()
    )

    return [
        {
            "date": snapshot.snapshot_date.isoformat(),
            "value": crud.money( snapshot.inventory_value ),
            "items": snapshot.total_items,
            "quantity": snapshot.total_quantity
        }
        for snapshot in snapshots
    ]


# ============================================================
# DASHBOARD
# ============================================================

@app.get("/api/orders-shipments/dashboard", tags=["Supply Chain Dashboard"])
def get_dashboard( database: Session = Depends(db.get_db) ):

    total_orders = database.query( db.CustomerOrder ).count()

    delivered_orders = database.query( db.CustomerOrder ).filter( db.CustomerOrder.status == "Delivered" ).count()

    pending_orders = database.query( db.CustomerOrder ).filter( db.CustomerOrder.status == "Pending" ).count()

    cancelled_orders = database.query( db.CustomerOrder ).filter( db.CustomerOrder.status == "Cancelled" ).count()

    total_shipments = database.query( db.Shipment ).count()

    in_transit_shipments = database.query( db.Shipment ).filter( db.Shipment.status == "In Transit" ).count()

    delivered_shipments = database.query( db.Shipment ).filter( db.Shipment.status == "Delivered" ).count()

    delayed_shipments = database.query( db.Shipment ).filter( db.Shipment.status == "Delayed" ).count()

    # --------------------------------------------------------
    # ORDERS BY STATUS
    # --------------------------------------------------------

    order_status_rows = (
        database.query( db.CustomerOrder.status, func.count(db.CustomerOrder.id) )
        .group_by( db.CustomerOrder.status ) .all()
    )

    orders_by_status = [
        { "status": status, "count": count }
        for status, count in order_status_rows
    ]

    # --------------------------------------------------------
    # SHIPMENTS BY STATUS
    # --------------------------------------------------------

    shipment_status_rows = (
        database.query( db.Shipment.status, func.count(db.Shipment.id) )
        .group_by( db.Shipment.status ) .all()
    )

    shipments_by_status = [
        { "status": status, "count": count }
        for status, count in shipment_status_rows
    ]

    # --------------------------------------------------------
    # RECENT ORDERS
    # --------------------------------------------------------

    recent_orders = ( database.query( db.CustomerOrder ) .order_by( db.CustomerOrder.order_date.desc() ) .limit(5) .all() )

    # --------------------------------------------------------
    # RECENT SHIPMENTS
    # --------------------------------------------------------

    recent_shipments = (
        database.query( db.Shipment ) .order_by( db.Shipment.created_at.desc() ) .limit(5) .all()
    )

    # --------------------------------------------------------
    # IN TRANSIT
    # --------------------------------------------------------

    transit_shipments = (
        database.query( db.Shipment ) .filter( db.Shipment.status == "In Transit" )
        .order_by( db.Shipment.expected_delivery.asc() ) .limit(10) .all()
    )

    # --------------------------------------------------------
    # NOTIFICATIONS
    # --------------------------------------------------------

    unread_notifications = database.query( db.Notification ).filter( db.Notification.status == "Unread" ).count()

    # --------------------------------------------------------
    # ORDER TREND
    # --------------------------------------------------------

    today = date.today()

    labels = []
    total_trend = []
    delivered_trend = []
    cancelled_trend = []

    for i in range(30, -1, -1):

        current_day = today - timedelta(days=i)

        next_day = current_day + timedelta(days=1)

        total_count = database.query( db.CustomerOrder ).filter(
            db.CustomerOrder.order_date >= current_day,
            db.CustomerOrder.order_date < next_day
        ).count()

        delivered_count = database.query( db.CustomerOrder ).filter(
            db.CustomerOrder.order_date >= current_day,
            db.CustomerOrder.order_date < next_day,
            db.CustomerOrder.status == "Delivered"
        ).count()

        cancelled_count = database.query( db.CustomerOrder ).filter(
            db.CustomerOrder.order_date >= current_day,
            db.CustomerOrder.order_date < next_day,
            db.CustomerOrder.status == "Cancelled"
        ).count()

        labels.append( current_day.strftime("%b %d") )

        total_trend.append(total_count)

        delivered_trend.append( delivered_count )

        cancelled_trend.append( cancelled_count )

    return {
        "kpis": {
            "total_orders": total_orders,
            "delivered_orders": delivered_orders,
            "pending_orders": pending_orders,
            "cancelled_orders": cancelled_orders,
            "total_shipments": total_shipments,
            "in_transit_shipments": in_transit_shipments,
            "delivered_shipments": delivered_shipments,
            "delayed_shipments": delayed_shipments
        },

        "order_trend": {
            "labels": labels,
            "total_orders": total_trend,
            "delivered_orders": delivered_trend,
            "cancelled_orders": cancelled_trend
        },

        "orders_by_status": orders_by_status,

        "shipments_by_status": shipments_by_status,

        "recent_orders": [
            crud.serialize_order(order)
            for order in recent_orders
        ],

        "recent_shipments": [
            crud.serialize_shipment(shipment)
            for shipment in recent_shipments
        ],

        "in_transit_shipments": [
            crud.serialize_shipment(shipment)
            for shipment in transit_shipments
        ],

        "unread_notifications": unread_notifications
    }


# ============================================================
# SEARCH
# ============================================================

@app.get("/api/orders-shipments/search", tags=["Supply Chain Dashboard"])
def search_orders( q: str = Query(""), database: Session = Depends(db.get_db) ):

    keyword = f"%{q.lower()}%"
    orders = (
        database.query( db.CustomerOrder ) .join( db.Customer )
        .filter(
            func.lower( db.CustomerOrder.order_number ).like(keyword)
            |
            func.lower( db.Customer.customer_name ).like(keyword)
        )
        .order_by( db.CustomerOrder.order_date.desc() ) .limit(50) .all()
    )

    return [
        crud.serialize_order(order)
        for order in orders
    ]


# ============================================================
# ORDER DETAILS
# ============================================================

@app.get("/api/orders-shipments/orders/{order_id}", tags=["Supply Chain Dashboard"])
def get_order( order_id: int, database: Session = Depends(db.get_db) ):

    order = ( database.query( db.CustomerOrder ) .filter( db.CustomerOrder.id == order_id ) .first() )

    if not order:
        raise HTTPException( status_code=404, detail="Order not found" )

    return crud.serialize_order(order)


# ============================================================
# SHIPMENT DETAILS
# ============================================================

@app.get("/api/orders-shipments/shipments/{shipment_id}", tags=["Supply Chain Dashboard"])
def get_shipment( shipment_id: int, database: Session = Depends(db.get_db) ):

    shipment = ( database.query( db.Shipment ) .filter( db.Shipment.id == shipment_id ) .first() )

    if not shipment:
        raise HTTPException( status_code=404, detail="Shipment not found" )

    return crud.serialize_shipment(shipment)


@app.get("/api/warehouses", tags=["Supply Chain Dashboard"])
def get_warehouses(
    database: Session = Depends(db.get_db)
):

    warehouses = (
        database.query(db.Warehouse)
        .order_by(db.Warehouse.warehouse_name)
        .all()
    )

    return [
        {
            "id": warehouse.id,
            "warehouse_name": warehouse.warehouse_name,
            "warehouse_code": warehouse.warehouse_code
        }
        for warehouse in warehouses
    ]


@app.get("/api/supply-chain/warehouses/dashboard", tags=["Supply Chain Dashboard"])
def warehouse_dashboard( database: Session = Depends(db.get_db) ):

    warehouses = (
        database.query(db.Warehouse) .filter(db.Warehouse.status == "Active")
        .order_by(db.Warehouse.warehouse_name) .all()
    )

    total_warehouses = len(warehouses)

    total_capacity = sum( float(w.capacity_sq_ft or 0)
        for w in warehouses
    )

    latest_metrics = []

    for warehouse in warehouses:
        metric = (
            database.query(db.WarehouseMetric)
            .filter( db.WarehouseMetric.warehouse_id == warehouse.id )
            .order_by( desc(db.WarehouseMetric.metric_date) ) .first()
        )

        latest_metrics.append(
            {
                "warehouse_id": warehouse.id,
                "warehouse_code": warehouse.warehouse_code,
                "warehouse_name": warehouse.warehouse_name,
                "location": warehouse.location,
                "manager_name": warehouse.manager_name,
                "capacity": float( warehouse.capacity_sq_ft or 0 ),
                "latitude": warehouse.latitude,
                "longitude": warehouse.longitude,
                "utilization": float( metric.utilization_rate
                    if metric else 0
                ),
                "inventory_value": float( metric.inventory_value
                    if metric else 0
                ),
                "turnover_rate": float( metric.turnover_rate
                    if metric else 0
                ),
                "health_score": float( metric.health_score
                    if metric else 0
                ),
                "health_status": ( metric.health_status
                    if metric
                    else "Healthy"
                )
            }
        )

    total_inventory_value = sum( x["inventory_value"]
        for x in latest_metrics
    )

    avg_utilization = (
        sum(x["utilization"] for x in latest_metrics) / total_warehouses
        if total_warehouses
        else 0
    )

    avg_turnover = (
        sum(x["turnover_rate"] for x in latest_metrics) / total_warehouses
        if total_warehouses
        else 0
    )

    avg_health = (
        sum(x["health_score"] for x in latest_metrics) / total_warehouses
        if total_warehouses
        else 0
    )

    health = { "healthy": 0, "at_risk": 0, "critical": 0 }

    utilization = { "above_90": 0, "70_90": 0, "40_70": 0, "below_40": 0 }

    for warehouse in latest_metrics:

        status = warehouse["health_status"]

        if status == "Healthy":
            health["healthy"] += 1

        elif status == "At Risk":
            health["at_risk"] += 1

        elif status == "Critical":
            health["critical"] += 1

        rate = warehouse["utilization"]

        if rate > 90:
            utilization["above_90"] += 1

        elif rate >= 70:
            utilization["70_90"] += 1

        elif rate >= 40:
            utilization["40_70"] += 1

        else:
            utilization["below_40"] += 1

    alerts = (
        database.query(db.WarehouseAlert, db.Warehouse)
        .join( db.Warehouse, db.Warehouse.id == db.WarehouseAlert.warehouse_id )
        .filter( db.WarehouseAlert.status == "Open" )
        .order_by( desc(db.WarehouseAlert.created_at) ) .limit(10) .all()
    )

    alert_data = []

    for alert, warehouse in alerts:
        alert_data.append(
            {
                "id": alert.id,
                "warehouse": warehouse.warehouse_name,
                "title": alert.title,
                "message": alert.message,
                "severity": alert.severity,
                "created_at": alert.created_at
            }
        )

    activities = (
        database.query( db.WarehouseActivity, db.Warehouse )
        .join( db.Warehouse, db.Warehouse.id == db.WarehouseActivity.warehouse_id )
        .order_by( desc(db.WarehouseActivity.created_at) ) .limit(10) .all()
    )

    activity_data = []

    for activity, warehouse in activities:

        activity_data.append(
            {
                "warehouse": warehouse.warehouse_name,
                "activity_type": activity.activity_type,
                "title": activity.title,
                "reference_number": activity.reference_number,
                "quantity": activity.quantity,
                "created_at": activity.created_at
            }
        )

    return {
        "kpis": {
            "total_warehouses": total_warehouses,
            "total_capacity": total_capacity,
            "utilization_rate": round( avg_utilization, 2 ),
            "inventory_value": round( total_inventory_value, 2 ),
            "turnover_rate": round( avg_turnover, 2 ),
            "health_score": round( avg_health, 2 )
        },
        "utilization": utilization,
        "health": health,
        "warehouses": latest_metrics,
        "alerts": alert_data,
        "activities": activity_data
    }


@app.get("/api/supply-chain/transportation/dashboard", tags=["Supply Chain Dashboard"])
def transportation_dashboard(database: Session = Depends(db.get_db)):

    # ========================================================
    # KPI + ON-TIME AGGREGATES — ONE QUERY, NO PYTHON LOOPS
    # ========================================================
    on_time_condition = and_(
        db.Shipment.actual_delivery.isnot(None),
        db.Shipment.expected_delivery.isnot(None),
        db.Shipment.actual_delivery <= db.Shipment.expected_delivery,
    )
    completed_condition = and_(
        db.Shipment.actual_delivery.isnot(None),
        db.Shipment.expected_delivery.isnot(None),
    )

    (
        total_shipments,
        total_distance,
        total_cost,
        total_fuel_cost,
        total_fuel,
        toll_charges,
        handling_charges,
        other_charges,
        completed_count,
        on_time_count,
    ) = database.query(
        func.count(db.Shipment.id),
        func.coalesce(func.sum(db.Shipment.distance_km), 0),
        func.coalesce(func.sum(db.Shipment.transportation_cost), 0),
        func.coalesce(func.sum(db.Shipment.fuel_cost), 0),
        func.coalesce(func.sum(db.Shipment.fuel_consumed_liters), 0),
        func.coalesce(func.sum(db.Shipment.toll_charges), 0),
        func.coalesce(func.sum(db.Shipment.handling_charges), 0),
        func.coalesce(func.sum(db.Shipment.other_charges), 0),
        func.sum(case((completed_condition, 1), else_=0)),
        func.sum(case((on_time_condition, 1), else_=0)),
    ).one()

    total_distance = float(total_distance)
    total_cost = float(total_cost)
    total_fuel_cost = float(total_fuel_cost)
    total_fuel = float(total_fuel)
    toll_charges = float(toll_charges)
    handling_charges = float(handling_charges)
    other_charges = float(other_charges)
    completed_count = completed_count or 0
    on_time_count = on_time_count or 0

    on_time_percentage = (
        (on_time_count / completed_count) * 100
        if completed_count
        else 0
    )

    fuel_efficiency = (
        total_distance / total_fuel
        if total_fuel > 0
        else 0
    )

    freight_charges = total_cost - (
        total_fuel_cost + toll_charges + handling_charges + other_charges
    )

    # ========================================================
    # STATUS / MODE COUNTS — SQL GROUP BY
    # ========================================================
    status_rows = (
        database.query(
            func.coalesce(db.Shipment.status, "Pending").label("status"),
            func.count(db.Shipment.id),
        )
        .group_by("status")
        .all()
    )
    shipments_by_status = [
        {"status": s, "count": c} for s, c in status_rows
    ]

    mode_rows = (
        database.query(
            func.coalesce(db.Shipment.transport_mode, "Road").label("mode"),
            func.count(db.Shipment.id),
        )
        .group_by("mode")
        .all()
    )
    shipments_by_mode = [
        {"mode": m, "count": c} for m, c in mode_rows
    ]

    # ========================================================
    # RECENT SHIPMENTS — eager-loaded, no per-row queries
    # ========================================================
    recent = (
        database.query(db.Shipment)
        .options(
            joinedload(db.Shipment.carrier),
            joinedload(db.Shipment.customer_order),
        )
        .order_by(db.Shipment.created_at.desc())
        .limit(6)
        .all()
    )

    recent_shipments = [
        {
            "shipment_number": s.shipment_number,
            "order_number": s.customer_order.order_number if s.customer_order else None,
            "origin": s.origin,
            "destination": s.destination,
            "carrier": s.carrier.carrier_name if s.carrier else None,
            "mode": s.transport_mode,
            "status": s.status,
            "expected_delivery": s.expected_delivery,
            "tracking_number": s.tracking_number,
        }
        for s in recent
    ]

    # ========================================================
    # UPCOMING TRANSPORTS — eager-loaded
    # ========================================================
    upcoming = (
        database.query(db.Shipment)
        .options(
            joinedload(db.Shipment.carrier),
            joinedload(db.Shipment.customer_order),
        )
        .filter(db.Shipment.expected_delivery >= date.today())
        .order_by(db.Shipment.expected_delivery.asc())
        .limit(5)
        .all()
    )

    upcoming_transports = [
        {
            "shipment_number": s.shipment_number,
            "order_number": s.customer_order.order_number if s.customer_order else None,
            "origin": s.origin,
            "destination": s.destination,
            "carrier": s.carrier.carrier_name if s.carrier else None,
            "mode": s.transport_mode,
            "scheduled_date": s.shipped_date,
            "eta": s.expected_delivery,
            "status": s.status,
        }
        for s in upcoming
    ]

    # ========================================================
    # CARRIER PERFORMANCE — SQL GROUP BY instead of O(n*m) loop
    # ========================================================
    carrier_rows = (
        database.query(
            db.Carrier.carrier_name,
            db.Carrier.damage_rate,
            db.Carrier.rating,
            func.count(db.Shipment.id).label("total"),
            func.sum(case((on_time_condition, 1), else_=0)).label("on_time"),
        )
        .outerjoin(db.Shipment, db.Shipment.carrier_id == db.Carrier.id)
        .filter(db.Carrier.status == "Active")
        .group_by(db.Carrier.id, db.Carrier.carrier_name, db.Carrier.damage_rate, db.Carrier.rating)
        .order_by(db.Carrier.carrier_name)
        .all()
    )

    carrier_performance = []
    for carrier_name, damage_rate, rating, total, on_time in carrier_rows:
        total = total or 0
        on_time = on_time or 0
        on_time_rate = (on_time / total * 100) if total else 0

        carrier_performance.append({
            "carrier": carrier_name,
            "total_shipments": total,
            "on_time_delivery": round(on_time_rate, 1),
            "damage_rate": float(damage_rate or 0),
            "rating": float(rating or 0),
        })

    # ========================================================
    # TRACKING MAP — only rows that actually have coordinates
    # ========================================================
    map_rows = (
        database.query(db.Shipment)
        .filter(
            db.Shipment.current_latitude.isnot(None),
            db.Shipment.current_longitude.isnot(None),
        )
        .limit(200)
        .all()
    )

    tracking_map = [
        {
            "shipment_number": s.shipment_number,
            "status": s.status,
            "origin": s.origin,
            "destination": s.destination,
            "current_location": s.current_location,
            "current_latitude": s.current_latitude,
            "current_longitude": s.current_longitude,
            "origin_latitude": s.origin_latitude,
            "origin_longitude": s.origin_longitude,
            "destination_latitude": s.destination_latitude,
            "destination_longitude": s.destination_longitude,
        }
        for s in map_rows
    ]

    return {
        "kpis": {
            "total_shipments": total_shipments,
            "on_time_deliveries": round(on_time_percentage, 1),
            "total_distance": round(total_distance, 2),
            "transportation_cost": round(total_cost, 2),
            "fuel_efficiency": round(fuel_efficiency, 2),
        },
        "shipments_by_status": shipments_by_status,
        "shipments_by_mode": shipments_by_mode,
        "recent_shipments": recent_shipments,
        "upcoming_transports": upcoming_transports,
        "carrier_performance": carrier_performance,
        "tracking_map": tracking_map,
        "cost_breakdown": {
            "freight": round(freight_charges, 2),
            "fuel": round(total_fuel_cost, 2),
            "toll": round(toll_charges, 2),
            "handling": round(handling_charges, 2),
            "others": round(other_charges, 2),
        },
    }


# ============================================================
# DASHBOARD
# ============================================================

@app.get( "/api/analytics/dashboard", response_model=db.AnalyticsDashboardResponse, tags=["Supply Chain Dashboard"] )
def analytics_dashboard(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    database: Session = Depends(db.get_db)
):

    # --------------------------------------------------------
    # DEFAULT DATE RANGE
    # --------------------------------------------------------

    today = date.today()

    if end_date is None:
        end_date = today

    if start_date is None:
        start_date = end_date - timedelta(days=30)


    # ========================================================
    # SUMMARY
    # ========================================================

    total_revenue = (
        database.query( func.coalesce( func.sum(db.CustomerOrder.amount), 0 ) )
        .filter(
            db.CustomerOrder.order_date >= start_date,
            db.CustomerOrder.order_date <= end_date
        ) .scalar()
    )

    total_orders = (
        database.query( func.count(db.CustomerOrder.id) )
        .filter(
            db.CustomerOrder.order_date >= start_date,
            db.CustomerOrder.order_date <= end_date
        ) .scalar()
    )

    total_shipments = (
        database.query( func.count(db.Shipment.id) )
        .filter(
            db.Shipment.created_at >= datetime.combine( start_date, datetime.min.time() ),
            db.Shipment.created_at <= datetime.combine( end_date, datetime.max.time() )
        ) .scalar()
    )


    total_cost = (
        database.query(
            func.coalesce( func.sum(db.FinanceTransaction.amount), 0 )
        ) .filter(
            db.FinanceTransaction.transaction_type == "expense",
            db.FinanceTransaction.transaction_date >= start_date,
            db.FinanceTransaction.transaction_date <= end_date
        ) .scalar()
    )


    # ========================================================
    # INVENTORY VALUE
    # ========================================================

    inventory_value = (
        database.query(
            func.coalesce( func.sum( db.InventoryItem.quantity * db.InventoryItem.unit_price ), 0 )
        ) .scalar()
    )

    inventory_value = crud.safe_float(inventory_value)

    if inventory_value > 0:
        inventory_turnover = ( crud.safe_float(total_revenue) / inventory_value )
    else:
        inventory_turnover = 0


    summary = db.AnalyticsSummary(
        total_revenue=crud.safe_float(total_revenue),
        total_orders=int( total_orders or 0 ),
        total_shipments=int( total_shipments or 0 ),
        total_cost=crud.safe_float(total_cost),
        inventory_turnover=round( inventory_turnover, 2 ),
        revenue_change=0,
        orders_change=0,
        shipments_change=0,
        cost_change=0,
        turnover_change=0
    )


    # ========================================================
    # PERFORMANCE TREND
    # ========================================================

    trend_rows = (
        database.query(
            func.date_trunc( "month", db.CustomerOrder.order_date ).label("month"),
            func.coalesce( func.sum(db.CustomerOrder.amount), 0 ).label("revenue")
        ) .filter(
            db.CustomerOrder.order_date >= start_date,
            db.CustomerOrder.order_date <= end_date
        ) .group_by("month") .order_by("month") .all()
    )


    cost_rows = (
        database.query(
            func.date_trunc( "month", db.FinanceTransaction.transaction_date ).label("month"),
            func.coalesce( func.sum(db.FinanceTransaction.amount), 0 ).label("cost")
        ) .filter(
            db.FinanceTransaction.transaction_type == "expense",
            db.FinanceTransaction.transaction_date >= start_date,
            db.FinanceTransaction.transaction_date <= end_date
        ) .group_by("month") .order_by("month") .all()
    )


    cost_map = {
        row.month.strftime("%b %Y"): crud.safe_float(row.cost)
        for row in cost_rows
    }


    trend_labels = []

    trend_revenue = []

    trend_cost = []

    trend_profit = []


    for row in trend_rows:
        label = row.month.strftime("%b %Y")
        revenue = crud.safe_float(row.revenue)
        cost = cost_map.get( label, 0 )
        trend_labels.append(label)
        trend_revenue.append( round(revenue, 2) )
        trend_cost.append( round(cost, 2) )
        trend_profit.append( round(revenue - cost, 2) )


    trend = db.AnalyticsTrend(
        labels=trend_labels,
        revenue=trend_revenue,
        cost=trend_cost,
        profit=trend_profit
    )


    # ========================================================
    # COST BREAKDOWN
    # ========================================================

    cost_rows = (
        database.query(
            db.FinanceTransaction.category,
            func.coalesce( func.sum( db.FinanceTransaction.amount ), 0 ).label("amount")
        ) .filter(
            db.FinanceTransaction.transaction_type == "expense",
            db.FinanceTransaction.transaction_date >= start_date,
            db.FinanceTransaction.transaction_date <= end_date
        ) .group_by( db.FinanceTransaction.category )
        .order_by( func.sum( db.FinanceTransaction.amount ).desc() ) .all()
    )


    cost_total = sum(
        crud.safe_float(row.amount)
        for row in cost_rows
    )


    cost_breakdown = []

    for row in cost_rows:

        amount = crud.safe_float( row.amount )

        percentage = (
            (amount / cost_total) * 100
            if cost_total > 0
            else 0
        )

        cost_breakdown.append(
            db.CostBreakdownItem(
                category=row.category or "Other Costs",
                amount=round( amount, 2 ),
                percentage=round( percentage, 1 )
            )
        )


    # ========================================================
    # SERVICE LEVEL
    # ========================================================

    delivered_orders = (
        database.query( func.count(db.CustomerOrder.id) )
        .filter(
            db.CustomerOrder.order_date >= start_date,
            db.CustomerOrder.order_date <= end_date,
            db.CustomerOrder.actual_delivery.isnot(None)
        ) .scalar()
    )


    on_time_orders = (
        database.query( func.count(db.CustomerOrder.id) )
        .filter(
            db.CustomerOrder.order_date >= start_date,
            db.CustomerOrder.order_date <= end_date,
            db.CustomerOrder.actual_delivery.isnot(None),
            db.CustomerOrder.expected_delivery.isnot(None),
            db.CustomerOrder.actual_delivery <= db.CustomerOrder.expected_delivery
        ) .scalar()
    )


    service_level = (
        crud.safe_float(on_time_orders) / crud.safe_float(delivered_orders) * 100
        if delivered_orders
        else 0
    )


    service_level_data = db.ServiceLevelData(

        current=round( service_level, 1 ),

        labels=trend_labels,

        values=[
            round(service_level, 1)
            for _ in trend_labels
        ]
    )


    # ========================================================
    # ON-TIME PERFORMANCE
    # ========================================================

    shipment_total = (
        database.query( func.count(db.Shipment.id) )
        .filter(
            db.Shipment.created_at >= datetime.combine( start_date, datetime.min.time() ),
            db.Shipment.created_at <= datetime.combine( end_date, datetime.max.time() )
        ) .scalar()
    )


    shipment_on_time = (
        database.query( func.count(db.Shipment.id) )
        .filter(
            db.Shipment.created_at >= datetime.combine( start_date, datetime.min.time() ),
            db.Shipment.created_at <= datetime.combine( end_date, datetime.max.time() ),
            db.Shipment.actual_delivery.isnot(None),
            db.Shipment.expected_delivery.isnot(None),
            db.Shipment.actual_delivery <= db.Shipment.expected_delivery
        ) .scalar()
    )


    shipment_performance = (
        crud.safe_float(shipment_on_time) / crud.safe_float(shipment_total) * 100
        if shipment_total
        else 0
    )


    order_fulfillment = (
        crud.safe_float(
            database.query( func.count(db.CustomerOrder.id) )
            .filter(
                db.CustomerOrder.order_date >= start_date,
                db.CustomerOrder.order_date <= end_date,
                db.CustomerOrder.status.in_( [ "Completed", "Delivered", "Fulfilled" ] )
            ) .scalar() ) / crud.safe_float(total_orders) * 100

        if total_orders
        else 0
    )


    inventory_accuracy = 100.0

    perfect_order_rate = (
        service_level * 0.98
        if service_level
        else 0
    )


    performance = [
        db.PerformanceMetric(
            metric="On-Time Delivery",
            performance=round( service_level, 1 ),
            target=85,
            status="Achieved"
            if service_level >= 85
            else "Below Target"
        ),

        db.PerformanceMetric(
            metric="Order Fulfillment",
            performance=round( order_fulfillment, 1 ),
            target=90,
            status="Achieved"
            if order_fulfillment >= 90
            else "Below Target"
        ),

        db.PerformanceMetric(
            metric="Perfect Order Rate",
            performance=round( perfect_order_rate, 1 ),
            target=90,
            status="Achieved"
            if perfect_order_rate >= 90
            else "Below Target"
        ),

        db.PerformanceMetric(
            metric="On-Time Shipments",
            performance=round( shipment_performance, 1 ),
            target=85,
            status="Achieved"
            if shipment_performance >= 85
            else "Below Target"
        ),

        db.PerformanceMetric(
            metric="Inventory Accuracy",
            performance=inventory_accuracy,
            target=95,
            status="Achieved" )
    ]


    # ========================================================
    # TOP SUPPLIERS
    # ========================================================

    supplier_rows = (
        database.query(
            db.Vendor.vendor_name,
            func.coalesce( db.Vendor.delivery_score, 0 ).label( "delivery_score" ),
            func.coalesce( db.Vendor.quality_score, 0 ).label( "quality_score" ),
            func.count( db.PurchaseOrder.id ).label( "order_count" )
        )
        .outerjoin( db.PurchaseOrder, db.PurchaseOrder.vendor_id == db.Vendor.vendor_id )
        .group_by( db.Vendor.id, db.Vendor.vendor_name, db.Vendor.delivery_score, db.Vendor.quality_score )
        .order_by( func.coalesce( db.Vendor.delivery_score, 0 ).desc() ) .limit(5) .all()
    )


    suppliers = [

        db.SupplierPerformance(
            supplier=row.vendor_name,
            on_time_delivery=round( crud.safe_float( row.delivery_score ), 1 ),
            quality_score=round( crud.safe_float( row.quality_score ), 1 ),
            total_orders=int( row.order_count or 0 )
        )

        for row in supplier_rows
    ]


    # ========================================================
    # DEMAND VS SUPPLY
    # ========================================================

    demand_rows = (
        database.query(
            func.date_trunc( "month", db.DemandForecast.period_start ).label("month"),
            func.coalesce( func.sum( db.DemandForecast.forecast_units ), 0 ).label("demand")
        )
        .filter( db.DemandForecast.period_start >= start_date, db.DemandForecast.period_start <= end_date ) 
        .group_by("month") .order_by("month") .all()
    )


    supply_rows = (
        database.query(
            func.date_trunc( "month", db.DemandPlan.start_date ).label("month"),
            func.coalesce( func.sum( db.DemandPlanItem.planned_order_units ), 0 ).label("supply")
        )
        .join( db.DemandPlan, db.DemandPlan.id == db.DemandPlanItem.plan_id )
        .filter( db.DemandPlan.start_date >= start_date, db.DemandPlan.start_date <= end_date )
        .group_by("month") .order_by("month") .all()
    )


    supply_map = {
        row.month.strftime("%b %Y"): crud.safe_float(row.supply)
        for row in supply_rows
    }


    demand_supply = []


    for row in demand_rows:
        label = row.month.strftime( "%b %Y" )
        demand = crud.safe_float( row.demand )
        supply = supply_map.get( label, 0 )
        demand_supply.append(
            db.DemandSupplyPoint(
                label=label,
                demand=round( demand, 0 ),
                supply=round( supply, 0 ),
                gap=round( demand - supply, 0 )
            )
        )


    # ========================================================
    # INVENTORY ANALYSIS
    # ========================================================

    inventory_items = (
        database.query(
            db.InventoryItem.category,
            func.sum( db.InventoryItem.quantity * db.InventoryItem.unit_price ).label( "inventory_value" ),
            func.avg( db.InventoryItem.quantity ).label( "average_quantity" )
        )
        .group_by( db.InventoryItem.category ) .all()
    )


    total_inventory_value = sum(
        crud.safe_float(row.inventory_value)
        for row in inventory_items
    )


    inventory_categories = []


    for row in inventory_items:
        value = crud.safe_float( row.inventory_value )
        percentage = (
            value / total_inventory_value * 100
            if total_inventory_value > 0
            else 0
        )
        inventory_categories.append(
            db.InventoryCategory(
                category=row.category or "Uncategorized",
                inventory_value=round( value, 2 ),
                percentage=round( percentage, 1 ),
                turnover_rate=round( inventory_turnover, 2 )
            )
        )


    stockout_value = crud.safe_float(
        database.query( func.sum( db.InventoryItem.unit_price * db.InventoryItem.quantity ) )
        .filter( db.InventoryItem.quantity <= db.InventoryItem.minimum_stock ) .scalar()
    )


    slow_moving_items = int(
        database.query( func.count( db.InventoryItem.id ) )
        .filter(
            db.InventoryItem.quantity > 0,
            db.InventoryItem.quantity <= db.InventoryItem.reorder_point
        ) .scalar() or 0
    )


    excess_inventory = crud.safe_float(
        database.query(
            func.sum(
                ( db.InventoryItem.quantity - db.InventoryItem.maximum_stock )
                *
                db.InventoryItem.unit_price
            )
        )
        .filter( db.InventoryItem.quantity > db.InventoryItem.maximum_stock ) .scalar()
    )


    inventory = db.InventoryAnalysis(
        average_inventory_value=round( inventory_value, 2 ),
        stockout_value=round( stockout_value, 2 ),
        slow_moving_items= slow_moving_items,
        excess_inventory=round( excess_inventory, 2 ),
        categories= inventory_categories
    )


    # ========================================================
    # REPORT CENTER
    # ========================================================

    report_rows = ( database.query(db.Report) .order_by( db.Report.generated_at.desc() ) .limit(5) .all() )


    reports = [
        db.ReportItem(
            id=row.id,
            report_name=row.report_name,
            category=row.category,
            generated_by=row.generated_by,
            generated_at=(
                row.generated_at.isoformat()
                if row.generated_at
                else None
            ),
            format=row.format,
            file_path=row.file_path
        )
        for row in report_rows
    ]


    # ========================================================
    # INSIGHTS
    # ========================================================

    insights = []


    open_alerts = ( database.query(db.SystemAlert) .filter( db.SystemAlert.status == "Open" ) .order_by( db.SystemAlert.detected_at.desc() ) .limit(5) .all() )


    for alert in open_alerts:
        insights.append(
            db.InsightItem(
                title=alert.issue,
                description= alert.details or "Review this issue.",
                severity=alert.severity,
                action="View Details"
            )
        )


    if not insights:
        if inventory_turnover > 0:
            insights.append(
                db.InsightItem(
                    title= "Inventory turnover available",
                    description= f"Current inventory turnover is {inventory_turnover:.1f}x.",
                    severity="Info",
                    action="View Details"
                )
            )


        if service_level < 90:
            insights.append(
                db.InsightItem(
                    title= "Service level below target",
                    description= "Review late deliveries and fulfillment exceptions.",
                    severity="Warning",
                    action="View Details"
                )
            )


    return db.AnalyticsDashboardResponse(
        summary=summary,
        trend=trend,
        cost_breakdown=cost_breakdown,
        service_level=service_level_data,
        performance=performance,
        suppliers=suppliers,
        demand_supply=demand_supply,
        inventory=inventory,
        reports=reports,
        insights=insights
    )


# ============================================================
# DASHBOARD
# ============================================================

@app.get( "/api/alerts/dashboard", tags=["Supply Chain Dashboard"] )
def get_alerts_dashboard(
    user_id: int | None = None,
    database: Session = Depends(db.get_db),
    current_user=Depends(crud.get_current_user)
):

    # ---------------------------------------------------------
    # GET USER ID FROM AUTHENTICATED USER
    # ---------------------------------------------------------

    authenticated_user_id = None

    if current_user is not None:

        if isinstance(current_user, dict):
            authenticated_user_id = ( current_user.get("id") or current_user.get("user_id") or current_user.get("sub") )

        else:
            authenticated_user_id = ( getattr(current_user, "id", None) or getattr(current_user, "user_id", None) )

    # ---------------------------------------------------------
    # FALLBACK TO QUERY PARAMETER
    # ---------------------------------------------------------

    if authenticated_user_id is None and user_id is not None:
        authenticated_user_id = user_id

    # ---------------------------------------------------------
    # STILL NO USER ID
    # ---------------------------------------------------------

    if authenticated_user_id is None:

        raise HTTPException( status_code=401, detail="User ID not available" )

    try:
        authenticated_user_id = int( authenticated_user_id )

    except (TypeError, ValueError):
        raise HTTPException( status_code=401, detail="Invalid user ID" )

    # ---------------------------------------------------------
    # YOUR DASHBOARD CODE
    # ---------------------------------------------------------

    # Example:
    #
    # alerts = (
    #     database.query(Alert)
    #     .filter(Alert.user_id == authenticated_user_id)
    #     .all()
    # )

    return {
        "user_id": authenticated_user_id,
        "summary": {},
        "categories": [],
        "recent_activity": [],
        "alert_rules": [],
        "alerts": [],
        "notification_preferences": {}
    }


# ============================================================
# LIST ALERTS
# ============================================================

@app.get( "/api/alerts", response_model=list[db.AlertResponse], tags=["Supply Chain Dashboard"] )
def get_alerts(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    database: Session = Depends(db.get_db)
):

    query = database.query(db.Alert)

    if category and category != "All":
        query = query.filter( db.Alert.category == category )

    if priority and priority != "All":
        query = query.filter( db.Alert.priority == priority )

    if status and status != "All":
        query = query.filter( db.Alert.status == status )

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                db.Alert.title.ilike(term),
                db.Alert.message.ilike(term),
                db.Alert.reference_id.ilike(term)
            )
        )

    return ( query .order_by( db.Alert.created_at.desc() ) .limit(200) .all() )


# ============================================================
# CREATE ALERT
# ============================================================

@app.post( "/api/alerts", response_model=db.AlertResponse, tags=["Supply Chain Dashboard"] )
def create_alert( data: db.AlertCreate, database: Session = Depends(db.get_db) ):

    alert = db.Alert(
        title=data.title,
        message=data.message,
        category=data.category,
        source=data.source,
        reference_id=data.reference_id,
        priority=data.priority,
        status=data.status,
        rule_id=data.rule_id
    )

    database.add(alert)
    database.commit()
    database.refresh(alert)

    # --------------------------------------------------------
    # CREATE NOTIFICATION
    # --------------------------------------------------------

    notification = db.Notification(
        notification_type="Alert",
        title=data.title,
        message=data.message,
        category=data.category,
        priority=data.priority,
        channel="In-App",
        status="Unread",
        reference_id=data.reference_id
    )

    database.add(notification)

    database.commit()

    return alert


# ============================================================
# MARK ALERT AS READ / IN PROGRESS
# ============================================================

@app.patch( "/api/alerts/{alert_id}/progress", tags=["Supply Chain Dashboard"] )
def mark_alert_in_progress( alert_id: int, database: Session = Depends(db.get_db) ):

    alert = ( database.query(db.Alert) .filter( db.Alert.id == alert_id ) .first() )

    if not alert:
        raise HTTPException( status_code=404, detail="Alert not found" )

    alert.status = "In Progress"

    database.commit()

    return { "success": True, "status": alert.status }


# ============================================================
# RESOLVE
# ============================================================

@app.patch( "/api/alerts/{alert_id}/resolve", tags=["Supply Chain Dashboard"] )
def resolve_alert(
    alert_id: int,
    user_id: Optional[int] = None,
    database: Session = Depends(db.get_db)
):

    alert = ( database.query(db.Alert) .filter( db.Alert.id == alert_id ) .first() )

    if not alert:
        raise HTTPException( status_code=404, detail="Alert not found" )

    alert.status = "Resolved"
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = user_id

    database.commit()

    return { "success": True, "status": "Resolved" }


# ============================================================
# SNOOZE
# ============================================================

@app.patch( "/api/alerts/{alert_id}/snooze", tags=["Supply Chain Dashboard"] )
def snooze_alert(
    alert_id: int,
    minutes: int = Query( default=60, ge=5, le=10080 ),
    database: Session = Depends(db.get_db)
):

    alert = ( database.query(db.Alert) .filter( db.Alert.id == alert_id ) .first() )

    if not alert:
        raise HTTPException( status_code=404, detail="Alert not found" )

    alert.status = "Snoozed"

    alert.snoozed_until = ( datetime.utcnow() + timedelta(minutes=minutes) )

    database.commit()

    return {
        "success": True,
        "status": "Snoozed",
        "snoozed_until": alert.snoozed_until
    }


# ============================================================
# MARK ALL NOTIFICATIONS READ
# ============================================================

@app.patch( "/api/alerts/notifications/read-all", tags=["Supply Chain Dashboard"] )
def mark_all_notifications_read( database: Session = Depends(db.get_db) ):

    (
        database.query(db.Notification)
        .filter( db.Notification.status == "Unread" )
        .update( { db.Notification.status: "Read" }, synchronize_session=False )
    )

    database.commit()

    return { "success": True }


# ============================================================
# NOTIFICATION SETTINGS
# ============================================================

@app.get(
    "/api/alerts/settings/{user_id}",
    response_model=db.NotificationSettingsResponse, 
    tags=["Supply Chain Dashboard"]
)
def get_alert_settings( user_id: int, database: Session = Depends(db.get_db) ):

    return crud.get_notification_settings( database, user_id )


# ============================================================
# UPDATE NOTIFICATION SETTINGS
# ============================================================

@app.put( "/api/alerts/settings/{user_id}", tags=["Supply Chain Dashboard"] )
def update_settings( user_id: int, data: dict, database: Session = Depends(db.get_db) ):

    settings = crud.get_notification_settings( database, user_id )

    allowed_fields = [
        "email_enabled", "vendor_registration",
        "po_updates", "contract_expiration",
        "sms_enabled", "urgent_sms",
        "browser_notifications", "notification_sound"
    ]

    for field in allowed_fields:

        if field in data:
            setattr( settings, field, bool(data[field]) )

    database.commit()
    database.refresh(settings)

    return settings


# ============================================================
# ALERT RULES
# ============================================================

@app.get(
    "/api/alerts/rules",response_model=list[db.AlertRuleResponse],tags=["Supply Chain Dashboard"]
)
def get_alert_rules( database: Session = Depends(db.get_db) ):

    return ( database.query(db.AlertRule) .order_by( db.AlertRule.created_at.desc() ) .all() )


@app.post(
    "/api/alerts/rules",
    response_model=db.AlertRuleResponse, tags=["Supply Chain Dashboard"]
)
def create_alert_rule( data: db.AlertRuleCreate, database: Session = Depends(db.get_db) ):

    rule = db.AlertRule(
        rule_name=data.rule_name,
        category=data.category,
        condition=data.condition,
        priority=data.priority,
        status=data.status,
        description=data.description
    )

    database.add(rule)
    database.commit()
    database.refresh(rule)

    return rule


UPLOAD_DIRECTORY = Path("uploads/documents")


UPLOAD_DIRECTORY.mkdir( parents=True, exist_ok=True )


# ============================================================
# DASHBOARD
# ============================================================

@app.get("/api/documents/dashboard", tags=["Supply Chain Dashboard"])
def document_dashboard( database: Session = Depends(db.get_db) ):

    now = datetime.utcnow()

    today = date.today()

    expiry_limit = today + timedelta(days=30)

    total_documents = ( database.query( func.count(db.Document.id) ) .scalar() or 0 )

    total_folders = ( database.query( func.count(db.DocumentFolder.id) ) .scalar() or 0 )

    recently_added = (
        database.query( func.count(db.Document.id) )
        .filter( db.Document.uploaded_on >= now - timedelta(days=7) ) .scalar() or 0
    )

    pending_approvals = ( 
        database.query( func.count(db.DocumentApproval.id) ) 
        .filter( db.DocumentApproval.status == "Pending" ) .scalar() or 0 
    )

    expiring_soon = (
        database.query( func.count(db.Document.id) ) .filter(
            db.Document.expiry_date.isnot(None),
            db.Document.expiry_date >= today,
            db.Document.expiry_date <= expiry_limit
        ) .scalar() or 0
    )

    storage_used = ( database.query( func.coalesce( func.sum(db.Document.file_size), 0 ) ) .scalar() or 0 )

    # 10 GB

    storage_limit = 10 * 1024 * 1024 * 1024

    storage_available = max( storage_limit - storage_used, 0 )

    # ========================================================
    # CATEGORY COUNTS
    # ========================================================

    category_rows = (
        database.query( db.Document.category, func.count(db.Document.id) )
        .group_by( db.Document.category )
        .order_by( func.count(db.Document.id).desc() ) .all()
    )

    categories = [
        { "category": category or "Other", "count": count }
        for category, count in category_rows
    ]

    # ========================================================
    # DOCUMENTS
    # ========================================================

    document_rows = (
        database.query( db.Document, db.User.name )
        .outerjoin( db.User, db.User.id == db.Document.uploaded_by )
        .order_by( db.Document.uploaded_on.desc() ) .limit(100) .all()
    )

    documents = [
        crud.serialize_document( document, user_name )
        for document, user_name in document_rows
    ]

    # ========================================================
    # RECENT ACTIVITY
    # ========================================================

    activity_rows = (
        database.query( db.DocumentActivity, db.User.name )
        .outerjoin( db.User, db.User.id == db.DocumentActivity.user_id )
        .order_by( db.DocumentActivity.created_at.desc() ) .limit(10) .all()
    )

    recent_activity = [
        {
            "id": activity.id,
            "document_id": activity.document_id,
            "user_id": activity.user_id,
            "user_name": user_name,
            "action": activity.action,
            "message": activity.message,
            "created_at": activity.created_at
        }
        for activity, user_name in activity_rows
    ]

    # ========================================================
    # PENDING APPROVALS
    # ========================================================

    approval_rows = (
        database.query( db.DocumentApproval, db.Document.document_name, db.User.name )
        .join( db.Document, db.Document.id == db.DocumentApproval.document_id )
        .outerjoin( db.User, db.User.id == db.DocumentApproval.reviewer_id )
        .filter( db.DocumentApproval.status == "Pending" )
        .order_by( db.DocumentApproval.requested_at.desc() ) .limit(10) .all()
    )

    pending_documents = [
        {
            "id": approval.id,
            "document_id": approval.document_id,
            "document_name": document_name,
            "reviewer_id": approval.reviewer_id,
            "reviewer_name": reviewer_name,
            "status": approval.status,
            "comments": approval.comments,
            "requested_at": approval.requested_at,
            "reviewed_at": approval.reviewed_at
        }
        for approval, document_name, reviewer_name in approval_rows
    ]

    # ========================================================
    # EXPIRING DOCUMENTS
    # ========================================================

    expiring_rows = (
        database.query( db.Document, db.User.name )
        .outerjoin( db.User, db.User.id == db.Document.uploaded_by )
        .filter(
            db.Document.expiry_date.isnot(None),
            db.Document.expiry_date >= today,
            db.Document.expiry_date <= expiry_limit
        ) .order_by( db.Document.expiry_date.asc() ) .limit(10) .all()
    )

    expiring_documents = [
        crud.serialize_document( document, user_name )
        for document, user_name in expiring_rows
    ]

    return {
        "total_documents": total_documents,
        "total_folders": total_folders,
        "recently_added": recently_added,
        "pending_approvals": pending_approvals,
        "expiring_soon": expiring_soon,
        "storage_used": storage_used,
        "storage_limit": storage_limit,
        "storage_available": storage_available,
        "categories": categories,
        "documents": documents,
        "recent_activity": recent_activity,
        "pending_documents": pending_documents,
        "expiring_documents": expiring_documents
    }


# ============================================================
# SEARCH DOCUMENTS
# ============================================================

@app.get("/api/documents", tags=["Supply Chain Dashboard"])
def get_documents(
    search: str = "",
    category: str = "All",
    status: str = "All",
    database: Session = Depends(db.get_db)
):

    query = (
        database.query( db.Document, db.User.name )
        .outerjoin( db.User, db.User.id == db.Document.uploaded_by )
    )

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                db.Document.document_name.ilike( pattern ),
                db.Document.related_id.ilike( pattern ),
                db.Document.category.ilike( pattern )
            )
        )

    if category != "All":
        query = query.filter( db.Document.category == category )

    if status != "All":
        query = query.filter( db.Document.status == status )

    rows = ( query .order_by( db.Document.uploaded_on.desc() ) .all() )

    return [
        crud.serialize_document( document, user_name )
        for document, user_name in rows
    ]


# ============================================================
# DOWNLOAD
# ============================================================

@app.get("/api/documents/{document_id}/download", tags=["Supply Chain Manager"])
def download_document( document_id: int, database: Session = Depends(db.get_db) ):

    document = ( database.query(db.Document) .filter( db.Document.id == document_id ) .first() )

    if not document:
        raise HTTPException( status_code=404, detail="Document not found" )

    path = Path( document.file_path )

    if not path.exists():
        raise HTTPException( status_code=404, detail="Physical file not found" )

    return FileResponse(
        path=str(path),
        filename=document.document_name,
        media_type=document.mime_type or "application/octet-stream"
    )


# ============================================================
# UPLOAD
# ============================================================

@app.post( "/api/documents/upload", tags=["Supply Chain Dashboard"] )
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form(...),
    document_type: str = Form(default=""),
    document_title: str = Form(default=""),
    document_description: str = Form(default=""),
    related_type: str = Form(default=""),
    related_id: str = Form(default=""),
    business_unit: str = Form(default=""),
    tags: str = Form(default=""),
    confidentiality_level: str = Form( default="Internal" ),
    retention_period: str = Form(default=""),
    document_date: str = Form(default=""),
    folder_id: str = Form(default=""),
    expiry_date: str = Form(default=""),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user),
):

    uploaded_by: int = current_user.id

    # =========================================================
    # VALIDATE FILE
    # =========================================================

    if not file.filename:
        raise HTTPException( status_code=400, detail="File name is required" )

    allowed_extensions = { ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".jpg", ".jpeg", ".png" }

    extension = ( Path(file.filename) .suffix .lower() )

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG" )
        )

    # =========================================================
    # READ FILE
    # =========================================================

    file_content = await file.read()

    max_size = 25 * 1024 * 1024

    if len(file_content) > max_size:
        raise HTTPException( status_code=400, detail="Maximum file size is 25 MB" )

    # =========================================================
    # SAFE FILE NAME
    # =========================================================

    safe_name = Path( file.filename ).name

    timestamp = datetime.utcnow().strftime( "%Y%m%d%H%M%S%f" )

    stored_name = ( f"{timestamp}_{safe_name}" )

    destination = ( UPLOAD_DIRECTORY / stored_name )

    with destination.open("wb") as buffer:
        buffer.write(file_content)

    # =========================================================
    # PARSE DATES
    # =========================================================

    parsed_document_date = None

    if document_date:
        try:
            parsed_document_date = (datetime.strptime( document_date, "%Y-%m-%d" ).date() )

        except ValueError:
            raise HTTPException( status_code=400, detail="Invalid document date" )

    parsed_expiry = None

    if expiry_date:
        try:
            parsed_expiry = ( datetime.strptime( expiry_date, "%Y-%m-%d" ).date() )

        except ValueError:
            raise HTTPException( status_code=400, detail="Invalid expiry date" )

    # =========================================================
    # FOLDER
    # =========================================================

    parsed_folder = (
        int(folder_id)
        if folder_id
        else None
    )

    # =========================================================
    # DOCUMENT
    # =========================================================

    document = db.Document(
        document_name=(
            document_title.strip()
            if document_title.strip()
            else safe_name
        ),
        category=category,
        document_type=( document_type.strip() or None ),
        related_type=( related_type.strip() or None ),
        related_id=( related_id.strip() or None ),
        business_unit=( business_unit.strip() or None ),
        tags=( tags.strip() or None ),
        confidentiality_level=( confidentiality_level.strip() or "Internal" ),
        retention_period=( retention_period.strip() or None ),
        document_date=parsed_document_date,
        folder_id=parsed_folder,
        uploaded_by=uploaded_by,
        file_path=str(destination),
        file_type=( extension .replace(".", "") .upper() ),
        mime_type=( file.content_type or "application/octet-stream"  ),
        file_size=len(file_content),
        status="Pending Review",
        expiry_date=parsed_expiry,
        description=( document_description.strip() or None )
    )

    database.add(document)

    database.flush()

    # =========================================================
    # ACTIVITY
    # =========================================================

    activity = db.DocumentActivity(
        document_id=document.id,
        user_id=uploaded_by,
        action="UPLOAD",
        message=( f"{safe_name} was uploaded" )
    )

    database.add(activity)

    # =========================================================
    # APPROVAL
    # =========================================================

    approval = db.DocumentApproval(
        document_id=document.id,
        reviewer_id=None,
        status="Pending",
        comments=None,
        requested_at=datetime.utcnow()
    )

    database.add(approval)

    database.commit()

    database.refresh(document)

    return {
        "success": True,
        "message": ( "Document uploaded successfully" ),
        "document_id": document.id,
        "status": document.status,
        "document": {
            "id": document.id,
            "document_name": document.document_name,
            "category": document.category,
            "document_type": document.document_type,
            "status": document.status,
            "file_size": document.file_size
        }
    }


# ============================================================
# CREATE FOLDER
# ============================================================

@app.post("/api/documents/folders", tags=["Supply Chain Dashboard"])
def create_folder(
    folder_name: str = Form(...),
    category: str = Form( default="" ),
    created_by: int = Form( default=1 ),
    database: Session = Depends(db.get_db) 
):

    folder = db.DocumentFolder( folder_name=folder_name, category=category or None, created_by=created_by )

    database.add(folder)

    database.commit()

    database.refresh(folder)

    return {
        "message": "Folder created",
        "folder": {
            "id": folder.id,
            "folder_name": folder.folder_name,
            "category": folder.category
        }
    }


# ============================================================
# APPROVE DOCUMENT
# ============================================================

@app.patch( "/api/documents/approvals/{approval_id}", tags=["Supply Chain Dashboard"])
def update_approval( approval_id: int, status: str = Query(...), reviewer_id: int = Query( default=1 ), database: Session = Depends(db.get_db) ):

    approval = ( database.query( db.DocumentApproval ) .filter( db.DocumentApproval.id == approval_id ) .first() )

    if not approval:
        raise HTTPException( status_code=404, detail="Approval not found" )

    approval.status = status

    approval.reviewer_id = reviewer_id

    approval.reviewed_at = datetime.utcnow()

    document = ( database.query(db.Document) .filter( db.Document.id == approval.document_id ) .first() )

    if document:
        document.status = status

    database.add(
        db.DocumentActivity(
            document_id= approval.document_id,
            user_id= reviewer_id,
            action= status.upper(),
            message= f"Document {status.lower()}"
        )
    )

    database.commit()

    return { "message": f"Document {status.lower()}" }


@app.get( "/api/documents/reference-options", tags=["Supply Chain Dashboard"] )
def document_reference_options( database: Session = Depends(db.get_db) ):

    # ---------------------------------------------------------
    # PURCHASE ORDERS
    # ---------------------------------------------------------

    purchase_orders = ( database.query(db.PurchaseOrder) .order_by(db.PurchaseOrder.id.desc()) .limit(100) .all() )

    po_options = [
        { "id": po.id, "value": po.po_number, "label": po.po_number }
        for po in purchase_orders
    ]

    # ---------------------------------------------------------
    # VENDORS
    # ---------------------------------------------------------

    vendors = (
        database.query(db.Vendor) .filter( db.Vendor.status.in_( ["Approved", "Active"] ) )
        .order_by(db.Vendor.vendor_name) .all()
    )

    vendor_options = [
        {
            "id": vendor.vendor_id, "value": vendor.vendor_id,
            "label": ( f"{vendor.vendor_id} | " f"{vendor.vendor_name}" )
        }
        for vendor in vendors
    ]

    # ---------------------------------------------------------
    # FOLDERS
    # ---------------------------------------------------------

    folders = ( database.query(db.DocumentFolder) .order_by(db.DocumentFolder.folder_name) .all() )

    folder_options = [
        { "id": folder.id, "value": str(folder.id), "label": folder.folder_name }
        for folder in folders
    ]

    # ---------------------------------------------------------
    # BUSINESS UNIT
    # ---------------------------------------------------------

    company = ( database.query(db.CompanyProfile) .first() )

    business_units = []

    if company:
        company_name = getattr( company, "company_name", None )

        if company_name:
            business_units.append( { "value": company_name, "label": company_name } )

    return {
        "purchase_orders": po_options,
        "vendors": vendor_options,
        "folders": folder_options,
        "business_units": business_units
    }


# ============================================================
# GET ALL SETTINGS
# ============================================================

@app.get("/api/settings", tags=["Supply Chain Dashboard"])
def get_settings(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):

    system = database.query( db.SystemSettings ).first()

    company = database.query( db.CompanyProfile ).first()

    business = database.query( db.BusinessSettings ).first()

    preferences = database.query( db.UserPreferences
    ).filter( db.UserPreferences.user_id == current_user.id ).first()

    notifications = database.query( db.NotificationSettings
    ).filter( db.NotificationSettings.user_id == current_user.id ).first()

    integrations = database.query( db.Integration ).order_by( db.Integration.id ).all()

    total_users = ( database .query(db.User) .count() )

    active_users = ( database .query(db.User) .filter( db.User.active == True ) .count() )

    role_count = ( database .query( db.User.role ) .filter( db.User.role.isnot(None) ) .distinct() .count() )


    return {
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
            "active": current_user.active,
            "employee_id": getattr( current_user, "employee_id", None ),
            "department": getattr( current_user, "department", None ),
            "job_title": getattr( current_user, "job_title", None ),
            "mobile": current_user.mobile,
            "reporting_manager_id": getattr( current_user, "reporting_manager_id", None ),
            "date_of_joining": ( current_user.date_of_joining.isoformat()
                    if current_user.date_of_joining else None ),
            "profile_image": getattr( current_user, "profile_image", None ),
            "two_factor_enabled": getattr( current_user, "two_factor_enabled", False ),
            "login_email_notifications": getattr( current_user, "login_email_notifications", True )
        },
        "system": system,
        "company": company,
        "business": business,
        "preferences": preferences,
        "notifications": notifications,
        "integrations": integrations,
        "users_summary": {
            "total_users": total_users,
            "active_users": active_users,
            "roles": role_count
        }
    }


# ============================================================
# COMPANY
# ============================================================

@app.put("/api/settings/company", tags=["Supply Chain Dashboard"])
def update_company(
    payload: db.CompanyProfileUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_settings_access)
):

    company = database.query( db.CompanyProfile ).first()

    if not company:
        company = db.CompanyProfile( **payload.model_dump() )
        database.add(company)

    else:
        for key, value in payload.model_dump().items():
            setattr( company, key, value )

    company.updated_by = current_user.id
    company.updated_at = datetime.utcnow()

    database.commit()
    database.refresh(company)

    crud.create_audit_log(
        database, current_user,
        "UPDATE", "Company information updated",
        "company_profiles", str(company.id)
    )

    return company


# ============================================================
# BUSINESS SETTINGS
# ============================================================

@app.put("/api/settings/business", tags=["Supply Chain Dashboard"])
def update_business(
    payload: db.BusinessSettingsUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_settings_access)
):

    business = database.query( db.BusinessSettings ).first()

    if not business:
        business = db.BusinessSettings( **payload.model_dump() )
        database.add(business)

    else:

        for key, value in payload.model_dump().items():
            setattr( business, key, value )

    business.updated_at = datetime.utcnow()

    database.commit()
    database.refresh(business)

    crud.create_audit_log(
        database, current_user,
        "UPDATE", "Business settings updated",
        "business_settings", str(business.id)
    )

    return business


# ============================================================
# USER PREFERENCES
# ============================================================

@app.put("/api/settings/preferences", tags=["Supply Chain Dashboard"])
def update_preferences(
    payload: db.PreferencesUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):

    system = database.query( db.SystemSettings ).first()

    if not system:
        system = db.SystemSettings()
        database.add(system)

    system.date_format = payload.date_format
    system.time_format = payload.time_format
    system.items_per_page = payload.items_per_page
    system.currency = payload.currency
    system.number_format = payload.number_format
    system.measurement_unit = payload.measurement_unit
    system.default_dashboard = payload.default_dashboard

    preferences = database.query( db.UserPreferences ).filter( db.UserPreferences.user_id == current_user.id ).first()

    if not preferences:
        preferences = db.UserPreferences( user_id=current_user.id )
        database.add(preferences)

    preferences.number_format = payload.number_format
    preferences.measurement_unit = payload.measurement_unit
    preferences.default_dashboard = payload.default_dashboard
    preferences.theme = payload.theme

    database.commit()

    crud.create_audit_log(
        database, current_user,
        "UPDATE", "System preferences updated",
        "system_settings", str(system.id)
    )

    return { "message": "Preferences saved successfully" }


# ============================================================
# SECURITY
# ============================================================

@app.put("/api/settings/security", tags=["Supply Chain Dashboard"])
def update_security(
    payload: db.SecurityUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_settings_access)
):

    settings = database.query( db.SystemSettings ).first()

    if not settings:
        settings = db.SystemSettings()
        database.add(settings)

    settings.two_factor_authentication = ( payload.two_factor_authentication )

    settings.password_complexity = ( payload.password_complexity )

    settings.password_expiry = ( payload.password_expiry )

    settings.session_timeout = ( payload.session_timeout )

    settings.max_login_attempts = ( payload.max_login_attempts )

    database.commit()

    crud.create_audit_log(
        database,current_user,
        "UPDATE", "Security settings updated",
        "system_settings", str(settings.id)
    )

    return { "message": "Security settings saved" }


# ============================================================
# NOTIFICATIONS
# ============================================================

@app.put("/api/settings/notifications", tags=["Supply Chain Dashboard"])
def update_notifications(
    payload: db.NotificationUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):

    settings = database.query( db.NotificationSettings ) .filter( db.NotificationSettings.user_id == current_user.id ).first()

    if not settings:
        settings = db.NotificationSettings( user_id=current_user.id )

        database.add(settings)

    for key, value in payload.model_dump().items():
        setattr( settings, key, value )

    settings.updated_at = datetime.utcnow()

    database.commit()

    return { "message": "Notification settings saved" }


# ============================================================
# DATA MANAGEMENT
# ============================================================

@app.put("/api/settings/data", tags=["Supply Chain Dashboard"])
def update_data_settings(
    payload: db.DataSettingsUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_settings_access)
):

    settings = database.query( db.SystemSettings ).first()

    if not settings:
        settings = db.SystemSettings()
        database.add(settings)

    settings.data_retention_period = ( payload.data_retention_period )

    settings.automatic_backups = ( payload.automatic_backups )

    settings.backup_frequency = ( payload.backup_frequency )

    settings.backup_time = ( payload.backup_time )

    database.commit()

    return { "message": "Data management settings saved" }


# ============================================================
# OTHER SETTINGS
# ============================================================

@app.put("/api/settings/other", tags=["Supply Chain Dashboard"])
def update_other_settings(
    payload: db.OtherSettingsUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_settings_access)
):

    settings = database.query( db.SystemSettings ).first()

    if not settings:
        settings = db.SystemSettings()
        database.add(settings)

    settings.maintenance_mode = ( payload.maintenance_mode )

    settings.system_updates_enabled = ( payload.system_updates_enabled )

    settings.beta_features_enabled = ( payload.beta_features_enabled )

    database.commit()

    return { "message": "Other settings saved" }


# ============================================================
# INTEGRATIONS
# ============================================================

@app.get("/api/settings/integrations", tags=["Supply Chain Dashboard"])
def get_integrations(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):

    return database.query( db.Integration ).order_by( db.Integration.id ).all()


@app.post("/api/settings/integrations/{integration_id}/toggle", tags=["Supply Chain Dashboard"])
def toggle_integration(
    integration_id: int,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_settings_access)
):

    integration = database.query( db.Integration ).filter( db.Integration.id == integration_id ).first()

    if not integration:
        raise HTTPException( status_code=404, detail="Integration not found" )

    if integration.status == "Connected":
        integration.status = "Not Connected"
        integration.enabled = False

    else:
        integration.status = "Connected"
        integration.enabled = True
        integration.last_sync_at = datetime.utcnow()

    database.commit()

    return { "message": "Integration status updated", "status": integration.status }


# ============================================================
# MANUAL BACKUP
# ============================================================

@app.post("/api/settings/backup", tags=["Supply Chain Dashboard"])
def run_backup(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_settings_access)
):

    job = db.BackupJob( backup_type="Manual", status="Queued", created_by=current_user.id )

    database.add(job)
    database.commit()
    database.refresh(job)

    crud.create_audit_log(
        database, current_user,
        "BACKUP",
        "Manual backup requested",
        "backup_jobs",
        str(job.id)
    )

    return { "message": "Backup request queued", "backup_id": job.id }


@app.post( "/api/settings/clear-cache", tags=["Supply Chain Dashboard"] )
def clear_application_cache( current_user: db.User = Depends( crud.require_settings_access ) ):

    # If you later introduce Redis/application cache,
    # clear it here.

    return { "success": True, "message": "Application cache cleared successfully" }


# ============================================================
# RESET SETTINGS
# ============================================================

@app.post("/api/settings/reset", tags=["Supply Chain Dashboard"])
def reset_settings(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_settings_access) 
):

    settings = database.query( db.SystemSettings ).first()

    if settings:
        settings.platform_name = "VendorIQ"
        settings.platform_tagline = ( "Vendor Reliability Platform" )
        settings.default_language = "English (US)"
        settings.default_timezone = ( "(UTC+05:30) Asia/Kolkata" )
        settings.date_format = "01 May 2024"
        settings.time_format = "12 Hour (03:30 PM)"
        settings.items_per_page = 10
        settings.currency = "USD - US Dollar ($)"
        settings.password_minimum_length = 8
        settings.session_timeout = "30 Minutes"
        settings.password_complexity = True
        settings.password_expiry = "90 Days"
        settings.max_login_attempts = 5
        settings.two_factor_authentication = True
        settings.in_app_notifications = True
        settings.email_notifications = True
        settings.sms_notifications = False
        settings.digest_frequency = "Daily"
        settings.data_retention_period = "2 Years"
        settings.file_storage_limit = "25 MB"
        settings.automatic_backups = True
        settings.backup_frequency = "Daily"
        settings.backup_time = "02:00 AM"
        settings.number_format = "1,234.56"
        settings.measurement_unit = "Metric (kg, cm, km)"
        settings.default_dashboard = ( "Supply Chain Overview" )
        settings.maintenance_mode = False
        settings.system_updates_enabled = True
        settings.beta_features_enabled = False

        database.commit()

    crud.create_audit_log(
        database, current_user,
        "RESET", "All system settings restored to defaults",
        "system_settings", str(settings.id if settings else "")
    )

    return { "message": "Settings reset successfully" }


# ============================================================
# DELETE ACCOUNT
# ============================================================

@app.delete("/api/settings/account", tags=["Supply Chain Dashboard"])
def delete_account(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_settings_access)
):

    if current_user.role != "Admin":
        raise HTTPException( status_code=403, detail="Only an administrator can delete an account" )

    crud.create_audit_log(
        database, current_user,
        "DELETE", "Administrator account deletion requested",
        "users", str(current_user.id)
    )

    database.delete(current_user)
    database.commit()

    return { "message": "Account deleted" }


# ============================================================
# GET VENDORS
# ============================================================

@app.get("/api/purchase-orders/vendors", tags=["Supply Chain Dashboard"])
def supply_get_vendors( database: Session = Depends(db.get_db) ):

    vendors = (
        database.query(db.Vendor)
        .filter( db.Vendor.status.in_( ["Approved", "Active"] ) )
        .order_by(db.Vendor.vendor_name) .all()
    )

    return [
        {
            "id": v.vendor_id,
            "vendor_id": v.vendor_id,
            "vendor_name": v.vendor_name,
            "email": v.email,
            "phone": v.phone,
            "contact_person": v.contact_person,
            "address": v.address,
        }
        for v in vendors
    ]


# ============================================================
# GET SINGLE VENDOR
# ============================================================

@app.get("/api/purchase-orders/vendors/{vendor_id}", tags=["Supply Chain Dashboard"])
def supply_get_vendor( vendor_id: str, database: Session = Depends(db.get_db) ):

    vendor = ( database.query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    return {
        "id": vendor.vendor_id,
        "vendor_id": vendor.vendor_id,
        "vendor_name": vendor.vendor_name,
        "email": vendor.email,
        "phone": vendor.phone,
        "contact_person": vendor.contact_person,
        "address": vendor.address,
        "country": vendor.country
    }


# ============================================================
# GET INVENTORY ITEMS
# ============================================================

@app.get("/api/purchase-orders/items", tags=["Supply Chain Dashboard"])
def get_purchase_inventory_items( database: Session = Depends(db.get_db) ):

    items = ( database.query(db.InventoryItem) .order_by( db.InventoryItem.item_name ) .all() )

    return [
        {
            "id": item.id,
            "item_code": item.item_code,
            "item_name": item.item_name,
            "category": item.category,
            "unit_price": float( item.unit_price or 0 ),
            "warehouse_id": item.warehouse_id,
            "status": item.status
        }
        for item in items
    ]


# ============================================================
# GENERATE PO NUMBER API
# ============================================================

@app.get("/api/purchase-orders/generate-number", tags=["Supply Chain Dashboard"])
def get_po_number( database: Session = Depends(db.get_db) ):

    return { "po_number": crud.generate_po_number(database) }


# ============================================================
# CREATE PURCHASE ORDER
# ============================================================

@app.post(
    "/api/purchase-orders",
    response_model=db.DraftResponse,
    tags=["Supply Chain Dashboard"]
)
def supply_create_purchase_order(

    payload: db.PurchaseOrderCreateRequest,

    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(
        crud.require_procurement_or_supply_chain_manager
    )
):

    # --------------------------------------------------------
    # VALIDATE VENDOR
    # --------------------------------------------------------

    vendor = ( database.query(db.Vendor) .filter( db.Vendor.vendor_id == payload.vendor_id ) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    # --------------------------------------------------------
    # VALIDATE WAREHOUSE
    # --------------------------------------------------------

    warehouse = None

    if payload.delivery_warehouse_id:
        warehouse = ( database.query(db.Warehouse) .filter( db.Warehouse.id == payload.delivery_warehouse_id ) .first() )

        if not warehouse:
            raise HTTPException( status_code=404, detail="Delivery warehouse not found" )

    # --------------------------------------------------------
    # VALIDATE ITEMS
    # --------------------------------------------------------

    if not payload.items:
        raise HTTPException( status_code=400, detail="At least one item is required" )

    # --------------------------------------------------------
    # CALCULATE TOTALS
    # --------------------------------------------------------

    subtotal = Decimal("0")
    tax_amount = Decimal("0")

    item_objects = []

    for item in payload.items:

        line_amount = ( item.quantity * item.unit_price )

        line_tax = ( line_amount * item.tax_rate /  Decimal("100") )

        subtotal += line_amount
        tax_amount += line_tax

        item_objects.append( { "data": item, "amount": line_amount, "tax_amount": line_tax } )

    shipping = ( payload.shipping_amount or Decimal("0") )

    total = ( subtotal + tax_amount + shipping )

    # --------------------------------------------------------
    # CREATE PO
    # --------------------------------------------------------

    po_number = crud.generate_po_number(database)

    po = db.PurchaseOrder(

        po_number=po_number,

        vendor_id=payload.vendor_id,

        amount=float(total),

        # Finance approval is mandatory
        status="Pending Finance Approval",

        order_date=payload.order_date,

        expected_delivery=payload.required_delivery_date,

        category=vendor.category,

        created_by=current_user.id,

        department=getattr(
            current_user,
            "department",
            None
        )
    )

    database.add(po)

    database.flush()

    # --------------------------------------------------------
    # CREATE DETAILS
    # --------------------------------------------------------

    details = db.PurchaseOrderDetails(
        purchase_order_id=po.id,
        po_type=payload.po_type,
        supplier_reference=( payload.supplier_reference ),
        contact_person=( payload.contact_person ),
        contact_phone=( payload.contact_phone ),
        contact_email=( payload.contact_email ),
        payment_method=( payload.payment_method ),
        payment_terms=( payload.payment_terms ),
        incoterms=( payload.incoterms ),
        currency=payload.currency,
        exchange_rate=( payload.exchange_rate ),
        delivery_warehouse_id=( payload.delivery_warehouse_id ),
        notes=payload.notes,
        subtotal=subtotal,
        tax_amount=tax_amount,
        shipping_amount=shipping,
        total_amount=total
    )

    database.add(details)

    # --------------------------------------------------------
    # CREATE ITEMS
    # --------------------------------------------------------

    for record in item_objects:
        item = record["data"]
        po_item = db.PurchaseOrderItem(
            purchase_order_id=po.id,
            inventory_item_id=( item.inventory_item_id ),
            item_code=item.item_code,
            item_description=( item.item_description ),
            uom=item.uom,
            quantity=item.quantity,
            unit_price=item.unit_price,
            tax_rate=item.tax_rate,
            tax_amount=record[ "tax_amount" ],
            amount=record[ "amount" ]
        )

        database.add(po_item)
    
    # --------------------------------------------------------
    # CREATE FINANCE APPROVAL WORKFLOW
    # --------------------------------------------------------

    workflow = crud.create_approval_workflow(

        database=database,

        reference_type="PO",

        reference_id=po.id,

        reference_number=po_number,

        title=f"Purchase Order {po_number}",

        requested_by_user_id=current_user.id,

        department=getattr(
            current_user,
            "department",
            None
        ) or getattr(
            po,
            "department",
            None
        ),

        amount=float(total),

        priority="Medium"
    )

    # --------------------------------------------------------
    # COMMIT
    # --------------------------------------------------------

    database.commit()

    return {
        "success": True,

        "message": (
            "Purchase order created successfully "
            "and sent to Finance Officer for approval."
        ),

        "po_id": po.id,

        "po_number": po_number,

        "total_amount": total,

        "status": "Pending Finance Approval",

        "approval_workflow_id": workflow.id,

        "approval_status": "Pending",

        "current_step": "Finance Officer Approval"
    }


# ============================================================
# GET PO
# ============================================================

@app.get("/api/purchase-orders/{po_id}", tags=["Supply Chain Dashboard"])
def supply_get_purchase_order( po_id: int, database: Session = Depends(db.get_db) ):

    po = ( database.query(db.PurchaseOrder) .filter( db.PurchaseOrder.id == po_id ) .first() )

    if not po:
        raise HTTPException( status_code=404, detail="Purchase order not found" )

    details = (
        database.query(db.PurchaseOrderDetails)
        .filter( db.PurchaseOrderDetails.purchase_order_id == po.id ) .first() 
    )

    items = ( 
        database.query(db.PurchaseOrderItem) 
        .filter( db.PurchaseOrderItem.purchase_order_id == po.id ) .all() 
    )

    vendor = ( database.query(db.Vendor) .filter( db.Vendor.vendor_id == po.vendor_id ) .first() )

    return {
        "id": po.id,
        "po_number": po.po_number,
        "vendor": {
            "vendor_id": vendor.vendor_id
            if vendor else None,
            "vendor_name": vendor.vendor_name
            if vendor else None
        },
        "status": po.status,
        "order_date": po.order_date,
        "expected_delivery": ( po.expected_delivery
        ),
        "details": (
            {
                "po_type": details.po_type,
                "supplier_reference": details.supplier_reference,
                "contact_person": details.contact_person,
                "contact_phone": details.contact_phone,
                "contact_email": details.contact_email,
                "payment_method": details.payment_method,
                "payment_terms": details.payment_terms,
                "incoterms": details.incoterms,
                "currency": details.currency,
                "exchange_rate": float(details.exchange_rate),
                "delivery_warehouse_id": details.delivery_warehouse_id,
                "notes": details.notes,
                "subtotal": float(details.subtotal),
                "tax_amount": float(details.tax_amount),
                "shipping_amount": float(details.shipping_amount),
                "total_amount": float(details.total_amount)
            }
            if details else None
        ),
        "items": [
            {
                "id": item.id,
                "inventory_item_id": item.inventory_item_id,
                "item_code": item.item_code,
                "item_description": item.item_description,
                "uom": item.uom,
                "quantity": float(item.quantity),
                "unit_price": float(item.unit_price),
                "tax_rate": float(item.tax_rate),
                "tax_amount": float(item.tax_amount),
                "amount": float(item.amount)
            }
            for item in items
        ]
    }


# ============================================================
# UPLOAD DOCUMENT
# ============================================================

@app.post( "/api/purchase-orders/{po_id}/documents", tags=["Supply Chain Dashboard"] )
def upload_po_document( po_id: int, file: UploadFile = File(...), database: Session = Depends(db.get_db) ):

    po = ( database.query(db.PurchaseOrder) .filter( db.PurchaseOrder.id == po_id ) .first() )

    if not po:
        raise HTTPException( status_code=404, detail="Purchase order not found" )

    safe_name = Path( file.filename ).name

    destination = ( UPLOAD_DIR / f"PO_{po_id}_{safe_name}" )

    with destination.open("wb") as buffer:
        shutil.copyfileobj( file.file, buffer )

    document = db.Document(
        document_name=safe_name,
        category="Purchase Order",
        subcategory="PO Attachment",
        related_type="purchase_order",
        related_id=str(po_id),
        file_path=str(destination),
        file_type=file.content_type
    )

    database.add(document)

    database.commit()

    return { "success": True, "message": "Document uploaded", "document_id": document.id }


# ============================================================
# FULL SUPPLIER CREATION
# ============================================================

@app.post( "/api/suppliers/full", tags=["Supply Chain Dashboard"] )
def create_full_supplier(
    data: db.SupplierCreate,
    save_as_draft: bool = False,
    database: Session = Depends(db.get_db)
):

    # ========================================================
    # VALIDATE EMAIL
    # ========================================================

    existing_email = ( database.query(db.Vendor) .filter(db.Vendor.email == str(data.email)) .first() )

    if existing_email:
        raise HTTPException( status_code=400, detail="A supplier with this email already exists." )


    # ========================================================
    # VALIDATE PHONE
    # ========================================================

    existing_phone = ( database.query(db.Vendor) .filter(db.Vendor.phone == data.phone) .first() )

    if existing_phone:
        raise HTTPException( status_code=400, detail="A supplier with this phone number already exists." )


    # ========================================================
    # GENERATE VENDOR ID
    # ========================================================

    last_vendor = ( database.query(db.Vendor) .order_by(db.Vendor.id.desc()) .first() )


    if last_vendor:

        try:
            number = ( int( last_vendor.vendor_id .replace("VND", "") ) + 1 )

        except (ValueError, AttributeError):
            number = last_vendor.id + 1

    else:
        number = 1

    vendor_id = f"VND{number:07d}"


    # ========================================================
    # CREATE MAIN VENDOR
    # ========================================================

    vendor = db.Vendor(
        vendor_id=vendor_id,
        vendor_name=data.supplier_name,
        country=data.country,
        email=str(data.email),
        phone=data.phone,
        business_type=data.business_type,
        category=data.category,
        contact_person=data.contact_person,
        status=(
            "Draft"
            if save_as_draft
            else "Pending"
        ),
        reliability_score=0,
        quality_score=0,
        delivery_score=0,
        service_score=0,
        contract_count=0
    )


    database.add(vendor)

    database.flush()


    # ========================================================
    # BUSINESS DETAILS
    # ========================================================

    if data.business:
        business = db.SupplierBusinessDetails(
            vendor_id=vendor.vendor_id,
            legal_entity_name= data.business.legal_entity_name,
            website= data.business.website,
            tax_id_gst= data.business.tax_id_gst,
            industry= data.business.industry,
            supplier_type= data.business.supplier_type,
            duns_number= data.business.duns_number,
            year_established= data.business.year_established,
            preferred_language= data.business.preferred_language,
            currency= data.business.currency
        )

        database.add(business)


    # ========================================================
    # REGISTERED ADDRESS
    # ========================================================

    registered = data.registered_address
    registered_address = db.SupplierAddress(
        vendor_id=vendor.vendor_id,
        address_type="Registered",
        address_line1= registered.address_line1,
        address_line2= registered.address_line2,
        city= registered.city,
        state_province= registered.state_province,
        postal_code= registered.postal_code,
        country= registered.country,
        phone= registered.phone,
        email=(
            str(registered.email)
            if registered.email
            else None
        ),
        is_primary=True
    )

    database.add(registered_address)


    # ========================================================
    # COMMUNICATION ADDRESS
    # ========================================================

    if data.communication_address:
        communication = data.communication_address
        communication_address = db.SupplierAddress(
            vendor_id=vendor.vendor_id,
            address_type="Communication",
            address_line1= communication.address_line1,
            address_line2= communication.address_line2,
            city= communication.city,
            state_province= communication.state_province,
            postal_code= communication.postal_code,
            country= communication.country,
            phone= communication.phone,
            email=(
                str(communication.email)
                if communication.email
                else None
            ),
            is_primary=False
        )

        database.add( communication_address )


    # ========================================================
    # CONTACTS
    # ========================================================

    for contact in data.contacts or []:
        supplier_contact = db.SupplierContact(
            vendor_id=vendor.vendor_id,
            contact_name= contact.contact_name,
            job_title= contact.job_title,
            email=(
                str(contact.email)
                if contact.email
                else None
            ),
            phone= contact.phone,
            contact_type= contact.contact_type,
            is_primary= contact.is_primary
        )

        database.add( supplier_contact )


    # ========================================================
    # BANK ACCOUNTS
    # ========================================================

    for bank in data.bank_accounts or []:
        supplier_bank = db.SupplierBankAccount(
            vendor_id=vendor.vendor_id,
            bank_name= bank.bank_name,
            account_name= bank.account_name,
            account_last_four= bank.account_last_four,
            ifsc_swift= bank.ifsc_swift,
            branch_name= bank.branch_name,
            currency= bank.currency,
            is_primary= bank.is_primary
        )

        database.add( supplier_bank )


    # ========================================================
    # COMMIT EVERYTHING
    # ========================================================

    try:
        database.commit()
        database.refresh(vendor)

    except Exception as exc:
        database.rollback()
        print( "FULL SUPPLIER CREATE ERROR:", exc )
        raise HTTPException( status_code=500, detail="Unable to create supplier." )


    # ========================================================
    # INITIAL SUMMARY
    # ========================================================

    purchase_orders = (
        database.query(db.PurchaseOrder) .filter( db.PurchaseOrder.vendor_id == vendor.vendor_id ) .count() )


    # If a Shipment table exists in your model,
    # replace this with the actual shipment query.
    shipments = 0


    # Purchase-order item count
    item_count = 0

    try:
        item_count = (
            database.query( db.PurchaseOrderItem ) .join(
                db.PurchaseOrder,
                db.PurchaseOrderItem.purchase_order_id == db.PurchaseOrder.id
            )
            .filter( db.PurchaseOrder.vendor_id == vendor.vendor_id ) .count()
        )

    except Exception:
        item_count = 0


    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "success": True,
        "message": (
            "Supplier draft saved successfully."
            if save_as_draft
            else "Supplier created successfully."
        ),
        "vendor_id": vendor.vendor_id,
        "supplier": {
            "vendor_id": vendor.vendor_id,
            "vendor_name": vendor.vendor_name,
            "country": vendor.country,
            "email": vendor.email,
            "phone": vendor.phone,
            "status": vendor.status
        },
        "summary": {
            "purchase_orders": purchase_orders,
            "shipments": shipments,
            "items": item_count,
            "spend": 0
        }
    }


@app.post("/api/shipments", tags=["Supply Chain Dashboard"])
def create_shipment( data: db.ShipmentCreate, database: Session = Depends(db.get_db) ):

    # -------------------------------------------------
    # Check Purchase Order
    # -------------------------------------------------

    purchase_order = ( database.query(db.PurchaseOrder) .filter( db.PurchaseOrder.id == data.po_id ) .first() )

    if not purchase_order:
        raise HTTPException( status_code=404, detail="Purchase order not found" )

    # -------------------------------------------------
    # Generate shipment number
    # -------------------------------------------------

    shipment_number = crud.generate_shipment_number(database)

    # -------------------------------------------------
    # Create shipment
    # -------------------------------------------------

    shipment = db.Shipment(
        shipment_number=shipment_number,
        po_id=data.po_id,
        shipment_date=data.shipment_date,
        shipment_type=data.shipment_type,
        priority=data.priority,
        reference_number=data.reference_number,
        related_document=data.related_document,
        incoterms=data.incoterms,
        payment_terms=data.payment_terms,
        status=data.status,
        origin=data.origin,
        destination=data.destination,
        carrier_id=data.carrier_id,
        order_id=data.order_id
    )

    database.add(shipment)

    # Generate ID before creating children
    database.flush()

    # -------------------------------------------------
    # Shipment details
    # -------------------------------------------------

    if data.details:
        details = db.ShipmentDetails(
            shipment_id=shipment.id,
            requested_delivery=data.details.requested_delivery,
            promised_delivery=data.details.promised_delivery,
            earliest_pickup=data.details.earliest_pickup,
            latest_delivery=data.details.latest_delivery,
            pickup_time_window=data.details.pickup_time_window,
            delivery_time_window=data.details.delivery_time_window,
            timezone=data.details.timezone,
            origin_contact_person=( data.details.origin_contact_person ),
            origin_phone=data.details.origin_phone,
            origin_address=data.details.origin_address,
            destination_contact_person=( data.details.destination_contact_person ),
            destination_phone=( data.details.destination_phone ),
            destination_address=( data.details.destination_address ),
            special_instructions=( data.details.special_instructions ),
            internal_notes=( data.details.internal_notes )
        )

        database.add(details)

    # -------------------------------------------------
    # Shipment items
    # -------------------------------------------------

    for item_data in data.items:

        item = db.ShipmentItem(
            shipment_id=shipment.id,
            inventory_item_id=( item_data.inventory_item_id ),
            purchase_order_item_id=( item_data.purchase_order_item_id ),
            item_code=item_data.item_code,
            item_description=( item_data.item_description ),
            quantity=item_data.quantity,
            uom=item_data.uom,
            total_weight=item_data.total_weight,
            weight_unit=item_data.weight_unit,
            total_volume=item_data.total_volume,
            volume_unit=item_data.volume_unit
        )

        database.add(item)

    # -------------------------------------------------
    # Commit
    # -------------------------------------------------

    try:

        database.commit()

    except Exception as e:
        database.rollback()
        raise HTTPException( status_code=500, detail=f"Failed to create shipment: {str(e)}" )

    database.refresh(shipment)

    return {
        "success": True,
        "message": "Shipment created successfully",
        "shipment": {
            "id": shipment.id,
            "shipment_number": shipment.shipment_number,
            "status": shipment.status
        }
    }


@app.get("/api/shipments/purchase-orders", tags=["Supply Chain Dashboard"])
def get_shipment_purchase_orders( database: Session = Depends(db.get_db) ):

    orders = ( database.query(db.PurchaseOrder) .order_by(db.PurchaseOrder.id.desc()) .all() )

    return [
        { "id": order.id, "label": getattr( order, "po_number", f"PO-{order.id}" ) }
        for order in orders
    ]


# ============================================================
# SUPPLY CHAIN COMMUNICATION CONTACTS
# ============================================================

@app.get(
    "/api/supply-chain/communication/contacts",
    tags=["Supply Chain Communication"]
)
def supply_chain_communication_contacts(

    database: Session = Depends(
        db.get_db
    ),

    current_user: db.User = Depends(
        crud.get_current_user
    )
):

    role = (
        current_user.role or ""
    ).strip().lower()


    if role not in {
        "supply chain manager",
        "supply chain"
    }:

        raise HTTPException(
            status_code=403,
            detail="Supply Chain Manager access required."
        )


    result = (
        crud.get_supply_chain_communication_contacts(
            database,
            current_user
        )
    )


    return {
        "success": True,
        **result
    }


# ============================================================
# GET COMPLETE CONVERSATION
# ============================================================

@app.get(
    "/api/supply-chain/communication/conversation/{target_type}/{target_id}",
    tags=["Supply Chain Communication"]
)
def supply_chain_get_conversation(

    target_type: str,

    target_id: str,

    database: Session = Depends(
        db.get_db
    ),

    current_user: db.User = Depends(
        crud.get_current_user
    )
):

    role = (
        current_user.role or ""
    ).strip().lower()


    if role not in {
        "supply chain manager",
        "supply chain"
    }:

        raise HTTPException(
            status_code=403,
            detail="Supply Chain Manager access required."
        )


    result = crud.get_supply_chain_conversation(
        database,
        current_user,
        target_type,
        target_id
    )


    return {
        "success": True,
        **result
    }


# ============================================================
# SEND MESSAGE
# ============================================================

@app.post(
    "/api/supply-chain/communication/conversation/{target_type}/{target_id}",
    tags=["Supply Chain Communication"]
)
def supply_chain_send_message(

    target_type: str,

    target_id: str,

    payload: db.SupplyChainCommunicationMessage,

    database: Session = Depends(
        db.get_db
    ),

    current_user: db.User = Depends(
        crud.get_current_user
    )
):

    role = (
        current_user.role or ""
    ).strip().lower()


    if role not in {
        "supply chain manager",
        "supply chain"
    }:

        raise HTTPException(
            status_code=403,
            detail="Supply Chain Manager access required."
        )


    message_text = (
        payload.message or ""
    ).strip()


    if not message_text:

        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )


    result = (
        crud.send_supply_chain_conversation_message(
            database,
            current_user,
            target_type,
            target_id,
            message_text
        )
    )


    return {
        "success": True,
        "message": result
    }


@app.get( "/api/profile/me", tags=["Supply Chain Profile"] )
def get_my_profile(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):

    manager_name = None

    if current_user.reporting_manager_id:
        manager = ( database .query(db.User) .filter( db.User.id == current_user.reporting_manager_id ) .first() )

        if manager:
            manager_name = manager.name


    preferences = ( database .query(db.UserPreferences) .filter( db.UserPreferences.user_id == current_user.id ) .first() )


    if not preferences:
        preferences = db.UserPreferences( user_id=current_user.id )
        database.add( preferences )
        database.commit()
        database.refresh( preferences )


    return {
        "success": True,
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "employee_id": getattr( current_user, "employee_id", None ),
            "email": current_user.email,
            "alternate_email": getattr( current_user, "alternate_email", None ),
            "mobile": current_user.mobile,
            "department": getattr( current_user, "department", None ),
            "job_title": getattr( current_user, "job_title", None ),
            "location": getattr( current_user, "location", None ),
            "reporting_manager_id": getattr( current_user, "reporting_manager_id", None ),
            "reporting_manager_name": manager_name,
            "date_of_joining":
                (
                    current_user.date_of_joining.isoformat()
                    if getattr( current_user, "date_of_joining", None )
                    else None
                ),
            "address": current_user.address,
            "role": current_user.role,
            "active": current_user.active,
            "profile_image": getattr( current_user, "profile_image", None ),
            "two_factor_enabled": getattr( current_user, "two_factor_enabled", False ),
            "login_email_notifications": getattr( current_user, "login_email_notifications", True ),
            "last_login":
                (
                    current_user.last_login.isoformat()
                    if current_user.last_login
                    else None
                ),
            "password_changed_at": getattr( current_user, "password_changed_at", None )
        },

        "preferences": {
            "language": getattr( preferences, "language", "English (US)" ),
            "timezone": getattr( preferences, "timezone", "(UTC+05:30) Asia/Kolkata" ),
            "date_format": getattr( preferences, "date_format", "MM/DD/YYYY" ),
            "time_format": getattr( preferences, "time_format", "12 Hour (AM/PM)" ),
            "currency": getattr( preferences, "currency", "USD - US Dollar" ),
            "theme": preferences.theme
        }
    }


@app.put( "/api/profile/me", tags=["Supply Chain Profile"] )
def update_my_profile(
    payload: db.ProfileUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):

    # --------------------------------------------------
    # CHECK EMAIL
    # --------------------------------------------------

    duplicate_email = (
        database .query(db.User) .filter(
            db.User.email == payload.email,
            db.User.id != current_user.id
        ) .first()
    )

    if duplicate_email:
        raise HTTPException( status_code=400, detail="Email address is already in use." )


    # --------------------------------------------------
    # CHECK ALTERNATE EMAIL
    # --------------------------------------------------

    if payload.alternate_email:
        duplicate_alt = (
            database .query(db.User) .filter(
                db.User.alternate_email == payload.alternate_email,
                db.User.id != current_user.id
            ) .first()
        )

        if duplicate_alt:
            raise HTTPException( status_code=400, detail="Alternate email is already in use." )


    # --------------------------------------------------
    # CHECK REPORTING MANAGER
    # --------------------------------------------------

    if payload.reporting_manager_id:
        manager = (
            database .query(db.User) .filter(
                db.User.id == payload.reporting_manager_id,
                db.User.id != current_user.id
            ) .first()
        )

        if not manager:
            raise HTTPException( status_code=400, detail="Reporting manager not found." )


    # --------------------------------------------------
    # UPDATE
    # --------------------------------------------------

    current_user.name = payload.name.strip()

    current_user.email = ( str(payload.email).strip() )

    current_user.alternate_email = (
        str(payload.alternate_email).strip()
        if payload.alternate_email
        else None
    )

    current_user.mobile = (
        payload.mobile.strip()
        if payload.mobile
        else None
    )

    current_user.department = (
        payload.department.strip()
        if payload.department
        else None
    )

    current_user.job_title = (
        payload.job_title.strip()
        if payload.job_title
        else None
    )

    current_user.location = (
        payload.location.strip()
        if payload.location
        else None
    )

    current_user.reporting_manager_id = ( payload.reporting_manager_id )

    current_user.address = (
        payload.address.strip()
        if payload.address
        else None
    )

    current_user.date_of_joining = (
        payload.date_of_joining
        if hasattr( payload, "date_of_joining" )
        else current_user.date_of_joining
    )


    # --------------------------------------------------
    # AUDIT
    # --------------------------------------------------

    crud.create_audit_log(
        database, current_user,
        "UPDATE", "Updated personal profile information",
        "users", str(current_user.id)
    )


    database.commit()

    database.refresh( current_user )


    return { "success": True, "message": "Profile updated successfully." }


@app.put( "/api/profile/password", tags=["Supply Chain Profile"] )
def supply_change_my_password(
    payload: db.PasswordChangeRequest,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):

    if not db.verify_password( payload.current_password, current_user.hashed_password ):
        raise HTTPException( status_code=400, detail="Current password is incorrect." )


    if ( payload.new_password != payload.confirm_password ):
        raise HTTPException( status_code=400, detail="New passwords do not match." )


    password = payload.new_password


    if len(password) < 8:
        raise HTTPException( status_code=400, detail="Password must contain at least 8 characters." )


    if not any( c.isupper() for c in password ):
        raise HTTPException( status_code=400, detail="Password must contain an uppercase letter." )


    if not any( c.islower() for c in password ):
        raise HTTPException( status_code=400, detail="Password must contain a lowercase letter." )


    if not any( c.isdigit()  for c in password ):
        raise HTTPException( status_code=400, detail="Password must contain a number." )


    current_user.hashed_password = ( db.hash_password(password) )


    if hasattr( current_user, "password_changed_at" ):
        current_user.password_changed_at = ( datetime.utcnow() )


    crud.create_audit_log(
        database, current_user,
        "PASSWORD_CHANGE", "Password changed successfully",
        "users", str(current_user.id)
    )


    database.commit()


    return { "success": True, "message": "Password updated successfully." }    


@app.put( "/api/profile/security/2fa", tags=["Supply Chain Profile"] )
def update_supply_two_factor(
    payload: db.TwoFactorUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):

    current_user.two_factor_enabled = ( payload.enabled )


    crud.create_audit_log(
        database, current_user,
        "SECURITY_UPDATE",
        (
            "Enabled two-factor authentication"
            if payload.enabled
            else
            "Disabled two-factor authentication"
        ),
        "users", str(current_user.id)
    )


    database.commit()


    return { "success": True, "enabled": payload.enabled }


@app.put( "/api/profile/security/login-notifications", tags=["Supply Chain Profile"] )
def update_login_notifications(
    payload: db.LoginNotificationUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):

    current_user.login_email_notifications = ( payload.enabled )

    database.commit()

    return { "success": True, "enabled": payload.enabled }


@app.get( "/api/profile/managers", tags=["Supply Chain Profile"] )
def get_reporting_managers( database: Session = Depends(db.get_db), current_user: db.User = Depends(crud.get_current_user) ):

    managers = ( database .query(db.User) .filter( db.User.active == True, db.User.id != current_user.id ) .order_by( db.User.name.asc() ) .all() )

    return {
        "success": True,
        "managers": [
            { "id": user.id, "name": user.name, "role": user.role }
            for user in managers
        ]
    }


@app.get( "/api/profile/activity", tags=["Supply Chain Profile"] )
def get_my_activity(
    limit: int = Query( 10, ge=1, le=100 ),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):

    logs = (
        database .query(db.AuditLog) .filter( db.AuditLog.user_id == current_user.id )
        .order_by( db.AuditLog.created_at.desc() ) .limit(limit) .all()
    )


    return {
        "success": True,
        "items": [
            {
                "id": log.id,
                "action": log.action,
                "description": log.description,
                "ip_address": log.ip_address,
                "status": log.status,
                "created_at":
                    (
                        log.created_at.isoformat()
                        if log.created_at
                        else None
                    )
            }
            for log in logs
        ]
    }


@app.put( "/api/profile/preferences", tags=["Supply Chain Profile"] )
def update_my_preferences(
    payload: db.ProfilePreferencesUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):

    preferences = ( database .query(db.UserPreferences) .filter( db.UserPreferences.user_id == current_user.id ) .first() )


    if not preferences:
        preferences = db.UserPreferences( user_id=current_user.id )
        database.add( preferences )


    preferences.language = ( payload.language )

    preferences.timezone = ( payload.timezone )

    preferences.date_format = ( payload.date_format )

    preferences.time_format = ( payload.time_format )

    preferences.currency = ( payload.currency )


    if payload.theme:
        preferences.theme = ( payload.theme )


    database.commit()

    database.refresh( preferences )


    crud.create_audit_log(
        database, current_user,
        "UPDATE", "Updated profile preferences",
        "user_preferences", str(preferences.id)
    )


    return { "success": True, "message": "Preferences updated successfully." }


@app.post( "/api/profile/photo", tags=["Supply Chain Profile"] )
async def upload_profile_photo(
    file: UploadFile = File(...),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):

    allowed_types = { "image/jpeg", "image/png", "image/webp" }


    if file.content_type not in allowed_types:
        raise HTTPException( status_code=400, detail="Only JPG, PNG and WEBP images are allowed." )


    upload_dir = Path( "static/uploads/profile" )

    upload_dir.mkdir( parents=True, exist_ok=True )


    extension = ( Path(file.filename).suffix or ".jpg" )


    filename = ( f"user_{current_user.id}_" f"{uuid.uuid4().hex}" f"{extension}" )


    file_path = ( upload_dir / filename )


    contents = await file.read()


    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException( status_code=400, detail="Maximum profile image size is 5 MB." )


    with open( file_path, "wb" ) as output:
        output.write( contents )


    current_user.profile_image = ( f"static/uploads/profile/{filename}" )


    database.commit()

    database.refresh( current_user )


    return {
        "success": True,
        "message": "Profile photo uploaded successfully.",
        "profile_image": current_user.profile_image
    }


# ============================================================
# FINANCE OFFICER DASHBOARD
# ============================================================

@app.get( "/api/finance/officer-dashboard", response_model=db.FinanceOfficerDashboardResponse, tags=["Financer Dashboard"] )
def finance_officer_dashboard( database: Session = Depends( db.get_db ), current_user: db.User = Depends( crud.require_finance_officer ) ):

    try:
        return crud.get_finance_officer_dashboard( database, current_user )

    except HTTPException:
        raise

    except Exception as exc:
        print( "Finance dashboard error:", repr(exc) )
        raise HTTPException( status_code=500, detail=( f"Unable to load Finance Officer dashboard: {str(exc)}" ) )


@app.get( "/api/finance/profile", tags=["Financer Profile"] )
def get_finance_profile( current_user: db.User = Depends(crud.require_finance_officer), database: Session = Depends(db.get_db) ):
    """
    Return the logged-in Finance Officer profile.
    """

    user = ( database.query(db.User) .filter( db.User.id == current_user.id ) .first() )

    if user is None:
        raise HTTPException( status_code=404, detail="User profile not found" )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "mobile": user.mobile,
        "gender": user.gender,
        "address": user.address,
        "role": user.role or "Finance Officer",
        "active": user.active
    }


# ============================================================
# BUDGET MANAGEMENT
# ============================================================

@app.get( "/api/finance/budget-management", response_model=db.BudgetManagementResponse, tags=["Financer Dashboard"] )
def budget_management_dashboard(
    year: Optional[int] = Query( None, ge=2000, le=2100 ), database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    try:
        return crud.get_budget_management_dashboard( database, current_user, year )

    except HTTPException:
        raise

    except Exception as exc:
        print( "Budget management error:", repr(exc) )
        raise HTTPException( status_code=500, detail=( "Unable to load budget management: " f"{str(exc)}" ) )


@app.post( "/api/finance/budget-management", tags=["Financer Dashboard"] )
def create_finance_budget(
    request: db.BudgetCreateRequest, database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    return crud.create_budget( database, current_user, request )


@app.post( "/api/finance/budget-management/{budget_id}/allocate", tags=["Financer Dashboard"] )
def allocate_finance_budget(
    budget_id: int, request: db.BudgetAllocateRequest,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    if request.budget_id != budget_id: raise HTTPException( status_code=400, detail="Budget ID mismatch." )

    return crud.allocate_budget( database, current_user, budget_id, request.amount )


@app.post( "/api/finance/budget-management/transfer", tags=["Financer Dashboard"] )
def transfer_finance_budget(
    request: db.BudgetTransferRequest, database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    return crud.transfer_budget(
        database, current_user, request.from_budget_id, request.to_budget_id, request.amount
    )


# ============================================================
# FINANCE EXPENDITURES
# ============================================================

@app.get( "/api/finance/expenditures", tags=["Financer Dashboard"] )
def finance_expenditures(
    year: int | None = Query( default=None, ge=2000, le=2100 ), database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    try:
        return crud.get_finance_expenditures( database, current_user, year )

    except HTTPException:
        raise

    except Exception as exc:
        print( "Finance expenditures error:", repr(exc) )
        raise HTTPException( status_code=500, detail=( "Unable to load expenditures: " + str(exc) ) )


# ============================================================
# CREATE EXPENDITURE
# ============================================================

@app.post( "/api/finance/expenditures", tags=["Financer Dashboard"] )
def create_finance_expenditure(
    payload: db.ExpenditureCreate, database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    try:
        transaction = db.FinanceTransaction(
            transaction_date= payload.transaction_date,
            transaction_type="expense",
            category= payload.category.strip(),
            department=( payload.department.strip()
                if payload.department
                else None
            ),
            amount=payload.amount,
            status=payload.status
        )

        database.add(transaction)

        database.commit()

        database.refresh(transaction)


        # Audit log if your existing
        # create_audit_log is available.

        try:
            crud.create_audit_log(
                database, current_user,
                "CREATE", "Created finance expenditure",
                "finance_transactions", str(transaction.id)
            )

        except Exception:
            # Do not fail the expense creation
            # just because audit logging fails.
            database.rollback()


        return {
            "success": True,
            "message": "Expense created successfully.",
            "expense": {
                "id": transaction.id,
                "transaction_date": transaction.transaction_date.isoformat(),
                "category": transaction.category,
                "department": transaction.department,
                "amount": float(transaction.amount),
                "status": transaction.status
            }
        }

    except HTTPException:
        raise

    except Exception as exc:
        database.rollback()
        raise HTTPException( status_code=500, detail=( "Unable to create expense: " + str(exc) ) )


# ============================================================
# EXPORT EXPENDITURES CSV
# ============================================================

@app.get( "/api/finance/expenditures/export", tags=["Financer Dashboard"] )
def export_finance_expenditures(
    year: int = Query( ..., ge=2000, le=2100 ), database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    start_date = date( year, 1, 1 )

    end_date = date( year, 12, 31 )

    rows = ( database.query( db.FinanceTransaction )
        .filter( db.FinanceTransaction.transaction_type == "expense" )
        .filter( db.FinanceTransaction.transaction_date >= start_date )
        .filter( db.FinanceTransaction.transaction_date <= end_date )
        .order_by( db.FinanceTransaction.transaction_date.desc() ) .all()
    )

    output = io.StringIO()

    writer = csv.writer(output)

    writer.writerow([ "ID", "Date", "Category", "Department", "Amount", "Status" ])

    for row in rows:
        writer.writerow([
            row.id, row.transaction_date, row.category, row.department, row.amount, row.status
        ])

    output.seek(0)

    return StreamingResponse( iter([output.getvalue()]), media_type="text/csv", headers={ "Content-Disposition": f'attachment; filename="expenses-{year}.csv"' } )


# ==================================================================
# REVENUE DASHBOARD API
# ==================================================================

@app.get( "/api/finance/revenue-dashboard", response_model=db.FinanceRevenueDashboardResponse, tags=["Financer Dashboard"] )
def finance_revenue_dashboard(
    year: int = Query( datetime.now().year, ge=2000, le=2100 ),
    month: int = Query( datetime.now().month, ge=1, le=12 ),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    try:
        return crud.get_finance_revenue_dashboard( database, current_user, year, month )

    except HTTPException:
        raise

    except Exception as exc:
        print( "Revenue dashboard error:", repr(exc) )
        raise HTTPException( status_code=500, detail=( "Unable to load revenue dashboard: " f"{str(exc)}" ) )


# ============================================================
# ACCOUNTS PAYABLE DASHBOARD API
# ============================================================

@app.get( "/api/finance/accounts-payable/dashboard", response_model=db.AccountsPayableDashboardResponse, tags=["Financer Dashboard"] )
def accounts_payable_dashboard(
    from_date: Optional[date] = Query( None ), to_date: Optional[date] = Query( None ),
    page: int = Query( 1, ge=1 ), page_size: int = Query( 5, ge=1, le=100 ),
    search: Optional[str] = Query( None ), database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    try:
        return crud.get_accounts_payable_dashboard(
            database=database, from_date=from_date, to_date=to_date, page=page, page_size=page_size, search=search
        )

    except Exception as exc:
        database.rollback()
        raise HTTPException( status_code=500, detail=( "Unable to load Accounts Payable " f"dashboard: {str(exc)}" ) )


@app.get( "/api/finance/accounts-payable/bills", tags=["Financer Dashboard"] )
def accounts_payable_bills(
    page: int = Query(1, ge=1),
    page_size: int = Query( 10, ge=1, le=100 ),
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    query = database.query( db.FinancePayable )

    if search:
        value = f"%{search.strip()}%"
        query = query.filter(
            or_(
                db.FinancePayable.invoice_no.ilike( value ), db.FinancePayable.vendor.ilike( value )
            )
        )

    if status_filter:

        normalized = ( status_filter.strip().lower() )

        if normalized == "overdue":
            query = query.filter( db.FinancePayable.due_date < date.today(),
                func.lower( db.FinancePayable.payment_status
                ).notin_( [ "paid", "cancelled", "canceled" ] )
            )

        elif normalized != "all":
            query = query.filter( func.lower( db.FinancePayable.payment_status ) == normalized )

    total = query.count()

    offset = ( (page - 1) * page_size )

    rows = ( query .order_by( db.FinancePayable.due_date.desc(), db.FinancePayable.id.desc() ) .offset(offset) .limit(page_size) .all() )

    today = date.today()

    items = []

    for bill in rows:

        status = ( str( bill.payment_status or "Pending" ) )

        if ( bill.due_date and bill.due_date < today and status.lower() not in { "paid", "cancelled", "canceled" } ):
            status = "Overdue"

        items.append({
            "id": bill.id,
            "invoice_no": bill.invoice_no,
            "vendor": bill.vendor,
            "bill_date": ( bill.bill_date.isoformat()
                if getattr( bill, "bill_date", None )
                else None
            ),
            "due_date": ( bill.due_date.isoformat()
                if bill.due_date
                else None
            ),
            "amount": float( bill.amount or 0 ),
            "status": status
        })

    return {
        "items": items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "pages": ( (total + page_size - 1) // page_size
                if total
                else 1
            )
        }
    }


# ============================================================
# ACCOUNTS PAYABLE - CREATE BILL
# ============================================================

@app.post(
    "/api/finance/accounts-payable/bills",
    tags=["Financer Dashboard"]
)
def create_accounts_payable_bill(
    bill: db.APBillCreate,
    database: Session = Depends(
        db.get_db
    ),
    current_user: db.User = Depends(
        crud.require_finance_officer
    )
):

    try:

        return crud.create_accounts_payable_bill(
            database=database,
            bill=bill
        )

    except HTTPException:
        raise

    except Exception as exc:

        database.rollback()

        print(
            "Create AP bill error:",
            repr(exc)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to create bill: "
                f"{str(exc)}"
            )
        )


# ============================================================
# ACCOUNTS PAYABLE - GET BILL
# ============================================================

@app.get(
    "/api/finance/accounts-payable/bills/{bill_id}",
    tags=["Financer Dashboard"]
)
def get_accounts_payable_bill(
    bill_id: int,
    database: Session = Depends(
        db.get_db
    ),
    current_user: db.User = Depends(
        crud.require_finance_officer
    )
):

    bill = crud.get_accounts_payable_bill(
        database,
        bill_id
    )

    if not bill:

        raise HTTPException(
            status_code=404,
            detail="Bill not found."
        )

    return {

        "id": bill.id,

        "invoice_no":
            bill.invoice_no,

        "vendor":
            bill.vendor,

        "amount":
            float(bill.amount or 0),

        "bill_date": (
            bill.bill_date.isoformat()
            if bill.bill_date
            else None
        ),

        "due_date": (
            bill.due_date.isoformat()
            if bill.due_date
            else None
        ),

        "status":
            bill.payment_status
    }


# ============================================================
# ACCOUNTS PAYABLE - RECORD PAYMENT
# ============================================================

@app.post(
    "/api/finance/accounts-payable/payments",
    tags=["Financer Dashboard"]
)
def create_accounts_payable_payment(
    payment: db.APPaymentCreate,
    database: Session = Depends(
        db.get_db
    ),
    current_user: db.User = Depends(
        crud.require_finance_officer
    )
):

    try:

        return crud.create_accounts_payable_payment(
            database=database,
            payment=payment
        )

    except HTTPException:
        raise

    except Exception as exc:

        database.rollback()

        print(
            "Record AP payment error:",
            repr(exc)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to record payment: "
                f"{str(exc)}"
            )
        )


# ============================================================
# ACCOUNTS PAYABLE - PAYMENT HISTORY
# ============================================================

@app.get(
    "/api/finance/accounts-payable/payments",
    tags=["Financer Dashboard"]
)
def accounts_payable_payments(
    page: int = Query(
        1,
        ge=1
    ),

    page_size: int = Query(
        20,
        ge=1,
        le=100
    ),

    search: Optional[str] = Query(
        None
    ),

    status: Optional[str] = Query(
        None
    ),

    database: Session = Depends(
        db.get_db
    ),

    current_user: db.User = Depends(
        crud.require_finance_officer
    )
):

    try:

        return crud.get_accounts_payable_payments(
            database=database,
            search=search,
            status=status,
            page=page,
            page_size=page_size
        )

    except Exception as exc:

        database.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to load payments: "
                f"{str(exc)}"
            )
        )


# ============================================================
# ACCOUNTS PAYABLE - EXPORT CSV
# ============================================================

@app.get(
    "/api/finance/accounts-payable/export",
    tags=["Financer Dashboard"]
)
def export_accounts_payable(
    status_filter: Optional[str] = Query(
        None
    ),

    database: Session = Depends(
        db.get_db
    ),

    current_user: db.User = Depends(
        crud.require_finance_officer
    )
):

    query = database.query(
        db.FinancePayable
    )

    if status_filter:

        normalized = (
            status_filter
            .strip()
            .lower()
        )

        if normalized == "overdue":

            query = query.filter(
                db.FinancePayable.due_date
                < date.today(),

                func.lower(
                    db.FinancePayable.payment_status
                ).notin_(
                    [
                        "paid",
                        "cancelled",
                        "canceled"
                    ]
                )
            )

        elif normalized != "all":

            query = query.filter(
                func.lower(
                    db.FinancePayable.payment_status
                )
                ==
                normalized
            )

    rows = (
        query
        .order_by(
            db.FinancePayable.due_date.desc(),
            db.FinancePayable.id.desc()
        )
        .all()
    )

    output = io.StringIO()

    writer = csv.writer(output)

    writer.writerow([
        "ID",
        "Invoice No",
        "Vendor",
        "Bill Date",
        "Due Date",
        "Amount",
        "Status"
    ])

    today = date.today()

    for bill in rows:

        status_value = (
            str(
                bill.payment_status
                or "Pending"
            )
        )

        if (
            bill.due_date
            and bill.due_date < today
            and status_value.lower()
            not in {
                "paid",
                "cancelled",
                "canceled"
            }
        ):

            status_value = "Overdue"

        writer.writerow([

            bill.id,

            bill.invoice_no,

            bill.vendor,

            bill.bill_date,

            bill.due_date,

            bill.amount,

            status_value
        ])

    output.seek(0)

    return StreamingResponse(

        iter([
            output.getvalue()
        ]),

        media_type="text/csv",

        headers={
            "Content-Disposition":
                'attachment; filename="accounts-payable.csv"'
        }
    )


# ============================================================
# ACCOUNTS RECEIVABLE DASHBOARD
# ============================================================

@app.get( "/api/finance/accounts-receivable/dashboard", tags=["Financer Dashboard"] )
def accounts_receivable_dashboard(
    year: Optional[int] = Query( None, ge=2000, le=2100 ),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    if ( from_date and to_date and from_date > to_date ):
        raise HTTPException( status_code=400, detail="from_date cannot be after to_date." )

    return crud.get_accounts_receivable_dashboard( database, year=year, from_date=from_date, to_date=to_date )


@app.get( "/api/finance/accounts-receivable/invoices", tags=["Financer Dashboard"] )
def accounts_receivable_invoices(
    page: int = Query( 1, ge=1 ),
    page_size: int = Query( 5, ge=1, le=100 ),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    query = ( database .query(db.Invoice)
        .join( db.Customer, db.Invoice.customer_id == db.Customer.id, isouter=True )
        .options( joinedload(db.Invoice.customer), joinedload(db.Invoice.payments) ) )

    if search:
        value = f"%{search.strip()}%"
        query = query.filter( or_(
                db.Invoice.invoice_number.ilike( value ),
                db.Customer.customer_name.ilike( value )
            )
        )

    if status:
        status_value = ( status.strip().lower() )

        # Status is calculated below,
        # therefore we filter after loading.

    invoices = ( query .order_by( db.Invoice.invoice_date.desc(), db.Invoice.id.desc() ) .all() )

    today = date.today()

    result = []

    for invoice in invoices:
        calculated_status = ( crud.ar_invoice_status( invoice, today ) )

        if ( status and status.lower() != calculated_status.lower() ):
            continue

        result.append({
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "customer_id": getattr( invoice, "customer_id", None ),
            "customer_name": ( invoice.customer.customer_name if invoice.customer else "Unknown Customer" ),
            "invoice_date": ( invoice.invoice_date.isoformat() if invoice.invoice_date else None ),
            "due_date": ( invoice.due_date.isoformat() if invoice.due_date else None ),
            "amount": float(invoice.amount or 0),
            "balance_due": crud.ar_balance_due( invoice ),
            "status": calculated_status,
            "days_outstanding": crud.ar_days_outstanding( invoice, today )
        })

    total = len(result)
    start = ( (page - 1) * page_size )
    end = start + page_size
    items = result[start:end]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max( 1, ( total + page_size - 1 ) // page_size )
    }


@app.get( "/api/finance/accounts-receivable/customers", tags=["Financer Dashboard"] )
def accounts_receivable_customers(
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    customers = ( database .query(db.Customer) .order_by( db.Customer.customer_name.asc() ) .all() )

    return [
        {
            "id": customer.id,
            "customer_code": customer.customer_code,
            "customer_name": customer.customer_name
        }
        for customer in customers
    ]


@app.post( "/api/finance/accounts-receivable/invoices", status_code=201, tags=["Financer Dashboard"] )
def create_ar_invoice(
    invoice_data: db.ARInvoiceCreate,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    customer = ( database .query(db.Customer) .filter( db.Customer.id == invoice_data.customer_id ) .first() )

    if not customer:
        raise HTTPException( status_code=404, detail="Customer not found." )

    existing = ( database .query(db.Invoice) .filter( db.Invoice.invoice_number == invoice_data.invoice_number ) .first() )

    if existing:
        raise HTTPException( status_code=409, detail="Invoice number already exists." )

    invoice = db.Invoice(
        invoice_number = invoice_data.invoice_number,
        customer_id = invoice_data.customer_id,
        vendor_id = invoice_data.vendor_id,
        po_id = invoice_data.po_id,
        amount = invoice_data.amount,
        status = invoice_data.status,
        invoice_date = invoice_data.invoice_date,
        due_date = invoice_data.due_date
    )

    database.add(invoice)

    database.commit()

    database.refresh(invoice)

    return {
        "success": True,
        "message": "Invoice created successfully.",
        "invoice": { "id": invoice.id, "invoice_number": invoice.invoice_number }
    }


@app.get("/api/finance/accounts-receivable/export", tags=["Financer Dashboard"])
def export_accounts_receivable(
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    year: int | None = Query(None),
    database: Session = Depends(db.get_db)
):
    """
    Export Accounts Receivable invoices as CSV.
    """

    query = database.query(db.Invoice)

    # Date filtering
    if from_date:
        query = query.filter(
            db.Invoice.invoice_date >= from_date
        )

    if to_date:
        query = query.filter(
            db.Invoice.invoice_date <= to_date
        )

    if year:
        query = query.filter(
            db.Invoice.invoice_date >= date(year, 1, 1),
            db.Invoice.invoice_date < date(year + 1, 1, 1)
        )

    invoices = query.order_by( db.Invoice.invoice_date.desc() ).all()

    output = io.StringIO()

    writer = csv.writer(output)

    writer.writerow([
        "Invoice ID",
        "Invoice Number",
        "Customer",
        "Invoice Date",
        "Due Date",
        "Total Amount",
        "Paid Amount",
        "Outstanding Amount",
        "Status"
    ])

    for invoice in invoices:

        # Customer
        customer = None

        if getattr(invoice, "customer_id", None):
            customer = database.query(db.Customer).filter( db.Customer.id == invoice.customer_id ).first()

        customer_name = ""

        if customer:
            customer_name = ( getattr(customer, "name", None) or getattr(customer, "customer_name", None)
                or getattr(customer, "company_name", None) or getattr(customer, "legal_entity_name", None)
                or ""
            )

        # Invoice amount
        total_amount = (
            getattr(invoice, "total_amount", None) or getattr(invoice, "grand_total", None)
            or getattr(invoice, "amount", None) or Decimal("0")
        )

        total_amount = Decimal(str(total_amount))

        # Payments
        payments = database.query(db.Payment).filter( db.Payment.invoice_id == invoice.id ).all()

        paid_amount = sum(
            (
                Decimal( str( getattr(payment, "amount", None) or 0 ) )
                for payment in payments
            ),
            Decimal("0")
        )

        outstanding = max( total_amount - paid_amount, Decimal("0") )

        if outstanding <= 0:
            status = "Paid"

        elif ( getattr(invoice, "due_date", None) and invoice.due_date < date.today() ):
            status = "Overdue"

        else:
            status = "Outstanding"

        writer.writerow([
            invoice.id, getattr(invoice, "invoice_number", "") or "", customer_name,
            getattr(invoice, "invoice_date", "") or "", getattr(invoice, "due_date", "") or "",
            f"{total_amount:.2f}", f"{paid_amount:.2f}", f"{outstanding:.2f}", status ])

    output.seek(0)

    filename = "accounts_receivable.csv"

    return StreamingResponse(
        iter([output.getvalue()]), media_type="text/csv",
        headers={ "Content-Disposition": f'attachment; filename="{filename}"' }
    )


@app.post( "/api/finance/accounts-receivable/payments", status_code=201, tags=["Financer Dashboard"] )
def record_ar_payment(
    payment_data: db.ARPaymentCreate,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    invoice = ( database .query(db.Invoice) .options( joinedload( db.Invoice.payments ) )
        .filter( db.Invoice.id == payment_data.invoice_id ) .first()
    )

    if not invoice:
        raise HTTPException( status_code=404, detail="Invoice not found." )

    paid_amount = crud.ar_payment_total( invoice )

    balance = ( float(invoice.amount or 0) - paid_amount )

    if payment_data.amount > balance:
        raise HTTPException( status_code=400, detail=( "Payment amount cannot exceed the invoice balance." ) )

    payment = db.Payment(
        invoice_id = payment_data.invoice_id,
        payment_reference = payment_data.payment_reference,
        payment_date = payment_data.payment_date,
        amount = payment_data.amount,
        payment_method = payment_data.payment_method,
        status = payment_data.status,
        transaction_id = payment_data.transaction_id,
        notes = payment_data.notes
    )

    database.add(payment)

    database.flush()

    new_paid = ( paid_amount + payment_data.amount )

    if new_paid >= float( invoice.amount or 0 ):
        invoice.status = "Paid"
        invoice.paid_date = ( payment_data.payment_date )

    elif invoice.due_date:
        if invoice.due_date < date.today():
            invoice.status = "Overdue"

        else:
            invoice.status = "Pending"

    database.commit()

    database.refresh(payment)

    return {
        "success": True,
        "message": "Payment recorded successfully.",
        "payment": { "id": payment.id, "invoice_id": payment.invoice_id, "amount": float(payment.amount) }
    }


# ============================================================
# 1. CUSTOMER STATEMENTS
# ============================================================

@app.get("/api/finance/accounts-receivable/customer-statements", tags=["Financer Dashboard"])
def get_customer_statement(
    customer_id: int = Query(...),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    database: Session = Depends(db.get_db)
):
    """
    Returns customer statement containing:
    - Opening balance
    - Invoices
    - Payments
    - Credits
    - Running balance
    """

    customer = ( database.query(db.Customer) .filter(db.Customer.id == customer_id) .first() )

    if not customer:
        raise HTTPException( status_code=404, detail="Customer not found" )

    if from_date and to_date and from_date > to_date:
        raise HTTPException( status_code=400, detail="from_date cannot be after to_date" )

    # --------------------------------------------------------
    # Get invoices
    # --------------------------------------------------------

    invoice_query = ( database.query(db.Invoice) .filter(db.Invoice.customer_id == customer_id) )

    if to_date:
        invoice_query = invoice_query.filter( func.date( db.Invoice.invoice_date ) <= to_date )

    invoices = invoice_query.all()

    # --------------------------------------------------------
    # Opening balance
    # --------------------------------------------------------

    opening_balance = 0

    if from_date:
        opening_invoices = ( database.query(db.Invoice) .filter(
                db.Invoice.customer_id == customer_id,
                func.date( db.Invoice.invoice_date ) < from_date
            ) .all()
        )

        for invoice in opening_invoices:
            opening_balance += crud.invoice_outstanding( invoice, database )

    # --------------------------------------------------------
    # Transactions
    # --------------------------------------------------------

    transactions = []

    total_invoiced = 0
    total_payments = 0

    for invoice in invoices:

        invoice_date = crud.get_invoice_date(invoice)

        if not invoice_date:
            continue

        if from_date and invoice_date < from_date:
            continue

        if to_date and invoice_date > to_date:
            continue

        total = crud.invoice_total(invoice)

        total_invoiced += total

        transactions.append({
            "date": crud.serialize_date(invoice_date),
            "reference": getattr( invoice, "invoice_number", None ) or f"INV-{invoice.id}",
            "type": "Invoice",
            "description": ( getattr(invoice, "description", None) or "Customer invoice" ),
            "debit": total,
            "credit": 0,
            "invoice_id": invoice.id
        })

    # --------------------------------------------------------
    # Payments
    # --------------------------------------------------------

    payment_query = ( database.query(db.Payment) .filter( db.Payment.customer_id == customer_id ) )

    if from_date:
        payment_query = payment_query.filter( func.date( db.Payment.payment_date ) >= from_date )

    if to_date:
        payment_query = payment_query.filter( func.date( db.Payment.payment_date ) <= to_date )

    payments = payment_query.all()

    for payment in payments:
        payment_date = (
            getattr(payment, "payment_date", None)
            or getattr(payment, "created_at", None)
        )

        if isinstance(payment_date, datetime):
            payment_date = payment_date.date()

        amount = crud.decimal_value( getattr(payment, "amount", None) )

        total_payments += amount

        transactions.append({
            "date": crud.serialize_date(payment_date),
            "reference": (
                getattr( payment, "reference", None )
                or getattr( payment, "payment_reference", None )
                or f"PAY-{payment.id}"
            ),
            "type": "Payment",
            "description": ( getattr(payment, "description", None) or "Customer payment" ),
            "debit": 0,
            "credit": amount,
            "payment_id": payment.id
        })

    # --------------------------------------------------------
    # Sort transactions
    # --------------------------------------------------------

    transactions.sort( key=lambda x: x["date"] or "" )

    # --------------------------------------------------------
    # Running balance
    # --------------------------------------------------------

    balance = opening_balance

    for transaction in transactions:
        balance += ( transaction["debit"] - transaction["credit"] )
        transaction["balance"] = round( balance, 2 )

    return {
        "customer_id": customer.id,
        "customer_name": crud.get_customer_name(customer),
        "from_date": crud.serialize_date(from_date),
        "to_date": crud.serialize_date(to_date),
        "opening_balance": round(opening_balance, 2),
        "total_invoiced": round(total_invoiced, 2),
        "total_payments": round(total_payments, 2),
        "outstanding": round(balance, 2),
        "transactions": transactions
    }


# ============================================================
# 2. OVERDUE INVOICES
# ============================================================

@app.get("/api/finance/accounts-receivable/overdue", tags=["Financer Dashboard"])
def get_overdue_invoices(
    search: str | None = Query(None),
    aging: str | None = Query(None),
    database: Session = Depends(db.get_db)
):
    """
    Returns all invoices where:
        due_date < today
    and:
        outstanding amount > 0
    """

    today = date.today()

    query = ( database.query(db.Invoice) .filter( func.date( db.Invoice.due_date ) < today ) )

    invoices = query.all()

    results = []

    for invoice in invoices:
        outstanding = crud.invoice_outstanding( invoice, database )

        if outstanding <= 0:
            continue

        invoice_date = crud.get_invoice_date(invoice)
        due_date = crud.get_due_date(invoice)

        if not due_date:
            continue

        days_overdue = ( today - due_date ).days

        customer = None

        customer_id = getattr( invoice, "customer_id", None )

        if customer_id:
            customer = ( database.query(db.Customer) .filter( db.Customer.id == customer_id ) .first() )

        customer_name = crud.get_customer_name(customer)

        # ----------------------------------------------------
        # Search
        # ----------------------------------------------------

        if search:
            search_text = " ".join([
                str( getattr( invoice, "invoice_number", "" ) ),
                customer_name,
                str( getattr( invoice, "reference", "" ) ) ]).lower()

            if search.lower() not in search_text:
                continue

        # ----------------------------------------------------
        # Aging filter
        # ----------------------------------------------------

        if aging == "1-30":
            if not 1 <= days_overdue <= 30:
                continue

        elif aging == "31-60":
            if not 31 <= days_overdue <= 60:
                continue

        elif aging == "61-90":
            if not 61 <= days_overdue <= 90:
                continue

        elif aging == "90+":
            if days_overdue <= 90:
                continue

        results.append({
            "id": invoice.id,
            "invoice_number": getattr( invoice, "invoice_number", None ) or f"INV-{invoice.id}",
            "customer_id": customer_id,
            "customer_name": customer_name,
            "invoice_date": crud.serialize_date(invoice_date),
            "due_date": crud.serialize_date(due_date),
            "days_overdue": days_overdue,
            "invoice_amount": round( crud.invoice_total(invoice), 2 ),
            "total_amount": round( crud.invoice_total(invoice), 2 ),
            "paid_amount": round( crud.invoice_paid( invoice, database ), 2 ),
            "outstanding_amount": round( outstanding, 2 ),
            "status": "Overdue"
        })

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    total_overdue = sum(
        item["outstanding_amount"]
        for item in results
    )

    longest_overdue = max(
        (
            item["days_overdue"]
            for item in results
        ),
        default=0
    )

    customer_count = len(
        set(
            item["customer_id"]
            for item in results
            if item["customer_id"] is not None
        )
    )

    return {
        "invoice_count": len(results),
        "total_overdue": round(total_overdue, 2),
        "longest_overdue": longest_overdue,
        "customer_count": customer_count,
        "invoices": results
    }


# ============================================================
# 3. AGING REPORT
# ============================================================

@app.get("/api/finance/accounts-receivable/aging", tags=["Financer Dashboard"])
def get_aging_report(
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    database: Session = Depends(db.get_db)
):
    """
    AR Aging buckets:

    Current
    0-30
    31-60
    61-90
    91-120
    120+
    """

    today = to_date or date.today()

    query = database.query(db.Invoice)

    if from_date:
        query = query.filter( func.date( db.Invoice.invoice_date ) >= from_date )

    if to_date:
        query = query.filter( func.date( db.Invoice.invoice_date ) <= to_date )

    invoices = query.all()

    # --------------------------------------------------------
    # Overall buckets
    # --------------------------------------------------------

    buckets = { "current": 0, "0-30": 0, "31-60": 0, "61-90": 0, "91-120": 0, "120+": 0 }

    # --------------------------------------------------------
    # Customer buckets
    # --------------------------------------------------------

    customer_data = {}

    for invoice in invoices:
        outstanding = crud.invoice_outstanding( invoice, database )

        if outstanding <= 0:
            continue

        due_date = crud.get_due_date(invoice)

        if not due_date:
            continue

        customer_id = getattr( invoice, "customer_id", None )

        customer = None

        if customer_id:
            customer = ( database.query(db.Customer) .filter( db.Customer.id == customer_id ) .first() )

        customer_name = crud.get_customer_name(customer)

        if customer_id not in customer_data:
            customer_data[customer_id] = {
                "customer_id": customer_id,
                "customer_name": customer_name,
                "current": 0,
                "0-30": 0,
                "31-60": 0,
                "61-90": 0,
                "91-120": 0,
                "120+": 0,
                "total": 0
            }

        days_overdue = ( today - due_date ).days

        if days_overdue < 0:
            bucket = "current"

        elif days_overdue <= 30:
            bucket = "0-30"

        elif days_overdue <= 60:
            bucket = "31-60"

        elif days_overdue <= 90:
            bucket = "61-90"

        elif days_overdue <= 120:
            bucket = "91-120"

        else:
            bucket = "120+"

        buckets[bucket] += outstanding

        customer_data[ customer_id ][bucket] += outstanding

        customer_data[ customer_id ]["total"] += outstanding

    # --------------------------------------------------------
    # Round values
    # --------------------------------------------------------

    for key in buckets:
        buckets[key] = round( buckets[key], 2 )

    customers = list( customer_data.values() )

    for customer in customers:
        for key in [ "current", "0-30", "31-60", "61-90", "91-120", "120+", "total" ]:
            customer[key] = round( customer[key], 2 )

    total_receivables = sum( buckets.values() )

    return {
        "from_date": crud.serialize_date(from_date),
        "to_date": crud.serialize_date(to_date),
        "total_receivables": round( total_receivables, 2 ),
        "aging": buckets,
        "customers": customers
    }


# ============================================================
# BANKING & RECONCILIATION DASHBOARD
# ============================================================

@app.get( "/api/finance/banking-reconciliation", response_model=db.BankingDashboardResponse, tags=["Financer Dashboard"] )
def banking_reconciliation_dashboard(
    from_date: Optional[date] = Query( None ), to_date: Optional[date] = Query( None ),
    database: Session = Depends( db.get_db ), current_user: db.User = Depends( crud.require_finance_officer )
):

    try:
        return ( crud.get_banking_reconciliation_dashboard( database, current_user, from_date, to_date ) )

    except HTTPException:
        raise

    except Exception as exc:
        print( "Banking dashboard error:", repr(exc) )
        raise HTTPException( status_code=500, detail=( "Unable to load Banking & Reconciliation dashboard." ) )


# ============================================================
# COMPLIANCE PAGE
# ============================================================

@app.get( "/api/compliance/dashboard", response_model=db.ComplianceDashboardResponse, tags=["Financer Dashboard"] )
def get_compliance_dashboard_page(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.get_current_user )
):

    return crud.get_compliance_page( database )


@app.get( "/api/finance/approvals/dashboard", response_model=db.FinanceApprovalDashboardResponse, tags=["Financer Dashboard"] )
def finance_approval_dashboard(
    start_date: Optional[date] = Query(None), end_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None), page: int = Query( 1, ge=1 ),
    page_size: int = Query( 5, ge=1, le=100 ), database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    try:
        return crud.get_finance_approval_dashboard(
            database=database,
            current_user=current_user,
            start_date=start_date,
            end_date=end_date,
            page=page,
            page_size=page_size,
            search=search
        )

    except HTTPException:
        raise

    except Exception as exc:
        print( "Finance approval dashboard error:", repr(exc) )
        raise HTTPException( status_code=500, detail=( "Unable to load approval dashboard: " f"{str(exc)}" ) )


# ============================================================
# FINANCE APPROVAL REQUESTS LIST
# ============================================================

@app.get( "/api/finance/approval-requests/my", tags=["Financer Dashboard"] )
def get_finance_approval_requests(
    database: Session = Depends(db.get_db), current_user: db.User = Depends( crud.require_finance_officer )
):

    try:
        workflows = ( database.query(db.ApprovalWorkflow) .order_by( db.ApprovalWorkflow.created_at.desc() ) .all() )

        requests = []

        for workflow in workflows:
            requests.append({
                "id": workflow.id,
                "request_id": workflow.reference_number or f"APR-{workflow.id}",
                "title": workflow.title or "Approval Request",
                "request_type": workflow.reference_type or "General",
                "amount": float(workflow.amount or 0),
                "status": workflow.status or "Pending",
                "priority": workflow.priority or "Medium",
                "department": workflow.department or "-",
                "current_step": workflow.current_step or 1,
                "created_at": workflow.created_at.isoformat()
                    if workflow.created_at
                    else None,
                "requested_by": workflow.requested_by.name
                    if getattr(workflow, "requested_by", None)
                    else None
            })
        return requests


    except Exception as exc:
        print( "Finance approval requests error:", repr(exc) )
        raise HTTPException( status_code=500, detail=( "Unable to load approval requests: " f"{str(exc)}" ) )


@app.get( "/api/finance/approvals/{workflow_id}", tags=["Financer Dashboard"] )
def get_financer_approval_details(
    workflow_id: int, database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    workflow = ( database.query( db.ApprovalWorkflow )
        .filter( db.ApprovalWorkflow.id == workflow_id ) .first()
    )

    if not workflow:
        raise HTTPException( status_code=404, detail="Approval not found" )

    steps = ( database.query( db.ApprovalStep )
        .filter( db.ApprovalStep.workflow_id == workflow_id )
        .order_by( db.ApprovalStep.step_order.asc() ) .all()
    )

    return {
        "workflow": {
            "id": workflow.id,
            "reference_type": workflow.reference_type,
            "reference_number": workflow.reference_number,
            "title": workflow.title,
            "requested_by": ( workflow.requested_by.name if workflow.requested_by else None ),
            "department": workflow.department,
            "amount": float(workflow.amount or 0),
            "priority": workflow.priority,
            "status": workflow.status,
            "current_step": workflow.current_step,
            "created_at": ( workflow.created_at.isoformat() if workflow.created_at else None )
        },

        "steps": [
            {
                "id": step.id,
                "step_order": step.step_order,
                "step_name": step.step_name,
                "approver_user_id": step.approver_user_id,
                "approver_name": ( step.approver.name if step.approver else None ),
                "status": step.status,
                "comments": step.comments,
                "acted_at": ( step.acted_at.isoformat() if step.acted_at else None )
            }
            for step in steps
        ]
    }


@app.post( "/api/finance/approvals/{workflow_id}/decision", tags=["Financer Dashboard"] )
def financer_approval_decision(
    workflow_id: int, payload: db.ApprovalDecision,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    workflow = crud.process_approval_decision(
        database=database,
        workflow_id=workflow_id,
        current_user=current_user,
        decision=payload.status,
        comments=payload.comments
    )

    return {
        "success": True, "message": "Approval updated successfully",
        "workflow_id": workflow.id, "status": workflow.status
    }


# ============================================================
# FINANCE - APPROVAL DELEGATION
# ============================================================


@app.get( "/api/finance/approval-delegations", tags=["Financer Dashboard"] )
def finance_get_approval_delegations(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):
    """
    Get approval delegations created by the
    currently authenticated Finance Officer/Admin.
    """

    # --------------------------------------------------------
    # ACCESS CONTROL
    # --------------------------------------------------------

    if current_user.role not in { "Finance Officer", "Admin" }:
        raise HTTPException( status_code=403, detail="Finance approval delegation access required." )

    return crud.get_approval_delegations( database=database, current_user=current_user )


# ============================================================
# GET USERS AVAILABLE FOR DELEGATION
# ============================================================

@app.get( "/api/finance/approval-delegations/users", tags=["Financer Dashboard"] )
def finance_get_delegation_users(
    database: Session = Depends(db.get_db), current_user: db.User = Depends(crud.get_current_user)
):
    """
    Return active users available as delegates.
    """

    if current_user.role not in { "Finance Officer", "Admin" }:
        raise HTTPException( status_code=403, detail="Finance approval delegation access required." )

    return crud.get_delegation_users( database=database, current_user=current_user )


# ============================================================
# CREATE APPROVAL DELEGATION
# ============================================================

@app.post(
    "/api/finance/approval-delegations", status_code=status.HTTP_201_CREATED, tags=["Financer Dashboard"]
)
def finance_create_approval_delegation(
    delegation_data: db.ApprovalDelegationCreate, database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):
    """
    Create an approval delegation.
    """

    if current_user.role not in { "Finance Officer", "Admin" }:
        raise HTTPException( status_code=403, detail="Finance approval delegation access required." )

    return crud.create_approval_delegation(
        database=database, current_user=current_user, delegation_data=delegation_data
    )


# ============================================================
# REVOKE APPROVAL DELEGATION
# ============================================================

@app.delete( "/api/finance/approval-delegations/{delegation_id}", tags=["Financer Dashboard"] )
def finance_revoke_approval_delegation(
    delegation_id: int, database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):
    """
    Revoke an approval delegation.
    """

    if current_user.role not in { "Finance Officer", "Admin" }:
        raise HTTPException( status_code=403, detail="Finance approval delegation access required." )

    return crud.revoke_approval_delegation( database=database, current_user=current_user, delegation_id=delegation_id )


@app.get( "/api/finance/approval-workflow", tags=["Financer Dashboard"] )
def get_approval_workflow(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):
    try:

        workflow = ( database.query(db.ApprovalWorkflow) .order_by( db.ApprovalWorkflow.created_at.desc() ) .first() )

        # ----------------------------------------------------
        # No workflow
        # ----------------------------------------------------

        if not workflow:
            return {
                "success": True,
                "id": None,
                "reference_type": None,
                "reference_id": None,
                "reference_number": None,
                "title": None,
                "department": None,
                "amount": 0,
                "priority": "Medium",
                "status": "Pending",
                "current_step": 1,
                "steps": []
            }

        # ----------------------------------------------------
        # Steps
        # ----------------------------------------------------

        steps = []

        for step in workflow.steps:
            steps.append({
                "id": step.id,
                "step_number": step.step_order,
                "name": step.step_name,
                "approver": (
                    step.approver.name
                    if step.approver
                    else ""
                ),
                "approver_user_id": step.approver_user_id,
                "description": step.comments or "",
                "status": step.status,
                "acted_at": (
                    step.acted_at.isoformat()
                    if step.acted_at
                    else None
                )
            })

        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        return {
            "success": True,
            "id": workflow.id,
            "reference_type": workflow.reference_type,
            "reference_id": workflow.reference_id,
            "reference_number": workflow.reference_number,
            "title": workflow.title,
            "requested_by": (
                workflow.requested_by.name
                if workflow.requested_by
                else None
            ),
            "department": workflow.department,
            "amount": float(workflow.amount or 0),
            "priority": workflow.priority or "Medium",
            "status": workflow.status,
            "current_step": workflow.current_step,
            "created_at": (
                workflow.created_at.isoformat()
                if workflow.created_at
                else None
            ),
            "steps": steps
        }

    except Exception as e:
        print( "Approval workflow GET error:", repr(e) )
        raise HTTPException( status_code=500, detail=str(e) )


# ============================================================
# CREATE APPROVAL WORKFLOW
# ============================================================

@app.post("/api/finance/approval-workflow", tags=["Financer Dashboard"])
def create_approval_workflow( workflow: db.ApprovalWorkflowCreate, database: Session = Depends(db.get_db) ):
    try:
        result = crud.create_approval_workflow( database=database, workflow=workflow )

        return { "success": True, "message": "Workflow created successfully", "data": result }

    except Exception as e:
        database.rollback()
        raise HTTPException( status_code=500, detail=str(e) )


# ============================================================
# UPDATE APPROVAL WORKFLOW
# ============================================================

@app.put("/api/finance/approval-workflow/{workflow_id}", tags=["Financer Dashboard"])
def update_approval_workflow(
    workflow_id: int,
    workflow: db.ApprovalWorkflowUpdate,
    database: Session = Depends(db.get_db)
):
    try:
        result = crud.update_approval_workflow(
            database=database, workflow_id=workflow_id, workflow=workflow
        )

        if not result:
            raise HTTPException( status_code=404, detail="Workflow not found" )

        return { "success": True, "message": "Workflow updated successfully", "data": result }

    except HTTPException:
        raise

    except Exception as e:
        database.rollback()
        raise HTTPException( status_code=500, detail=str(e) )


# ============================================================
# DELETE APPROVAL WORKFLOW
# ============================================================

@app.delete("/api/finance/approval-workflow/{workflow_id}", tags=["Financer Dashboard"])
def delete_approval_workflow( workflow_id: int, database: Session = Depends(db.get_db) ):
    try:
        deleted = crud.delete_approval_workflow( database, workflow_id )

        if not deleted:
            raise HTTPException( status_code=404, detail="Workflow not found" )

        return { "success": True, "message": "Workflow deleted successfully" }

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        raise HTTPException( status_code=500, detail=str(e) )


@app.get("/api/finance/approval-activity")
def get_approval_activity(
    search: Optional[str] = Query(None),
    activity_type: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    database: Session = Depends(db.get_db),
):
    query = database.query(db.SystemActivity)

    if activity_type:
        query = query.filter(
            db.SystemActivity.activity_type == activity_type
        )

    if search:
        search_value = f"%{search}%"

        query = query.filter(
            or_(
                db.SystemActivity.title.ilike(search_value),
                db.SystemActivity.description.ilike(search_value)
            )
        )

    activities = (
        query
        .order_by(
            db.SystemActivity.created_at.desc()
        )
        .all()
    )

    return [
        {
            "id": activity.id,
            "activity_type": activity.activity_type,
            "title": activity.title,
            "description": activity.description,
            "created_at": activity.created_at,
        }
        for activity in activities
    ]


# ============================================================
# FINANCE ALERTS & NOTIFICATIONS DATA
# ============================================================

@app.get( "/api/finance/alerts-notifications", tags=["Financer Dashboard"] )
def finance_alerts_notifications(
    from_date: Optional[date] = Query(None), to_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None), category: Optional[str] = Query( "All" ),
    priority: Optional[str] = Query( "All" ), database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    if from_date and to_date:
        if from_date > to_date:
            raise HTTPException( status_code=400, detail=( "from_date cannot be after to_date." ) )

    try:
        return crud.get_finance_alerts_notifications(
            database=database,
            current_user=current_user,
            from_date=from_date,
            to_date=to_date,
            search=search,
            category=category,
            priority=priority
        )

    except HTTPException:
        raise

    except Exception as exc:
        database.rollback()
        print( "Finance Alerts/Notifications ERROR:", repr(exc) )
        raise HTTPException( status_code=500, detail=( "Unable to load Alerts & Notifications." ) )


# ============================================================
# MARK ONE NOTIFICATION READ
# ============================================================

@app.put( "/api/finance/notifications/{notification_id}/read", tags=["Financer Dashboard"] )
def finance_mark_notification_read(
    notification_id: int,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    query = ( database.query( db.Notification ) .filter( db.Notification.id == notification_id ) )

    query = query.filter( or_(
            db.Notification.recipient_user_id == current_user.id,
            db.Notification.recipient_user_id .is_(None)
        )
    )

    notification = query.first()

    if not notification:
        raise HTTPException( status_code=404, detail="Notification not found." )

    notification.status = "Read"

    if hasattr( notification, "read_at" ):
        notification.read_at = datetime.utcnow()

    database.commit()

    return { "success": True, "id": notification_id, "status": "Read" }


# ============================================================
# MARK ALL FINANCE NOTIFICATIONS READ
# ============================================================

@app.put( "/api/finance/notifications/read-all", tags=["Financer Dashboard"] )
def finance_mark_all_notifications_read(
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    query = ( database.query( db.Notification )
        .filter( db.Notification.status == "Unread" )
    )

    query = query.filter( or_(
            db.Notification.recipient_user_id == current_user.id,
            db.Notification.recipient_user_id .is_(None)
        )
    )

    updated = query.update( { db.Notification.status: "Read" }, synchronize_session=False )

    database.commit()

    return { "success": True, "updated": updated }


# ============================================================
# FINANCE NOTIFICATION PREFERENCES
# ============================================================

@app.get( "/api/finance/notification-preferences", response_model=db.FinanceNotificationPreferenceResponse, tags=["Financer Dashboard"] )
def get_finance_notification_preferences(
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    return crud.get_finance_notification_preferences( database, current_user )


@app.put( "/api/finance/notification-preferences", response_model=db.FinanceNotificationPreferenceResponse, tags=["Financer Dashboard"] )
def update_finance_notification_preferences(
    payload: db.FinanceNotificationPreferenceUpdate,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_finance_officer )
):

    return crud.update_finance_notification_preferences( database, current_user, payload )


# ============================================================
# FINANCE COMMUNICATION CONTACTS
# ============================================================

@app.get(
    "/api/finance/communication/contacts",
    tags=["Finance Communication"]
)
def finance_communication_contacts(
    search: Optional[str] = Query(
        default=None
    ),

    target_type: str = Query(
        default="all"
    ),

    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(
        crud.require_finance_officer
    )
):

    try:

        contacts = crud.get_finance_communication_contacts(
            database=database,
            finance_user_id=current_user.id,
            search=search,
            target_type=target_type
        )

        return {
            "success": True,
            "contacts": contacts
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# GET COMPLETE CONVERSATION
# ============================================================

@app.get(
    "/api/finance/communication/conversation/{target_type}/{target_id}",
    tags=["Finance Communication"]
)
def finance_get_conversation(
    target_type: str,
    target_id: str,

    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(
        crud.require_finance_officer
    )
):

    try:

        conversation = crud.get_finance_conversation(
            database=database,
            finance_user_id=current_user.id,
            target_type=target_type,
            target_id=target_id
        )

        return {
            "success": True,
            **conversation
        }

    except ValueError as e:

        raise HTTPException(
            status_code=404,
            detail=str(e)
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# SEND FINANCE MESSAGE
# ============================================================

@app.post(
    "/api/finance/communication/conversation/{target_type}/{target_id}",
    tags=["Finance Communication"]
)
def finance_send_message(
    target_type: str,
    target_id: str,

    payload: db.FinanceCommunicationMessage,

    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(
        crud.require_finance_officer
    )
):

    try:

        result = crud.send_finance_message(
            database=database,
            finance_user_id=current_user.id,
            target_type=target_type,
            target_id=target_id,
            message_text=payload.message
        )

        return result

    except ValueError as e:

        raise HTTPException(
            status_code=404,
            detail=str(e)
        )

    except Exception as e:

        database.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# FINANCE HELP & SUPPORT DASHBOARD
# ============================================================

@app.get( "/api/finance/support/dashboard", tags=["Financer Dashboard"] )
def finance_support_dashboard(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.get_current_user )
):

    allowed_roles = { "Finance Officer", "Admin" }

    if current_user.role not in allowed_roles:
        raise HTTPException( status_code=403, detail="Finance support access required." )

    return crud.get_finance_support_dashboard( database, current_user )


# ============================================================
# FINANCE SUPPORT ARTICLE SEARCH
# ============================================================

@app.get( "/api/finance/support/articles", tags=["Financer Dashboard"] )
def finance_support_articles(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.get_current_user )
):

    query = ( database.query(db.SupportArticle) .filter( db.SupportArticle.is_active == True ) )

    if search:
        search_value = f"%{search.strip()}%"
        query = query.filter(
            or_(
                db.SupportArticle.title.ilike( search_value ),
                db.SupportArticle.summary.ilike( search_value ),
                db.SupportArticle.content.ilike( search_value )
            )
        )

    if category and category != "All":
        query = query.filter( db.SupportArticle.category == category )

    articles = ( query .order_by( db.SupportArticle.views.desc(), db.SupportArticle.display_order.asc() ) .all() )

    return [
        {
            "id": article.id,
            "title": article.title,
            "slug": article.slug,
            "summary": article.summary,
            "content": article.content,
            "category": article.category,
            "icon": article.icon,
            "views": article.views,
            "is_popular": article.is_popular
        }
        for article in articles
    ]


# ============================================================
# VIEW SUPPORT ARTICLE
# ============================================================

@app.get( "/api/finance/support/articles/{article_id}", tags=["Financer Dashboard"] )
def finance_support_article(
    article_id: int,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.get_current_user )
):

    article = ( database.query(db.SupportArticle)
        .filter( db.SupportArticle.id == article_id, db.SupportArticle.is_active == True ) .first()
    )

    if not article:
        raise HTTPException( status_code=404, detail="Article not found." )

    article.views = (article.views or 0) + 1

    database.commit()
    database.refresh(article)

    total_votes = ( (article.helpful_yes or 0) + (article.helpful_no or 0) )

    helpful_percent = ( round( article.helpful_yes / total_votes * 100 )
        if total_votes
        else 0 )

    return {
        "id": article.id,
        "title": article.title,
        "slug": article.slug,
        "summary": article.summary,
        "content": article.content,
        "category": article.category,
        "icon": article.icon,
        "views": article.views,
        "helpful_yes": article.helpful_yes,
        "helpful_no": article.helpful_no,
        "helpful_percent": helpful_percent
    }


# ============================================================
# ARTICLE HELPFUL
# ============================================================

@app.post( "/api/finance/support/articles/{article_id}/helpful", tags=["Financer Dashboard"] )
def finance_article_helpful(
    article_id: int,
    helpful: bool,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.get_current_user )
):

    article = ( database.query(db.SupportArticle)
        .filter( db.SupportArticle.id == article_id, db.SupportArticle.is_active == True ) .first()
    )

    if not article:
        raise HTTPException( status_code=404, detail="Article not found." )

    if helpful:
        article.helpful_yes = ( article.helpful_yes or 0 ) + 1
    else:
        article.helpful_no = ( article.helpful_no or 0 ) + 1

    database.commit()

    return { "success": True, "message": "Thank you for your feedback." }


# ============================================================
# CREATE FINANCE SUPPORT TICKET
# ============================================================

@app.post( "/api/finance/support/tickets", response_model=db.SupportTicketResponse, status_code=201, tags=["Financer Dashboard"] )
def create_finance_support_ticket(
    ticket_data: db.SupportTicketCreate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.get_current_user )
):

    if current_user.role not in { "Finance Officer", "Admin" }:
        raise HTTPException( status_code=403, detail="Finance support access required." )

    return crud.create_finance_support_ticket( database, ticket_data, current_user )


# ============================================================
# FINANCE SUPPORT TICKET ATTACHMENT
# ============================================================

@app.post( "/api/finance/support/tickets/{ticket_id}/attachments", tags=["Financer Dashboard"] )
async def upload_finance_support_attachment(
    ticket_id: int,
    file: UploadFile = File(...),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.get_current_user )
):

    if current_user.role not in { "Finance Officer", "Admin" }:
        raise HTTPException( status_code=403, detail="Finance support access required." )

    ticket = ( database.query(db.SupportTicket) .filter( db.SupportTicket.id == ticket_id ) .first() )

    if not ticket:
        raise HTTPException( status_code=404, detail="Support ticket not found." )

    upload_dir = Path( "uploads/support_tickets" )

    upload_dir.mkdir( parents=True, exist_ok=True )

    original_name = ( file.filename or "attachment" )

    extension = Path( original_name ).suffix

    stored_name = ( f"{uuid.uuid4().hex}{extension}" )

    destination = ( upload_dir / stored_name )

    content = await file.read()

    with open( destination, "wb" ) as output:
        output.write(content)

    attachment = db.SupportTicketAttachment(
        ticket_id=ticket.id,
        file_name=original_name,
        stored_name=stored_name,
        file_path=str(destination),
        file_type=file.content_type,
        file_size=len(content)
    )

    database.add(attachment)
    database.commit()
    database.refresh(attachment)

    return {
        "success": True,
        "id": attachment.id,
        "ticket_id": ticket.id,
        "file_name": attachment.file_name,
        "file_size": attachment.file_size
    }



# ==========================================================
# AUDITOR DASHBOARD API
# ==========================================================

@app.get( "/api/auditor/dashboard", tags=["Auditor Dashboard"] )
def auditor_dashboard(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):

    try:
        return crud.get_auditor_dashboard( database, current_user )

    except HTTPException:
        raise

    except Exception as exc:
        print( "AUDITOR DASHBOARD ERROR:", str(exc) )
        raise HTTPException( status_code=500, detail="Unable to load Auditor Dashboard." )


# ============================================================
# AUDIT ASSIGNMENT DASHBOARD
# ============================================================

@app.get( "/api/auditor/assignments/dashboard", tags=["Auditor Dashboard"] )
def auditor_assignments_dashboard(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_roles( ["Admin", "Auditor"] ) )
):

    return crud.get_audit_assignment_dashboard( database )


# ============================================================
# AUDITORS DROPDOWN
# ============================================================

@app.get( "/api/auditor/assignments/auditors", tags=["Auditor Dashboard"] )
def get_assignment_auditors(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_roles( ["Admin", "Auditor"] ) )
):

    auditors = ( database.query(db.User)
        .filter( db.User.role == "Auditor", db.User.active == True )
        .order_by( db.User.name.asc() ) .all()
    )

    return {
        "items": [
            {
                "id": auditor.id,
                "name": auditor.name,
                "email": auditor.email,
                "department": auditor.department,
                "job_title": auditor.job_title
            }
            for auditor in auditors
        ]
    }


# ============================================================
# AUDIT ASSIGNMENTS LIST
# ============================================================

@app.get( "/api/auditor/assignments", tags=["Auditor Dashboard"] )
def get_auditor_assignments(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query( None, alias="status" ),
    priority: Optional[str] = Query(None),
    auditor_id: Optional[int] = Query(None),
    due_date_from: Optional[date] = Query(None),
    due_date_to: Optional[date] = Query(None),
    page: int = Query( 1, ge=1 ),
    limit: int = Query( 10, ge=1, le=100 ),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_roles( ["Admin", "Auditor"] ) )
):

    return crud.get_audit_assignment_list(
        database=database,
        search=search,
        status_filter=status_filter,
        priority=priority,
        auditor_id=auditor_id,
        due_date_from=due_date_from,
        due_date_to=due_date_to,
        page=page,
        limit=limit
    )


# ============================================================
# GET SINGLE ASSIGNMENT
# ============================================================

@app.get( "/api/auditor/assignments/{assignment_id}", tags=["Auditor Dashboard"] )
def get_auditor_assignment(
    assignment_id: int,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_roles( ["Admin", "Auditor"] ) )
):

    return crud.get_audit_assignment( database, assignment_id )


# ============================================================
# CREATE AUDIT ASSIGNMENT
# ============================================================

@app.post( "/api/auditor/assignments", tags=["Auditor Dashboard"] )
def create_auditor_assignment(
    request: db.AuditAssignmentCreate,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_roles( ["Admin", "Auditor"] ) )
):

    return crud.create_audit_assignment( database, request, current_user )


# ============================================================
# UPDATE ASSIGNMENT
# ============================================================

@app.patch( "/api/auditor/assignments/{assignment_id}", tags=["Auditor Dashboard"] )
def update_auditor_assignment(
    assignment_id: int,
    request: db.AuditAssignmentUpdate,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_roles( ["Admin", "Auditor"] ) )
):

    return crud.update_audit_assignment( database, assignment_id, request, current_user )


# ============================================================
# DELETE ASSIGNMENT
# ============================================================

@app.delete( "/api/auditor/assignments/{assignment_id}", tags=["Auditor Dashboard"] )
def delete_auditor_assignment(
    assignment_id: int,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_roles( ["Admin", "Auditor"] ) )
):

    return crud.delete_audit_assignment( database, assignment_id, current_user )


# ============================================================
# PLANNING & RISK DASHBOARD
# ============================================================

@app.get( "/api/auditor/planning-risk/dashboard", tags=["Auditor Dashboard"] )
def planning_risk_dashboard(
    database: Session = Depends(db.get_db),
    current_user=Depends( crud.get_current_user )
):

    return crud.get_planning_risk_dashboard( database )


# ============================================================
# GET AUDIT PLANS
# ============================================================

@app.get( "/api/auditor/audit-plans", tags=["Auditor Dashboard"] )
def get_audit_plans(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query("All"),
    audit_type: Optional[str] = Query("All"),
    risk_level: Optional[str] = Query("All"),
    database: Session = Depends( db.get_db ),
    current_user=Depends( crud.require_roles(["Auditor"]) )
):

    plans = crud.get_audit_plans(
        database=database,
        search=search,
        status=status,
        audit_type=audit_type,
        risk_level=risk_level
    )

    return { "items": plans, "total": len(plans) }


# ============================================================
# CREATE AUDIT PLAN
# ============================================================

@app.post( "/api/auditor/audit-plans", tags=["Auditor Dashboard"] )
def create_audit_plan(
    plan: db.AuditPlanCreate,
    database: Session = Depends( db.get_db ),
    current_user=Depends( crud.require_roles(["Auditor"]) )
):

    audit = crud.create_audit_plan( database, plan, current_user )

    return { "success": True, "message": "Audit plan created successfully.", "item": audit }


# ============================================================
# GET RISKS
# ============================================================

@app.get( "/api/auditor/risks", tags=["Auditor Dashboard"] )
def get_auditor_risks(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    database: Session = Depends( db.get_db ),
    current_user=Depends( crud.require_roles(["Auditor"]) )
):

    query = database.query( db.AuditRisk )

    if search:
        value = f"%{search.strip()}%"
        query = query.filter(
            or_(
                db.AuditRisk.risk_title.ilike( value ), db.AuditRisk.category.ilike( value ), db.AuditRisk.status.ilike( value )
            )
        )

    if category:
        query = query.filter( db.AuditRisk.category == category )

    if status:
        query = query.filter( db.AuditRisk.status == status )

    risks = ( query .order_by( db.AuditRisk.risk_score.desc() ) .all() )

    return { "items": risks, "total": len(risks) }


# ============================================================
# CREATE RISK
# ============================================================

@app.post( "/api/auditor/risks", tags=["Auditor Dashboard"] )
def create_auditor_risk(
    risk: db.AuditRiskCreate,
    database: Session = Depends( db.get_db ),
    current_user=Depends( crud.require_roles(["Auditor"]) )
):

    record = crud.create_audit_risk( database, risk, current_user )

    return { "success": True, "message": "Risk created successfully.", "item": record }


# ============================================================
# UPDATE RISK
# ============================================================

@app.put( "/api/auditor/risks/{risk_id}", tags=["Auditor Dashboard"] )
def update_auditor_risk(
    risk_id: int,
    risk: db.AuditRiskUpdate,
    database: Session = Depends( db.get_db ),
    current_user=Depends( crud.require_roles(["Auditor"]) )
):

    record = crud.update_audit_risk( database, risk_id, risk )

    if not record:
        raise HTTPException( status_code=404, detail="Risk not found." )

    return { "success": True, "message": "Risk updated successfully.", "item": record }


# ============================================================
# AUDITS IN PROGRESS DASHBOARD API
# ============================================================

@app.get( "/api/auditor/audits-in-progress/dashboard", tags=["Auditor Dashboard"] )
def audits_in_progress_dashboard(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query("All"),
    audit_type: Optional[str] = Query("All"),
    department: Optional[str] = Query("All"),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):

    try:
        return crud.get_audits_in_progress_dashboard(
            database=database,
            current_user=current_user,
            search=search,
            status=status,
            audit_type=audit_type,
            department=department
        )

    except HTTPException:
        raise

    except Exception as exc:
        print( "AUDITS IN PROGRESS ERROR:", str(exc) )
        raise HTTPException( status_code=500, detail="Unable to load Audits in Progress." )


@app.get( "/api/auditor/audits-in-progress/export", tags=["Auditor Dashboard"] )
def export_audits_in_progress(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query("All"),
    audit_type: Optional[str] = Query("All"),
    department: Optional[str] = Query("All"),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):

    data = crud.get_audits_in_progress_dashboard(
        database=database,
        current_user=current_user,
        search=search,
        status=status,
        audit_type=audit_type,
        department=department
    )

    output = io.StringIO()

    writer = csv.writer(output)

    writer.writerow([
        "Audit Number",
        "Audit Name",
        "Audit Type",
        "Department",
        "Owner",
        "Start Date",
        "Target Date",
        "Progress",
        "Status",
        "Days Elapsed",
        "Days Remaining"
    ])

    for audit in data["audits"]:
        writer.writerow([
            audit["audit_number"],
            audit["audit_name"],
            audit["audit_type"],
            audit["department"],
            audit["owner"],
            audit["start_date"],
            audit["target_date"],
            audit["progress"],
            audit["status"],
            audit["days_elapsed"],
            audit["days_remaining"]
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]), media_type="text/csv",
        headers={ "Content-Disposition": "attachment; filename=audits-in-progress.csv" }
    )


# ============================================================
# EVIDENCE & DOCUMENTS DASHBOARD
# ============================================================

@app.get( "/api/auditor/evidence-documents/dashboard", tags=["Auditor Dashboard"] )
def auditor_evidence_documents_dashboard(
    search: str = Query(default=""),
    audit: str = Query(default="All Audits"),
    document_type: str = Query(default="All Types"),
    category: str = Query(default="All Categories"),
    status: str = Query(default="All Statuses"),
    page: int = Query( default=1, ge=1 ),
    page_size: int = Query( default=10, ge=1, le=100 ),
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.get_current_user )
):

    # --------------------------------------------------------
    # OPTIONAL ROLE CHECK
    # --------------------------------------------------------

    if current_user.role not in { "Auditor", "Admin" }:
        raise HTTPException( status_code=403, detail="Auditor access required." )

    return crud.get_evidence_documents_dashboard(
        database=database,
        search=search,
        audit=audit,
        document_type=document_type,
        category=category,
        status=status,
        page=page,
        page_size=page_size
    )


@app.get( "/api/auditor/issues-findings/dashboard", tags=["Auditor Dashboard"] )
def auditor_issues_findings_dashboard(
    search: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(5, ge=1, le=100),
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.get_issues_findings_dashboard(
        database=database,
        current_user=current_user,
        search=search,
        severity=severity,
        status=status,
        category=category,
        page=page,
        limit=limit
    )


@app.post( "/api/auditor/issues-findings", tags=["Auditor Dashboard"] )
def create_issue_finding(
    data: db.AuditFindingCreate,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.create_audit_finding( database, data, current_user )


@app.get( "/api/auditor/issues-findings/reopen-rate", tags=["Auditor Dashboard"] )
def auditor_issue_reopen_rate(
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.get_issue_reopen_rate( database, current_user )


@app.get( "/api/auditor/issues-findings/audits", tags=["Auditor Dashboard"] )
def get_issue_finding_audits(
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    rows = ( database.query( db.Audit )
        .join( db.AuditAssignment, db.AuditAssignment.audit_id == db.Audit.id )
        .filter( db.AuditAssignment.auditor_id == current_user.id )
        .order_by( db.Audit.id.desc() ) .all()
    )

    return {
        "items": [
            { "id": audit.id, "audit_number": audit.audit_number, "title": audit.title }
            for audit in rows
        ]
    }


@app.put( "/api/auditor/issues-findings/{finding_id}", tags=["Auditor Dashboard"] )
def update_issue_finding(
    finding_id: int,
    data: db.AuditFindingUpdate,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.update_audit_finding( database, finding_id, data, current_user )


@app.delete( "/api/auditor/issues-findings/{finding_id}", tags=["Auditor Dashboard"] )
def delete_issue_finding(
    finding_id: int,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.delete_audit_finding( database, finding_id, current_user )


@app.get( "/api/auditor/issues-findings/{finding_id}", tags=["Auditor Dashboard"] )
def get_issue_finding(
    finding_id: int,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    finding = ( database.query(db.AuditFinding).filter( db.AuditFinding.id == finding_id ) .first() )

    if not finding:
        raise HTTPException( status_code=404, detail="Issue / Finding not found." )

    assignment = ( database.query(db.AuditAssignment) .filter(
            db.AuditAssignment.audit_id == finding.audit_id,
            db.AuditAssignment.auditor_id == current_user.id
        ) .first()
    )

    if not assignment:
        raise HTTPException( status_code=403, detail="Access denied." )

    return crud._finding_to_dict( database, finding )


# ============================================================
# AUDITOR - COMPLIANCE TRACKER
# ============================================================

@app.get( "/api/auditor/compliance/dashboard", tags=["Auditor Dashboard"] )
def auditor_compliance_dashboard(
    trend_months: int = Query( 6, ge=1, le=12 ),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):
    try:
        return crud.get_auditor_compliance_dashboard( database=database, current_user=current_user, trend_months=trend_months )

    except HTTPException:
        raise

    except Exception as exc:
        print( "Auditor compliance dashboard error:", repr(exc) )
        raise HTTPException( status_code=500, detail=( "Unable to load auditor compliance dashboard: " f"{str(exc)}" ) )


@app.get("/api/auditor/compliance/requirements", tags=["Auditor Dashboard"])
def get_compliance_requirements(
    page: int = Query(1, ge=1),
    limit: int = Query(5, ge=1, le=100),
    status: str = Query("All"),
    search: str = Query(""),
    database: Session = Depends(db.get_db)
):

    query = database.query(db.ComplianceRequirement)

    # -----------------------------------------
    # STATUS FILTER
    # -----------------------------------------

    if status and status.lower() != "all":
        query = query.filter( db.ComplianceRequirement.status.ilike( f"%{status}%" ) )


    # -----------------------------------------
    # SEARCH FILTER
    # -----------------------------------------

    if search:
        search_filter = f"%{search}%"
        query = query.filter( or_(
                db.ComplianceRequirement.requirement.ilike( search_filter ),
                db.ComplianceRequirement.framework.ilike( search_filter ),
                db.ComplianceRequirement.requirement_id.ilike( search_filter ),
                db.ComplianceRequirement.entity_department.ilike( search_filter )
            )
        )


    # -----------------------------------------
    # PAGINATION
    # -----------------------------------------

    total = query.count()

    pages = max( 1, (total + limit - 1) // limit )

    requirements = ( query .order_by( db.ComplianceRequirement.id.desc() )
        .offset( (page - 1) * limit ) .limit(limit) .all() )


    # -----------------------------------------
    # RESPONSE
    # -----------------------------------------

    return {
        "requirements": [
            {
                "id": item.id,
                "requirement_id": item.requirement_id,
                "requirement": item.requirement,
                "framework": item.framework,
                "audit_assignment": item.audit_assignment,
                "entity_department": item.entity_department,
                "status": item.status,
                "compliance_score": item.compliance_score,
                "last_assessed": item.last_assessed,
                "next_review": item.next_review
            }
            for item in requirements
        ],
        "pagination": {
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages
        }
    }


@app.get( "/api/auditor/compliance/export", tags=["Auditor Dashboard"] )
def export_auditor_compliance(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query("All"),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):

    result = crud.get_auditor_compliance_requirements(
        database=database, search=search, status=status, page=1, limit=100
    )

    output = io.StringIO()

    writer = csv.writer(output)

    writer.writerow([ "Requirement ID", "Requirement", "Framework", "Audit / Assignment",
        "Entity / Department", "Status", "Compliance Score", "Last Assessed", "Next Review"
    ])

    for item in result["requirements"]:
        writer.writerow([
            item["requirement_id"],
            item["requirement"],
            item["framework"],
            item["audit_assignment"],
            item["entity_department"],
            item["status"],
            item["compliance_score"],
            item["last_assessed"],
            item["next_review"]
        ])

    return Response(
        content=output.getvalue(), media_type="text/csv",
        headers={ "Content-Disposition": 'attachment; filename="compliance-report.csv"' } )


# ============================================================
# RECOMMENDATIONS DASHBOARD API
# ============================================================

@app.get( "/api/auditor/recommendations/dashboard", tags=["Auditor Dashboard"] )
def auditor_recommendations_dashboard(
    search: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    page: int = Query( 1, ge=1 ),
    limit: int = Query( 5, ge=1, le=100 ),
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.get_recommendations_dashboard(
        database=database, current_user=current_user, search=search, priority=priority,
        status=status, category=category, page=page, limit=limit
    )


@app.post( "/api/auditor/recommendations", tags=["Auditor Dashboard"] )
def create_recommendation(
    data: db.AuditRecommendationCreate,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.create_audit_recommendation( database, data, current_user )


@app.get( "/api/auditor/recommendations/{recommendation_id}", tags=["Auditor Dashboard"] )
def get_recommendation(
    recommendation_id: int,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.get_audit_recommendation( database, recommendation_id, current_user )


@app.put( "/api/auditor/recommendations/{recommendation_id}", tags=["Auditor Dashboard"] )
def update_recommendation(
    recommendation_id: int,
    data: db.AuditRecommendationUpdate,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.update_audit_recommendation( database, recommendation_id, data, current_user )


@app.delete( "/api/auditor/recommendations/{recommendation_id}", tags=["Auditor Dashboard"] )
def delete_recommendation(
    recommendation_id: int,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.delete_audit_recommendation( database, recommendation_id, current_user )


# ============================================================
# AUDITOR ANALYTICS DASHBOARD API
# ============================================================

@app.get( "/api/auditor/analytics/dashboard", response_model=db.AuditorAnalyticsDashboardResponse, tags=["Auditor Dashboard"] )
def auditor_analytics_dashboard(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    trend_months: int = Query( 6, ge=1, le=12 ),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_roles(["Auditor", "Admin"]) )
):
    try:

        return crud.get_auditor_analytics_dashboard(
            database=database,
            current_user=current_user,
            start_date=start_date,
            end_date=end_date,
            trend_months=trend_months
        )

    except HTTPException:
        raise

    except Exception as exc:
        print( "AUDITOR ANALYTICS ERROR:", repr(exc) )
        raise HTTPException( status_code=500, detail=( "Unable to load Auditor Analytics: " f"{str(exc)}" ) )


# ============================================================
# AUDITOR CALENDAR
# ============================================================

@app.get( "/api/auditor/calendar/events", tags=["Auditor Dashboard"] )
def get_calendar_events(
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    event_type: Optional[str] = Query(None),
    audit_id: Optional[int] = Query(None),
    include_completed: bool = Query(False),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.get_calendar_events(
        database=database,
        current_user=current_user,
        start_date=start,
        end_date=end,
        event_type=event_type,
        audit_id=audit_id,
        include_completed=include_completed
    )


@app.get( "/api/auditor/calendar/audits", tags=["Auditor Dashboard"] )
def get_calendar_audits(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.get_calendar_audits( database, current_user )


@app.post( "/api/auditor/calendar/events", tags=["Auditor Dashboard"] )
def create_calendar_event(
    data: db.CalendarEventCreate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.create_calendar_event( database, data, current_user )


@app.patch( "/api/auditor/calendar/events/{event_id}", tags=["Auditor Dashboard"] )
def update_calendar_event(
    event_id: int,
    data: db.CalendarEventUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.update_calendar_event( database, event_id, data, current_user )


@app.delete( "/api/auditor/calendar/events/{event_id}", tags=["Auditor Dashboard"] )
def delete_calendar_event(
    event_id: int,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.delete_calendar_event( database, event_id, current_user )


# ============================================================
# AUDITOR NOTIFICATIONS DASHBOARD
# ============================================================

@app.get( "/api/auditor/notifications", tags=["Auditor Dashboard"] )
def get_auditor_notifications(
    tab: str = Query("All"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.get_auditor_notifications_dashboard( database=database, current_user=current_user, tab=tab, search=search, page=page, limit=limit )


# ============================================================
# AUDITOR NOTIFICATION SUMMARY
# ============================================================

@app.get( "/api/auditor/notifications/summary", tags=["Auditor Dashboard"] )
def auditor_notification_summary(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.get_auditor_notification_summary( database, current_user )


# ============================================================
# AUDITOR NOTIFICATION CATEGORY COUNTS
# ============================================================

@app.get( "/api/auditor/notifications/category-counts", tags=["Auditor Dashboard"] )
def auditor_notification_category_counts(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.get_auditor_notification_category_counts( database, current_user )


# ============================================================
# MARK ALL AS READ
# ============================================================

@app.put( "/api/auditor/notifications/read-all", tags=["Auditor Dashboard"] )
def auditor_mark_all_notifications_read(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):

    updated = crud.mark_all_auditor_notifications_read( database, current_user )

    return { "success": True, "updated": updated, "message": "All notifications marked as read." }


# ============================================================
# GET AUDITOR NOTIFICATION PREFERENCES
# ============================================================

@app.get(
    "/api/auditor/notifications/preferences",
    response_model=db.AuditorNotificationPreferenceResponse,
    tags=["Auditor Dashboard"]
)
def get_auditor_notification_preferences(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.get_auditor_notification_preferences( database, current_user )


# ============================================================
# UPDATE AUDITOR NOTIFICATION PREFERENCES
# ============================================================

@app.put( "/api/auditor/notifications/preferences", response_model=db.AuditorNotificationPreferenceResponse, tags=["Auditor Dashboard"] )
def update_auditor_notification_preferences(
    payload: db.AuditorNotificationPreferenceUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.update_auditor_notification_preferences( database, current_user, payload )


# ============================================================
# MARK SINGLE NOTIFICATION AS READ
# KEEP THIS AFTER STATIC ROUTES
# ============================================================

@app.put( "/api/auditor/notifications/{notification_id}/read", tags=["Auditor Dashboard"] )
def auditor_mark_notification_read(
    notification_id: int,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends( crud.require_auditor )
):

    notification = crud.mark_auditor_notification_read( database, current_user, notification_id )

    return { "success": True, "message": "Notification marked as read.", "id": notification.id }


# ==========================================================
# AUDITOR MESSAGES PAGE
# ==========================================================

@app.get( "/api/auditor/messages/conversations", tags=["Auditor Dashboard"] )
def auditor_message_conversations(
    search: str = "",
    filter_type: str = "all",
    database: Session = Depends(db.get_db),
    current_user = Depends(crud.require_auditor)
):

    return crud.get_user_conversations( database=database, current_user=current_user, search=search, filter_type=filter_type )


# ==========================================================
# GET CONTACTS
# ==========================================================

@app.get( "/api/auditor/messages/contacts", tags=["Auditor Dashboard"] )
def auditor_message_contacts(
    search: str = "",
    database: Session = Depends(db.get_db),
    current_user = Depends(crud.require_auditor)
):

    return crud.get_message_contacts( database=database, current_user=current_user, search=search )


# ==========================================================
# GET GROUPS
# ==========================================================

@app.get( "/api/auditor/messages/groups", tags=["Auditor Dashboard"] )
def auditor_message_groups(
    database: Session = Depends(db.get_db),
    current_user = Depends(crud.require_auditor)
):

    return crud.get_chat_groups( database=database, current_user=current_user )


# ==========================================================
# CREATE DIRECT CONVERSATION
# ==========================================================

@app.post( "/api/auditor/messages/conversations", tags=["Auditor Dashboard"] )
def create_direct_conversation(
    payload: db.CreateConversation,
    database: Session = Depends(db.get_db),
    current_user = Depends(crud.require_auditor)
):

    conversation = crud.get_or_create_direct_conversation( database=database, current_user_id=current_user.id, other_user_id=payload.user_id )

    return { "success": True, "conversation_id": conversation.id }


# ==========================================================
# CREATE GROUP
# ==========================================================

@app.post( "/api/auditor/messages/groups", tags=["Auditor Dashboard"] )
def create_group(
    payload: db.CreateChatGroup,
    database: Session = Depends(db.get_db),
    current_user = Depends(crud.require_auditor)
):

    return crud.create_chat_group( database=database, current_user=current_user, group_data=payload )


# ==========================================================
# GET CONVERSATION MESSAGES
# ==========================================================

@app.get( "/api/auditor/messages/conversations/{conversation_id}", tags=["Auditor Dashboard"] )
def get_auditor_messages(
    conversation_id: int,
    database: Session = Depends(db.get_db),
    current_user = Depends(crud.require_auditor)
):

    return crud.get_conversation_messages( database=database, conversation_id=conversation_id, current_user=current_user )


# ==========================================================
# SEND MESSAGE
# ==========================================================

@app.post( "/api/auditor/messages/conversations/{conversation_id}", tags=["Auditor Dashboard"] )
def send_message_auditor(
    conversation_id: int,
    payload: db.SendDirectMessage,
    database: Session = Depends(db.get_db),
    current_user = Depends(crud.require_auditor)
):

    return crud.send_direct_message( database=database, conversation_id=conversation_id, current_user=current_user, message_text=payload.message )


# ============================================================
# AUDITOR CONTACTS
# ============================================================

@app.get(
    "/api/auditor/communication/contacts",
    tags=["Auditor Communication"]
)
def auditor_communication_contacts(

    database: Session = Depends(
        db.get_db
    ),

    current_user: db.User = Depends(
        crud.require_auditor
    ),

):

    try:

        return crud.get_auditor_communication_contacts(

            database,

            current_user.id

        )

    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=str(e)

        )


# ============================================================
# GET CONVERSATION
# ============================================================

@app.get(
    "/api/auditor/communication/conversation/{target_type}/{target_id}",
    tags=["Auditor Communication"]
)
def auditor_get_conversation(

    target_type: str,

    target_id: str,

    database: Session = Depends(
        db.get_db
    ),

    current_user: db.User = Depends(
        crud.require_auditor
    ),

):

    try:

        return crud.get_auditor_communication_conversation(

            database,

            current_user.id,

            target_type,

            target_id

        )

    except ValueError as e:

        raise HTTPException(

            status_code=400,

            detail=str(e)

        )

    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=str(e)

        )


# ============================================================
# SEND MESSAGE
# ============================================================

@app.post(
    "/api/auditor/communication/conversation/{target_type}/{target_id}",
    tags=["Auditor Communication"]
)
def auditor_send_message(

    target_type: str,

    target_id: str,

    payload: db.AuditorCommunicationMessage,

    database: Session = Depends(
        db.get_db
    ),

    current_user: db.User = Depends(
        crud.require_auditor
    ),

):

    try:

        message = (
            crud.send_auditor_communication_message(

                database,

                current_user.id,

                target_type,

                target_id,

                payload.message

            )
        )


        return {

            "success": True,

            "message_id":
                message.id,

        }


    except ValueError as e:

        raise HTTPException(

            status_code=400,

            detail=str(e)

        )

    except Exception as e:

        database.rollback()

        raise HTTPException(

            status_code=500,

            detail=str(e)

        )


# ============================================================
# AUDITOR SETTINGS PAGE
# ============================================================


@app.get( "/api/auditor/settings/dashboard", tags=["Auditor Dashboard"] )
def get_auditor_settings_dashboard(
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.get_auditor_settings_dashboard( database=database, current_user=current_user )


@app.get(
    "/api/auditor/settings/profile",
    tags=["Auditor Dashboard"]
)
def get_auditor_profile(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):

    return {
        "id": current_user.id,
        "name": ( getattr(current_user, "name", None) or getattr(current_user, "full_name", None)
            or getattr(current_user, "username", None) or "Auditor" ),
        "username": getattr( current_user, "username", None ),
        "role": ( getattr(current_user, "role", None) or "Auditor" )
    }


@app.put( "/api/auditor/settings/profile", tags=["Auditor Dashboard"] )
def update_auditor_settings_profile(
    payload: db.AuditorSettingsProfileUpdate,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.update_auditor_settings_profile( database=database, current_user=current_user, payload=payload )


@app.put( "/api/auditor/settings/preferences", tags=["Auditor Dashboard"] )
def update_auditor_preferences(
    payload: db.AuditorSystemPreferencesUpdate,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.update_auditor_system_preferences( database=database, current_user=current_user, payload=payload )


@app.put( "/api/auditor/settings/password", tags=["Auditor Dashboard"] )
def change_auditor_password(
    payload: db.AuditorPasswordChangeRequest,
    database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.change_auditor_password( database=database, current_user=current_user, payload=payload )


@app.put( "/api/auditor/settings/two-factor", tags=["Auditor Dashboard"] )
def update_auditor_two_factor(
    payload: db.AuditorTwoFactorUpdate,
    database: Session = Depends( db.get_db ),
    current_auditor: db.User = Depends( crud.require_auditor )
):

    return crud.update_auditor_two_factor( database=database, current_user=current_auditor, enabled=payload.enabled )


@app.put( "/api/auditor/settings/email-preferences", tags=["Auditor Dashboard"] )
def update_email_preferences(
    data: db.AuditorEmailPreferencesUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_auditor)
):
    settings = crud.update_auditor_email_preferences(
        database=database,
        user_id=current_user.id,
        data=data
    )

    return {
        "success": True,
        "message": "Email preferences saved successfully",
        "preferences": {
            "audit_reminders": settings.audit_reminders,
            "audit_assignments": settings.audit_assignments,
            "finding_notifications": settings.finding_notifications,
            "report_notifications": settings.report_notifications
        }
    }


@app.put("/api/auditor/settings/notifications", tags=["Auditor Dashboard"])
def update_auditor_notification_settings(
    data: db.AuditorNotificationSettingsUpdate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user)
):

    settings = crud.update_auditor_notification_settings(
        database=database,
        user_id=current_user.id,
        data=data
    )

    return {
        "success": True,
        "message": "Notification settings saved successfully",
        "notifications": {
            "audit_assignments": settings.audit_reminders, 
            "findings": settings.in_app_notifications, 
            "compliance": settings.important_alerts, 
            "system": settings.email_notifications
        }
    }


# ============================================================
# AUDITOR HELP & SUPPORT DASHBOARD
# ============================================================

@app.get( "/api/auditor/support/dashboard", tags=["Auditor Dashboard"] )
def auditor_support_dashboard( database: Session = Depends( db.get_db ), current_user: db.User = Depends( crud.require_auditor ) ):

    return crud.get_auditor_support_dashboard( database, current_user )


# ============================================================
# AUDITOR SUPPORT ARTICLE SEARCH
# ============================================================

@app.get( "/api/auditor/support/articles", tags=["Auditor Dashboard"] )
def auditor_support_articles(
    search: Optional[str] = Query( None ), category: Optional[str] = Query( None ),
    database: Session = Depends( db.get_db ), current_user: db.User = Depends( crud.require_auditor )
):

    query = ( database.query( db.SupportArticle ) .filter( db.SupportArticle.is_active == True ) )

    if search:
        search_value = ( f"%{search.strip()}%" )
        query = query.filter( or_(
                db.SupportArticle.title.ilike( search_value ),
                db.SupportArticle.summary.ilike( search_value ),
                db.SupportArticle.content.ilike( search_value )
            )
        )

    if category and category != "All":
        query = query.filter( db.SupportArticle.category == category )

    articles = ( query .order_by( db.SupportArticle.is_popular.desc(), db.SupportArticle.views.desc() ) .all() )

    return [
        {
            "id": article.id,
            "title": article.title,
            "slug": article.slug,
            "summary": article.summary,
            "content": article.content,
            "category": article.category,
            "icon": article.icon,
            "views": article.views,
            "is_popular": article.is_popular
        }
        for article in articles
    ]


# ============================================================
# AUDITOR SUPPORT TICKETS
# ============================================================

@app.get( "/api/auditor/support/tickets", tags=["Auditor Dashboard"] )
def auditor_support_tickets(
    page: int = Query( 1, ge=1 ), limit: int = Query( 10, ge=1, le=100 ), status: Optional[str] = None,
    database: Session = Depends( db.get_db ), current_user: db.User = Depends( crud.require_auditor )
):

    user_name = ( current_user.name
        if getattr( current_user, "name", None )
        else current_user.email )

    query = ( database.query( db.SupportTicket ) .filter( db.SupportTicket.created_by == user_name ) )

    if status:
        query = query.filter( db.SupportTicket.status == status )

    total = query.count()

    tickets = ( query .order_by( db.SupportTicket.created_on.desc() ) .offset( (page - 1) * limit ) .limit( limit ) .all() )

    return {
        "tickets": [
            {
                "id": ticket.id,
                "ticket_id": ticket.ticket_id,
                "subject": ticket.subject,
                "description": ticket.description,
                "category": ticket.category,
                "priority": ticket.priority,
                "status": ticket.status,
                "created_on": (
                    ticket.created_on.isoformat()
                    if ticket.created_on
                    else None
                )
            }
            for ticket in tickets
        ],
        "total": total,
        "page": page,
        "limit": limit
    }


# ============================================================
# CREATE AUDITOR SUPPORT TICKET
# ============================================================

@app.post( "/api/auditor/support/tickets", response_model=db.SupportTicketResponse,
    status_code=201, tags=["Auditor Dashboard"] )
def create_auditor_support_ticket(
    ticket_data: db.SupportTicketCreate, database: Session = Depends( db.get_db ),
    current_user: db.User = Depends( crud.require_auditor )
):

    return crud.create_auditor_support_ticket( database, ticket_data, current_user )


# ============================================================
# VENDOR DASHBOARD
# ============================================================

@app.get("/api/vendor/{vendor_id}/dashboard", tags=["Vendor Dashboard"])
def vendor_dashboard_api( vendor_id: str, current_vendor: db.Vendor = Depends(crud.get_current_vendor), database: Session = Depends(db.get_db), ):
    # ------------------------------------------------------
    # FIND VENDOR
    # ------------------------------------------------------
    vendor = ( database.query(db.Vendor) .filter(db.Vendor.vendor_id == vendor_id) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail=f"Vendor {vendor_id} not found" )

    # ------------------------------------------------------
    # PURCHASE ORDERS
    # ------------------------------------------------------
    purchase_orders = ( database.query(db.PurchaseOrder) .filter(db.PurchaseOrder.vendor_id == vendor_id) .order_by( db.PurchaseOrder.order_date.desc(), db.PurchaseOrder.id.desc() ) .all() )

    total_purchase_orders = len(purchase_orders)

    delivered_orders = [
        po for po in purchase_orders
        if crud.normalize_status(po.status).lower()
        in ["delivered", "completed"]
    ]

    delayed_orders = [
        po for po in purchase_orders
        if crud.normalize_status(po.status).lower()
        in ["delayed", "late"]
    ]

    pending_orders = [
        po for po in purchase_orders
        if crud.normalize_status(po.status).lower()
        in ["pending", "open"]
    ]

    in_transit_orders = [
        po for po in purchase_orders
        if crud.normalize_status(po.status).lower()
        in ["in transit", "in_transit", "shipped"]
    ]

    # ------------------------------------------------------
    # DELIVERY CALCULATIONS
    # ------------------------------------------------------
    delivery_completed = 0

    for po in purchase_orders:

        status = crud.normalize_status(po.status).lower()

        if status in ["delivered", "completed"]:
            delivery_completed += 1

    if total_purchase_orders > 0:
        on_time_delivery = ( delivery_completed / total_purchase_orders ) * 100

    else:
        on_time_delivery = crud.safe_float( getattr(vendor, "delivery_score", 0) )

    # ------------------------------------------------------
    # QUALITY
    # ------------------------------------------------------
    quality_score = crud.safe_float( getattr(vendor, "quality_score", 0) )

    # ------------------------------------------------------
    # RELIABILITY
    # ------------------------------------------------------
    reliability_score = crud.safe_float( getattr(vendor, "reliability_score", 0) )

    # ------------------------------------------------------
    # CONTRACTS
    # ------------------------------------------------------

    try:
        contracts = ( database.query(db.Contract) .filter(db.Contract.vendor_id == vendor_id) .order_by(db.Contract.id.desc()) .all() )

    except Exception:
        contracts = []

    total_contracts = len(contracts)
    contract_status = { "active": 0, "expiring_soon": 0, "expired": 0, "draft": 0 }

    for contract in contracts:

        status = crud.normalize_status( getattr(contract, "status", "") ).lower()

        if status == "active":
            contract_status["active"] += 1

        elif status in [ "expiring soon", "expiring_soon" ]:
            contract_status["expiring_soon"] += 1

        elif status == "expired":
            contract_status["expired"] += 1

        elif status == "draft":
            contract_status["draft"] += 1

    # ------------------------------------------------------
    # INVOICES
    # ------------------------------------------------------

    try:
        invoices = ( database.query(db.Invoice) .filter(db.Invoice.vendor_id == vendor_id) .order_by(db.Invoice.id.desc()) .all() )

    except Exception:
        invoices = []

    total_invoiced = 0
    pending_payments = 0
    paid_invoices = 0
    pending_invoices = 0
    overdue_invoices = 0

    for invoice in invoices:
        amount = crud.safe_float( getattr(invoice, "amount", 0) )
        total_invoiced += amount
        status = crud.normalize_status( getattr(invoice, "status", "") ).lower()

        if status == "paid":
            paid_invoices += 1

        elif status in ["pending", "processing"]:
            pending_invoices += 1
            pending_payments += amount

        elif status == "overdue":
            overdue_invoices += 1
            pending_payments += amount

    # ------------------------------------------------------
    # RECENT PURCHASE ORDERS
    # ------------------------------------------------------
    recent_purchase_orders = []
    for po in purchase_orders[:5]:
        recent_purchase_orders.append({
            "id": po.id,
            "po_number": getattr( po, "po_number", f"PO-{po.id}" ),
            "item_service": getattr( po, "item_service", getattr( po, "description", getattr( po, "item", "Purchase Order" ) ) ),
            "status": crud.normalize_status( getattr(po, "status", "Pending") ),
            "order_date": crud.serialize_date( getattr(po, "order_date", None) ),
            "delivery_date": crud.serialize_date( getattr( po, "actual_delivery", getattr( po, "expected_delivery", None ) ) ),
            "amount": crud.safe_float( getattr(po, "amount", 0) )
        })

    # ------------------------------------------------------
    # PERFORMANCE SUMMARY
    # ------------------------------------------------------
    order_completion_rate = (
        (delivery_completed / total_purchase_orders) * 100
        if total_purchase_orders
        else 0
    )

    # ------------------------------------------------------
    # ACCOUNT INFORMATION
    # ------------------------------------------------------
    account = {
        "vendor_id": vendor.vendor_id,
        "vendor_name": getattr( vendor, "vendor_name", "" ),
        "vendor_since": crud.serialize_date( getattr( vendor, "created_at", getattr( vendor, "vendor_since", None ) ) ),
        "primary_contact": getattr( vendor, "contact_person", "" ),
        "email": getattr( vendor, "email", "" ),
        "phone": getattr( vendor, "phone", "" ),
        "status": getattr( vendor, "status", "Active" )
    }

    # ------------------------------------------------------
    # RESPONSE
    # ------------------------------------------------------
    return {
        "success": True,
        "vendor": {
            "vendor_id": vendor.vendor_id,
            "vendor_name": getattr( vendor, "vendor_name", "Vendor" ),
            "reliability_score": reliability_score,
            "quality_score": quality_score,
            "delivery_score": crud.safe_float( getattr( vendor, "delivery_score", on_time_delivery ) ),
            "service_score": crud.safe_float( getattr( vendor, "service_score", 0 ) ),
            "status": getattr( vendor, "status", "Active" )
        },
        "summary": {
            "reliability_score": reliability_score,
            "total_purchase_orders": total_purchase_orders,
            "on_time_delivery": round(on_time_delivery, 1),
            "quality_rating": quality_score,
            "total_invoiced": round(total_invoiced, 2),
            "pending_payments": round(pending_payments, 2),
            "pending_invoice_count": pending_invoices,
            "delivered_orders": len(delivered_orders),
            "delayed_orders": len(delayed_orders),
            "in_transit_orders": len(in_transit_orders),
            "pending_orders": len(pending_orders),
            "order_completion_rate": round(order_completion_rate, 1)
        },
        "performance": {
            "on_time_deliveries": len(delivered_orders),
            "delayed_deliveries": len(delayed_orders),
            "quality_score": quality_score,
            "response_time_hours": 0,
            "issue_resolution_days": 0,
            "order_completion_rate": round(order_completion_rate, 1)
        },
        "purchase_orders": recent_purchase_orders,
        "contracts": {
            "total": total_contracts,
            "active": contract_status["active"],
            "expiring_soon": contract_status["expiring_soon"],
            "expired": contract_status["expired"],
            "draft": contract_status["draft"]
        },
        "invoices": {
            "total": len(invoices),
            "paid": paid_invoices,
            "pending": pending_invoices,
            "overdue": overdue_invoices,
            "total_amount": round(total_invoiced, 2),
            "pending_amount": round(pending_payments, 2)
        },
        "account": account,
        "notifications": [],
        "alerts": [],
        "documents": []
    }


# ==========================================================
# VENDOR PURCHASE ORDERS
# ==========================================================

@app.get("/api/vendor/{vendor_id}/purchase-orders", tags=["Vendor Dashboard"])
def get_vendor_purchase_orders( vendor_id: str, database: Session = Depends(db.get_db), skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100) ):

    vendor = ( database.query(db.Vendor) .filter(db.Vendor.vendor_id == vendor_id) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    orders = ( database.query(db.PurchaseOrder) .filter(db.PurchaseOrder.vendor_id == vendor_id) .order_by(db.PurchaseOrder.id.desc()) .offset(skip) .limit(limit) .all() )

    return {
        "success": True,
        "items": [
            {
                "id": po.id,

                "po_number": getattr( po, "po_number", f"PO-{po.id}" ),

                "status": getattr( po, "status", "Pending" ),

                "amount": crud.safe_float( getattr(po, "amount", 0) ),

                "order_date": crud.serialize_date( getattr( po, "order_date", None ) ),

                "expected_delivery": crud.serialize_date( getattr( po, "expected_delivery", None ) ),

                "actual_delivery": crud.serialize_date( getattr( po, "actual_delivery", None ) )
            }
            for po in orders
        ]
    }


# ============================================================
# VENDOR CRUD
# ============================================================

@app.post("/api/vendors", tags=["Vendor"])
def create_vendor( vendor: db.VendorCreate, database: Session = Depends(db.get_db), current_user: db.User = Depends(crud.get_current_user), ):

    return crud.create_vendor(database, vendor)


@app.get("/api/vendors", tags=["Vendor"])
def get_vendors(
    search: str = Query(""), status_filter: str = Query("All", alias="status"),
    category: str = Query("All"), rating: str = Query("All"),
    page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100),
    database: Session = Depends(db.get_db), current_user: db.User = Depends(crud.get_current_user),
):
    query = database.query(db.Vendor)
    if search:
        value = f"%{search}%"
        query = query.filter(or_(db.Vendor.vendor_id.ilike(value), db.Vendor.vendor_name.ilike(value), db.Vendor.email.ilike(value), db.Vendor.category.ilike(value)))

    if status_filter and status_filter != "All":
        query = query.filter(db.Vendor.status == status_filter)

    if category and category != "All":
        query = query.filter(db.Vendor.category == category)

    if rating and rating != "All":
        if rating == "Excellent":
            query = query.filter(db.Vendor.reliability_score >= 80)

        elif rating == "Good":
            query = query.filter(db.Vendor.reliability_score >= 60, db.Vendor.reliability_score < 80)

        elif rating == "Average":
            query = query.filter(db.Vendor.reliability_score >= 40, db.Vendor.reliability_score < 60)

        elif rating == "Poor":
            query = query.filter(db.Vendor.reliability_score < 40)

    total = query.count()
    pages = max(1, (total + limit - 1) // limit)
    vendors = query.order_by(db.Vendor.id.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "success": True,
        "vendors": [
            {
                "id": v.id, "vendor_id": v.vendor_id, "vendor_name": v.vendor_name, 
                "country": v.country, "email": v.email,
                "phone": v.phone, "business_type": v.business_type, "address": v.address,
                "category": v.category, "contact_person": v.contact_person, "status": v.status,
                "reliability_score": v.reliability_score, "trend": v.trend,
                "quality_score": v.quality_score, "delivery_score": v.delivery_score,
                "service_score": v.service_score, "contract_count": v.contract_count,
            } for v in vendors
        ],
        "total": total, "page": page, "limit": limit, "pages": pages,
    }


@app.get("/api/vendors/search", tags=["Vendor"])
def search_vendors(
    keyword: str = Query(..., min_length=1, max_length=100),
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user),
):
    return {"success": True, "vendors": crud.search_vendor(database, keyword)}


@app.get("/api/vendors/{vendor_id}", tags=["Vendor"])
def get_vendor(
    vendor_id: str, database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user),
):
    vendor = crud.get_vendor_by_vendor_id(database, vendor_id)
    if vendor is None:
        try: vendor = crud.get_vendor(database, int(vendor_id))
        except ValueError: vendor = None
    if vendor is None: raise HTTPException(status_code=404, detail="Vendor not found.")
    return vendor


@app.put("/api/vendors/{vendor_id}", tags=["Vendor"])
def update_vendor(
    vendor_id: str, vendor: db.VendorCreate, database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user),
):
    existing = crud.get_vendor_by_vendor_id(database, vendor_id)
    if existing is None:
        try: existing = crud.get_vendor(database, int(vendor_id))
        except ValueError: existing = None
    if existing is None: raise HTTPException(status_code=404, detail="Vendor not found.")
    return crud.update_vendor(database, existing.id, vendor)


@app.delete("/api/vendors/{vendor_id}", tags=["Vendor"])
def delete_vendor(
    vendor_id: str, database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.get_current_user),
):
    existing = crud.get_vendor_by_vendor_id(database, vendor_id)
    if existing is None:
        try: existing = crud.get_vendor(database, int(vendor_id))
        except ValueError: existing = None
    if existing is None: raise HTTPException(status_code=404, detail="Vendor not found.")
    crud.delete_vendor(database, existing.id)
    return {"success": True, "message": "Vendor deleted successfully."}


# ============================================================
# VENDOR PROFILE
# ============================================================

@app.get( "/api/vendor/profile/{vendor_id}", tags=["Vendor Profile"])
def get_vendor_profile( vendor_id: str, database: Session = Depends(db.get_db) ):

    try:
        # ======================================================
        # FIND VENDOR
        # ======================================================
        vendor = ( database .query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )
        if not vendor:
            raise HTTPException( status_code=404, detail=f"Vendor {vendor_id} not found" )

        # ======================================================
        # RETURN EXPLICIT JSON
        # ======================================================
        return {
            "id": vendor.id,
            "vendor_id": vendor.vendor_id,
            "vendor_name": vendor.vendor_name,
            "country": vendor.country,
            "email": vendor.email,
            "phone": vendor.phone,
            "business_type": vendor.business_type,
            "category": vendor.category,
            "address": vendor.address,
            "contact_person": vendor.contact_person,
            "status": vendor.status,
            "reliability_score": ( float(vendor.reliability_score or 0) ),
            "quality_score": ( float(vendor.quality_score or 0) ),
            "delivery_score": ( float(vendor.delivery_score or 0) ),
            "service_score": ( float(vendor.service_score or 0) ),
            "contract_count": ( int(vendor.contract_count or 0) )
        }
    except HTTPException:
        raise
    except Exception as e:
        print( "VENDOR PROFILE ERROR:", repr(e) )
        raise HTTPException( status_code=500, detail=str(e) )


# ============================================================
# UPDATE VENDOR PROFILE
# ============================================================
@app.put(
    "/api/vendor/profile/{vendor_id}",
    response_model=db.VendorProfileResponse
)
def update_vendor_profile(
    vendor_id: str,
    profile_data: db.VendorProfileUpdate,
    database: Session = Depends(db.get_db)
):
    try:
        vendor = crud.update_vendor_profile(
            database=database,
            vendor_id=vendor_id,
            profile_data=profile_data
        )

        if not vendor:
            raise HTTPException(
                status_code=404,
                detail="Vendor not found"
            )

        return {
            "id": vendor.id,
            "vendor_id": vendor.vendor_id,
            "vendor_name": vendor.vendor_name,
            "country": vendor.country,
            "email": vendor.email,
            "phone": vendor.phone,
            "business_type": vendor.business_type,
            "category": vendor.category,
            "address": vendor.address,
            "contact_person": vendor.contact_person,
            "status": vendor.status,
            "reliability_score": vendor.reliability_score,
            "quality_score": vendor.quality_score,
            "delivery_score": vendor.delivery_score,
            "service_score": vendor.service_score,
            "contract_count": vendor.contract_count
        }

    except HTTPException:
        raise

    except Exception as exc:
        database.rollback()
        print(f"Vendor profile update error: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update vendor profile"
        )


# ==========================================================
# PERFORMANCE DASHBOARD API
# ==========================================================

@app.get("/api/performance/dashboard", tags=["Vendor Dashboard"])
def get_performance_dashboard( vendor_id: str, database: Session = Depends(db.get_db) ):

    # ======================================================
    # FIND VENDOR
    # ======================================================

    vendor = ( database.query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )

    if vendor is None:
        raise HTTPException( status_code=404, detail="Vendor not found" )


    # ======================================================
    # GET PERFORMANCE HISTORY
    # ======================================================

    history = (
        database.query( db.VendorPerformanceHistory )
        .filter( db.VendorPerformanceHistory.vendor_id == vendor.vendor_id )
        .order_by(
            db.VendorPerformanceHistory.year.asc(),
            db.VendorPerformanceHistory.id.asc()
        ) .all() )


    # ======================================================
    # LATEST PERFORMANCE
    # ======================================================

    latest = None

    if history:
        latest = history[-1]


    # ======================================================
    # CURRENT PERFORMANCE VALUES
    # ======================================================

    on_time = (
        latest.on_time_deliveries
        if latest
        else vendor.delivery_score or 0
    )

    delayed = (
        latest.delayed_deliveries
        if latest
        else max( 0, 100 - (vendor.delivery_score or 0) )
    )

    quality = (
        latest.quality_rating
        if latest
        else vendor.quality_score or 0
    )

    response_time = (
        latest.response_time
        if latest
        else 0
    )

    resolution_time = (
        latest.issue_resolution_time
        if latest
        else 0
    )

    completion = (
        latest.order_completion_rate
        if latest
        else 0
    )

    overall_score = (
        latest.overall_score
        if latest
        else vendor.reliability_score or 0
    )


    # ======================================================
    # HISTORY JSON
    # ======================================================

    history_data = []

    for record in history:
        history_data.append({
            "month": record.month,
            "year": record.year,
            "on_time_deliveries": record.on_time_deliveries,
            "delayed_deliveries": record.delayed_deliveries,
            "quality_rating": record.quality_rating,
            "response_time": record.response_time,
            "issue_resolution_time": record.issue_resolution_time,
            "order_completion_rate": record.order_completion_rate,
            "overall_score": record.overall_score
        })


    # ======================================================
    # VENDOR RANKING
    # ======================================================
    #
    # Ranking is based on Vendor.reliability_score.
    #

    vendors = ( database.query(db.Vendor) .filter( db.Vendor.status != "Rejected" ) .order_by( db.Vendor.reliability_score.desc() ) .all() )


    ranking = []

    current_rank = None

    for index, item in enumerate( vendors, start=1 ):
        score = (
            item.reliability_score
            if item.reliability_score is not None
            else 0
        )

        ranking.append({
            "rank": index,
            "vendor_id": item.vendor_id,
            "vendor_name": item.vendor_name,
            "score": round(score, 1),
            "trend": item.trend or "-"
        })


        if item.vendor_id == vendor.vendor_id:
            current_rank = index


    # ======================================================
    # CATEGORY BREAKDOWN
    # ======================================================

    categories = [
        { "name": "On-Time Deliveries", "value": 25 },
        { "name": "Quality Rating", "value": 25 },
        { "name": "Response Time", "value": 20 },
        { "name": "Issue Resolution", "value": 15 },
        { "name": "Order Completion", "value": 15 }
    ]


    # ======================================================
    # INSIGHTS
    # ======================================================

    insights = [

        {
            "title": "On-time delivery performance is improving.",
            "description": "Continue maintaining current delivery performance."
        },

        {
            "title": "Quality rating is above target.",
            "description": "Maintain current product quality standards."
        },

        {
            "title": "Response time is being monitored.",
            "description": "Faster responses can improve vendor communication."
        },

        {
            "title": "Issue resolution performance is available.",
            "description": "Continue monitoring resolution times."
        }

    ]


    # ======================================================
    # FINAL RESPONSE
    # ======================================================

    return {
        "vendor": {
            "vendor_id": vendor.vendor_id,
            "vendor_name": vendor.vendor_name,
            "email": vendor.email,
            "phone": vendor.phone,
            "category": vendor.category,
            "status": vendor.status,
            "contact_person": vendor.contact_person
        },
        "metrics": {
            "overall_score": overall_score,
            "on_time_deliveries": on_time,
            "delayed_deliveries": delayed,
            "quality_rating": quality,
            "response_time": response_time,
            "issue_resolution_time": resolution_time,
            "order_completion_rate": completion,
            "reliability_score": vendor.reliability_score or 0,
            "delivery_score": vendor.delivery_score or 0,
            "quality_score": vendor.quality_score or 0,
            "service_score": vendor.service_score or 0,
            "contract_count": vendor.contract_count
        },
        "history": history_data,
        "ranking": ranking,
        "current_rank": current_rank,
        "categories": categories,
        "insights": insights
    }


# ============================================================
# LIST PURCHASE ORDERS
# ============================================================

# ============================================================
# LIST PURCHASE ORDERS FOR VENDOR
# ============================================================

@app.get(
    "/api/vendor/purchase-orders",
    tags=["Vendor Dashboard"]
)
def vendor_get_purchase_orders(
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    vendor_id: Optional[str] = Query(default=None),
    database: Session = Depends(db.get_db)
):

    query = database.query(
        db.PurchaseOrder
    )

    # --------------------------------------------------------
    # VENDOR FILTER
    # --------------------------------------------------------

    if vendor_id:
        query = query.filter(
            db.PurchaseOrder.vendor_id == vendor_id
        )

    # --------------------------------------------------------
    # SEARCH
    # --------------------------------------------------------

    if search:

        search_value = (
            f"%{search.strip()}%"
        )

        query = query.filter(
            db.PurchaseOrder.po_number.ilike(
                search_value
            )
        )

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    if status and status != "All":

        query = query.filter(
            db.PurchaseOrder.status == status
        )

    # --------------------------------------------------------
    # TOTAL
    # --------------------------------------------------------

    total = query.count()

    # --------------------------------------------------------
    # PAGINATION
    # --------------------------------------------------------

    offset = (
        (page - 1)
        * limit
    )

    orders = (
        query
        .order_by(
            db.PurchaseOrder.id.desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    items = []

    for order in orders:

        ordered_by = "Unknown"

        created_by = getattr(
            order,
            "created_by",
            None
        )

        if created_by:

            user = (
                database.query(db.User)
                .filter(
                    db.User.id == created_by
                )
                .first()
            )

            if user:

                ordered_by = (
                    getattr(
                        user,
                        "name",
                        None
                    )
                    or getattr(
                        user,
                        "fullname",
                        None
                    )
                    or getattr(
                        user,
                        "full_name",
                        None
                    )
                    or getattr(
                        user,
                        "username",
                        None
                    )
                    or getattr(
                        user,
                        "email",
                        None
                    )
                    or "Unknown"
                )

        items.append(
            {
                "id": order.id,

                "po_number": (
                    order.po_number
                    or f"PO-{order.id}"
                ),

                "ordered_by": ordered_by,

                "vendor_id": order.vendor_id,

                "amount": float(
                    order.amount or 0
                ),

                "status": (
                    order.status
                    or "Pending"
                ),

                "order_date": (
                    order.order_date.isoformat()
                    if order.order_date
                    else None
                ),

                "expected_delivery": (
                    order.expected_delivery.isoformat()
                    if order.expected_delivery
                    else None
                ),

                "actual_delivery": (
                    order.actual_delivery.isoformat()
                    if order.actual_delivery
                    else None
                )
            }
        )

    return {
        "success": True,

        "items": items,

        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (
                (total + limit - 1)
                // limit
                if total
                else 1
            )
        }
    }


# ============================================================
# PURCHASE ORDER STATISTICS
# ============================================================

@app.get(
    "/api/vendor/purchase-orders/statistics",
    tags=["Vendor Dashboard"]
)
def get_purchase_order_statistics(
    vendor_id: Optional[str] = Query(default=None),
    database: Session = Depends(db.get_db)
):

    query = database.query(
        db.PurchaseOrder
    )

    if vendor_id:
        query = query.filter(
            db.PurchaseOrder.vendor_id == vendor_id
        )

    orders = query.all()

    total_orders = len(orders)

    delivered = 0
    in_transit = 0
    pending = 0
    cancelled = 0

    total_value = 0.0

    for order in orders:

        status = (
            order.status or ""
        ).strip().lower()

        total_value += float(
            order.amount or 0
        )

        if status == "delivered":

            delivered += 1

        elif status in [
            "in transit",
            "in_transit",
            "shipped"
        ]:

            in_transit += 1

        elif status == "cancelled":

            cancelled += 1

        elif status in [
            "pending",
            "approved",
            "ordered"
        ]:

            pending += 1

    def percentage(value):

        if total_orders == 0:
            return 0

        return round(
            value / total_orders * 100,
            1
        )

    return {

        "success": True,

        "statistics": {

            "total_orders":
                total_orders,

            "delivered":
                delivered,

            "delivered_percentage":
                percentage(delivered),

            "in_transit":
                in_transit,

            "in_transit_percentage":
                percentage(in_transit),

            "pending":
                pending,

            "pending_percentage":
                percentage(pending),

            "cancelled":
                cancelled,

            "cancelled_percentage":
                percentage(cancelled),

            "total_value":
                round(
                    total_value,
                    2
                )
        }
    }


# ============================================================
# GET COMPLETE VENDOR PURCHASE ORDER DETAILS
# ============================================================

@app.get(
    "/api/vendor/purchase-orders/{po_id}",
    tags=["Vendor Dashboard"]
)
def vendor_get_purchase_order_details(
    po_id: int,
    vendor_id: str = Query(...),
    database: Session = Depends(db.get_db)
):

    purchase_order = (
        crud.get_vendor_purchase_order_details(
            database=database,
            po_id=po_id,
            vendor_id=vendor_id
        )
    )

    if purchase_order is None:

        raise HTTPException(
            status_code=404,
            detail="Purchase order not found."
        )

    return {
        "success": True,
        "purchase_order": purchase_order
    }


# ============================================================
# DOWNLOAD COMPLETE PURCHASE ORDER PDF
# ============================================================

@app.get(
    "/api/vendor/purchase-orders/{po_id}/pdf",
    tags=["Vendor Dashboard"]
)
def download_vendor_purchase_order_pdf(
    po_id: int,
    vendor_id: str = Query(...),
    database: Session = Depends(db.get_db)
):

    # ========================================================
    # FETCH COMPLETE PURCHASE ORDER
    # ========================================================

    purchase_order = (
        crud.get_vendor_purchase_order_details(
            database=database,
            po_id=po_id,
            vendor_id=vendor_id
        )
    )

    if purchase_order is None:

        raise HTTPException(
            status_code=404,
            detail="Purchase order not found."
        )

    # ========================================================
    # COLORS
    # ========================================================

    NAVY = colors.HexColor("#071A3D")
    NAVY_LIGHT = colors.HexColor("#12366B")
    BLUE = colors.HexColor("#2387F5")
    CYAN = colors.HexColor("#00BDF2")

    TEXT = colors.HexColor("#102B55")
    MUTED = colors.HexColor("#526B91")

    BORDER = colors.HexColor("#DCE8F7")
    PANEL = colors.HexColor("#F5F9FE")
    PANEL_BLUE = colors.HexColor("#EDF5FF")

    WHITE = colors.white

    GREEN = colors.HexColor("#147A54")
    GREEN_BG = colors.HexColor("#DDF6EA")

    # ========================================================
    # HELPERS
    # ========================================================

    def money(value):

        try:

            return f"{float(value or 0):,.2f}"

        except (
            TypeError,
            ValueError
        ):

            return "0.00"

    def safe(value):

        return escape(
            str(
                value
                if value is not None
                else "-"
            )
        )

    def date_text(value):

        if not value:
            return "-"

        if isinstance(value, datetime):

            return value.strftime(
                "%d %b %Y"
            )

        if hasattr(value, "strftime"):

            return value.strftime(
                "%d %b %Y"
            )

        return str(value)

    def get_value(
        key,
        default="-"
    ):

        value = purchase_order.get(
            key
        )

        return (
            value
            if value not in (
                None,
                ""
            )
            else default
        )

    def get_nested_value(
        data,
        key,
        default="-"
    ):

        if not data:
            return default

        value = data.get(key)

        return (
            value
            if value not in (
                None,
                ""
            )
            else default
        )

    # ========================================================
    # NESTED DATA
    # ========================================================

    vendor = (
        purchase_order.get("vendor")
        or {}
    )

    details = (
        purchase_order.get("details")
        or {}
    )

    warehouse = (
        purchase_order.get("warehouse")
        or {}
    )

    totals = (
        purchase_order.get("totals")
        or {}
    )

    items = (
        purchase_order.get("items")
        or []
    )

    # ========================================================
    # BASIC INFORMATION
    # ========================================================

    po_number = get_value(
        "po_number",
        f"PO-{po_id}"
    )

    order_date = date_text(
        purchase_order.get(
            "order_date"
        )
    )

    expected_delivery = date_text(
        purchase_order.get(
            "expected_delivery"
        )
    )

    actual_delivery = date_text(
        purchase_order.get(
            "actual_delivery"
        )
    )

    created_at = date_text(
        purchase_order.get(
            "created_at"
        )
    )

    approved_at = date_text(
        purchase_order.get(
            "approved_at"
        )
    )

    received_at = date_text(
        purchase_order.get(
            "received_at"
        )
    )

    status = get_value(
        "status"
    )

    ordered_by = get_value(
        "ordered_by"
    )

    department = get_value(
        "department"
    )

    category = get_value(
        "category"
    )

    pr_number = get_value(
        "pr_number"
    )

    pr_id = get_value(
        "pr_id"
    )

    # ========================================================
    # VENDOR INFORMATION
    # ========================================================

    vendor_id_value = (
        get_nested_value(
            vendor,
            "vendor_id",
            vendor_id
        )
    )

    vendor_name = get_nested_value(
        vendor,
        "vendor_name"
    )

    vendor_email = get_nested_value(
        vendor,
        "email"
    )

    vendor_phone = get_nested_value(
        vendor,
        "phone"
    )

    vendor_contact = get_nested_value(
        vendor,
        "contact_person"
    )

    vendor_address = get_nested_value(
        vendor,
        "address"
    )

    vendor_country = get_nested_value(
        vendor,
        "country"
    )

    vendor_category = get_nested_value(
        vendor,
        "category"
    )

    vendor_business_type = get_nested_value(
        vendor,
        "business_type"
    )

    vendor_website = get_nested_value(
        vendor,
        "website"
    )

    vendor_gst = get_nested_value(
        vendor,
        "gst_vat_number"
    )

    vendor_tax_id = get_nested_value(
        vendor,
        "tax_id_ein"
    )

    vendor_pan = get_nested_value(
        vendor,
        "pan_number"
    )

    # ========================================================
    # PO DETAIL INFORMATION
    # ========================================================

    po_type = get_nested_value(
        details,
        "po_type"
    )

    supplier_reference = get_nested_value(
        details,
        "supplier_reference"
    )

    contact_person = get_nested_value(
        details,
        "contact_person"
    )

    contact_phone = get_nested_value(
        details,
        "contact_phone"
    )

    contact_email = get_nested_value(
        details,
        "contact_email"
    )

    payment_method = get_nested_value(
        details,
        "payment_method"
    )

    payment_terms = get_nested_value(
        details,
        "payment_terms"
    )

    incoterms = get_nested_value(
        details,
        "incoterms"
    )

    currency = get_nested_value(
        details,
        "currency"
    )

    exchange_rate = get_nested_value(
        details,
        "exchange_rate"
    )

    notes = get_nested_value(
        details,
        "notes",
        ""
    )

    # ========================================================
    # WAREHOUSE INFORMATION
    # ========================================================

    warehouse_code = get_nested_value(
        warehouse,
        "warehouse_code"
    )

    warehouse_name = get_nested_value(
        warehouse,
        "warehouse_name"
    )

    warehouse_location = get_nested_value(
        warehouse,
        "location"
    )

    warehouse_manager = get_nested_value(
        warehouse,
        "manager_name"
    )

    warehouse_status = get_nested_value(
        warehouse,
        "status"
    )

    # ========================================================
    # TOTALS
    # ========================================================

    subtotal = totals.get(
        "subtotal",
        details.get(
            "subtotal",
            0
        )
    )

    tax_amount = totals.get(
        "tax_amount",
        details.get(
            "tax_amount",
            0
        )
    )

    shipping_amount = totals.get(
        "shipping_amount",
        details.get(
            "shipping_amount",
            0
        )
    )

    total_amount = totals.get(
        "total_amount",
        details.get(
            "total_amount",
            purchase_order.get(
                "amount",
                0
            )
        )
    )

    # ========================================================
    # DOCUMENT
    # ========================================================

    buffer = io.BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,

        rightMargin=18 * mm,
        leftMargin=18 * mm,

        topMargin=43 * mm,
        bottomMargin=18 * mm,

        title="VendorIQ Purchase Order",
        author="VendorIQ",
        subject="Purchase Order Document"
    )

    # ========================================================
    # STYLES
    # ========================================================

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "PO_Title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=25,
        leading=30,
        textColor=NAVY,
        alignment=TA_LEFT,
        spaceAfter=8
    )

    subtitle_style = ParagraphStyle(
        "PO_Subtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=15,
        textColor=MUTED
    )

    section_style = ParagraphStyle(
        "PO_Section",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12.5,
        leading=16,
        textColor=NAVY,
        spaceAfter=5
    )

    label_style = ParagraphStyle(
        "PO_Label",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=MUTED
    )

    value_style = ParagraphStyle(
        "PO_Value",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=TEXT
    )

    small_style = ParagraphStyle(
        "PO_Small",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=MUTED
    )

    table_header_style = ParagraphStyle(
        "PO_TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9,
        textColor=WHITE
    )

    table_cell_style = ParagraphStyle(
        "PO_TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=TEXT
    )

    total_label_style = ParagraphStyle(
        "PO_TotalLabel",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=TEXT
    )

    total_value_style = ParagraphStyle(
        "PO_TotalValue",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=TEXT,
        alignment=TA_RIGHT
    )

    grand_total_label_style = ParagraphStyle(
        "PO_GrandLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=13,
        textColor=WHITE
    )

    grand_total_value_style = ParagraphStyle(
        "PO_GrandValue",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=13,
        textColor=WHITE,
        alignment=TA_RIGHT
    )

    story = []

    # ========================================================
    # TITLE
    # ========================================================

    story.append(
        Paragraph(
            "PURCHASE ORDER",
            ParagraphStyle(
                "Eyebrow",
                parent=styles["Normal"],
                fontName="Helvetica-Bold",
                fontSize=8.5,
                leading=11,
                textColor=BLUE,
                tracking=2
            )
        )
    )

    story.append(
        Spacer(1, 3)
    )

    story.append(
        Paragraph(
            "VendorIQ Purchase Order",
            title_style
        )
    )

    story.append(
        Paragraph(
            "This document confirms your purchase order "
            "and contains all relevant order, vendor, "
            "commercial, item and delivery information.",
            subtitle_style
        )
    )

    story.append(
        Spacer(1, 15)
    )

    # ========================================================
    # PO NUMBER CARD
    # ========================================================

    po_card_data = [

        [
            Paragraph(
                "<b>PO Number</b>",
                label_style
            ),

            Paragraph(
                f"<b>{safe(po_number)}</b>",
                ParagraphStyle(
                    "PO_Number",
                    parent=value_style,
                    fontSize=13,
                    textColor=NAVY
                )
            )
        ],

        [
            Paragraph(
                "Order Date",
                label_style
            ),

            Paragraph(
                safe(order_date),
                value_style
            )
        ],

        [
            Paragraph(
                "Status",
                label_style
            ),

            Paragraph(
                safe(status),
                value_style
            )
        ]
    ]

    po_card = Table(
        po_card_data,
        colWidths=[
            38 * mm,
            55 * mm
        ]
    )

    po_card.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, -1),
                PANEL_BLUE
            ),

            (
                "BOX",
                (0, 0),
                (-1, -1),
                0.8,
                BORDER
            ),

            (
                "LINEBELOW",
                (0, 0),
                (-1, -2),
                0.6,
                BORDER
            ),

            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                10
            ),

            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                10
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                7
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                7
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "MIDDLE"
            )
        ])
    )

    story.append(
        Table(
            [[
                Paragraph(
                    "",
                    value_style
                ),
                po_card
            ]],

            colWidths=[
                document.width - 93 * mm,
                93 * mm
            ],

            style=TableStyle([
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "TOP"
                ),

                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    0
                ),

                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    0
                ),

                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    0
                ),

                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    0
                )
            ])
        )
    )

    story.append(
        Spacer(1, 15)
    )

    # ========================================================
    # INFO ROW
    # ========================================================

    def info_row(
        label,
        value
    ):

        return [
            Paragraph(
                safe(label),
                label_style
            ),

            Paragraph(
                safe(value),
                value_style
            )
        ]

    # ========================================================
    # PURCHASE ORDER INFORMATION
    # ========================================================

    purchase_details = [
        [
            Paragraph(
                "<b>Purchase Order Details</b>",
                section_style
            )
        ],

        [
            Table(
                [
                    info_row(
                        "Purchase Order ID",
                        po_number
                    ),

                    info_row(
                        "Ordered By",
                        ordered_by
                    ),

                    info_row(
                        "Vendor ID",
                        vendor_id_value
                    ),

                    info_row(
                        "Vendor Name",
                        vendor_name
                    ),

                    info_row(
                        "Order Date",
                        order_date
                    ),

                    info_row(
                        "Expected Delivery",
                        expected_delivery
                    ),

                    info_row(
                        "Actual Delivery",
                        actual_delivery
                    ),

                    info_row(
                        "Status",
                        status
                    ),

                    info_row(
                        "Department",
                        department
                    ),

                    info_row(
                        "Category",
                        category
                    ),

                    info_row(
                        "PR Number",
                        pr_number
                    ),

                    info_row(
                        "PR ID",
                        pr_id
                    )
                ],

                colWidths=[
                    34 * mm,
                    55 * mm
                ],

                style=TableStyle([
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "TOP"
                    ),

                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        0
                    ),

                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        4
                    ),

                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        3
                    ),

                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        3
                    )
                ])
            )
        ]
    ]

    # ========================================================
    # VENDOR INFORMATION
    # ========================================================

    vendor_details = [
        [
            Paragraph(
                "<b>Vendor Information</b>",
                section_style
            )
        ],

        [
            Table(
                [
                    info_row(
                        "Vendor ID",
                        vendor_id_value
                    ),

                    info_row(
                        "Vendor Name",
                        vendor_name
                    ),

                    info_row(
                        "Email",
                        vendor_email
                    ),

                    info_row(
                        "Phone",
                        vendor_phone
                    ),

                    info_row(
                        "Contact Person",
                        vendor_contact
                    ),

                    info_row(
                        "Address",
                        vendor_address
                    ),

                    info_row(
                        "Country",
                        vendor_country
                    ),

                    info_row(
                        "Business Type",
                        vendor_business_type
                    ),

                    info_row(
                        "Category",
                        vendor_category
                    ),

                    info_row(
                        "Website",
                        vendor_website
                    ),

                    info_row(
                        "GST / VAT",
                        vendor_gst
                    ),

                    info_row(
                        "Tax ID / EIN",
                        vendor_tax_id
                    ),

                    info_row(
                        "PAN",
                        vendor_pan
                    )
                ],

                colWidths=[
                    34 * mm,
                    55 * mm
                ],

                style=TableStyle([
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "TOP"
                    ),

                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        0
                    ),

                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        4
                    ),

                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        3
                    ),

                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        3
                    )
                ])
            )
        ]
    ]

    # ========================================================
    # MAIN INFO TABLE
    # ========================================================

    info_table = Table(
        [[
            purchase_details,
            vendor_details
        ]],

        colWidths=[
            document.width / 2,
            document.width / 2
        ]
    )

    info_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, -1),
                PANEL
            ),

            (
                "BOX",
                (0, 0),
                (-1, -1),
                0.8,
                BORDER
            ),

            (
                "LINEAFTER",
                (0, 0),
                (0, 0),
                0.8,
                BORDER
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP"
            ),

            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                12
            ),

            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                12
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                10
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                10
            )
        ])
    )

    story.append(
        info_table
    )

    story.append(
        Spacer(1, 12)
    )

    # ========================================================
    # COMMERCIAL / PAYMENT INFORMATION
    # ========================================================

    commercial_data = [

        [
            Paragraph(
                "<b>Order & Payment Information</b>",
                section_style
            )
        ],

        [
            Table(
                [
                    info_row(
                        "PO Type",
                        po_type
                    ),

                    info_row(
                        "Supplier Reference",
                        supplier_reference
                    ),

                    info_row(
                        "Payment Method",
                        payment_method
                    ),

                    info_row(
                        "Payment Terms",
                        payment_terms
                    )
                ],

                colWidths=[
                    40 * mm,
                    55 * mm
                ],

                style=TableStyle([
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "TOP"
                    ),

                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        0
                    ),

                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        4
                    ),

                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        3
                    ),

                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        3
                    )
                ])
            )
        ]
    ]

    delivery_data = [

        [
            Paragraph(
                "<b>Commercial & Delivery Information</b>",
                section_style
            )
        ],

        [
            Table(
                [
                    info_row(
                        "Incoterms",
                        incoterms
                    ),

                    info_row(
                        "Currency",
                        currency
                    ),

                    info_row(
                        "Exchange Rate",
                        exchange_rate
                    ),

                    info_row(
                        "Warehouse",
                        warehouse_name
                    ),

                    info_row(
                        "Warehouse Code",
                        warehouse_code
                    ),

                    info_row(
                        "Location",
                        warehouse_location
                    ),

                    info_row(
                        "Manager",
                        warehouse_manager
                    ),

                    info_row(
                        "Warehouse Status",
                        warehouse_status
                    )
                ],

                colWidths=[
                    40 * mm,
                    55 * mm
                ],

                style=TableStyle([
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "TOP"
                    ),

                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        0
                    ),

                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        4
                    ),

                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        3
                    ),

                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        3
                    )
                ])
            )
        ]
    ]

    commercial_table = Table(
        [[
            commercial_data,
            delivery_data
        ]],

        colWidths=[
            document.width / 2,
            document.width / 2
        ]
    )

    commercial_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, -1),
                PANEL_BLUE
            ),

            (
                "BOX",
                (0, 0),
                (-1, -1),
                0.8,
                BORDER
            ),

            (
                "LINEAFTER",
                (0, 0),
                (0, 0),
                0.8,
                BORDER
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP"
            ),

            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                12
            ),

            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                12
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                9
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                9
            )
        ])
    )

    story.append(
        commercial_table
    )

    story.append(
        Spacer(1, 16)
    )

    # ========================================================
    # ORDER ITEMS
    # ========================================================

    story.append(
        Paragraph(
            "Order Items",
            section_style
        )
    )

    story.append(
        Spacer(1, 4)
    )

    item_data = [[

        Paragraph(
            "Item Code",
            table_header_style
        ),

        Paragraph(
            "Description",
            table_header_style
        ),

        Paragraph(
            "UOM",
            table_header_style
        ),

        Paragraph(
            "Qty",
            table_header_style
        ),

        Paragraph(
            "Unit Price",
            table_header_style
        ),

        Paragraph(
            "Tax %",
            table_header_style
        ),

        Paragraph(
            "Tax",
            table_header_style
        ),

        Paragraph(
            "Amount",
            table_header_style
        )
    ]]

    for item in items:

        item_data.append([

            Paragraph(
                safe(
                    item.get(
                        "item_code"
                    )
                ),
                table_cell_style
            ),

            Paragraph(
                safe(
                    item.get(
                        "item_description"
                    )
                ),
                table_cell_style
            ),

            Paragraph(
                safe(
                    item.get(
                        "uom"
                    )
                ),
                table_cell_style
            ),

            Paragraph(
                f"{float(item.get('quantity', 0) or 0):,.2f}",
                table_cell_style
            ),

            Paragraph(
                money(
                    item.get(
                        "unit_price"
                    )
                ),
                table_cell_style
            ),

            Paragraph(
                f"{float(item.get('tax_rate', 0) or 0):,.2f}%",
                table_cell_style
            ),

            Paragraph(
                money(
                    item.get(
                        "tax_amount"
                    )
                ),
                table_cell_style
            ),

            Paragraph(
                money(
                    item.get(
                        "amount"
                    )
                ),
                table_cell_style
            )
        ])

    if not items:

        item_data.append([

            Paragraph(
                "-",
                table_cell_style
            ),

            Paragraph(
                "No items available",
                table_cell_style
            ),

            Paragraph(
                "-",
                table_cell_style
            ),

            Paragraph(
                "-",
                table_cell_style
            ),

            Paragraph(
                "-",
                table_cell_style
            ),

            Paragraph(
                "-",
                table_cell_style
            ),

            Paragraph(
                "-",
                table_cell_style
            ),

            Paragraph(
                "-",
                table_cell_style
            )
        ])

    item_table = Table(
        item_data,

        repeatRows=1,

        colWidths=[
            21 * mm,
            42 * mm,
            14 * mm,
            15 * mm,
            22 * mm,
            16 * mm,
            20 * mm,
            24 * mm
        ]
    )

    item_table.setStyle(
        TableStyle([

            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                NAVY_LIGHT
            ),

            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                BORDER
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "MIDDLE"
            ),

            (
                "ALIGN",
                (3, 1),
                (-1, -1),
                "RIGHT"
            ),

            (
                "ROWBACKGROUNDS",
                (0, 1),
                (-1, -1),
                [
                    WHITE,
                    PANEL
                ]
            ),

            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                5
            ),

            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                5
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                6
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                6
            )
        ])
    )

    story.append(
        item_table
    )

    story.append(
        Spacer(1, 15)
    )

    # ========================================================
    # TOTALS
    # ========================================================

    totals_data = [

        [
            Paragraph(
                "Subtotal",
                total_label_style
            ),

            Paragraph(
                money(subtotal),
                total_value_style
            )
        ],

        [
            Paragraph(
                "Tax",
                total_label_style
            ),

            Paragraph(
                money(tax_amount),
                total_value_style
            )
        ],

        [
            Paragraph(
                "Shipping",
                total_label_style
            ),

            Paragraph(
                money(shipping_amount),
                total_value_style
            )
        ],

        [
            Paragraph(
                "Total Amount",
                grand_total_label_style
            ),

            Paragraph(
                money(total_amount),
                grand_total_value_style
            )
        ]
    ]

    totals_table = Table(
        totals_data,

        colWidths=[
            42 * mm,
            35 * mm
        ],

        hAlign="RIGHT"
    )

    totals_table.setStyle(
        TableStyle([

            (
                "BOX",
                (0, 0),
                (-1, -1),
                0.8,
                BORDER
            ),

            (
                "GRID",
                (0, 0),
                (-1, -2),
                0.5,
                BORDER
            ),

            (
                "BACKGROUND",
                (0, 0),
                (-1, -2),
                PANEL
            ),

            (
                "BACKGROUND",
                (0, -1),
                (-1, -1),
                NAVY
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "MIDDLE"
            ),

            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                10
            ),

            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                10
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                8
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                8
            )
        ])
    )

    story.append(
        totals_table
    )

    # ========================================================
    # WORKFLOW DATES
    # ========================================================

    story.append(
        Spacer(1, 14)
    )

    workflow_table = Table(
        [[

            Paragraph(
                "Created",
                label_style
            ),

            Paragraph(
                safe(created_at),
                value_style
            ),

            Paragraph(
                "Approved",
                label_style
            ),

            Paragraph(
                safe(approved_at),
                value_style
            ),

            Paragraph(
                "Received",
                label_style
            ),

            Paragraph(
                safe(received_at),
                value_style
            )
        ]],

        colWidths=[
            20 * mm,
            30 * mm,
            20 * mm,
            30 * mm,
            20 * mm,
            30 * mm
        ]
    )

    workflow_table.setStyle(
        TableStyle([

            (
                "BACKGROUND",
                (0, 0),
                (-1, -1),
                PANEL_BLUE
            ),

            (
                "BOX",
                (0, 0),
                (-1, -1),
                0.8,
                BORDER
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "MIDDLE"
            ),

            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                6
            ),

            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                6
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                7
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                7
            )
        ])
    )

    story.append(
        workflow_table
    )

    # ========================================================
    # NOTES
    # ========================================================

    if notes:

        story.append(
            Spacer(1, 16)
        )

        story.append(
            Paragraph(
                "Notes",
                section_style
            )
        )

        notes_table = Table(
            [[
                Paragraph(
                    safe(notes),

                    ParagraphStyle(
                        "NotesText",
                        parent=value_style,
                        fontSize=9,
                        leading=15
                    )
                )
            ]],

            colWidths=[
                document.width
            ]
        )

        notes_table.setStyle(
            TableStyle([

                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, -1),
                    PANEL_BLUE
                ),

                (
                    "BOX",
                    (0, 0),
                    (-1, -1),
                    0.8,
                    BORDER
                ),

                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    12
                ),

                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    12
                ),

                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    12
                ),

                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    12
                )
            ])
        )

        story.append(
            notes_table
        )

    # ========================================================
    # PDF HEADER / FOOTER
    # ========================================================

    def draw_brand_logo(
        canvas,
        x,
        y,
        scale=1
    ):

        canvas.saveState()

        canvas.setFillColor(
            BLUE
        )

        canvas.setStrokeColor(
            BLUE
        )

        canvas.setLineWidth(
            2.5 * scale
        )

        canvas.line(
            x,
            y + 13 * scale,
            x + 9 * scale,
            y - 1 * scale
        )

        canvas.line(
            x + 9 * scale,
            y - 1 * scale,
            x + 18 * scale,
            y + 13 * scale
        )

        canvas.setFillColor(
            CYAN
        )

        canvas.setFont(
            "Helvetica-Bold",
            23
        )

        canvas.drawString(
            38 * mm,
            A4[1] - 18 * mm,
            "Vendor"
        )

        canvas.setFillColor(
            CYAN
        )

        canvas.drawString(
            74 * mm,
            A4[1] - 18 * mm,
            "IQ"
        )

        canvas.restoreState()

    # ========================================================
    # HEADER / FOOTER
    # ========================================================

    def draw_header_footer(
        canvas,
        doc
    ):

        width, height = A4

        canvas.saveState()

        # ----------------------------------------------------
        # HEADER BACKGROUND
        # ----------------------------------------------------

        canvas.setFillColor(
            NAVY
        )

        canvas.rect(
            0,
            height - 35 * mm,
            width,
            35 * mm,
            fill=1,
            stroke=0
        )

        # ----------------------------------------------------
        # BRAND
        # ----------------------------------------------------

        canvas.setFillColor(
            WHITE
        )

        canvas.setFont(
            "Helvetica-Bold",
            23
        )

        canvas.drawString(
            38 * mm,
            height - 18 * mm,
            "Vendor"
        )

        canvas.setFillColor(
            CYAN
        )

        canvas.drawString(
            74 * mm,
            height - 18 * mm,
            "IQ"
        )

        canvas.setFillColor(
            colors.HexColor(
                "#BFD0E8"
            )
        )

        canvas.setFont(
            "Helvetica",
            8.5
        )

        canvas.drawString(
            38 * mm,
            height - 25 * mm,
            "Vendor Reliability Platform"
        )

        # ----------------------------------------------------
        # TAGLINE
        # ----------------------------------------------------

        canvas.setFillColor(
            colors.HexColor(
                "#DCE8F7"
            )
        )

        canvas.setFont(
            "Helvetica",
            7.5
        )

        canvas.drawRightString(
            width - 18 * mm,
            height - 19 * mm,
            "Better Vendors  |  Stronger Supply Chains  |  "
            "A Smarter Tomorrow"
        )

        # ----------------------------------------------------
        # FOOTER
        # ----------------------------------------------------

        footer_y = 13 * mm

        canvas.setStrokeColor(
            BORDER
        )

        canvas.setLineWidth(
            0.8
        )

        canvas.line(
            18 * mm,
            footer_y + 7 * mm,
            width - 18 * mm,
            footer_y + 7 * mm
        )

        canvas.setFillColor(
            BLUE
        )

        canvas.setFont(
            "Helvetica-Oblique",
            9
        )

        canvas.drawString(
            18 * mm,
            footer_y,
            "Thank you for your business!"
        )

        canvas.setFillColor(
            NAVY
        )

        canvas.setFont(
            "Helvetica-Bold",
            11
        )

        canvas.drawString(
            width - 46 * mm,
            footer_y + 1 * mm,
            "VendorIQ"
        )

        canvas.setFillColor(
            MUTED
        )

        canvas.setFont(
            "Helvetica",
            6.5
        )

        canvas.drawRightString(
            width - 18 * mm,
            footer_y - 4 * mm,
            f"Page {doc.page}"
        )

        canvas.restoreState()

    # ========================================================
    # BUILD
    # ========================================================

    document.build(
        story,
        onFirstPage=draw_header_footer,
        onLaterPages=draw_header_footer
    )

    buffer.seek(0)

    filename = (
        f"{po_number}.pdf"
    )

    return StreamingResponse(
        buffer,
        media_type="application/pdf",

        headers={
            "Content-Disposition":
                f'attachment; filename="{filename}"'
        }
    )


# ============================================================
# MARK PURCHASE ORDER AS DELIVERED
# ============================================================

@app.patch(
    "/api/vendor/purchase-orders/{po_id}/delivered",
    tags=["Vendor Dashboard"]
)
def mark_vendor_purchase_order_delivered(
    po_id: int,
    vendor_id: str = Query(...),
    database: Session = Depends(db.get_db)
):

    purchase_order = (
        crud.mark_vendor_purchase_order_delivered(
            database=database,
            po_id=po_id,
            vendor_id=vendor_id
        )
    )

    if purchase_order is None:

        raise HTTPException(
            status_code=404,
            detail="Purchase order not found."
        )

    return {
        "success": True,

        "message": (
            "Purchase order marked as delivered."
        ),

        "po_id": purchase_order.id,

        "po_number": purchase_order.po_number,

        "status": purchase_order.status,

        "actual_delivery": (
            purchase_order.actual_delivery.isoformat()
            if purchase_order.actual_delivery
            else None
        )
    }


# ============================================================
# CREATE PURCHASE ORDER
# ============================================================

@app.post("/api/vendor/purchase-orders", tags=["Vendor Dashboard"])
def vendor_create_purchase_order( payload: db.PurchaseOrderCreate, database: Session = Depends( db.get_db ), ):

    existing = ( database.query( db.PurchaseOrder ) .filter( db.PurchaseOrder.po_number == payload.po_number ) .first() )


    if existing:
        raise HTTPException( status_code=400, detail="Purchase order number already exists." )


    order = db.PurchaseOrder(

        po_number=payload.po_number,

        vendor_id=payload.vendor_id,

        amount=payload.amount,

        status=payload.status,

        order_date=payload.order_date,

        expected_delivery= payload.expected_delivery,

        actual_delivery= payload.actual_delivery,
    )


    database.add(order)

    database.commit()

    database.refresh(order)


    return {

        "success": True,

        "message": "Purchase order created successfully.",

        "purchase_order": {

            "id": order.id,
            "po_number": order.po_number,
            "vendor_id": order.vendor_id,
            "amount": float(order.amount or 0),
            "status": order.status,

            "order_date": (
                order.order_date.isoformat()
                if order.order_date
                else None
            ),

            "expected_delivery": (
                order.expected_delivery.isoformat()
                if order.expected_delivery
                else None
            ),

            "actual_delivery": (
                order.actual_delivery.isoformat()
                if order.actual_delivery
                else None
            ),
        }
    }


# ============================================================
# UPDATE PURCHASE ORDER
# ============================================================

@app.put( "/api/vendor/purchase-orders/{purchase_order_id}", tags=["Vendor Dashboard"])
def update_vendor_purchase_order( purchase_order_id: int, payload: db.PurchaseOrderUpdate, database: Session = Depends( db.get_db ),  ):

    order = ( database.query( db.PurchaseOrder ) .filter( db.PurchaseOrder.id == purchase_order_id ) .first() )


    if not order:
        raise HTTPException( status_code=404, detail="Purchase order not found." )


    data = payload.model_dump( exclude_unset=True )


    for key, value in data.items():
        setattr( order, key, value )


    database.commit()

    database.refresh(order)


    return {

        "success": True,

        "message": "Purchase order updated successfully.",

        "purchase_order": {
            "id": order.id,
            "po_number": order.po_number,
            "vendor_id": order.vendor_id,
            "amount": float(order.amount or 0),
            "status": order.status,

            "order_date": (
                order.order_date.isoformat()
                if order.order_date
                else None
            ),

            "expected_delivery": (
                order.expected_delivery.isoformat()
                if order.expected_delivery
                else None
            ),

            "actual_delivery": (
                order.actual_delivery.isoformat()
                if order.actual_delivery
                else None
            ),
        }
    }


# ============================================================
# DELETE
# ============================================================

@app.delete( "/api/vendor/purchase-orders/{purchase_order_id}", tags=["Vendor Dashboard"])
def delete_vendor_purchase_order( purchase_order_id: int, database: Session = Depends( db.get_db ), ):

    order = ( database.query( db.PurchaseOrder ) .filter( db.PurchaseOrder.id == purchase_order_id ) .first() )

    if not order:
        raise HTTPException( status_code=404, detail="Purchase order not found." )

    database.delete(order)

    database.commit()

    return { "success": True, "message": "Purchase order deleted successfully." }


# ============================================================
# CONTRACT AND COMPLIANCE IN VENDOR DASHBOARD
# ============================================================

# ============================================================
# CONTRACT NUMBER
# ============================================================

def generate_contract_number( database: Session, vendor_id: str, ) -> str:

    year = datetime.now().year

    prefix = f"CON-{vendor_id}-{year}-"

    last_contract = (
        database.query(db.Contract)
        .filter( db.Contract.contract_number.like( f"{prefix}%" ) )
        .order_by( db.Contract.id.desc() ) .first()
    )

    if last_contract:

        try:
            last_number = int( last_contract.contract_number.split("-")[-1] )

        except (ValueError, IndexError):
            last_number = 0

    else:
        last_number = 0

    return ( f"{prefix} {last_number + 1:06d}" )


# ============================================================
# DASHBOARD
# IMPORTANT: THIS MUST COME BEFORE /{contract_id}
# ============================================================

@app.get("/api/vendor/contracts/dashboard/{vendor_id}", tags=["Vendor Dashboard"])
def get_contract_dashboard(
    vendor_id: str,
    database: Session = Depends( db.get_db ),
    current_user=Depends( crud.get_current_vendor ),
):

    print( "================================================" )
    print( "VENDOR CONTRACT DASHBOARD" )
    print( "REQUESTED vendor_id:", vendor_id )

    # --------------------------------------------------------
    # FIND VENDOR
    # --------------------------------------------------------

    vendor = ( database.query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )

    if not vendor:
        print( "VENDOR NOT FOUND:", vendor_id )
        raise HTTPException( status_code=404, detail=f"Vendor {vendor_id} not found." )

    print( "FOUND VENDOR:", vendor.id, vendor.vendor_id, vendor.vendor_name )

    # --------------------------------------------------------
    # IMPORTANT
    #
    # Contract.vendor_id is the DB FK/integer.
    # Vendor.vendor_id is the public string VND0000001.
    #
    # Therefore use vendor.id here.
    # --------------------------------------------------------

    contracts = ( database.query(db.Contract)
        .filter( db.Contract.vendor_id == vendor.vendor_id )
        .order_by( db.Contract.expiry_date.asc() ) .all()
    )

    print( "CONTRACT COUNT:", len(contracts) )


    if not contracts:
        return {
            "success": True,
            "vendor": {
                "id": vendor.id,
                "vendor_id": vendor.vendor_id,
                "vendor_name": vendor.vendor_name,
                "email": vendor.email,
                "phone": vendor.phone,
                "status": vendor.status,
            },
            "summary": {
                "total_contracts": 0,
                "active_contracts": 0,
                "expiring_contracts": 0,
                "expired_contracts": 0,
                "draft_contracts": 0,
                "compliance_score": 0,
            },
            "status_distribution": {
                "Active": 0,
                "Expiring Soon": 0,
                "Expired": 0,
                "Draft": 0,
            },
            "compliance_distribution": {
                "Compliant": 0,
                "Expiring Soon": 0,
                "Non-Compliant": 0,
                "Pending": 0,
            },
            "expiring_contracts": [],
            "contracts": [],
            "recent_activities": [],
        }

    # --------------------------------------------------------
    # SUMMARY
    # --------------------------------------------------------

    total_contracts = len(contracts)

    active_contracts = 0
    expiring_contracts = 0
    expired_contracts = 0
    draft_contracts = 0

    expiring_list = []

    # --------------------------------------------------------
    # PROCESS CONTRACTS
    # --------------------------------------------------------

    for contract in contracts:

        status_value = ( str( contract.status or "" ) .strip() .lower() )

        days_left = crud.calculate_days_left( contract.expiry_date )

        if status_value == "draft":
            draft_contracts += 1

        elif (
            status_value in { "active", "approved", "executed", }
            and
            ( days_left is None or days_left >= 0 )
        ):
            active_contracts += 1

        if ( days_left is not None and 0 <= days_left <= 30 and status_value not in { "expired", "cancelled", "canceled", } ):
            expiring_contracts += 1
            expiring_list.append( { **crud.contract_to_dict( contract ), "days_left": days_left, } )

        if ( days_left is not None and days_left < 0 ):
            expired_contracts += 1

    # --------------------------------------------------------
    # COMPLIANCE
    # --------------------------------------------------------

    compliance_score = (crud.calculate_compliance_score( contracts ) )

    compliance_distribution = { "Compliant": 0, "Expiring Soon": 0, "Non-Compliant": 0, "Pending": 0, }

    for contract in contracts:

        compliance = ( str( contract.compliance_status or "" ) .strip() .lower() )

        if compliance in { "compliant", "valid", "approved", }:
            compliance_distribution[ "Compliant" ] += 1

        elif compliance in { "expiring soon", "warning", }:
            compliance_distribution[ "Expiring Soon" ] += 1

        elif compliance in { "non-compliant", "noncompliant", "failed", "expired", }:
            compliance_distribution[ "Non-Compliant" ] += 1

        else:
            compliance_distribution[ "Pending" ] += 1

    # --------------------------------------------------------
    # STATUS DISTRIBUTION
    # --------------------------------------------------------

    status_distribution = { "Active": 0, "Expiring Soon": 0, "Expired": 0, "Draft": 0, }

    for contract in contracts:

        status_value = ( str( contract.status or "" ) .strip() .lower() )

        days_left = crud.calculate_days_left( contract.expiry_date )

        if status_value == "draft":
            status_distribution["Draft"] += 1

        elif ( days_left is not None and days_left < 0 ):
            status_distribution["Expired"] += 1

        elif ( days_left is not None and 0 <= days_left <= 30 ):
            status_distribution[ "Expiring Soon" ] += 1

        else:
            status_distribution["Active"] += 1

    # --------------------------------------------------------
    # CONTRACTS
    # --------------------------------------------------------

    contract_rows = []

    for contract in contracts:
        contract_rows.append(
            {
                **crud.contract_to_dict( contract ),
                "days_left": crud.calculate_days_left( contract.expiry_date ),
            }
        )

    # --------------------------------------------------------
    # ACTIVITIES
    # --------------------------------------------------------

    recent_activities = []

    for contract in contracts[:10]:

        days_left = crud.calculate_days_left( contract.expiry_date )

        if ( days_left is not None and days_left < 0 ):
            activity_type = "expired"
            message = ( f"Contract {contract.contract_number} has expired." )

        elif ( days_left is not None and days_left <= 30 ):
            activity_type = "warning"
            message = ( f"Contract {contract.contract_number} is expiring soon." )

        else:
            activity_type = "active"
            message = ( f"Contract {contract.contract_number} is active." )

        recent_activities.append(
            {
                "contract_id": contract.id,
                "contract_number": contract.contract_number,
                "activity_type": activity_type,
                "message": message,
                "date":
                    (
                        contract.expiry_date.isoformat()
                        if contract.expiry_date
                        else None
                    ),
            }
        )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "success": True,
        "vendor": {
            "id": vendor.id,
            "vendor_id": vendor.vendor_id,
            "vendor_name": vendor.vendor_name,
            "email": vendor.email,
            "phone": vendor.phone,
            "status": vendor.status,
        },
        "summary": {
            "total_contracts": total_contracts,
            "active_contracts": active_contracts,
            "expiring_contracts": expiring_contracts,
            "expired_contracts": expired_contracts,
            "draft_contracts": draft_contracts,
            "compliance_score": compliance_score,
        },
        "status_distribution": status_distribution,
        "compliance_distribution": compliance_distribution,
        "expiring_contracts": expiring_list[:10],
        "contracts": contract_rows,
        "recent_activities": recent_activities,
    }


# ============================================================
# LIST CONTRACTS
# ============================================================

@app.get( "/api/vendor/contracts/", tags=["Vendor Dashboard"] )
def get_vendor_contracts(
    vendor_id: str | None = Query( default=None ),
    status_filter: str | None = Query( default=None, alias="status" ),
    search: str | None = Query( default=None ),
    page: int = Query( default=1, ge=1 ),
    limit: int = Query( default=20, ge=1, le=100 ),
    database: Session = Depends( db.get_db ),
    current_user=Depends( crud.get_current_vendor ),
):

    # ========================================================
    # BASE QUERY
    # ========================================================

    query = ( database.query(db.Contract) .outerjoin( db.Vendor, db.Contract.vendor_id == db.Vendor.vendor_id ) )

    # ========================================================
    # VENDOR FILTER
    # ========================================================

    if vendor_id:
        vendor = ( database.query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )

        if not vendor:
            raise HTTPException( status_code=404, detail=f"Vendor {vendor_id} not found" )

        query = query.filter( db.Contract.vendor_id == vendor.vendor_id )

    # ========================================================
    # STATUS FILTER
    # ========================================================

    if status_filter:
        query = query.filter( db.Contract.status == status_filter )

    # ========================================================
    # SEARCH
    # ========================================================

    if search:
        search_value = ( f"%{search}%" )
        query = query.filter(
            or_(
                db.Contract.contract_number.ilike( search_value ),
                db.Vendor.vendor_id.ilike( search_value ),
                db.Vendor.vendor_name.ilike( search_value ),
            )
        )

    # ========================================================
    # TOTAL
    # ========================================================

    total = query.count()

    # ========================================================
    # PAGINATION
    # ========================================================

    offset = ( page - 1 ) * limit

    contracts = ( query .order_by( db.Contract.expiry_date.asc() ) .offset(offset) .limit(limit) .all() )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "contracts": [
            crud.contract_to_dict( contract )
            for contract in contracts
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


# ============================================================
# GET SINGLE CONTRACT
# ============================================================

@app.get( "/api/vendor/contracts/{contract_id}", tags=["Vendor Dashboard"])
def get_vendor_contract( contract_id: str, database: Session = Depends( db.get_db ), current_user=Depends( crud.get_current_vendor ), ):

    contract = ( database.query(db.Contract) .filter( db.Contract.contract_number == contract_id ) .first() )

    if not contract:
        print("Contracts not exists.")

    return crud.contract_to_dict( contract )


# ============================================================
# CREATE CONTRACT
# ============================================================

@app.post( "/api/vendor/contract/", status_code=status.HTTP_201_CREATED, tags=["Vendor Dashboard"] )
def create_vendor_contract(
    payload: db.ContractCreate,
    database: Session = Depends( db.get_db ),
    current_user=Depends( crud.get_current_vendor ),
):

    vendor = ( database.query(db.Vendor) .filter( db.Vendor.vendor_id == payload.vendor_id ) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    contract_number = generate_contract_number( database, vendor.vendor_id )

    contract = db.Contract(
        contract_number=contract_number,

        # IMPORTANT:
        # database FK = vendor.id
        vendor_id=vendor.vendor_id,
        status=payload.status,
        expiry_date=payload.expiry_date,
        renewal_date=payload.renewal_date,
        contract_value=payload.contract_value,
        compliance_status= payload.compliance_status,
        risk_level= payload.risk_level,
        renewal_status= payload.renewal_status,
    )

    database.add(contract)

    database.commit()

    database.refresh(contract)

    return {
        "success": True,
        "message": "Contract created successfully",
        "contract": crud.contract_to_dict(contract),
    }


# ============================================================
# UPDATE CONTRACT
# ============================================================

@app.put( "/api/vendor/contracts/{contract_id}", tags=["Vendor Dashboard"] )
def update_vendor_contract(
    contract_id: str,
    payload: db.ContractUpdate,
    database: Session = Depends( db.get_db ),
    current_user=Depends( crud.get_current_vendor ),
):

    # ========================================================
    # FIND CONTRACT
    # ========================================================

    contract = ( database.query(db.Contract) .filter( db.Contract.contract_number == contract_id ) .first() )

    if not contract:
        print("Contracts not exists")
    # ========================================================
    # GET UPDATE DATA
    # ========================================================

    update_data = payload.model_dump( exclude_unset=True )

    # ========================================================
    # VENDOR UPDATE
    # ========================================================

    if "vendor_id" in update_data:
        public_vendor_id = ( update_data["vendor_id"] )
        vendor = ( database.query(db.Vendor) .filter( db.Vendor.vendor_id == public_vendor_id ) .first() )

        if not vendor:
            raise HTTPException( status_code=404, detail="Vendor not found" )

        # Convert public VND ID
        # into database FK integer

        update_data["vendor_id"] = vendor.vendor_id

    # ========================================================
    # CONTRACT NUMBER DUPLICATE CHECK
    # ========================================================

    if "contract_number" in update_data:
        duplicate = (
            database.query(db.Contract) .filter(
                db.Contract.contract_number == update_data["contract_number"],
                db.Contract.contract_number != contract_id,
            ) .first()
        )

        if duplicate:
            raise HTTPException( status_code=409, detail="Contract number already exists" )

    # ========================================================
    # APPLY UPDATES
    # ========================================================

    for field, value in update_data.items():
        setattr( contract, field, value )

    # ========================================================
    # SAVE
    # ========================================================

    database.commit()

    database.refresh(contract)

    return {
        "success": True,
        "message": "Contract updated successfully",
        "contract": crud.contract_to_dict( contract ),
    }


# ============================================================
# DELETE CONTRACT
# ============================================================

@app.delete( "/api/vendor/contracts/{contract_id}", tags=["Vendor Dashboard"] )
def delete_vendor_contract( contract_id: str, database: Session = Depends( db.get_db ), current_user=Depends( crud.get_current_vendor ), ):

    contract = ( database.query(db.Contract) .filter( db.Contract.contract_number == contract_id ) .first() )

    if not contract:
        raise HTTPException( status_code=404, detail="Contract not found", )

    database.delete(contract)

    database.commit()

    return { "success": True, "message": "Contract deleted successfully", }


# ============================================================
# DASHBOARD
# ============================================================

@app.get("/api/vendor/invoices/dashboard/{vendor_id}", tags=["Vendor Dashboard"])
def get_vendor_invoice_dashboard(
    vendor_id: str,
    year: Optional[int] = Query(None),
    database: Session = Depends(db.get_db),
):

    # --------------------------------------------------------
    # VERIFY VENDOR
    # --------------------------------------------------------

    vendor = ( database.query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )


    # --------------------------------------------------------
    # YEAR
    # --------------------------------------------------------

    selected_year = (
        year
        if year
        else date.today().year
    )


    # --------------------------------------------------------
    # ALL INVOICES
    # --------------------------------------------------------

    invoices = ( database.query(db.Invoice) .filter( db.Invoice.vendor_id == vendor_id ) .all() )


    total_invoices = len(invoices)


    # --------------------------------------------------------
    # STATUS SUMMARY
    # --------------------------------------------------------

    status_summary = ( crud.get_invoice_status_summary( database, vendor_id ) )


    # --------------------------------------------------------
    # TOTAL PAID
    # --------------------------------------------------------

    total_paid = (
        database.query( func.coalesce( func.sum(db.Payment.amount), 0 ) )
        .join( db.Invoice, db.Payment.invoice_id == db.Invoice.id )
        .filter(
            db.Invoice.vendor_id == vendor_id,
            db.Payment.status.in_( [ "Completed", "Paid" ] ),
            extract( "year", db.Payment.payment_date ) == selected_year
        ) .scalar()
    ) or 0


    # --------------------------------------------------------
    # PENDING PAYMENTS
    # --------------------------------------------------------

    pending_payments = (
        database.query( func.coalesce( func.sum(db.Invoice.amount), 0 ) )
        .filter( db.Invoice.vendor_id == vendor_id, db.Invoice.status == "Pending" ) .scalar()
    ) or 0


    # --------------------------------------------------------
    # OVERDUE AMOUNT
    # --------------------------------------------------------

    today = date.today()


    overdue_amount = (
        database.query( func.coalesce( func.sum(db.Invoice.amount), 0 ) ) .filter(
            db.Invoice.vendor_id == vendor_id,
            db.Invoice.status == "Overdue",
            db.Invoice.due_date < today
        ) .scalar()
    ) or 0


    # --------------------------------------------------------
    # AVERAGE PAYMENT TIME
    # --------------------------------------------------------

    paid_invoices = (
        database.query(db.Invoice) .filter(
            db.Invoice.vendor_id == vendor_id,
            db.Invoice.invoice_date.isnot(None),
            db.Invoice.paid_date.isnot(None)
        ) .all()
    )


    payment_days = []


    for invoice in paid_invoices:

        if ( invoice.invoice_date and invoice.paid_date ):
            days = ( invoice.paid_date - invoice.invoice_date ).days

            if days >= 0:
                payment_days.append(days)


    if payment_days:
        average_payment_time = ( sum(payment_days) / len(payment_days) )

    else:
        average_payment_time = 0


    # --------------------------------------------------------
    # RECENT INVOICES
    # --------------------------------------------------------

    recent_invoices = (
        database.query(db.Invoice) .filter( db.Invoice.vendor_id == vendor_id )
        .order_by( db.Invoice.invoice_date.desc().nullslast(), db.Invoice.id.desc() ) .limit(5) .all()
    )


    recent_invoice_data = []


    for invoice in recent_invoices:
        recent_invoice_data.append(
            {
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "po_id": invoice.po_id,
                "amount": float(invoice.amount or 0),
                "status": invoice.status,
                "invoice_date": invoice.invoice_date,
                "due_date": invoice.due_date,
                "paid_date": invoice.paid_date,
            }
        )


    # --------------------------------------------------------
    # UPCOMING PAYMENTS
    # --------------------------------------------------------

    upcoming_invoices = (
        database.query(db.Invoice) .filter(
            db.Invoice.vendor_id == vendor_id,
            db.Invoice.due_date.isnot(None),
            db.Invoice.due_date >= today,
            db.Invoice.status == "Pending"
        ) .order_by( db.Invoice.due_date.asc() ) .limit(5) .all()
    )


    upcoming_payment_data = []


    for invoice in upcoming_invoices:
        upcoming_payment_data.append(
            {
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "po_id": invoice.po_id,
                "amount": float(invoice.amount or 0),
                "status": invoice.status,
                "due_date": invoice.due_date,
            }
        )


    # --------------------------------------------------------
    # PAYMENT HISTORY
    # --------------------------------------------------------

    payments = (
        database.query(db.Payment) .join( db.Invoice, db.Payment.invoice_id == db.Invoice.id )
        .filter( db.Invoice.vendor_id == vendor_id )
        .order_by( db.Payment.payment_date.desc(), db.Payment.id.desc() ) .limit(5) .all()
    )


    payment_history = []


    for payment in payments:

        payment_history.append(
            {
                "id": payment.id,
                "invoice_id": payment.invoice_id,
                "payment_reference": payment.payment_reference,
                "payment_date": payment.payment_date,
                "amount": float(payment.amount or 0),
                "payment_method": payment.payment_method,
                "status": payment.status,
                "transaction_id": payment.transaction_id,
                "notes": payment.notes,
            }
        )


    # --------------------------------------------------------
    # MONTHLY PAYMENTS
    # --------------------------------------------------------

    monthly_payments = []


    for month in range(1, 13):
        paid_amount = ( database.query( func.coalesce( func.sum(db.Payment.amount), 0 ) )
            .join( db.Invoice, db.Payment.invoice_id == db.Invoice.id ) .filter(
                db.Invoice.vendor_id == vendor_id,
                db.Payment.status.in_( [ "Completed", "Paid" ] ),
                extract( "year", db.Payment.payment_date ) == selected_year,
                extract( "month", db.Payment.payment_date ) == month
            ) .scalar()
        ) or 0


        pending_amount = ( database.query( func.coalesce( func.sum(db.Invoice.amount), 0 ) ) .filter(
                db.Invoice.vendor_id == vendor_id,
                db.Invoice.status == "Pending",
                extract( "year", db.Invoice.due_date ) == selected_year,
                extract( "month", db.Invoice.due_date ) == month
            ) .scalar()
        ) or 0


        month_name = date( selected_year, month, 1 ).strftime("%b")


        monthly_payments.append(
            { "month": month_name, "paid_amount": float(paid_amount), "pending_amount": float(pending_amount), }
        )


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "vendor_id": vendor_id,
        "year": selected_year,
        "total_invoices": total_invoices,
        "total_paid": float(total_paid),
        "pending_payments": float(pending_payments),
        "overdue_amount": float(overdue_amount),
        "average_payment_time": round( average_payment_time, 2 ),
        "status_summary": status_summary,
        "monthly_payments": monthly_payments,
        "recent_invoices": recent_invoice_data,
        "upcoming_payments": upcoming_payment_data,
        "payment_history": payment_history,
    }


# ============================================================
# ALL INVOICES
# ============================================================

@app.get("/api/vendor/invoices", tags=["Vendor Dashboard"])
def get_vendor_invoices(
    vendor_id: str = Query(...),
    skip: int = 0,
    limit: int = 100,
    database: Session = Depends(db.get_db)
):

    query = ( database.query(db.Invoice) .filter( db.Invoice.vendor_id == vendor_id ) )

    total = query.count()

    invoices = ( query .order_by( db.Invoice.invoice_date.desc() ) .offset(skip) .limit(limit) .all() )

    return { "invoices": invoices, "total": total }


# ============================================================
# SINGLE INVOICE
# ============================================================

@app.get("/api/vendor/invoices/{invoice_id}", tags=["Vendor Dashboard"])
def get_vendor_invoice(
    invoice_id: int,
    vendor_id: str = Query(...),
    database: Session = Depends(db.get_db)
):

    invoice = ( database.query(db.Invoice) .filter( db.Invoice.id == invoice_id, db.Invoice.vendor_id == vendor_id ) .first() )

    if not invoice:
        raise HTTPException( status_code=404, detail="Invoice not found" )

    return invoice


# ============================================================
# INVOICE STATUS
# ============================================================

@app.patch("/api/vendor/invoices/{invoice_id}/status", tags=["Vendor Dashboard"])
def update_vendor_invoice_status(
    invoice_id: int,
    status: str,
    vendor_id: str = Query(...),
    database: Session = Depends(db.get_db)
):

    invoice = ( database.query(db.Invoice) .filter( db.Invoice.id == invoice_id, db.Invoice.vendor_id == vendor_id ) .first() )

    if not invoice:
        raise HTTPException( status_code=404, detail="Invoice not found" )

    allowed_statuses = { "Pending", "Paid", "Overdue", "Draft", "Cancelled", "Scheduled", "Processing" }

    if status not in allowed_statuses:
        raise HTTPException( status_code=400, detail="Invalid invoice status" )

    invoice.status = status

    if status == "Paid" and invoice.paid_date is None:
        invoice.paid_date = date.today()

    database.commit()

    database.refresh(invoice)

    return invoice


# ============================================================
# CREATE INVOICE
# ============================================================

@app.post( "/api/vendor/invoices", status_code=201, tags=["Vendor Dashboard"])
def create_vendor_invoice(
    invoice_data: db.VendorInvoiceCreate,
    vendor_id: str = Query(...),
    database: Session = Depends(db.get_db),
):

    crud.validate_vendor_id( vendor_id )
    existing = database.query( db.Invoice ).filter( db.Invoice.invoice_number == invoice_data.invoice_number ).first()

    if existing:
        raise HTTPException( status_code=409, detail="Invoice number already exists." )

    invoice = db.Invoice(
        invoice_number = invoice_data.invoice_number,
        po_id = invoice_data.po_id,
        vendor_id = vendor_id,
        amount = invoice_data.amount,
        status = "Pending",
        invoice_date = invoice_data.invoice_date,
        due_date = invoice_data.due_date,
    )

    database.add( invoice )

    database.commit()

    database.refresh( invoice )

    return {
        "message": "Invoice uploaded successfully.",

        "invoice":
            {
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "vendor_id": invoice.vendor_id,
                "amount": float(invoice.amount),
                "status": invoice.status,
                "invoice_date": invoice.invoice_date,
                "due_date": invoice.due_date,
            }
    }


# ============================================================
# PAYMENT METHODS
# ============================================================

@app.get( "/api/vendor/payments/methods", tags=["Vendor Dashboard"] )
def get_payment_methods(
    vendor_id: str = Query(...),
    database: Session = Depends(db.get_db),
):

    methods = database.query( db.PaymentMethod ).filter( db.PaymentMethod.vendor_id == vendor_id ).order_by( db.PaymentMethod.id.desc() ).all()

    return [
        {
            "id": method.id,
            "vendor_id": method.vendor_id,
            "method_type": method.method_type,
            "account_name": method.account_name,
            "account_number": method.account_number,
            "bank_name": method.bank_name,
            "branch_name": method.branch_name,
            "ifsc_code": method.ifsc_code,
            "is_default": method.is_default,
            "created_at": method.created_at,
        }
        for method in methods
    ]


@app.post( "/api/vendor/payments/methods", status_code=201, tags=["Vendor Dashboard"])
def create_payment_method(
    payment_data: db.PaymentMethodCreate,
    vendor_id: str = Query(...),
    database: Session = Depends(db.get_db),
):

    if payment_data.is_default:
        database.query( db.PaymentMethod ).filter(
            db.PaymentMethod.vendor_id == vendor_id
        ).update({ db.PaymentMethod.is_default: False })

    method = db.PaymentMethod(
        vendor_id = vendor_id,
        method_type = payment_data.method_type,
        account_name = payment_data.account_name,
        account_number = payment_data.account_number,
        bank_name = payment_data.bank_name,
        branch_name = payment_data.branch_name,
        ifsc_code = payment_data.ifsc_code,
        is_default = payment_data.is_default,
    )

    database.add( method )

    database.commit()

    database.refresh( method )

    return method


# ============================================================
# DELETE PAYMENT METHOD
# ============================================================

@app.delete( "/api/vendor/payments/methods/{method_id}", tags=["Vendor Dashboard"])
def delete_payment_method(
    method_id: int,
    vendor_id: str = Query(...),
    database: Session = Depends(db.get_db),
):

    method = database.query( db.PaymentMethod ).filter(
        db.PaymentMethod.id == method_id,
        db.PaymentMethod.vendor_id == vendor_id
    ).first()

    if not method:
        raise HTTPException( status_code=404, detail="Payment method not found." )

    database.delete( method )

    database.commit()

    return { "message": "Payment method deleted successfully." }


# ============================================================
# SET DEFAULT PAYMENT METHOD
# ============================================================

@app.patch( "/api/vendor/payments/methods/{method_id}/default", tags=["Vendor Dashboard"])
def set_default_payment_method(
    method_id: int,
    vendor_id: str = Query(...),
    database: Session = Depends(db.get_db),
):

    method = database.query( db.PaymentMethod ).filter(
        db.PaymentMethod.id == method_id,
        db.PaymentMethod.vendor_id == vendor_id
    ).first()

    if not method:
        raise HTTPException( status_code=404, detail="Payment method not found." )

    database.query( db.PaymentMethod ).filter( db.PaymentMethod.vendor_id == vendor_id ).update({ db.PaymentMethod.is_default: False })

    method.is_default = True

    database.commit()

    return { "message": "Default payment method updated." }


# ============================================================
# UPCOMING PAYMENTS
# ============================================================

@app.get( "/api/vendor/payments/upcoming", tags=["Vendor Dashboard"] )
def get_upcoming_payments(
    vendor_id: str = Query(...),
    days: int = Query(30, ge=1, le=365),
    database: Session = Depends(db.get_db),
):

    # --------------------------------------------------------
    # VERIFY VENDOR
    # --------------------------------------------------------

    vendor = ( database.query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    # --------------------------------------------------------
    # DATES
    # --------------------------------------------------------

    today = date.today()

    end_date = today + timedelta( days=days )

    week_end = today + timedelta( days=(6 - today.weekday()) )

    # --------------------------------------------------------
    # UPCOMING INVOICES
    # --------------------------------------------------------

    invoices = (
        database.query(db.Invoice) .filter(
            db.Invoice.vendor_id == vendor_id,
            db.Invoice.due_date.isnot(None),
            db.Invoice.due_date >= today,
            db.Invoice.due_date <= end_date,
            db.Invoice.status.in_( [ "Pending", "Scheduled", "Processing" ] )
        )
        .order_by( db.Invoice.due_date.asc() ) .all()
    )

    # --------------------------------------------------------
    # BUILD DATA
    # --------------------------------------------------------

    payment_data = []

    for invoice in invoices:

        days_until_due = ( invoice.due_date - today ).days

        if days_until_due == 0:
            due_text = "Due today"

        elif days_until_due == 1:
            due_text = "Due tomorrow"

        else:
            due_text = ( f"Due in {days_until_due} days" )

        payment_data.append(
            {
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "po_id": invoice.po_id,
                "amount": float(invoice.amount or 0),
                "status": invoice.status,
                "invoice_date": invoice.invoice_date,
                "due_date": invoice.due_date,
                "days_until_due": days_until_due,
                "due_text": due_text,
            }
        )

    # --------------------------------------------------------
    # DUE THIS WEEK
    # --------------------------------------------------------

    due_this_week = [
        item
        for item in payment_data
        if item["due_date"] <= week_end
    ]

    due_this_week_amount = sum(
        item["amount"]
        for item in due_this_week
    )

    # --------------------------------------------------------
    # TOTAL UPCOMING
    # --------------------------------------------------------

    upcoming_amount = sum(
        item["amount"]
        for item in payment_data
    )

    # --------------------------------------------------------
    # OVERDUE
    # --------------------------------------------------------

    overdue_invoices = (
        database.query(db.Invoice) .filter(
            db.Invoice.vendor_id == vendor_id,
            db.Invoice.due_date.isnot(None),
            db.Invoice.due_date < today,
            db.Invoice.status.in_( [ "Pending", "Overdue" ] )
        )
        .order_by( db.Invoice.due_date.asc() ) .all()
    )

    overdue_amount = sum(
        float(invoice.amount or 0)
        for invoice in overdue_invoices
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "vendor_id": vendor_id,
        "period_days": days,
        "start_date": today,
        "end_date": end_date,
        "total_upcoming": len(payment_data),
        "upcoming_amount": upcoming_amount,
        "due_this_week_count": len(due_this_week),
        "due_this_week_amount": due_this_week_amount,
        "overdue_count": len(overdue_invoices),
        "overdue_amount": overdue_amount,
        "payments": payment_data,
        "overdue_payments":
            [
                {
                    "id": invoice.id,
                    "invoice_number": invoice.invoice_number,
                    "po_id": invoice.po_id,
                    "amount": float(invoice.amount or 0),
                    "status": invoice.status,
                    "invoice_date": invoice.invoice_date,
                    "due_date": invoice.due_date,
                    "days_overdue": ( today - invoice.due_date ).days
                }
                for invoice in overdue_invoices
            ]
    }


# ============================================================
# PAYMENT SCHEDULE SUMMARY
# ============================================================

@app.get( "/api/vendor/payments/schedule", tags=["Vendor Dashboard"] )
def get_payment_schedule( vendor_id: str = Query(...), database: Session = Depends(db.get_db), ):

    today = date.today()

    # --------------------------------------------------------
    # ALL RELEVANT INVOICES
    # --------------------------------------------------------

    invoices = ( database.query(db.Invoice) .filter( db.Invoice.vendor_id == vendor_id ) .all() )

    scheduled_amount = 0
    pending_amount = 0
    overdue_amount = 0
    scheduled_count = 0
    pending_count = 0
    overdue_count = 0

    for invoice in invoices:
        amount = float( invoice.amount or 0 )
        status = ( invoice.status or "" ).strip().lower()

        # ----------------------------------------------------
        # SCHEDULED
        # ----------------------------------------------------

        if status in { "scheduled", "processing" }:
            scheduled_amount += amount
            scheduled_count += 1

        # ----------------------------------------------------
        # PENDING
        # ----------------------------------------------------

        elif status == "pending":

            if ( invoice.due_date and invoice.due_date < today ):
                overdue_amount += amount
                overdue_count += 1

            else:
                pending_amount += amount
                pending_count += 1

        # ----------------------------------------------------
        # OVERDUE
        # ----------------------------------------------------

        elif status == "overdue":
            overdue_amount += amount
            overdue_count += 1

    total_amount = ( scheduled_amount + pending_amount + overdue_amount )

    total_count = ( scheduled_count + pending_count + overdue_count )

    return {
        "vendor_id": vendor_id,
        "scheduled_count": scheduled_count,
        "pending_count": pending_count,
        "overdue_count": overdue_count,
        "total_count": total_count,
        "scheduled_amount": scheduled_amount,
        "pending_amount": pending_amount,
        "overdue_amount": overdue_amount,
        "total_amount": total_amount
    }


# ============================================================
# PAYMENT METHOD SUMMARY
# ============================================================

@app.get( "/api/vendor/payments/methods/summary", tags=["Vendor Dashboard"] )
def get_payment_method_summary( vendor_id: str = Query(...), database: Session = Depends(db.get_db), ):

    methods = ( database.query(db.PaymentMethod) .filter( db.PaymentMethod.vendor_id == vendor_id ) .all() )

    summary = {}

    for method in methods:
        method_type = ( method.method_type or "Other" )

        if method_type not in summary:
            summary[method_type] = 0

        summary[method_type] += 1

    return { "vendor_id": vendor_id, "methods": summary, "total": len(methods) }


# ==========================================================
# DASHBOARD
# ==========================================================

@app.get("/api/vendor/communication/dashboard/{vendor_id}", tags=["Vendor Dashboard"])
def communication_dashboard(
    vendor_id: str,
    database: Session = Depends(db.get_db)
):

    vendor = get_vendor( vendor_id, database )

    messages = (
        database.query(db.CommunicationMessage)
        .filter( db.CommunicationMessage.vendor_id == vendor_id )
        .order_by( db.CommunicationMessage.created_at.asc() ) .all()
    )

    files = (
        database.query(db.CommunicationFile)
        .filter( db.CommunicationFile.vendor_id == vendor_id )
        .order_by( db.CommunicationFile.created_at.desc() ) .limit(10) .all()
    )

    activities = (
        database.query(db.CommunicationActivity)
        .filter( db.CommunicationActivity.vendor_id == vendor_id )
        .order_by( db.CommunicationActivity.created_at.desc() ) .limit(10) .all()
    )

    unread_count = (
        database.query(db.CommunicationMessage) .filter(
            db.CommunicationMessage.vendor_id == vendor_id,
            db.CommunicationMessage.is_read == False
        ) .count()
    )

    return {
        "vendor": {
            "vendor_id": vendor.vendor_id,
            "name": getattr( vendor, "vendor_name", None ),
            "company_name": getattr( vendor, "company_name", None )
        },

        "unread_count": unread_count,

        "messages": [
            {
                "id": message.id,
                "vendor_id": message.vendor_id,
                "sender_user_id": message.sender_user_id,
                "sender_type": message.sender_type,
                "sender_name": (
                    message.sender.name
                    if message.sender
                    else (
                        "Vendor"
                        if message.sender_type.lower() == "vendor"
                        else "Procurement Team"
                    )
                ),
                "message": message.message,
                "message_type": message.message_type,
                "is_read": message.is_read,
                "created_at": (
                    message.created_at.isoformat()
                    if message.created_at
                    else None
                )
            }
            for message in messages
        ],

        "files": [
            {
                "id": file.id,
                "file_name": file.file_name,
                "file_size": file.file_size,
                "file_type": file.file_type,
                "created_at": (
                    file.created_at.isoformat()
                    if file.created_at
                    else None
                )
            }
            for file in files
        ],

        "activities": [
            {
                "id": activity.id,
                "activity_type": activity.activity_type,
                "subject": activity.subject,
                "description": activity.description,
                "status": activity.status,
                "user_name": (
                    activity.user.name
                    if activity.user
                    else "System"
                ),
                "created_at": (
                    activity.created_at.isoformat()
                    if activity.created_at
                    else None
                )
            }
            for activity in activities
        ]
    }


# ==========================================================
# GET MESSAGES
# ==========================================================

@app.get("/api/vendor/communication/messages", tags=["Vendor Dashboard"])
def get_messages(
    vendor_id: str,
    database: Session = Depends(db.get_db)
):

    get_vendor( vendor_id, database )

    messages = ( database.query(db.CommunicationMessage) .filter( db.CommunicationMessage.vendor_id == vendor_id ) .order_by( db.CommunicationMessage.created_at.asc() ) .all() )

    return [
        {
            "id": message.id,
            "sender_user_id": message.sender_user_id,
            "sender_type": message.sender_type,
            "sender_name": (
                message.sender.name
                if message.sender
                else (
                    "Vendor"
                    if message.sender_type.lower() == "vendor"
                    else "Procurement Team"
                )
            ),
            "message": message.message,
            "message_type": message.message_type,
            "is_read": message.is_read,
            "created_at": (
                message.created_at.isoformat()
                if message.created_at
                else None
            )
        }
        for message in messages
    ]


# ==========================================================
# SEND MESSAGE
# ==========================================================

@app.post("/api/vendor/communication/messages", tags=["Vendor Dashboard"])
def send_message_vendor(
    vendor_id: str = Form(...),
    message: str = Form(...),
    sender_type: str = Form("vendor"),
    sender_user_id: int | None = Form(None),
    database: Session = Depends(db.get_db)
):

    vendor = get_vendor( vendor_id, database )

    message = message.strip()

    if not message:
        raise HTTPException( status_code=400, detail="Message cannot be empty" )

    new_message = db.CommunicationMessage(
        vendor_id=vendor.vendor_id,
        sender_user_id=sender_user_id,
        sender_type=sender_type,
        message=message,
        message_type="Message",
        is_read=False,
        created_at=datetime.utcnow()
    )

    database.add(new_message)

    database.flush()

    activity = db.CommunicationActivity(
        vendor_id=vendor.vendor_id,
        user_id=sender_user_id,
        activity_type="Message",
        subject="New message",
        description=message[:255],
        status="Delivered",
        created_at=datetime.utcnow()
    )

    database.add(activity)

    database.commit()

    database.refresh(new_message)

    return {
        "success": True,
        "message": {
            "id": new_message.id,
            "sender_type": new_message.sender_type,
            "message": new_message.message,
            "created_at": new_message.created_at.isoformat()
        }
    }


# ==========================================================
# UPLOAD FILE
# ==========================================================

@app.post("/api/vendor/communication/files", tags=["Vendor Dashboard"])
def upload_vendor_communication_file(
    vendor_id: str = Form(...),
    uploaded_by: int | None = Form(None),
    file: UploadFile = File(...),
    database: Session = Depends(db.get_db)
):

    vendor = get_vendor( vendor_id, database )

    if not file.filename:
        raise HTTPException( status_code=400, detail="File name is required" )

    extension = Path( file.filename ).suffix

    unique_name = ( f"{uuid.uuid4().hex}{extension}" )

    destination = ( UPLOAD_DIR / unique_name )

    with destination.open("wb") as buffer:
        shutil.copyfileobj( file.file, buffer )

    file_size = destination.stat().st_size

    new_file = db.CommunicationFile(
        vendor_id=vendor.vendor_id,
        uploaded_by=uploaded_by,
        file_name=file.filename,
        file_path=str(destination),
        file_size=file_size,
        file_type=file.content_type,
        created_at=datetime.utcnow()
    )

    database.add(new_file)

    database.flush()

    activity = db.CommunicationActivity(
        vendor_id=vendor.vendor_id,
        user_id=uploaded_by,
        activity_type="File Upload",
        subject=file.filename,
        description=( f"{file.filename} uploaded" ),
        status="Delivered",
        created_at=datetime.utcnow()
    )

    database.add(activity)

    database.commit()

    database.refresh(new_file)

    return {
        "success": True,
        "file": {
            "id": new_file.id,
            "file_name": new_file.file_name,
            "file_size": new_file.file_size,
            "file_type": new_file.file_type
        }
    }


# ==========================================================
# GET FILES
# ==========================================================

@app.get("/api/vendor/communication/files", tags=["Vendor Dashboard"])
def get_files( vendor_id: str, database: Session = Depends(db.get_db) ):

    get_vendor( vendor_id, database )

    files = (
        database.query(db.CommunicationFile) 
        .filter( db.CommunicationFile.vendor_id == vendor_id ) 
        .order_by( db.CommunicationFile.created_at.desc() ) .all() 
    )

    return [
        {
            "id": file.id,
            "file_name": file.file_name,
            "file_size": file.file_size,
            "file_type": file.file_type,
            "created_at": (
                file.created_at.isoformat()
                if file.created_at
                else None
            )
        }
        for file in files
    ]


# ==========================================================
# DOWNLOAD FILE
# ==========================================================

@app.get("/api/vendor/communication/files/{file_id}/download", tags=["Vendor Dashboard"])
def download_file( file_id: int, vendor_id: str, database: Session = Depends(db.get_db) ):

    file = (
        database.query(db.CommunicationFile) .filter(
            db.CommunicationFile.id == file_id,
            db.CommunicationFile.vendor_id == vendor_id
        ) .first()
    )

    if not file:
        raise HTTPException( status_code=404, detail="File not found" )

    path = Path(file.file_path)

    if not path.exists():
        raise HTTPException( status_code=404, detail="Physical file not found" )

    return FileResponse( path=str(path), filename=file.file_name, media_type=file.file_type or "application/octet-stream" )


# ==========================================================
# MARK MESSAGES READ
# ==========================================================

@app.patch("/api/vendor/communication/messages/read", tags=["Vendor Dashboard"])
def mark_messages_read( vendor_id: str, database: Session = Depends(db.get_db) ):

    (
        database.query(db.CommunicationMessage)
        .filter(
            db.CommunicationMessage.vendor_id == vendor_id,
            db.CommunicationMessage.is_read == False
        )
        .update( { db.CommunicationMessage.is_read: True }, synchronize_session=False )
    )

    database.commit()

    return { "success": True }


# ============================================================
# VENDOR COMMUNICATION PROFILE
# ============================================================

@app.get(
    "/api/vendor/communication/profile",
    tags=["Vendor Communication"]
)
def vendor_communication_profile(

    current_vendor: db.Vendor = Depends(
        crud.require_vendor
    ),

    database: Session = Depends(
        db.get_db
    )
):

    return crud.get_vendor_communication_profile(
        database,
        current_vendor
    )


# ============================================================
# VENDOR COMMUNICATION CONTACTS
# ============================================================

@app.get(
    "/api/vendor/communication/contacts",
    tags=["Vendor Communication"]
)
def vendor_communication_contacts(

    current_vendor: db.Vendor = Depends(
        crud.require_vendor
    ),

    database: Session = Depends(
        db.get_db
    )
):

    contacts = (
        crud.get_vendor_communication_contacts(
            database,
            current_vendor
        )
    )

    return {

        "success":
            True,

        "contacts":
            contacts
    }


# ============================================================
# GET VENDOR <-> INTERNAL USER CONVERSATION
# ============================================================

@app.get(
    "/api/vendor/communication/conversation/{target_type}/{target_id}",
    tags=["Vendor Communication"]
)
def get_vendor_conversation(

    target_type: str,

    target_id: int,

    current_vendor: db.Vendor = Depends(
        crud.require_vendor
    ),

    database: Session = Depends(
        db.get_db
    )
):

    # --------------------------------------------------------
    # NORMALIZE TYPE
    # --------------------------------------------------------

    normalized_target_type = (
        crud.normalize_communication_type(
            target_type
        )
    )

    allowed_target_types = {

        "procurement",
        "admin",
        "supply_chain",
        "finance",
        "audit"
    }

    if normalized_target_type not in (
        allowed_target_types
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid communication department."
        )

    # --------------------------------------------------------
    # VERIFY RECIPIENT
    # --------------------------------------------------------

    recipient = (
        crud.verify_vendor_communication_recipient(
            database,
            normalized_target_type,
            target_id
        )
    )

    # --------------------------------------------------------
    # GET CONVERSATION
    # --------------------------------------------------------

    return crud.get_vendor_user_conversation(

        database,

        current_vendor,

        recipient.id
    )


# ============================================================
# VENDOR SEND MESSAGE
# ============================================================

@app.post(
    "/api/vendor/communication/conversation/{target_type}/{target_id}",
    tags=["Vendor Communication"]
)
def send_vendor_conversation_message(

    target_type: str,

    target_id: int,

    payload: db.VendorCommunicationSendRequest,

    current_vendor: db.Vendor = Depends(
        crud.require_vendor
    ),

    database: Session = Depends(
        db.get_db
    )
):

    # --------------------------------------------------------
    # NORMALIZE TYPE
    # --------------------------------------------------------

    normalized_target_type = (
        crud.normalize_communication_type(
            target_type
        )
    )

    allowed_target_types = {

        "procurement",
        "admin",
        "supply_chain",
        "finance",
        "audit"
    }

    if normalized_target_type not in (
        allowed_target_types
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid communication department."
        )

    # --------------------------------------------------------
    # VERIFY RECIPIENT
    # --------------------------------------------------------

    recipient = (
        crud.verify_vendor_communication_recipient(
            database,
            normalized_target_type,
            target_id
        )
    )

    # --------------------------------------------------------
    # SAVE MESSAGE
    # --------------------------------------------------------

    new_message = (
        crud.send_vendor_message_to_user(

            database=
                database,

            vendor=
                current_vendor,

            recipient_user_id=
                recipient.id,

            message_text=
                payload.message
        )
    )

    return {

        "success":
            True,

        "message":
            new_message
    }


# ============================================================
# VENDOR DOCUMENT DASHBOARD
# ============================================================

@app.get( "/api/vendor/documents/dashboard/{vendor_id}", tags=["Vendor Dashboard"] )
def vendor_document_dashboard(
    vendor_id: str,
    current_vendor: db.Vendor = Depends(crud.get_current_vendor),
    database: Session = Depends(db.get_db)
):

    crud.verify_vendor_document_access( vendor_id, current_vendor )

    today = date.today()
    expiry_limit = today + timedelta(days=30)

    base_query = database.query( db.Document ).filter( db.Document.vendor_id == vendor_id )

    # --------------------------------------------------------
    # KPI
    # --------------------------------------------------------

    total_documents = base_query.count()

    uploaded_this_year = ( base_query .filter( extract( "year", db.Document.uploaded_on ) == today.year ) .count() )

    pending_review = (
        base_query
        .filter( db.Document.status.in_([ "Pending Review", "Under Review", "Pending" ])) .count()
    )

    expiring_soon = (
        base_query .filter(
            db.Document.expiry_date.isnot(None),
            db.Document.expiry_date >= today,
            db.Document.expiry_date <= expiry_limit
        ) .count()
    )

    verified_documents = (
        base_query .filter( db.Document.status.in_([ "Verified", "Approved" ]) ) .count()
    )

    # --------------------------------------------------------
    # STORAGE
    # --------------------------------------------------------

    storage_used = (
        database.query( func.coalesce( func.sum(db.Document.file_size), 0 ) )
        .filter( db.Document.vendor_id == vendor_id ) .scalar() or 0
    )

    storage_limit = 10 * 1024 * 1024 * 1024

    storage_available = max( storage_limit - storage_used, 0 )

    # --------------------------------------------------------
    # CATEGORIES
    # --------------------------------------------------------

    category_rows = (
        database.query( db.Document.category, func.count(db.Document.id) )
        .filter( db.Document.vendor_id == vendor_id )
        .group_by( db.Document.category ) .order_by( func.count(db.Document.id).desc() ) .all()
    )

    categories = [
        { "category": category or "General", "count": count }
        for category, count in category_rows
    ]

    # --------------------------------------------------------
    # RECENT DOCUMENTS
    # --------------------------------------------------------

    document_rows = (
        database.query( db.Document, db.User.name )
        .outerjoin( db.User, db.User.id == db.Document.uploaded_by )
        .filter( db.Document.vendor_id == vendor_id )
        .order_by( db.Document.uploaded_on.desc() ).limit(100) .all()
    )

    documents = [ crud.serialize_vendor_document( document, user_name )
        for document, user_name in document_rows
    ]

    # --------------------------------------------------------
    # RECENT UPLOADS
    # --------------------------------------------------------

    recent_uploads = documents[:5]

    return {
        "total_documents": total_documents,
        "uploaded_this_year": uploaded_this_year,
        "pending_review": pending_review,
        "expiring_soon": expiring_soon,
        "verified_documents": verified_documents,
        "storage_used": storage_used,
        "storage_limit": storage_limit,
        "storage_available": storage_available,
        "categories": categories,
        "documents": documents,
        "recent_uploads": recent_uploads
    }


# ============================================================
# VENDOR DOCUMENT LIST
# ============================================================

@app.get( "/api/vendor/documents/{vendor_id}", tags=["Vendor Dashboard"] )
def get_vendor_documents(
    vendor_id: str,
    search: str = Query( default="" ),
    category: str = Query( default="All" ),
    status: str = Query( default="All" ),
    page: int = Query( default=1, ge=1 ),
    limit: int = Query( default=8, ge=1, le=100 ),
    current_vendor: db.Vendor = Depends( crud.get_current_vendor ),
    database: Session = Depends(db.get_db)
):

    crud.verify_vendor_document_access( vendor_id, current_vendor )

    query = (
        database.query( db.Document, db.User.name )
        .outerjoin( db.User, db.User.id == db.Document.uploaded_by )
        .filter( db.Document.vendor_id == vendor_id )
    )

    # --------------------------------------------------------
    # SEARCH
    # --------------------------------------------------------

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                db.Document.document_name.ilike( pattern ), db.Document.category.ilike( pattern ),
                db.Document.related_id.ilike( pattern ), db.Document.document_type.ilike( pattern )
            )
        )

    # --------------------------------------------------------
    # CATEGORY
    # --------------------------------------------------------

    if category and category != "All":
        query = query.filter( db.Document.category == category )

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    if status and status != "All":
        query = query.filter( db.Document.status == status )

    total = query.count()

    offset = (page - 1) * limit

    rows = ( query .order_by( db.Document.uploaded_on.desc() ) .offset(offset) .limit(limit) .all() )

    documents = [
        crud.serialize_vendor_document( document, user_name )
        for document, user_name in rows
    ]

    total_pages = (
        (total + limit - 1) // limit
        if total
        else 1
    )

    return {
        "success": True,
        "items": documents,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages
        }
    }


# ============================================================
# VENDOR DOCUMENT UPLOAD
# ============================================================

@app.post( "/api/vendor/documents/upload", tags=["Vendor Dashboard"] )
async def upload_vendor_document(
    file: UploadFile = File(...),
    category: str = Form(...),
    document_type: str = Form( default="" ),
    document_title: str = Form( default="" ),
    document_description: str = Form( default="" ),
    expiry_date: str = Form( default="" ),
    folder_id: str = Form( default="" ),
    tags: str = Form( default="" ),
    current_vendor: db.Vendor = Depends( crud.get_current_vendor ),
    database: Session = Depends( db.get_db )
):

    if not file.filename:
        raise HTTPException( status_code=400, detail="File name is required." )

    extension = Path( file.filename ).suffix.lower()

    if extension not in crud.VENDOR_DOCUMENT_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG."
            )
        )

    file_content = await file.read()

    if len(file_content) > crud.VENDOR_DOCUMENT_MAX_SIZE:
        raise HTTPException( status_code=400, detail="Maximum file size is 25 MB." )

    safe_name = Path( file.filename ).name

    timestamp = datetime.utcnow().strftime( "%Y%m%d%H%M%S%f" )

    stored_name = ( f"{timestamp}_{safe_name}" )

    destination = ( UPLOAD_DIRECTORY / stored_name )

    with destination.open("wb") as buffer:
        buffer.write(file_content)

    parsed_expiry = None

    if expiry_date:
        try:
            parsed_expiry = datetime.strptime( expiry_date, "%Y-%m-%d" ).date()
        except ValueError:
            raise HTTPException( status_code=400, detail="Invalid expiry date." )

    parsed_folder = (
        int(folder_id)
        if folder_id
        else None
    )

    document = db.Document(
        document_name=(
            document_title.strip()
            if document_title.strip()
            else safe_name
        ),
        category=category,
        document_type=( document_type.strip() or None ),
        related_type="Vendor",
        related_id=current_vendor.vendor_id,
        vendor_id=current_vendor.vendor_id,
        tags=( tags.strip() or None ),
        folder_id=parsed_folder,
        uploaded_by=None,
        file_path=str(destination),
        file_type=( extension .replace(".", "") .upper() ),
        mime_type=( file.content_type or "application/octet-stream" ),
        file_size=len(file_content),
        status="Pending Review",
        expiry_date=parsed_expiry,
        description=( document_description.strip() or None )
    )

    database.add(document)

    database.flush()

    database.add(
        db.DocumentActivity(
            document_id=document.id,
            user_id=None,
            action="UPLOAD",
            message=( f"{safe_name} uploaded by {current_vendor.vendor_name}" )
        )
    )

    database.add(
        db.DocumentApproval(
            document_id=document.id,
            reviewer_id=None,
            status="Pending",
            comments=None,
            requested_at=datetime.utcnow()
        )
    )

    database.commit()

    database.refresh(document)

    return {
        "success": True,
        "message": "Document uploaded successfully.",
        "document_id": document.id,
        "status": document.status
    }


# ============================================================
# VENDOR DOCUMENT DOWNLOAD
# ============================================================

@app.get( "/api/vendor/documents/{vendor_id}/{document_id}/download", tags=["Vendor Dashboard"] )
def download_vendor_document(
    vendor_id: str,
    document_id: int,
    current_vendor: db.Vendor = Depends( crud.get_current_vendor ),
    database: Session = Depends( db.get_db )
):

    crud.verify_vendor_document_access( vendor_id, current_vendor )

    document = ( database.query(db.Document) .filter( db.Document.id == document_id, db.Document.vendor_id == vendor_id ) .first() )

    if not document:
        raise HTTPException( status_code=404, detail="Document not found." )

    path = Path( document.file_path )

    if not path.exists():
        raise HTTPException( status_code=404, detail="Physical file not found." )

    return FileResponse(
        path=str(path), filename=document.document_name,
        media_type=( document.mime_type or "application/octet-stream" )
    )


# ============================================================
# DELETE VENDOR DOCUMENT
# ============================================================

@app.delete( "/api/vendor/documents/{vendor_id}/{document_id}", tags=["Vendor Dashboard"] )
def delete_vendor_document(
    vendor_id: str,
    document_id: int,
    current_vendor: db.Vendor = Depends( crud.get_current_vendor ),
    database: Session = Depends( db.get_db )
):

    crud.verify_vendor_document_access( vendor_id, current_vendor )

    document = ( database.query(db.Document) .filter( db.Document.id == document_id, db.Document.vendor_id == vendor_id ) .first() )

    if not document:
        raise HTTPException( status_code=404, detail="Document not found." )

    file_path = Path( document.file_path )

    if file_path.exists():
        try:
            file_path.unlink()
        except OSError:
            pass

    database.delete(document)

    database.commit()

    return { "success": True, "message": "Document deleted successfully." }


# ============================================================
# VENDOR NOTIFICATIONS
# ============================================================

@app.get( "/api/vendor/notifications", response_model=db.VendorNotificationListResponse, tags=["Vendor Dashboard"] )
def get_vendor_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(8, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    database: Session = Depends(db.get_db),
    current_vendor: db.Vendor = Depends( crud.require_vendor )
):

    query = ( database.query(db.Notification) .filter( db.Notification.vendor_id == current_vendor.vendor_id ) )

    if search:
        search_value = f"%{search}%"

        query = query.filter(
            (db.Notification.title.ilike(search_value)) | (db.Notification.message.ilike(search_value))
        )

    if category and category != "All":
        query = query.filter( db.Notification.category == category )

    if status and status != "All":
        query = query.filter( db.Notification.status == status )

    total = query.count()

    offset = (page - 1) * limit

    notifications = ( query .order_by( db.Notification.created_at.desc() ) .offset(offset) .limit(limit) .all() )

    total_pages = (
        (total + limit - 1) // limit
        if total
        else 1
    )

    return {
        "items": notifications,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }


@app.get( "/api/vendor/notifications/stats", response_model=db.VendorNotificationStats, tags=["Vendor Dashboard"] )
def get_vendor_notification_stats(
    database: Session = Depends(db.get_db),
    current_vendor: db.Vendor = Depends( crud.require_vendor )
):

    base_query = ( database.query(db.Notification) .filter( db.Notification.vendor_id == current_vendor.vendor_id ) )

    def category_count(category):
        return (
            base_query.filter( db.Notification.category == category ) .count() )

    def unread_category_count(category):
        return ( base_query.filter( db.Notification.category == category, db.Notification.status == "Unread" ) .count() )

    return {
        "all_notifications": base_query.count(),
        "unread_notifications": base_query .filter( db.Notification.status == "Unread" ) .count(),
        "procurement_alerts": category_count("Procurement"),
        "procurement_unread": unread_category_count("Procurement"),
        "delivery_delays": category_count("Delivery"),
        "delivery_unread": unread_category_count("Delivery"),
        "vendor_approvals": category_count("Vendor"),
        "vendor_unread": unread_category_count("Vendor"),
        "contract_expiry": category_count("Contract"),
        "contract_unread": unread_category_count("Contract"),
        "compliance": category_count("Compliance"),
        "compliance_unread": unread_category_count("Compliance")
    }


@app.put( "/api/vendor/notifications/{notification_id}/read", tags=["Vendor Dashboard"] )
def mark_vendor_notification_read(
    notification_id: int,
    database: Session = Depends( db.get_db ),
    current_vendor: db.Vendor = Depends( crud.require_vendor )
):

    notification = (
        database.query(db.Notification) .filter(
            db.Notification.id == notification_id,
            db.Notification.vendor_id == current_vendor.vendor_id
        ) .first()
    )

    if not notification:
        raise HTTPException( status_code=404, detail="Notification not found" )

    notification.status = "Read"

    database.commit()

    return { "success": True, "message": "Notification marked as read" }


@app.put( "/api/vendor/notifications/{notification_id}/unread", tags=["Vendor Dashboard"] )
def mark_vendor_notification_unread(
    notification_id: int,
    database: Session = Depends( db.get_db ),
    current_vendor: db.Vendor = Depends( crud.require_vendor )
):

    notification = (
        database.query(db.Notification) .filter(
            db.Notification.id == notification_id,
            db.Notification.vendor_id == current_vendor.vendor_id
        ) .first()
    )

    if not notification:
        raise HTTPException( status_code=404, detail="Notification not found" )

    notification.status = "Unread"

    database.commit()

    return { "success": True, "message": "Notification marked as unread" }


@app.put( "/api/vendor/notifications/read-all", tags=["Vendor Dashboard"] )
def mark_all_vendor_notifications_read(
    database: Session = Depends( db.get_db ),
    current_vendor: db.Vendor = Depends( crud.require_vendor )
):

    updated = (
        database.query(db.Notification) .filter(
            db.Notification.vendor_id == current_vendor.vendor_id,
            db.Notification.status == "Unread"
        )
        .update( { db.Notification.status: "Read" }, synchronize_session=False )
    )

    database.commit()

    return { "success": True, "updated": updated }


@app.get( "/api/vendor/notifications/settings", response_model=db.VendorNotificationSettingsResponse, tags=["Vendor Dashboard"] )
def get_vendor_notification_settings(
    database: Session = Depends( db.get_db ),
    current_vendor: db.Vendor = Depends( crud.require_vendor )
):

    settings = (
        database.query( db.VendorNotificationSettings )
        .filter( db.VendorNotificationSettings.vendor_id == current_vendor.vendor_id ) .first()
    )

    if not settings:
        settings = db.VendorNotificationSettings( vendor_id=current_vendor.vendor_id )
        database.add(settings)
        database.commit()
        database.refresh(settings)

    return settings


@app.put( "/api/vendor/notifications/settings", response_model=db.VendorNotificationSettingsResponse, tags=["Vendor Dashboard"] )
def update_vendor_notification_settings(
    data: db.VendorNotificationSettingsUpdate,
    database: Session = Depends( db.get_db ),
    current_vendor: db.Vendor = Depends( crud.require_vendor )
):

    settings = (
        database.query( db.VendorNotificationSettings )
        .filter( db.VendorNotificationSettings.vendor_id == current_vendor.vendor_id ) .first()
    )

    if not settings:
        settings = db.VendorNotificationSettings( vendor_id=current_vendor.vendor_id )
        database.add(settings)

    settings.procurement_alerts = ( data.procurement_alerts )

    settings.delivery_delay_notifications = ( data.delivery_delay_notifications )

    settings.vendor_approval_notifications = ( data.vendor_approval_notifications )

    settings.contract_expiry_alerts = ( data.contract_expiry_alerts )

    settings.compliance_notifications = ( data.compliance_notifications )

    settings.email_notifications = ( data.email_notifications )

    settings.sms_notifications = ( data.sms_notifications )

    settings.updated_at = datetime.utcnow()

    database.commit()

    database.refresh(settings)

    return settings


@app.get( "/api/vendor/order-reports", tags=["Vendor Dashboard"] )
def get_vendor_order_report(
    vendor_id: Optional[str] = Query( None ),
    from_date: Optional[date] = Query( None ),
    to_date: Optional[date] = Query( None ),
    category: Optional[str] = Query( None ),
    status: Optional[str] = Query( None ),
    search: Optional[str] = Query( None ),
    page: int = Query( 1, ge=1 ),
    limit: int = Query( 8, ge=1, le=100 ),
    database: Session = Depends( db.get_db )
):

    today = date.today()


    # --------------------------------------------------------
    # DEFAULT DATES
    # --------------------------------------------------------

    to_date = ( to_date or today )


    from_date = ( from_date or date( to_date.year, to_date.month, 1 ) )


    if from_date > to_date:
        raise HTTPException( status_code=400, detail=( "from_date cannot be greater than to_date." ) )


    # --------------------------------------------------------
    # VENDOR
    # --------------------------------------------------------

    vendor = None


    if vendor_id:
        vendor = ( database.query( db.Vendor ) .filter( db.Vendor.vendor_id == vendor_id ) .first() )


        if not vendor:
            raise HTTPException( status_code=404, detail="Vendor not found." )


    # --------------------------------------------------------
    # MAIN ORDERS
    # --------------------------------------------------------

    query = crud.build_order_report_query(
        database=database, vendor_id=vendor_id, from_date=from_date,
        to_date=to_date, category=category, status=status, search=search
    )


    all_orders=query.order_by(db.PurchaseOrder.order_date.desc(),db.PurchaseOrder.id.desc()).all()


    # --------------------------------------------------------
    # KPI CALCULATION
    # --------------------------------------------------------

    def calculate_kpis( orders ):
        counts = { "Completed": 0, "In Transit": 0, "Pending": 0, "Cancelled": 0 }

        total_value = 0

        for order in orders:

            normalized_status = ( crud.normalize_order_status( order.status ) )

            total_value += float( order.amount or 0 )

            if normalized_status in counts:
                counts[ normalized_status ] += 1


        total = len(orders)


        return {

            "total_orders": total,

            "completed_orders": counts["Completed"],

            "in_transit_orders": counts["In Transit"],

            "pending_orders": counts["Pending"],

            "cancelled_orders": counts["Cancelled"],

            "total_order_value": round( total_value, 2 ),

            "average_order_value": round( total_value / total, 2 )
                if total
                else 0,

            "completed_orders_pct": round( counts["Completed"] / total * 100, 1 )
                if total
                else 0,

            "in_transit_orders_pct": round( counts["In Transit"] / total * 100, 1 )
                if total
                else 0,

            "pending_orders_pct": round( counts["Pending"] / total * 100, 1 )
                if total
                else 0,

            "cancelled_orders_pct": round( counts["Cancelled"] / total * 100, 1 )
                if total
                else 0
        }


    kpis = calculate_kpis( all_orders )


    # --------------------------------------------------------
    # PREVIOUS PERIOD
    # --------------------------------------------------------

    previous_from, previous_to = ( crud.get_previous_period( from_date, to_date ) )


    previous_orders = (
        crud.build_order_report_query(
            database=database, vendor_id=vendor_id, from_date=previous_from,
            to_date=previous_to, category=category, status=status, search=search
        ) .all()
    )


    previous_kpis = ( calculate_kpis(previous_orders ) )


    def calculate_change( current, previous ):

        if previous == 0:

            if current == 0:
                return 0

            return 100


        return round( ( current - previous ) / previous * 100, 1 )


    kpis["changes"] = {

        "total_orders": calculate_change( kpis["total_orders"], previous_kpis["total_orders"] ),

        "completed_orders": calculate_change( kpis["completed_orders"], previous_kpis["completed_orders"] ),

        "in_transit_orders": calculate_change( kpis["in_transit_orders"], previous_kpis["in_transit_orders"] ),

        "pending_orders": calculate_change( kpis["pending_orders"], previous_kpis["pending_orders"] ),

        "cancelled_orders": calculate_change( kpis["cancelled_orders"], previous_kpis["cancelled_orders"] ),

        "total_order_value": calculate_change( kpis["total_order_value"], previous_kpis["total_order_value"] )
    }


    # --------------------------------------------------------
    # SIX MONTH TREND
    # --------------------------------------------------------

    trend = []


    current_month = date( to_date.year, to_date.month, 1 )


    for offset in range( 5, -1, -1 ):
        month = ( current_month.month - offset )

        year = ( current_month.year )


        while month <= 0:
            month += 12
            year -= 1

        start = date( year, month, 1 )

        if month == 12:
            next_month = date( year + 1,  1, 1 )

        else:
            next_month = date( year, month + 1, 1 )


        end = ( next_month - timedelta(days=1) )


        month_orders = (
            crud.build_order_report_query(
                database=database, vendor_id=vendor_id, from_date=start,
                to_date=end, category=category, status=status, search=search
            ) .all()
        )


        month_kpis = calculate_kpis( month_orders )

        trend.append({
            "label": start.strftime( "%b %Y" ), "total": month_kpis[ "total_orders" ],
            "completed": month_kpis[ "completed_orders" ], "cancelled": month_kpis[ "cancelled_orders" ]
        })


    # --------------------------------------------------------
    # MONTHLY ORDER VALUE
    # --------------------------------------------------------

    value_by_month = []


    for item in trend:
        value_by_month.append({ "label": item["label"], "value": 0 })


    value_map = {
        item["label"]: item
        for item in value_by_month
    }


    for order in all_orders:

        if not order.order_date:
            continue


        label = ( order.order_date .strftime("%b %Y") )


        if label in value_map:
            value_map[ label ]["value"] += float( order.amount or 0 )


    # --------------------------------------------------------
    # STATUS DISTRIBUTION
    # --------------------------------------------------------

    status_distribution = []


    statuses = [
        ( "Completed", kpis["completed_orders"] ), ( "In Transit", kpis["in_transit_orders"] ),
        ( "Pending", kpis["pending_orders"] ), ( "Cancelled", kpis["cancelled_orders"] )
    ]


    for status_name, count in statuses:

        if count:

            status_distribution.append({

                "status": status_name,

                "count": count,

                "percent": round( count / kpis["total_orders"] * 100, 1 )
                    if kpis["total_orders"]
                    else 0
            })


    # --------------------------------------------------------
    # PAGINATED TABLE
    # --------------------------------------------------------

    start_index = ( (page - 1) * limit )

    end_index = ( start_index + limit )


    page_orders = ( all_orders[ start_index:end_index ] )


    rows = []


    for order in page_orders:

        item = None


        if getattr( order, "items", None ):
            item = (
                order.items[0]
                if order.items
                else None
            )


        rows.append({

            "id": order.id,

            "po_number": order.po_number,

            "order_date": (
                    order.order_date.isoformat()
                    if order.order_date
                    else None
                ),

            "item_description": (
                    item.item_description
                    if item
                    else "Multiple items"
                ),

            "category": order.category or "Other",

            "amount": float( order.amount or 0 ),

            "status": crud.normalize_order_status( order.status ),

            "expected_delivery": (
                    order.expected_delivery.isoformat()
                    if order.expected_delivery
                    else None
                ),

            "actual_delivery": (
                    order.actual_delivery.isoformat()
                    if order.actual_delivery
                    else None
                )
        })


    # --------------------------------------------------------
    # CATEGORIES
    # --------------------------------------------------------

    category_query = (
        database.query( db.PurchaseOrder.category, func.count( db.PurchaseOrder.id ) )
        .filter( db.PurchaseOrder.category .isnot(None) )
    )


    if vendor_id:

        category_query = ( category_query.filter( db.PurchaseOrder.vendor_id == vendor_id ) )


    category_rows = ( category_query .group_by( db.PurchaseOrder.category ) .order_by( db.PurchaseOrder.category ) .all() )


    categories = [
        { "category": category_name, "count": count }
        for category_name, count in category_rows
    ]


    # --------------------------------------------------------
    # TOP ORDERED ITEMS
    # --------------------------------------------------------

    item_query = database.query(
        db.PurchaseOrderItem .item_description, db.PurchaseOrderItem .uom,
        func.sum(  db.PurchaseOrderItem.quantity ).label("quantity"),
        func.sum( db.PurchaseOrderItem.amount ).label("value")
    ).join(
        db.PurchaseOrder,
        db.PurchaseOrder.id == db.PurchaseOrderItem .purchase_order_id
    )


    if vendor_id:
        item_query = ( item_query.filter( db.PurchaseOrder.vendor_id == vendor_id ) )


    item_query = (
        item_query .filter(  db.PurchaseOrder.order_date >= from_date  ) 
        .filter( db.PurchaseOrder.order_date <= to_date ) 
    )


    item_rows = (
        item_query .group_by( db.PurchaseOrderItem .item_description, db.PurchaseOrderItem .uom )
        .order_by( desc( func.sum( db.PurchaseOrderItem.quantity ) ) ) .limit(10) .all()
    )


    top_items = [ {
            "item_description": item_description,
            "uom": uom,
            "quantity": float( quantity or 0 ),
            "value": float( value or 0 )
        } for (  item_description, uom, quantity, value ) in item_rows
    ]


    # --------------------------------------------------------
    # INSIGHTS
    # --------------------------------------------------------

    insights = []


    if kpis["total_orders"]:

        if ( kpis["completed_orders_pct"] >= 70 ):
            insights.append({
                "type": "success",
                "text":
                    f'{kpis["completed_orders"]} '
                    f'orders '
                    f'({kpis["completed_orders_pct"]:.0f}%) '
                    f'are completed.'
            })


        if ( kpis["cancelled_orders_pct"] >= 5 ):
            insights.append({
                "type": "warning",
                "text":
                    f'Cancelled orders are '
                    f'{kpis["cancelled_orders_pct"]:.1f}% '
                    f'of the selected period.'
            })


        if ( kpis["pending_orders"] > 0 ):
            insights.append({
                "type": "info",
                "text": f'{kpis["pending_orders"]} orders are still pending.'
            })


        if ( kpis["total_order_value"] > 0 ):
            insights.append({
                "type": "info",
                "text":
                    f'Total order value is {kpis["total_order_value"]:,.0f} for the selected period.'
            })


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    total_orders = len( all_orders )


    return {
        "success": True,
        "vendor": {
            "vendor_id": vendor.vendor_id
                if vendor
                else vendor_id,
            "vendor_name": vendor.vendor_name
                if vendor
                else "All Vendors",
            "category": vendor.category
                if vendor
                else None
        },
        "filters": {
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "category": category,
            "status": status
        },
        "kpis": kpis,
        "trend": trend,
        "value_by_month": value_by_month,
        "status_distribution": status_distribution,
        "categories": categories,
        "top_items": top_items,
        "insights": insights,
        "orders": rows,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_orders,
            "pages": max( 1, ( total_orders + limit - 1 ) // limit )
        }
    }


@app.get( "/api/vendor/order-reports/export", tags=["Vendor Dashboard"] )
def export_vendor_order_report(
    vendor_id: Optional[str] = Query( None ),
    from_date: Optional[date] = Query( None ),
    to_date: Optional[date] = Query( None ),
    category: Optional[str] = Query( None ),
    status: Optional[str] = Query( None ),
    search: Optional[str] = Query( None ),
    database: Session = Depends( db.get_db )
):

    today = date.today()


    to_date = ( to_date or today )


    from_date = ( from_date or date( to_date.year, to_date.month, 1 ) )


    orders = ( crud.build_order_report_query(
            database=database, vendor_id=vendor_id, from_date=from_date,
            to_date=to_date, category=category, status=status, search=search
        ) .order_by( db.PurchaseOrder .order_date.desc() ) .all() )


    output = io.StringIO()


    writer = csv.writer( output )


    writer.writerow([
        "PO Number",
        "Order Date",
        "Vendor ID",
        "Category",
        "Order Value",
        "Status",
        "Expected Delivery",
        "Actual Delivery"
    ])


    for order in orders:
        writer.writerow([
            order.po_number,
            order.order_date,
            order.vendor_id,
            order.category or "Other",
            float( order.amount or 0 ),
            crud.normalize_order_status( order.status ),
            order.expected_delivery,
            order.actual_delivery
        ])


    return StreamingResponse(
        iter([ output.getvalue() ]),
        media_type="text/csv",
        headers={ "Content-Disposition": 'attachment; ' 'filename="order-report.csv"' }
    )


@app.post( "/api/vendor/order-reports/schedule", tags=["Vendor Dashboard"] )
def schedule_vendor_order_report( payload: db.OrderReportScheduleRequest, database: Session = Depends(db.get_db) ):

    vendor = ( database.query( db.Vendor ) .filter( db.Vendor.vendor_id == payload.vendor_id ) .first() )


    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found." )


    allowed_formats = { "CSV", "PDF", "EXCEL" }


    if ( payload.format.upper() not in allowed_formats ):
        raise HTTPException( status_code=400, detail=( "format must be CSV, PDF or Excel." ) )


    report = db.ScheduledReport(
        report_name=( f"{payload.report_name} - {payload.vendor_id}" ),
        schedule= payload.schedule,
        next_run= payload.next_run,
        recipients= payload.recipients,
        format= payload.format.upper(),
        status= "Active",
        is_active= True
    )


    database.add( report )

    database.commit()

    database.refresh( report )


    return {
        "success": True, "schedule_id": report.id,
        "message": "Order report scheduled successfully."
    }


# ============================================================
# VENDOR COMPLIANCE REPORT
# ============================================================

@app.get(
    "/api/vendor/compliance-reports/{vendor_id}",
    tags=["Vendor Dashboard"]
)
def get_vendor_compliance_report(
    vendor_id: str,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category: Optional[str] = Query("All"),
    compliance_type: Optional[str] = Query("All"),
    status: Optional[str] = Query("All"),
    search: Optional[str] = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(8, ge=1, le=100),
    current_vendor: db.Vendor = Depends(crud.get_current_vendor),
    database: Session = Depends(db.get_db)
):

    print("========== COMPLIANCE REPORT AUTH DEBUG ==========")
    print("URL vendor_id            :", vendor_id)
    print("current_vendor.id        :", getattr(current_vendor, "id", None))
    print(
        "current_vendor.vendor_id :",
        getattr(current_vendor, "vendor_id", None)
    )
    print("==================================================")

    # ========================================================
    # SECURITY
    # ========================================================

    if not current_vendor:
        raise HTTPException(
            status_code=401,
            detail="Vendor authentication required."
        )

    # The authenticated vendor is the source of truth.
    authenticated_vendor_id = current_vendor.vendor_id

    # Prevent a vendor from requesting another vendor's data.
    if vendor_id != authenticated_vendor_id:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to access these compliance reports."
        )

    # Always use the authenticated vendor ID from this point onward.
    vendor_id = authenticated_vendor_id

    # ========================================================
    # SECURITY
    # ========================================================

    crud.verify_vendor_document_access( vendor_id, current_vendor )

    # ========================================================
    # DATE RANGE
    # ========================================================

    today = date.today()

    if end_date is None:
        end_date = today

    if start_date is None:
        start_date = date( end_date.year, end_date.month, 1 )

    # ========================================================
    # BASE QUERY
    # ========================================================

    query = ( database.query(db.Document) .filter( db.Document.vendor_id == vendor_id ) )

    # ========================================================
    # DATE FILTER
    # ========================================================

    if start_date:
        query = query.filter( db.Document.document_date >= start_date )

    if end_date:
        query = query.filter( db.Document.document_date <= end_date )

    # ========================================================
    # CATEGORY
    # ========================================================

    if category and category != "All":
        query = query.filter( db.Document.category == category )

    # ========================================================
    # COMPLIANCE TYPE
    # Uses document_type in your current model.
    # ========================================================

    if ( compliance_type and compliance_type != "All" ):
        query = query.filter( db.Document.document_type == compliance_type )

    # ========================================================
    # SEARCH
    # ========================================================

    if search:

        search_value = ( f"%{search.strip()}%" )

        query = query.filter(
            or_(
                db.Document.document_name.ilike( search_value ),
                db.Document.category.ilike( search_value ),
                db.Document.document_type.ilike( search_value ),
                db.Document.related_id.ilike( search_value )
            )
        )

    # ========================================================
    # FETCH DOCUMENTS
    # ========================================================

    documents = ( query .order_by( db.Document.expiry_date.asc() ) .all() )

    # ========================================================
    # STATUS CALCULATION
    # ========================================================

    def calculate_compliance_status( document ):
        raw_status = str( document.status or "" ).strip().lower()

        expiry = document.expiry_date

        # ----------------------------------------------------
        # OVERDUE
        # ----------------------------------------------------

        if expiry and expiry < today:
            return "Overdue"

        # ----------------------------------------------------
        # NON-COMPLIANT
        # ----------------------------------------------------

        if raw_status in { "non-compliant", "non compliant", "failed", "rejected", "expired" }:
            return "Non-Compliant"

        # ----------------------------------------------------
        # PENDING
        # ----------------------------------------------------

        if raw_status in { "pending", "pending review", "under review" }:
            return "Pending Review"

        # ----------------------------------------------------
        # EXPIRING
        # ----------------------------------------------------

        if expiry:
            days = ( expiry - today ).days

            if 0 <= days <= 90:
                return "Expiring Soon"

        # ----------------------------------------------------
        # COMPLIANT
        # ----------------------------------------------------

        if raw_status in { "approved", "verified", "compliant", "valid" }:
            return "Compliant"

        # ----------------------------------------------------
        # DEFAULT
        # ----------------------------------------------------

        return "Pending Review"

    # ========================================================
    # BUILD REPORT ROWS
    # ========================================================

    report_documents = []

    for document in documents:
        compliance_status = ( calculate_compliance_status( document ) )

        days_left = None

        if document.expiry_date:
            days_left = ( document.expiry_date - today ).days

        report_documents.append(
            {
                "id": document.id,
                "document_name": document.document_name,
                "category": document.category,
                "compliance_type": document.document_type or "General",
                "issue_date": ( document.document_date.isoformat()
                        if document.document_date
                        else None
                    ),
                "expiry_date": ( document.expiry_date.isoformat()
                        if document.expiry_date
                        else None
                    ),
                "status": compliance_status,
                "original_status": document.status,
                "days_left": days_left
            }
        )

    # ========================================================
    # STATUS FILTER
    # ========================================================

    if status and status != "All":
        report_documents = [
            item
            for item in report_documents
            if item["status"] == status
        ]

    # ========================================================
    # COUNTS
    # ========================================================

    total_documents = len( report_documents )

    compliant_count = sum(
        1
        for item in report_documents
        if item["status"] == "Compliant"
    )

    expiring_count = sum(
        1
        for item in report_documents
        if item["status"] == "Expiring Soon"
    )

    pending_count = sum(
        1
        for item in report_documents
        if item["status"] == "Pending Review"
    )

    non_compliant_count = sum(
        1
        for item in report_documents
        if item["status"] == "Non-Compliant"
    )

    overdue_count = sum(
        1
        for item in report_documents
        if item["status"] == "Overdue"
    )

    # ========================================================
    # COMPLIANCE SCORE
    #
    # Approved/verified/compliant = full score
    # Expiring = full score
    # Pending = 50%
    # Non-compliant / overdue = 0%
    # ========================================================

    if total_documents:

        weighted_score = ( compliant_count + expiring_count + (pending_count * 0.5) )

        compliance_score = round( ( weighted_score / total_documents ) * 100, 1 )

    else:
        compliance_score = 0

    # ========================================================
    # CATEGORY DISTRIBUTION
    # ========================================================

    category_map = {}

    for item in report_documents:

        category_name = ( item["category"] or "General" )

        if category_name not in category_map:
            category_map[category_name] = {
                "category": category_name, "Compliant": 0, "Expiring Soon": 0,
                "Pending Review": 0, "Non-Compliant": 0, "Overdue": 0
            }

        category_map[ category_name ][item["status"]] += 1

    category_distribution = list( category_map.values() )

    # ========================================================
    # STATUS DISTRIBUTION
    # ========================================================

    status_distribution = {
        "Compliant": compliant_count,
        "Expiring Soon": expiring_count,
        "Pending Review": pending_count,
        "Non-Compliant": non_compliant_count,
        "Overdue": overdue_count
    }

    # ========================================================
    # UPCOMING EXPIRY
    # ========================================================

    upcoming_expiry = [ item
        for item in report_documents
        if ( item["days_left"] is not None and item["days_left"] >= 0 )
    ]

    upcoming_expiry.sort( key=lambda x: x["days_left"] )

    # ========================================================
    # PAGINATION
    # ========================================================

    total = len( report_documents )

    total_pages = ( (total + limit - 1) // limit
        if total
        else 1
    )

    offset = ( (page - 1) * limit )

    paginated_documents = ( report_documents[ offset: offset + limit ] )

    # ========================================================
    # MONTHLY SCORE TREND
    #
    # This is reconstructed from document dates because
    # there is currently no historical compliance snapshot
    # table.
    # ========================================================

    trend_labels = []

    trend_scores = []

    for month_offset in range( 5, -1, -1 ):
        month_date = ( end_date - timedelta( days=month_offset * 30 ) )

        label = month_date.strftime( "%b %Y" )

        trend_labels.append(label)

        month_documents = [ item
            for item in report_documents
            if ( item["issue_date"] and item["issue_date"][:7] == month_date.strftime("%Y-%m") )
        ]

        if month_documents:

            good = sum( 1
                for item in month_documents
                if item["status"] in [ "Compliant", "Expiring Soon" ]
            )

            pending = sum( 1
                for item in month_documents
                if item["status"] == "Pending Review"
            )

            score = ( ( good + pending * 0.5 ) / len(month_documents) ) * 100

            trend_scores.append( round(score, 1) )

        else:
            trend_scores.append( compliance_score )

    # ========================================================
    # FILTER OPTIONS
    # ========================================================

    categories = sorted(
        {
            str(item["category"])
            for item in report_documents
            if item["category"]
        }
    )

    compliance_types = sorted(
        {
            str(item["compliance_type"])
            for item in report_documents
            if item["compliance_type"]
        }
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "success": True,
        "vendor_id": vendor_id,
        "date_range": {
            "start_date": start_date.isoformat(), "end_date": end_date.isoformat()
        },
        "summary": {
            "overall_compliance_score": compliance_score,
            "total_documents": total_documents,
            "compliant_documents": compliant_count,
            "expiring_soon": expiring_count,
            "pending_review": pending_count,
            "non_compliant": non_compliant_count,
            "overdue": overdue_count
        },
        "status_distribution": status_distribution,
        "category_distribution": category_distribution,
        "trend": {
            "labels": trend_labels, "scores": trend_scores
        },
        "upcoming_expiry": upcoming_expiry[:10],
        "filters": {
            "categories": categories, "compliance_types": compliance_types,
            "statuses": [ "Compliant", "Expiring Soon", "Pending Review", "Non-Compliant", "Overdue" ]
        },
        "documents": paginated_documents,
        "pagination": {
            "page": page, "limit": limit,
            "total": total, "total_pages": total_pages
        }
    }


# ============================================================
# SCHEDULE COMPLIANCE REPORT
# ============================================================

@app.post( "/api/vendor/compliance-reports/schedule", tags=["Vendor Dashboard"] )
def schedule_compliance_report(
    payload: db.ComplianceReportScheduleRequest,
    database: Session = Depends(db.get_db),
    current_vendor: db.Vendor = Depends( crud.get_current_vendor )
):

    crud.verify_vendor_document_access( payload.vendor_id, current_vendor )

    scheduled_report = db.ScheduledReport(
            report_name= payload.report_name,
            schedule= payload.schedule,
            next_run= payload.next_run,
            recipients= payload.recipients,
            format= payload.format,
            status="Active",
            is_active=True
        )


    database.add( scheduled_report )

    database.commit()

    database.refresh( scheduled_report )


    return {
        "success": True,

        "message": "Compliance report scheduled successfully.",

        "scheduled_report": {
            "id": scheduled_report.id,
            "report_name": scheduled_report.report_name,
            "schedule": scheduled_report.schedule,
            "next_run": ( scheduled_report.next_run.isoformat()
                    if scheduled_report.next_run
                    else None
                ),
            "format": scheduled_report.format,
            "status": scheduled_report.status
        }
    }


@app.get("/api/vendor/settings/{vendor_id}", tags=["Vendor Dashboard"])
def get_vendor_settings( vendor_id: str, db_session: Session = Depends(db.get_db) ):

    vendor = ( db_session.query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    settings = ( db_session.query(db.VendorSettings) .filter( db.VendorSettings.vendor_id == vendor_id ) .first() )

    if not settings:

        settings = db.VendorSettings( vendor_id=vendor_id )

        db_session.add(settings)
        db_session.commit()
        db_session.refresh(settings)

    subscription = ( db_session.query(db.VendorSubscription) .filter( db.VendorSubscription.vendor_id == vendor_id ) .first() )

    if not subscription:
        subscription = db.VendorSubscription( vendor_id=vendor_id )
        db_session.add(subscription)
        db_session.commit()
        db_session.refresh(subscription)

    total_users = ( db_session.query(db.VendorUserAccess)
        .filter( db.VendorUserAccess.vendor_id == vendor_id ) .count()
    )

    active_users = ( db_session.query(db.VendorUserAccess) .filter(
            db.VendorUserAccess.vendor_id == vendor_id,
            db.VendorUserAccess.status == "Active"
        ) .count()
    )

    pending_invitations = ( db_session.query(db.VendorUserAccess) .filter(
            db.VendorUserAccess.vendor_id == vendor_id,
            db.VendorUserAccess.status == "Pending"
        ) .count()
    )

    roles = ( db_session.query(db.VendorUserAccess.role_id) .filter(
            db.VendorUserAccess.vendor_id == vendor_id,
            db.VendorUserAccess.role_id.isnot(None)
        ) .distinct() .count()
    )

    return {
        "vendor": {
            "vendor_id": vendor.vendor_id,
            "company_name": vendor.vendor_name,
            "email": vendor.email,
            "phone": vendor.phone,
            "website": vendor.website,
            "business_type": vendor.business_type,
            "country": vendor.country,
            "address": vendor.address,
            "primary_contact": ( vendor.contact_person ),
            "gst_vat": vendor.gst_vat_number,
            "tax_id": vendor.tax_id_ein,
            "pan_number": vendor.pan_number
        },

        "notifications": {
            "email_notifications":
                settings.email_notifications,

            "system_notifications":
                settings.system_notifications,

            "sms_notifications":
                settings.sms_notifications,

            "digest_frequency":
                settings.digest_frequency
        },

        "documents": {
            "expiry_alert":
                settings.document_expiry_alert_days,

            "auto_reminder":
                settings.auto_document_reminder,

            "file_types":
                settings.allowed_file_types,

            "max_file_size":
                settings.max_file_size_mb
        },

        "security": {
            "password_changed":
                (
                    settings.password_changed_at.isoformat()
                    if settings.password_changed_at
                    else "-"
                ),

            "two_factor_enabled":
                settings.two_factor_authentication,

            "active_sessions":
                settings.active_sessions
        },

        "preferences": {
            "language":
                settings.language,

            "timezone":
                settings.timezone,

            "date_format":
                settings.date_format,

            "currency":
                settings.currency
        },

        "system": {
            "account_status":
                subscription.status,

            "plan":
                subscription.plan_name,

            "storage_used":
                f"{subscription.storage_used_gb} GB",

            "storage_percent":
                (
                    (
                        subscription.storage_used_gb
                        / subscription.storage_limit_gb
                    ) * 100
                    if subscription.storage_limit_gb
                    else 0
                ),

            "last_login":
                None,

            "security_status":
                settings.account_security_status
        }
    }


# ============================================================
# UPDATE VENDOR SETTINGS / NOTIFICATIONS
# ============================================================

@app.put( "/api/vendor/settings/{vendor_id}", tags=["Vendor Dashboard"] )
def update_vendor_settings( vendor_id: str, payload: dict, database: Session = Depends(db.get_db) ):
    vendor = ( database.query(db.Vendor) .filter(db.Vendor.vendor_id == vendor_id) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    settings = ( database.query(db.VendorSettings) .filter( db.VendorSettings.vendor_id == vendor_id ) .first() )

    if not settings:
        settings = db.VendorSettings( vendor_id=vendor_id )
        database.add(settings)

    # ========================================================
    # VENDOR FIELDS
    # ========================================================

    vendor_fields = [
        "company_name",
        "phone",
        "website",
        "address",
        "primary_contact",
        "business_type",
        "gst_vat_number",
        "tax_id_ein",
        "pan_number"
    ]

    # ========================================================
    # SETTINGS FIELDS
    # ========================================================

    settings_fields = [
        "email_notifications",
        "system_notifications",
        "sms_notifications",
        "digest_frequency",
        "document_expiry_alert_days",
        "auto_document_reminder",
        "allowed_file_types",
        "max_file_size_mb",
        "two_factor_authentication",
        "language",
        "timezone",
        "date_format",
        "currency"
    ]

    # ========================================================
    # UPDATE VENDOR
    # ========================================================

    for field in vendor_fields:
        if field in payload:
            setattr( vendor, field, payload[field] )

    # ========================================================
    # UPDATE NORMAL SETTINGS
    # ========================================================

    for field in settings_fields:
        if field in payload:
            setattr( settings, field, payload[field] )

    # ========================================================
    # UPDATE NESTED NOTIFICATIONS
    # ========================================================

    notifications = payload.get("notifications")

    if notifications:
        notification_fields = [
            "email_notifications",
            "system_notifications",
            "sms_notifications",
            "digest_frequency"
        ]

        for field in notification_fields:
            if field in notifications:
                setattr( settings, field, notifications[field] )

    database.commit()

    database.refresh(vendor)
    database.refresh(settings)

    return { "success": True, "message": "Vendor settings updated successfully", "vendor_id": vendor_id }


# ============================================================
# VENDOR COMPANY SETTINGS
# ============================================================

@app.put( "/api/vendor/settings/company/{vendor_id}", tags=["Vendor Dashboard"] )
def update_vendor_company_settings( vendor_id: str, payload: dict, database: Session = Depends(db.get_db) ):

    vendor = ( database.query(db.Vendor) .filter(db.Vendor.vendor_id == vendor_id) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    allowed_fields = [
        "company_name",
        "phone",
        "website",
        "email",
        "primary_contact"
    ]

    for field in allowed_fields:
        if field in payload:
            setattr( vendor, field, payload[field] )

    database.commit()
    database.refresh(vendor)

    return {
        "success": True,
        "message": "Company information updated successfully",
        "vendor_id": vendor.vendor_id,
        "vendor": {
            "vendor_id": vendor.vendor_id,
            "company_name": vendor.company_name,
            "phone": vendor.phone,
            "website": vendor.website,
            "email": vendor.email,
            "primary_contact": vendor.primary_contact
        }
    }


# ============================================================
# VENDOR TAX SETTINGS
# ============================================================

@app.put( "/api/vendor/settings/tax/{vendor_id}", tags=["Vendor Dashboard"] )
def update_vendor_tax_settings( vendor_id: str, payload: dict, database: Session = Depends(db.get_db) ):
    vendor = ( database.query(db.Vendor) .filter(db.Vendor.vendor_id == vendor_id) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    allowed_fields = [ "business_type", "gst_vat_number", "tax_id_ein", "pan_number" ]

    for field in allowed_fields:
        if field in payload:
            setattr(vendor, field, payload[field])

    database.commit()
    database.refresh(vendor)

    return {
        "success": True,
        "message": "Tax settings updated successfully",
        "vendor_id": vendor_id
    }


# ============================================================
# VENDOR NOTIFICATION SETTINGS
# ============================================================

@app.put( "/api/vendor/notification/settings/{vendor_id}", tags=["Vendor Dashboard"] )
def update_vendor_notifications_settings( vendor_id: str, payload: dict, db_session: Session = Depends(db.get_db) ):

    # ==========================================================
    # FIND VENDOR
    # ==========================================================

    vendor = ( db_session.query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )


    # ==========================================================
    # FIND OR CREATE SETTINGS
    # ==========================================================

    settings = ( db_session.query(db.VendorSettings) .filter( db.VendorSettings.vendor_id == vendor_id ) .first() )

    if not settings:
        settings = db.VendorSettings( vendor_id=vendor_id )

        db_session.add(settings)

        # Flush so SQLAlchemy assigns the new object
        # before continuing
        db_session.flush()


    # ==========================================================
    # SUPPORT BOTH PAYLOAD FORMATS
    # ==========================================================

    # Nested:
    #
    # {
    #     "notifications": {
    #         ...
    #     }
    # }
    #
    # OR flat:
    #
    # {
    #     "email_notifications": true,
    #     ...
    # }

    if "notifications" in payload:
        notification_data = ( payload.get("notifications") or {} )

    else:
        notification_data = payload


    # ==========================================================
    # NOTIFICATION SETTINGS
    # ==========================================================

    notification_fields = [
        "email_notifications",
        "system_notifications",
        "sms_notifications",
        "digest_frequency"
    ]

    for field in notification_fields:
        if field in notification_data:
            setattr( settings, field, notification_data[field] )


    # ==========================================================
    # COMMIT
    # ==========================================================

    try:

        db_session.commit()

        db_session.refresh(settings)

    except Exception as error:

        db_session.rollback()

        print( "Notification settings update error:", error )

        raise HTTPException( status_code=500, detail="Unable to update notification settings." )


    # ==========================================================
    # RESPONSE
    # ==========================================================

    return {
        "success": True,
        "message": "Notification settings updated successfully",
        "vendor_id": vendor_id,
        "notifications": {
            "email_notifications": settings.email_notifications,
            "system_notifications": settings.system_notifications,
            "sms_notifications": settings.sms_notifications,
            "digest_frequency": settings.digest_frequency
        }
    }


# ============================================================
# VENDOR DOCUMENT SETTINGS
# ============================================================

@app.put( "/api/vendor/settings/documents/{vendor_id}", tags=["Vendor Dashboard"] )
def update_vendor_document_settings( vendor_id: str, payload: dict, database: Session = Depends(db.get_db) ):
    # ---------------------------------------------------------
    # Find vendor
    # ---------------------------------------------------------
    vendor = ( database.query(db.Vendor) .filter(db.Vendor.vendor_id == vendor_id) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    # ---------------------------------------------------------
    # Find existing settings
    # ---------------------------------------------------------
    settings = ( database.query(db.VendorSettings) .filter( db.VendorSettings.vendor_id == vendor_id ) .first() )

    # ---------------------------------------------------------
    # Create settings if they don't exist
    # ---------------------------------------------------------
    if not settings:
        settings = db.VendorSettings( vendor_id=vendor_id )
        database.add(settings)

    # ---------------------------------------------------------
    # Document expiry alert
    # Accepts:
    # "30 days before"
    # "15 days before"
    # "7 days before"
    # "30"
    # 30
    # ---------------------------------------------------------
    if "expiry_alert" in payload:

        expiry_alert = payload["expiry_alert"]

        if expiry_alert is not None:

            # Convert to string so both numbers and text work
            expiry_alert = str(expiry_alert).strip()

            # Extract the numeric portion
            import re

            match = re.search( r"\d+", expiry_alert )

            if match:
                settings.document_expiry_alert_days = int( match.group() )

            else:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Invalid expiry_alert value. "
                        "Use values such as "
                        "'30 days before', '15 days before', "
                        "'7 days before', or a number."
                    )
                )

    # ---------------------------------------------------------
    # Allowed file types
    # ---------------------------------------------------------
    if "file_types" in payload:

        settings.allowed_file_types = ( payload["file_types"] )

    # ---------------------------------------------------------
    # Automatic document reminder
    # ---------------------------------------------------------
    if "auto_reminder" in payload:

        settings.auto_document_reminder = bool( payload["auto_reminder"] )

    # ---------------------------------------------------------
    # Maximum file size
    # ---------------------------------------------------------
    if "max_file_size" in payload:

        value = payload["max_file_size"]

        if value is not None and value != "":

            try:
                value = int(value)
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=422,
                    detail="max_file_size must be a whole number in MB."
                )

            if value <= 0:
                raise HTTPException(
                    status_code=422,
                    detail="max_file_size must be greater than zero."
                )

            settings.max_file_size_mb = value

    # ---------------------------------------------------------
    # Save
    # ---------------------------------------------------------
    try:

        database.commit()

        database.refresh(settings)

    except Exception as exc:

        database.rollback()

        raise HTTPException( status_code=500, detail=f"Failed to update document settings: {str(exc)}" )

    # ---------------------------------------------------------
    # Response
    # ---------------------------------------------------------
    return {
        "success": True,
        "message": "Document settings updated successfully",
        "vendor_id": vendor_id,
        "settings": {
            "expiry_alert": (
                f"{settings.document_expiry_alert_days} days before"
                if settings.document_expiry_alert_days is not None
                else None
            ),
            "file_types": settings.allowed_file_types,
            "auto_reminder": settings.auto_document_reminder,
            "max_file_size": settings.max_file_size_mb
        }
    }


# ============================================================
# VENDOR SECURITY SETTINGS
# ============================================================

@app.put( "/api/vendor/settings/security/{vendor_id}", tags=["Vendor Dashboard"] )
def update_vendor_security_settings( vendor_id: str, payload: dict, database: Session = Depends(db.get_db) ):
    vendor = ( database.query(db.Vendor) .filter(db.Vendor.vendor_id == vendor_id) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    settings = ( database.query(db.VendorSettings) .filter( db.VendorSettings.vendor_id == vendor_id ) .first() )

    if not settings:
        settings = db.VendorSettings( vendor_id=vendor_id )
        database.add(settings)

    # --------------------------------------------------------
    # Two-factor authentication
    # --------------------------------------------------------

    if "two_factor_authentication" in payload:

        settings.two_factor_authentication = bool( payload["two_factor_authentication"] )

    elif "two_factor_enabled" in payload:

        settings.two_factor_authentication = bool( payload["two_factor_enabled"] )

    database.commit()
    database.refresh(settings)

    return {
        "success": True,
        "message": "Security settings updated successfully",
        "vendor_id": vendor_id
    }


# ============================================================
# VENDOR PREFERENCES
# ============================================================

@app.put( "/api/vendor/settings/preferences/{vendor_id}", tags=["Vendor Dashboard"] )
def update_vendor_preferences( vendor_id: str, payload: dict, database: Session = Depends(db.get_db) ):
    vendor = ( database.query(db.Vendor) .filter(db.Vendor.vendor_id == vendor_id) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    settings = ( database.query(db.VendorSettings) .filter( db.VendorSettings.vendor_id == vendor_id ) .first() )

    if not settings:
        settings = db.VendorSettings( vendor_id=vendor_id )
        database.add(settings)

    allowed_fields = [ "language", "timezone", "date_format", "currency" ]

    for field in allowed_fields:
        if field in payload:
            setattr( settings, field, payload[field] )

    database.commit()
    database.refresh(settings)

    return {
        "success": True,
        "message": "Preferences updated successfully",
        "vendor_id": vendor_id
    }


# ============================================================
# DELETE VENDOR ACCOUNT
# ============================================================

@app.delete( "/api/vendor/account/{vendor_id}", tags=["Vendor Dashboard"] )
def delete_vendor_account( vendor_id: str, database: Session = Depends(db.get_db) ):
    vendor = ( database.query(db.Vendor) .filter(db.Vendor.vendor_id == vendor_id) .first() )

    if not vendor:
        raise HTTPException( status_code=404, detail="Vendor not found" )

    try:
        database.delete(vendor)
        database.commit()

    except Exception as exc:
        database.rollback()

        raise HTTPException( status_code=500, detail=f"Unable to delete vendor account: {str(exc)}" )

    return { "success": True, "message": "Vendor account deleted successfully", "vendor_id": vendor_id }


# ==========================================================
# VENDOR HELP & SUPPORT DASHBOARD
# ==========================================================

@app.get(
    "/api/vendor/support/dashboard/{vendor_id}",
    tags=["Vendor Dashboard"]
)
def get_vendor_support_dashboard(
    vendor_id: str,
    current_vendor: db.Vendor = Depends(
        crud.get_current_vendor
    ),
    database: Session = Depends(
        db.get_db
    )
):

    # Security check
    if current_vendor.vendor_id != vendor_id:

        raise HTTPException(
            status_code=403,
            detail="You are not authorized to access this vendor dashboard."
        )

    vendor = (
        database.query(db.Vendor)
        .filter(
            db.Vendor.vendor_id == vendor_id
        )
        .first()
    )

    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    categories = [
        {
            "name": "Getting Started",
            "description": "Learn how to use the vendor portal.",
            "icon": "🚀"
        },
        {
            "name": "Account & Profile",
            "description": "Manage your vendor account and profile.",
            "icon": "👤"
        },
        {
            "name": "Orders & Operations",
            "description": "Get help with purchase orders and operations.",
            "icon": "📦"
        },
        {
            "name": "Invoices & Payments",
            "description": "Find answers about invoices and payments.",
            "icon": "💳"
        },
        {
            "name": "Compliance & Documents",
            "description": "Manage compliance and required documents.",
            "icon": "✓"
        },
        {
            "name": "Performance",
            "description": "Understand vendor performance metrics.",
            "icon": "📊"
        }
    ]

    articles = [
        {
            "id": 1,
            "title": "How to update your vendor profile",
            "category": "Account & Profile",
            "icon": "👤",
            "views": 1250,
            "helpful_percent": 95
        },
        {
            "id": 2,
            "title": "How to view purchase orders",
            "category": "Orders & Operations",
            "icon": "📦",
            "views": 980,
            "helpful_percent": 92
        },
        {
            "id": 3,
            "title": "How to submit an invoice",
            "category": "Invoices & Payments",
            "icon": "💳",
            "views": 1500,
            "helpful_percent": 97
        }
    ]

    contacts = [
        {
            "contact_type": "ticket",
            "title": "Submit a Support Ticket",
            "value": "Raise a ticket with our support team",
            "description": ""
        },
        {
            "contact_type": "chat",
            "title": "Live Chat",
            "value": "Chat with our support executive",
            "description": "Online"
        },
        {
            "contact_type": "phone",
            "title": "Call Us",
            "value": "+91 9876543210",
            "description": "Mon - Fri, 9 AM - 6 PM IST"
        },
        {
            "contact_type": "email",
            "title": "Email Us",
            "value": "support@vendorirq.com",
            "description": "We typically reply within 24 hours"
        }
    ]

    return {
        "vendor_id": vendor.vendor_id,
        "categories": categories,
        "articles": articles,
        "contacts": contacts
    }


@app.get( "/api/vendor/support/articles", response_model=list[db.SupportArticleResponse], tags=["Vendor Dashboard"] )
def search_support_articles( search: Optional[str] = None, category: Optional[str] = None, database: Session = Depends(db.get_db) ):

    query = ( database.query(db.SupportArticle) .filter( db.SupportArticle.is_active == True ) )

    if search:
        pattern = f"%{search.strip()}%"

        query = query.filter(
            or_(
                db.SupportArticle.title.ilike(pattern),
                db.SupportArticle.summary.ilike(pattern),
                db.SupportArticle.content.ilike(pattern)
            )
        )

    if category and category != "All":
        query = query.filter( db.SupportArticle.category == category )

    return ( query .order_by( db.SupportArticle.views.desc(), db.SupportArticle.display_order.asc() ) .all() )


@app.get( "/api/vendor/support/articles/{article_id}", tags=["Vendor Dashboard"] )
def get_support_article( article_id: int, database: Session = Depends(db.get_db) ):

    article = ( database.query(db.SupportArticle) .filter(
            db.SupportArticle.id == article_id,
            db.SupportArticle.is_active == True
        ) .first()
    )

    if not article:
        raise HTTPException( status_code=404, detail="Article not found" )

    article.views = (article.views or 0) + 1

    database.commit()
    database.refresh(article)

    total_votes = ( (article.helpful_yes or 0) + (article.helpful_no or 0) )

    helpful_percent = (
        round( article.helpful_yes / total_votes * 100 )
        if total_votes > 0
        else 0
    )

    return {
        "id": article.id,
        "title": article.title,
        "slug": article.slug,
        "summary": article.summary,
        "content": article.content,
        "category": article.category,
        "views": article.views,
        "helpful_yes": article.helpful_yes,
        "helpful_no": article.helpful_no,
        "helpful_percent": helpful_percent
    }


@app.post( "/api/vendor/support/articles/{article_id}/helpful", tags=["Vendor Dashboard"] )
def article_helpful_vote( article_id: int, helpful: bool, database: Session = Depends(db.get_db) ):

    article = ( database.query(db.SupportArticle) .filter( db.SupportArticle.id == article_id ) .first() )

    if not article:
        raise HTTPException( status_code=404, detail="Article not found" )

    if helpful:
        article.helpful_yes += 1
    else:
        article.helpful_no += 1

    database.commit()

    return { "success": True, "message": "Thank you for your feedback" }


@app.post( "/api/vendor/support/callback", response_model=db.SupportCallbackResponse, status_code=201, tags=["Vendor Dashboard"] )
def request_support_callback( callback_data: db.SupportCallbackCreate, database: Session = Depends(db.get_db) ):

    callback = db.SupportCallback(
        vendor_id=callback_data.vendor_id,
        name=callback_data.name,
        phone=callback_data.phone,
        preferred_date=callback_data.preferred_date,
        preferred_time=callback_data.preferred_time,
        notes=callback_data.notes,
        status="Pending"
    )

    database.add(callback)
    database.commit()
    database.refresh(callback)

    return callback


@app.get( "/api/vendor/support/status", tags=["Vendor Dashboard"] )
def get_support_system_status( database: Session = Depends(db.get_db) ):

    services = ( database.query(db.SupportServiceStatus) .order_by( db.SupportServiceStatus.service_name.asc() ) .all() )

    return {
        "overall_status": (
            "Operational"
            if all(
                item.status == "Operational"
                for item in services
            )
            else "Degraded"
        ),

        "services": [
            {
                "name": item.service_name,
                "status": item.status,
                "message": item.message,
                "checked_at": (
                    item.checked_at.isoformat()
                    if item.checked_at
                    else None
                )
            }
            for item in services
        ]
    }


# ============================================================
# PURCHASE ORDER CRUD
# ============================================================

@app.post( "/api/purchase-orders", tags=["Purchase Orders"] )
def create_purchase_order(

    purchase_order: db.PurchaseOrderCreate,

    database: Session = Depends(db.get_db),

    current_user: db.User = Depends(
        crud.require_procurement_or_supply_chain_manager
    ),

):
    return crud.create_purchase_order(

        database,

        purchase_order,

        current_user

    )


@app.get("/api/purchase-orders", tags=["Purchase Orders"])
def get_purchase_orders( database: Session = Depends(db.get_db), current_user: db.User = Depends( crud.require_admin_or_procurement_manager ), ):
    return crud.get_purchase_orders(database)


@app.get("/api/purchase-orders/{po_id}", tags=["Purchase Orders"])
def get_purchase_order( po_id: int, database: Session = Depends(db.get_db), current_user: db.User = Depends( crud.require_authenticated_user ), ):
    purchase_order = crud.get_purchase_order( database, po_id, )

    if purchase_order is None:
        raise HTTPException( status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found.", )

    return purchase_order


@app.put("/api/purchase-orders/{po_id}", tags=["Purchase Orders"])
def update_purchase_order( po_id: int, purchase_order: db.PurchaseOrderCreate, database: Session = Depends(db.get_db), current_user: db.User = Depends( crud.require_procurement_manager ), ):
    updated = crud.update_purchase_order( database, po_id, purchase_order, )

    if updated is None:
        raise HTTPException( status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found.", )

    return updated


@app.delete("/api/purchase-orders/{po_id}", tags=["Purchase Orders"])
def delete_purchase_order(
    po_id: int, database: Session = Depends(db.get_db), current_user: db.User = Depends( crud.require_procurement_manager ), ):
    deleted = crud.delete_purchase_order( database, po_id, )

    if deleted is None:
        raise HTTPException( status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found.", )

    return { "success": True, "message": "Purchase order deleted successfully.", }


# ============================================================
# CONTRACT CRUD
# ============================================================

@app.post("/api/contracts", tags=["Contracts"])
def create_contract(
    contract: db.ContractCreate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_procurement_manager
    ),
):
    return crud.create_contract(
        database,
        contract,
    )


@app.get("/api/contracts", tags=["Contracts"])
def get_contracts(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_authenticated_user
    ),
):
    return crud.get_contracts(database)


@app.get("/api/contracts/{contract_id}", tags=["Contracts"])
def get_contract(
    contract_id: int,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_authenticated_user
    ),
):
    contract = crud.get_contract(
        database,
        contract_id,
    )

    if contract is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found.",
        )

    return contract


@app.put("/api/contracts/{contract_id}", tags=["Contracts"])
def update_contract(
    contract_id: int,
    contract: db.ContractCreate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_procurement_manager
    ),
):
    updated = crud.update_contract(
        database,
        contract_id,
        contract,
    )

    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found.",
        )

    return updated


@app.delete("/api/contracts/{contract_id}", tags=["Contracts"])
def delete_contract(
    contract_id: int,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_admin
    ),
):
    deleted = crud.delete_contract(
        database,
        contract_id,
    )

    if deleted is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found.",
        )

    return {
        "success": True,
        "message": "Contract deleted successfully.",
    }


# ============================================================
# INVOICE CRUD
# ============================================================

@app.post("/api/invoices", tags=["Invoices"])
def create_invoice(
    invoice: db.InvoiceCreate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_procurement_manager
    ),
):
    return crud.create_invoice(
        database,
        invoice,
    )


@app.get("/api/invoice", tags=["Invoices"])
def get_invoices(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_authenticated_user
    ),
):
    return crud.get_invoices(database)


@app.get("/api/invoices/{invoice_id}", tags=["Invoices"])
def get_invoice(
    invoice_id: int,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_authenticated_user
    ),
):
    invoice = crud.get_invoice(
        database,
        invoice_id,
    )

    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found.",
        )

    return invoice


@app.put("/api/invoices/{invoice_id}", tags=["Invoices"])
def update_invoice(
    invoice_id: int,
    invoice: db.InvoiceCreate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_procurement_manager
    ),
):
    updated = crud.update_invoice(
        database,
        invoice_id,
        invoice,
    )

    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found.",
        )

    return updated


@app.delete("/api/invoices/{invoice_id}", tags=["Invoices"])
def delete_invoice(
    invoice_id: int,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_admin
    ),
):
    deleted = crud.delete_invoice(
        database,
        invoice_id,
    )

    if deleted is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found.",
        )

    return {
        "success": True,
        "message": "Invoice deleted successfully.",
    }


# ============================================================
# LEGACY DASHBOARD COMPATIBILITY ENDPOINTS
# ============================================================

@app.get("/invoices", tags=["Invoices"])
def legacy_invoices(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_authenticated_user),
):
    return crud.get_invoices(database)


@app.get("/compliance", tags=["Compilance"])
def legacy_compliance(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(crud.require_authenticated_user),
):
    return crud.compliance_dashboard(database)


# ============================================================
# SYSTEM ACTIVITY CRUD
# ============================================================

@app.post("/api/activity", tags=["System Activity"])
def create_activity(
    activity: db.ActivityCreate,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_admin
    ),
):
    return crud.create_activity(
        database,
        activity,
    )


@app.get("/api/activity", tags=["System Activity"])
def get_activities(
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_admin
    ),
):
    return crud.get_activities(database)


@app.get("/api/activity/{activity_id}", tags=["System Activity"])
def get_activity(
    activity_id: int,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_admin
    ),
):
    activity = crud.get_activity(
        database,
        activity_id,
    )

    if activity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found.",
        )

    return activity


@app.delete("/api/activity/{activity_id}", tags=["System Activity"])
def delete_activity(
    activity_id: int,
    database: Session = Depends(db.get_db),
    current_user: db.User = Depends(
        crud.require_admin
    ),
):
    deleted = crud.delete_activity(
        database,
        activity_id,
    )

    if deleted is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found.",
        )

    return {
        "success": True,
        "message": "Activity deleted successfully.",
    }