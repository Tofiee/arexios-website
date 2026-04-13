from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models import SkinCategory, User
from routes.auth import get_current_user
import re

router = APIRouter(prefix="/skins/categories", tags=["skin-categories"])

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text

class CategoryCreate(BaseModel):
    name: str

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(SkinCategory).filter(SkinCategory.is_active == True).order_by(SkinCategory.name).all()
    return categories

@router.get("/all", response_model=List[CategoryResponse])
def get_all_categories(db: Session = Depends(get_db)):
    categories = db.query(SkinCategory).order_by(SkinCategory.name).all()
    return categories

@router.post("/", response_model=CategoryResponse)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    existing = db.query(SkinCategory).filter(SkinCategory.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu kategori zaten mevcut")
    
    slug = slugify(category.name)
    db_category = SkinCategory(name=category.name, slug=slug)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(category_id: int, category_update: CategoryUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekli")
    
    db_category = db.query(SkinCategory).filter(SkinCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    if category_update.name is not None:
        db_category.name = category_update.name
        db_category.slug = slugify(category_update.name)
    if category_update.is_active is not None:
        db_category.is_active = category_update.is_active
    
    db.commit()
    db.refresh(db_category)
    return db_category

@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    db_category = db.query(SkinCategory).filter(SkinCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    db.delete(db_category)
    db.commit()
    return {"message": "Kategori silindi"}
