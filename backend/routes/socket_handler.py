import socketio
import asyncio
from datetime import datetime, timedelta
from database import SessionLocal
import models
import os
import httpx
import requests

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
VERCEL_URL = os.getenv("VERCEL_URL", "https://arexios-website.vercel.app")

CS_IP = "95.173.173.24"
CS_PORT = 27015
OYUN_TRACKER_API = "https://tracker.oyunyoneticisi.com/api.php"
SERVER_CHECK_INTERVAL = 10

async def get_location_from_ip(ip_address):
    if not ip_address or ip_address in ['127.0.0.1', 'localhost', '::1']:
        return 'Local'
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"http://ip-api.com/json/{ip_address}?fields=status,country,city")
            data = response.json()
            if data.get('status') == 'success':
                country = data.get('country', '')
                city = data.get('city', '')
                if city:
                    return f"{city}, {country}"
                return country
            return ip_address
    except Exception:
        return ip_address

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=[
        FRONTEND_URL,
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "https://arexios-website.vercel.app",
        "https://*.vercel.app"
    ],
    cors_credentials=True,
    ping_timeout=60,
    ping_interval=25
)

online_admins = {}
active_sessions = {}
taken_sessions = {}
admin_sessions = {}
user_sessions = {}

AWAY_TIMEOUT_MINUTES = 5
AWAY_CHECK_INTERVAL = 60

try:
    from teamspeak_notifier import notify_support_request, notify_support_message
    TEAMSPEAK_ENABLED = True
except ImportError:
    TEAMSPEAK_ENABLED = False
    def notify_support_request(user_name, session_id): pass
    def notify_support_message(user_name, message): pass

try:
    from push_notifications import broadcast_to_all_admins
    PUSH_ENABLED = True
except ImportError:
    PUSH_ENABLED = False
    def broadcast_to_all_admins(title, body, data): pass

async def check_server_status():
    try:
        url = f"{OYUN_TRACKER_API}?ip={CS_IP}&port={CS_PORT}"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if data.get("success"):
            server = data.get("server", {})
            players = data.get("players", [])
            
            await sio.emit('server_status', {
                'status': server.get('status', 'offline'),
                'name': server.get('name', 'Unknown'),
                'map': server.get('map', 'Unknown'),
                'players': server.get('players', 0),
                'max_players': server.get('playersmax', 32),
                'player_count': len(players),
                'timestamp': datetime.now().isoformat()
            }, room='server_room')
    except Exception:
        pass

async def start_server_monitor():
    while True:
        await check_server_status()
        await asyncio.sleep(SERVER_CHECK_INTERVAL)

@sio.event
async def connect(sid, environ):
    remote_addr = environ.get('HTTP_X_FORWARDED_FOR', environ.get('REMOTE_ADDR', ''))
    if remote_addr:
        ip_list = remote_addr.split(',')
        client_ip = ip_list[0].strip()
    else:
        client_ip = environ.get('REMOTE_ADDR', 'unknown')
    
    user_agent = environ.get('HTTP_USER_AGENT', 'Bilinmiyor')
    
    active_sessions[sid] = {
        'ip_address': client_ip,
        'user_agent': user_agent,
        'user_name': None,
        'user_id': None,
        'user_email': None,
        'session_id': None
    }

@sio.event
async def disconnect(sid):
    if sid in online_admins:
        admin_info = online_admins.pop(sid)
        admin_steam = admin_info.get('admin_steam_id', '')
        if admin_steam in admin_sessions:
            del admin_sessions[admin_steam]
        await sio.emit('admin_offline', {
            'admin_id': admin_info['admin_id'], 
            'admin_name': admin_info['admin_name'],
            'status': 'offline'
        })
        await broadcast_admin_list()
    
    if sid in active_sessions:
        session_info = active_sessions.pop(sid)
        await sio.emit('user_disconnected', {'session_id': session_info['session_id']}, room=f"admin")

@sio.event
async def user_join(sid, data):
    user_name = data.get('user_name', 'Misafir')
    user_id = data.get('user_id')
    user_email = data.get('user_email', '')
    session_id = data.get('session_id')
    
    existing_info = active_sessions.get(sid, {})
    ip_address = existing_info.get('ip_address', 'unknown')
    user_agent = existing_info.get('user_agent', 'Bilinmiyor')
    location = await get_location_from_ip(ip_address)
    
    active_sessions[sid] = {
        'user_name': user_name,
        'user_id': user_id,
        'user_email': user_email,
        'session_id': session_id,
        'ip_address': ip_address,
        'location': location,
        'user_agent': user_agent
    }
    
    if session_id:
        user_sessions[session_id] = sid
        await sio.enter_room(sid, f"session_{session_id}")
        
        await sio.emit('user_location', {
            'session_id': session_id,
            'ip_address': ip_address,
            'location': location,
            'user_name': user_name,
            'user_agent': user_agent
        }, room='admin_room')
    
    await send_admin_status_info(sid)

@sio.event
async def request_admin_status(sid, data=None):
    await send_admin_status_info(sid)

async def send_admin_status_info(sid=None):
    online_count = 0
    busy_count = 0
    away_count = 0
    
    for admin in online_admins.values():
        if admin['status'] == 'online':
            online_count += 1
        elif admin['status'] == 'busy':
            busy_count += 1
        elif admin['status'] == 'away':
            away_count += 1
    
    total_available = online_count
    total_busy = busy_count
    total_away = away_count
    
    if total_available > 0:
        if total_available >= 3:
            estimated_time = "< 30 sn"
        elif total_available == 2:
            estimated_time = "~30 sn"
        else:
            estimated_time = "~1-2 dk"
    elif total_busy > 0:
        estimated_time = "~10-15 dk"
    elif total_away > 0:
        estimated_time = "~20-30 dk"
    else:
        estimated_time = None
    
    any_admin_available = online_count > 0 or busy_count > 0 or away_count > 0
    
    status_info = {
        'online_count': online_count,
        'busy_count': busy_count,
        'away_count': away_count,
        'total_count': online_count + busy_count + away_count,
        'estimated_response_time': estimated_time,
        'any_admin_online': any_admin_available
    }
    
    if sid:
        await sio.emit('admin_status_info', status_info, to=sid)
    else:
        await sio.emit('admin_status_info', status_info)
    
    return status_info

@sio.event
async def user_typing(sid, data):
    session_id = data.get('session_id')
    is_typing = data.get('is_typing', False)
    typing_text = data.get('typing_text', '')
    
    if session_id:
        await sio.emit('user_typing', {
            'session_id': session_id,
            'user_name': active_sessions.get(sid, {}).get('user_name', 'Misafir'),
            'is_typing': is_typing,
            'typing_text': typing_text
        }, room='admin_room')

@sio.event
async def user_location(sid, data):
    session_id = data.get('session_id')
    page_url = data.get('page_url', '')
    page_title = data.get('page_title', '')
    
    if sid in active_sessions:
        active_sessions[sid]['current_page'] = page_url
        active_sessions[sid]['page_title'] = page_title
    
    if session_id:
        await sio.emit('user_location', {
            'session_id': session_id,
            'page_url': page_url,
            'page_title': page_title
        }, room='admin_room')

@sio.event
async def send_message(sid, data):
    session_id = data.get('session_id')
    message = data.get('message')
    sender_type = data.get('sender_type', 'user')
    sender_name = data.get('sender_name', 'Kullanıcı')
    
    if not message or not message.strip():
        return
    
    if session_id:
        user_sessions[session_id] = sid
        await sio.enter_room(sid, f"session_{session_id}")
        
        db = SessionLocal()
        try:
            msg = models.SupportMessage(
                session_id=session_id,
                sender_type=sender_type,
                sender_name=sender_name,
                message=message.strip()
            )
            db.add(msg)
            db.commit()
            db.refresh(msg)
            
            message_data = {
                'id': msg.id,
                'session_id': session_id,
                'sender_type': sender_type,
                'sender_name': sender_name,
                'message': message,
                'created_at': msg.created_at.isoformat()
            }
            
            await sio.emit('new_message', message_data, room=f"session_{session_id}")
            await sio.emit('new_message', message_data, room='admin_room')
            
            user_info = active_sessions.get(sid, {})
            ip_address = user_info.get('ip_address', 'unknown')
            location = user_info.get('location', 'Bilinmiyor')
            user_agent = user_info.get('user_agent', 'Bilinmiyor')
            
            await sio.emit('admin_notification', {
                'type': 'new_message',
                'user_name': sender_name,
                'session_id': session_id,
                'message_preview': message[:50],
                'timestamp': datetime.now().isoformat(),
                'ip_address': ip_address,
                'location': location,
                'user_agent': user_agent
            }, room='admin_room')
            
            if PUSH_ENABLED and online_admins:
                broadcast_to_all_admins(
                    f"📩 {sender_name}",
                    message[:100] + ("..." if len(message) > 100 else ""),
                    {"type": "new_message", "session_id": session_id, "user_name": sender_name}
                )
            
            if TEAMSPEAK_ENABLED:
                try:
                    loop = asyncio.get_event_loop()
                    await loop.run_in_executor(None, notify_support_message, sender_name, message[:200])
                except:
                    pass
            
        finally:
            db.close()
    
    @sio.event
    async def user_message(sid, data):
        message = data.get('message')
        sender_name = data.get('sender_name', 'Kullanıcı')
        sender_type = data.get('sender_type', 'user')
        is_skin_purchase = data.get('is_skin_purchase', False)
        
        if not message or not message.strip():
            return
        
        db = SessionLocal()
        try:
            message_data = {
                'id': 0,
                'session_id': 0,
                'sender_type': sender_type,
                'sender_name': sender_name,
                'message': message,
                'created_at': datetime.now().isoformat(),
                'is_skin_purchase': is_skin_purchase
            }
            
            await sio.emit('new_message', message_data, room='admin_room')
            
            user_info = active_sessions.get(sid, {})
            ip_address = user_info.get('ip_address', 'unknown')
            location = user_info.get('location', 'Bilinmiyor')
            
            await sio.emit('admin_notification', {
                'type': 'skin_purchase' if is_skin_purchase else 'new_message',
                'user_name': sender_name,
                'session_id': 0,
                'message_preview': message[:50],
                'timestamp': datetime.now().isoformat(),
                'ip_address': ip_address,
                'location': location,
                'is_skin_purchase': is_skin_purchase
            }, room='admin_room')
            
            if PUSH_ENABLED and online_admins:
                icon = "🎮" if is_skin_purchase else "📩"
                broadcast_to_all_admins(
                    f"{icon} {sender_name}",
                    message[:100] + ("..." if len(message) > 100 else ""),
                    {"type": "skin_purchase" if is_skin_purchase else "new_message", "session_id": 0}
                )
        
        finally:
            db.close()
    
    @sio.event
    async def admin_message(sid, data):
        session_id = data.get('session_id')
        message = data.get('message')
        sender_name = data.get('sender_name', 'Admin')

        if not message or not message.strip():
            return

        db = SessionLocal()
        try:
            session = db.query(models.SupportSession).filter(models.SupportSession.id == session_id).first()
            if session and session.status == 'closed':
                await sio.emit('session_closed', {
                    'session_id': session_id,
                    'reason': 'already_closed'
                }, room=f"session_{session_id}")
                return

            msg = models.SupportMessage(
                session_id=session_id,
                sender_type='admin',
                sender_name=sender_name,
                message=message.strip()
            )
            db.add(msg)
            db.commit()
            db.refresh(msg)

            message_data = {
                'id': msg.id,
                'session_id': session_id,
                'sender_type': 'admin',
                'sender_name': sender_name,
                'message': message,
                'created_at': msg.created_at.isoformat()
            }

            await sio.emit('new_message', message_data, room=f"session_{session_id}")
            await sio.emit('new_message', message_data, room='admin_room')
            await sio.emit('admin_typing', {
                'session_id': session_id,
                'admin_name': sender_name,
                'is_typing': False
            }, room=f"session_{session_id}")

        finally:
            db.close()

@sio.event
async def admin_typing(sid, data):
    session_id = data.get('session_id')
    is_typing = data.get('is_typing', False)
    
    if session_id and sid in online_admins:
        admin_name = online_admins[sid].get('admin_name', 'Admin')
        await sio.emit('admin_typing', {
            'session_id': session_id,
            'admin_name': admin_name,
            'is_typing': is_typing
        }, room=f"session_{session_id}")

@sio.event
async def admin_login(sid, data):
    admin_id = data.get('admin_id')
    admin_name = data.get('admin_name', 'Admin')
    admin_steam_id = data.get('admin_steam_id', '')
    
    existing_sid = None
    for old_sid, admin_data in list(online_admins.items()):
        if admin_data.get('admin_steam_id') == admin_steam_id or admin_data.get('admin_id') == admin_id:
            existing_sid = old_sid
            break
    
    if existing_sid and existing_sid != sid:
        await sio.disconnect(existing_sid)
    
    online_admins[sid] = {
        'admin_id': admin_id,
        'admin_name': admin_name,
        'admin_steam_id': admin_steam_id,
        'status': 'online',
        'last_activity': datetime.now(),
        'sessions_handled': 0
    }
    
    admin_sessions[admin_steam_id] = sid
    
    await sio.enter_room(sid, 'admin_room')
    
    await broadcast_admin_list()
    await sio.emit('admin_online', {
        'admin_id': admin_id, 
        'admin_name': admin_name, 
        'admin_steam_id': admin_steam_id,
        'status': 'online'
    })

@sio.event
async def admin_heartbeat(sid, data):
    if sid in online_admins:
        online_admins[sid]['last_activity'] = datetime.now()
        if online_admins[sid]['status'] == 'away':
            online_admins[sid]['status'] = 'online'
            await sio.emit('admin_status_change', {
                'admin_id': online_admins[sid]['admin_id'],
                'admin_name': online_admins[sid]['admin_name'],
                'status': 'online'
            }, room='admin_room')
            status_info = await send_admin_status_info()
            await sio.emit('admin_status_info', status_info)

@sio.event
async def admin_set_busy(sid, data):
    if sid in online_admins:
        online_admins[sid]['status'] = 'busy'
        online_admins[sid]['sessions_handled'] = online_admins[sid].get('sessions_handled', 0) + 1
        online_admins[sid]['last_activity'] = datetime.now()
        await sio.emit('admin_status_change', {
            'admin_id': online_admins[sid]['admin_id'],
            'admin_name': online_admins[sid]['admin_name'],
            'status': 'busy'
        }, room='admin_room')
        status_info = await send_admin_status_info()
        await sio.emit('admin_status_info', status_info)

@sio.event
async def admin_set_available(sid, data):
    if sid in online_admins:
        online_admins[sid]['status'] = 'online'
        online_admins[sid]['last_activity'] = datetime.now()
        await sio.emit('admin_status_change', {
            'admin_id': online_admins[sid]['admin_id'],
            'admin_name': online_admins[sid]['admin_name'],
            'status': 'online'
        }, room='admin_room')
        status_info = await send_admin_status_info()
        await sio.emit('admin_status_info', status_info)

@sio.event
async def admin_set_away(sid, data):
    if sid in online_admins:
        online_admins[sid]['status'] = 'away'
        await sio.emit('admin_status_change', {
            'admin_id': online_admins[sid]['admin_id'],
            'admin_name': online_admins[sid]['admin_name'],
            'status': 'away'
        }, room='admin_room')
        status_info = await send_admin_status_info()
        await sio.emit('admin_status_info', status_info)

async def broadcast_admin_list():
    admins_list = []
    now = datetime.now()
    for sid, admin in online_admins.items():
        status = admin['status']
        if status == 'online' and admin.get('last_activity'):
            time_since_activity = now - admin['last_activity']
            if time_since_activity > timedelta(minutes=AWAY_TIMEOUT_MINUTES):
                status = 'away'
        admins_list.append({
            'admin_id': admin['admin_id'],
            'admin_name': admin['admin_name'],
            'admin_steam_id': admin.get('admin_steam_id', ''),
            'status': status,
            'sessions_handled': admin.get('sessions_handled', 0)
        })
    await sio.emit('admin_list', {'admins': admins_list})
    
    status_info = await send_admin_status_info()
    await sio.emit('admin_status_info', status_info)

async def check_away_admins():
    now = datetime.now()
    for sid in list(online_admins.keys()):
        if online_admins[sid]['status'] == 'online':
            time_since_activity = now - online_admins[sid].get('last_activity', now)
            if time_since_activity > timedelta(minutes=AWAY_TIMEOUT_MINUTES):
                online_admins[sid]['status'] = 'away'
                await sio.emit('admin_status_change', {
                    'admin_id': online_admins[sid]['admin_id'],
                    'admin_name': online_admins[sid]['admin_name'],
                    'status': 'away'
                }, room='admin_room')
    status_info = await send_admin_status_info()
    await sio.emit('admin_status_info', status_info)

SESSION_TIMEOUT_HOURS = 2
SESSION_CHECK_INTERVAL = 300

async def close_inactive_sessions():
    db = SessionLocal()
    try:
        from models import SupportSession, SupportMessage
        now = datetime.now()
        timeout_threshold = now - timedelta(hours=SESSION_TIMEOUT_HOURS)
        
        inactive_sessions = db.query(SupportSession).filter(
            SupportSession.status.in_(['waiting', 'active']),
            SupportSession.updated_at < timeout_threshold
        ).all()
        
        for session in inactive_sessions:
            session_id = session.id
            
            msg = SupportMessage(
                session_id=session_id,
                sender_type='system',
                sender_name='Sistem',
                message='Oturum 2 saat işlem yapılmadığı için otomatik olarak kapatıldı.'
            )
            db.add(msg)
            session.status = 'closed'
            db.commit()
            
            if session_id in user_sessions:
                await sio.emit('session_closed', {
                    'session_id': session_id,
                    'reason': 'timeout',
                    'closed_by': 'system'
                }, room=f"session_{session_id}")
                del user_sessions[session_id]
            
            await sio.emit('session_closed', {
                'session_id': session_id,
                'reason': 'timeout',
                'closed_by': 'system'
            }, room='admin_room')
            
            db.delete(session)
            db.commit()
            
    except Exception:
        db.rollback()
    finally:
        db.close()

async def admin_status_scheduler():
    while True:
        await asyncio.sleep(AWAY_CHECK_INTERVAL)
        await check_away_admins()
        await broadcast_admin_list()

async def session_cleanup_scheduler():
    while True:
        await asyncio.sleep(SESSION_CHECK_INTERVAL)
        await close_inactive_sessions()

@sio.event
async def get_online_admins(sid, data):
    admins_list = []
    now = datetime.now()
    for admin in online_admins.values():
        status = admin['status']
        if status == 'online' and admin.get('last_activity'):
            time_since_activity = now - admin['last_activity']
            if time_since_activity > timedelta(minutes=AWAY_TIMEOUT_MINUTES):
                status = 'away'
        admins_list.append({
            'admin_id': admin['admin_id'],
            'admin_name': admin['admin_name'],
            'admin_steam_id': admin.get('admin_steam_id', ''),
            'status': status,
            'sessions_handled': admin.get('sessions_handled', 0)
        })
    await sio.emit('online_admins_response', {'admins': admins_list}, room=sid)

@sio.event
async def take_session(sid, data):
    session_id = data.get('session_id')
    admin_id = data.get('admin_id')
    admin_name = data.get('admin_name')
    
    if session_id in taken_sessions and taken_sessions[session_id] != admin_id:
        await sio.emit('session_locked', {
            'session_id': session_id,
            'taken_by': taken_sessions[session_id]
        }, room=sid)
        return
    
    taken_sessions[session_id] = admin_id
    
    db = SessionLocal()
    try:
        session = db.query(models.SupportSession).filter(models.SupportSession.id == session_id).first()
        if session:
            session.status = 'active'
            session.assigned_admin_id = admin_id
            session.assigned_admin_name = admin_name
            db.commit()
            
            await sio.emit('session_taken', {
                'session_id': session_id,
                'admin_name': admin_name
            }, room=f"session_{session_id}")
            
            await sio.emit('session_assigned', {
                'session_id': session_id,
                'admin_name': admin_name,
                'admin_id': admin_id
            }, room='admin_room')
            
    finally:
        db.close()

@sio.event
async def close_session(sid, data):
    session_id = data.get('session_id')
    admin_id = data.get('admin_id')
    reason = data.get('reason', 'manual')
    
    await sio.enter_room(sid, f"session_{session_id}")
    
    if session_id in taken_sessions and taken_sessions[session_id] == admin_id:
        del taken_sessions[session_id]
    
    db = SessionLocal()
    try:
        session = db.query(models.SupportSession).filter(models.SupportSession.id == session_id).first()
        if session:
            if reason == 'user_closed':
                session.status = 'user_closed'
            else:
                session.status = 'closed'
            db.commit()
            
            if reason == 'user_closed':
                if session_id in user_sessions:
                    user_sid = user_sessions[session_id]
                    await sio.emit('session_closed', {
                        'session_id': session_id,
                        'reason': reason,
                        'closed_by': 'user'
                    }, to=user_sid)
                
                await sio.emit('user_session_closed', {
                    'session_id': session_id,
                    'user_name': session.user_name
                }, room='admin_room')
                
                db.delete(session)
                db.commit()
            else:
                await sio.emit('session_closed', {
                    'session_id': session_id,
                    'reason': reason,
                    'closed_by': 'admin'
                }, room=f"session_{session_id}")
                
                await sio.emit('session_closed', {
                    'session_id': session_id,
                    'reason': reason,
                    'closed_by': 'admin'
                }, room='admin_room')
                
                db.delete(session)
                db.commit()
            
            if session_id in user_sessions:
                del user_sessions[session_id]
            
    finally:
        db.close()

@sio.event
async def transfer_session(sid, data):
    session_id = data.get('session_id')
    from_admin_id = data.get('from_admin_id')
    from_admin_name = data.get('from_admin_name')
    to_admin_name = data.get('to_admin_name')
    
    if session_id in taken_sessions and taken_sessions[session_id] == from_admin_id:
        del taken_sessions[session_id]
    
    db = SessionLocal()
    try:
        session = db.query(models.SupportSession).filter(models.SupportSession.id == session_id).first()
        if session:
            session.assigned_admin_name = to_admin_name
            session.assigned_admin_id = 0
            session.status = 'waiting'
            db.commit()
            
            await sio.emit('session_transferred', {
                'session_id': session_id,
                'from_admin': from_admin_name,
                'to_admin': to_admin_name
            }, room='admin_room')
            
            await sio.emit('session_taken', {
                'session_id': session_id,
                'admin_name': to_admin_name
            }, room=f"session_{session_id}")
            
            await sio.emit('waiting_position', {
                'message': f'Oturum {from_admin_name} tarafından {to_admin_name}\'e devredildi. Yeni admin en kısa sürede sizinle ilgilenecektir.',
                'timestamp': datetime.now().isoformat()
            }, room=f"session_{session_id}")
            
    finally:
        db.close()

@sio.event
async def typing(sid, data):
    session_id = data.get('session_id')
    sender_type = data.get('sender_type')
    is_typing = data.get('is_typing', False)
    
    if sender_type == 'user':
        await sio.emit('user_typing', {'session_id': session_id, 'is_typing': is_typing}, room='admin_room')
    else:
        await sio.emit('admin_typing', {'session_id': session_id, 'is_typing': is_typing}, room=f"session_{session_id}")

@sio.event
async def join_room(sid, data):
    room = data.get('room')
    if room:
        await sio.enter_room(sid, room)
