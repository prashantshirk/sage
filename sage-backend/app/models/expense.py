from datetime import datetime, timezone, timedelta
from bson import ObjectId
from . import serialize_document

def create_expense(db, user_id, data):
    """
    Creates a new expense for a user and returns the serialized expense.
    """
    now = datetime.now(timezone.utc)
    expense_doc = {
        "user_id": str(user_id),
        "name": data.get("name"),
        "amount": float(data.get("amount", 0)),
        "currency": data.get("currency", "INR"),
        "due_date": data.get("due_date"),  # Expected to be a datetime object
        "category": data.get("category"),  # "subscription" | "bill" | "emi" | "utility" | "other"
        "status": data.get("status", "upcoming"),  # "upcoming" | "due_soon" | "overdue" | "paid"
        "recurring": data.get("recurring", False),
        "recurrence_interval": data.get("recurrence_interval"),  # "monthly" | "yearly" | "weekly" | None
        "notes": data.get("notes"),
        "created_at": now
    }
    result = db.expenses.insert_one(expense_doc)
    expense_doc["_id"] = result.inserted_id
    return serialize_document(expense_doc)

def get_expenses_by_user(db, user_id, category=None):
    """
    Returns all expenses for a user, optionally filtered by category.
    """
    query = {"user_id": str(user_id)}
    if category:
        query["category"] = category
    expenses = list(db.expenses.find(query).sort("due_date", 1))
    return serialize_document(expenses)

def get_upcoming_expenses(db, user_id, days=7):
    """
    Returns expenses due in the next N days that are not paid.
    """
    now = datetime.now(timezone.utc)
    future = now + timedelta(days=days)
    query = {
        "user_id": str(user_id),
        "due_date": {"$gte": now, "$lte": future},
        "status": {"$ne": "paid"}
    }
    expenses = list(db.expenses.find(query).sort("due_date", 1))
    return serialize_document(expenses)

def update_expense_status(db, expense_id, status):
    """
    Updates the status of an expense and sets paid_at if applicable.
    """
    update_data = {"status": status}
    if status == "paid":
        update_data["paid_at"] = datetime.now(timezone.utc)
    
    result = db.expenses.update_one({"_id": ObjectId(expense_id)}, {"$set": update_data})
    return result.modified_count > 0

def mark_expense_paid(db, expense_id):
    """
    Marks an expense as paid.
    """
    return update_expense_status(db, expense_id, "paid")

def delete_expense(db, expense_id):
    """
    Deletes an expense by ID.
    """
    result = db.expenses.delete_one({"_id": ObjectId(expense_id)})
    return result.deleted_count > 0

def update_expense(db, expense_id, data):
    """
    Updates an expense by ID.
    """
    result = db.expenses.update_one(
        {"_id": ObjectId(expense_id)},
        {"$set": data}
    )
    if result.modified_count > 0:
        return serialize_document(db.expenses.find_one({"_id": ObjectId(expense_id)}))
    return None

def get_monthly_total(db, user_id):
    """
    Calculates the sum of all non-paid expenses for the current month.
    """
    now = datetime.now(timezone.utc)
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    if now.month == 12:
        end_of_month = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_of_month = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
    
    pipeline = [
        {"$match": {
            "user_id": str(user_id),
            "status": {"$ne": "paid"},
            "due_date": {"$gte": start_of_month, "$lt": end_of_month}
        }},
        {"$group": {
            "_id": None,
            "total": {"$sum": "$amount"}
        }}
    ]
    result = list(db.expenses.aggregate(pipeline))
    return result[0]["total"] if result else 0.0

def auto_update_statuses(db, user_id):
    """
    Bulk updates expense statuses based on their due dates.
    """
    now = datetime.now(timezone.utc)
    seven_days_later = now + timedelta(days=7)
    
    # Update to overdue
    overdue_result = db.expenses.update_many(
        {"user_id": str(user_id), "status": {"$ne": "paid"}, "due_date": {"$lt": now}},
        {"$set": {"status": "overdue"}}
    )
    
    # Update to due_soon
    due_soon_result = db.expenses.update_many(
        {"user_id": str(user_id), "status": "upcoming", "due_date": {"$gte": now, "$lte": seven_days_later}},
        {"$set": {"status": "due_soon"}}
    )
    
    return {
        "overdue_updated": overdue_result.modified_count,
        "due_soon_updated": due_soon_result.modified_count
    }
