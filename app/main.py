from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from app.database import Base, engine
from app import models
from app.routers import (users, vendors, procurement, purchase_orders, performance, dashboard, contracts, reliability, analytics, notifications, reports, communication, invoices, compliance)

Base.metadata.create_all(bind=engine)

def _ensure_legacy_columns():
    inspector=inspect(engine)
    migrations={
        'vendor_performance': {
            'on_time_deliveries':'INTEGER DEFAULT 0','delayed_deliveries':'INTEGER DEFAULT 0','response_time_hours':'INTEGER DEFAULT 0','issue_resolution_time_hours':'INTEGER DEFAULT 0','service_rating':'INTEGER DEFAULT 0','order_completion_rate':'INTEGER DEFAULT 0', 'performance_period':"VARCHAR DEFAULT 'Current'"},
        'vendors': {'website':"VARCHAR DEFAULT ''",'registration_date':"VARCHAR DEFAULT ''",'approval_date':"VARCHAR DEFAULT ''"},
        'procurement_requests': {'vendor_name':"VARCHAR DEFAULT ''",'estimated_cost':'INTEGER DEFAULT 0','approval_comment':"VARCHAR DEFAULT ''"},
        'purchase_orders': {'expected_delivery_date':"VARCHAR DEFAULT ''",'actual_delivery_date':"VARCHAR DEFAULT ''",'invoice_status':"VARCHAR DEFAULT 'Pending'",'proof_of_delivery':"VARCHAR DEFAULT ''"},
        'contracts': {'terms':"TEXT DEFAULT ''",'compliance_flag':"VARCHAR DEFAULT 'Active'",'document_path':"VARCHAR DEFAULT ''",'status':"VARCHAR DEFAULT 'Active'"},
    }
    with engine.begin() as conn:
        tables=set(inspector.get_table_names())
        for table, cols in migrations.items():
            if table not in tables: continue
            existing={c['name'] for c in inspector.get_columns(table)}
            for name, typ in cols.items():
                if name not in existing:
                    conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {typ}'))

_ensure_legacy_columns()

app=FastAPI(title='Vendor Reliability Intelligence Platform', version='2.0.0', description='Vendor Reliability Intelligence & Procurement Risk Management Platform')
app.add_middleware(CORSMiddleware, allow_origin_regex=r'http://(localhost|127\.0\.0\.1):(4200|4201)', allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

for router in [users.router, vendors.router, procurement.router, purchase_orders.router, performance.router, dashboard.router, contracts.router, reliability.router, analytics.router, notifications.router, reports.router, communication.router, invoices.router, compliance.router]:
    app.include_router(router)

@app.get('/')
def home():
    return {'status':'success','message':'Vendor Reliability Intelligence Platform API Running','modules':['Authentication','Vendor Management','Procurement','Vendor Performance','Reliability','Contracts & Compliance','Communication','Dashboards & Analytics','Notifications','Reports & Export']}
