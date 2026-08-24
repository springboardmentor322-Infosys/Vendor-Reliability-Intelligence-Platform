from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.security import get_current_user

router = APIRouter(prefix='/communication', tags=['Communication'])

@router.get('/')
def list_messages(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(models.Communication).order_by(models.Communication.id.desc()).all()

@router.post('/')
def send_message(payload: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    row = models.Communication(vendor_name=payload.get('vendor_name',''), sender=current_user['email'], recipient=payload.get('recipient',''), subject=payload.get('subject',''), message=payload.get('message',''), channel=payload.get('channel','In-App'), file_name=payload.get('file_name',''))
    db.add(row)
    db.add(models.ActivityLog(actor=current_user['email'], action='Message sent', module='Communication', details=row.subject))
    db.commit(); db.refresh(row)
    return row

@router.post('/share-file')
def share_file(payload: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    row = models.Communication(vendor_name=payload.get('vendor_name',''), sender=current_user['email'], recipient=payload.get('recipient',''), subject='File shared', message=payload.get('message',''), channel='File Sharing', file_name=payload.get('file_name',''))
    db.add(row); db.add(models.ActivityLog(actor=current_user['email'], action='File shared', module='Communication', details=row.file_name)); db.commit(); db.refresh(row)
    return row

@router.get('/activity')
def activity_logs(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(models.ActivityLog).order_by(models.ActivityLog.id.desc()).limit(100).all()
