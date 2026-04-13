"""
Push Notification Module for Web Push
Requires: pip install pywebpush
"""

from pywebpush import webpush, WebPushException
import json
import os
from dotenv import load_dotenv

load_dotenv(override=True)

VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_SUBJECT = os.getenv("VAPID_SUBJECT", "mailto:admin@arxcs.com")

subscriptions = {}

def get_vapid_public_key():
    return VAPID_PUBLIC_KEY

def save_subscription(admin_id, subscription):
    subscriptions[admin_id] = subscription
    print(f"Push subscription saved for admin {admin_id}")

def remove_subscription(admin_id):
    if admin_id in subscriptions:
        del subscriptions[admin_id]
        print(f"Push subscription removed for admin {admin_id}")

def send_push_to_admin(admin_id, title, body, data=None):
    if admin_id not in subscriptions:
        print(f"No subscription for admin {admin_id}")
        return False
    
    subscription = subscriptions[admin_id]
    endpoint = subscription.get("endpoint", "")
    
    # Extract audience from endpoint URL
    from urllib.parse import urlparse
    try:
        parsed = urlparse(endpoint)
        audience = f"{parsed.scheme}://{parsed.netloc}"
    except:
        audience = "https://fcm.googleapis.com"
    
    payload = json.dumps({
        "title": title,
        "body": body,
        "icon": "/icons/icon-192.png",
        "badge": "/icons/badge-72.png",
        "data": data or {},
        "vibrate": [200, 100, 200],
        "actions": [
            {"action": "open", "title": "Aç"},
            {"action": "dismiss", "title": "Kapat"}
        ]
    })
    
    try:
        webpush(
            subscription_info=subscription,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={
                "sub": VAPID_SUBJECT,
                "aud": audience
            }
        )
        print(f"Push sent to admin {admin_id}: {title}")
        return True
    except WebPushException as e:
        print(f"Push failed for admin {admin_id}: {e}")
        if e.response and e.response.status_code == 410:
            remove_subscription(admin_id)
        return False
    except Exception as e:
        print(f"Push error for admin {admin_id}: {e}")
        return False

def broadcast_to_all_admins(title, body, data=None):
    success = 0
    for admin_id in list(subscriptions.keys()):
        if send_push_to_admin(admin_id, title, body, data):
            success += 1
    return success
