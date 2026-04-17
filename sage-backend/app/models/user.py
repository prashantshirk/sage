from datetime import datetime, timezone
from bson import ObjectId
from . import serialize_document

def create_user(db, data):
    """
    Inserts a new user and returns the serialized user document.
    """
    now = datetime.now(timezone.utc)
    user_doc = {
        "email": data.get("email"),
        "name": data.get("name"),
        "avatar": data.get("avatar"),
        "google_access_token": data.get("google_access_token"),
        "google_refresh_token": data.get("google_refresh_token"),
        "google_token_expiry": data.get("google_token_expiry"),
        "timezone": data.get("timezone", "Asia/Kolkata"),
        "currency": data.get("currency", "INR"),
        "briefing_time": data.get("briefing_time", "08:00"),
        "notifications": data.get("notifications", {
            "daily_briefing": True,
            "bill_reminders": True,
            "overdue_alerts": True
        }),
        "created_at": now,
        "updated_at": now
    }
    result = db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return serialize_document(user_doc)

def get_user_by_email(db, email):
    """
    Returns a serialized user document by email.
    """
    user = db.users.find_one({"email": email})
    return serialize_document(user) if user else None

def get_user_by_id(db, user_id):
    """
    Returns a serialized user document by ID.
    """
    try:
        user = db.users.find_one({"_id": ObjectId(user_id)})
        return serialize_document(user) if user else None
    except Exception:
        return None

def update_user(db, user_id, data):
    """
    Updates user fields and returns the updated serialized user.
    """
    data["updated_at"] = datetime.now(timezone.utc)
    db.users.update_one({"_id": ObjectId(user_id)}, {"$set": data})
    return get_user_by_id(db, user_id)

def update_google_tokens(db, user_id, access_token, refresh_token, expiry):
    """
    Updates Google OAuth tokens for a user.
    """
    update_data = {
        "google_access_token": access_token,
        "google_token_expiry": expiry,
        "updated_at": datetime.now(timezone.utc)
    }
    if refresh_token:
        update_data["google_refresh_token"] = refresh_token
    
    result = db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    return result.modified_count > 0
