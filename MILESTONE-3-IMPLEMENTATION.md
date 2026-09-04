# Milestone 3 — Vendor Performance & Analytics (Weeks 5 & 6)

## Completed implementation

### 1. Vendor Performance
- Existing performance CRUD retained.
- Delivery, quality, reliability and overall scores exposed through `/performance/`.
- Analytics consumes performance records for ranking and trend charts.

### 2. Reliability Scoring
- Added `/reliability/` endpoint.
- Reliability score combines the latest vendor performance score (65%) and completed/delivered order completion rate (35%).
- Risk levels: Low (80+), Medium (60–79), High (<60).
- Supplier ranking and procurement recommendations are returned.
- Added `/reliability/summary` for KPI and risk distribution data.

### 3. Analytics Dashboard
- Added `/analytics/` procurement analytics endpoint.
- Returns vendor, PR, PO, spend, performance, PO-status and delivery-status KPIs.
- Existing Angular Analytics page continues to display vendor performance charts.

### 4. Notification System
- Added `/notifications/` endpoint with procurement, vendor, delivery and contract alerts derived from current platform data.
- Existing Angular notification screen can consume these alerts.

### 5. Reports
- Added report APIs for vendor performance and procurement/PO reports.
- Added CSV, Excel and PDF purchase-order exports.

### 6. Procurement Analytics
- Spend, PO status, completed orders, pending requests, delivery status and average performance are available through `/analytics/`.

## Demo endpoints
- `/reliability/`
- `/reliability/summary`
- `/analytics/`
- `/notifications/`
- `/reports/vendor-performance`
- `/reports/procurement`
- `/reports/purchase-orders.csv`
- `/reports/purchase-orders.xlsx`
- `/reports/purchase-orders.pdf`

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```
