from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import os
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import RoleChecker
from app.modules.auth.service import get_current_user
from app.modules.auth.models import User
from app.modules.communications import schemas, repository
from app.modules.audit.models import AuditLog
from app.modules.notifications.models import Notification

router = APIRouter(tags=["Communications"])

@router.get("/messages", response_model=List[schemas.MessageResponse], dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager", "Finance Officer", "Auditor", "Vendor"]))])
async def get_messages(thread_type: Optional[str] = None, thread_id: Optional[int] = None, skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id_filter = None
    if current_user.role.name == "Vendor":
        user_id_filter = current_user.id
        
    return await repository.get_messages(db, thread_type=thread_type, thread_id=thread_id, user_id=user_id_filter, skip=skip, limit=limit)

@router.post("/messages", response_model=schemas.MessageResponse, dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager", "Vendor"]))])
async def create_message(message: schemas.MessageCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_message = await repository.create_message(db, message, current_user.id)
    
    # Audit Log
    db.add(AuditLog(user_id=current_user.id, action="MESSAGE_SENT", entity_type="Message", entity_id=new_message.id))
    
    # Notification
    if message.receiver_id:
        db.add(Notification(user_id=message.receiver_id, message=f"New message received on {message.thread_type} {message.thread_id}"))
        
    await db.commit()
    return new_message

@router.patch("/messages/{message_id}/read", response_model=schemas.MessageResponse, dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager", "Finance Officer", "Auditor", "Vendor"]))])
async def mark_message_as_read(message_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = await repository.get_message(db, message_id)
    
    # Ensure only receiver can mark as read (or admin)
    if current_user.role.name != "Administrator" and msg.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    updated_message = await repository.mark_as_read(db, message_id)
    db.add(AuditLog(user_id=current_user.id, action="MESSAGE_READ", entity_type="Message", entity_id=message_id))
    await db.commit()
    
    return updated_message

@router.delete("/messages/{message_id}", dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager", "Vendor"]))])
async def delete_message(message_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = await repository.get_message(db, message_id)
    
    if current_user.role.name != "Administrator" and msg.sender_id != current_user.id:
         raise HTTPException(status_code=403, detail="Unauthorized")
         
    await repository.delete_message(db, message_id)
    db.add(AuditLog(user_id=current_user.id, action="MESSAGE_DELETED", entity_type="Message", entity_id=message_id))
    await db.commit()
    return {"status": "deleted"}

@router.post("/messages/{message_id}/upload", dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager", "Vendor"]))])
async def upload_message_attachment(message_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = await repository.get_message(db, message_id)
    
    if current_user.role.name != "Administrator" and msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    allowed_types = ["application/pdf", "image/png", "image/jpeg", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF, PNG, and JPG files are allowed")
        
    contents = await file.read(10 * 1024 * 1024 + 1)
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB.")
        
    os.makedirs(os.path.join("uploads", "messages"), exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1]
    safe_filename = f"msg_{message_id}_{int(datetime.utcnow().timestamp())}{file_ext}"
    file_path = os.path.join("uploads", "messages", safe_filename)
    
    with open(file_path, "wb") as f:
        f.write(contents)
        
    msg.attachment_path = file_path
    msg.attachment_name = file.filename
    
    db.add(AuditLog(user_id=current_user.id, action="ATTACHMENT_UPLOADED", entity_type="Message", entity_id=message_id))
    await db.commit()
    
    return {"message": "Attachment uploaded successfully", "file_path": file_path}

@router.get("/messages/{message_id}/download", dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager", "Finance Officer", "Auditor", "Vendor"]))])
async def download_message_attachment(message_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = await repository.get_message(db, message_id)
    
    # Vendor restriction
    if current_user.role.name == "Vendor" and msg.sender_id != current_user.id and msg.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
            
    if not msg.attachment_path or not os.path.exists(msg.attachment_path):
        raise HTTPException(status_code=404, detail="Document not found")
        
    db.add(AuditLog(user_id=current_user.id, action="ATTACHMENT_DOWNLOADED", entity_type="Message", entity_id=msg.id))
    await db.commit()
    
    import mimetypes
    media_type, _ = mimetypes.guess_type(msg.attachment_path)
    
    return FileResponse(path=msg.attachment_path, filename=msg.attachment_name, media_type=media_type or "application/octet-stream")
