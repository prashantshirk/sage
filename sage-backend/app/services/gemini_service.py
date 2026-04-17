from flask import current_app
import google.generativeai as genai
from datetime import datetime, timezone

def call_gemini(prompt, max_tokens=2000):
    try:
        api_key = current_app.config.get("GEMINI_API_KEY")
        if not api_key:
            return None

        genai.configure(api_key=api_key)
        model_name = current_app.config.get("GEMINI_MODEL", "gemini-3-flash-preview")
        model = genai.GenerativeModel(model_name)
        
        generation_config = {
            "max_output_tokens": max_tokens,
            "temperature": 0.7,
            "top_p": 0.95,
        }
        
        # Detailed logging as requested by user
        purpose = "Daily Briefing Generation"
        log_msg = f"[{datetime.now()}] Pinging Model: {model_name} | Purpose: {purpose}"
        print(log_msg, flush=True)
        
        response = model.generate_content(prompt, generation_config=generation_config)
        text = response.text
        
        # Log to file for debugging
        with open("gemini_debug.log", "a", encoding="utf-8") as f:
            f.write(f"\n--- {log_msg} ---\n")
            f.write(f"Response: {text}\n")
            
        return text
    except Exception as e:
        with open("gemini_debug.log", "a", encoding="utf-8") as f:
            f.write(f"\n--- {datetime.now()} Error in Gemini ---\n")
            f.write(f"{str(e)}\n")
        print(f"Gemini API Error: {e}")
        return None

def generate_daily_briefing(user_name, tasks_today, upcoming_expenses, email_summaries, calendar_events):
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")
    
    current_hour = datetime.now().hour
    time_greeting = "morning"
    if 12 <= current_hour < 17:
        time_greeting = "afternoon"
    elif current_hour >= 17:
        time_greeting = "evening"

    prompt = f"""You are Sage, a personal chief of staff AI. Write a warm {time_greeting} briefing for {user_name}.
Today's date: {today}
Tasks today: {tasks_today}
Upcoming bills/expenses (next 7 days): {upcoming_expenses}
Recent emails needing attention: {email_summaries}
Calendar events today: {calendar_events}

Guidelines:
- Start with a warm "{time_greeting.capitalize()}, {user_name}!"
- Summarize the most important things needing attention today.
- Mention any urgent bills or deadlines.
- End with a motivating or insightful note.
- Keep it human, conversational, and actionable. 
- IMPORTANT: Ensure every sentence is complete. Do not stop mid-sentence.
- Use 2-3 short paragraphs. Do not use bullet points."""

    return call_gemini(prompt, max_tokens=800)
