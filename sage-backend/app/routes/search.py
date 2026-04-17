from flask import Blueprint, jsonify, request
import re
from app import get_db
from app.utils.auth_helpers import require_auth, get_current_user_id
from bson.json_util import dumps
import json

search_bp = Blueprint("search", __name__)

@search_bp.route("", methods=["GET"])
@search_bp.route("/", methods=["GET"])
@require_auth
def search():
    db = get_db()
    user_id = get_current_user_id()
    query = request.args.get("q", "").strip()
    
    if not query:
        return jsonify({"tasks": [], "expenses": []}), 200
        
    regex_pattern = {"$regex": re.escape(query), "$options": "i"}
    
    # Search Tasks
    tasks_query = {
        "user_id": str(user_id),
        "$or": [
            {"title": regex_pattern},
            {"note": regex_pattern},
            {"category": regex_pattern}
        ]
    }
    tasks = list(db.tasks.find(tasks_query).limit(10))
    
    # Search Expenses
    expenses_query = {
        "user_id": str(user_id),
        "$or": [
            {"name": regex_pattern},
            {"notes": regex_pattern},
            {"category": regex_pattern}
        ]
    }
    expenses = list(db.expenses.find(expenses_query).limit(10))
    
    # Serialize ObjectId and datetime properly
    def sanitize(doc):
        sanitized = json.loads(dumps(doc))
        if '_id' in sanitized and isinstance(sanitized['_id'], dict) and '$oid' in sanitized['_id']:
            sanitized['_id'] = sanitized['_id']['$oid']
        if 'user_id' in sanitized and isinstance(sanitized['user_id'], dict) and '$oid' in sanitized['user_id']:
            sanitized['user_id'] = sanitized['user_id']['$oid']
        return sanitized

    results = {
        "tasks": [sanitize(t) for t in tasks],
        "expenses": [sanitize(e) for e in expenses]
    }
    
    return jsonify(results), 200
