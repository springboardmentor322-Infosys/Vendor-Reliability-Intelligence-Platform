from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field
from app.database import get_db
from app.models.message_thread import MessageThread
from app.models.message import Message
from app.models.notification import Notification
from app.models.user import User
from app.models.vendor import Vendor
from app.models.procurement_request import ProcurementRequest
from app.models.order import Order
from app.models.invoice import Invoice
from app.models.budget import Budget
from app.models.dispute import Dispute
from app.utils.permissions import require_roles, ADMINISTRATOR, PROCUREMENT_MANAGER, SUPPLY_CHAIN_MANAGER, VENDOR, FINANCE_OFFICER, AUDITOR
router=APIRouter(tags=["Reference-aligned Collaboration & Finance"])
ALL=(ADMINISTRATOR,PROCUREMENT_MANAGER,SUPPLY_CHAIN_MANAGER,VENDOR,FINANCE_OFFICER,AUDITOR)
class MessageCreate(BaseModel): content: str=Field(min_length=1,max_length=5000)
class BudgetUpdate(BaseModel): allocated_limit: float=Field(ge=0)
class DisputeCreate(BaseModel): vendor_id:int; title:str=Field(min_length=2,max_length=255); description:str|None=None; evidence_url:str|None=None
def vendor_for_entity(db, entity_type, entity_id):
    if entity_type=="Vendor":
        x=db.query(Vendor).filter(Vendor.id==entity_id).first(); return x.id if x else None
    if entity_type=="PurchaseOrder":
        x=db.query(Order).filter(Order.id==entity_id).first(); return x.vendor_id if x else None
    if entity_type=="ProcurementRequest":
        x=db.query(ProcurementRequest).filter(ProcurementRequest.id==entity_id).first(); return x.vendor_id if x else None
    return None
def scope(user,vendor_id):
    if user.role==VENDOR and (not user.vendor_id or vendor_id!=user.vendor_id): raise HTTPException(403,"Vendors may access only their own company data")
@router.get("/threads/{entity_type}/{entity_id}")
def get_thread(entity_type:str,entity_id:int,db:Session=Depends(get_db),current_user=Depends(require_roles(*ALL))):
    scope(current_user,vendor_for_entity(db,entity_type,entity_id))
    t=db.query(MessageThread).filter(MessageThread.entity_type==entity_type,MessageThread.entity_id==entity_id).first()
    if not t: t=MessageThread(entity_type=entity_type,entity_id=entity_id); db.add(t); db.commit(); db.refresh(t)
    ms=db.query(Message).filter(Message.thread_id==t.id).order_by(Message.timestamp.asc()).all()
    return {"id":t.id,"entity_type":t.entity_type,"entity_id":t.entity_id,"messages":[{"id":m.id,"sender_id":m.sender_id,"sender_name":m.sender.full_name if m.sender else "User","sender_role":m.sender.role if m.sender else "","content":m.content,"timestamp":m.timestamp} for m in ms]}
@router.post("/threads/{thread_id}/messages")
def post_message(thread_id:int,data:MessageCreate,db:Session=Depends(get_db),current_user=Depends(require_roles(*ALL))):
    t=db.query(MessageThread).filter(MessageThread.id==thread_id).first()
    if not t: raise HTTPException(404,"Thread not found")
    vid=vendor_for_entity(db,t.entity_type,t.entity_id); scope(current_user,vid)
    m=Message(thread_id=thread_id,sender_id=current_user.id,content=data.content.strip()); db.add(m); db.flush()
    recipients=[]
    if vid:
        if current_user.role==VENDOR: recipients=db.query(User).filter(User.role.in_([ADMINISTRATOR,PROCUREMENT_MANAGER,SUPPLY_CHAIN_MANAGER,FINANCE_OFFICER])).all()
        else:
            v=db.query(Vendor).filter(Vendor.id==vid).first(); u=db.query(User).filter(User.id==v.user_id).first() if v and v.user_id else None
            if u: recipients=[u]
    for u in recipients:
        if u.id!=current_user.id: db.add(Notification(user_id=u.id,title=f"New message from {current_user.full_name}",message=data.content[:120],notification_type=f"ChatMessage:{t.entity_type}:{t.entity_id}",severity="Info",is_read=False))
    db.commit(); db.refresh(m)
    return {"id":m.id,"thread_id":m.thread_id,"sender_id":m.sender_id,"sender_name":current_user.full_name,"sender_role":current_user.role,"content":m.content,"timestamp":m.timestamp}
@router.get("/finance/summary")
def finance_summary(db:Session=Depends(get_db),current_user=Depends(require_roles(ADMINISTRATOR,FINANCE_OFFICER))):
    prs=db.query(ProcurementRequest).filter(ProcurementRequest.status=="Approved").all(); spend={}
    for r in prs: spend[r.department or "General"]=spend.get(r.department or "General",0)+float(r.estimated_amount or 0)
    budgets=db.query(Budget).order_by(Budget.department.asc()).all(); rows=[]
    for b in budgets:
        used=spend.get(b.department,0); rows.append({"id":b.id,"department":b.department,"allocated_limit":b.allocated_limit,"used":used,"remaining":max(0,b.allocated_limit-used),"utilization":round(used/b.allocated_limit*100,2) if b.allocated_limit else 0})
    inv=db.query(Invoice).all()
    return {"total_budget":sum(b.allocated_limit for b in budgets),"total_procurement":sum(spend.values()),"total_po_value":db.query(func.sum(Order.amount)).scalar() or 0,"pending_invoices_count":sum(i.status=="Pending" for i in inv),"paid_invoices_count":sum(i.status=="Paid" for i in inv),"overdue_payments_count":sum(i.status=="Overdue" for i in inv),"pending_approvals_count":db.query(ProcurementRequest).filter(ProcurementRequest.status=="Pending").count(),"department_budgets":rows}
@router.get("/finance/budgets")
def budgets(db:Session=Depends(get_db),current_user=Depends(require_roles(ADMINISTRATOR,FINANCE_OFFICER))): return db.query(Budget).order_by(Budget.department.asc()).all()
@router.put("/finance/budgets/{budget_id}")
def update_budget(budget_id:int,data:BudgetUpdate,db:Session=Depends(get_db),current_user=Depends(require_roles(ADMINISTRATOR,FINANCE_OFFICER))):
    b=db.query(Budget).filter(Budget.id==budget_id).first()
    if not b: raise HTTPException(404,"Budget not found")
    b.allocated_limit=data.allocated_limit; db.commit(); db.refresh(b); return b
@router.get("/disputes")
def disputes(db:Session=Depends(get_db),current_user=Depends(require_roles(*ALL))):
    q=db.query(Dispute); return q.filter(Dispute.vendor_id==current_user.vendor_id).order_by(Dispute.id.desc()).all() if current_user.role==VENDOR else q.order_by(Dispute.id.desc()).all()
@router.post("/disputes")
def create_dispute(data:DisputeCreate,db:Session=Depends(get_db),current_user=Depends(require_roles(ADMINISTRATOR,PROCUREMENT_MANAGER,SUPPLY_CHAIN_MANAGER,AUDITOR))):
    if not db.query(Vendor).filter(Vendor.id==data.vendor_id).first(): raise HTTPException(404,"Vendor not found")
    d=Dispute(**data.model_dump()); db.add(d); db.commit(); db.refresh(d); return d
@router.put("/disputes/{dispute_id}/evidence")
def evidence(dispute_id:int,data:dict,db:Session=Depends(get_db),current_user=Depends(require_roles(ADMINISTRATOR,PROCUREMENT_MANAGER,SUPPLY_CHAIN_MANAGER,AUDITOR))):
    d=db.query(Dispute).filter(Dispute.id==dispute_id).first()
    if not d: raise HTTPException(404,"Dispute not found")
    d.evidence_url=data.get("evidence_url"); db.commit(); db.refresh(d); return d
