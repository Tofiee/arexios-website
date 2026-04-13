from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
import models
import json
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))
from admins_parser import parse_admins_file, get_admins_from_directory

router = APIRouter(prefix="/admins", tags=["Server Admins"])

class ServerAdminCreate(BaseModel):
    username: str
    steam_id: Optional[str] = None
    avatar_url: Optional[str] = None

class ServerAdminResponse(BaseModel):
    id: int
    username: str
    steam_id: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    class Config:
        from_attributes = True

class ParsedAdmin(BaseModel):
    name: str
    steam_id: Optional[str] = None
    rank: str
    flags: str
    immunity: str
    added_by: Optional[str] = None

@router.get("/", response_model=List[ServerAdminResponse])
def get_admins(db: Session = Depends(get_db)):
    admins = db.query(models.ServerAdmin).filter(models.ServerAdmin.is_active == True).all()
    return admins

@router.get("/list", response_model=List[ParsedAdmin])
def get_admins_list():
    """Get admins from server adminlist.txt file"""
    # Default path - can be configured via environment variable
    admin_file_path = os.environ.get("ADMINLIST_PATH", "")
    
    if admin_file_path and os.path.exists(admin_file_path):
        admins = parse_admins_file(admin_file_path)
    else:
        # Try default CS:GO server paths
        possible_paths = [
            "C:\\server\\csgo\\addons\\sourcemod\\configs\\adminlist.txt",
            "/home/server/csgo/addons/sourcemod/configs/adminlist.txt",
            os.path.join(os.path.dirname(__file__), "..", "data", "adminlist.txt"),
        ]
        
        admins = []
        for path in possible_paths:
            if os.path.exists(path):
                admins = parse_admins_file(path)
                break
        
        if not admins:
            # Fallback to JSON file
            json_path = os.path.join(os.path.dirname(__file__), "..", "data", "admins.json")
            try:
                with open(json_path, 'r', encoding='utf-8') as f:
                    json_admins = json.load(f)
                    admins = [{"name": a["username"], "steam_id": a.get("steam_id", ""), 
                              "rank": "Uye", "flags": "", "immunity": "", "added_by": ""} 
                             for a in json_admins]
            except:
                admins = []
    
    return admins

@router.get("/by-rank")
def get_admins_by_rank():
    """Get admins grouped by rank"""
    admins = get_admins_list()
    
    grouped = {}
    for admin in admins:
        rank = admin.get("rank", "Uye")
        if rank not in grouped:
            grouped[rank] = []
        grouped[rank].append(admin)
    
    return grouped

@router.post("/reload")
def reload_admins_list():
    return {"message": "Admins list reloaded"}

@router.get("/support-admins")
def get_support_admins():
    """Get list of admins who can receive support session transfers"""
    support_admins_path = os.path.join(os.path.dirname(__file__), "..", "data", "support_admins.json")
    try:
        with open(support_admins_path, 'r', encoding='utf-8') as f:
            admins = json.load(f)
        return admins
    except FileNotFoundError:
        return []
    except json.JSONDecodeError:
        return []

@router.post("/", response_model=ServerAdminResponse)
def create_admin(admin: ServerAdminCreate, db: Session = Depends(get_db)):
    db_admin = models.ServerAdmin(
        username=admin.username,
        steam_id=admin.steam_id,
        avatar_url=admin.avatar_url
    )
    db.add(db_admin)
    db.commit()
    db.refresh(db_admin)
    return db_admin

@router.get("/is-admin")
def check_is_admin(steam_id: str, db: Session = Depends(get_db)):
    admin = db.query(models.ServerAdmin).filter(
        models.ServerAdmin.steam_id == steam_id,
        models.ServerAdmin.is_active == True
    ).first()
    return {"is_admin": admin is not None, "admin": admin}

@router.delete("/{admin_id}")
def delete_admin(admin_id: int, db: Session = Depends(get_db)):
    admin = db.query(models.ServerAdmin).filter(models.ServerAdmin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    admin.is_active = False
    db.commit()
    return {"message": "Admin deleted successfully"}

@router.put("/{admin_id}", response_model=ServerAdminResponse)
def update_admin(admin_id: int, admin_data: ServerAdminCreate, db: Session = Depends(get_db)):
    admin = db.query(models.ServerAdmin).filter(models.ServerAdmin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    admin.username = admin_data.username
    admin.steam_id = admin_data.steam_id
    admin.avatar_url = admin_data.avatar_url
    db.commit()
    db.refresh(admin)
    return admin
