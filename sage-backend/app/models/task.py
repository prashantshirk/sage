from datetime import datetime, timezone, timedelta
from bson import ObjectId
from . import serialize_document

def create_task(db, user_id, data):
    """
    Creates a new task for a user and returns the serialized task.
    """
    now = datetime.now(timezone.utc)
    task_doc = {
        "user_id": str(user_id),
        "title": data.get("title"),
        "note": data.get("note"),
        "due_date": data.get("due_date"),  # Expected to be a datetime object
        "due_time": data.get("due_time"),
        "category": data.get("category"),  # "calendar" | "reminder" | "bill"
        "status": data.get("status", "pending"),  # "pending" | "completed" | "overdue"
        "source": data.get("source", "manual"),  # "nlp" | "manual" | "google_calendar"
        "google_event_id": data.get("google_event_id"),
        "created_at": now
    }
    result = db.tasks.insert_one(task_doc)
    task_doc["_id"] = result.inserted_id
    return serialize_document(task_doc)

def get_tasks_by_user(db, user_id, date_filter=None):
    """
    Returns all tasks for a user, optionally filtered by date.
    """
    query = {"user_id": str(user_id)}
    if date_filter:
        query["due_date"] = date_filter
    tasks = list(db.tasks.find(query).sort("due_date", 1))
    return serialize_document(tasks)

def get_todays_tasks(db, user_id):
    """
    Returns tasks due today for a user.
    """
    now = datetime.now(timezone.utc)
    start_of_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    end_of_day = start_of_day + timedelta(days=1)
    query = {
        "user_id": str(user_id),
        "due_date": {"$gte": start_of_day, "$lt": end_of_day}
    }
    tasks = list(db.tasks.find(query).sort("due_date", 1))
    return serialize_document(tasks)

def get_upcoming_tasks(db, user_id, days=7):
    """
    Returns tasks due in the next N days.
    """
    now = datetime.now(timezone.utc)
    future = now + timedelta(days=days)
    query = {
        "user_id": str(user_id),
        "due_date": {"$gte": now, "$lte": future}
    }
    tasks = list(db.tasks.find(query).sort("due_date", 1))
    return serialize_document(tasks)

def update_task_status(db, task_id, status):
    """
    Updates the status of a task and sets completed_at if applicable.
    """
    update_data = {"status": status}
    if status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc)
    
    result = db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": update_data})
    return result.modified_count > 0

def delete_task(db, task_id):
    """
    Deletes a task by ID.
    """
    result = db.tasks.delete_one({"_id": ObjectId(task_id)})
    return result.deleted_count > 0

def mark_overdue_tasks(db, user_id):
    """
    Bulk updates all past-due pending tasks for a user to "overdue".
    """
    now = datetime.now(timezone.utc)
    query = {
        "user_id": str(user_id),
        "status": "pending",
        "due_date": {"$lt": now}
    }
    result = db.tasks.update_many(query, {"$set": {"status": "overdue"}})
    return result.modified_count
