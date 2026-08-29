import os
import re

models_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\backend\models.py'
main_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\backend\main.py'

# 1. Add Budget model
with open(models_path, 'r', encoding='utf-8') as f:
    models_content = f.read()

if 'class Budget(Base):' not in models_content:
    budget_model = """
class Budget(Base):
    __tablename__ = "budgets"
    id = Column(Integer, primary_key=True, index=True)
    department = Column(String(100), unique=True, index=True)
    allocated_limit = Column(Float, default=0.0)
"""
    models_content += budget_model
    with open(models_path, 'w', encoding='utf-8') as f:
        f.write(models_content)
    print("Added Budget model.")

# 2. Add endpoints and update analytics/csv in main.py
with open(main_path, 'r', encoding='utf-8') as f:
    main_content = f.read()

# Add BudgetCreate schema and endpoints if not present
if 'class BudgetCreate(BaseModel):' not in main_content:
    endpoints_code = """
class BudgetCreate(BaseModel):
    department: str
    limit: float

@app.get("/api/budgets", tags=["Finance"])
def get_budgets(db: Session = Depends(database.get_db)):
    return db.query(models.Budget).all()

@app.post("/api/budgets", tags=["Finance"])
def set_budget(req: BudgetCreate, db: Session = Depends(database.get_db)):
    budget = db.query(models.Budget).filter(models.Budget.department == req.department).first()
    if budget:
        budget.allocated_limit = req.limit
    else:
        budget = models.Budget(department=req.department, allocated_limit=req.limit)
        db.add(budget)
    db.commit()
    return {"status": "success", "message": "Budget updated"}
"""
    # Insert right before /api/analytics/finance
    main_content = main_content.replace('@app.get("/api/analytics/finance")', endpoints_code + '\n@app.get("/api/analytics/finance")')
    print("Added budget endpoints.")

# Update finance analytics
old_analytics_budget = """    # Department Budgets
    base_budgets = {
        "IT": 500000.0,
        "HR": 200000.0,
        "Operations": 800000.0,
        "Marketing": 300000.0,
        "Facilities": 150000.0
    }
    
    dep_spending = {}
    for pr in prs:
        if pr.approval_status == 'Approved':
            dep = pr.department or "Unknown"
            dep_spending[dep] = dep_spending.get(dep, 0.0) + pr.total_cost
            
    department_budgets = []
    for dep, limit in base_budgets.items():
        used = dep_spending.get(dep, 0.0)
        department_budgets.append({
            "department": dep,
            "limit": limit,
            "used": used,
            "remaining": max(0.0, limit - used)
        })
    
    total_po_value = sum(po.total_amount for po in db.query(models.PurchaseOrder).all())
    pending_invoices_count = len([inv for inv in invoices if inv.status == 'Pending'])
    paid_invoices_count = len([inv for inv in invoices if inv.status == 'Paid'])
    pending_approvals_count = len([pr for pr in prs if pr.approval_status == 'Pending'])
    overdue_payments_count = len([inv for inv in invoices if inv.status == 'Overdue']) or 2 # mock 2 if none for UI
    
    total_budget = sum(limit for dep, limit in base_budgets.items())"""

new_analytics_budget = """    # Department Budgets
    dep_spending = {}
    for pr in prs:
        if pr.approval_status == 'Approved':
            dep = pr.department or "Unknown"
            dep_spending[dep] = dep_spending.get(dep, 0.0) + pr.total_cost
            
    db_budgets = db.query(models.Budget).all()
    if not db_budgets:
        base_budgets = {"IT": 500000.0, "HR": 200000.0, "Operations": 800000.0, "Marketing": 300000.0, "Facilities": 150000.0}
        for dep, limit in base_budgets.items():
            db.add(models.Budget(department=dep, allocated_limit=limit))
        db.commit()
        db_budgets = db.query(models.Budget).all()
            
    department_budgets = []
    for b in db_budgets:
        used = dep_spending.get(b.department, 0.0)
        department_budgets.append({
            "department": b.department,
            "limit": b.allocated_limit,
            "used": used,
            "remaining": max(0.0, b.allocated_limit - used)
        })
    
    total_po_value = sum(po.total_amount for po in db.query(models.PurchaseOrder).all())
    pending_invoices_count = len([inv for inv in invoices if inv.status == 'Pending'])
    paid_invoices_count = len([inv for inv in invoices if inv.status == 'Paid'])
    pending_approvals_count = len([pr for pr in prs if pr.approval_status == 'Pending'])
    overdue_payments_count = len([inv for inv in invoices if inv.status == 'Overdue']) or 2 # mock 2 if none for UI
    
    total_budget = sum(b.allocated_limit for b in db_budgets)"""

if 'sum(limit for dep, limit in base_budgets.items())' in main_content:
    main_content = main_content.replace(old_analytics_budget, new_analytics_budget)
    print("Updated finance analytics logic.")


# Update finance_csv export
old_csv_budget = """    # Department Budgets
    base_budgets = {
        "IT": 500000.0,
        "HR": 200000.0,
        "Operations": 800000.0,
        "Marketing": 300000.0,
        "Facilities": 150000.0
    }
    
    dep_spending = {}
    for pr in prs:
        if pr.approval_status == 'Approved':
            dep = pr.department or "Unknown"
            dep_spending[dep] = dep_spending.get(dep, 0.0) + pr.total_cost
            
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Department", "Allocated Budget (INR)", "Used Budget (INR)", "Remaining Budget (INR)", "Budget Utilization (%)"
    ])
    
    for dep, limit in base_budgets.items():
        used = dep_spending.get(dep, 0.0)
        remaining = max(0.0, limit - used)
        utilization = round((used / limit) * 100, 2) if limit > 0 else 0
        writer.writerow([dep, limit, used, remaining, utilization])"""

new_csv_budget = """    dep_spending = {}
    for pr in prs:
        if pr.approval_status == 'Approved':
            dep = pr.department or "Unknown"
            dep_spending[dep] = dep_spending.get(dep, 0.0) + pr.total_cost
            
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Department", "Allocated Budget (INR)", "Used Budget (INR)", "Remaining Budget (INR)", "Budget Utilization (%)"
    ])
    
    db_budgets = db.query(models.Budget).all()
    for b in db_budgets:
        used = dep_spending.get(b.department, 0.0)
        remaining = max(0.0, b.allocated_limit - used)
        utilization = round((used / b.allocated_limit) * 100, 2) if b.allocated_limit > 0 else 0
        writer.writerow([b.department, b.allocated_limit, used, remaining, utilization])"""

if 'for dep, limit in base_budgets.items():' in main_content:
    main_content = main_content.replace(old_csv_budget, new_csv_budget)
    print("Updated finance_csv logic.")


with open(main_path, 'w', encoding='utf-8') as f:
    f.write(main_content)

