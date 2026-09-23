from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
app = FastAPI(
    title="Vendor Reliability Intelligence Platform",
    description="Vendor performance and procurement risk management system",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://127.0.0.1:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
# PostgreSQL Database connection

conn = psycopg2.connect(
    host="localhost",
    database="postgres",
    user="postgres",
    password="HP7431",
    port="5432"
)

print("PostgreSQL connected successfully!")

# DATABASE TABLES

cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS vendors (
    vendor_id INTEGER PRIMARY KEY,
    vendor_name VARCHAR(255),
    category VARCHAR(255),
    delivery_score FLOAT,
    quality_score FLOAT,
    communication_score FLOAT,
    contract_compliance FLOAT,
    status VARCHAR(50)
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS purchase_orders (
    po_id INTEGER PRIMARY KEY,
    vendor_id INTEGER,
    product_name VARCHAR(255),
    quantity INTEGER,
    unit_price FLOAT,
    status VARCHAR(50)
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS contracts (
    contract_id INTEGER PRIMARY KEY,
    vendor_id INTEGER,
    contract_name VARCHAR(255),
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    contract_value FLOAT,
    status VARCHAR(50)
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS communications (
    communication_id INTEGER PRIMARY KEY,
    vendor_id INTEGER,
    subject VARCHAR(255),
    message TEXT,
    status VARCHAR(50)
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INTEGER PRIMARY KEY,
    vendor_id INTEGER,
    notification_type VARCHAR(255),
    message TEXT,
    status VARCHAR(50)
)
""")

conn.commit()
cursor.close()

print("Database tables created successfully!")

class Vendor(BaseModel):
    vendor_id: int
    vendor_name: str
    category: str
    delivery_score: float
    quality_score: float
    communication_score: float
    contract_compliance: float
    status: str = "Pending"

vendors = []


@app.get("/")
def home():
    return {
        "message": "Vendor Reliability Platform is working!"
    }


@app.post("/vendors")
def add_vendor(vendor: Vendor):

    cursor = conn.cursor()
    conn.rollback()

    cursor.execute("""
    INSERT INTO vendors
    (vendor_id, vendor_name, category, delivery_score,
     quality_score, communication_score, contract_compliance, status)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        vendor.vendor_id,
        vendor.vendor_name,
        vendor.category,
        vendor.delivery_score,
        vendor.quality_score,
        vendor.communication_score,
        vendor.contract_compliance,
        vendor.status
    ))

    conn.commit()
    cursor.close()

    reliability_score = (
        vendor.delivery_score
        + vendor.quality_score
        + vendor.communication_score
        + vendor.contract_compliance
    ) / 4

    return {
        "message": "Vendor added successfully",
        "vendor": vendor,
        "reliability_score": round(reliability_score, 2)
    }


@app.get("/vendors")
def get_vendors():

    cursor = conn.cursor()

    cursor.execute("""
    SELECT vendor_id, vendor_name, category,
           delivery_score, quality_score,
           communication_score, contract_compliance, status
    FROM vendors
    ORDER BY vendor_id
    """)

    rows = cursor.fetchall()
    cursor.close()

    vendor_list = []

    for row in rows:
        vendor_list.append({
            "vendor_id": row[0],
            "vendor_name": row[1],
            "category": row[2],
            "delivery_score": row[3],
            "quality_score": row[4],
            "communication_score": row[5],
            "contract_compliance": row[6],
            "status": row[7]
        })

    return {
        "total_vendors": len(vendor_list),
        "vendors": vendor_list
    }


class PurchaseOrder(BaseModel):
    po_id: int
    vendor_id: int
    product_name: str
    quantity: int
    unit_price: float
    status: str = "Pending"


purchase_orders = []


@app.post("/purchase-orders")
def add_purchase_order(po: PurchaseOrder):

    conn.rollback()

    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO purchase_orders
    (po_id, vendor_id, product_name, quantity, unit_price, status)
    VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        po.po_id,
        po.vendor_id,
        po.product_name,
        po.quantity,
        po.unit_price,
        po.status
    ))

    conn.commit()
    cursor.close()

    return {
        "message": "Purchase Order added successfully",
        "purchase_order": po
    }


@app.get("/purchase-orders")
def get_purchase_orders():

    cursor = conn.cursor()

    cursor.execute("""
    SELECT po_id, vendor_id, product_name,
           quantity, unit_price, status
    FROM purchase_orders
    ORDER BY po_id
    """)

    rows = cursor.fetchall()
    cursor.close()

    purchase_order_list = []

    for row in rows:
        purchase_order_list.append({
            "po_id": row[0],
            "vendor_id": row[1],
            "product_name": row[2],
            "quantity": row[3],
            "unit_price": row[4],
            "status": row[5]
        })

    return {
        "total_purchase_orders": len(purchase_order_list),
        "purchase_orders": purchase_order_list
    }
@app.put("/vendors/{vendor_id}/approve")
def approve_vendor(vendor_id: int):

    cursor = conn.cursor()

    cursor.execute("""
    UPDATE vendors
    SET status = 'Approved'
    WHERE vendor_id = %s
    RETURNING vendor_id
    """, (vendor_id,))

    row = cursor.fetchone()
    conn.commit()
    cursor.close()

    if row is None:
        return {
            "message": "Vendor not found"
        }

    return {
        "message": "Vendor approved successfully",
        "vendor_id": row[0],
        "status": "Approved"
    }
    # Contract Management

class Contract(BaseModel):
    contract_id: int
    vendor_id: int
    contract_name: str
    start_date: str
    end_date: str
    contract_value: float
    status: str = "Active"



contracts = []


@app.post("/contracts")
def add_contract(contract: Contract):

    conn.rollback()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO contracts
    (contract_id, vendor_id, contract_name, start_date,
     end_date, contract_value, status)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        contract.contract_id,
        contract.vendor_id,
        contract.contract_name,
        contract.start_date,
        contract.end_date,
        contract.contract_value,
        contract.status
    ))

    conn.commit()
    cursor.close()

    return {
        "message": "Contract added successfully",
        "contract": contract
    }


@app.get("/contracts")
def get_contracts():

    cursor = conn.cursor()

    cursor.execute("""
    SELECT contract_id, vendor_id, contract_name,
           start_date, end_date, contract_value, status
    FROM contracts
    ORDER BY contract_id
    """)

    rows = cursor.fetchall()
    cursor.close()

    contract_list = []

    for row in rows:
        contract_list.append({
            "contract_id": row[0],
            "vendor_id": row[1],
            "contract_name": row[2],
            "start_date": row[3],
            "end_date": row[4],
            "contract_value": row[5],
            "status": row[6]
        })

    return {
        "total_contracts": len(contract_list),
        "contracts": contract_list
    }
class ContractUpdate(BaseModel):
    contract_name: str
    start_date: str
    end_date: str
    status: str


@app.put("/contracts/{contract_id}")
def update_contract(contract_id: int, contract: ContractUpdate):

    conn.rollback()
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE contracts
    SET contract_name = %s,
        start_date = %s,
        end_date = %s,
        status = %s
    WHERE contract_id = %s
    """, (
        contract.contract_name,
        contract.start_date,
        contract.end_date,
        contract.status,
        contract_id
    ))

    if cursor.rowcount == 0:
        cursor.close()
        return {
            "message": "Contract not found"
        }

    conn.commit()

    cursor.execute("""
    SELECT contract_id, vendor_id, contract_name,
           start_date, end_date, contract_value, status
    FROM contracts
    WHERE contract_id = %s
    """, (contract_id,))

    row = cursor.fetchone()
    cursor.close()

    return {
        "message": "Contract updated successfully",
        "contract": {
            "contract_id": row[0],
            "vendor_id": row[1],
            "contract_name": row[2],
            "start_date": row[3],
            "end_date": row[4],
            "contract_value": row[5],
            "status": row[6]
        }
    }
@app.put("/contracts/{contract_id}/status")
def update_contract_status(contract_id: int, status: str):

    conn.rollback()
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE contracts
    SET status = %s
    WHERE contract_id = %s
    """, (status, contract_id))

    if cursor.rowcount == 0:
        cursor.close()
        return {
            "message": "Contract not found"
        }

    conn.commit()

    cursor.execute("""
    SELECT contract_id, vendor_id, contract_name,
           start_date, end_date, contract_value, status
    FROM contracts
    WHERE contract_id = %s
    """, (contract_id,))

    row = cursor.fetchone()
    cursor.close()

    return {
        "message": "Contract status updated successfully",
        "contract": {
            "contract_id": row[0],
            "vendor_id": row[1],
            "contract_name": row[2],
            "start_date": row[3],
            "end_date": row[4],
            "contract_value": row[5],
            "status": row[6]
        }
    }
@app.get("/contracts/expiry")
def check_contract_expiry():

    cursor = conn.cursor()

    cursor.execute("""
    SELECT contract_id,
           vendor_id,
           contract_name,
           start_date,
           end_date,
           contract_value,
           status
    FROM contracts
    WHERE status = 'Expired'
    """)

    rows = cursor.fetchall()
    cursor.close()

    expired_contracts = []

    for row in rows:
        expired_contracts.append({
            "contract_id": row[0],
            "vendor_id": row[1],
            "contract_name": row[2],
            "start_date": str(row[3]),
            "end_date": str(row[4]),
            "contract_value": row[5],
            "status": row[6]
        })

    return {
        "total_expired_contracts": len(expired_contracts),
        "expired_contracts": expired_contracts
    }
# Communication Workflow

class Communication(BaseModel):
    communication_id: int
    vendor_id: int
    subject: str
    message: str
    status: str = "Pending"


communications = []


@app.post("/communications")
def add_communication(communication: Communication):

    conn.rollback()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO communications
    (communication_id, vendor_id, subject, message, status)
    VALUES (%s, %s, %s, %s, %s)
    """, (
        communication.communication_id,
        communication.vendor_id,
        communication.subject,
        communication.message,
        communication.status
    ))

    conn.commit()
    cursor.close()

    return {
        "message": "Communication added successfully",
        "communication": communication
    }


@app.get("/communications")
def get_communications():

    cursor = conn.cursor()

    cursor.execute("""
    SELECT communication_id, vendor_id, subject,
           message, status
    FROM communications
    ORDER BY communication_id
    """)

    rows = cursor.fetchall()
    cursor.close()

    communication_list = []

    for row in rows:
        communication_list.append({
            "communication_id": row[0],
            "vendor_id": row[1],
            "subject": row[2],
            "message": row[3],
            "status": row[4]
        })

    return {
        "total_communications": len(communication_list),
        "communications": communication_list
    }
@app.put("/communications/{communication_id}/status")
def update_communication_status(communication_id: int, status: str):

    conn.rollback()
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE communications
    SET status = %s
    WHERE communication_id = %s
    """, (status, communication_id))

    if cursor.rowcount == 0:
        cursor.close()
        return {
            "message": "Communication not found"
        }

    conn.commit()

    cursor.execute("""
    SELECT communication_id, vendor_id, subject,
           message, status
    FROM communications
    WHERE communication_id = %s
    """, (communication_id,))

    row = cursor.fetchone()
    cursor.close()

    return {
        "message": "Communication status updated successfully",
        "communication": {
            "communication_id": row[0],
            "vendor_id": row[1],
            "subject": row[2],
            "message": row[3],
            "status": row[4]
        }
    }
@app.get("/communications/vendor/{vendor_id}")
def get_vendor_communications(vendor_id: int):

    cursor = conn.cursor()

    cursor.execute("""
    SELECT communication_id,
           vendor_id,
           subject,
           message,
           status
    FROM communications
    WHERE vendor_id = %s
    ORDER BY communication_id
    """, (vendor_id,))

    rows = cursor.fetchall()
    cursor.close()

    communication_list = []

    for row in rows:
        communication_list.append({
            "communication_id": row[0],
            "vendor_id": row[1],
            "subject": row[2],
            "message": row[3],
            "status": row[4]
        })

    return {
        "vendor_id": vendor_id,
        "total_communications": len(communication_list),
        "communications": communication_list
    }
@app.put("/vendors/{vendor_id}/status")
def update_vendor_status(vendor_id: int, status: str):

    conn.rollback()
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE vendors
    SET status = %s
    WHERE vendor_id = %s
    """, (status, vendor_id))

    if cursor.rowcount == 0:
        cursor.close()
        return {
            "message": "Vendor not found"
        }

    conn.commit()

    cursor.execute("""
    SELECT vendor_id, vendor_name, category,
           delivery_score, quality_score,
           communication_score, contract_compliance, status
    FROM vendors
    WHERE vendor_id = %s
    """, (vendor_id,))

    row = cursor.fetchone()
    cursor.close()

    return {
        "message": "Vendor status updated successfully",
        "vendor": {
            "vendor_id": row[0],
            "vendor_name": row[1],
            "category": row[2],
            "delivery_score": row[3],
            "quality_score": row[4],
            "communication_score": row[5],
            "contract_compliance": row[6],
            "status": row[7]
        }
    }
@app.put("/vendors/{vendor_id}/status")
def update_vendor_status(vendor_id: int, status: str):

    conn.rollback()
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE vendors
    SET status = %s
    WHERE vendor_id = %s
    """, (status, vendor_id))

    if cursor.rowcount == 0:
        cursor.close()
        return {
            "message": "Vendor not found"
        }

    conn.commit()

    cursor.execute("""
    SELECT vendor_id, vendor_name, category,
           delivery_score, quality_score,
           communication_score, contract_compliance, status
    FROM vendors
    WHERE vendor_id = %s
    """, (vendor_id,))

    row = cursor.fetchone()
    cursor.close()

    return {
        "message": "Vendor status updated successfully",
        "vendor": {
            "vendor_id": row[0],
            "vendor_name": row[1],
            "category": row[2],
            "delivery_score": row[3],
            "quality_score": row[4],
            "communication_score": row[5],
            "contract_compliance": row[6],
            "status": row[7]
        }
    }
class VendorScoreUpdate(BaseModel):
    communication_score: float
    contract_compliance: float


@app.put("/vendors/{vendor_id}/scores")
def update_vendor_scores(vendor_id: int, scores: VendorScoreUpdate):

    conn.rollback()
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE vendors
    SET communication_score = %s,
        contract_compliance = %s
    WHERE vendor_id = %s
    """, (
        scores.communication_score,
        scores.contract_compliance,
        vendor_id
    ))

    if cursor.rowcount == 0:
        cursor.close()
        return {
            "message": "Vendor not found"
        }

    conn.commit()
    cursor.close()

    return {
        "message": "Vendor scores updated successfully",
        "vendor_id": vendor_id,
        "communication_score": scores.communication_score,
        "contract_compliance": scores.contract_compliance
    }
@app.put("/purchase-orders/{po_id}/status")
def update_purchase_order_status(po_id: int, status: str):

    conn.rollback()
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE purchase_orders
    SET status = %s
    WHERE po_id = %s
    """, (status, po_id))

    if cursor.rowcount == 0:
        cursor.close()
        return {
            "message": "Purchase Order not found"
        }

    conn.commit()

    cursor.execute("""
    SELECT po_id, vendor_id, product_name,
           quantity, unit_price, status
    FROM purchase_orders
    WHERE po_id = %s
    """, (po_id,))

    row = cursor.fetchone()
    cursor.close()

    return {
        "message": "Purchase Order status updated successfully",
        "purchase_order": {
            "po_id": row[0],
            "vendor_id": row[1],
            "product_name": row[2],
            "quantity": row[3],
            "unit_price": row[4],
            "status": row[5]
        }
    }
 # Vendor Performance Module

@app.get("/vendors/{vendor_id}/performance")
def get_vendor_performance(vendor_id: int):

    cursor = conn.cursor()

    cursor.execute("""
    SELECT vendor_id,
           vendor_name,
           delivery_score,
           quality_score,
           communication_score,
           contract_compliance
    FROM vendors
    WHERE vendor_id = %s
    """, (vendor_id,))

    row = cursor.fetchone()
    cursor.close()

    if row is None:
        return {
            "message": "Vendor not found"
        }

    performance_score = (
        row[2]
        + row[3]
        + row[4]
        + row[5]
    ) / 4

    return {
        "vendor_id": row[0],
        "vendor_name": row[1],
        "delivery_performance": row[2],
        "quality_rating": row[3],
        "communication_score": row[4],
        "contract_compliance": row[5],
        "overall_performance": round(performance_score, 2)
    }
    # Reliability Scoring Module

@app.get("/vendors/{vendor_id}/reliability-score")
def get_vendor_reliability_score(vendor_id: int):

    cursor = conn.cursor()

    cursor.execute("""
    SELECT vendor_id,
           vendor_name,
           delivery_score,
           quality_score,
           communication_score,
           contract_compliance
    FROM vendors
    WHERE vendor_id = %s
    """, (vendor_id,))

    row = cursor.fetchone()
    cursor.close()

    if row is None:
        return {
            "message": "Vendor not found"
        }

    reliability_score = (
        row[2]
        + row[3]
        + row[4]
        + row[5]
    ) / 4

    if reliability_score >= 80:
        risk_level = "Low"
    elif reliability_score >= 60:
        risk_level = "Medium"
    else:
        risk_level = "High"

    return {
        "vendor_id": row[0],
        "vendor_name": row[1],
        "reliability_score": round(reliability_score, 2),
        "risk_level": risk_level
    }
# Performance Metrics Module

@app.get("/vendors/{vendor_id}/metrics")
def get_vendor_metrics(vendor_id: int):

    cursor = conn.cursor()

    cursor.execute("""
    SELECT vendor_id,
           vendor_name,
           delivery_score,
           quality_score,
           communication_score,
           contract_compliance
    FROM vendors
    WHERE vendor_id = %s
    """, (vendor_id,))

    row = cursor.fetchone()
    cursor.close()

    if row is None:
        return {
            "message": "Vendor not found"
        }

    return {
        "vendor_id": row[0],
        "vendor_name": row[1],
        "on_time_delivery": row[2],
        "delayed_delivery": round(100 - row[2], 2),
        "quality_rating": row[3],
        "communication_score": row[4],
        "contract_compliance": row[5]
    }
# Vendor Ranking Module

@app.get("/vendors/ranking")
def get_vendor_ranking():

    cursor = conn.cursor()

    cursor.execute("""
    SELECT vendor_id,
           vendor_name,
           delivery_score,
           quality_score,
           communication_score,
           contract_compliance
    FROM vendors
    """)

    rows = cursor.fetchall()
    cursor.close()

    if not rows:
        return {
            "message": "No vendors available"
        }

    ranked_vendors = []

    for row in rows:

        reliability_score = (
            row[2]
            + row[3]
            + row[4]
            + row[5]
        ) / 4

        ranked_vendors.append({
            "vendor_id": row[0],
            "vendor_name": row[1],
            "reliability_score": round(reliability_score, 2)
        })

    ranked_vendors.sort(
        key=lambda x: x["reliability_score"],
        reverse=True
    )

    for index, vendor in enumerate(ranked_vendors, start=1):
        vendor["rank"] = index

    return {
        "total_vendors": len(ranked_vendors),
        "vendor_ranking": ranked_vendors
    }
# Vendor Risk Level Module

@app.get("/vendors/{vendor_id}/risk")
def get_vendor_risk(vendor_id: int):

    cursor = conn.cursor()

    cursor.execute("""
    SELECT vendor_id,
           vendor_name,
           delivery_score,
           quality_score,
           communication_score,
           contract_compliance
    FROM vendors
    WHERE vendor_id = %s
    """, (vendor_id,))

    row = cursor.fetchone()
    cursor.close()

    if row is None:
        return {
            "message": "Vendor not found"
        }

    reliability_score = (
        row[2]
        + row[3]
        + row[4]
        + row[5]
    ) / 4

    if reliability_score >= 80:
        risk_level = "Low"
    elif reliability_score >= 60:
        risk_level = "Medium"
    else:
        risk_level = "High"

    return {
        "vendor_id": row[0],
        "vendor_name": row[1],
        "reliability_score": round(reliability_score, 2),
        "risk_level": risk_level
    }
# Analytics Dashboard Module

@app.get("/analytics/dashboard")
def get_analytics_dashboard():

    cursor = conn.cursor()

    # Vendor statistics
    cursor.execute("""
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'Active'),
        COUNT(*) FILTER (WHERE status = 'Approved')
    FROM vendors
    """)

    vendor_data = cursor.fetchone()

    # Purchase Order statistics
    cursor.execute("""
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'Pending'),
        COUNT(*) FILTER (WHERE status = 'Delivered'),
        COUNT(*) FILTER (WHERE status = 'Completed')
    FROM purchase_orders
    """)

    po_data = cursor.fetchone()

    # Contract statistics
    cursor.execute("""
    SELECT COUNT(*)
    FROM contracts
    """)

    contract_data = cursor.fetchone()

    # Communication statistics
    cursor.execute("""
    SELECT COUNT(*)
    FROM communications
    """)

    communication_data = cursor.fetchone()

    cursor.close()

    return {
        "total_vendors": vendor_data[0],
        "active_vendors": vendor_data[1],
        "approved_vendors": vendor_data[2],
        "total_purchase_orders": po_data[0],
        "pending_orders": po_data[1],
        "delivered_orders": po_data[2],
        "completed_orders": po_data[3],
        "total_contracts": contract_data[0],
        "total_communications": communication_data[0]
    }
# Procurement Analytics Module

@app.get("/analytics/procurement")
def get_procurement_analytics():

    cursor = conn.cursor()

    cursor.execute("""
    SELECT
        COUNT(*),
        COALESCE(SUM(quantity * unit_price), 0),
        COUNT(*) FILTER (WHERE status = 'Completed'),
        COUNT(*) FILTER (WHERE status = 'Delivered'),
        COUNT(*) FILTER (WHERE status = 'Pending')
    FROM purchase_orders
    """)

    row = cursor.fetchone()
    cursor.close()

    total_orders = row[0]
    total_procurement_cost = row[1]
    completed_orders = row[2]
    delivered_orders = row[3]
    pending_orders = row[4]

    if total_orders > 0:
        order_completion_rate = (completed_orders / total_orders) * 100
    else:
        order_completion_rate = 0

    return {
        "total_purchase_orders": total_orders,
        "total_procurement_cost": round(float(total_procurement_cost), 2),
        "completed_orders": completed_orders,
        "delivered_orders": delivered_orders,
        "pending_orders": pending_orders,
        "order_completion_rate": round(order_completion_rate, 2)
    }
# Notification System Module

class Notification(BaseModel):
    notification_id: int
    vendor_id: int
    notification_type: str
    message: str
    status: str = "Unread"

notifications = []


@app.post("/notifications")
def add_notification(notification: Notification):

    conn.rollback()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO notifications
    (notification_id, vendor_id, notification_type, message, status)
    VALUES (%s, %s, %s, %s, %s)
    """, (
        notification.notification_id,
        notification.vendor_id,
        notification.notification_type,
        notification.message,
        notification.status
    ))

    conn.commit()
    cursor.close()

    return {
        "message": "Notification created successfully",
        "notification": notification
    }

@app.get("/notifications")
def get_notifications():

    cursor = conn.cursor()

    cursor.execute("""
    SELECT notification_id, vendor_id,
           notification_type, message, status
    FROM notifications
    ORDER BY notification_id
    """)

    rows = cursor.fetchall()
    cursor.close()

    notification_list = []

    for row in rows:
        notification_list.append({
            "notification_id": row[0],
            "vendor_id": row[1],
            "notification_type": row[2],
            "message": row[3],
            "status": row[4]
        })

    return {
        "total_notifications": len(notification_list),
        "notifications": notification_list
    }


@app.put("/notifications/{notification_id}/status")
def update_notification_status(notification_id: int, status: str):

    conn.rollback()
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE notifications
    SET status = %s
    WHERE notification_id = %s
    """, (status, notification_id))

    if cursor.rowcount == 0:
        cursor.close()
        return {
            "message": "Notification not found"
        }

    conn.commit()

    cursor.execute("""
    SELECT notification_id, vendor_id,
           notification_type, message, status
    FROM notifications
    WHERE notification_id = %s
    """, (notification_id,))

    row = cursor.fetchone()
    cursor.close()

    return {
        "message": "Notification status updated successfully",
        "notification": {
            "notification_id": row[0],
            "vendor_id": row[1],
            "notification_type": row[2],
            "message": row[3],
            "status": row[4]
        }
    }

@app.get("/dashboard/summary")
def dashboard_summary():

    cursor = conn.cursor()

    # Total vendors
    cursor.execute("""
    SELECT COUNT(*)
    FROM vendors
    """)

    total_vendors = cursor.fetchone()[0]

    # Average vendor performance
    cursor.execute("""
    SELECT AVG(
        (delivery_score
        + quality_score
        + communication_score
        + contract_compliance) / 4
    )
    FROM vendors
    """)

    average_performance = cursor.fetchone()[0]

    if average_performance is None:
        average_performance = 0

    # Total notifications
    cursor.execute("""
    SELECT COUNT(*)
    FROM notifications
    """)

    total_notifications = cursor.fetchone()[0]

    # Unread notifications
    cursor.execute("""
    SELECT COUNT(*)
    FROM notifications
    WHERE status = 'Unread'
    """)

    unread_notifications = cursor.fetchone()[0]

    cursor.close()

    return {
        "total_vendors": total_vendors,
        "average_performance": round(float(average_performance), 2),
        "total_notifications": total_notifications,
        "unread_notifications": unread_notifications
    }
@app.get("/dashboard/risk-summary")
def dashboard_risk_summary():

    cursor = conn.cursor()

    cursor.execute("""
    SELECT delivery_score,
           quality_score,
           communication_score,
           contract_compliance
    FROM vendors
    """)

    rows = cursor.fetchall()
    cursor.close()

    low_risk = 0
    medium_risk = 0
    high_risk = 0

    for row in rows:

        performance = (
            row[0]
            + row[1]
            + row[2]
            + row[3]
        ) / 4

        if performance >= 80:
            low_risk += 1
        elif performance >= 60:
            medium_risk += 1
        else:
            high_risk += 1

    return {
        "low_risk_vendors": low_risk,
        "medium_risk_vendors": medium_risk,
        "high_risk_vendors": high_risk
    }
@app.get("/dashboard/notification-summary")
def dashboard_notification_summary():

    cursor = conn.cursor()

    # Total notifications
    cursor.execute("""
    SELECT COUNT(*)
    FROM notifications
    """)

    total_notifications = cursor.fetchone()[0]

    # Unread notifications
    cursor.execute("""
    SELECT COUNT(*)
    FROM notifications
    WHERE status = 'Unread'
    """)

    unread_notifications = cursor.fetchone()[0]

    # Read notifications
    cursor.execute("""
    SELECT COUNT(*)
    FROM notifications
    WHERE status = 'Read'
    """)

    read_notifications = cursor.fetchone()[0]

    cursor.close()

    return {
        "total_notifications": total_notifications,
        "unread_notifications": unread_notifications,
        "read_notifications": read_notifications
    }