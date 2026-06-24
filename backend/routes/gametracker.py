from fastapi import APIRouter, HTTPException
import a2s
import httpx
import requests
from concurrent.futures import ThreadPoolExecutor
import asyncio
import re
import os
import html
import unicodedata
import time
from dotenv import load_dotenv

load_dotenv(override=True)

router = APIRouter(prefix="/gametracker", tags=["GameTracker"])

CS_IP = "95.173.173.24"
CS_PORT = 27015
BOT_NAMES = ["CSGO.ARXCS.COM", "TS3.ARXCS.COM", "IP: CSGO.ARXCS.COM", "CSGO.ARXCS"]
OYUN_TRACKER_API = "https://tracker.oyunyoneticisi.com/api.php"
STEAM_API_KEY = os.getenv("STEAM_WEB_API_KEY", "")

def parse_adminlist_file(file_path):
    admins = []
    steam_admins = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith(';'):
                    continue
                # full format: "name" "password" "flags" "tag"
                match = re.match(r'^"([^"]+)"\s+"([^"]*)"\s+"([^"]*)"\s+"([^"]*)"', line)
                if match:
                    identity = match.group(1)
                    if identity.startswith("STEAM_"):
                        steam_admins.append(identity)
                    elif identity:
                        admins.append(identity)
                else:
                    # simplified format: "name"
                    simple = re.match(r'^"([^"]+)"$', line)
                    if simple:
                        name = simple.group(1)
                        if not name.startswith("STEAM_"):
                            admins.append(name)
                        else:
                            steam_admins.append(name)
    except Exception:
        pass
    return admins, steam_admins

def normalize_name(name: str) -> str:
    name = name.strip().lower()
    name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('ASCII')
    name = name.replace('*', '').replace(';', '').replace(':', '').replace('`', "'")
    return name.strip()

def is_admin_online(player_name: str, admin_names: list[str]) -> bool:
    p = normalize_name(player_name)
    for admin in admin_names:
        a = normalize_name(admin)
        if a == p:
            return True
        if a in p or p in a:
            return True
    return False

_resolved_steam_names = {}
_last_resolved = 0
STEAM_RESOLVE_INTERVAL = 300

def steam_to_64(sid: str) -> str | None:
    try:
        parts = sid.split(":")
        if len(parts) != 3 or not parts[0].startswith("STEAM_"):
            return None
        y = int(parts[1])
        z = int(parts[2])
        return str(76561197960265728 + (z * 2) + y)
    except (ValueError, IndexError):
        return None

def resolve_steam_names(steam_ids: list[str]) -> dict[str, str]:
    global _resolved_steam_names, _last_resolved
    now = time.time()
    if now - _last_resolved < STEAM_RESOLVE_INTERVAL:
        return _resolved_steam_names
    result = {}
    if not STEAM_API_KEY or not steam_ids:
        return result
    try:
        steam64_list = []
        for sid in steam_ids[:100]:
            s64 = steam_to_64(sid)
            if s64:
                steam64_list.append(s64)
        if steam64_list:
            url = f"https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key={STEAM_API_KEY}&steamids={','.join(steam64_list)}"
            resp = requests.get(url, timeout=5)
            data = resp.json()
            for player in data.get("response", {}).get("players", []):
                result[player["steamid"]] = player.get("personaname", "")
            _resolved_steam_names = result
            _last_resolved = now
    except Exception:
        pass
    return result

def get_admin_list():
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "..", "data", "adminlist.txt"),
        "C:\\server\\csgo\\addons\\sourcemod\\configs\\adminlist.txt",
        "/home/server/csgo/addons\\sourcemod\\configs\\adminlist.txt",
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return parse_adminlist_file(path)
    return [], []

async def get_server_info_with_admin():
    try:
        url = f"{OYUN_TRACKER_API}?ip={CS_IP}&port={CS_PORT}"
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(url)
            data = response.json()
            
            if not data.get("success"):
                return None, 0
            
            server = data.get("server", {})
            players = data.get("players", [])
            assets = data.get("assets", {})
            
            nick_admins, steam_admins = get_admin_list()
            admin_names = list(nick_admins)
            steam_names = resolve_steam_names(steam_admins)
            for s64, name in steam_names.items():
                if name:
                    admin_names.append(name)
            admin_count = 0
            online_admins = []
            
            for player in players:
                player_name = html.unescape(player.get("name", "")).strip()
                if player_name and not any(bot.lower() in player_name.lower() for bot in BOT_NAMES):
                    for admin_name in admin_names:
                        if is_admin_online(player_name, [admin_name]):
                            admin_count += 1
                            online_admins.append(admin_name)
                            break
            
            print(f"[SERVER] Online admins: {online_admins} ({admin_count} total)")
            
            server_data = {
                "status": "success",
                "source": "oyunyoneticisi",
                "ip": CS_IP,
                "port": CS_PORT,
                "name": server.get("name", "Unknown"),
                "map": server.get("map", "Unknown"),
                "players": server.get("players", 0),
                "max_players": server.get("playersmax", 32),
                "map_image": assets.get("map_image", ""),
                "admin_online": admin_count,
                "admin_online_names": online_admins,
                "players_list": [
                    {
                        "name": html.unescape(p.get("name", "")),
                        "score": p.get("score", "0"),
                        "time": p.get("time", "00:00:00")
                    }
                    for p in players if not any(bot.lower() in html.unescape(p.get("name", "")).lower() for bot in BOT_NAMES)
                ]
            }
            return server_data, admin_count
    except Exception as e:
        return None, 0

@router.get("/players")
async def get_players():
    server_data, _ = await get_server_info_with_admin()
    
    if server_data and server_data.get("status") == "success":
        return {
            "status": "success",
            "server": f"{CS_IP}:{CS_PORT}",
            "players": server_data.get("players_list", []),
            "count": len(server_data.get("players_list", []))
        }
    
    return {
        "status": "error",
        "message": "Could not fetch players",
        "players": [],
        "count": 0
    }

@router.get("/server-info")
async def get_server_info():
    server_data, admin_count = await get_server_info_with_admin()
    
    if server_data and server_data.get("status") == "success":
        return server_data
    
    try:
        address = (CS_IP, CS_PORT)
        info = a2s.info(address, timeout=3.0)
        players = a2s.players(address, timeout=2.0)
        
        nick_admins, steam_admins = get_admin_list()
        admin_names = list(nick_admins)
        steam_names = resolve_steam_names(steam_admins)
        for s64, name in steam_names.items():
            if name:
                admin_names.append(name)
        admin_online = 0
        for player in players:
            if player.name.strip() and not any(bot.lower() in player.name.lower() for bot in BOT_NAMES):
                if is_admin_online(player.name.strip(), admin_names):
                    admin_online += 1
        
        return {
            "status": "success",
            "source": "a2s",
            "ip": CS_IP,
            "port": CS_PORT,
            "name": info.server_name,
            "map": info.map_name,
            "players": info.player_count,
            "max_players": info.max_players,
            "map_image": "",
            "admin_online": admin_online,
            "players_list": [
                {"name": p.name, "score": str(p.score), "time": str(p.duration)}
                for p in players if p.name.strip() and not any(bot.lower() in p.name.lower() for bot in BOT_NAMES)
            ]
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
