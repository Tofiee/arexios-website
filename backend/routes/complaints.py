from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
import models
from security import decode_access_token

router = APIRouter(prefix="/complaints", tags=["Complaints"])

class ComplaintCreate(BaseModel):
    complaint_type: str
    target_name: Optional[str] = None
    target_steam_id: Optional[str] = None
    message: str
    username: Optional[str] = None

class ComplaintResponse(BaseModel):
    id: int
    user_id: int
    username: str
    complaint_type: str
    target_name: Optional[str]
    target_steam_id: Optional[str]
    message: str
    status: str
    created_at: str
    class Config:
        from_attributes = True

def get_current_user_id(token: str = None):
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        return int(payload.get("sub", "0").split("_")[-1]) if "_" in payload.get("sub", "") else None
    except:
        return None

@router.post("/", response_model=ComplaintResponse)
def create_complaint(
    complaint: ComplaintCreate,
    db: Session = Depends(get_db)
):
    db_complaint = models.Complaint(
        user_id=0,
        username=complaint.username or "Misafir",
        complaint_type=complaint.complaint_type,
        target_name=complaint.target_name,
        target_steam_id=complaint.target_steam_id,
        message=complaint.message
    )
    db.add(db_complaint)
    db.commit()
    db.refresh(db_complaint)
    return db_complaint

@router.get("/", response_model=List[ComplaintResponse])
def get_complaints(db: Session = Depends(get_db)):
    complaints = db.query(models.Complaint).order_by(models.Complaint.created_at.desc()).all()
    return complaints
