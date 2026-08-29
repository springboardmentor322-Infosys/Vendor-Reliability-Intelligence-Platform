import os

file_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\backend\main.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    v.risk_level = risk_level
    # Save history
    db.add(models.VendorRiskHistory(vendor_id=vendor_id, score=score, risk_level=risk_level))
    db.commit()'''

replacement = '''    v.risk_level = risk_level
    v.rating = score / 20.0
    
    # Save history
    db.add(models.VendorRiskHistory(vendor_id=vendor_id, score=score, risk_level=risk_level))
    db.commit()'''

content = content.replace(target, replacement)

# Also fix the early return if no deliveries exist
early_return = '''    deliveries = db.query(models.DeliveryTracking).filter(models.DeliveryTracking.vendor_id == vendor_id).all()
    if not deliveries:
        return {"score": v.rating * 20, "risk_level": v.risk_level}'''

early_return_replacement = '''    deliveries = db.query(models.DeliveryTracking).filter(models.DeliveryTracking.vendor_id == vendor_id).all()
    if not deliveries:
        # If no deliveries, assume basic score of 70 (3.5 rating) for new vendor to show updates
        v.rating = 3.5
        v.risk_level = "Low"
        db.commit()
        return {"score": v.rating * 20, "risk_level": v.risk_level}'''

content = content.replace(early_return, early_return_replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed calculate_score in main.py")
