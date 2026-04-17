from datetime import datetime, timezone, timedelta
from . import serialize_document

def get_streak(db, user_id):
    """
    Returns the streak document for a user. Creates a default one if it doesn't exist.
    """
    streak = db.streaks.find_one({"user_id": str(user_id)})
    if not streak:
        streak = {
            "user_id": str(user_id),
            "current_streak": 0,
            "best_streak": 0,
            "last_submitted_date": None,
            "history": []
        }
        db.streaks.insert_one(streak)
    return serialize_document(streak)

def submit_daily_progress(db, user_id, tasks_total, tasks_completed, date_str):
    """
    Updates daily progress and manages streak logic.
    - If submitted date is yesterday: increment streak.
    - If submitted date is today: update current entry.
    - Otherwise: reset/set streak to 1.
    """
    streak_doc = db.streaks.find_one({"user_id": str(user_id)})
    if not streak_doc:
        streak_doc = {
            "user_id": str(user_id),
            "current_streak": 0,
            "best_streak": 0,
            "last_submitted_date": None,
            "history": []
        }
    
    last_date_str = streak_doc.get("last_submitted_date")
    current_streak = streak_doc.get("current_streak", 0)
    best_streak = streak_doc.get("best_streak", 0)
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    
    if date_str == last_date_str:
        # Already submitted for this date, just update history (handled below)
        pass 
    elif last_date_str == yesterday:
        current_streak += 1
    else:
        # Gap in submission or first time
        current_streak = 1
        
    if current_streak > best_streak:
        best_streak = current_streak
        
    history_item = {
        "date": date_str,
        "tasks_total": tasks_total,
        "tasks_completed": tasks_completed,
        "submitted": True
    }
    
    # Update existing history entry if it exists, otherwise push
    existing_history = streak_doc.get("history", [])
    found = False
    for i, item in enumerate(existing_history):
        if item["date"] == date_str:
            existing_history[i] = history_item
            found = True
            break
    
    if not found:
        existing_history.append(history_item)
        
    # Ensure history stays sorted by date
    existing_history.sort(key=lambda x: x["date"])
    
    db.streaks.update_one(
        {"user_id": str(user_id)},
        {"$set": {
            "current_streak": current_streak,
            "best_streak": best_streak,
            "last_submitted_date": date_str,
            "history": existing_history
        }},
        upsert=True
    )
    return get_streak(db, user_id)

def get_history_last_5_weeks(db, user_id):
    """
    Returns the last 35 days of streak history for a user.
    """
    streak_doc = db.streaks.find_one({"user_id": str(user_id)})
    if not streak_doc:
        return []
    
    history = streak_doc.get("history", [])
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=35)).strftime("%Y-%m-%d")
    
    filtered_history = [item for item in history if item["date"] >= cutoff_date]
    return serialize_document(filtered_history)
