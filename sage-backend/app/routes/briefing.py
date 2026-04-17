from flask import Blueprint, jsonify, request, current_app
from datetime import datetime
from ..models.user import get_user_by_id
from ..models.task import get_todays_tasks
from ..models.expense import get_upcoming_expenses
from ..services import gmail_service, calendar_service, groq_service
from ..services.google_auth import refresh_google_token_if_needed

briefing_bp = Blueprint('briefing', __name__)

@briefing_bp.route('/daily', methods=['GET'])
def daily_briefing():
    user_id = request.args.get('user_id')
    if not user_id:
        db = current_app.db
        user = db.users.find_one()
        if user:
            user_id = str(user['_id'])
        else:
            return jsonify({"error": "User ID required"}), 400

    db = current_app.db
    user = get_user_by_id(db, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    current_app.logger.info(f"--- Briefing requested for user {user_id} ---")

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
        recent_emails = gmail_service.fetch_recent_emails(access_token, max_results=5)
        if recent_emails:
            current_app.logger.info(f"  - Scanning {len(recent_emails)} emails for action items...")
            action_items = gmail_service.extract_action_items(recent_emails)
        else:
            current_app.logger.info("  - No emails found in fetch range.")

    # Use Groq for briefing generation (bypassing Gemini quota limits)
    current_app.logger.info("  - Generating briefing using Groq...")
    briefing_text = groq_service.generate_daily_briefing(
        user_name=user_name,
        tasks_today=tasks,
        upcoming_expenses=expenses,
        email_summaries=action_items,
        calendar_events=events
    )

    if not briefing_text:
        # Fallback: use a simple static message — no API call
        briefing_text = (
            f"Good {time_greeting}, {user_name}! "
            f"You have {len(tasks)} task(s) today and {len(expenses)} upcoming expense(s). "
            f"Have a productive day!"
        )

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

    recent_emails = gmail_service.fetch_recent_emails(access_token, max_results=5)
    action_items = gmail_service.extract_action_items(recent_emails)

    return jsonify(action_items)
