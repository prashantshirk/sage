from app.services import groq_service
from app.utils.date_helpers import parse_natural_date
from app.models.expense import create_expense, get_expenses_by_user
from app.models.task import create_task, get_todays_tasks

def process_natural_language_input(db, user_id, user_input):
    extracted = groq_service.extract_structured_data(user_input)
    
    if not extracted or "action" not in extracted:
        return {"success": False, "message": "Sorry, I couldn't understand that. Try being more specific."}
        
    action = extracted.get("action")
    
    if action == "add_expense":
        due_date = parse_natural_date(extracted.get("due_date"))
        
        expense_data = {
            "name": extracted.get("name"),
            "amount": extracted.get("amount", 0),
            "due_date": due_date,
            "category": extracted.get("category"),
            "recurring": extracted.get("recurring", False),
            "recurrence_interval": extracted.get("recurrence_interval"),
            "notes": extracted.get("notes")
        }
        
        expense_doc = create_expense(db, user_id, expense_data)
        
        task_data = {
            "title": f"Pay {expense_data.get('name')}",
            "due_date": due_date,
            "category": "bill",
            "source": "nlp"
        }
        create_task(db, user_id, task_data)
        
        try:
            from app.services.calendar_service import create_calendar_event
            create_calendar_event(user_id, task_data["title"], due_date)
        except (ImportError, AttributeError):
            pass
            
        msg = groq_service.generate_response_message(action, extracted, True)
        return {"success": True, "action": "add_expense", "data": expense_doc, "message": msg}
        
    elif action in ["add_task", "add_reminder"]:
        due_date = parse_natural_date(extracted.get("due_date"))
        
        task_data = {
            "title": extracted.get("title"),
            "note": extracted.get("note"),
            "due_date": due_date,
            "due_time": extracted.get("due_time"),
            "category": extracted.get("category", "reminder" if action == "add_reminder" else "calendar"),
            "source": "nlp"
        }
        
        task_doc = create_task(db, user_id, task_data)
        
        try:
            from app.services.calendar_service import create_calendar_event
            create_calendar_event(user_id, task_data["title"], due_date)
        except (ImportError, AttributeError):
            pass
            
        msg = groq_service.generate_response_message(action, extracted, True)
        return {"success": True, "action": action, "data": task_doc, "message": msg}
        
    elif action == "query":
        query_type = extracted.get("query_type")
        if query_type == "expenses":
            expenses = get_expenses_by_user(db, user_id)
            summary_text = f"You have {len(expenses)} upcoming expenses."
        elif query_type == "tasks":
            tasks = get_todays_tasks(db, user_id)
            summary_text = f"You have {len(tasks)} tasks today."
        else:
            summary_text = "Here is your requested information."
            
        return {"success": True, "action": "query", "message": summary_text}
        
    elif action == "other":
        return {"success": True, "action": "other", "message": "I'm not sure how to handle that yet. Try adding a task, expense, or reminder."}
    
    return {"success": False, "message": "Sorry, I couldn't understand that. Try being more specific."}
