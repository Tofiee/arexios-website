from fastapi import APIRouter, Request
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

load_dotenv(override=True)

router = APIRouter(prefix="/discord", tags=["Discord Webhooks"])

def get_discord_webhooks():
    return os.getenv("DISCORD_MARKET_WEBHOOK", ""), os.getenv("DISCORD_SUPPORT_WEBHOOK", "")

class MarketRequest(BaseModel):
    package_name: str
    price: str
    player_nick: str
    discord_id: str = ""
    optional_note: str = ""

class SupportRequest(BaseModel):
    category: str
    player_nick: str
    discord_id: str = ""
    message: str

@router.post("/market")
async def send_market_log(request: MarketRequest):
    MARKET_WEBHOOK, _ = get_discord_webhooks()
    if not MARKET_WEBHOOK:
        # Webhook henüz tanımlanmamış, sadece test olarak logla
        print(f"[DEMO MARKET LOG] Player: {request.player_nick} wants {request.package_name}")
        return {"status": "success", "message": "Demo mode: Siparişiniz simüle edildi."}
        
    embed = {
        "title": "🛒 Yeni VIP / YETKİ Talebi",
        "color": 16753920, # Turuncu
        "fields": [
            {"name": "Paket", "value": request.package_name, "inline": True},
            {"name": "Oyuncu Nicki", "value": request.player_nick, "inline": True},
            {"name": "Tutar", "value": request.price, "inline": True},
            {"name": "Discord İletişimi", "value": request.discord_id if request.discord_id else "Belirtilmemiş", "inline": True},
            {"name": "Ek Not", "value": request.optional_note or "Not yok", "inline": False}
        ],
        "footer": {"text": "Arexios Portal Market Otomasyonu"}
    }
    
    try:
        async with httpx.AsyncClient() as client:
            await client.post(MARKET_WEBHOOK, json={"embeds": [embed]}, timeout=5.0)
        return {"status": "success", "message": "Talebiniz Discord kanalına iletildi!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/support")
async def send_support_log(request: SupportRequest):
    _, SUPPORT_WEBHOOK = get_discord_webhooks()
    if not SUPPORT_WEBHOOK:
        print(f"[DEMO TICKET LOG] {request.player_nick}: [{request.category}] {request.message}")
        return {"status": "success", "message": "Demo mode: Biletiniz sisteme işlendi."}
        
    embed = {
        "title": "📩 Yeni Destek Talebi (Ticket)",
        "color": 3447003, # Mavi
        "fields": [
            {"name": "Kategori", "value": request.category, "inline": True},
            {"name": "Gönderen", "value": request.player_nick, "inline": True},
            {"name": "Discord İletişimi", "value": request.discord_id if request.discord_id else "Belirtilmemiş", "inline": True},
            {"name": "Mesaj", "value": request.message, "inline": False}
        ],
        "footer": {"text": "Arexios Portal Destek Otomasyonu"}
    }
    
    try:
        async with httpx.AsyncClient() as client:
            await client.post(SUPPORT_WEBHOOK, json={"embeds": [embed]}, timeout=5.0)
        return {"status": "success", "message": "Mesajınız yetkililere başarıyla iletildi!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

class SkinPurchaseRequest(BaseModel):
    skin_name: str
    skin_id: int
    price: int
    player_nick: str
    discord_id: str = ""
    optional_note: str = ""

@router.post("/skin-purchase")
async def send_skin_purchase(request: SkinPurchaseRequest):
    MARKET_WEBHOOK, _ = get_discord_webhooks()
    if not MARKET_WEBHOOK:
        print(f"[DEMO SKIN PURCHASE] Player: {request.player_nick} wants {request.skin_name} (ID: {request.skin_id}) for {request.price} TL")
        return {"status": "success", "message": "Demo mode: Siparişiniz simüle edildi."}
        
    embed = {
        "title": "🎮 Yeni Skin Satın Alma Talebi",
        "color": 16753920, # Turuncu
        "fields": [
            {"name": "Skin", "value": request.skin_name, "inline": True},
            {"name": "Skin ID", "value": str(request.skin_id), "inline": True},
            {"name": "Fiyat", "value": f"{request.price} TL", "inline": True},
            {"name": "Oyuncu Nicki", "value": request.player_nick, "inline": True},
            {"name": "Discord İletişimi", "value": request.discord_id if request.discord_id else "Belirtilmemiş", "inline": True},
            {"name": "Ek Not", "value": request.optional_note or "Not yok", "inline": False}
        ],
        "footer": {"text": "Arexios Portal Skin Market Otomasyonu"}
    }
    
    try:
        async with httpx.AsyncClient() as client:
            await client.post(MARKET_WEBHOOK, json={"embeds": [embed]}, timeout=5.0)
        return {"status": "success", "message": "Talebiniz Discord kanalına iletildi!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
