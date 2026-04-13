import os
import httpx
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
import models, security
from urllib.parse import urlencode
from dotenv import load_dotenv

load_dotenv(override=True)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")

router = APIRouter(prefix="/discord", tags=["Discord Auth"])

def get_discord_credentials():
    return os.getenv("DISCORD_CLIENT_ID"), os.getenv("DISCORD_CLIENT_SECRET")

REDIRECT_URI = "http://127.0.0.1:8000/discord/callback"

@router.get("/login")
async def discord_login(request: Request, link_token: str = None):
    """Start Discord OAuth and pass link_token (JWT) safely using the state parameter"""
    CLIENT_ID, _ = get_discord_credentials()
    if not CLIENT_ID:
        raise HTTPException(status_code=500, detail="Discord auth is not configured.")
        
    discord_url = "https://discord.com/api/oauth2/authorize"
    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": "identify"
    }
    
    # We use 'state' to carry our JWT token all the way through Discord Auth and back!
    if link_token:
        params["state"] = link_token
        
    return RedirectResponse(f"{discord_url}?{urlencode(params)}")

@router.get("/callback")
async def discord_callback(request: Request, code: str = None, state: str = None, db: Session = Depends(get_db)):
    """Exchange code, fetch discord username, decode state(JWT) to find user Profile, and link it."""
    CLIENT_ID, CLIENT_SECRET = get_discord_credentials()
    if not code:
        return RedirectResponse(f"{FRONTEND_URL}/profile?error=discord_denied")
        
    token_url = "https://discord.com/api/oauth2/token"
    data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    
    async with httpx.AsyncClient() as client:
        token_res = await client.post(token_url, data=data, headers=headers)
        if token_res.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}/profile?error=discord_token_failed")
            
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        
        # Fetch user info from Discord
        user_res = await client.get("https://discord.com/api/users/@me", headers={"Authorization": f"Bearer {access_token}"})
        if user_res.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}/profile?error=discord_user_failed")
            
        discord_user = user_res.json()
        discord_username = discord_user.get("username")
        if discord_user.get("discriminator") and discord_user.get("discriminator") != "0":
            discord_username = f"{discord_username}#{discord_user.get('discriminator')}"
            
        discord_id = discord_user.get("id")
        
        # If user is logging in ONLY to link to profile, state contains JWT token
        if state:
            import jwt
            try:
                payload = jwt.decode(state, security.SECRET_KEY, algorithms=[security.ALGORITHM])
                existing_provider_id = payload.get("sub")
                existing_user = db.query(models.User).filter(models.User.provider_id == existing_provider_id).first()
                if existing_user:
                    existing_user.discord_id = discord_id
                    existing_user.discord_username = discord_username
                    db.commit()
                    return RedirectResponse(f"{FRONTEND_URL}/profile?success=discord_linked")
            except Exception as e:
                print("Discord Link Exception:", e)
                return RedirectResponse(f"{FRONTEND_URL}/profile?error=link_failed")
        
    return RedirectResponse(f"{FRONTEND_URL}/login?error=discord_only_for_linking")
