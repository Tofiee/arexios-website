from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    steam_id: Optional[str] = None
    avatar_url: Optional[str] = None
    provider: str
    provider_id: str
    discord_id: Optional[str] = None
    discord_username: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    steam_id: Optional[str] = None
    avatar_url: Optional[str] = None
    provider: str = "local"
    provider_id: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    provider_id: Optional[str] = None
