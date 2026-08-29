import os

file_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\backend\main.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    if not deliveries:
        # If no deliveries, assume basic score of 70 (3.5 rating) for new vendor to show updates
        v.rating = 3.5
        v.risk_level = "Low"
        db.commit()
        return {"score": v.rating * 20, "risk_level": v.risk_level}'''

replacement = '''    if not deliveries:
        # If no deliveries, assume basic score of 70 (3.5 rating) for new vendor to show updates
        v.rating = 3.5
        v.risk_level = "Low"
        db.commit()
        return {
            "score": v.rating * 20, 
            "risk_level": v.risk_level,
            "delayed_count": 0,
            "details": {
                "on_time_delivery": 100.0,
                "completion_rate": 100.0,
                "quality_score": 100.0,
                "compliance": 100.0,
                "invoice_accuracy": 100.0
            }
        }'''

content = content.replace(target, replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed calculate_score early return to include details dict")
