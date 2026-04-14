import os
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
import models, schemas, security
from database import get_db
from dotenv import load_dotenv

load_dotenv(override=True)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")

router = APIRouter(prefix="/auth/google", tags=["Google OAuth"])

oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile',
        'trust_env': False,
    },
)

@router.get("/login")
async def login(request: Request):
    if not os.getenv("GOOGLE_CLIENT_ID") or not os.getenv("GOOGLE_CLIENT_SECRET"):
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=google_not_configured")

    redirect_uri = f"{BACKEND_URL}/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/callback")
async def callback(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
        userinfo = token.get('userinfo')
    except Exception as e:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=google_failed")
        
    if not userinfo:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=google_failed")

    provider_id = str(userinfo.get("sub"))
    email = userinfo.get("email")
    username = userinfo.get("name")
    avatar_url = userinfo.get("picture")

    db_user = db.query(models.User).filter(models.User.provider_id == provider_id, models.User.provider == "google").first()
    
    if not db_user:
        new_user = models.User(
            provider="google",
            provider_id=provider_id,
            email=email,
            username=username,
            avatar_url=avatar_url
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        db_user = new_user
    else:
        db_user.avatar_url = avatar_url
        db_user.username = username
        if email:
            db_user.email = email
        db.commit()

    access_token = security.create_access_token(data={"sub": db_user.provider_id})
    return RedirectResponse(url=f"{FRONTEND_URL}/profile?token={access_token}")
