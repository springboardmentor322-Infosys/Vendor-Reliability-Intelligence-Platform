import sys
import os
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT_DIR, "backend"))

import psycopg2
from db import DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT

def run_migration():
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT
    )
    conn.autocommit = False
    cur = conn.cursor()

    try:
        print("Starting Auditor module database migration...")

        # 1. Create audit_evidence_documents table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS audit_evidence_documents (
                id SERIAL PRIMARY KEY,
                document_name VARCHAR(255) NOT NULL,
                document_type VARCHAR(100) NOT NULL,
                related_entity_type VARCHAR(50) NOT NULL,
                related_entity_id VARCHAR(100) NOT NULL,
                file_path VARCHAR(500),
                file_size_kb NUMERIC(10, 2) DEFAULT 0.0,
                upload_date DATE DEFAULT CURRENT_DATE,
                expiry_date DATE,
                current_status VARCHAR(50) NOT NULL DEFAULT 'Valid',
                verification_status VARCHAR(50) NOT NULL DEFAULT 'Pending Review',
                verified_by INTEGER REFERENCES users(id),
                verification_date TIMESTAMP,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("Table 'audit_evidence_documents' verified/created.")

        # 2. Create audit_findings table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS audit_findings (
                id SERIAL PRIMARY KEY,
                finding_code VARCHAR(50) UNIQUE NOT NULL,
                audit_area VARCHAR(100) NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id VARCHAR(50) NOT NULL,
                vendor_id INTEGER REFERENCES vendors(id),
                vendor_name VARCHAR(255) NOT NULL,
                risk_level VARCHAR(50) NOT NULL,
                description TEXT NOT NULL,
                identified_date DATE NOT NULL,
                audit_status VARCHAR(50) NOT NULL DEFAULT 'Open',
                resolution_status VARCHAR(50) NOT NULL DEFAULT 'Unresolved',
                assigned_auditor_id INTEGER REFERENCES users(id),
                resolution_notes TEXT,
                resolved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("Table 'audit_findings' verified/created.")

        # Index creation for efficient lookup
        cur.execute("CREATE INDEX IF NOT EXISTS idx_audit_findings_code ON audit_findings(finding_code);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_audit_findings_status ON audit_findings(audit_status);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_audit_findings_risk ON audit_findings(risk_level);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_audit_evidence_entity ON audit_evidence_documents(related_entity_type, related_entity_id);")

        conn.commit()

        # 3. Synchronize real audit findings from existing database records
        sync_count = sync_real_audit_findings(cur, conn)
        print(f"Synchronized {sync_count} authentic audit findings from actual operational data.")

        print("Auditor module migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print("MIGRATION ERROR:", e)
        raise e
    finally:
        cur.close()
        conn.close()

def sync_real_audit_findings(cur, conn):
    """
    Scans genuine database records for compliance anomalies and synchronizes them into audit_findings.
    Preserves any existing auditor-reviewed statuses and notes.
    """
    total_synced = 0

    # A. Material Quality Inspections failing defect or quality thresholds
    cur.execute("""
        SELECT 
            q.id,
            q.vendor_id,
            COALESCE(v.vendor_name, 'Unknown Supplier') as vendor_name,
            q.quality_score,
            q.inspection_status,
            COALESCE(q.inspection_date, CURRENT_DATE) as inspection_date,
            q.remarks,
            q.defective_quantity,
            q.quantity_inspected
        FROM quality_inspections q
        LEFT JOIN vendors v ON q.vendor_id = v.id
        WHERE q.quality_score < 85 OR LOWER(q.inspection_status) != 'passed'
    """)
    quality_rows = cur.fetchall()
    for row in quality_rows:
        qid, vid, vname, qscore, qstatus, idate, rem, def_qty, ins_qty = row
        finding_code = f"F-QI-{qid}"
        area = "Material Quality Verification (ISO 9001)"
        risk = "High" if float(qscore or 0) < 70 else "Medium"
        desc = f"Quality inspection ID #{qid} recorded score of {qscore}% (Status: {qstatus}). Defective units: {def_qty or 0}/{ins_qty or 0}. Remarks: {rem or 'Defect threshold breach'}."
        
        cur.execute("""
            INSERT INTO audit_findings (
                finding_code, audit_area, entity_type, entity_id, vendor_id, 
                vendor_name, risk_level, description, identified_date, 
                audit_status, resolution_status, created_at, updated_at
            )
            VALUES (%s, %s, 'QUALITY_INSPECTION', %s, %s, %s, %s, %s, %s, 'Open', 'Unresolved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (finding_code) DO UPDATE
            SET updated_at = CURRENT_TIMESTAMP
        """, (finding_code, area, str(qid), vid, vname, risk, desc, idate))
        total_synced += 1

    # B. Vendors with critical or high risk level / reliability score < 60
    cur.execute("""
        SELECT 
            v.id,
            v.vendor_name,
            v.reliability_score,
            v.risk_level,
            COALESCE(v.updated_at::date, v.created_at::date, CURRENT_DATE) as idate
        FROM vendors v
        WHERE v.risk_level IN ('High Risk', 'Critical Risk') OR (v.reliability_score > 0 AND v.reliability_score < 60)
    """)
    vendor_rows = cur.fetchall()
    for row in vendor_rows:
        vid, vname, rel_score, risk_lvl, idate = row
        finding_code = f"F-SLA-{vid}"
        area = "Vendor SLA Compliance Controls"
        risk = "Critical" if (risk_lvl == "Critical Risk" or float(rel_score or 0) < 50) else "High"
        desc = f"Supplier '{vname}' (ID: {vid}) SLA variance: Reliability score stands at {rel_score}%, classified as {risk_lvl}. Breaches minimum platform SLA threshold (70%)."
        
        cur.execute("""
            INSERT INTO audit_findings (
                finding_code, audit_area, entity_type, entity_id, vendor_id, 
                vendor_name, risk_level, description, identified_date, 
                audit_status, resolution_status, created_at, updated_at
            )
            VALUES (%s, %s, 'VENDOR', %s, %s, %s, %s, %s, %s, 'Open', 'Unresolved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (finding_code) DO UPDATE
            SET updated_at = CURRENT_TIMESTAMP
        """, (finding_code, area, str(vid), vid, vname, risk, desc, idate))
        total_synced += 1

    # C. Contracts that have expired or reached expiration safeguard limits
    cur.execute("""
        SELECT 
            c.id,
            c.vendor_id,
            COALESCE(v.vendor_name, 'Unknown Vendor') as vendor_name,
            c.contract_name,
            c.end_date,
            c.status,
            COALESCE(c.updated_at::date, CURRENT_DATE) as idate
        FROM contracts c
        LEFT JOIN vendors v ON c.vendor_id = v.id
        WHERE c.end_date < CURRENT_DATE OR LOWER(c.status) = 'expired'
    """)
    contract_rows = cur.fetchall()
    for row in contract_rows:
        cid, vid, vname, cname, edate, cstatus, idate = row
        finding_code = f"F-CNT-{cid}"
        area = "Contract Expiry & Renewal Safeguards"
        risk = "High" if edate and edate < idate else "Medium"
        desc = f"Legal agreement '{cname}' (Contract ID #{cid}) expired on {edate} (Status: {cstatus}). Procurement activity requires renewed contractual safeguards."
        
        cur.execute("""
            INSERT INTO audit_findings (
                finding_code, audit_area, entity_type, entity_id, vendor_id, 
                vendor_name, risk_level, description, identified_date, 
                audit_status, resolution_status, created_at, updated_at
            )
            VALUES (%s, %s, 'CONTRACT', %s, %s, %s, %s, %s, %s, 'Open', 'Unresolved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (finding_code) DO UPDATE
            SET updated_at = CURRENT_TIMESTAMP
        """, (finding_code, area, str(cid), vid, vname, risk, desc, idate))
        total_synced += 1

    # D. Invoices overdue past payment due date without paid status
    cur.execute("""
        SELECT 
            i.id,
            i.invoice_number,
            i.vendor_id,
            COALESCE(v.vendor_name, 'Unknown Vendor') as vendor_name,
            i.due_date,
            i.invoice_amount,
            i.payment_status,
            COALESCE(i.created_at::date, CURRENT_DATE) as idate
        FROM invoices i
        LEFT JOIN vendors v ON i.vendor_id = v.id
        WHERE i.due_date < CURRENT_DATE 
          AND LOWER(i.payment_status) NOT IN ('paid', 'completed')
          AND i.due_date IS NOT NULL
        ORDER BY i.due_date ASC
        LIMIT 10
    """)
    invoice_rows = cur.fetchall()
    for row in invoice_rows:
        iid, inum, vid, vname, ddate, amount, pstatus, idate = row
        finding_code = f"F-INV-{iid}"
        area = "Invoice Disbursement Reconciliations"
        risk = "Medium"
        desc = f"Invoice {inum} (ID #{iid}) for amount ₹{amount} has passed due date ({ddate}) without reconciliation (Current Payment Status: '{pstatus}')."
        
        cur.execute("""
            INSERT INTO audit_findings (
                finding_code, audit_area, entity_type, entity_id, vendor_id, 
                vendor_name, risk_level, description, identified_date, 
                audit_status, resolution_status, created_at, updated_at
            )
            VALUES (%s, %s, 'INVOICE', %s, %s, %s, %s, %s, %s, 'Open', 'Unresolved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (finding_code) DO UPDATE
            SET updated_at = CURRENT_TIMESTAMP
        """, (finding_code, area, str(iid), vid, vname, risk, desc, idate))
        total_synced += 1

    conn.commit()
    return total_synced

if __name__ == "__main__":
    run_migration()
