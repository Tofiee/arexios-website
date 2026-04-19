from fastapi import APIRouter, HTTPException
import a2s
import httpx
import asyncio
from concurrent.futures import ThreadPoolExecutor
import socket
import socket

try:
    import ts3
    TS3_AVAILABLE = True
except ImportError:
    TS3_AVAILABLE = False

router = APIRouter(prefix="/servers", tags=["Servers"])

CS_IP = "95.173.173.24"
CS_PORT = 27015

TS_HOST = "ts3.arxcs.com"
TS_PORT = 10011
TS_QUERY_PORT = 45123

TS3_PROXY_URL = None

DEMO_ON_FAIL = True

def _check_port_open(host, port, timeout=3):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except:
        return False

def _fetch_cs_sync():
    try:
        address = (CS_IP, CS_PORT)
        info = a2s.info(address, timeout=1.0)
        return {
            "status": "online",
            "name": info.server_name,
            "map": info.map_name,
            "players": info.player_count,
            "max_players": info.max_players,
            "ping": round(info.ping * 1000)
        }
    except Exception as e:
        if DEMO_ON_FAIL:
            return {
                "status": "online",
                "name": "ARXCSGO [DEMO MODE]",
                "map": "de_dust2",
                "players": 24,
                "max_players": 32,
                "ping": 15
            }
        return {"status": "offline", "error": str(e)}

@router.get("/cs")
async def get_cs_status():
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        try:
            # Force timeout to prevent Windows UDP Socket kernel hangs
            result = await asyncio.wait_for(loop.run_in_executor(pool, _fetch_cs_sync), timeout=1.5)
            return result
        except asyncio.TimeoutError:
            if DEMO_ON_FAIL:
                return {
                    "status": "online",
                    "name": "ARXCSGO [CS TIMEOUT DEMO]",
                    "map": "de_dust2",
                    "players": 24,
                    "max_players": 32,
                    "ping": 15
                }
            return {"status": "offline", "error": "timeout"}

def _fetch_ts3_direct():
    print(f"[TS3] TS3_AVAILABLE: {TS3_AVAILABLE}")
    print(f"[TS3] Testing port {TS_HOST}:{TS_QUERY_PORT}...")
    
    if not _check_port_open(TS_HOST, TS_QUERY_PORT, 3):
        print(f"[TS3] Port {TS_QUERY_PORT} is not reachable")
        return {"status": "offline", "error": "Port not reachable"}
    
    if not TS3_AVAILABLE:
        print(f"[TS3] Module still not available despite package")
        return {"status": "offline", "error": "ts3 module not available"}
        with ts3.query.TS3Connection(f"telnet://{TS_HOST}:{TS_QUERY_PORT}") as ts3conn:
            ts3conn.exec_("use", sid=1)
            info_response = ts3conn.exec_("serverinfo")
            info = info_response[0]
            
            client_count = 0
            max_clients = int(info.get("virtualserver_maxclients", 32))
            server_name = info.get("virtualserver_name", "TeamSpeak Server")
            
            try:
                clients = ts3conn.exec_("clientlist")
                client_count = len([c for c in clients if c.get('client_type') == '0'])
            except:
                client_count = int(info.get("virtualserver_clientsonline", 0))
                if client_count > 0: client_count -= 1 

            print(f"[TS3] Connected: {server_name}, {client_count} clients")
            return {
                "status": "online",
                "name": server_name,
                "players": client_count,
                "max_players": max_clients
            }
    except Exception as e:
        print(f"[TS3] Error: {e}")
        return {"status": "offline", "error": str(e)}

def _fetch_ts3_proxy():
    if not TS3_PROXY_URL:
        return {"status": "offline", "error": "No proxy configured"}
    
    try:
        import requests
        resp = requests.get(TS3_PROXY_URL, timeout=5)
        if resp.status_code == 200:
            return resp.json()
        return {"status": "offline", "error": f"Proxy returned {resp.status_code}"}
    except Exception as e:
        return {"status": "offline", "error": str(e)}

def _fetch_ts3_sync():
    result = _fetch_ts3_direct()
    
    if result.get("status") == "offline" and TS3_PROXY_URL:
        result = _fetch_ts3_proxy()
    
    if result.get("status") == "offline" and DEMO_ON_FAIL:
        return {
            "status": "online",
            "name": "ARXCSGO TS3 [DEMO]",
            "players": 18,
            "max_players": 512
        }
    
    return result

@router.get("/ts")
async def get_ts_status():
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        try:
            # Force timeout to prevent TCP Telnet hangs
            result = await asyncio.wait_for(loop.run_in_executor(pool, _fetch_ts3_sync), timeout=2.5)
            return result
        except asyncio.TimeoutError:
            if DEMO_ON_FAIL:
                return {
                    "status": "online",
                    "name": "ARXCSGO TS3 [TIMEOUT DEMO]",
                    "players": 18,
                    "max_players": 512
                }
            return {"status": "offline", "error": "timeout"}
