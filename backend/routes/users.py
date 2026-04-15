from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import models, schemas, security
from database import get_db

router = APIRouter(prefix="/users", tags=["Users"])

security_scheme = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme), db: Session = Depends(get_db)):
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        provider_id: str = payload.get("sub")
        if provider_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.provider_id == provider_id).first()
    if user is None:
        raise credentials_exception
    return user

@router.get("/me", response_model=schemas.UserResponse)
def get_user_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.get("/all")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(models.User).filter(models.User.is_active == True).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "steam_id": u.steam_id,
            "avatar_url": u.avatar_url,
            "provider": u.provider
        }
        for u in users
    ]
