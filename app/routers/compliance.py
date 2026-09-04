from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.security import get_current_user

router=APIRouter(prefix='/compliance', tags=['Compliance & Certifications'])

@router.get('/certifications')
def certifications(db:Session=Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(models.Certification).order_by(models.Certification.id.desc()).all()

@router.post('/certifications')
def add_certification(payload:dict, db:Session=Depends(get_db), current_user=Depends(get_current_user)):
    row=models.Certification(**{k:payload.get(k,'') for k in ['vendor_name','certification_name','certificate_number','issue_date','expiry_date','status','document_path']})
    db.add(row); db.add(models.ActivityLog(actor=current_user['email'],action='Certification added',module='Compliance',details=row.certification_name)); db.commit(); db.refresh(row); return row

@router.get('/documents')
def documents(db:Session=Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(models.VendorDocument).order_by(models.VendorDocument.id.desc()).all()

@router.post('/documents')
def add_document(payload:dict, db:Session=Depends(get_db), current_user=Depends(get_current_user)):
    row=models.VendorDocument(vendor_name=payload.get('vendor_name',''),document_type=payload.get('document_type',''),file_name=payload.get('file_name',''),file_path=payload.get('file_path',''),uploaded_by=current_user['email'])
    db.add(row); db.add(models.ActivityLog(actor=current_user['email'],action='Vendor document uploaded',module='Compliance',details=row.file_name)); db.commit(); db.refresh(row); return row

@router.get('/summary')
def summary(db:Session=Depends(get_db), current_user=Depends(get_current_user)):
    contracts=db.query(models.Contract).all(); certs=db.query(models.Certification).all()
    return {'total_contracts':len(contracts),'compliant_contracts':sum(c.compliance_flag.lower() in {'active','compliant'} for c in contracts),'at_risk_contracts':sum(c.compliance_flag.lower() not in {'active','compliant'} for c in contracts),'certifications':len(certs),'valid_certifications':sum(c.status.lower()=='valid' for c in certs)}
