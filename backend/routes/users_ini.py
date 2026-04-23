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

        tokens = re.findall(r'"([^"]*)"', line)

        if len(tokens) >= 3:
            identity = tokens[0].strip()
            password = tokens[1].strip() if len(tokens) > 1 else ""
            flags = tokens[2].strip() if len(tokens) > 2 else ""
            account_type = tokens[3].strip() if len(tokens) > 3 else ""

            if identity.startswith('STEAM_'):
                continue
            else:
                name = identity
                entries.append(UsersIniEntry(
                    auth_type='NAME',
                    steam_id=password or '',
                    flags=flags,
                    identity=identity,
                    name=name
                ))
        else:
            parts = line.split()
            if len(parts) >= 3:
                auth_type = parts[0].upper()
                steam_id = parts[1]
                flags = parts[2]
                if auth_type not in ['STEAM', 'STEAM_ID', 'SID']:
                    entries.append(UsersIniEntry(
                        auth_type=auth_type,
                        steam_id=steam_id,
                        flags=flags,
                        identity=None,
                        name=parts[0].strip('"')
                    ))

    return entries

def write_adminlist_entries(path: str, entries: list[UsersIniEntry]):
    with open(path, 'w', encoding='utf-8') as f:
        f.write("; --- Arexios Admin List ---\n")
        for entry in entries:
            name = entry.name or entry.identity or entry.steam_id
            if name:
                f.write(f'"{name}"\n')

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

    local_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'adminlist.txt')
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    write_adminlist_entries(local_path, entries)

    return UsersIniSyncResult(
        total_entries=len(entries),
        added_entries=len(entries),
        skipped_entries=0,
        added_list=[e.name or e.identity or e.steam_id for e in entries],
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