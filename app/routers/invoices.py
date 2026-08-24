from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.security import get_current_user

router = APIRouter(prefix='/invoices', tags=['Invoice Management'])

@router.get('/')
def invoices(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(models.Invoice).order_by(models.Invoice.id.desc()).all()

@router.post('/')
def create_invoice(payload: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    row=models.Invoice(**{k:payload.get(k) for k in ['po_id','vendor_name','invoice_number','amount','status','invoice_date','due_date','document_path']})
    db.add(row); db.add(models.ActivityLog(actor=current_user['email'], action='Invoice created', module='Procurement', details=row.invoice_number)); db.commit(); db.refresh(row); return row

@router.put('/{invoice_id}/status')
def update_invoice_status(invoice_id:int, payload:dict, db:Session=Depends(get_db), current_user=Depends(get_current_user)):
    row=db.query(models.Invoice).filter(models.Invoice.id==invoice_id).first()
    if not row: return {'error':'Invoice not found'}
    row.status=payload.get('status',row.status); db.add(models.ActivityLog(actor=current_user['email'], action='Invoice status updated', module='Finance', details=f'{row.invoice_number}: {row.status}')); db.commit(); db.refresh(row); return row
