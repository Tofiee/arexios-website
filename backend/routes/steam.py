import os
import httpx
from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from urllib.parse import urlencode
import models, security
from database import get_db
from dotenv import load_dotenv

load_dotenv(override=True)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")

router = APIRouter(prefix="/auth/steam", tags=["Steam OpenID"])

STEAM_OPENID_URL = "https://steamcommunity.com/openid/login"

@router.get("/login")
def login(request: Request, link_token: str = None):
    return_to = "http://127.0.0.1:8000/auth/steam/callback"
    if link_token:
        return_to += f"?link_token={link_token}"
    
    realm = "http://127.0.0.1:8000"
    params = {
        "openid.ns": "http://specs.openid.net/auth/2.0",
        "openid.mode": "checkid_setup",
        "openid.return_to": return_to,
        "openid.realm": realm,
        "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select"
    }
    encoded_params = urlencode(params)
    return RedirectResponse(f"{STEAM_OPENID_URL}?{encoded_params}")

@router.get("/callback")
async def callback(request: Request, db: Session = Depends(get_db)):
    params = dict(request.query_params)
    params["openid.mode"] = "check_authentication"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(STEAM_OPENID_URL, data=params)
    
    if "is_valid:true" not in response.text:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=steam_validation_failed")

    # Claimed ID looks like: https://steamcommunity.com/openid/id/76561198000000000
    claimed_id = params.get("openid.claimed_id", "")
    steam_64 = claimed_id.split("/")[-1]
    
    if not steam_64:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=invalid_steam_id")
        
    # Fetch user data from Steam API
    api_key = os.getenv("STEAM_WEB_API_KEY")
    username = f"User_{steam_64}"
    avatar_url = ""
    
    if api_key:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(f"http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={api_key}&steamids={steam_64}")
                player_data = res.json().get("response", {}).get("players", [])[0]
                username = player_data.get("personaname", username)
                avatar_url = player_data.get("avatarfull", avatar_url)
        except Exception as e:
            print("Steam API exception:", e)
            pass
            
    # Handle linking versus new user
    link_token = params.get("link_token")
    if link_token:
        # User wants to link steam to their existing account
        try:
            import jwt
            payload = jwt.decode(link_token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
            existing_provider_id = payload.get("sub")
            existing_user = db.query(models.User).filter(models.User.provider_id == existing_provider_id).first()
            if existing_user:
                existing_user.steam_id = steam_64
                db.commit()
                db.refresh(existing_user)
                # Redirect back to profile
                return RedirectResponse(url=f"{FRONTEND_URL}/profile?msg=linked")
        except Exception as e:
            print("Link exception:", e)
            return RedirectResponse(url=f"{FRONTEND_URL}/profile?error=link_failed")

    # Regular login flow (Find or Create Steam User)
    db_user = db.query(models.User).filter(models.User.provider_id == steam_64, models.User.provider == "steam").first()
    
    if not db_user:
        db_user = models.User(
            provider="steam",
            provider_id=steam_64,
            username=username,
            avatar_url=avatar_url,
            steam_id=steam_64
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
    access_token = security.create_access_token(data={"sub": db_user.provider_id})
    return RedirectResponse(url=f"{FRONTEND_URL}/auth/success?token={access_token}")
