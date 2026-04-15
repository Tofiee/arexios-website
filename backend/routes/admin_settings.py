from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models

router = APIRouter(prefix="/admin", tags=["admin-settings"])

class SiteSettingsResponse(BaseModel):
    cs16_server_ip: str | None = None
    cs16_server_port: str | None = None
    ts3_server_ip: str | None = None
    ts3_server_port: str | None = None
    ts3_query_port: str | None = None
    ts3_query_user: str | None = None
    ts3_query_password: str | None = None
    announcement_title: str | None = None
    announcement_content: str | None = None
    announcement_active: bool = False

class SiteSettingsUpdate(BaseModel):
    cs16_server_ip: str | None = None
    cs16_server_port: str | None = None
    ts3_server_ip: str | None = None
    ts3_server_port: str | None = None
    ts3_query_port: str | None = None
    ts3_query_user: str | None = None
    ts3_query_password: str | None = None
    announcement_title: str | None = None
    announcement_content: str | None = None
    announcement_active: bool = False

class LiveChatAdminCreate(BaseModel):
    steam_id: str
    username: str
    is_superadmin: bool = False
    can_livechat: bool = False
    can_skin_management: bool = False
    can_view_skins: bool = True

class LiveChatAdminUpdate(BaseModel):
    username: str | None = None
    is_superadmin: bool | None = None
    can_livechat: bool | None = None
    can_skin_management: bool | None = None
    can_view_skins: bool | None = None
    is_active: bool | None = None

class LiveChatAdminResponse(BaseModel):
    id: int
    steam_id: str
    username: str
    is_active: bool
    is_superadmin: bool
    can_livechat: bool
    can_skin_management: bool
    can_view_skins: bool
    created_at: str

def get_or_create_settings(db: Session) -> models.SiteSettings:
    settings = db.query(models.SiteSettings).first()
    if not settings:
        settings = models.SiteSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.get("/settings", response_model=SiteSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    settings = get_or_create_settings(db)
    return SiteSettingsResponse(
        cs16_server_ip=settings.cs16_server_ip,
        cs16_server_port=settings.cs16_server_port,
        ts3_server_ip=settings.ts3_server_ip,
        ts3_server_port=settings.ts3_server_port,
        ts3_query_port=settings.ts3_query_port,
        ts3_query_user=settings.ts3_query_user,
        ts3_query_password=settings.ts3_query_password,
        announcement_title=settings.announcement_title,
        announcement_content=settings.announcement_content,
        announcement_active=settings.announcement_active
    )

@router.put("/settings", response_model=SiteSettingsResponse)
def update_settings(data: SiteSettingsUpdate, db: Session = Depends(get_db)):
    settings = get_or_create_settings(db)
    
    settings.cs16_server_ip = data.cs16_server_ip
    settings.cs16_server_port = data.cs16_server_port
    settings.ts3_server_ip = data.ts3_server_ip
    settings.ts3_server_port = data.ts3_server_port
    settings.ts3_query_port = data.ts3_query_port
    settings.ts3_query_user = data.ts3_query_user
    settings.ts3_query_password = data.ts3_query_password
    settings.announcement_title = data.announcement_title
    settings.announcement_content = data.announcement_content
    settings.announcement_active = data.announcement_active
    
    db.commit()
    db.refresh(settings)
    
    return SiteSettingsResponse(
        cs16_server_ip=settings.cs16_server_ip,
        cs16_server_port=settings.cs16_server_port,
        ts3_server_ip=settings.ts3_server_ip,
        ts3_server_port=settings.ts3_server_port,
        ts3_query_port=settings.ts3_query_port,
        ts3_query_user=settings.ts3_query_user,
        ts3_query_password=settings.ts3_query_password,
        announcement_title=settings.announcement_title,
        announcement_content=settings.announcement_content,
        announcement_active=settings.announcement_active
    )

@router.get("/gametracker/check")
def check_gametracker(ip: str, port: str, db: Session = Depends(get_db)):
    gametracker_url = f"https://www.gametracker.com/server_info/{ip}:{port}/"
    return {
        "url": gametracker_url,
        "add_url": f"https://www.gametracker.com/addserver/?query={ip}:{port}"
    }

@router.get("/livechat-admins", response_model=list[LiveChatAdminResponse])
def get_livechat_admins(db: Session = Depends(get_db)):
    admins = db.query(models.LiveChatAdmin).filter(models.LiveChatAdmin.is_active == True).all()
    return [
        LiveChatAdminResponse(
            id=a.id,
            steam_id=a.steam_id,
            username=a.username,
            is_active=a.is_active,
            is_superadmin=a.is_superadmin,
            can_livechat=a.can_livechat,
            can_skin_management=a.can_skin_management,
            can_view_skins=a.can_view_skins,
            created_at=a.created_at.isoformat() if a.created_at else ""
        )
        for a in admins
    ]

@router.post("/livechat-admins", response_model=LiveChatAdminResponse)
def add_livechat_admin(data: LiveChatAdminCreate, db: Session = Depends(get_db)):
    existing = db.query(models.LiveChatAdmin).filter(
        models.LiveChatAdmin.steam_id == data.steam_id
    ).first()
    
    if existing:
        if existing.is_active:
            raise HTTPException(status_code=400, detail="Bu kullanıcı zaten live chat admin olarak ekli")
        existing.is_active = True
        existing.username = data.username
        existing.is_superadmin = data.is_superadmin
        existing.can_livechat = data.can_livechat
        existing.can_skin_management = data.can_skin_management
        existing.can_view_skins = data.can_view_skins
        db.commit()
        db.refresh(existing)
        return LiveChatAdminResponse(
            id=existing.id,
            steam_id=existing.steam_id,
            username=existing.username,
            is_active=existing.is_active,
            is_superadmin=existing.is_superadmin,
            can_livechat=existing.can_livechat,
            can_skin_management=existing.can_skin_management,
            can_view_skins=existing.can_view_skins,
            created_at=existing.created_at.isoformat() if existing.created_at else ""
        )
    
    admin = models.LiveChatAdmin(
        steam_id=data.steam_id,
        username=data.username,
        is_superadmin=data.is_superadmin,
        can_livechat=data.can_livechat,
        can_skin_management=data.can_skin_management,
        can_view_skins=data.can_view_skins
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    return LiveChatAdminResponse(
        id=admin.id,
        steam_id=admin.steam_id,
        username=admin.username,
        is_active=admin.is_active,
        is_superadmin=admin.is_superadmin,
        can_livechat=admin.can_livechat,
        can_skin_management=admin.can_skin_management,
        can_view_skins=admin.can_view_skins,
        created_at=admin.created_at.isoformat() if admin.created_at else ""
    )

@router.put("/livechat-admins/{admin_id}", response_model=LiveChatAdminResponse)
def update_livechat_admin(admin_id: int, data: LiveChatAdminUpdate, db: Session = Depends(get_db)):
    admin = db.query(models.LiveChatAdmin).filter(models.LiveChatAdmin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin bulunamadı")
    
    if admin.is_superadmin:
        if data.is_superadmin is False:
            raise HTTPException(status_code=403, detail="Superadmin yetkisi kaldırılamaz")
        if data.is_active is False:
            raise HTTPException(status_code=403, detail="Superadmin pasifleştirilemez")
        if data.steam_id is not None:
            raise HTTPException(status_code=403, detail="Superadmin bilgileri değiştirilemez")
    
    if data.username is not None:
        admin.username = data.username
    if data.is_superadmin is not None and not admin.is_superadmin:
        admin.is_superadmin = data.is_superadmin
    if data.can_livechat is not None:
        admin.can_livechat = data.can_livechat
    if data.can_skin_management is not None:
        admin.can_skin_management = data.can_skin_management
    if data.can_view_skins is not None:
        admin.can_view_skins = data.can_view_skins
    if data.is_active is not None:
        admin.is_active = data.is_active
    
    db.commit()
    db.refresh(admin)
    
    return LiveChatAdminResponse(
        id=admin.id,
        steam_id=admin.steam_id,
        username=admin.username,
        is_active=admin.is_active,
        is_superadmin=admin.is_superadmin,
        can_livechat=admin.can_livechat,
        can_skin_management=admin.can_skin_management,
        can_view_skins=admin.can_view_skins,
        created_at=admin.created_at.isoformat() if admin.created_at else ""
    )

@router.delete("/livechat-admins/{admin_id}")
def delete_livechat_admin(admin_id: int, db: Session = Depends(get_db)):
    admin = db.query(models.LiveChatAdmin).filter(models.LiveChatAdmin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin bulunamadı")
    
    if admin.is_superadmin:
        raise HTTPException(status_code=403, detail="Superadmin silinemez")
    
    admin.is_active = False
    db.commit()
    return {"message": "Admin silindi"}
