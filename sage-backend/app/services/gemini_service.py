from flask import current_app
import google.generativeai as genai
from datetime import datetime, timezone

def call_gemini(prompt, max_tokens=2000):
    try:
        api_key = current_app.config.get("GEMINI_API_KEY")
        if not api_key:
            return None

        genai.configure(api_key=api_key)
        model_name = current_app.config.get("GEMINI_MODEL", "gemini-2.0-flash-lite")
        model = genai.GenerativeModel(model_name)
        
        generation_config = genai.types.GenerationConfig(max_output_tokens=max_tokens)
        
        response = model.generate_content(prompt, generation_config=generation_config)
        return response.text
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return None

def generate_daily_briefing(user_name, tasks_today, upcoming_expenses, email_summaries, calendar_events):
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")
    
    prompt = f"""You are Sage, a personal chief of staff AI. Write a concise, warm morning briefing for {user_name}.
Today's date: {today}
Tasks today: {tasks_today}
Upcoming bills/expenses (next 7 days): {upcoming_expenses}
Recent emails needing attention: {email_summaries}
Calendar events today: {calendar_events}

Write a 3-4 sentence briefing that:
- Greets them warmly
- Highlights the most important things needing attention today
- Mentions any urgent bills or deadlines
- Ends with a motivating note
Keep it human, concise, and actionable. Do not use bullet points."""

    return call_gemini(prompt, max_tokens=500)
