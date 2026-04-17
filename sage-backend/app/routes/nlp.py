from flask import Blueprint, jsonify, request
from app import get_db
from app.utils.auth_helpers import require_auth, get_current_user_id
from app.services.nlp_parser import process_natural_language_input

# Note: URL prefix is handled in __init__.py during registration
nlp_bp = Blueprint("nlp", __name__)

@nlp_bp.route("/process", methods=["POST"])
@require_auth
def process():
    payload = request.get_json(silent=True) or {}
    text = (payload.get("input") or "").strip()
    
    if not text:
        return jsonify({"success": False, "message": "Input cannot be empty."}), 400
        
    db = get_db()
    user_id = get_current_user_id()
    
    result = process_natural_language_input(db, user_id, text)
    
    status_code = 200 if result.get("success") else 400
    return jsonify(result), status_code

@nlp_bp.route("/suggestions", methods=["GET"])
@require_auth
def suggestions():
    example_prompts = [
        "Netflix is due tomorrow, ₹649",
        "Add dentist appointment next Tuesday at 11am",
        "Remind me to renew passport in 60 days",
        "My electricity bill is due on the 5th, ₹2400",
        "What tasks do I have today?",
        "EMI of ₹5000 due on 15th every month"
    ]
    return jsonify(example_prompts), 200
