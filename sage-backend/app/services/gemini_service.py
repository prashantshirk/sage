from flask import current_app
import google.generativeai as genai
from datetime import datetime, timezone
import base64
import json
import time

# Primary model — give it plenty of time as it can be slow
PRIMARY_MODEL = "gemini-3.1-flash-lite-preview"
# Fallback used only when primary doesn't reply in time
FALLBACK_MODEL = "gemini-2.5-flash-lite"

# Give the primary model up to 70s before giving up and trying the fallback
PRIMARY_TIMEOUT = 70
# Fallback gets the remaining budget
FALLBACK_TIMEOUT = 90

# Seconds to wait before retrying with the fallback model
FALLBACK_WAIT_SECONDS = 2


def _generate_with_fallback(content, purpose, primary_model=PRIMARY_MODEL,
                             fallback_model=FALLBACK_MODEL,
                             generation_config=None):
    """
    Try `primary_model` first with PRIMARY_TIMEOUT (short, so we fail fast).
    If it raises any exception (timeout, quota, API error, etc.) wait
    FALLBACK_WAIT_SECONDS then retry with `fallback_model` using FALLBACK_TIMEOUT.
    Returns the raw response object, or raises if the fallback also fails.
    """
    def _call(model_name, call_timeout, label=""):
        tag = f" ({label})" if label else ""
        print(
            f"[{datetime.now()}] Pinging Model: {model_name}{tag} | Purpose: {purpose}",
            flush=True,
        )
        model = genai.GenerativeModel(model_name)
        kwargs = {"request_options": {"timeout": call_timeout}}
        if generation_config:
            kwargs["generation_config"] = generation_config
        return model.generate_content(content, **kwargs)

    try:
        return _call(primary_model, PRIMARY_TIMEOUT)
    except Exception as primary_err:
        print(
            f"[{datetime.now()}] WARNING: Primary model '{primary_model}' failed "
            f"({type(primary_err).__name__}: {str(primary_err)[:80]}). "
            f"Waiting {FALLBACK_WAIT_SECONDS}s then trying '{fallback_model}'...",
            flush=True,
        )
        with open("gemini_debug.log", "a", encoding="utf-8") as f:
            f.write(
                f"\n--- [{datetime.now()}] Primary model failed | Purpose: {purpose} ---\n"
                f"Error: {primary_err}\nSwitching to fallback: {fallback_model}\n"
            )
        time.sleep(FALLBACK_WAIT_SECONDS)
        return _call(fallback_model, FALLBACK_TIMEOUT, label="fallback")


# ---------------------------------------------------------------------------
# Daily Briefing
# ---------------------------------------------------------------------------

def call_gemini(prompt, max_tokens=2000):
    try:
        api_key = current_app.config.get("GEMINI_API_KEY")
        if not api_key:
            return None

        genai.configure(api_key=api_key)
        primary = current_app.config.get("GEMINI_MODEL", PRIMARY_MODEL)

        gen_cfg = {
            "max_output_tokens": max_tokens,
            "temperature": 0.7,
            "top_p": 0.95,
        }

        response = _generate_with_fallback(
            content=prompt,
            purpose="Daily Briefing Generation",
            primary_model=primary,
            generation_config=gen_cfg,
        )
        text = response.text

        with open("gemini_debug.log", "a", encoding="utf-8") as f:
            f.write(f"\n--- [{datetime.now()}] Daily Briefing ---\nResponse: {text}\n")

        return text
    except Exception as e:
        with open("gemini_debug.log", "a", encoding="utf-8") as f:
            f.write(f"\n--- [{datetime.now()}] Error in Gemini (Briefing) ---\n{e}\n")
        print(f"Gemini Briefing Error: {e}")
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


# ---------------------------------------------------------------------------
# Document / Image Extraction
# ---------------------------------------------------------------------------

def extract_data_from_image(image_base64, user_prompt, mime_type="image/jpeg"):
    try:
        api_key = current_app.config.get("GEMINI_API_KEY")
        if not api_key:
            return None

        genai.configure(api_key=api_key)
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

        response = _generate_with_fallback(
            content=[{"mime_type": mime_type, "data": image_data}, system_prompt],
            purpose="Document Extraction",
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
            f.write(f"\n--- [{datetime.now()}] Document Extraction ---\nResponse: {text}\n")

        return parsed
    except Exception as e:
        print(f"Gemini Image Processing Error: {e}")
        return None


# ---------------------------------------------------------------------------
# Audio / Voice Note Extraction
# ---------------------------------------------------------------------------

def extract_data_from_audio(audio_base64, user_prompt="", mime_type="audio/webm"):
    try:
        api_key = current_app.config.get("GEMINI_API_KEY")
        if not api_key:
            return None

        genai.configure(api_key=api_key)
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

        response = _generate_with_fallback(
            content=[{"mime_type": mime_type, "data": audio_data}, system_prompt],
            purpose="Audio Extraction",
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
            f.write(f"\n--- [{datetime.now()}] Audio Extraction ---\nResponse: {text}\n")

        return parsed
    except Exception as e:
        print(f"Gemini Audio Processing Error: {e}")
        return None
