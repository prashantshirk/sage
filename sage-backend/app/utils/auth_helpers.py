import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import current_app, g, jsonify, request

def generate_token(user_id, email):
    now = datetime.now(timezone.utc)
    expiry_hours = current_app.config.get("JWT_EXPIRY_HOURS", 168)
    payload = {
        "user_id": str(user_id),
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=expiry_hours)
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")

def decode_token(token):
    return jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])

def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        
        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_token(token)
            g.user_id = payload.get("user_id")
            g.email = payload.get("email")
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
            
        return fn(*args, **kwargs)
    return wrapper

def get_current_user_id():
    return getattr(g, "user_id", None)
