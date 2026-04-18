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
        
        response = model.generate_content(
            prompt,
            generation_config=generation_config,
            request_options={"timeout": 90}
        )
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

import base64
import json

def extract_data_from_image(image_base64, user_prompt, mime_type="image/jpeg"):
    try:
        api_key = current_app.config.get("GEMINI_API_KEY")
        if not api_key:
            return None
            
        genai.configure(api_key=api_key)
        # Use the specific lite model as requested
        model = genai.GenerativeModel("gemini-3.1-flash-lite-preview")
        
        image_data = base64.b64decode(image_base64)
        
        today = datetime.now(timezone.utc).strftime("%B %d, %Y")
        system_prompt = f"""You are a data extraction AI. Today's date is {today}.
Extract structured data from the provided document image/PDF and the user's prompt. 
Return ONLY valid JSON with no explanation or markdown formatting.
Identify the action as 'add_expense' or 'add_task'. If it is a bill/receipt, use 'add_expense'.

For add_expense return: {{ "action": "add_expense", "name": "", "amount": 0, "due_date": "", "category": "bill", "notes": "" }}
If a due date is not explicitly found, try to infer it from the user's prompt or the document, else leave empty. Use absolute dates (YYYY-MM-DD or readable).
User prompt: {user_prompt}
"""
        
        print(f"[{datetime.now()}] Pinging Model: gemini-3.1-flash-lite-preview | Purpose: Document Extraction", flush=True)
        response = model.generate_content(
            [
                {'mime_type': mime_type, 'data': image_data},
                system_prompt
            ],
            request_options={"timeout": 90}
        )
        
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        parsed = json.loads(text.strip())
        
        with open("gemini_debug.log", "a", encoding="utf-8") as f:
            f.write(f"\n--- [{datetime.now()}] Document Extraction ---\n")
            f.write(f"Response: {text}\n")
            
        return parsed
    except Exception as e:
        print(f"Gemini Image Processing Error: {e}")
        return None

def extract_data_from_audio(audio_base64, user_prompt="", mime_type="audio/webm"):
    try:
        api_key = current_app.config.get("GEMINI_API_KEY")
        if not api_key:
            return None

        genai.configure(api_key=api_key)
        # Use the specific lite model as requested
        model = genai.GenerativeModel("gemini-3.1-flash-lite-preview")
        
        audio_data = base64.b64decode(audio_base64)
        
        today = datetime.now(timezone.utc).strftime("%B %d, %Y")
        system_prompt = f"""You are a data extraction AI. Today's date is {today}.
Listen to the provided audio voice note and read the user's prompt (if any).
Extract structured data and return ONLY valid JSON with no explanation or markdown formatting.
Identify the action as 'add_task', 'add_expense', or 'add_reminder'. 

For add_task return: {{ "action": "add_task", "title": "", "note": "", "due_date": "", "due_time": "", "category": "personal" }}
For add_expense return: {{ "action": "add_expense", "name": "", "amount": 0, "due_date": "", "category": "bill", "notes": "" }}

If a due date is not explicitly found, try to infer it from the audio (e.g. "tomorrow"). Use absolute dates (YYYY-MM-DD).
User prompt (optional context): {user_prompt}
"""
        
        print(f"[{datetime.now()}] Pinging Model: gemini-3.1-flash-lite-preview | Purpose: Audio Extraction", flush=True)
        response = model.generate_content(
            [
                {'mime_type': mime_type, 'data': audio_data},
                system_prompt
            ],
            request_options={"timeout": 90}
        )
        
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        parsed = json.loads(text.strip())
        
        with open("gemini_debug.log", "a", encoding="utf-8") as f:
            f.write(f"\n--- [{datetime.now()}] Audio Extraction ---\n")
            f.write(f"Response: {text}\n")
            
        return parsed
    except Exception as e:
        print(f"Gemini Audio Processing Error: {e}")
        return None
