from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db, SessionLocal
import models

router = APIRouter(prefix="/support", tags=["Support Chat"])

class SessionCreate(BaseModel):
    user_id: Optional[int] = None
    user_name: str
    user_email: Optional[str] = None

class SessionResponse(BaseModel):
    id: int
    user_name: str
    user_email: Optional[str] = None
    status: str
    assigned_admin_name: Optional[str] = None
    assigned_admin: Optional[str] = None
    last_message: Optional[str] = None
    last_message_time: Optional[str] = None
    created_at: str
    class Config:
        from_attributes = True

class MessageResponse(BaseModel):
    id: int
    session_id: int
    sender_type: str
    sender_name: str
    message: str
    is_read: bool
    created_at: str
    class Config:
        from_attributes = True

@router.post("/session", response_model=SessionResponse)
def create_session(data: SessionCreate, db: Session = Depends(get_db)):
    session = models.SupportSession(
        user_id=data.user_id,
        user_name=data.user_name,
        user_email=data.user_email,
        status="waiting"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return SessionResponse(
        id=session.id,
        user_name=session.user_name,
        user_email=session.user_email,
        status=session.status,
        assigned_admin_name=session.assigned_admin_name,
        created_at=session.created_at.isoformat()
    )

@router.get("/session/{session_id}", response_model=SessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.SupportSession).filter(models.SupportSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return SessionResponse(
        id=session.id,
        user_name=session.user_name,
        user_email=session.user_email,
        status=session.status,
        assigned_admin_name=session.assigned_admin_name,
        created_at=session.created_at.isoformat()
    )

@router.get("/session/{session_id}/messages", response_model=List[MessageResponse])
def get_messages(session_id: int, db: Session = Depends(get_db)):
    messages = db.query(models.SupportMessage).filter(
        models.SupportMessage.session_id == session_id
    ).order_by(models.SupportMessage.created_at).all()
    
    return [
        MessageResponse(
            id=m.id,
            session_id=m.session_id,
            sender_type=m.sender_type,
            sender_name=m.sender_name,
            message=m.message,
            is_read=m.is_read,
            created_at=m.created_at.isoformat()
        ) for m in messages
    ]

@router.get("/sessions")
def get_all_sessions(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.SupportSession)
    if status:
        query = query.filter(models.SupportSession.status == status)
    
    sessions = query.order_by(models.SupportSession.created_at.desc()).limit(50).all()
    
    result = []
    for s in sessions:
        last_msg = db.query(models.SupportMessage).filter(
            models.SupportMessage.session_id == s.id,
            models.SupportMessage.sender_type != 'system'
        ).order_by(models.SupportMessage.created_at.desc()).first()
        
        last_any_msg = db.query(models.SupportMessage).filter(
            models.SupportMessage.session_id == s.id
        ).order_by(models.SupportMessage.created_at.desc()).first()
        
        if s.status in ['closed', 'user_closed']:
            last_msg = last_any_msg
        
        if not last_msg and s.status not in ['closed', 'user_closed']:
            continue
        
        result.append(SessionResponse(
            id=s.id,
            user_name=s.user_name,
            user_email=s.user_email,
            status=s.status,
            assigned_admin_name=s.assigned_admin_name,
            assigned_admin=s.assigned_admin_name,
            last_message=last_msg.message if last_msg else None,
            last_message_time=last_msg.created_at.isoformat() if last_msg else None,
            created_at=s.created_at.isoformat()
        ))
    
    return result

@router.put("/session/{session_id}/close")
def close_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.SupportSession).filter(models.SupportSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.status = "closed"
    db.commit()
    
    return {"message": "Session closed"}

@router.delete("/session/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.SupportSession).filter(models.SupportSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.query(models.SupportMessage).filter(models.SupportMessage.session_id == session_id).delete()
    db.delete(session)
    db.commit()
    
    return {"message": "Session deleted"}

@router.put("/messages/{message_id}/read")
def mark_read(message_id: int, db: Session = Depends(get_db)):
    message = db.query(models.SupportMessage).filter(models.SupportMessage.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    message.is_read = True
    db.commit()
    
    return {"message": "Marked as read"}

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(models.SupportSession).count()
    waiting = db.query(models.SupportSession).filter(models.SupportSession.status == "waiting").count()
    active = db.query(models.SupportSession).filter(models.SupportSession.status == "active").count()
    closed = db.query(models.SupportSession).filter(models.SupportSession.status.in_(["closed", "user_closed"])).count()
    
    return {
        "total": total,
        "waiting": waiting,
        "active": active,
        "closed": closed
    }

@router.get("/session/{session_id}/info")
def get_session_info(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.SupportSession).filter(models.SupportSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    previous_sessions = db.query(models.SupportSession).filter(
        models.SupportSession.user_email == session.user_email,
        models.SupportSession.id != session_id
    ).order_by(models.SupportSession.created_at.desc()).limit(10).all()
    
    previous_session_summaries = []
    for ps in previous_sessions:
        last_msg = db.query(models.SupportMessage).filter(
            models.SupportMessage.session_id == ps.id
        ).order_by(models.SupportMessage.created_at.desc()).first()
        
        previous_session_summaries.append({
            "id": ps.id,
            "created_at": ps.created_at.isoformat(),
            "status": ps.status,
            "assigned_admin": ps.assigned_admin_name,
            "last_message": last_msg.message if last_msg else None,
            "message_count": db.query(models.SupportMessage).filter(
                models.SupportMessage.session_id == ps.id
            ).count()
        })
    
    return {
        "session_id": session_id,
        "user_name": session.user_name,
        "user_email": session.user_email,
        "user_id": session.user_id,
        "created_at": session.created_at.isoformat(),
        "status": session.status,
        "assigned_admin": session.assigned_admin_name,
        "ip_address": session.ip_address or None,
        "location": session.location or None,
        "previous_sessions": previous_session_summaries,
        "total_previous_sessions": len(previous_session_summaries)
    }

@router.put("/session/{session_id}/close")
def close_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.SupportSession).filter(models.SupportSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.status = 'closed'
    
    msg = models.SupportMessage(
        session_id=session_id,
        sender_type='system',
        sender_name='Sistem',
        message='Destek oturumu admin tarafından sonlandırıldı.'
    )
    db.add(msg)
    db.commit()
    
    return {"message": "Session closed", "session_id": session_id}
