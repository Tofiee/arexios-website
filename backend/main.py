from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.staticfiles import StaticFiles
import socketio
import asyncio
from database import engine, Base
from routes import google, steam, users, servers, stats, discord, discord_auth, admins, complaints, gametracker, support, push, skins, skin_categories, import_data, migrate, admin_settings, users_ini
from routes.socket_handler import sio, admin_status_scheduler, session_cleanup_scheduler, start_server_monitor
import security
import os
from dotenv import load_dotenv

load_dotenv(override=True)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")

ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "https://arexios-website.vercel.app",
]

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Arexios API")

app.add_middleware(SessionMiddleware, secret_key=security.SECRET_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(google.router)
app.include_router(steam.router)
app.include_router(users.router)
app.include_router(servers.router)
app.include_router(stats.router)
app.include_router(discord.router)
app.include_router(discord_auth.router)
app.include_router(admins.router)
app.include_router(complaints.router)
app.include_router(gametracker.router)
app.include_router(support.router)
app.include_router(push.router)
app.include_router(skins.router)
app.include_router(skin_categories.router)
app.include_router(import_data.router)
app.include_router(migrate.router)
app.include_router(admin_settings.router)
app.include_router(users_ini.router)

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(admin_status_scheduler())
    asyncio.create_task(session_cleanup_scheduler())
    asyncio.create_task(start_server_monitor())

@app.get("/")
def read_root():
    return {"message": "Welcome to Arexios API"}

sio_app = socketio.ASGIApp(sio, app)

app = sio_app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
