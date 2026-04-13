from fastapi import APIRouter, HTTPException
import a2s
import httpx
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor
import asyncio
import re
import os
import sys

router = APIRouter(prefix="/gametracker", tags=["GameTracker"])

CS_IP = "95.173.173.24"
CS_PORT = 27015
BOT_NAMES = ["CSGO.ARXCS.COM", "TS3.ARXCS.COM", "IP: CSGO.ARXCS.COM", "CSGO.ARXCS"]

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
        "/home/server/csgo/addons/sourcemod/configs/adminlist.txt",
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            print(f"[DEBUG] Found adminlist at: {path}")
            return parse_adminlist_file(path)
    print("[DEBUG] No adminlist file found!")
    return []

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
        print(f"[DEBUG] A2S players timeout, trying fallback...")
        return -1

def get_online_admin_count_from_gametracker():
    try:
        import requests
        url = f"https://www.gametracker.com/server/{CS_IP}:{CS_PORT}/"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")
        
        players_div = soup.find("div", id="HTML_online_players")
        if not players_div:
            return 0
            
        rows = players_div.find_all("tr")
        admin_names = get_admin_list()
        
        admin_count = 0
        for row in rows:
            cols = row.find_all("td")
            if len(cols) >= 2:
                player_name = cols[1].get_text(strip=True)
                if player_name and "No players" not in player_name:
                    for admin_name in admin_names:
                        if admin_name.lower() == player_name.lower():
                            admin_count += 1
                            break
        
        print(f"[DEBUG] Gametracker admin count: {admin_count}")
        return admin_count
    except Exception as e:
        print(f"[DEBUG] Gametracker fallback error: {e}")
        return 0

def get_players_sync():
    try:
        address = (CS_IP, CS_PORT)
        players = a2s.players(address, timeout=3.0)
        
        filtered_players = []
        for player in players:
            name = player.name.strip()
            if name and not any(bot.lower() in name.lower() for bot in BOT_NAMES):
                filtered_players.append({
                    "name": name
                })
        
        return {
            "status": "success",
            "server": f"{CS_IP}:{CS_PORT}",
            "players": filtered_players,
            "count": len(filtered_players)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "players": [],
            "count": 0
        }

async def get_players_from_gametracker():
    url = f"https://www.gametracker.com/server/{CS_IP}:{CS_PORT}/"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            
        soup = BeautifulSoup(response.text, "html.parser")
        
        players = []
        
        players_div = soup.find("div", id="HTML_online_players")
        if players_div:
            rows = players_div.find_all("tr")
            for row in rows[1:]:
                cols = row.find_all("td")
                if len(cols) >= 3:
                    rank = cols[0].get_text(strip=True)
                    player_name = cols[1].get_text(strip=True)
                    
                    if player_name and "No players" not in player_name and not any(bot.lower() in player_name.lower() for bot in BOT_NAMES):
                        if rank.replace(".", "").isdigit():
                            players.append({
                                "name": player_name,
                                "rank": rank
                            })
        
        return {
            "status": "success",
            "source": "gametracker",
            "players": players,
            "count": len(players)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "players": [],
            "count": 0
        }

@router.get("/players")
async def get_players():
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        direct_result = await loop.run_in_executor(pool, get_players_sync)
    
    if direct_result["status"] == "success" and direct_result["count"] > 0:
        return direct_result
    
    gametracker_result = await get_players_from_gametracker()
    
    if gametracker_result["status"] == "success" and gametracker_result["count"] > 0:
        return gametracker_result
    
    if direct_result["status"] == "success":
        return direct_result
    
    return gametracker_result

@router.get("/server-info")
async def get_server_info():
    print(f"[SERVER-INFO] Starting request")
    admin_count = 0
    
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, get_online_admin_count)
        print(f"[SERVER-INFO] get_online_admin_count result: {result}")
        
        if result == -1:
            print(f"[SERVER-INFO] Direct query failed, trying gametracker fallback...")
            result = await loop.run_in_executor(None, get_online_admin_count_from_gametracker)
            print(f"[SERVER-INFO] get_online_admin_count_from_gametracker result: {result}")
        
        admin_count = result if result > 0 else 0
        print(f"[SERVER-INFO] Final admin_count: {admin_count}")
    except Exception as e:
        print(f"[SERVER-INFO] Admin count error: {e}")
        import traceback
        traceback.print_exc()
        admin_count = 0
    
    try:
        address = (CS_IP, CS_PORT)
        info = a2s.info(address, timeout=3.0)
        return {
            "status": "success",
            "ip": CS_IP,
            "port": CS_PORT,
            "name": info.server_name,
            "map": info.map_name,
            "players": info.player_count,
            "max_players": info.max_players,
            "admin_online": admin_count
        }
    except Exception as e:
        url = f"https://www.gametracker.com/server/{CS_IP}:{CS_PORT}/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
                response = await client.get(url, headers=headers)
            soup = BeautifulSoup(response.text, "html.parser")
            name_elem = soup.find("span", class_="blocknewheadertitle")
            map_elem = soup.find("div", id="HTML_curr_map")
            players_elem = soup.find("span", id="HTML_num_players")
            max_elem = soup.find("span", id="HTML_max_players")
            return {
                "status": "success",
                "source": "gametracker",
                "ip": CS_IP,
                "port": CS_PORT,
                "name": name_elem.get_text(strip=True) if name_elem else "Unknown",
                "map": map_elem.get_text(strip=True) if map_elem else "Unknown",
                "players": int(players_elem.get_text(strip=True)) if players_elem else 0,
                "max_players": int(max_elem.get_text(strip=True)) if max_elem else 32,
                "admin_online": admin_count
            }
        except Exception as fallback_error:
            print(f"[DEBUG] Gametracker fallback error: {fallback_error}")
            return {
                "status": "error",
                "message": str(fallback_error)
            }
