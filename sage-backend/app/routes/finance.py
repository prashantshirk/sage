from flask import Blueprint, jsonify, request
from datetime import datetime, timezone, timedelta
from dateutil import parser
from app import get_db
from app.utils.auth_helpers import require_auth, get_current_user_id
from app.models.expense import (
    get_expenses_by_user,
    create_expense,
    mark_expense_paid,
    update_expense,
    delete_expense,
    auto_update_statuses,
    get_monthly_total
)

finance_bp = Blueprint("finance", __name__)

@finance_bp.route("/", methods=["GET"])
@require_auth
def get_expenses():
    db = get_db()
    user_id = get_current_user_id()
    category = request.args.get("category")
    
    auto_update_statuses(db, user_id)
    
    expenses = get_expenses_by_user(db, user_id, category)
    monthly_total = get_monthly_total(db, user_id)
    
    overdue_count = sum(1 for e in expenses if e.get("status") == "overdue")
    due_soon_count = sum(1 for e in expenses if e.get("status") == "pending")
    
    return jsonify({
        "expenses": expenses,
        "monthly_total": monthly_total,
        "overdue_count": overdue_count,
        "due_soon_count": due_soon_count
    }), 200

@finance_bp.route("/", methods=["POST"])
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
            
    expense = create_expense(db, user_id, data)
    return jsonify(expense), 201

@finance_bp.route("/<expense_id>/pay", methods=["PATCH"])
@require_auth
def pay(expense_id):
    db = get_db()
    success = mark_expense_paid(db, expense_id)
    return jsonify({"success": success}), 200 if success else 404

@finance_bp.route("/<expense_id>", methods=["PATCH"])
@require_auth
def update(expense_id):
    db = get_db()
    user_id = get_current_user_id()
    data = request.get_json(silent=True) or {}
    
    if "due_date" in data and isinstance(data["due_date"], str):
        try:
            data["due_date"] = parser.parse(data["due_date"])
        except Exception:
            pass
            
    expense = update_expense(db, expense_id, data)
    if not expense:
        return jsonify({"error": "Expense not found"}), 404
        
    return jsonify(expense), 200

@finance_bp.route("/<expense_id>", methods=["DELETE"])
@require_auth
def delete(expense_id):
    db = get_db()
    success = delete_expense(db, expense_id)
    return jsonify({"success": success}), 200 if success else 404

@finance_bp.route("/summary", methods=["GET"])
@require_auth
def summary():
    db = get_db()
    user_id = get_current_user_id()
    
    auto_update_statuses(db, user_id)
    expenses = get_expenses_by_user(db, user_id)
    
    now = datetime.now(timezone.utc)
    monthly_total = get_monthly_total(db, user_id)
    
    overdue_count = 0
    due_this_week_count = 0
    due_this_week_amount = 0
    by_category = {}
    
    for e in expenses:
        cat = e.get("category", "other")
        by_category[cat] = by_category.get(cat, 0) + e.get("amount", 0)
        
        if e.get("status") == "overdue":
            overdue_count += 1
            
        due_date_str = e.get("due_date")
        if due_date_str and e.get("status") in ["pending", "overdue"]:
            try:
                due_date = parser.parse(due_date_str)
                days_diff = (due_date.date() - now.date()).days
                if 0 <= days_diff <= 7:
                    due_this_week_count += 1
                    due_this_week_amount += e.get("amount", 0)
            except Exception:
                pass
                
    return jsonify({
        "monthly_total": monthly_total,
        "due_this_week": {
            "count": due_this_week_count,
            "amount": due_this_week_amount
        },
        "overdue_count": overdue_count,
        "by_category": by_category
    }), 200
