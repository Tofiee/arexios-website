"""
TS3 Proxy Server - Free alternative for querying TeamSpeak servers
Run this on any machine that can reach the TS3 server

Usage:
    python ts3_proxy.py

Requires:
    pip install fastapi uvicorn ts3
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import ts3
import uvicorn

app = FastAPI(title="TS3 Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TS3_HOST = "127.0.0.1"
TS3_QUERY_PORT = 10011
TS3_SERVER_ID = 1

@app.get("/status")
@app.get("/status/{host}:{port}")
def get_ts_status(host: str = TS3_HOST, port: int = TS3_QUERY_PORT, server_id: int = TS3_SERVER_ID):
    try:
        with ts3.query.TS3Connection(f"telnet://{host}", port) as ts3conn:
            ts3conn.exec_("use", sid=server_id)
            info = ts3conn.exec_("serverinfo")[0]
            
            online = int(info.get("virtualserver_clientsonline", 0))
            max_clients = int(info.get("virtualserver_maxclients", 0))
            name = info.get("virtualserver_name", "TeamSpeak Server")
            
            if online > 0:
                online -= 1
            
            return {
                "status": "online",
                "name": name,
                "players": online,
                "max_players": max_clients
            }
    except Exception as e:
        return {
            "status": "offline",
            "error": str(e),
            "players": 0,
            "max_players": 0
        }

@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    print("TS3 Proxy Server starting...")
    print(f"TS3 Host: {TS3_HOST}:{TS3_QUERY_PORT}")
    print("Endpoints:")
    print("  GET /status              - Get TS3 status (uses defaults)")
    print("  GET /status/{host}:{port} - Get TS3 status (custom host)")
    print("")
    uvicorn.run(app, host="0.0.0.0", port=3000)
