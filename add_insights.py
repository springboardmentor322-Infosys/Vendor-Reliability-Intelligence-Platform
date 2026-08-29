import os

file_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\backend\main.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

insights_endpoint = '''
@app.get("/api/intelligence/insights", tags=["Intelligence"])
def get_ai_insights(db: Session = Depends(database.get_db)):
    """Mock AI predictive insights based on dataset"""
    # Calculate some real metrics
    vendors = db.query(models.Vendor).all()
    avg_rel = sum([v.reliability_score for v in vendors]) / len(vendors) if vendors else 0
    
    pos = db.query(models.PurchaseOrder).all()
    delayed = len([p for p in pos if p.fulfillment_status == 'Delayed'])
    
    contracts = db.query(models.Contract).all()
    expiring = len([c for c in contracts if c.status == 'Expiring'])

    insights = [
        {
            "color": "emerald",
            "message": f"Vendor reliability averaging at <strong class='text-emerald-400 light:text-emerald-600'>{round(avg_rel, 1)}%</strong> this month."
        },
        {
            "color": "amber",
            "message": f"<strong class='text-amber-400 light:text-amber-600'>{delayed}</strong> active deliveries are currently facing delays."
        },
        {
            "color": "blue",
            "message": f"High-risk vendors successfully tracked and managed by platform."
        },
        {
            "color": "rose",
            "message": f"<strong class='text-rose-400 light:text-rose-600'>{expiring}</strong> contracts require renewal within the next 30 days."
        }
    ]
    return insights
'''

if 'def get_ai_insights' not in content:
    target = '@app.get("/api/intelligence/notifications")'
    content = content.replace(target, insights_endpoint + '\n' + target)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added insights endpoint")
else:
    print("Already exists")
