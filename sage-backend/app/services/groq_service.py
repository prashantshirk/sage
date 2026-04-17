import json
from datetime import datetime, timezone
from flask import current_app
from groq import Groq

def call_groq(messages, system_prompt, max_tokens=1000, temperature=0.3):
    try:
        api_key = current_app.config.get("GROQ_API_KEY")
        if not api_key:
            return None
        
        client = Groq(api_key=api_key)
        model = current_app.config.get("GROQ_MODEL", "llama-3.3-70b-versatile")
        
        all_messages = [{"role": "system", "content": system_prompt}] + messages
        
        response = client.chat.completions.create(
            model=model,
            messages=all_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Groq API Error: {e}")
        return None

def extract_structured_data(user_input):
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")
    system_prompt = f"""You are a personal assistant AI. The user will give you a natural language input.
Extract structured data and return ONLY valid JSON with no explanation.
Identify what type of action the user wants: 'add_task', 'add_expense', 'add_reminder', 'query', or 'other'.

For add_task return: {{ "action": "add_task", "title": "", "due_date": "", "due_time": "", "note": "", "category": "calendar|reminder" }}
For add_expense return: {{ "action": "add_expense", "name": "", "amount": 0, "due_date": "", "category": "subscription|bill|emi|utility", "recurring": false, "recurrence_interval": "monthly|yearly|null", "notes": "" }}
For add_reminder return: {{ "action": "add_reminder", "title": "", "due_date": "", "note": "" }}
For query return: {{ "action": "query", "query_type": "expenses|tasks|all" }}

Today's date is {today}. Parse relative dates like 'tomorrow', 'next Tuesday', 'in 2 months'.
Return only the JSON object, nothing else."""

    messages = [{"role": "user", "content": user_input}]
    response_text = call_groq(messages, system_prompt, max_tokens=500, temperature=0.1)
    
    if not response_text:
        return None
        
    try:
        cleaned_text = response_text.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]
        return json.loads(cleaned_text.strip())
    except json.JSONDecodeError:
        print(f"Failed to parse JSON from Groq: {response_text}")
        return None

def generate_response_message(action, extracted_data, success):
    if not success:
        return "Oops! I ran into an issue trying to process that. 😅"
        
    if action == "add_task":
        title = extracted_data.get("title", "Task")
        return f"Done! I've added '{title}' to your tasks. 🗓️"
        
    if action == "add_expense":
        name = extracted_data.get("name", "Expense")
        amount = extracted_data.get("amount", 0)
        return f"Got it! I've added {name} (₹{amount}) to your Finance Tracker. 💸"
        
    if action == "add_reminder":
        title = extracted_data.get("title", "Reminder")
        return f"All set! I will remind you about '{title}'. ⏰"
        
    if action == "query":
        return "Here is the information you requested. 📊"
        
    return "I've processed your request. 👍"
