from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import push_notifications

router = APIRouter(prefix="/push", tags=["Push Notifications"])

class Subscription(BaseModel):
    endpoint: str
    keys: dict
    admin_id: int

@router.post("/subscribe")
def subscribe(subscription: Subscription):
    if not push_notifications.VAPID_PUBLIC_KEY:
        return {"success": False, "error": "Push notifications not configured"}
    
    push_notifications.save_subscription(
        subscription.admin_id,
        {
            "endpoint": subscription.endpoint,
            "keys": subscription.keys
        }
    )
    return {"success": True}

@router.post("/unsubscribe")
def unsubscribe(body: dict):
    admin_id = body.get("admin_id")
    if admin_id is not None:
        push_notifications.remove_subscription(admin_id)
    return {"success": True}

@router.get("/vapid-public-key")
def get_vapid_public_key():
    key = push_notifications.get_vapid_public_key()
    if not key:
        raise HTTPException(status_code=503, detail="Push notifications not configured")
    return {"publicKey": key}

@router.post("/test/{admin_id}")
def test_push(admin_id: int):
    success = push_notifications.send_push_to_admin(
        admin_id,
        "Test Bildirimi",
        "Push bildirimleri çalışıyor!",
        {"type": "test"}
    )
    return {"success": success}
