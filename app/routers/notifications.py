from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app import models
from app.security import get_current_user

router = APIRouter(prefix='/notifications', tags=['Notifications'])

@router.get('/')
def notifications(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    stored=db.query(models.Notification).filter((models.Notification.user_email=='') | (models.Notification.user_email==current_user['email'])).order_by(models.Notification.id.desc()).all()
    items=[]
    pending=db.query(models.ProcurementRequest).filter(models.ProcurementRequest.status=='Pending').count()
    if pending: items.append(models.Notification(user_email=current_user['email'],notification_type='Procurement Alert',title='Procurement approval required',message=f'{pending} request(s) pending approval',severity='warning'))
    delayed=db.query(models.PurchaseOrder).filter(models.PurchaseOrder.status.in_(['Delayed','Partial Delivery'])).count()
    if delayed: items.append(models.Notification(user_email=current_user['email'],notification_type='Delivery Delay',title='Delivery delay',message=f'{delayed} purchase order(s) need attention',severity='error'))
    pending_v=db.query(models.Vendor).filter(models.Vendor.status.in_(['Pending','Under Review'])).count()
    if pending_v: items.append(models.Notification(user_email=current_user['email'],notification_type='Vendor Approval',title='Vendor approval pending',message=f'{pending_v} vendor(s) require approval',severity='warning'))
    for c in db.query(models.Contract).all():
        try:
            days=(datetime.strptime(c.expiry_date,'%Y-%m-%d')-datetime.today()).days
            if days<=90: items.append(models.Notification(user_email=current_user['email'],notification_type='Contract Expiry',title='Contract expiry alert',message=f'{c.contract_title} expires in {days} day(s)',severity='warning'))
        except Exception: pass
    result=stored+items
    return result or [models.Notification(notification_type='System',title='All clear',message='No active alerts',severity='success',is_read=1)]

@router.post('/create')
def create_notification(payload:dict, db:Session=Depends(get_db), current_user=Depends(get_current_user)):
    row=models.Notification(user_email=payload.get('user_email',''),notification_type=payload.get('notification_type','System'),title=payload.get('title','Notification'),message=payload.get('message',''),severity=payload.get('severity','info'),channel=payload.get('channel','In-App'))
    db.add(row); db.commit(); db.refresh(row); return row

@router.put('/{notification_id}/read')
def mark_read(notification_id:int, db:Session=Depends(get_db), current_user=Depends(get_current_user)):
    row=db.query(models.Notification).filter(models.Notification.id==notification_id).first()
    if row: row.is_read=1; db.commit()
    return {'success':True}

@router.post('/send-email')
def send_email(payload:dict, db:Session=Depends(get_db), current_user=Depends(get_current_user)):
    # Local development hook: records the email event; SMTP credentials can be connected later.
    row=models.Notification(user_email=payload.get('to',''),notification_type='Email Notification',title=payload.get('subject','Email'),message=payload.get('message',''),channel='Email')
    db.add(row); db.add(models.ActivityLog(actor=current_user['email'],action='Email notification queued',module='Notifications',details=payload.get('to',''))); db.commit(); return {'status':'queued','channel':'Email','message':'Email notification recorded for delivery.'}

@router.post('/send-sms')
def send_sms(payload:dict, db:Session=Depends(get_db), current_user=Depends(get_current_user)):
    row=models.Notification(notification_type='SMS Notification',title='SMS',message=payload.get('message',''),channel='SMS')
    db.add(row); db.add(models.ActivityLog(actor=current_user['email'],action='SMS notification queued',module='Notifications',details=payload.get('phone',''))); db.commit(); return {'status':'queued','channel':'SMS','message':'SMS notification recorded for delivery.'}
