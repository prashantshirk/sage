import requests
from datetime import datetime, timezone
from flask import current_app


def refresh_google_token_if_needed(db, user_id, user):
    """
    Checks if the Google access token is expired and refreshes it if a
    refresh_token is available. Returns a valid access token or None.
    """
    access_token = user.get("google_access_token")
    refresh_token = user.get("google_refresh_token")
    expiry = user.get("google_token_expiry")

    if not access_token:
        return None

    # Check if token is expired (or expiring in the next 5 minutes)
    token_expired = False
    if expiry:
        try:
            if isinstance(expiry, str):
                expiry_dt = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
            else:
                expiry_dt = expiry
            if expiry_dt.tzinfo is None:
                expiry_dt = expiry_dt.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            from datetime import timedelta
            if expiry_dt - now < timedelta(minutes=5):
                token_expired = True
        except Exception:
            pass

    if not token_expired:
        return access_token

    if not refresh_token:
        return access_token  # Return stale token, let caller handle 401

    # Refresh the token
    try:
        response = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": current_app.config.get("GOOGLE_CLIENT_ID"),
                "client_secret": current_app.config.get("GOOGLE_CLIENT_SECRET"),
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
            timeout=10,
        )
        token_data = response.json()
        if "error" in token_data:
            current_app.logger.warning(f"Token refresh failed: {token_data.get('error')}")
            return access_token

        new_access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in", 3600)

        from datetime import timedelta
        new_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        # Update DB
        from bson import ObjectId
        db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "google_access_token": new_access_token,
                "google_token_expiry": new_expiry.isoformat(),
                "updated_at": datetime.now(timezone.utc),
            }}
        )
        current_app.logger.info(f"  - Google token refreshed for user {user_id}")
        return new_access_token

    except Exception as e:
        current_app.logger.error(f"Token refresh exception: {e}")
        return access_token
