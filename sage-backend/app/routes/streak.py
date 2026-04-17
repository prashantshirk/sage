from flask import Blueprint, jsonify, request
from datetime import datetime, timezone
from app import get_db
from app.utils.auth_helpers import require_auth, get_current_user_id
from app.models.streak import get_streak, submit_daily_progress, get_history_last_5_weeks

streak_bp = Blueprint("streak", __name__)

@streak_bp.route("/", methods=["GET"])
@require_auth
def get_streak_route():
    db = get_db()
    user_id = get_current_user_id()
    
    streak = get_streak(db, user_id)
    return jsonify(streak), 200

@streak_bp.route("/submit", methods=["POST"])
@require_auth
def submit_progress():
    db = get_db()
    user_id = get_current_user_id()
    data = request.get_json(silent=True) or {}
    
    tasks_total = data.get("tasks_total", 0)
    tasks_completed = data.get("tasks_completed", 0)
    
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    updated_streak = submit_daily_progress(db, user_id, tasks_total, tasks_completed, today_str)
    
    current = updated_streak.get("current_streak", 0)
    best = updated_streak.get("best_streak", 0)
    
    message = f"🔥 {current} day streak!" if current > 0 else "Start your streak today!"
    
    return jsonify({
        "current_streak": current,
        "best_streak": best,
        "message": message
    }), 200

@streak_bp.route("/history", methods=["GET"])
@require_auth
def get_history():
    db = get_db()
    user_id = get_current_user_id()
    
    history = get_history_last_5_weeks(db, user_id)
    return jsonify(history), 200
