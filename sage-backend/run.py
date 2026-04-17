import os
import atexit
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app import create_app

# Allow OAuth over HTTP in local development only
# NEVER set this in production
if os.environ.get("FLASK_ENV", "development") == "development":
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

app = create_app()

def send_morning_briefings():
    with app.app_context():
        from app import get_db
        from app.models.task import get_todays_tasks
        from app.models.expense import get_upcoming_expenses
        from app.services.calendar_service import fetch_todays_events
        from app.services.gmail_service import fetch_recent_emails, extract_action_items
        from app.services.gemini_service import generate_daily_briefing
        from app.services.telegram_service import send_message, format_briefing_message
        
        db = get_db()
        users = list(db.users.find({"telegram_chat_id": {"$exists": True, "$ne": None}}))
        print(f"[Scheduler] Sending morning briefings to {len(users)} users...", flush=True)
        
        for user in users:
            try:
                chat_id = user["telegram_chat_id"]
                user_id = str(user["_id"])
                user_name = user.get("name", "there")
                access_token = user.get("google_access_token")
                
                tasks = get_todays_tasks(db, user_id)
                expenses = get_upcoming_expenses(db, user_id, days=7)
                
                calendar_events = []
                email_items = []
                
                if access_token:
                    try:
                        calendar_events = fetch_todays_events(access_token) or []
                    except Exception as e:
                        print(f"[Scheduler] Calendar fetch error for user {user_id}: {e}", flush=True)
                        
                    try:
                        raw_emails = fetch_recent_emails(access_token) or []
                        email_items = extract_action_items(raw_emails) or []
                    except Exception as e:
                        print(f"[Scheduler] Gmail fetch error for user {user_id}: {e}", flush=True)
                
                briefing_text = generate_daily_briefing(
                    user_name, tasks, expenses, email_items, calendar_events
                ) or "_(Briefing unavailable — please try again later.)_"
                
                briefing_data = {
                    "briefing": briefing_text,
                    "summary": {
                        "tasks_count": len(tasks),
                        "bills_count": len(expenses),
                        "bills_total": sum(float(e.get("amount", 0)) for e in expenses),
                        "action_items_count": len(email_items)
                    }
                }
                
                message = format_briefing_message(briefing_data, user_name)
                send_message(chat_id, message)
                print(f"[Scheduler] Successfully sent briefing to user {user_id}", flush=True)
                
            except Exception as e:
                print(f"[Scheduler] Error sending briefing to user {user.get('_id')}: {e}", flush=True)

if __name__ == "__main__":
    scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
    scheduler.add_job(
        send_morning_briefings,
        trigger=CronTrigger(hour=8, minute=0)
    )
    scheduler.start()
    print("[Scheduler] Morning briefing job scheduled at 8:00 AM IST", flush=True)
    atexit.register(lambda: scheduler.shutdown())

    # CRITICALLY use use_reloader=False to prevent duplicate jobs
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
