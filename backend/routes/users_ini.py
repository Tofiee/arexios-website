from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models
import os
import re

router = APIRouter(prefix="/admin", tags=["admin-settings"])

class UsersIniEntry(BaseModel):
    auth_type: str
    steam_id: str
    flags: str
    identity: str | None = None
    name: str | None = None

class UsersIniSyncResult(BaseModel):
    total_entries: int
    added_entries: int
    skipped_entries: int
    added_list: list[str]
    skipped_list: list[str]

def parse_users_ini(content: str) -> list[UsersIniEntry]:
    entries = []
    lines = content.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith(';'):
            continue
        
        # Extract name from quotes if present at start
        name = None
        if line.startswith('"'):
            end_quote = line.find('"', 1)
            if end_quote > 0:
                name = line[1:end_quote]
        
        # Skip if it's a STEAM ID
        if name and name.startswith('STEAM'):
            continue
        
        parts = line.split()
        if len(parts) >= 3:
            auth_type = parts[0].upper()
            steam_id = parts[1]
            flags = parts[2]
            
            # Skip STEAM entries
            if auth_type in ['STEAM', 'STEAM_ID', 'SID']:
                continue
            
            entries.append(UsersIniEntry(
                auth_type=auth_type,
                steam_id=steam_id,
                flags=flags,
                identity=None,
                name=name
            ))
    
    return entries

def get_existing_adminlist(path: str) -> set[str]:
    steam_ids = set()
    if os.path.exists(path):
        with open(path, 'r') as f:
            content = f.read()
            for line in content.strip().split('\n'):
                line = line.strip()
                if not line or line.startswith('"') or line.startswith('//') or line.startswith('#'):
                    continue
                if line.startswith(';') and '----' in line:
                    continue
                parts = line.split()
                if len(parts) >= 2 and parts[0] == 'STEAM':
                    steam_ids.add(parts[1])
    return steam_ids

def write_adminlist_entries(path: str, entries: list[UsersIniEntry]):
    with open(path, 'w') as f:
        for entry in entries:
            if entry.name:
                f.write(f'"{entry.name}"\n')
            elif entry.steam_id.startswith('STEAM'):
                f.write(f'"{entry.steam_id}"\n')

@router.post("/users-ini/upload")
async def upload_users_ini(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.ini'):
        raise HTTPException(status_code=400, detail="Sadece .ini dosyası kabul edilir")
    
    content = await file.read()
    try:
        text = content.decode('utf-8')
    except:
        text = content.decode('latin-1')
    
    entries = parse_users_ini(text)
    
    if not entries:
        raise HTTPException(status_code=400, detail="Geçerli admin girişi bulunamadı")
    
    return {
        "filename": file.filename,
        "entries_found": len(entries),
        "entries": [
            {
                "steam_id": e.steam_id,
                "flags": e.flags,
                "name": e.name,
                "auth_type": e.auth_type
            }
            for e in entries
        ]
    }

@router.post("/users-ini/sync", response_model=UsersIniSyncResult)
async def sync_users_ini(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.ini'):
        raise HTTPException(status_code=400, detail="Sadece .ini dosyası kabul edilir")
    
    content = await file.read()
    try:
        text = content.decode('utf-8')
    except:
        text = content.decode('latin-1')
    
    entries = parse_users_ini(text)
    
    if not entries:
        raise HTTPException(status_code=400, detail="Geçerli admin girişi bulunamadı")
    
    settings = db.query(models.SiteSettings).first()
    adminlist_path = getattr(settings, 'cs16_adminlist_path', None)
    
    if not adminlist_path:
        adminlist_path = "/root/cstrike/addons/amxmodx/configs/adminlist.txt"
    
    os.makedirs(os.path.dirname(adminlist_path), exist_ok=True)
    
    write_adminlist_entries(adminlist_path, entries)
    
    return UsersIniSyncResult(
        total_entries=len(entries),
        added_entries=len(entries),
        skipped_entries=0,
        added_list=[e.name or e.steam_id for e in entries],
        skipped_list=[]
    )

@router.get("/users-ini/template")
def get_adminlist_template():
    return {
        "content": '''// Arexios Admin List Format:
// "STEAM_X:Y:Z" "flags" // name (optional)
//
// Flags:
// a - immunity
// b - reservation
// c - amx_kick
// d - amx_ban and amx_unban
// e - amx_slay and amx_slap
// f - amx_map
// g - amx_cvar
// h - amx_cfg
// i - amx_chat and amx_psay
// j - amx_vote and amx_votemap
// k - sv_password
// l - amx_rcon
// m - custom flag A
// n - custom flag B
// o - custom flag C
// p - custom flag D
// q - custom flag E
// r - custom flag F
// s - custom flag G
// t - custom flag H
// u - menu access
// z - user

// Example:
// "STEAM_1:0:12345678" "abcdefghijklmnopqrstu" // Admin Name'''
    }
