import json
import time
from datetime import datetime, timezone
from flask import current_app
from groq import Groq

# Rate-limit tracking (in-process, per worker)
_last_call_time = 0.0
_MIN_CALL_INTERVAL_SECONDS = 5.0  # conservative rate limit: avoids 429s on free tier

def _rate_limit_wait():
    """Enforce a minimum interval between Groq API calls to avoid 429s."""
    global _last_call_time
    now = time.monotonic()
    elapsed = now - _last_call_time
    if elapsed < _MIN_CALL_INTERVAL_SECONDS:
        time.sleep(_MIN_CALL_INTERVAL_SECONDS - elapsed)
    _last_call_time = time.monotonic()


def call_groq(messages, system_prompt, max_tokens=400, temperature=0.3, purpose="General Request"):
    """
    Call the Groq API with rate-limit protection.
    Uses llama3-8b-8192 which has 14,400 RPD / 6,000 RPM / 30,000 TPM limits —
    much more generous than llama-3.3-70b-versatile (1 RPD / 30 RPM / 12k TPM).
    max_tokens is capped at 400 by default to stay within TPM budget.
    """
    try:
        api_key = current_app.config.get("GROQ_API_KEY")
        if not api_key:
            return None

        # Hard-cap tokens to avoid burning through TPM allowance
        max_tokens = min(max_tokens, 1024)

        _rate_limit_wait()

        client = Groq(api_key=api_key)
        model = current_app.config.get("GROQ_MODEL", "llama3-8b-8192")

        print(f"[{datetime.now()}] Groq call | Model: {model} | Purpose: {purpose}", flush=True)

        all_messages = [{"role": "system", "content": system_prompt}] + messages

        response = client.chat.completions.create(
            model=model,
            messages=all_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        content = response.choices[0].message.content

        with open("groq_debug.log", "a", encoding="utf-8") as f:
            f.write(f"\n--- [{datetime.now()}] {purpose} ---\n")
            f.write(f"Messages: {json.dumps(messages, indent=2)}\n")
            f.write(f"Response: {content}\n")

        return content
    except Exception as e:
        print(f"Groq API Error during {purpose}: {e}")
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
    response_text = call_groq(messages, system_prompt, max_tokens=300, temperature=0.1, purpose="NLP Input Parsing")

    if not response_text:
        return None

    try:
        cleaned_text = response_text.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.startswith("```"):
            cleaned_text = cleaned_text[3:]
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

    if action == "query":  # Fixed: was "action" which never matched
        return "Here is the information you requested. 📊"

    return "I've processed your request. 👍"

def generate_daily_briefing(user_name, tasks_today, upcoming_expenses, email_summaries, calendar_events):
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")
    
    current_hour = datetime.now().hour
    time_greeting = "morning"
    if 12 <= current_hour < 17:
        time_greeting = "afternoon"
    elif current_hour >= 17:
        time_greeting = "evening"

    system_prompt = f"""You are Sage, a personal chief of staff AI. Write a warm {time_greeting} briefing for {user_name}.
Guidelines:
- Start with a warm "{time_greeting.capitalize()}, {user_name}!"
- Summarize the most important things needing attention today.
- Mention any urgent bills or deadlines.
- End with a motivating or insightful note.
- Keep it human, conversational, and actionable.
- Use 2-3 short paragraphs. Do not use bullet points."""

    user_message = f"""Today's date: {today}
Tasks today: {tasks_today}
Upcoming bills/expenses (next 7 days): {upcoming_expenses}
Recent emails needing attention: {email_summaries}
Calendar events today: {calendar_events}"""

    messages = [{"role": "user", "content": user_message}]
    
    return call_groq(messages, system_prompt, max_tokens=800, temperature=0.5, purpose="Daily Briefing Generation")
