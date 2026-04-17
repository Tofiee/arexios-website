from fastapi import APIRouter, HTTPException
import a2s
import httpx
import requests
from concurrent.futures import ThreadPoolExecutor
import asyncio
import re
import os
import html

router = APIRouter(prefix="/gametracker", tags=["GameTracker"])

CS_IP = "95.173.173.24"
CS_PORT = 27015
BOT_NAMES = ["CSGO.ARXCS.COM", "TS3.ARXCS.COM", "IP: CSGO.ARXCS.COM", "CSGO.ARXCS"]
OYUN_TRACKER_API = "https://tracker.oyunyoneticisi.com/api.php"

def parse_adminlist_file(file_path):
    admins = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith(';'):
                    continue
                match = re.match(r'"([^"]+)"', line)
                if match:
                    admin_name = match.group(1)
                    admins.append(admin_name)
    except Exception as e:
        print(f"Error parsing adminlist: {e}")
    return admins

def get_admin_list():
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "..", "data", "adminlist.txt"),
        "C:\\server\\csgo\\addons\\sourcemod\\configs\\adminlist.txt",
        "/home/server/csgo/addons\\sourcemod\\configs\\adminlist.txt",
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            print(f"[DEBUG] Found adminlist at: {path}")
            return parse_adminlist_file(path)
    print("[DEBUG] No adminlist file found!")
    return []

def get_online_admin_count_from_oyun_tracker():
    try:
        url = f"{OYUN_TRACKER_API}?ip={CS_IP}&port={CS_PORT}"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if not data.get("success"):
            return -1
        
        players = data.get("players", [])
        admin_names = get_admin_list()
        
        print(f"[DEBUG] Admin names from file: {admin_names}")
        print(f"[DEBUG] Online players: {[p['name'] for p in players]}")
        
        admin_count = 0
        for player in players:
            player_name = player.get("name", "").strip()
            if player_name and not any(bot.lower() in player_name.lower() for bot in BOT_NAMES):
                for admin_name in admin_names:
                    if admin_name.lower() == player_name.lower():
                        admin_count += 1
                        print(f"[DEBUG] MATCH! Admin found: {admin_name}")
                        break
        
        print(f"[DEBUG] Total online admins from OyunYoneticisi: {admin_count}")
        return admin_count
    except Exception as e:
        print(f"[DEBUG] OyunYoneticisi API error: {e}")
        return -1

def get_online_admin_count():
    try:
        address = (CS_IP, CS_PORT)
        players = a2s.players(address, timeout=2.0)
        admin_names = get_admin_list()
        
        print(f"[DEBUG] Admin names from file: {admin_names}")
        print(f"[DEBUG] Online players: {[p.name for p in players]}")
        
        admin_count = 0
        for player in players:
            player_name = player.name.strip()
            if player_name and not any(bot.lower() in player_name.lower() for bot in BOT_NAMES):
                for admin_name in admin_names:
                    if admin_name.lower() == player_name.lower():
                        admin_count += 1
                        print(f"[DEBUG] MATCH! Admin found: {admin_name}")
                        break
        
        print(f"[DEBUG] Total online admins: {admin_count}")
        return admin_count
    except Exception as e:
        print(f"[DEBUG] A2S players timeout, trying OyunYoneticisi API...")
        return get_online_admin_count_from_oyun_tracker()

async def get_server_info_from_oyun_tracker():
    try:
        url = f"{OYUN_TRACKER_API}?ip={CS_IP}&port={CS_PORT}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url)
            data = response.json()
            
            if not data.get("success"):
                return None
            
            server = data.get("server", {})
            players = data.get("players", [])
            assets = data.get("assets", {})
            
            return {
                "status": "success",
                "source": "oyunyoneticisi",
                "ip": CS_IP,
                "port": CS_PORT,
                "name": server.get("name", "Unknown"),
                "map": server.get("map", "Unknown"),
                "players": server.get("players", 0),
                "max_players": server.get("playersmax", 32),
                "map_image": assets.get("map_image", ""),
                "players_list": [
                    {
                        "name": html.unescape(p.get("name", "")),
                        "score": p.get("score", "0"),
                        "time": p.get("time", "00:00:00")
                    }
                    for p in players if not any(bot.lower() in html.unescape(p.get("name", "")).lower() for bot in BOT_NAMES)
                ]
            }
    except Exception as e:
        print(f"[DEBUG] OyunYoneticisi API error: {e}")
        return None

@router.get("/players")
async def get_players():
    data = await get_server_info_from_oyun_tracker()
    
    if data and data.get("status") == "success":
        return {
            "status": "success",
            "server": f"{CS_IP}:{CS_PORT}",
            "players": data.get("players_list", []),
            "count": len(data.get("players_list", []))
        }
    
    return {
        "status": "error",
        "message": "Could not fetch players",
        "players": [],
        "count": 0
    }

@router.get("/server-info")
async def get_server_info():
    print(f"[SERVER-INFO] Starting request")
    admin_count = 0
    
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, get_online_admin_count)
        print(f"[SERVER-INFO] get_online_admin_count result: {result}")
        
        if result == -1:
            print(f"[SERVER-INFO] Direct query failed, trying OyunYoneticisi API...")
            result = await loop.run_in_executor(None, get_online_admin_count_from_oyun_tracker)
            print(f"[SERVER-INFO] OyunYoneticisi admin count result: {result}")
        
        admin_count = result if result > 0 else 0
        print(f"[SERVER-INFO] Final admin_count: {admin_count}")
    except Exception as e:
        print(f"[SERVER-INFO] Admin count error: {e}")
        import traceback
        traceback.print_exc()
        admin_count = 0
    
    data = await get_server_info_from_oyun_tracker()
    
    if data and data.get("status") == "success":
        data["admin_online"] = admin_count
        return data
    
    try:
        address = (CS_IP, CS_PORT)
        info = a2s.info(address, timeout=3.0)
        return {
            "status": "success",
            "source": "a2s",
            "ip": CS_IP,
            "port": CS_PORT,
            "name": info.server_name,
            "map": info.map_name,
            "players": info.player_count,
            "max_players": info.max_players,
            "admin_online": admin_count
        }
    except Exception as e:
        print(f"[DEBUG] A2S fallback error: {e}")
        return {
            "status": "error",
            "message": str(e)
        }
