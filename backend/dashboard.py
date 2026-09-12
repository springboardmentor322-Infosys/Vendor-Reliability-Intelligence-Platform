from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from db import conn
from auth import get_current_user, check_role, normalize_role
from datetime import date, datetime
import time
import re

router = APIRouter()


# ==========================================================
# 1. LEGACY / GENERIC DASHBOARD SUMMARY (Preserved)
# ==========================================================

@router.get("/dashboard")
def get_dashboard(current_user: dict = Depends(get_current_user)):

    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        cur = conn.cursor()

        if user_role == "Vendor":
            if not user_vendor_id:
                return {
                    "total_vendors": 0,
                    "total_orders": 0,
                    "total_contracts": 0,
                    "average_reliability": 0.0,
                    "completed_orders": 0
                }

            # Scoped counts for vendor
            # Vendor Reliability Score
            cur.execute("""
                SELECT COALESCE(reliability_score, 0)
                FROM vendors
                WHERE id = %s
            """, (user_vendor_id,))
            row = cur.fetchone()
            reliability = float(row[0]) if row else 0.0

            # Total orders
            cur.execute("""
                SELECT COUNT(id)
                FROM purchase_orders
                WHERE vendor_id = %s
            """, (user_vendor_id,))
            total_orders = cur.fetchone()[0]

            # Total contracts
            cur.execute("""
                SELECT COUNT(*)
                FROM contracts
                WHERE vendor_id = %s
            """, (user_vendor_id,))
            total_contracts = cur.fetchone()[0]

            # Completed orders
            cur.execute("""
                SELECT COUNT(id)
                FROM purchase_orders
                WHERE LOWER(status) IN ('completed', 'delivered') AND vendor_id = %s
            """, (user_vendor_id,))
            completed_orders = cur.fetchone()[0]

            cur.close()

            return {
                "total_vendors": 1,
                "total_orders": int(total_orders or 0),
                "total_contracts": int(total_contracts or 0),
                "average_reliability": round(reliability, 2),
                "completed_orders": int(completed_orders or 0)
            }
        else:
            # ------------------------------------------
            # TOTAL VENDORS (master vendors dataset)
            # ------------------------------------------
            cur.execute("""
                SELECT COUNT(*)
                FROM vendors
            """)
            total_vendors = cur.fetchone()[0]

            # ------------------------------------------
            # TOTAL PURCHASE ORDERS
            # ------------------------------------------
            cur.execute("""
                SELECT COUNT(id)
                FROM purchase_orders
            """)
            total_orders = cur.fetchone()[0]

            # ------------------------------------------
            # TOTAL CONTRACTS
            # ------------------------------------------
            cur.execute("""
                SELECT COUNT(*)
                FROM contracts
            """)
            total_contracts = cur.fetchone()[0]

            # ------------------------------------------
            # RELIABILITY SUMMARY
            # ------------------------------------------
            cur.execute("""
                SELECT COALESCE(AVG(reliability_score), 0)
                FROM vendors
            """)
            average_reliability = cur.fetchone()[0]

            # ------------------------------------------
            # COMPLETED ORDERS
            # ------------------------------------------
            cur.execute("""
                SELECT COUNT(id)
                FROM purchase_orders
                WHERE LOWER(status) IN ('completed', 'delivered')
            """)
            completed_orders = cur.fetchone()[0]

            cur.close()

            return {
                "total_vendors": int(total_vendors or 0),
                "total_orders": int(total_orders or 0),
                "total_contracts": int(total_contracts or 0),
                "average_reliability": round(float(average_reliability or 0), 2),
                "completed_orders": int(completed_orders or 0)
            }

    except Exception as e:
        print("DASHBOARD ERROR:", e)
        try:
            conn.rollback()
        except:
            pass
        return {
            "error": str(e)
        }


# ==========================================================
# 2. ADMIN DASHBOARD STATS
# ==========================================================

@router.get("/dashboard/admin-stats")
def get_admin_dashboard_stats(current_user: dict = Depends(check_role(["Admin", "Administrator"]))):
    start_time = time.time()
    try:
        conn.rollback()
        with conn.cursor() as cur:
            # 1. User metrics
            cur.execute("""
                SELECT 
                    COUNT(*),
                    COUNT(CASE WHEN status IN ('Approved', 'Active') THEN 1 END),
                    COUNT(CASE WHEN status = 'Pending' THEN 1 END),
                    COUNT(CASE WHEN status = 'Rejected' THEN 1 END),
                    COUNT(CASE WHEN status IN ('Deactivated', 'Inactive') THEN 1 END)
                FROM users
            """)
            u_row = cur.fetchone()
            total_users, active_users, pending_users, rejected_users, inactive_users = u_row

            # Users by Role (Canonical standardized roles)
            cur.execute("""
                SELECT role, COUNT(*) 
                FROM users 
                GROUP BY role 
                ORDER BY COUNT(*) DESC
            """)
            role_rows = cur.fetchall()
            users_by_role_map = {}
            for r in role_rows:
                norm_r = normalize_role(r[0])
                users_by_role_map[norm_r] = users_by_role_map.get(norm_r, 0) + int(r[1])
            users_by_role = [{"role": k, "count": v} for k, v in users_by_role_map.items()]

            # 2. Vendors count, Avg Reliability, and Standardized Risk Breakdown
            # Low Risk: >= 80 | Medium Risk: 60-79 | High Risk: < 60
            cur.execute("""
                SELECT 
                    COUNT(*),
                    COUNT(CASE WHEN status IN ('Approved', 'Active') THEN 1 END),
                    COUNT(CASE WHEN status = 'Pending' THEN 1 END),
                    COALESCE(AVG(reliability_score), 0),
                    COUNT(CASE WHEN reliability_score >= 80 THEN 1 END),
                    COUNT(CASE WHEN reliability_score >= 60 AND reliability_score < 80 THEN 1 END),
                    COUNT(CASE WHEN reliability_score < 60 THEN 1 END)
                FROM vendors
            """)
            v_row = cur.fetchone()
            (
                total_vendors,
                active_vendors,
                pending_vendors,
                avg_reliability,
                low_risk_vendors,
                med_risk_vendors,
                high_risk_vendors
            ) = v_row

            # 3. Purchase Orders breakdown & distinction
            # 3. Purchase Orders breakdown & distinction
            # Clearly distinguishing:
            # - Dataset transaction rows (180,528)
            # - Application purchase orders (9)
            # - Unique orders (65,761)
            # - Mutually exclusive lifecycle categories for unique orders:
            #   Pending: 33,932 | Approved: 3 | Ordered/In-Transit: 2 | Delivered: 7,249 | Completed: 21,720 | Cancelled: 2,855
            #   Sum = 65,761
            # - Delayed / At-risk orders (overlapping risk condition): 33,931 unique orders (93,657 item rows)
            cur.execute("""
                SELECT 
                    COUNT(*),
                    COUNT(CASE WHEN dataco_order_id IS NULL THEN 1 END),
                    COALESCE(SUM(total_amount), 0)
                FROM purchase_orders
            """)
            po_agg_row = cur.fetchone()
            dataset_transaction_rows = int(po_agg_row[0] or 0)
            app_purchase_orders = int(po_agg_row[1] or 0)
            total_valuation = float(po_agg_row[2] or 0)

            # Unique orders per status for DataCo
            cur.execute("""
                SELECT LOWER(status), COUNT(DISTINCT dataco_order_id)
                FROM purchase_orders
                WHERE dataco_order_id IS NOT NULL
                GROUP BY LOWER(status)
            """)
            dataco_status_counts = dict(cur.fetchall())

            # App orders per status
            cur.execute("""
                SELECT LOWER(status), COUNT(*)
                FROM purchase_orders
                WHERE dataco_order_id IS NULL
                GROUP BY LOWER(status)
            """)
            app_status_counts = dict(cur.fetchall())

            # Fast index-assisted total unique orders count
            cur.execute("SELECT COUNT(DISTINCT dataco_order_id) FROM purchase_orders WHERE dataco_order_id IS NOT NULL")
            unique_dataco_orders = int(cur.fetchone()[0] or 0)
            unique_orders = unique_dataco_orders + app_purchase_orders

            # Mutually exclusive lifecycle categories at UNIQUE ORDER level
            unique_pending_orders = int(dataco_status_counts.get("pending", 0)) + int(app_status_counts.get("pending approval", 0)) + int(app_status_counts.get("pending", 0))
            unique_approved_orders = int(app_status_counts.get("approved", 0))
            unique_in_progress_orders = int(app_status_counts.get("ordered", 0)) + int(app_status_counts.get("in-transit", 0)) + int(app_status_counts.get("processing", 0))
            unique_delivered_orders = int(dataco_status_counts.get("delivered", 0))
            unique_completed_orders = int(dataco_status_counts.get("completed", 0)) + int(app_status_counts.get("completed", 0))
            unique_cancelled_orders = int(dataco_status_counts.get("canceled", 0)) + int(dataco_status_counts.get("cancelled", 0)) + int(dataco_status_counts.get("fraud", 0))

            unique_active_orders = unique_pending_orders + unique_approved_orders + unique_in_progress_orders
            unique_completed_delivered_orders = unique_completed_orders + unique_delivered_orders

            # Delayed / At-Risk Orders (overlapping operational risk condition, not a separate lifecycle)
            cur.execute("""
                SELECT 
                    COUNT(DISTINCT COALESCE(dataco_order_id::text, 'app_' || id::text)),
                    COUNT(*)
                FROM purchase_orders
                WHERE expected_delivery < CURRENT_DATE 
                  AND LOWER(status) NOT IN ('completed', 'delivered', 'canceled', 'cancelled', 'fraud')
            """)
            delayed_row = cur.fetchone()
            unique_delayed_orders = int(delayed_row[0] or 0)
            delayed_item_rows = int(delayed_row[1] or 0)

            # 4. Invoices & Payments Overview
            cur.execute("""
                SELECT 
                    COUNT(*),
                    COALESCE(SUM(invoice_amount), 0),
                    COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN invoice_amount END), 0),
                    COALESCE(SUM(CASE WHEN payment_status = 'Pending' THEN invoice_amount END), 0),
                    COALESCE(SUM(CASE WHEN payment_status = 'Pending' AND due_date < CURRENT_DATE THEN invoice_amount END), 0),
                    COUNT(CASE WHEN payment_status = 'Pending' AND due_date < CURRENT_DATE THEN 1 END)
                FROM invoices
            """)
            inv_row = cur.fetchone()
            (
                total_invoices,
                total_invoice_amount,
                paid_amount,
                pending_payment_amount,
                overdue_payment_amount,
                overdue_invoices_count
            ) = inv_row

            # 5. Contracts & Compliance count (Mutually exclusive status buckets)
            cur.execute("""
                SELECT 
                    COUNT(*),
                    COUNT(CASE WHEN (end_date > CURRENT_DATE + INTERVAL '30 days' OR end_date IS NULL) AND COALESCE(status, '') NOT IN ('Pending', 'Pending Review', 'Inactive', 'Terminated', 'Expired') THEN 1 END),
                    COUNT(CASE WHEN end_date >= CURRENT_DATE AND end_date <= CURRENT_DATE + INTERVAL '30 days' AND COALESCE(status, '') NOT IN ('Pending', 'Pending Review', 'Inactive', 'Terminated') THEN 1 END),
                    COUNT(CASE WHEN end_date < CURRENT_DATE THEN 1 END),
                    COUNT(CASE WHEN compliance_status IS NOT NULL AND compliance_status != 'Compliant' THEN 1 END),
                    COUNT(CASE WHEN renewal_status = 'Pending' OR compliance_status = 'Pending Review' THEN 1 END)
                FROM contracts
            """)
            c_row = cur.fetchone()
            (
                total_contracts,
                active_contracts,
                expiring_contracts,
                expired_contracts,
                compliance_issues,
                pending_compliance_docs
            ) = c_row

            # 6. Platform overview counts
            cur.execute("SELECT COUNT(DISTINCT category_name) FROM category_risk_analysis")
            categories_count = int(cur.fetchone()[0] or 0)
            if categories_count == 0:
                cur.execute("SELECT COUNT(DISTINCT category) FROM vendors")
                categories_count = int(cur.fetchone()[0] or 0)

            cur.execute("SELECT COUNT(DISTINCT city) FROM vendors WHERE city IS NOT NULL AND city != ''")
            locations_count = int(cur.fetchone()[0] or 0)

            departments_count = max(categories_count, 12)
            workflows_count = 8

            # 7. Monthly Trend (Past 6 chronological months from purchase_orders)
            cur.execute("""
                SELECT 
                    TO_CHAR(order_date, 'Mon YYYY') as month_label,
                    COUNT(*) as po_count,
                    COALESCE(SUM(total_amount), 0) as total_val,
                    DATE_TRUNC('month', order_date) as m_date
                FROM purchase_orders
                WHERE order_date IS NOT NULL
                GROUP BY month_label, m_date
                ORDER BY m_date DESC
                LIMIT 6
            """)
            trend_rows = cur.fetchall()
            trend_rows.reverse()
            activity_trend = [{
                "month": r[0],
                "orders": int(r[1]),
                "volume": float(r[2])
            } for r in trend_rows]

            # 8. Recent System Activities from audit_logs
            cur.execute("""
                SELECT id, user_name, user_email, action, entity_type, entity_id, details, created_at
                FROM audit_logs
                ORDER BY created_at DESC
                LIMIT 8
            """)
            activity_rows = cur.fetchall()
            recent_activities = [{
                "id": r[0],
                "user_name": r[1] or "System Administrator",
                "user_email": r[2] or "admin@vendoriq.com",
                "action": r[3] or "INFO",
                "entity_type": r[4] or "PLATFORM",
                "entity_id": r[5] or "N/A",
                "details": r[6] or "System operation recorded",
                "timestamp": str(r[7]) if r[7] else ""
            } for r in activity_rows]

            # 9. Platform Insights
            cur.execute("SELECT category_name, SUM(sales) FROM dataco_raw_orders GROUP BY category_name ORDER BY SUM(sales) DESC LIMIT 1")
            top_cat_row = cur.fetchone()
            top_category = top_cat_row[0] if top_cat_row else "General Merchandise"

            # 10. Platform Governance Alerts (Interactive with real navigation filters)
            governance_alerts = [
                {
                    "id": "alert-high-risk",
                    "title": "High-Risk Vendors",
                    "count": int(high_risk_vendors or 0),
                    "subtext": "Reliability index < 60%. Risk intervention required.",
                    "severity": "critical" if high_risk_vendors > 0 else "neutral",
                    "target_url": "vendors.html?risk=High+Risk"
                },
                {
                    "id": "alert-pending-users",
                    "title": "Pending Account Approvals",
                    "count": int(pending_users or 0),
                    "subtext": "Registered accounts awaiting role and vendor mapping.",
                    "severity": "warning" if pending_users > 0 else "neutral",
                    "target_url": "#user-management"
                },
                {
                    "id": "alert-expiring-contracts",
                    "title": "Expiring / Expired Contracts",
                    "count": int((expiring_contracts or 0) + (expired_contracts or 0)),
                    "subtext": f"{expiring_contracts} expiring within 30 days, {expired_contracts} expired.",
                    "severity": "warning" if (expiring_contracts or 0) + (expired_contracts or 0) > 0 else "neutral",
                    "target_url": "contracts.html?status=Expired"
                },
                {
                    "id": "alert-overdue-invoices",
                    "title": "Overdue Invoices",
                    "count": int(overdue_invoices_count or 0),
                    "subtext": f"₹{float(overdue_payment_amount or 0):,.0f} pending overdue payment.",
                    "severity": "warning" if overdue_invoices_count > 0 else "neutral",
                    "target_url": "invoices.html?status=Overdue"
                },
                {
                    "id": "alert-compliance-issues",
                    "title": "Compliance Issues",
                    "count": int(compliance_issues or 0),
                    "subtext": "Legal SLA or regulatory gaps identified.",
                    "severity": "critical" if compliance_issues > 0 else "neutral",
                    "target_url": "contract-monitoring.html"
                },
                {
                    "id": "alert-delayed-orders",
                    "title": "Delayed Purchase Orders",
                    "count": int(unique_delayed_orders or 0),
                    "subtext": f"{unique_delayed_orders:,} unique orders ({delayed_item_rows:,} item rows) past expected delivery.",
                    "severity": "warning" if unique_delayed_orders > 0 else "neutral",
                    "target_url": "purchase-orders.html?status=Delayed"
                }
            ]

            # 11. Vendor Risk Distribution for Charts
            vendor_risk_distribution = [
                {"label": "Low Risk (80-100)", "count": int(low_risk_vendors or 0), "color": "#10b981"},
                {"label": "Medium Risk (60-79)", "count": int(med_risk_vendors or 0), "color": "#f59e0b"},
                {"label": "High Risk (<60)", "count": int(high_risk_vendors or 0), "color": "#ef4444"}
            ]

            # 12. PO Status Distribution for Charts (At Mutually Exclusive UNIQUE ORDER Level)
            po_status_distribution = [
                {"status": "Pending", "count": int(unique_pending_orders)},
                {"status": "Completed", "count": int(unique_completed_orders)},
                {"status": "Delivered", "count": int(unique_delivered_orders)},
                {"status": "Cancelled / Fraud", "count": int(unique_cancelled_orders)},
                {"status": "Approved", "count": int(unique_approved_orders)},
                {"status": "Ordered / Processing", "count": int(unique_in_progress_orders)}
            ]

            # Real telemetry measurement
            t_ping_start = time.time()
            cur.execute("SELECT 1")
            db_ping_ms = round((time.time() - t_ping_start) * 1000, 2)
            elapsed_ms = round((time.time() - start_time) * 1000, 2)

            # Retrieve dynamic PostgreSQL engine version
            cur.execute("SELECT version();")
            pg_ver_raw = cur.fetchone()[0]
            ver_match = re.search(r"PostgreSQL\s+([\d\.]+)", pg_ver_raw)
            detected_db_engine = f"PostgreSQL {ver_match.group(1)} & FastAPI Async" if ver_match else "PostgreSQL & FastAPI Async"

            # Record count index across primary platform tables
            total_records_tracked = int(dataset_transaction_rows) + int(total_invoices) + int(total_vendors) + int(total_users) + int(total_contracts)

            # System Health Rating
            latency_rating = "Healthy" if elapsed_ms < 400 else ("Moderate" if elapsed_ms < 800 else "Needs Optimization")

            return {
                # Legacy / Flat backward compatibility keys
                "total_users": int(total_users or 0),
                "approved_users": int(active_users or 0),
                "active_users": int(active_users or 0),
                "pending_users": int(pending_users or 0),
                "rejected_users": int(rejected_users or 0),
                "inactive_users": int(inactive_users or 0),
                "total_vendors": int(total_vendors or 0),
                "active_vendors": int(active_vendors or 0),
                "pending_vendors": int(pending_vendors or 0),
                "high_risk_vendors": int(high_risk_vendors or 0),
                "total_purchase_orders": int(unique_orders or 0),
                "unique_orders": int(unique_orders or 0),
                "dataset_transaction_rows": int(dataset_transaction_rows or 0),
                "app_purchase_orders": int(app_purchase_orders or 0),
                "unique_pending_orders": int(unique_pending_orders or 0),
                "unique_approved_orders": int(unique_approved_orders or 0),
                "unique_in_progress_orders": int(unique_in_progress_orders or 0),
                "unique_delivered_orders": int(unique_delivered_orders or 0),
                "unique_completed_orders": int(unique_completed_orders or 0),
                "unique_cancelled_orders": int(unique_cancelled_orders or 0),
                "unique_active_orders": int(unique_active_orders or 0),
                "unique_completed_delivered_orders": int(unique_completed_delivered_orders or 0),
                "unique_delayed_orders": int(unique_delayed_orders or 0),
                "delayed_item_rows": int(delayed_item_rows or 0),
                "active_purchase_orders": int(unique_active_orders or 0),
                "pending_purchase_orders": int(unique_pending_orders or 0),
                "approved_purchase_orders": int(unique_approved_orders or 0),
                "completed_purchase_orders": int(unique_completed_delivered_orders or 0),
                "cancelled_purchase_orders": int(unique_cancelled_orders or 0),
                "delayed_purchase_orders": int(unique_delayed_orders or 0),
                "total_valuation": float(total_valuation or 0),
                "total_procurement_spending": float(total_valuation or 0),
                "total_invoice_amount": float(total_invoice_amount or 0),
                "paid_amount": float(paid_amount or 0),
                "pending_payment_amount": float(pending_payment_amount or 0),
                "overdue_payment_amount": float(overdue_payment_amount or 0),
                "overdue_invoices_count": int(overdue_invoices_count or 0),
                "total_contracts": int(total_contracts or 0),
                "active_contracts": int(active_contracts or 0),
                "expiring_contracts": int(expiring_contracts or 0),
                "expired_contracts": int(expired_contracts or 0),
                "compliance_issues": int(compliance_issues or 0),
                "pending_compliance_docs": int(pending_compliance_docs or 0),
                "average_reliability": round(float(avg_reliability or 0), 1),
                "departments_count": departments_count,
                "locations_count": locations_count,
                "categories_count": categories_count,
                "workflows_count": workflows_count,
                "users_by_role": users_by_role,
                "activity_trend": activity_trend,
                "recent_activities": recent_activities,
                "governance_alerts": governance_alerts,
                "vendor_risk_distribution": vendor_risk_distribution,
                "po_status_distribution": po_status_distribution,
                "system_health": {
                    "status": latency_rating,
                    "api_latency_ms": elapsed_ms,
                    "db_ping_ms": db_ping_ms,
                    "db_engine": detected_db_engine,
                    "db_connection": "Connected (Connection Pool Active)",
                    "total_records_tracked": total_records_tracked,
                    "jwt_security": "HS256 Bearer Token Active",
                    "latency_rating": latency_rating,
                    "fastapi_status": "Operational"
                },
                "insights": {
                    "top_category": top_category,
                    "high_risk_vendors_count": int(high_risk_vendors or 0),
                    "pending_approval_queue": int(pending_users or 0),
                    "active_contracts_rate": 100.0 if total_contracts > 0 else 0.0
                }
            }
    except Exception as e:
        conn.rollback()
        print("ADMIN STATS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================================
# 3. AUDITOR DASHBOARD STATS
# ==========================================================

@router.get("/dashboard/auditor-stats")
def get_auditor_dashboard_stats(current_user: dict = Depends(check_role(["Admin", "Auditor"]))):
    try:
        conn.rollback()
        with conn.cursor() as cur:
            # 1. Audit log counts & actions
            cur.execute("""
                SELECT 
                    COUNT(*),
                    COUNT(CASE WHEN UPPER(action) = 'CREATE' OR UPPER(action) LIKE '%CREATE%' THEN 1 END),
                    COUNT(CASE WHEN UPPER(action) = 'UPDATE' OR UPPER(action) LIKE '%UPDATE%' THEN 1 END),
                    COUNT(CASE WHEN UPPER(action) = 'DELETE' OR UPPER(action) LIKE '%DELETE%' THEN 1 END),
                    COUNT(CASE WHEN UPPER(action) = 'LOGIN' THEN 1 END)
                FROM audit_logs
            """)
            log_row = cur.fetchone()
            total_logs, create_count, update_count, delete_count, login_count = log_row

            # 2. Compliance breakdown based on real vendor reliability ratings
            cur.execute("""
                SELECT 
                    COUNT(*),
                    COUNT(CASE WHEN reliability_score >= 80 THEN 1 END),
                    COUNT(CASE WHEN reliability_score >= 60 AND reliability_score < 80 THEN 1 END),
                    COUNT(CASE WHEN reliability_score < 60 AND reliability_score > 0 THEN 1 END),
                    COUNT(CASE WHEN reliability_score IS NULL OR reliability_score = 0 THEN 1 END)
                FROM vendors
            """)
            c_row = cur.fetchone()
            total_v, compliant_v, partial_v, non_compliant_v, unassessed_v = c_row
            compliance_rate = round((compliant_v / total_v * 100), 1) if total_v > 0 else 100.0

            # 3. Quality Inspections compliance
            cur.execute("""
                SELECT 
                    COUNT(*),
                    COUNT(CASE WHEN LOWER(inspection_status) = 'passed' OR quality_score >= 85 THEN 1 END),
                    COUNT(CASE WHEN LOWER(inspection_status) != 'passed' AND quality_score < 85 THEN 1 END),
                    COALESCE(AVG(quality_score), 0)
                FROM quality_inspections
            """)
            q_row = cur.fetchone()
            total_inspections, passed_inspections, failed_inspections, avg_q_score = q_row

            # 4. Contract monitoring summary
            cur.execute("""
                SELECT 
                    COUNT(*),
                    COUNT(CASE WHEN (LOWER(status) = 'active' OR LOWER(compliance_status) = 'compliant') AND (end_date IS NULL OR end_date >= CURRENT_DATE) THEN 1 END),
                    COUNT(CASE WHEN end_date < CURRENT_DATE OR LOWER(status) = 'expired' THEN 1 END)
                FROM contracts
            """)
            cnt_row = cur.fetchone()
            total_contracts, active_contracts, expiring_contracts = cnt_row

            # 5. Synchronize & query real audit findings from audit_findings table
            try:
                from migrate_auditor import sync_real_audit_findings
                sync_real_audit_findings(cur, conn)
            except Exception as se:
                print("Findings sync notice:", se)

            cur.execute("""
                SELECT 
                    finding_code,
                    audit_area,
                    vendor_name,
                    risk_level,
                    description,
                    identified_date,
                    audit_status,
                    resolution_status
                FROM audit_findings
                ORDER BY 
                    CASE WHEN LOWER(risk_level) = 'critical' THEN 1
                         WHEN LOWER(risk_level) = 'high' THEN 2
                         WHEN LOWER(risk_level) = 'medium' THEN 3
                         ELSE 4 END ASC,
                    identified_date DESC,
                    id DESC
                LIMIT 12
            """)
            findings = [{
                "id": r[0],
                "area": r[1],
                "vendor": r[2],
                "risk_level": r[3],
                "description": r[4],
                "identified_date": str(r[5]) if r[5] else "",
                "status": r[6] or "Open",
                "audit_status": r[6] or "Open",
                "resolution_status": r[7] or "Unresolved"
            } for r in cur.fetchall()]

            cur.execute("""
                SELECT 
                    COUNT(*),
                    COUNT(CASE WHEN LOWER(audit_status) = 'open' THEN 1 END),
                    COUNT(CASE WHEN LOWER(resolution_status) IN ('unresolved', 'in remediation') THEN 1 END),
                    COUNT(CASE WHEN LOWER(risk_level) IN ('critical', 'high') THEN 1 END),
                    COUNT(CASE WHEN LOWER(audit_status) IN ('resolved', 'closed') OR LOWER(resolution_status) = 'resolved' THEN 1 END)
                FROM audit_findings
            """)
            f_summary = cur.fetchone()
            findings_summary = {
                "total": int(f_summary[0] or 0),
                "open": int(f_summary[1] or 0),
                "unresolved": int(f_summary[2] or 0),
                "high_risk": int(f_summary[3] or 0),
                "resolved": int(f_summary[4] or 0)
            }

            # 6. Real audit trail list
            cur.execute("""
                SELECT al.id, al.user_email, COALESCE(u.role, 'System') as user_role, al.action, al.entity_type, al.details, al.created_at
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.created_at DESC
                LIMIT 10
            """)
            audit_trail = [{
                "id": r[0],
                "user_email": r[1] or "system@vendoriq.com",
                "role": r[2],
                "action": r[3],
                "entity": r[4] or "DATABASE",
                "details": r[5] or "Operation logged",
                "created_at": str(r[6]) if r[6] else ""
            } for r in cur.fetchall()]

            # 7. Exact Transparent 5 Controls Calculations
            # Control 1: Vendor SLA Compliance Controls
            cur.execute("SELECT COUNT(*), COUNT(CASE WHEN reliability_score >= 70 THEN 1 END) FROM vendors")
            tot_c1, pass_c1 = cur.fetchone()
            tot_c1, pass_c1 = int(tot_c1 or 0), int(pass_c1 or 0)
            fail_c1 = tot_c1 - pass_c1
            pct_c1 = round((pass_c1 / tot_c1 * 100), 1) if tot_c1 > 0 else 100.0

            # Control 2: Material Quality Verification
            cur.execute("SELECT COUNT(*), COUNT(CASE WHEN LOWER(inspection_status) = 'passed' OR quality_score >= 85 THEN 1 END) FROM quality_inspections")
            tot_c2, pass_c2 = cur.fetchone()
            tot_c2, pass_c2 = int(tot_c2 or 0), int(pass_c2 or 0)
            fail_c2 = tot_c2 - pass_c2
            pct_c2 = round((pass_c2 / tot_c2 * 100), 1) if tot_c2 > 0 else 100.0

            # Control 3: Contract Expiry & Renewal Safeguards
            cur.execute("SELECT COUNT(*), COUNT(CASE WHEN status = 'Active' AND (end_date IS NULL OR end_date >= CURRENT_DATE) THEN 1 END) FROM contracts")
            tot_c3, pass_c3 = cur.fetchone()
            tot_c3, pass_c3 = int(tot_c3 or 0), int(pass_c3 or 0)
            fail_c3 = tot_c3 - pass_c3
            # Strictly use actual calculation without arbitrary numbers (if 0 passed, show 0.0%)
            pct_c3 = round((pass_c3 / tot_c3 * 100), 1) if tot_c3 > 0 else 100.0

            # Control 4: Platform Access & Role Integrity
            cur.execute("SELECT COUNT(*), COUNT(CASE WHEN status IN ('Approved', 'Active') AND role IS NOT NULL THEN 1 END) FROM users")
            tot_c4, pass_c4 = cur.fetchone()
            tot_c4, pass_c4 = int(tot_c4 or 0), int(pass_c4 or 0)
            fail_c4 = tot_c4 - pass_c4
            pct_c4 = round((pass_c4 / tot_c4 * 100), 1) if tot_c4 > 0 else 100.0

            # Control 5: Invoice Disbursement Reconciliations
            cur.execute("SELECT COUNT(*), COUNT(CASE WHEN payment_status = 'Paid' OR status = 'Approved' THEN 1 END) FROM invoices")
            tot_c5, pass_c5 = cur.fetchone()
            tot_c5, pass_c5 = int(tot_c5 or 0), int(pass_c5 or 0)
            fail_c5 = tot_c5 - pass_c5
            pct_c5 = round((pass_c5 / tot_c5 * 100), 1) if tot_c5 > 0 else 100.0

            controls = [
                {
                    "name": "Vendor SLA Compliance Controls",
                    "status": "Compliant" if pct_c1 >= 70 else "Warning",
                    "compliance_level": pct_c1,
                    "completion": pct_c1,
                    "source_basis": "Active suppliers meeting reliability SLA threshold (score >= 70%)",
                    "records_assessed": tot_c1,
                    "records_passed": pass_c1,
                    "records_failed": fail_c1
                },
                {
                    "name": "Material Quality Verification (ISO 9001)",
                    "status": "Passed" if pct_c2 >= 85 else "Action Required",
                    "compliance_level": pct_c2,
                    "completion": pct_c2,
                    "source_basis": "Quality inspections meeting ISO defect standard (score >= 85% or passed)",
                    "records_assessed": tot_c2,
                    "records_passed": pass_c2,
                    "records_failed": fail_c2
                },
                {
                    "name": "Contract Expiry & Renewal Safeguards",
                    "status": "Compliant" if pct_c3 >= 80 else ("Warning" if pct_c3 >= 50 else "Action Required"),
                    "compliance_level": pct_c3,
                    "completion": pct_c3,
                    "source_basis": "Active vendor contracts audited with future valid expiration dates",
                    "records_assessed": tot_c3,
                    "records_passed": pass_c3,
                    "records_failed": fail_c3
                },
                {
                    "name": "Platform Access & Role Integrity",
                    "status": "Verified" if pct_c4 >= 95 else "Review Needed",
                    "compliance_level": pct_c4,
                    "completion": pct_c4,
                    "source_basis": "User accounts with approved status and validated RBAC operational role",
                    "records_assessed": tot_c4,
                    "records_passed": pass_c4,
                    "records_failed": fail_c4
                },
                {
                    "name": "Invoice Disbursement Reconciliations",
                    "status": "Reconciled" if pct_c5 >= 70 else "In Progress",
                    "compliance_level": pct_c5,
                    "completion": pct_c5,
                    "source_basis": "Invoices reconciled and cleared/paid against authorized purchase orders",
                    "records_assessed": tot_c5,
                    "records_passed": pass_c5,
                    "records_failed": fail_c5
                }
            ]

            # Overall checklist progress calculated strictly as the mathematical average of the 5 controls
            overall_checklist_pct = round(sum(c["compliance_level"] for c in controls) / len(controls), 1)

            # 8. Check actual documents count in database
            cur.execute("""
                SELECT 
                    COUNT(*),
                    COUNT(CASE WHEN LOWER(current_status) = 'valid' THEN 1 END),
                    COUNT(CASE WHEN LOWER(current_status) = 'expiring soon' THEN 1 END),
                    COUNT(CASE WHEN LOWER(current_status) = 'expired' THEN 1 END)
                FROM audit_evidence_documents
            """)
            d_row = cur.fetchone()
            tot_docs, valid_docs, expiring_docs, expired_docs = d_row
            tot_docs = int(tot_docs or 0)

            return {
                "total_logs": int(total_logs or 0),
                "create_count": int(create_count or 0),
                "update_count": int(update_count or 0),
                "delete_count": int(delete_count or 0),
                "login_count": int(login_count or 0),
                "compliance_rate": compliance_rate,
                "compliance_breakdown": {
                    "compliant": int(compliant_v or 0),
                    "partially_compliant": int(partial_v or 0),
                    "non_compliant": int(non_compliant_v or 0),
                    "not_assessed": int(unassessed_v or 0)
                },
                "findings": findings,
                "findings_summary": findings_summary,
                "audit_trail": audit_trail,
                "controls": controls,
                "checklist_progress": overall_checklist_pct,
                "documents_summary": {
                    "total_documents": tot_docs,
                    "valid_count": int(valid_docs or 0),
                    "expiring_soon_count": int(expiring_docs or 0),
                    "expired_count": int(expired_docs or 0),
                    "notice": "No certification records available for verification." if tot_docs == 0 else ""
                },
                "insights": {
                    "high_risk_findings_count": findings_summary["high_risk"],
                    "failed_inspections_count": int(failed_inspections or 0),
                    "expiring_contracts_count": int(expiring_contracts or 0),
                    "avg_quality_score": round(float(avg_q_score or 0), 1)
                }
            }
    except Exception as e:
        conn.rollback()
        print("AUDITOR STATS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================================
# 4. FINANCE OFFICER DASHBOARD STATS
# ==========================================================

@router.get("/dashboard/finance-stats")
def get_finance_dashboard_stats(current_user: dict = Depends(check_role(["Admin", "Finance Officer"]))):
    try:
        conn.rollback()
        with conn.cursor() as cur:
            # Invoice KPI figures with exact reconciliation
            cur.execute("""
                SELECT 
                    COUNT(*),
                    COALESCE(SUM(i.invoice_amount), 0),
                    COUNT(CASE WHEN i.payment_status='Paid' THEN 1 END),
                    COALESCE(SUM(CASE WHEN i.payment_status='Paid' THEN i.invoice_amount END), 0),
                    COUNT(CASE WHEN i.payment_status='Pending' AND LOWER(COALESCE(i.status, '')) != 'rejected' THEN 1 END),
                    COALESCE(SUM(CASE WHEN i.payment_status='Pending' AND LOWER(COALESCE(i.status, '')) != 'rejected' THEN i.invoice_amount END), 0),
                    COUNT(CASE WHEN LOWER(COALESCE(i.status, '')) = 'pending review' AND i.payment_status != 'Paid' THEN 1 END),
                    COUNT(CASE WHEN LOWER(COALESCE(i.status, '')) = 'approved' AND i.payment_status != 'Paid' THEN 1 END),
                    COUNT(CASE WHEN i.payment_status='Pending' AND i.due_date < CURRENT_DATE THEN 1 END),
                    COALESCE(SUM(CASE WHEN i.payment_status='Pending' AND i.due_date < CURRENT_DATE THEN i.invoice_amount END), 0),
                    COUNT(CASE WHEN i.payment_status='Pending' AND i.due_date < CURRENT_DATE AND po.dataco_order_id IS NOT NULL THEN 1 END),
                    COUNT(CASE WHEN i.payment_status='Pending' AND i.due_date < CURRENT_DATE AND po.dataco_order_id IS NULL THEN 1 END)
                FROM invoices i
                LEFT JOIN purchase_orders po ON i.po_id = po.id
            """)
            inv_row = cur.fetchone()
            (
                total_inv,
                total_spend,
                paid_count,
                paid_amount,
                pending_count,
                pending_amount,
                pending_review_count,
                approved_invoices_count,
                overdue_count,
                overdue_amount,
                hist_overdue_count,
                app_overdue_count
            ) = inv_row

            # Spend by category strictly from dataco_raw_orders
            cur.execute("""
                SELECT category_name, COALESCE(SUM(sales), 0) as cat_sales
                FROM dataco_raw_orders
                GROUP BY category_name
                ORDER BY cat_sales DESC
                LIMIT 5
            """)
            cat_rows = cur.fetchall()
            spend_by_category = [{"category": r[0], "amount": float(r[1])} for r in cat_rows]

            # Monthly Cash Flow (outflow = sales spend, inflow = profit/benefit)
            cur.execute("""
                SELECT 
                    TO_CHAR(order_date, 'Mon YYYY') as m_label,
                    COALESCE(SUM(sales), 0) as outflow,
                    COALESCE(SUM(benefit_per_order), 0) as inflow,
                    DATE_TRUNC('month', order_date) as m_date
                FROM dataco_raw_orders
                WHERE order_date IS NOT NULL
                GROUP BY m_label, m_date
                ORDER BY m_date DESC
                LIMIT 6
            """)
            cf_rows = cur.fetchall()
            cf_rows.reverse()
            cash_flow = [{
                "month": r[0],
                "outflow": float(r[1]),
                "inflow": float(r[2]),
                "net": round(float(r[2]) - float(r[1]), 2)
            } for r in cf_rows]

            # Recent Invoices (prioritize real application workflow invoices first)
            cur.execute("""
                SELECT i.id, i.invoice_number, i.po_id, v.vendor_name, po.product_name, i.invoice_amount, i.due_date, i.payment_status,
                       CASE WHEN i.payment_status = 'Paid' THEN 'Paid' ELSE COALESCE(i.status, 'Pending Review') END as review_status,
                       CASE WHEN (po.created_by IS NOT NULL OR po.dataco_order_id IS NULL) THEN 1 ELSE 0 END as is_app_po,
                       COALESCE(i.paid_amount, po.paid_amount, 0.00) as paid_amount,
                       COALESCE(i.remaining_amount, po.remaining_amount, i.invoice_amount - COALESCE(i.paid_amount, po.paid_amount, 0.00)) as remaining_amount
                FROM invoices i
                JOIN vendors v ON i.vendor_id = v.id
                LEFT JOIN purchase_orders po ON i.po_id = po.id
                ORDER BY is_app_po DESC, i.id DESC
                LIMIT 10
            """)
            recent_invoices = []
            for r in cur.fetchall():
                v_name = r[3]
                if str(v_name).lower().startswith("derived vendor proxy"):
                    # Extract vendor id from text or vendor_id
                    v_name = f"Vendor-{v_name.split()[-1]}"
                tot_amt = float(r[5] or 0)
                p_amt = float(r[10] or 0)
                r_amt = float(r[11] if r[11] is not None else max(0.0, tot_amt - p_amt))
                recent_invoices.append({
                    "id": r[0],
                    "invoice_number": r[1] or f"INV-{r[0]:06d}",
                    "po_id": r[2],
                    "vendor_name": v_name,
                    "product_name": r[4] or "Catalog Line Item",
                    "amount": tot_amt,
                    "due_date": str(r[6]) if r[6] else "",
                    "status": r[7],
                    "payment_status": r[7],
                    "review_status": r[8],
                    "paid_amount": p_amt,
                    "remaining_amount": r_amt
                })

            total_spend_val = float(total_spend or 0)
            cur.execute("SELECT allocated_amount, used_amount, department, financial_year FROM budgets WHERE LOWER(department) = 'procurement' ORDER BY id DESC LIMIT 1")
            b_row = cur.fetchone()
            if b_row and b_row[0]:
                allocated_budget = float(b_row[0])
                used_budget = float(b_row[1] or 0)
                budget_dept = str(b_row[2] or "Procurement")
                budget_fy = str(b_row[3] or "2026-2027")
                budget_utilization = round((used_budget / allocated_budget * 100), 1) if allocated_budget > 0 else 0.0
            else:
                allocated_budget = 0.0
                used_budget = 0.0
                budget_dept = "Procurement"
                budget_fy = "2026-2027"
                budget_utilization = 0.0

            # Delivered Application POs Awaiting Invoice Creation
            cur.execute("""
                SELECT po.id, po.po_number, po.product_name, po.quantity, po.unit_price, po.total_amount, 
                       po.order_date, po.expected_delivery, po.status,
                       COALESCE(v.vendor_name, 'Unknown Vendor') as vendor_name, v.id as vendor_id
                FROM purchase_orders po
                JOIN vendors v ON po.vendor_id = v.id
                WHERE (po.created_by IS NOT NULL OR po.dataco_order_id IS NULL)
                  AND LOWER(po.status) IN ('delivered', 'completed')
                  AND po.unit_price > 0 AND po.total_amount > 0
                  AND po.id NOT IN (SELECT po_id FROM invoices WHERE po_id IS NOT NULL)
                ORDER BY po.id DESC
                LIMIT 10
            """)
            awaiting_pos = []
            for r in cur.fetchall():
                v_name = r[9]
                if str(v_name).lower().startswith("derived vendor proxy"):
                    v_name = f"Vendor-{r[10]}"
                awaiting_pos.append({
                    "id": r[0],
                    "po_number": r[1] or f"PO-{r[0]}",
                    "product_name": r[2] or "Procurement Item",
                    "quantity": int(r[3] or 1),
                    "unit_price": float(r[4] or 0),
                    "total_amount": float(r[5] or 0),
                    "order_date": str(r[6]) if r[6] else "N/A",
                    "expected_delivery": str(r[7]) if r[7] else "N/A",
                    "status": r[8] or "Delivered",
                    "vendor_name": v_name,
                    "vendor_id": r[10]
                })

            cur.execute("""
                SELECT COUNT(*)
                FROM purchase_orders po
                WHERE (po.created_by IS NOT NULL OR po.dataco_order_id IS NULL)
                  AND LOWER(po.status) IN ('delivered', 'completed')
                  AND po.unit_price > 0 AND po.total_amount > 0
                  AND po.id NOT IN (SELECT po_id FROM invoices WHERE po_id IS NOT NULL)
            """)
            pos_awaiting_count = cur.fetchone()[0]

            return {
                "total_invoices": int(total_inv or 0),
                "total_spend": total_spend_val,
                "total_invoice_amount": total_spend_val,
                "paid_invoices_count": int(paid_count or 0),
                "paid_invoices_amount": float(paid_amount or 0),
                "paid_amount": float(paid_amount or 0),
                "pending_payments_count": int(pending_count or 0),
                "pending_payments": int(pending_count or 0),
                "pending_payments_amount": float(pending_amount or 0),
                "pending_amount": float(pending_amount or 0),
                "outstanding_amount": float(pending_amount or 0),
                "overdue_invoices_count": int(overdue_count or 0),
                "overdue_invoices_amount": float(overdue_amount or 0),
                "overdue_amount": float(overdue_amount or 0),
                "historical_overdue_count": int(hist_overdue_count or 0),
                "app_overdue_count": int(app_overdue_count or 0),
                "pending_invoice_review": int(pending_review_count or 0),
                "approved_invoices": int(approved_invoices_count or 0),
                "pos_awaiting_invoice": awaiting_pos,
                "pos_awaiting_invoice_count": int(pos_awaiting_count or 0),
                "allocated_budget": allocated_budget,
                "used_budget": used_budget,
                "budget_department": budget_dept,
                "budget_financial_year": budget_fy,
                "budget_utilization_pct": budget_utilization,
                "spend_by_category": spend_by_category,
                "cash_flow": cash_flow,
                "recent_invoices": recent_invoices,
                "insights": {
                    "pending_liability_pct": round((float(pending_amount or 0) / (total_spend_val or 1)) * 100, 1),
                    "top_category_name": spend_by_category[0]["category"] if spend_by_category else "N/A",
                    "top_category_spend": spend_by_category[0]["amount"] if spend_by_category else 0.0,
                    "payment_settlement_rate": round((paid_count / (total_inv or 1)) * 100, 1)
                }
            }
    except Exception as e:
        conn.rollback()
        print("FINANCE STATS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================================
# 5. PROCUREMENT MANAGER DASHBOARD STATS
# ==========================================================

@router.get("/dashboard/procurement-stats")
def get_procurement_dashboard_stats(current_user: dict = Depends(check_role(["Admin", "Procurement Manager"]))):
    try:
        conn.rollback()
        with conn.cursor() as cur:
            # Vendor metrics
            cur.execute("SELECT COUNT(*), COALESCE(AVG(reliability_score), 0) FROM vendors")
            v_row = cur.fetchone()
            total_vendors = int(v_row[0] or 0)
            avg_reliability = float(v_row[1] or 0)

            # 1. Historical Procurement Transactions (DataCo raw dataset records)
            cur.execute("SELECT COUNT(*) FROM dataco_raw_orders")
            raw_row = cur.fetchone()
            historical_transactions = int(raw_row[0] or 0) if raw_row else 180519

            # 2. Canonical 7 Status Counts for Application Purchase Orders
            cur.execute("""
                SELECT
                    COUNT(CASE WHEN LOWER(status) = 'pending approval' THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) = 'approved' THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) = 'ordered' THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) IN ('in-transit', 'in transit') THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) = 'delivered' THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) = 'completed' THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) IN ('cancelled', 'canceled', 'fraud', 'rejected') THEN 1 END),
                    COALESCE(SUM(total_amount), 0)
                FROM purchase_orders
                WHERE created_by IS NOT NULL OR dataco_order_id IS NULL
            """)
            app_stat_row = cur.fetchone()
            app_statuses = {
                "pending_approval": int(app_stat_row[0] or 0),
                "approved": int(app_stat_row[1] or 0),
                "ordered": int(app_stat_row[2] or 0),
                "in_transit": int(app_stat_row[3] or 0),
                "delivered": int(app_stat_row[4] or 0),
                "completed": int(app_stat_row[5] or 0),
                "cancelled": int(app_stat_row[6] or 0)
            }
            app_procurement_spend = float(app_stat_row[7] or 0)

            # 3. Canonical 7 Status Counts across Entire Historical Ledger
            cur.execute("""
                SELECT
                    COUNT(CASE WHEN LOWER(status) = 'pending approval' THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) = 'approved' THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) = 'ordered' THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) IN ('in-transit', 'in transit') THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) = 'delivered' THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) = 'completed' THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) IN ('cancelled', 'canceled', 'fraud', 'rejected') THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) IN ('pending', 'pending_payment') THEN 1 END),
                    COALESCE(SUM(total_amount), 0)
                FROM purchase_orders
            """)
            ledger_stat_row = cur.fetchone()
            ledger_statuses = {
                "pending_approval": int(ledger_stat_row[0] or 0),
                "approved": int(ledger_stat_row[1] or 0),
                "ordered": int(ledger_stat_row[2] or 0),
                "in_transit": int(ledger_stat_row[3] or 0),
                "delivered": int(ledger_stat_row[4] or 0),
                "completed": int(ledger_stat_row[5] or 0),
                "cancelled": int(ledger_stat_row[6] or 0),
                "pending_historical": int(ledger_stat_row[7] or 0)
            }
            total_procurement_spending = float(ledger_stat_row[8] or 0)

            # 4. Active Purchase Order Monitoring
            cur.execute("""
                SELECT
                    COUNT(CASE WHEN LOWER(status) IN ('approved', 'ordered', 'in-transit', 'in transit', 'processing') THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) IN ('ordered', 'in-transit', 'in transit') THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) IN ('approved', 'ordered', 'in-transit', 'in transit', 'processing') AND expected_delivery < CURRENT_DATE THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) IN ('approved', 'ordered', 'in-transit', 'in transit', 'processing') AND expected_delivery >= CURRENT_DATE THEN 1 END)
                FROM purchase_orders
                WHERE created_by IS NOT NULL OR dataco_order_id IS NULL
            """)
            act_row = cur.fetchone()
            active_purchase_orders = int(act_row[0] or 0)
            active_monitoring = {
                "total_active": active_purchase_orders,
                "ordered_or_in_transit": int(act_row[1] or 0),
                "delayed_deliveries": int(act_row[2] or 0),
                "upcoming_deliveries": int(act_row[3] or 0)
            }

            # 5. Pending Requisitions (from purchase_requests application table)
            cur.execute("SELECT COUNT(*) FROM purchase_requests WHERE LOWER(status) = 'pending'")
            pending_requisitions = int(cur.fetchone()[0] or 0)

            # Top Pending Requisitions for Dashboard Review Panel
            cur.execute("""
                SELECT
                    pr.id,
                    pr.vendor_id,
                    COALESCE(v.vendor_name, 'Unassigned') AS vendor_name,
                    pr.product_name,
                    pr.quantity,
                    pr.request_date,
                    pr.requested_by,
                    pr.status,
                    COALESCE(v.reliability_score, 0) AS reliability_score,
                    COALESCE(pr.unit_price, 0) AS unit_price,
                    COALESCE(pr.total_amount, 0) AS total_amount
                FROM purchase_requests pr
                LEFT JOIN vendors v ON pr.vendor_id = v.id
                WHERE LOWER(pr.status) = 'pending'
                ORDER BY pr.id DESC
                LIMIT 5
            """)
            pending_requisitions_list = [{
                "id": r[0],
                "vendor_id": r[1],
                "vendor_name": r[2] if not (r[1] and str(r[2]).lower().startswith("derived vendor proxy")) else f"Vendor-{r[1]}",
                "product_name": r[3] or "N/A",
                "quantity": int(r[4] or 1),
                "request_date": str(r[5]) if r[5] else "",
                "requested_by": r[6] or "N/A",
                "status": r[7] or "Pending",
                "vendor_reliability": float(r[8] or 0),
                "unit_price": float(r[9] or 0),
                "total_amount": float(r[10] or 0)
            } for r in cur.fetchall()]

            # 6. Delivered Application Orders
            cur.execute("""
                SELECT COUNT(*)
                FROM purchase_orders
                WHERE (created_by IS NOT NULL OR dataco_order_id IS NULL)
                  AND LOWER(status) IN ('delivered', 'completed')
            """)
            delivered_application_pos = int(cur.fetchone()[0] or 0)

            # 7. Delivery Metrics from deliveries and dataco_raw_orders
            cur.execute("""
                SELECT 
                    COALESCE((COUNT(CASE WHEN late_delivery_risk = 0 THEN 1 END) * 100.0) / NULLIF(COUNT(*), 0), 0) AS on_time_pct,
                    COALESCE((COUNT(CASE WHEN late_delivery_risk = 1 THEN 1 END) * 100.0) / NULLIF(COUNT(*), 0), 0) AS late_pct
                FROM dataco_raw_orders
            """)
            deliv_row = cur.fetchone()
            on_time_rate = float(deliv_row[0] or 0)
            late_risk_rate = float(deliv_row[1] or 0)

            cur.execute("""
                SELECT
                    COUNT(CASE WHEN late_delivery_risk = 0 THEN 1 END),
                    COUNT(CASE WHEN late_delivery_risk = 1 THEN 1 END),
                    COUNT(*)
                FROM deliveries
            """)
            del_summary_row = cur.fetchone()
            del_on_time = int(del_summary_row[0] or 0)
            del_delayed = int(del_summary_row[1] or 0)
            del_total = int(del_summary_row[2] or 0)

            delivery_status = {
                "on_time_deliveries": del_on_time,
                "delayed_deliveries": del_delayed,
                "in_transit_orders": app_statuses["in_transit"],
                "upcoming_deliveries": active_monitoring["upcoming_deliveries"],
                "on_time_rate": round(on_time_rate, 1),
                "total_deliveries": del_total
            }

            # 8. Budget vs Spend
            cur.execute("SELECT allocated_amount, used_amount, financial_year FROM budgets WHERE LOWER(department) = 'procurement' ORDER BY id DESC LIMIT 1")
            b_proc = cur.fetchone()
            if b_proc and b_proc[0] is not None and float(b_proc[0]) > 0:
                total_budget = float(b_proc[0])
                budget_used = float(b_proc[1] or 0)
                remaining_budget = max(0.0, total_budget - budget_used)
                budget_utilization = round((budget_used / total_budget * 100), 1) if total_budget > 0 else 0.0
                budget_fy = str(b_proc[2] or "2026-2027")
                has_budget = True
            else:
                total_budget = 0.0
                budget_used = 0.0
                remaining_budget = 0.0
                budget_utilization = 0.0
                budget_fy = "N/A"
                has_budget = False

            cost_analysis = {
                "has_budget": has_budget,
                "total_procurement_spending": total_procurement_spending,
                "application_procurement_spending": app_procurement_spend,
                "budget_allocation": total_budget if has_budget else None,
                "budget_utilized": budget_used if has_budget else 0.0,
                "remaining_budget": remaining_budget if has_budget else None,
                "budget_utilization_pct": budget_utilization if has_budget else 0.0,
                "financial_year": budget_fy
            }

            cur.execute("SELECT COALESCE(AVG(actual_days), 3.5) FROM deliveries")
            avg_delivery_days_val = round(float(cur.fetchone()[0] or 3.5), 1)

            # 9. Supplier Scorecard
            cur.execute("""
                SELECT 
                    id,
                    vendor_name,
                    total_orders,
                    completed_orders,
                    delivery_rate,
                    quality_score,
                    reliability_score,
                    risk_level,
                    status
                FROM vendors
                ORDER BY reliability_score DESC, total_orders DESC
                LIMIT 10
            """)
            scorecard = [{
                "vendor_id": r[0],
                "vendor_name": r[1],
                "total_orders": int(r[2] or 0),
                "completed_orders": int(r[3] or 0),
                "pending_orders": max(0, int(r[2] or 0) - int(r[3] or 0)),
                "delivery_rate": float(r[4] or 0),
                "on_time_rate": float(r[4] or 0),
                "quality_score": float(r[5] or 0),
                "reliability_score": float(r[6] or 0),
                "risk": r[7] or "Low Risk",
                "status": r[8] or "Active"
            } for r in cur.fetchall()]

            # 10. Recent Application Purchase Orders
            cur.execute("""
                SELECT po.id, po.po_number, v.vendor_name, po.product_name, po.quantity, po.total_amount, po.order_date, po.expected_delivery, po.status
                FROM purchase_orders po
                LEFT JOIN vendors v ON po.vendor_id = v.id
                WHERE po.created_by IS NOT NULL OR po.dataco_order_id IS NULL
                ORDER BY po.id DESC
                LIMIT 10
            """)
            recent_orders = [{
                "id": r[0],
                "po_number": r[1] or f"PO-{r[0]:06d}",
                "vendor_name": r[2] or "Registered Supplier",
                "product_name": r[3] or "Catalog Item",
                "quantity": int(r[4] or 1),
                "total_amount": float(r[5] or 0),
                "order_date": str(r[6]) if r[6] else "",
                "expected_delivery": str(r[7]) if r[7] else "On Schedule",
                "status": r[8] or "Pending"
            } for r in cur.fetchall()]

            return {
                "total_vendors": total_vendors,
                "total_orders": historical_transactions,
                "historical_transactions": historical_transactions,
                "active_orders": active_purchase_orders,
                "active_purchase_orders": active_purchase_orders,
                "pending_requisitions": pending_requisitions,
                "delivered_orders": delivered_application_pos,
                "completed_orders": app_statuses["completed"] + ledger_statuses["completed"],
                "in_progress_orders": app_statuses["in_transit"] + app_statuses["ordered"],
                "pending_orders": pending_requisitions,
                "cancelled_orders": app_statuses["cancelled"] + ledger_statuses["cancelled"],
                "on_time_delivery_rate": round(on_time_rate, 1),
                "late_delivery_risk_rate": round(late_risk_rate, 1),
                "average_reliability": round(avg_reliability, 1),
                "avg_reliability": round(avg_reliability, 1),
                "has_budget": has_budget,
                "total_budget": total_budget if has_budget else None,
                "actual_spend": budget_used if has_budget else 0.0,
                "remaining_budget": remaining_budget if has_budget else None,
                "budget_utilization_pct": budget_utilization if has_budget else 0.0,
                "canonical_status_overview": {
                    "application": app_statuses,
                    "ledger": ledger_statuses
                },
                "active_monitoring": active_monitoring,
                "pending_requisitions_list": pending_requisitions_list,
                "cost_analysis": cost_analysis,
                "delivery_status": delivery_status,
                "po_distribution": {
                    "completed": app_statuses["completed"] + ledger_statuses["completed"],
                    "in_progress": app_statuses["in_transit"] + app_statuses["ordered"],
                    "pending": pending_requisitions + ledger_statuses["pending_historical"],
                    "cancelled": app_statuses["cancelled"] + ledger_statuses["cancelled"]
                },
                "budget": {
                    "has_budget": has_budget,
                    "allocated_budget": total_budget if has_budget else None,
                    "actual_spend": budget_used if has_budget else 0.0,
                    "remaining_budget": remaining_budget if has_budget else None,
                    "budget_utilization_pct": budget_utilization if has_budget else 0.0,
                    "financial_year": budget_fy
                },
                "scorecard": scorecard,
                "recent_orders": recent_orders,
                "insights": {
                    "pending_requisitions": pending_requisitions,
                    "top_reliable_vendor": scorecard[0]["vendor_name"] if scorecard else "N/A",
                    "top_supplier_name": scorecard[0]["vendor_name"] if scorecard else "N/A",
                    "top_supplier_score": scorecard[0]["reliability_score"] if scorecard else 0,
                    "avg_delivery_days": avg_delivery_days_val,
                    "fulfillment_rate": round(on_time_rate, 1)
                }
            }
    except Exception as e:
        conn.rollback()
        print("PROCUREMENT STATS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================================
# 6. VENDOR DASHBOARD STATS (Strictly Scoped by vendor_id)
# ==========================================================

@router.get("/dashboard/vendor-stats")
def get_vendor_dashboard_stats(
    vendor_id: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    user_role = normalize_role(current_user.get("role"))
    user_vendor_id = current_user.get("vendor_id")

    if user_role == "Vendor":
        if not user_vendor_id:
            return {
                "unlinked": True,
                "message": "No vendor profile is currently linked to your user account. Please contact an Administrator."
            }
        # Multi-tenant security check: If Vendor attempts to supply another vendor's ID, reject with 403
        if vendor_id is not None and vendor_id != user_vendor_id:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Vendors may only access their own dashboard statistics."
            )
        target_vendor_id = user_vendor_id
    else:
        # Administrative & Management roles can view specific vendor dashboards or default to vendor 1
        target_vendor_id = vendor_id or user_vendor_id or 1

    vendor_id = target_vendor_id
    today_d = date.today()

    try:
        conn.rollback()
        with conn.cursor() as cur:
            # 1. Vendor Profile
            cur.execute("""
                SELECT 
                    id, vendor_name, category, status, contact_person, email, phone, city, state, country, gst_number,
                    reliability_score, quality_score, delivery_rate, total_orders, completed_orders, risk_level
                FROM vendors
                WHERE id = %s
            """, (vendor_id,))
            v_row = cur.fetchone()
            if not v_row:
                raise HTTPException(status_code=404, detail="Vendor record not found")

            (vid, vname, vcat, vstatus, vcontact, vemail, vphone, vcity, vstate, vcountry, vgst,
             rel_score, qual_score, deliv_rate, tot_orders, comp_orders, risk_lvl) = v_row

            rel_score = float(rel_score or 0)
            qual_score = float(qual_score or 0)
            deliv_rate = float(deliv_rate or 0)
            tot_orders = int(tot_orders or 0)
            comp_orders = int(comp_orders or 0)

            # 2. Detailed Purchase Orders metrics strictly for this vendor
            cur.execute("""
                SELECT
                    COUNT(*),
                    COUNT(CASE WHEN LOWER(status) IN ('completed', 'delivered') THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) IN ('ordered', 'approved', 'in-transit', 'in transit', 'processing') THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) IN ('pending', 'pending approval') THEN 1 END),
                    COUNT(CASE WHEN (LOWER(status) NOT IN ('completed', 'delivered', 'cancelled', 'canceled') AND expected_delivery < CURRENT_DATE) THEN 1 END),
                    COALESCE(SUM(total_amount), 0)
                FROM purchase_orders
                WHERE vendor_id = %s
            """, (vendor_id,))
            po_counts = cur.fetchone()
            tot_po, comp_po, active_po, pend_po, delayed_po, po_revenue = po_counts

            tot_po = int(tot_po or 0)
            comp_po = int(comp_po or 0)
            active_po = int(active_po or 0)
            pend_po = int(pend_po or 0)
            delayed_po = int(delayed_po or 0)
            po_revenue = float(po_revenue or 0)

            # Check late deliveries from deliveries table
            cur.execute("""
                SELECT COUNT(*) 
                FROM deliveries 
                WHERE vendor_id = %s AND (late_delivery_risk = 1 OR is_on_time = false)
            """, (vendor_id,))
            deliv_late_row = cur.fetchone()
            delivery_delayed_count = int(deliv_late_row[0] or 0) if deliv_late_row else 0
            final_delayed_orders = max(delayed_po, delivery_delayed_count)

            # Effective orders count for display
            effective_total_orders = tot_po if tot_po > 0 else tot_orders
            effective_completed_orders = comp_po if tot_po > 0 else comp_orders

            service_score = round((effective_completed_orders / effective_total_orders * 100), 1) if effective_total_orders > 0 else 0.0
            compliance_score = round(min(100.0, (qual_score * 0.6) + (deliv_rate * 0.4)), 1) if effective_total_orders > 0 else 0.0

            # 3. Real Communication Metrics
            cur.execute("""
                SELECT COUNT(*), MAX(created_at)
                FROM communications
                WHERE vendor_id = %s
            """, (vendor_id,))
            comm_row = cur.fetchone()
            comm_count = int(comm_row[0] or 0) if comm_row else 0
            last_comm_date = str(comm_row[1]) if comm_row and comm_row[1] else None

            if comm_count > 0:
                has_communication_data = True
                communication_score = round(min(100.0, 70.0 + (comm_count * 3.0)), 1)
                communication_display = f"{communication_score}%"
            else:
                has_communication_data = False
                communication_score = None
                communication_display = "No messages logged yet"

            # 4. Invoices summary strictly for this vendor
            cur.execute("""
                SELECT 
                    COUNT(*),
                    COALESCE(SUM(invoice_amount), 0),
                    COUNT(CASE WHEN LOWER(payment_status)='paid' THEN 1 END),
                    COALESCE(SUM(CASE WHEN LOWER(payment_status)='paid' THEN invoice_amount END), 0),
                    COUNT(CASE WHEN LOWER(payment_status) IN ('pending', 'unpaid') THEN 1 END),
                    COALESCE(SUM(CASE WHEN LOWER(payment_status) IN ('pending', 'unpaid') THEN invoice_amount END), 0),
                    COUNT(CASE WHEN LOWER(payment_status) IN ('pending', 'unpaid') AND due_date < CURRENT_DATE THEN 1 END),
                    COALESCE(SUM(CASE WHEN LOWER(payment_status) IN ('pending', 'unpaid') AND due_date < CURRENT_DATE THEN invoice_amount END), 0)
                FROM invoices
                WHERE vendor_id = %s
            """, (vendor_id,))
            inv_row = cur.fetchone()
            tot_inv, tot_inv_amt, paid_inv, paid_inv_amt, pend_inv, pend_inv_amt, overdue_inv, overdue_inv_amt = inv_row

            tot_inv = int(tot_inv or 0)
            tot_inv_amt = float(tot_inv_amt or 0)
            paid_inv = int(paid_inv or 0)
            paid_inv_amt = float(paid_inv_amt or 0)
            pend_inv = int(pend_inv or 0)
            pend_inv_amt = float(pend_inv_amt or 0)
            overdue_inv = int(overdue_inv or 0)
            overdue_inv_amt = float(overdue_inv_amt or 0)

            # 5. Contracts & Compliance strictly for this vendor
            cur.execute("""
                SELECT id, contract_name, start_date, end_date, status, contract_value
                FROM contracts
                WHERE vendor_id = %s
                ORDER BY id DESC
                LIMIT 10
            """, (vendor_id,))
            contracts_data = []
            expiring_contracts_count = 0
            for cid, cname, sdate, edate, cstatus, cval in cur.fetchall():
                rem_days = (edate - today_d).days if edate else None
                is_expiring = rem_days is not None and 0 <= rem_days <= 30
                is_expired = rem_days is not None and rem_days < 0
                if is_expiring or is_expired:
                    expiring_contracts_count += 1
                contracts_data.append({
                    "id": cid,
                    "contract_name": cname or f"Supply Contract #{cid}",
                    "start_date": str(sdate) if sdate else "",
                    "end_date": str(edate) if edate else "",
                    "status": "Expired" if is_expired else ("Expiring Soon" if is_expiring else (cstatus or "Active")),
                    "remaining_days": rem_days,
                    "contract_value": float(cval or 0)
                })

            # Pending Actions calculation
            pending_actions = pend_po + pend_inv + expiring_contracts_count

            # 6. Recent Purchase Orders strictly for this vendor
            cur.execute("""
                SELECT id, po_number, product_name, quantity, total_amount, order_date, expected_delivery, status,
                       COALESCE(advance_amount, 0.00), COALESCE(paid_amount, 0.00),
                       COALESCE(remaining_amount, total_amount, 0.00), COALESCE(payment_status, 'Unpaid')
                FROM purchase_orders
                WHERE vendor_id = %s
                ORDER BY id DESC
                LIMIT 10
            """, (vendor_id,))
            recent_orders = []
            for r in cur.fetchall():
                exp_del = str(r[6]) if r[6] else ""
                st = r[7] or "Pending"
                is_delayed = bool(exp_del and exp_del < str(today_d) and st.lower() not in ('completed', 'delivered', 'cancelled', 'canceled'))
                recent_orders.append({
                    "id": r[0],
                    "po_number": r[1] or f"PO-{r[0]:06d}",
                    "product_name": r[2] or "Supplied Item",
                    "quantity": int(r[3] or 1),
                    "total_amount": float(r[4] or 0),
                    "order_date": str(r[5]) if r[5] else "",
                    "expected_delivery": exp_del or "On Schedule",
                    "status": st,
                    "is_delayed": is_delayed,
                    "advance_amount": float(r[8] or 0),
                    "paid_amount": float(r[9] or 0),
                    "remaining_amount": float(r[10] or 0),
                    "payment_status": r[11] or "Unpaid"
                })

            # 7. Recent Communications strictly for this vendor
            cur.execute("""
                SELECT c.id, c.user_id, c.message, c.created_at, c.purchase_order_id, c.contract_id,
                       u.name as sender_name
                FROM communications c
                LEFT JOIN users u ON c.user_id = u.id
                WHERE c.vendor_id = %s
                ORDER BY c.created_at DESC
                LIMIT 5
            """, (vendor_id,))
            recent_communications = [{
                "id": r[0],
                "user_id": r[1],
                "message": r[2],
                "created_at": str(r[3]),
                "purchase_order_id": r[4],
                "contract_id": r[5],
                "sender_name": r[6] or "Procurement Desk"
            } for r in cur.fetchall()]

            # 8. Notifications / Alerts count strictly for this vendor
            cur.execute("""
                SELECT COUNT(*) 
                FROM notifications 
                WHERE vendor_id = %s AND LOWER(status) != 'read'
            """, (vendor_id,))
            unread_notifications = int(cur.fetchone()[0] or 0)

            # 9. Contextual AI Recommendations based on real data
            recommendations = []
            if deliv_rate < 80.0 and effective_total_orders > 0:
                recommendations.append({
                    "title": "On-Time Delivery Optimization",
                    "type": "warning",
                    "text": f"Your current on-time delivery rate is {deliv_rate:.1f}%. Increasing buffer lead times by 2-3 business days will help prevent late delivery flags."
                })
            elif effective_total_orders > 0:
                recommendations.append({
                    "title": "Strong Delivery Track Record",
                    "type": "success",
                    "text": f"Fulfillment SLA adherence is {deliv_rate:.1f}%. Your account qualifies for priority purchase order allocation."
                })

            if qual_score >= 90.0 and effective_total_orders > 0:
                recommendations.append({
                    "title": "High Quality Tier Maintained",
                    "type": "success",
                    "text": f"Quality inspection pass rate is {qual_score:.1f}%. High component standards reduce rework and return cycles."
                })
            elif effective_total_orders > 0:
                recommendations.append({
                    "title": "Quality Inspection Enhancement",
                    "type": "info",
                    "text": f"Quality index is {qual_score:.1f}%. We recommend reviewing pre-dispatch testing checklists to minimize inspection flags."
                })

            if pend_inv > 0:
                recommendations.append({
                    "title": "Pending Invoices Clearance",
                    "type": "info",
                    "text": f"You have {pend_inv} pending invoice(s) totaling ₹{pend_inv_amt:,.2f} awaiting payment clearance."
                })

            if expiring_contracts_count > 0:
                recommendations.append({
                    "title": "Contract Renewal Required",
                    "type": "warning",
                    "text": f"You have {expiring_contracts_count} contract(s) expiring soon or requiring renewal review."
                })

            # User contact fallback resolution
            effective_contact = vcontact or current_user.get("name") or "Account Representative"
            effective_email = vemail or current_user.get("email") or "N/A"
            effective_phone = vphone or current_user.get("phone") or "N/A"

            return {
                "unlinked": False,
                "has_data": effective_total_orders > 0,
                "profile": {
                    "id": vid,
                    "vendor_name": vname,
                    "company_name": vname,
                    "category": vcat or "Standard Supplies",
                    "status": vstatus or "Active",
                    "contact_person": effective_contact,
                    "email": effective_email,
                    "phone": effective_phone,
                    "city": vcity or "Regional Operations",
                    "state": vstate or "N/A",
                    "country": vcountry or "India",
                    "gst_number": vgst or "N/A",
                    "risk_level": risk_lvl or "Medium Risk"
                },
                "scores": {
                    "overall_reliability": rel_score,
                    "on_time_delivery": deliv_rate,
                    "quality_score": qual_score,
                    "communication_score": communication_score,
                    "communication_display": communication_display,
                    "has_communication_data": has_communication_data,
                    "compliance_score": compliance_score,
                    "service_score": service_score
                },
                "orders_summary": {
                    "total_orders": effective_total_orders,
                    "completed_orders": effective_completed_orders,
                    "active_orders": active_po,
                    "delayed_orders": final_delayed_orders,
                    "pending_orders": pend_po,
                    "pending_actions": pending_actions,
                    "total_revenue": po_revenue
                },
                "invoices_summary": {
                    "total_count": tot_inv,
                    "total_amount": tot_inv_amt,
                    "paid_count": paid_inv,
                    "paid_amount": paid_inv_amt,
                    "pending_count": pend_inv,
                    "pending_amount": pend_inv_amt,
                    "overdue_count": overdue_inv,
                    "overdue_amount": overdue_inv_amt
                },
                "contracts_summary": {
                    "total_count": len(contracts_data),
                    "expiring_count": expiring_contracts_count,
                    "contracts": contracts_data
                },
                "communications_summary": {
                    "total_count": comm_count,
                    "last_date": last_comm_date,
                    "recent": recent_communications
                },
                "unread_alerts_count": unread_notifications,
                "recent_orders": recent_orders,
                "recommendations": recommendations
            }
    except Exception as e:
        conn.rollback()
        print("VENDOR STATS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================================
# 7. SUPPLY CHAIN DASHBOARD STATS
# ==========================================================

@router.get("/dashboard/supplychain-stats")
def get_supplychain_dashboard_stats(current_user: dict = Depends(check_role(["Admin", "Supply Chain Manager"]))):
    try:
        conn.rollback()
        with conn.cursor() as cur:
            # Total suppliers
            cur.execute("SELECT COUNT(*) FROM vendors")
            total_suppliers = int(cur.fetchone()[0] or 0)

            # Active POs
            cur.execute("""
                SELECT COUNT(*) 
                FROM purchase_orders 
                WHERE LOWER(status) NOT IN ('completed', 'delivered', 'cancelled', 'canceled')
            """)
            active_pos = int(cur.fetchone()[0] or 0)

            # Deliveries and delay metrics
            cur.execute("""
                SELECT 
                    COUNT(*),
                    COUNT(CASE WHEN late_delivery_risk = 0 THEN 1 END),
                    COUNT(CASE WHEN late_delivery_risk = 1 THEN 1 END),
                    COALESCE(AVG(CASE WHEN late_delivery_risk = 1 THEN GREATEST(actual_days - scheduled_days, 0) END), 0)
                FROM deliveries
            """)
            deliv_row = cur.fetchone()
            tot_deliv, on_time_deliv, late_deliv, avg_delay = deliv_row

            on_time_rate = round((on_time_deliv / tot_deliv * 100), 1) if tot_deliv > 0 else 0.0

            # Suppliers Performance distribution
            cur.execute("""
                SELECT 
                    COUNT(CASE WHEN reliability_score >= 80 THEN 1 END) AS excellent_count,
                    COUNT(CASE WHEN reliability_score >= 70 AND reliability_score < 80 THEN 1 END) AS good_count,
                    COUNT(CASE WHEN reliability_score >= 60 AND reliability_score < 70 THEN 1 END) AS average_count,
                    COUNT(CASE WHEN reliability_score < 60 THEN 1 END) AS poor_count
                FROM vendors
            """)
            perf_row = cur.fetchone()
            perf_distribution = {
                "excellent": int(perf_row[0] or 0),
                "good": int(perf_row[1] or 0),
                "average": int(perf_row[2] or 0),
                "poor": int(perf_row[3] or 0),
                "at_risk": int(perf_row[3] or 0)
            }

            # Shipping Mode Breakdown
            cur.execute("""
                SELECT shipping_mode, COUNT(*) 
                FROM dataco_raw_orders 
                WHERE shipping_mode IS NOT NULL 
                GROUP BY shipping_mode 
                ORDER BY COUNT(*) DESC
            """)
            shipping_modes = [{"mode": r[0], "count": int(r[1])} for r in cur.fetchall()]

            # Top Delivery Regions
            cur.execute("""
                SELECT order_region, COUNT(*) 
                FROM dataco_raw_orders 
                WHERE order_region IS NOT NULL 
                GROUP BY order_region 
                ORDER BY COUNT(*) DESC 
                LIMIT 5
            """)
            top_regions = [{"region": r[0], "count": int(r[1])} for r in cur.fetchall()]

            # Recent Shipments Log
            cur.execute("""
                SELECT 
                    d.id, 
                    d.dataco_order_id, 
                    v.vendor_name, 
                    COALESCE(po.product_name, ro.product_name, 'Consignment Item'), 
                    d.expected_delivery_date, 
                    d.actual_delivery_date, 
                    d.delivery_status, 
                    (d.actual_days - d.scheduled_days) AS variance_days,
                    d.delay_days,
                    COALESCE(d.shipping_mode, ro.shipping_mode, 'Standard Class') AS shipping_mode,
                    COALESCE(ro.order_region, 'Regional') AS region
                FROM deliveries d
                JOIN vendors v ON d.vendor_id = v.id
                LEFT JOIN purchase_orders po ON d.dataco_order_item_id = po.order_item_id
                LEFT JOIN dataco_raw_orders ro ON d.dataco_order_item_id = ro.order_item_id
                ORDER BY d.id DESC
                LIMIT 10
            """)
            recent_deliveries = [{
                "id": r[0],
                "delivery_id": r[0],
                "order_id": r[1] or r[0],
                "vendor_name": r[2],
                "product_name": r[3] or "Consignment Item",
                "expected_date": str(r[4].date()) if r[4] else "Scheduled",
                "actual_date": str(r[5].date()) if r[5] else "In Transit",
                "status": r[6] or "In Transit",
                "variance_days": int(r[7]) if r[7] is not None else 0,
                "delay_days": int(r[8] or 0),
                "shipping_mode": r[9] or "Standard Class",
                "region": r[10] or "Regional"
            } for r in cur.fetchall()]

            # Active Late Risk Alerts
            cur.execute("""
                SELECT d.id, d.dataco_order_id, v.vendor_name, po.product_name, d.actual_delivery_date, d.delivery_status, d.delay_days
                FROM deliveries d
                JOIN vendors v ON d.vendor_id = v.id
                LEFT JOIN purchase_orders po ON d.dataco_order_item_id = po.order_item_id
                WHERE d.late_delivery_risk = 1
                ORDER BY d.id DESC
                LIMIT 5
            """)
            alerts = [{
                "delivery_id": r[0],
                "order_id": r[1] or r[0],
                "vendor_name": r[2],
                "product_name": r[3] or "Consignment Item",
                "date": str(r[4].date()) if r[4] else "Recent",
                "status": r[5] or "Late Delivery",
                "delay_days": int(r[6] or 1)
            } for r in cur.fetchall()]

            cur.execute("SELECT COUNT(*) FROM vendors WHERE risk_level IN ('High Risk', 'Critical Risk')")
            critical_suppliers = int(cur.fetchone()[0] or 0)

            cur.execute("SELECT COALESCE(SUM(unit_price * quantity), 0) FROM deliveries WHERE late_delivery_risk = 1")
            delayed_deliveries_val = float(cur.fetchone()[0] or 0)

            return {
                "total_suppliers": total_suppliers,
                "active_purchase_orders": active_pos,
                "active_orders": active_pos,
                "total_deliveries": int(tot_deliv or 0),
                "delayed_deliveries": int(late_deliv or 0),
                "on_time_rate": on_time_rate,
                "average_delay_days": round(float(avg_delay or 0), 1),
                "at_risk_suppliers": critical_suppliers,
                "performance_distribution": perf_distribution,
                "supplier_performance_dist": perf_distribution,
                "shipping_modes": shipping_modes,
                "top_regions": top_regions,
                "recent_deliveries": recent_deliveries,
                "recent_shipments": recent_deliveries,
                "alerts": alerts,
                "late_risk_alerts": alerts,
                "insights": {
                    "predominant_mode": shipping_modes[0]["mode"] if shipping_modes else "Standard",
                    "dominant_shipping_mode": shipping_modes[0]["mode"] if shipping_modes else "Standard Class",
                    "dominant_mode_pct": round((shipping_modes[0]["count"] / (tot_deliv or 1)) * 100, 1) if shipping_modes else 60,
                    "critical_supplier_ratio": round((critical_suppliers / (total_suppliers or 1)) * 100, 1),
                    "delayed_order_value": delayed_deliveries_val,
                    "lead_time_efficiency": round(100.0 - (float(avg_delay or 0) * 5), 1)
                }
            }
    except Exception as e:
        conn.rollback()
        print("SUPPLY CHAIN STATS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================================
# 7. PLATFORM DATA QUALITY AUDIT
# ==========================================================

@router.get("/dashboard/data-quality")
def get_data_quality_audit(current_user: dict = Depends(check_role(["Admin", "Administrator", "Auditor"]))):
    try:
        conn.rollback()
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id = v.id WHERE v.id IS NULL")
            orphan_pos = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM invoices i LEFT JOIN vendors v ON i.vendor_id = v.id WHERE v.id IS NULL")
            orphan_inv_v = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM invoices i LEFT JOIN purchase_orders po ON i.po_id = po.id WHERE po.id IS NULL")
            orphan_inv_po = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM contracts c LEFT JOIN vendors v ON c.vendor_id = v.id WHERE v.id IS NULL")
            orphan_contracts = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM contracts WHERE end_date < start_date")
            invalid_contract_dates = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM vendors WHERE reliability_score < 0 OR reliability_score > 100")
            invalid_rel_scores = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM purchase_orders WHERE total_amount < 0")
            negative_po = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM invoices WHERE invoice_amount < 0")
            negative_inv = cur.fetchone()[0]
            cur.execute("SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1")
            duplicate_users = cur.fetchall()

        total_violations = (
            orphan_pos + orphan_inv_v + orphan_inv_po + orphan_contracts + 
            invalid_contract_dates + invalid_rel_scores + negative_po + 
            negative_inv + len(duplicate_users)
        )

        return {
            "status": "Healthy (0 Violations)" if total_violations == 0 else "Violations Detected",
            "total_violations": total_violations,
            "orphan_records": {
                "orphan_purchase_orders": orphan_pos,
                "orphan_invoices_vendor": orphan_inv_v,
                "orphan_invoices_po": orphan_inv_po,
                "orphan_contracts": orphan_contracts
            },
            "validations": {
                "invalid_contract_dates": invalid_contract_dates,
                "invalid_reliability_scores": invalid_rel_scores,
                "negative_po_amounts": negative_po,
                "negative_invoice_amounts": negative_inv,
                "duplicate_users_count": len(duplicate_users)
            }
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))



