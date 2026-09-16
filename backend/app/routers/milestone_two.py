"""Protected HTTP APIs for the Milestone 2 operational modules."""
from __future__ import annotations
from pathlib import Path
from typing import Annotated
from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.core.config import settings
from app.core.security import get_current_user
from app.database.database import get_db
from app.models import Contract, ContractDocument, Message, Notification, POFulfillment, ProcurementRequest, PurchaseOrder, User, Vendor, VendorCategory
from app.services.notification_service import notify_new_message
from app.schemas.milestone_two import ApprovalDecision, CategoryCreate, CategoryRead, ContractCreate, ContractRead, ContractUpdate, DocumentRead, MessageCreate, MessageRead, POCreate, POFulfillmentRead, POModificationRequest, PORead, POUpdate, ReceiptRecord, RequestCreate, RequestRead, RequestUpdate, VendorCreate, VendorFulfillmentUpdate, VendorRead, VendorUpdate
from app.services.milestone_two import approve_request, audit, can, commit, complete_receipt, create_contract, create_po, create_request, create_vendor, expiry_bucket, fail, get_or_create_fulfillment, item_or_404, list_vendors, reject_request, require_finance_procurement_approver, save_receipt_record, save_vendor_fulfillment, send_message, submit_request, transition_vendor, update_contract, update_po, update_request, update_vendor

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[object, Depends(get_current_user)]
vendors_router = APIRouter(prefix="/api/v1/vendors", tags=["Vendors"])
procurement_router = APIRouter(prefix="/api/v1/procurement-requests", tags=["Procurement Requests"])
po_router = APIRouter(prefix="/api/v1/purchase-orders", tags=["Purchase Orders"])
contracts_router = APIRouter(prefix="/api/v1/contracts", tags=["Contracts"])
messages_router = APIRouter(prefix="/api/v1/messages", tags=["Messages"])

def vendor_management_allowed(user): return can(user, "Administrator", "Procurement Manager")
def own_or_privileged(user, created_by): return vendor_management_allowed(user) or user.id == created_by
def is_external_vendor(user): return can(user, "Vendor") and not can(user, "Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor")
def vendor_scope_id(user):
    vendor_id = getattr(user, "vendor_id", None)
    if vendor_id is None: fail(403, "This Vendor account is not linked to a vendor company.")
    return vendor_id
def serialize_contract(item): return ContractRead.model_validate(item).model_copy(update={"expiry_bucket": expiry_bucket(item)})
def save_upload(upload: UploadFile, destination: Path, allowed_suffixes: set[str] | None = None):
    suffix=Path(upload.filename or "").suffix.lower()
    if allowed_suffixes and suffix not in allowed_suffixes: fail(422,"Unsupported file type.")
    destination.mkdir(parents=True, exist_ok=True); name=f"{__import__('uuid').uuid4().hex}{suffix}"; target=destination/name
    with target.open("wb") as file: file.write(upload.file.read())
    return str(target.relative_to(settings.uploads_dir))

@vendors_router.get("/categories", response_model=list[CategoryRead])
def categories(db: DatabaseSession, user: CurrentUser): return db.scalars(select(VendorCategory).order_by(VendorCategory.name)).all()
@vendors_router.post("/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryCreate, db: DatabaseSession, user: CurrentUser):
    if not can(user,"Administrator","Procurement Manager"): fail(403,"You do not have permission to manage vendor categories.")
    item=VendorCategory(**data.model_dump()); db.add(item); commit(db); return item
@vendors_router.get("", response_model=dict)
def get_vendors(db: DatabaseSession, user: CurrentUser, search: str | None = None, category_id: int | None = None, approval_status: str | None = None, page: int = Query(1,ge=1), page_size: int = Query(10,ge=1,le=100)):
    vendor_id = vendor_scope_id(user) if is_external_vendor(user) else None
    items,total=list_vendors(db,search,category_id,approval_status,page,page_size,vendor_id); return {"items":[VendorRead.model_validate(item).model_dump(mode="json") for item in items],"total":total,"page":page,"page_size":page_size}
@vendors_router.post("", response_model=VendorRead, status_code=status.HTTP_201_CREATED)
def add_vendor(data: VendorCreate, db: DatabaseSession, user: CurrentUser):
    if not vendor_management_allowed(user): fail(403,"Only Administrators and Procurement Managers can add or invite vendors.")
    item_or_404(db,VendorCategory,data.category_id); return create_vendor(db,data,user.id)
@vendors_router.get("/{vendor_id}", response_model=VendorRead)
def get_vendor(vendor_id:int, db:DatabaseSession, user:CurrentUser):
    item = item_or_404(db,Vendor,vendor_id,(selectinload(Vendor.contacts),))
    if is_external_vendor(user) and item.id != vendor_scope_id(user):
        fail(403, "You may only view your own vendor profile.")
    return item
@vendors_router.put("/{vendor_id}", response_model=VendorRead)
def edit_vendor(vendor_id:int,data:VendorUpdate,db:DatabaseSession,user:CurrentUser):
    item=item_or_404(db,Vendor,vendor_id,(selectinload(Vendor.contacts),));
    if is_external_vendor(user) and item.id == vendor_scope_id(user):
        # Vendor users may maintain their contact profile, but cannot alter
        # organization-managed classification, approval, or risk fields.
        data.category_id = item.category_id
    elif not vendor_management_allowed(user):
        fail(403,"You do not have permission to update this vendor.")
    item_or_404(db,VendorCategory,data.category_id); return update_vendor(db,item,data,user.id)
@vendors_router.delete("/{vendor_id}", status_code=204)
def delete_vendor(vendor_id:int,db:DatabaseSession,user:CurrentUser):
    if not can(user,"Administrator","Procurement Manager"): fail(403,"You do not have permission to delete vendors.")
    item=item_or_404(db,Vendor,vendor_id); db.delete(item); audit(db,user.id,"Vendor Deleted","Vendor",vendor_id); commit(db)
@vendors_router.patch("/{vendor_id}/approve", response_model=VendorRead)
def approve_vendor(vendor_id:int,db:DatabaseSession,user:CurrentUser):
    if not can(user,"Administrator","Procurement Manager"): fail(403,"You do not have permission to approve vendors.")
    return transition_vendor(db,item_or_404(db,Vendor,vendor_id,(selectinload(Vendor.contacts),)),"Approved",user.id)
@vendors_router.patch("/{vendor_id}/review", response_model=VendorRead)
def review_vendor(vendor_id:int,db:DatabaseSession,user:CurrentUser):
    if not can(user,"Administrator","Procurement Manager"): fail(403,"You do not have permission to review vendors.")
    return transition_vendor(db,item_or_404(db,Vendor,vendor_id,(selectinload(Vendor.contacts),)),"Under Review",user.id)
@vendors_router.patch("/{vendor_id}/reject", response_model=VendorRead)
def reject_vendor(vendor_id:int,db:DatabaseSession,user:CurrentUser):
    if not can(user,"Administrator","Procurement Manager"): fail(403,"You do not have permission to reject vendors.")
    return transition_vendor(db,item_or_404(db,Vendor,vendor_id,(selectinload(Vendor.contacts),)),"Rejected",user.id)

@procurement_router.get("",response_model=list[RequestRead])
def requests(db:DatabaseSession,user:CurrentUser):
    if can(user, "Vendor") and not can(user, "Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor"):
        fail(403, "Vendor accounts cannot access internal procurement requests.")
    statement=select(ProcurementRequest).order_by(ProcurementRequest.created_at.desc())
    return db.scalars(statement).all()
@procurement_router.post("",response_model=RequestRead,status_code=201)
def add_request(data:RequestCreate,db:DatabaseSession,user:CurrentUser):
    if not can(user,"Procurement Manager"): fail(403,"Only Procurement Managers can create procurement requests.")
    return create_request(db,data,user.id)
@procurement_router.get("/{request_id}",response_model=RequestRead)
def get_request(request_id:int,db:DatabaseSession,user:CurrentUser):
    if can(user, "Vendor") and not can(user, "Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor"):
        fail(403, "Vendor accounts cannot access internal procurement requests.")
    return item_or_404(db,ProcurementRequest,request_id)
@procurement_router.put("/{request_id}",response_model=RequestRead)
def edit_request(request_id:int,data:RequestUpdate,db:DatabaseSession,user:CurrentUser):
    item=item_or_404(db,ProcurementRequest,request_id)
    if item.created_by!=user.id or not can(user,"Procurement Manager"): fail(403,"Only the creating Procurement Manager may update this request.")
    if item.status not in {"Draft", "Rejected"}: fail(409,"Submitted, approved, or purchase-order-linked requests cannot be edited.")
    return update_request(db,item,data,user.id)
@procurement_router.delete("/{request_id}",status_code=204)
def delete_request(request_id:int,db:DatabaseSession,user:CurrentUser):
    item=item_or_404(db,ProcurementRequest,request_id)
    if item.created_by!=user.id or not can(user,"Procurement Manager"): fail(403,"Only the creating Procurement Manager may delete this request.")
    if item.status not in {"Draft", "Rejected"}: fail(409,"Only Draft or Rejected procurement requests can be deleted.")
    db.delete(item); audit(db,user.id,"PROCUREMENT_REQUEST_DELETED","ProcurementRequest",request_id); commit(db)
@procurement_router.post("/{request_id}/submit",response_model=RequestRead)
def submit(request_id:int,db:DatabaseSession,user:CurrentUser):
    item=item_or_404(db,ProcurementRequest,request_id)
    if not can(user,"Procurement Manager") or item.created_by != user.id: fail(403,"Only the creating Procurement Manager may submit this request.")
    return submit_request(db,item,user.id)
@procurement_router.post("/{request_id}/approve",response_model=RequestRead)
def approve(request_id:int,data:ApprovalDecision,db:DatabaseSession,user:CurrentUser):
    item=item_or_404(db,ProcurementRequest,request_id)
    require_finance_procurement_approver(user)
    return approve_request(db,item,user,data.comment)
@procurement_router.post("/{request_id}/reject",response_model=RequestRead)
def reject(request_id:int,data:ApprovalDecision,db:DatabaseSession,user:CurrentUser):
    item=item_or_404(db,ProcurementRequest,request_id)
    require_finance_procurement_approver(user)
    return reject_request(db,item,user,data.comment or "")

@po_router.get("",response_model=list[PORead])
def purchase_orders(db:DatabaseSession,user:CurrentUser):
    statement=select(PurchaseOrder).options(selectinload(PurchaseOrder.items),selectinload(PurchaseOrder.vendor),selectinload(PurchaseOrder.fulfillment)).order_by(PurchaseOrder.created_at.desc())
    if is_external_vendor(user): statement=statement.where(PurchaseOrder.vendor_id == vendor_scope_id(user))
    return db.scalars(statement).all()
@po_router.post("",response_model=PORead,status_code=201)
def add_po(data:POCreate,db:DatabaseSession,user:CurrentUser):
    if not can(user,"Procurement Manager"): fail(403,"Only Procurement Managers can create purchase orders.")
    return create_po(db,data,user.id)

@po_router.get("/operations/summary", response_model=dict)
def operations_summary(db:DatabaseSession, user:CurrentUser):
    """Evidence-based delivery and quality metrics used by operational dashboards."""
    statement = select(POFulfillment, PurchaseOrder).join(PurchaseOrder, POFulfillment.purchase_order_id == PurchaseOrder.id).where(POFulfillment.actual_delivery_date.isnot(None))
    if is_external_vendor(user):
        statement = statement.where(PurchaseOrder.vendor_id == vendor_scope_id(user))
    rows = db.execute(statement.order_by(POFulfillment.actual_delivery_date)).all()
    periods = {}
    quality = {"Passed": 0, "Conditional": 0, "Failed": 0}
    late = 0; sla = 0
    for fulfillment, po in rows:
        period = fulfillment.actual_delivery_date.strftime("%b %Y")
        entry = periods.setdefault(period, {"total": 0, "on_time": 0})
        entry["total"] += 1
        if fulfillment.actual_delivery_date <= po.expected_delivery_date: entry["on_time"] += 1
        else: late += 1
        quality[fulfillment.quality_status] = quality.get(fulfillment.quality_status, 0) + 1
        sla += fulfillment.sla_violations or 0
    return {
        "completed_receipts": len(rows),
        "late_deliveries": late,
        "sla_violations": sla,
        "on_time_delivery_rate": round((sum(item["on_time"] for item in periods.values()) / len(rows) * 100), 2) if rows else None,
        "delivery_trend": [{"period": period, "on_time_rate": round(entry["on_time"] / entry["total"] * 100, 2)} for period, entry in periods.items()],
        "quality_distribution": quality,
    }

def po_for_user(db, po_id, user):
    po = item_or_404(db,PurchaseOrder,po_id,(selectinload(PurchaseOrder.items),selectinload(PurchaseOrder.vendor),selectinload(PurchaseOrder.fulfillment)))
    if is_external_vendor(user) and po.vendor_id != vendor_scope_id(user):
        fail(403,"You do not have permission to access this purchase order.")
    return po

@po_router.patch("/{po_id}/send", response_model=PORead)
def send_po(po_id:int, db:DatabaseSession, user:CurrentUser):
    if not can(user,"Procurement Manager"): fail(403,"Only Procurement Managers can send purchase orders to vendors.")
    po = po_for_user(db, po_id, user)
    if po.status != "Created": fail(409,"Only a newly created purchase order can be sent.")
    return update_po(db, po, POUpdate(status="Sent"), user.id, "Purchase Order Sent to Vendor")

@po_router.get("/{po_id}/fulfillment", response_model=POFulfillmentRead | None)
def get_fulfillment(po_id:int, db:DatabaseSession, user:CurrentUser):
    return po_for_user(db, po_id, user).fulfillment

@po_router.put("/{po_id}/fulfillment", response_model=POFulfillmentRead)
def update_vendor_fulfillment(po_id:int, data:VendorFulfillmentUpdate, db:DatabaseSession, user:CurrentUser):
    if not can(user, "Vendor"): fail(403,"Only the assigned vendor can update fulfillment progress.")
    po = po_for_user(db, po_id, user)
    if po.status not in ("Accepted", "In Progress", "Processing", "Ready for Shipment", "Shipped"):
        fail(409,"Fulfillment can begin only after the vendor has accepted the purchase order.")
    return save_vendor_fulfillment(db, po, data, user.id)

@po_router.post("/{po_id}/receipt", response_model=POFulfillmentRead)
def record_receipt(po_id:int, data:ReceiptRecord, db:DatabaseSession, user:CurrentUser):
    if not can(user,"Supply Chain Manager"): fail(403,"Only Supply Chain Managers can record receiving and quality evidence.")
    po = po_for_user(db, po_id, user)
    return save_receipt_record(db, po, data, user.id)

@po_router.patch("/{po_id}/complete", response_model=PORead)
def complete_purchase_order(po_id:int, db:DatabaseSession, user:CurrentUser):
    if not can(user,"Supply Chain Manager"): fail(403,"Only Supply Chain Managers can complete a received purchase order.")
    return complete_receipt(db, po_for_user(db, po_id, user), user.id)

@po_router.post("/{po_id}/modification-request", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
def request_po_modification(po_id:int, data:POModificationRequest, db:DatabaseSession, user:CurrentUser):
    if not can(user,"Vendor"): fail(403,"Only the assigned vendor can request a purchase order modification.")
    po = po_for_user(db, po_id, user)
    message = Message(purchase_order_id=po.id, receiver_id=po.created_by, sender_id=user.id, subject=f"Modification request: {po.po_number}", message=data.reason)
    db.add(message); db.flush(); audit(db,user.id,"PO Modification Requested","PurchaseOrder",po.id); commit(db); db.refresh(message); return message
@po_router.get("/{po_id}",response_model=PORead)
def get_po(po_id:int,db:DatabaseSession,user:CurrentUser):
    return po_for_user(db, po_id, user)
@po_router.put("/{po_id}",response_model=PORead)
def edit_po(po_id:int,data:POUpdate,db:DatabaseSession,user:CurrentUser):
    if not can(user,"Procurement Manager"): fail(403,"Only Procurement Managers can update purchase orders.")
    if data.status is not None:
        fail(403, "Procurement status changes must use the send workflow; fulfillment status is recorded by the vendor and Supply Chain.")
    return update_po(db,item_or_404(db,PurchaseOrder,po_id,(selectinload(PurchaseOrder.items),)),data,user.id)
@po_router.patch("/{po_id}/accept",response_model=PORead)
def accept_po(po_id:int,db:DatabaseSession,user:CurrentUser): return vendor_po_action(db,po_id,"Accepted",user)
@po_router.patch("/{po_id}/reject",response_model=PORead)
def reject_po(po_id:int,db:DatabaseSession,user:CurrentUser): return vendor_po_action(db,po_id,"Rejected",user)
@po_router.patch("/{po_id}/delivery-status",response_model=PORead)
def delivery_status(po_id:int,data:POUpdate,db:DatabaseSession,user:CurrentUser):
    if data.status not in ("In Progress", "Processing", "Ready for Shipment", "Shipped"):
        fail(422, "Vendor delivery updates may only report fulfillment milestones. Supply Chain must record receipt and completion evidence.")
    return vendor_po_action(db,po_id,data.status,user)
@po_router.post("/{po_id}/invoice", response_model=PORead)
def upload_invoice(po_id:int, file:Annotated[UploadFile,File()], db:DatabaseSession, user:CurrentUser):
    po=item_or_404(db,PurchaseOrder,po_id,(selectinload(PurchaseOrder.items),selectinload(PurchaseOrder.vendor)))
    if not is_external_vendor(user) or po.vendor_id != vendor_scope_id(user): fail(403,"Only the assigned vendor can upload this invoice.")
    po.invoice_path=save_upload(file,settings.purchase_order_upload_dir); audit(db,user.id,"PO Invoice Uploaded","PurchaseOrder",po.id); commit(db); return po
@po_router.post("/{po_id}/delivery-proof", response_model=PORead)
def upload_delivery_proof(po_id:int, file:Annotated[UploadFile,File()], db:DatabaseSession, user:CurrentUser):
    po=item_or_404(db,PurchaseOrder,po_id,(selectinload(PurchaseOrder.items),selectinload(PurchaseOrder.vendor)))
    if not is_external_vendor(user) or po.vendor_id != vendor_scope_id(user): fail(403,"Only the assigned vendor can upload delivery proof.")
    po.delivery_proof_path=save_upload(file,settings.purchase_order_upload_dir); audit(db,user.id,"PO Delivery Proof Uploaded","PurchaseOrder",po.id); commit(db); return po
def vendor_po_action(db,po_id,target,user):
    if not can(user,"Vendor"): fail(403,"Only the assigned vendor can respond to a purchase order.")
    po=po_for_user(db,po_id,user)
    if target in ("Accepted","Rejected") and po.status != "Sent": fail(409,"A vendor can accept or reject only a sent purchase order.")
    if target in ("In Progress", "Processing", "Ready for Shipment", "Shipped") and po.status not in ("Accepted", "In Progress", "Processing", "Ready for Shipment", "Shipped"):
        fail(409, "Fulfillment milestones can be recorded only after the purchase order is accepted.")
    action = "PURCHASE_ORDER_ACCEPTED" if target == "Accepted" else "PURCHASE_ORDER_REJECTED" if target == "Rejected" else "VENDOR_FULFILLMENT_STATUS_UPDATED"
    return update_po(db,po,POUpdate(status=target),user.id,action)
@po_router.delete("/{po_id}",status_code=204)
def delete_po(po_id:int,db:DatabaseSession,user:CurrentUser):
    if not can(user,"Procurement Manager"): fail(403,"Only Procurement Managers can delete purchase orders.")
    db.delete(item_or_404(db,PurchaseOrder,po_id)); audit(db,user.id,"Purchase Order Deleted","PurchaseOrder",po_id); commit(db)

@contracts_router.get("",response_model=list[ContractRead])
def contracts(db:DatabaseSession,user:CurrentUser):
    statement=select(Contract).options(selectinload(Contract.documents),selectinload(Contract.vendor)).order_by(Contract.end_date)
    if is_external_vendor(user): statement=statement.where(Contract.vendor_id == vendor_scope_id(user))
    return [serialize_contract(item) for item in db.scalars(statement).all()]
@contracts_router.post("",response_model=ContractRead,status_code=201)
def add_contract(data:ContractCreate,db:DatabaseSession,user:CurrentUser):
    if not can(user,"Procurement Manager"): fail(403,"Only Procurement Managers can create contracts.")
    return serialize_contract(create_contract(db,data,user.id))
@contracts_router.get("/{contract_id}",response_model=ContractRead)
def get_contract(contract_id:int,db:DatabaseSession,user:CurrentUser):
    item=item_or_404(db,Contract,contract_id,(selectinload(Contract.documents),selectinload(Contract.vendor)))
    if is_external_vendor(user) and item.vendor_id != vendor_scope_id(user): fail(403,"You do not have permission to view this contract.")
    return serialize_contract(item)
@contracts_router.put("/{contract_id}",response_model=ContractRead)
def edit_contract(contract_id:int,data:ContractUpdate,db:DatabaseSession,user:CurrentUser):
    if not can(user,"Procurement Manager"): fail(403,"Only Procurement Managers can update contracts.")
    return serialize_contract(update_contract(db,item_or_404(db,Contract,contract_id,(selectinload(Contract.documents),)),data,user.id))
@contracts_router.delete("/{contract_id}",status_code=204)
def delete_contract(contract_id:int,db:DatabaseSession,user:CurrentUser):
    if not can(user,"Procurement Manager"): fail(403,"Only Procurement Managers can delete contracts.")
    db.delete(item_or_404(db,Contract,contract_id)); audit(db,user.id,"Contract Deleted","Contract",contract_id); commit(db)
@contracts_router.post("/{contract_id}/documents",response_model=DocumentRead,status_code=201)
def upload_contract_document(contract_id:int,file:Annotated[UploadFile,File()],db:DatabaseSession,user:CurrentUser):
    if not can(user,"Procurement Manager"): fail(403,"Only Procurement Managers can upload contract documents.")
    contract=item_or_404(db,Contract,contract_id); path=save_upload(file,settings.contract_upload_dir,{".pdf"}); doc=ContractDocument(contract_id=contract.id,file_name=file.filename or "contract.pdf",file_path=path,uploaded_by=user.id); contract.contract_file=path; db.add(doc); audit(db,user.id,"Contract Uploaded","Contract",contract.id); commit(db); db.refresh(doc); return doc

@messages_router.get("/unread-count", response_model=dict)
def get_unread_count(db: DatabaseSession, user: CurrentUser):
    """Return the unread message count for the current authenticated user."""
    from sqlalchemy import func
    count = db.scalar(
        select(func.count(Message.id)).where(
            Message.receiver_id == user.id,
            Message.is_read.is_(False)
        )
    ) or 0
    return {"unread_count": count}

@messages_router.get("/summary", response_model=dict)
def messages_summary(db: DatabaseSession, user: CurrentUser):
    """Return live unread message count and recent conversation previews for topbar drawer."""
    from sqlalchemy import func
    statement = (
        select(Message, User)
        .join(User, User.id == Message.sender_id)
        .order_by(Message.created_at.desc())
    )
    if not can(user, "Administrator", "Auditor"):
        statement = statement.where((Message.sender_id == user.id) | (Message.receiver_id == user.id))

    unread_count = db.scalar(
        select(func.count(Message.id)).where(
            Message.receiver_id == user.id,
            Message.is_read.is_(False)
        )
    ) or 0

    recent_rows = db.execute(statement.limit(10)).all()
    recent = [
        {
            "id": msg.id,
            "purchase_order_id": msg.purchase_order_id,
            "contract_id": msg.contract_id,
            "sender_id": msg.sender_id,
            "sender_name": f"{sender.first_name} {sender.last_name}".strip() or sender.email,
            "sender_email": sender.email,
            "receiver_id": msg.receiver_id,
            "subject": msg.subject,
            "message": msg.message[:120] + ("..." if len(msg.message) > 120 else ""),
            "is_read": msg.is_read,
            "attachment_path": msg.attachment_path,
            "created_at": msg.created_at,
        }
        for msg, sender in recent_rows
    ]

    return {
        "unread_count": unread_count,
        "recent": recent,
    }

@messages_router.get("/recipients", response_model=list[dict])
def get_message_recipients(db: DatabaseSession, user: CurrentUser):
    """Return available recipient users for messaging based on role permissions."""
    users = db.scalars(select(User).where(User.is_active == True, User.id != user.id).order_by(User.first_name)).all()
    recipients = []
    for u in users:
        role_name = u.roles[0].name if u.roles else "User"
        if is_external_vendor(user) and role_name == "Vendor" and u.vendor_id != getattr(user, "vendor_id", None):
            continue
        recipients.append({
            "id": u.id,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "role": role_name,
            "vendor_company_name": u.vendor.company_name if u.vendor else None,
        })
    return recipients

@messages_router.get("",response_model=list[MessageRead])
def messages(db:DatabaseSession,user:CurrentUser,purchase_order_id:int|None=None,contract_id:int|None=None):
    statement=select(Message).order_by(Message.created_at.desc())
    if purchase_order_id: statement=statement.where(Message.purchase_order_id==purchase_order_id)
    if contract_id: statement=statement.where(Message.contract_id==contract_id)
    if not can(user,"Administrator","Auditor"): statement=statement.where((Message.sender_id==user.id)|(Message.receiver_id==user.id))
    return db.scalars(statement).all()
@messages_router.get("/conversation", response_model=list[MessageRead])
def conversation(db:DatabaseSession,user:CurrentUser,purchase_order_id:int|None=None,contract_id:int|None=None):
    if bool(purchase_order_id) == bool(contract_id): fail(422,"Select exactly one purchase order or contract thread.")
    statement=select(Message).order_by(Message.created_at)
    statement=statement.where(Message.purchase_order_id==purchase_order_id) if purchase_order_id else statement.where(Message.contract_id==contract_id)
    if not can(user,"Administrator","Auditor"): statement=statement.where((Message.sender_id==user.id)|(Message.receiver_id==user.id))
    return db.scalars(statement).all()
@messages_router.post("",response_model=MessageRead,status_code=201)
def add_message(data:MessageCreate,db:DatabaseSession,user:CurrentUser):
    if not can(user,"Procurement Manager","Supply Chain Manager","Finance Officer","Vendor","Administrator","Auditor"):
        fail(403,"Only operational users may send procurement communications.")
    if is_external_vendor(user):
        if data.purchase_order_id:
            po = item_or_404(db, PurchaseOrder, data.purchase_order_id)
            if po.vendor_id != vendor_scope_id(user):
                fail(403, "Vendor communications must belong to a purchase order assigned to your company.")
        elif data.contract_id:
            contract = item_or_404(db, Contract, data.contract_id, (selectinload(Contract.vendor),))
            if contract.vendor_id != vendor_scope_id(user):
                fail(403,"Vendor communications must belong to a contract assigned to your company.")
    msg = send_message(db, data, user.id)
    sender_name = f"{user.first_name} {user.last_name}".strip() or user.email
    notify_new_message(db, msg, sender_name)
    commit(db)
    return msg
@messages_router.patch("/{message_id}/read",response_model=MessageRead)
def mark_read(message_id:int,db:DatabaseSession,user:CurrentUser):
    item=item_or_404(db,Message,message_id)
    if item.receiver_id!=user.id and not can(user,"Administrator"): fail(403,"Only the recipient may mark this message as read.")
    item.is_read=True
    notifs = db.scalars(
        select(Notification).where(
            Notification.recipient_id == user.id,
            Notification.type == "message",
            Notification.related_entity == "Message",
            Notification.related_entity_id == item.id,
            Notification.is_read == False,
        )
    ).all()
    for n in notifs:
        n.is_read = True
    commit(db)
    return item
@messages_router.post("/{message_id}/attachment", response_model=MessageRead)
def upload_message_attachment(message_id:int,file:Annotated[UploadFile,File()],db:DatabaseSession,user:CurrentUser):
    item=item_or_404(db,Message,message_id)
    if item.sender_id!=user.id and not can(user,"Administrator"): fail(403,"Only the sender may attach a file to this message.")
    item.attachment_path=save_upload(file,settings.uploads_dir / "messages"); audit(db,user.id,"Message Attachment Uploaded","Message",item.id); commit(db); return item
