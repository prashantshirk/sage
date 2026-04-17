from flask import Blueprint, jsonify, request
from datetime import datetime, timezone
from dateutil import parser
from app import get_db
from app.utils.auth_helpers import require_auth, get_current_user_id
from app.models.user import get_user_by_id
from app.models.task import get_todays_tasks, get_upcoming_tasks, create_task, update_task_status, delete_task, mark_overdue_tasks
from app.services.calendar_service import get_calendar_events

tasks_bp = Blueprint("tasks", __name__)

@tasks_bp.route("/today", methods=["GET"])
@require_auth
def today():
    db = get_db()
    user_id = get_current_user_id()
    
    mark_overdue_tasks(db, user_id)
    tasks = get_todays_tasks(db, user_id)
    
    return jsonify(tasks), 200

@tasks_bp.route("/upcoming", methods=["GET"])
@require_auth
def upcoming():
    db = get_db()
    user_id = get_current_user_id()
    days = int(request.args.get("days", 7))
    
    tasks = get_upcoming_tasks(db, user_id, days)
    
    grouped = {
        "tomorrow": [],
        "this_week": [],
        "next_week": []
    }
    
    now = datetime.now(timezone.utc).date()
    
    for task in tasks:
        due_date_str = task.get("due_date")
        if not due_date_str:
            continue
            
        try:
            due_date = parser.parse(due_date_str).date()
            diff = (due_date - now).days
            
            if diff == 1:
                grouped["tomorrow"].append(task)
            elif 2 <= diff <= 7:
                grouped["this_week"].append(task)
            elif diff > 7:
                grouped["next_week"].append(task)
        except Exception:
            pass
            
    return jsonify(grouped), 200

@tasks_bp.route("/", methods=["POST"])
@require_auth
def create():
    db = get_db()
    user_id = get_current_user_id()
    data = request.get_json(silent=True) or {}
    
    if "due_date" in data and isinstance(data["due_date"], str):
        try:
            data["due_date"] = parser.parse(data["due_date"])
        except Exception:
            pass
            
    task = create_task(db, user_id, data)
    return jsonify(task), 201

@tasks_bp.route("/<task_id>/status", methods=["PATCH"])
@require_auth
def update_status(task_id):
    db = get_db()
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    
    if status not in ["completed", "pending", "overdue"]:
        return jsonify({"error": "Invalid status"}), 400
        
    success = update_task_status(db, task_id, status)
    return jsonify({"success": success}), 200 if success else 404

@tasks_bp.route("/<task_id>", methods=["DELETE"])
@require_auth
def delete(task_id):
    db = get_db()
    success = delete_task(db, task_id)
    return jsonify({"success": success}), 200 if success else 404

@tasks_bp.route("/sync-calendar", methods=["POST"])
@require_auth
def sync_calendar():
    db = get_db()
    user_id = get_current_user_id()
    user = get_user_by_id(db, user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    tokens = {
        "token": user.get("google_access_token"),
        "refresh_token": user.get("google_refresh_token")
    }
    
    if not tokens["token"]:
        return jsonify({"error": "No Google connection"}), 400
    
    try:
        events = get_calendar_events(tokens, max_results=50)
        
        # Get existing tasks to prevent duplicates
        existing_tasks = get_todays_tasks(db, user_id) + get_upcoming_tasks(db, user_id, days=30)
        existing_event_ids = [t.get("google_event_id") for t in existing_tasks if t.get("google_event_id")]
        
        synced = 0
        for event in events:
            event_id = event.get("id")
            if event_id in existing_event_ids:
                continue
                
            start = event.get("start", {}).get("dateTime") or event.get("start", {}).get("date")
            if not start:
                continue
                
            due_date = parser.parse(start)
            
            task_data = {
                "title": event.get("summary", "Calendar Event"),
                "due_date": due_date,
                "category": "calendar",
                "source": "google_calendar",
                "google_event_id": event_id
            }
            create_task(db, user_id, task_data)
            synced += 1
            
        return jsonify({"synced": synced}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
