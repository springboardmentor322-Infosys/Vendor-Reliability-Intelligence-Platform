import os

file_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\backend\main.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

renew_endpoint = '''
@app.post("/api/contracts/{contract_id}/renew", response_model=ContractResponse, tags=["Contracts"])
def renew_contract(contract_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(allow_admin_procumentor)):
    db_contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    from datetime import timedelta
    db_contract.expiry_date = db_contract.expiry_date + timedelta(days=365)
    db_contract.status = "Active"
    
    db.commit()
    db.refresh(db_contract)
    services.AuditService.log_action(db, f"Renewed Contract {contract_id} for 1 year", "Contract", contract_id, current_user.id)
    return db_contract
'''

# Insert it before get_or_create_thread
target = '@app.get("/api/threads/{entity_type}/{entity_id}",'
content = content.replace(target, renew_endpoint + '\n' + target)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added renew endpoint to main.py")
