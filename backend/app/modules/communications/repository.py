from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_, desc
from app.modules.communications.models import Message
from app.modules.communications import schemas
from fastapi import HTTPException
from datetime import datetime

async def get_message(db: AsyncSession, message_id: int):
    result = await db.execute(select(Message).where(Message.id == message_id))
    message = result.scalars().first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return message

async def get_messages(db: AsyncSession, thread_type: str = None, thread_id: int = None, user_id: int = None, skip: int = 0, limit: int = 100):
    query = select(Message)
    
    if thread_type:
        query = query.where(Message.thread_type == thread_type)
    if thread_id:
        query = query.where(Message.thread_id == thread_id)
        
    if user_id:
        query = query.where(or_(
            Message.sender_id == user_id,
            Message.receiver_id == user_id,
            Message.receiver_id == None
        ))
        
    query = query.order_by(desc(Message.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def create_message(db: AsyncSession, message: schemas.MessageCreate, sender_id: int):
    db_message = Message(
        **message.model_dump(),
        sender_id=sender_id
    )
    db.add(db_message)
    await db.commit()
    await db.refresh(db_message)
    return db_message

async def mark_as_read(db: AsyncSession, message_id: int):
    db_message = await get_message(db, message_id)
    db_message.is_read = True
    await db.commit()
    await db.refresh(db_message)
    return db_message

async def delete_message(db: AsyncSession, message_id: int):
    db_message = await get_message(db, message_id)
    await db.delete(db_message)
    await db.commit()
    return True
