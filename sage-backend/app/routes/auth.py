import requests
import urllib.parse
from flask import Blueprint, jsonify, request, redirect, current_app
import google.oauth2.credentials
import google.auth.transport.requests

from app import get_db
from app.models.user import get_user_by_email, create_user, update_google_tokens, get_user_by_id
from app.utils.auth_helpers import generate_token, require_auth, get_current_user_id

auth_bp = Blueprint("auth", __name__)

GOOGLE_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.readonly",
]

@auth_bp.route("/google/login", methods=["GET"])
def google_start():
    # Build the Google OAuth URL manually — NO PKCE, fully stateless
    params = {
        "client_id": current_app.config["GOOGLE_CLIENT_ID"],
        "redirect_uri": current_app.config["GOOGLE_REDIRECT_URI"],
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
    }
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return jsonify({"auth_url": auth_url}), 200

@auth_bp.route("/callback", methods=["GET"])
def google_callback():
    code = request.args.get("code")
    if not code:
        return jsonify({"error": "Missing OAuth code."}), 400

    # Exchange code for tokens directly via HTTP POST
    # This avoids PKCE (code_verifier) issues with stateless Flow reconstruction
    try:
        token_response = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": current_app.config["GOOGLE_CLIENT_ID"],
                "client_secret": current_app.config["GOOGLE_CLIENT_SECRET"],
                "redirect_uri": current_app.config["GOOGLE_REDIRECT_URI"],
                "grant_type": "authorization_code",
            },
            timeout=10,
        )
        token_data = token_response.json()
        if "error" in token_data:
            return jsonify({"error": f"Token exchange failed: {token_data.get('error_description', token_data['error'])}"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to fetch token: {str(e)}"}), 400

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    
    # Fetch user profile using the access token
    profile_response = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if profile_response.status_code != 200:
        return jsonify({"error": "Unable to fetch Google profile."}), 400

    profile = profile_response.json()
    email = profile.get("email")

    db = get_db()
    user = get_user_by_email(db, email)
    if not user:
        user_data = {
            "email": email,
            "name": profile.get("name"),
            "avatar": profile.get("picture"),
        }
        user = create_user(db, user_data)

    # Calculate expiry
    expires_in = token_data.get("expires_in", 3600)
    from datetime import datetime, timezone, timedelta
    expiry_dt = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # Store tokens
    update_google_tokens(
        db,
        user["_id"],
        access_token,
        refresh_token,
        expiry_dt.isoformat()
    )

    # Generate JWT and redirect to frontend
    jwt_token = generate_token(user["_id"], email)
    frontend_url = current_app.config["FRONTEND_URL"]
    return redirect(f"{frontend_url}/auth/callback?token={jwt_token}")

@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    db = get_db()
    user_id = get_current_user_id()
    user = get_user_by_id(db, user_id)
    
    if not user:
        return jsonify({"error": "User not found."}), 404
        
    # Exclude google tokens
    user.pop("google_access_token", None)
    user.pop("google_refresh_token", None)
    
    return jsonify(user), 200

@auth_bp.route("/me", methods=["PATCH"])
@require_auth
def update_me():
    db = get_db()
    user_id = get_current_user_id()
    data = request.get_json(silent=True) or {}

    # Handle Telegram unlink as a special early-return action
    if data.get("unlink_telegram"):
        from bson import ObjectId
        db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$unset": {"telegram_chat_id": ""}}
        )
        return jsonify({"success": True, "message": "Telegram unlinked"})

    update_data = {}
    if "notifications" in data:
        update_data["notifications"] = data["notifications"]
    if "appearance" in data:
        update_data["appearance"] = data["appearance"]
        
    if update_data:
        db.users.update_one({"_id": user_id}, {"$set": update_data})
        
    user = get_user_by_id(db, user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404
        
    user.pop("google_access_token", None)
    user.pop("google_refresh_token", None)
    
    return jsonify(user), 200

@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    return jsonify({"message": "Logged out"}), 200

@auth_bp.route("/refresh-tokens", methods=["POST"])
@require_auth
def refresh_tokens():
    db = get_db()
    user_id = get_current_user_id()
    user = get_user_by_id(db, user_id)
    
    if not user:
        return jsonify({"error": "User not found."}), 404
        
    refresh_token = user.get("google_refresh_token")
    if not refresh_token:
        return jsonify({"error": "No refresh token available."}), 400
        
    try:
        creds = google.oauth2.credentials.Credentials(
            token=user.get("google_access_token"),
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=current_app.config["GOOGLE_CLIENT_ID"],
            client_secret=current_app.config["GOOGLE_CLIENT_SECRET"]
        )
        
        creds.refresh(google.auth.transport.requests.Request())
        
        update_google_tokens(
            db,
            user_id,
            creds.token,
            creds.refresh_token,
            creds.expiry
        )
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": f"Token refresh failed: {str(e)}"}), 400
