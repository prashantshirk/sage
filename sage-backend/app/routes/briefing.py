from flask import Blueprint, jsonify, current_app
from datetime import datetime, timezone
import google.oauth2.credentials
import google.auth.transport.requests

from app import get_db
from app.utils.auth_helpers import require_auth, get_current_user_id
from app.models.user import get_user_by_id, update_google_tokens
from app.models.task import get_todays_tasks
from app.models.expense import get_upcoming_expenses
from app.services import calendar_service
from app.services import gmail_service
from app.services import gemini_service

briefing_bp = Blueprint("briefing", __name__)

def refresh_google_token_if_needed(db, user_id, user):
    access_token = user.get("google_access_token")
    refresh_token = user.get("google_refresh_token")
    
    if not access_token:
        return None
        
    try:
        creds = google.oauth2.credentials.Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=current_app.config.get("GOOGLE_CLIENT_ID"),
            client_secret=current_app.config.get("GOOGLE_CLIENT_SECRET")
        )
        
        if creds.expired and creds.refresh_token:
            creds.refresh(google.auth.transport.requests.Request())
            update_google_tokens(
                db, 
                user_id, 
                creds.token, 
                creds.refresh_token, 
                creds.expiry
            )
            return creds.token
            
        return access_token
    except Exception as e:
        print(f"Token refresh error: {e}")
        return access_token

@briefing_bp.route("/daily", methods=["GET"])
@require_auth
def daily_briefing():
    db = get_db()
    user_id = get_current_user_id()
    user = get_user_by_id(db, user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    access_token = refresh_google_token_if_needed(db, user_id, user)
    user_name = user.get("name", "there")
    
    events = []
    if access_token:
        events = calendar_service.fetch_todays_events(access_token)
        
    tasks = get_todays_tasks(db, user_id)
    expenses = get_upcoming_expenses(db, user_id, days=7)
    
    action_items = []
    if access_token:
        recent_emails = gmail_service.fetch_recent_emails(access_token)
        if recent_emails:
            action_items = gmail_service.extract_action_items(recent_emails)
            
    briefing_text = gemini_service.generate_daily_briefing(
        user_name=user_name,
        tasks_today=tasks,
        upcoming_expenses=expenses,
        email_summaries=action_items,
        calendar_events=events
    )
    
    bills_total = sum(e.get("amount", 0) for e in expenses)
    
    response = {
        "briefing_text": briefing_text,
        "tasks_today": tasks,
        "tasks_count": len(tasks),
        "upcoming_expenses": expenses,
        "bills_due_this_week": {
            "count": len(expenses),
            "total": bills_total
        },
        "email_action_items": action_items,
        "calendar_events": events,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
    
    return jsonify(response), 200

@briefing_bp.route("/email-items", methods=["GET"])
@require_auth
def email_items():
    db = get_db()
    user_id = get_current_user_id()
    user = get_user_by_id(db, user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    access_token = refresh_google_token_if_needed(db, user_id, user)
    
    action_items = []
    if access_token:
        recent_emails = gmail_service.fetch_recent_emails(access_token)
        if recent_emails:
            action_items = gmail_service.extract_action_items(recent_emails)
            
    return jsonify({"action_items": action_items}), 200
