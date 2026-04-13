import ts3
import logging
from concurrent.futures import ThreadPoolExecutor
import asyncio

TS_HOST = "TS3.ARXCS.COM"
TS_PORT = 10011
TS_USER = "serveradmin"
TS_PASS = "Kingmaster123"
TS_CHANNEL_ID = 1

ADMIN_CLIENT_DBIDS = []

def notify_admins_via_teamspeak(message):
    try:
        with ts3.query.TS3Connection(f"telnet://{TS_HOST}:{TS_PORT}", timeout=5.0) as ts3conn:
            ts3conn.exec_("login", client_username=TS_USER, client_password=TS_PASS)
            ts3conn.exec_("use", sid=1)
            ts3conn.exec_("sendtextmessage", targetmode=3, target=0, msg=message)
            ts3conn.exec_("logout")
            return True
    except Exception as e:
        logging.error(f"TeamSpeak notification failed: {e}")
        return False

def send_notification_async(message):
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(notify_admins_via_teamspeak, message)
    return future

def get_online_admins():
    try:
        with ts3.query.TS3Connection(f"telnet://{TS_HOST}:{TS_PORT}", timeout=5.0) as ts3conn:
            ts3conn.exec_("login", client_username=TS_USER, client_password=TS_PASS)
            ts3conn.exec_("use", sid=1)
            
            clients = ts3conn.exec_("clientlist")
            admins = []
            
            for client in clients:
                if client.get("client_type") == "0":
                    client_dbid = client.get("client_database_id")
                    if client_dbid in ADMIN_CLIENT_DBIDS:
                        admins.append({
                            "nickname": client.get("client_nickname"),
                            "dbid": client_dbid
                        })
            
            return admins
    except Exception as e:
        logging.error(f"Failed to get online admins: {e}")
        return []

def notify_support_request(user_name, session_id):
    message = f"[COLOR=orange]📩 YENİ DESTEK TALEBİ[/COLOR]\n\nKullanıcı: {user_name}\nOturum ID: {session_id}\n\nSiteye girip destek ver!"
    send_notification_async(message)

def notify_support_message(user_name, message):
    message = f"[COLOR=orange]📨 DESTEK MESAJI[/COLOR]\n\nKullanıcı: {user_name}\nMesaj: {message[:100]}..."
    send_notification_async(message)
