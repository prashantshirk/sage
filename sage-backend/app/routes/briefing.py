from flask import Blueprint, jsonify, request, current_app
from datetime import datetime, timedelta
from ..models.user import get_user_by_id
from ..services import gmail_service, calendar_service, gemini_service
from ..services.google_auth import refresh_google_token_if_needed
from .tasks import get_todays_tasks
from .finance import get_upcoming_expenses
import sqlite3

briefing_bp = Blueprint('briefing', __name__)

@briefing_bp.route('/daily', methods=['GET'])
def daily_briefing():
    # In a real app, this would come from a JWT token
    # For now, we'll get it from a query param or a default
    user_id = request.args.get('user_id')
    if not user_id:
        # Fallback to the first user in the DB for testing
        db = current_app.db
        user = db.users.find_one()
        if user:
            user_id = str(user['_id'])
        else:
            return jsonify({"error": "User ID required"}), 400
            
    db = current_app.db
    user = get_user_by_id(db, user_id)
    if not user:
        return jsonify({"error": "User found"}), 404
        
    current_app.logger.info(f"--- Briefing requested for user {user_id} ---")
    
    # Calculate time of day for greeting
    now = datetime.now()
    hour = now.hour
    if 5 <= hour < 12:
        time_greeting = "morning"
    elif 12 <= hour < 18:
        time_greeting = "afternoon"
    else:
        time_greeting = "evening"
        
    access_token = refresh_google_token_if_needed(db, user_id, user)
    current_app.logger.info(f"  - Google Access Token present: {bool(access_token)}")
    user_name = user.get("name", "there")
    
    events = []
    if access_token:
        current_app.logger.info("  - Fetching Calendar events...")
        events = calendar_service.fetch_todays_events(access_token)
        
    tasks = get_todays_tasks(db, user_id)
    expenses = get_upcoming_expenses(db, user_id, days=7)
    
    action_items = []
    if access_token:
        current_app.logger.info("  - Fetching Gmail messages...")
        recent_emails = gmail_service.fetch_recent_emails(access_token, max_results=20)
        if recent_emails:
            current_app.logger.info(f"  - Scanning {len(recent_emails)} emails for action items...")
            action_items = gmail_service.extract_action_items(recent_emails)
        else:
            current_app.logger.info("  - No emails found in fetch range.")
            
    # Use Groq for briefing temporarily to bypass Gemini quota and debug Gmail
    current_app.logger.info(f"  - Generating briefing using Groq (Llama) to bypass Gemini quota...")
    from . import groq_service
    
    briefing_prompt = f"""Write a warm {time_greeting} briefing for {user_name}.
Today: {datetime.now().strftime('%B %d, %Y')}
Tasks: {tasks}
Bills: {expenses}
Emails: {action_items}

Summarize everything into 2-3 friendly paragraphs. Be conversational."""

    briefing_text = groq_service.call_groq(
        [{"role": "user", "content": briefing_prompt}],
        "You are Sage, a personal chief of staff.",
        max_tokens=1000,
        purpose="Debug Briefing Generation"
    )
    
    if not briefing_text:
        briefing_text = f"Good {time_greeting}, {user_name}! I'm having a bit of trouble connecting to my AI brain, but your dashboard is ready for you."
    
    bills_total = sum(float(e.get("amount", 0)) for e in expenses)
    
    return jsonify({
        "briefing": briefing_text,
        "summary": {
            "tasks_count": len(tasks),
            "events_count": len(events),
            "bills_count": len(expenses),
            "bills_total": bills_total,
            "action_items_count": len(action_items)
        },
        "action_items": action_items
    })

@briefing_bp.route('/email-items', methods=['GET'])
def email_action_items():
    user_id = request.args.get('user_id')
    db = current_app.db
    user = get_user_by_id(db, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    access_token = refresh_google_token_if_needed(db, user_id, user)
    if not access_token:
        return jsonify({"error": "Google account not connected"}), 400
        
    recent_emails = gmail_service.fetch_recent_emails(access_token, max_results=20)
    action_items = gmail_service.extract_action_items(recent_emails)
    
    return jsonify(action_items)
