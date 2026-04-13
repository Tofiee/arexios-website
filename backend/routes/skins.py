from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models import Skin, SkinCategory, User
from routes.auth import get_current_user
import os
import uuid
from fastapi.staticfiles import StaticFiles

router = APIRouter(prefix="/skins", tags=["skins"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "skins")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class SkinCreate(BaseModel):
    name: str
    image_url: str
    price: int
    category_id: Optional[int] = None

class SkinUpdate(BaseModel):
    name: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[int] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None

class SkinResponse(BaseModel):
    id: int
    name: str
    image_url: str
    price: int
    category_id: Optional[int] = None
    is_active: bool
    category_name: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[SkinResponse])
def get_skins(category: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Skin).filter(Skin.is_active == True)
    
    if category:
        query = query.filter(Skin.category_id == category)
    
    skins = query.order_by(Skin.created_at.desc()).all()
    
    result = []
    for skin in skins:
        category_name = None
        if skin.category_id:
            cat = db.query(SkinCategory).filter(SkinCategory.id == skin.category_id).first()
            if cat:
                category_name = cat.name
        
        result.append(SkinResponse(
            id=skin.id,
            name=skin.name,
            image_url=skin.image_url,
            price=skin.price,
            category_id=skin.category_id,
            is_active=skin.is_active,
            category_name=category_name,
            created_at=str(skin.created_at) if skin.created_at else None
        ))
    return result

@router.get("/all", response_model=List[SkinResponse])
def get_all_skins(db: Session = Depends(get_db)):
    skins = db.query(Skin).order_by(Skin.created_at.desc()).all()
    
    result = []
    for skin in skins:
        category_name = None
        if skin.category_id:
            cat = db.query(SkinCategory).filter(SkinCategory.id == skin.category_id).first()
            if cat:
                category_name = cat.name
        
        result.append(SkinResponse(
            id=skin.id,
            name=skin.name,
            image_url=skin.image_url,
            price=skin.price,
            category_id=skin.category_id,
            is_active=skin.is_active,
            category_name=category_name,
            created_at=str(skin.created_at) if skin.created_at else None
        ))
    return result

@router.post("/", response_model=SkinResponse)
def create_skin(skin: SkinCreate, db: Session = Depends(get_db)):
    if skin.category_id:
        cat = db.query(SkinCategory).filter(SkinCategory.id == skin.category_id).first()
        if not cat:
            raise HTTPException(status_code=400, detail="Geçersiz kategori")
    
    db_skin = Skin(
        name=skin.name,
        image_url=skin.image_url,
        price=skin.price,
        category_id=skin.category_id
    )
    db.add(db_skin)
    db.commit()
    db.refresh(db_skin)
    
    return SkinResponse(
        id=db_skin.id,
        name=db_skin.name,
        image_url=db_skin.image_url,
        price=db_skin.price,
        category_id=db_skin.category_id,
        is_active=db_skin.is_active,
        category_name=db_skin.category.name if db_skin.category else None,
        created_at=str(db_skin.created_at) if db_skin.created_at else None
    )

@router.put("/{skin_id}", response_model=SkinResponse)
def update_skin(skin_id: int, skin_update: SkinUpdate, db: Session = Depends(get_db)):
    db_skin = db.query(Skin).filter(Skin.id == skin_id).first()
    if not db_skin:
        raise HTTPException(status_code=404, detail="Skin bulunamadı")
    
    if skin_update.name is not None:
        db_skin.name = skin_update.name
    if skin_update.image_url is not None:
        db_skin.image_url = skin_update.image_url
    if skin_update.price is not None:
        db_skin.price = skin_update.price
    if skin_update.category_id is not None:
        db_skin.category_id = skin_update.category_id
    if skin_update.is_active is not None:
        db_skin.is_active = skin_update.is_active
    
    db.commit()
    db.refresh(db_skin)
    
    return SkinResponse(
        id=db_skin.id,
        name=db_skin.name,
        image_url=db_skin.image_url,
        price=db_skin.price,
        category_id=db_skin.category_id,
        is_active=db_skin.is_active,
        category_name=db_skin.category.name if db_skin.category else None,
        created_at=str(db_skin.created_at) if db_skin.created_at else None
    )

@router.delete("/{skin_id}")
def delete_skin(skin_id: int, db: Session = Depends(get_db)):
    db_skin = db.query(Skin).filter(Skin.id == skin_id).first()
    if not db_skin:
        raise HTTPException(status_code=404, detail="Skin bulunamadı")
    
    db.delete(db_skin)
    db.commit()
    return {"message": "Skin silindi"}

@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Sadece resim dosyalari kabul edilir")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)
    
    return {"url": f"/uploads/skins/{filename}", "filename": filename}
