"""
telegram_handler.py
────────────────────
The brain of the Sage Telegram bot.
Receives parsed Telegram update dicts and routes them to the correct handler.
"""

import traceback
from bson import ObjectId

from app.services.telegram_service import (
    send_message,
    send_typing,
    format_tasks_message,
    format_expenses_message,
    format_briefing_message,
)
from app.models.task import get_todays_tasks, update_task_status
from app.models.expense import get_upcoming_expenses
from app.models.streak import get_streak, submit_daily_progress
from app.services.nlp_parser import process_natural_language_input
from app.services.gemini_service import generate_daily_briefing
from app.services.gmail_service import fetch_recent_emails, extract_action_items
from app.services.calendar_service import fetch_todays_events
from app.utils.date_helpers import get_today_str


# ── db helper ────────────────────────────────────────────────────────────────

def get_db():
    from app import get_db as _get_db
    return _get_db()


# ── top-level router ─────────────────────────────────────────────────────────

def handle_update(update: dict):
    """
    Entry-point called by the webhook route.
    Routes the update to handle_message or handle_callback.
    """
    db = get_db()

    if "message" in update:
        msg = update["message"]
        chat_id = msg.get("chat", {}).get("id")
        text = msg.get("text", "").strip()
        if chat_id and text:
            handle_message(db, chat_id, text)

    elif "callback_query" in update:
        cq = update["callback_query"]
        chat_id = cq.get("message", {}).get("chat", {}).get("id")
        data = cq.get("data", "")
        if chat_id and data:
            handle_callback(db, chat_id, data)


# ── user lookup ───────────────────────────────────────────────────────────────

def get_user_from_chat(db, chat_id):
    """Return the user document linked to this Telegram chat_id, or None."""
    return db.users.find_one({"telegram_chat_id": str(chat_id)})


# ── message router ────────────────────────────────────────────────────────────

def handle_message(db, chat_id, text: str):
    """Dispatch an incoming text message to the correct handler."""
    lower = text.lower().strip()

    if lower == "/start" or lower.startswith("/start "):
        handle_start(db, chat_id, text)

    elif lower in ("/today", "today", "what's today", "whats today"):
        handle_today(db, chat_id)

    elif lower in ("/bills", "bills", "upcoming bills"):
        handle_bills(db, chat_id)

    elif lower in ("/briefing", "briefing", "morning briefing"):
        handle_briefing(db, chat_id)

    elif lower in ("/streak", "streak", "my streak"):
        handle_streak(db, chat_id)

    elif lower in ("/help", "help"):
        handle_help(chat_id)

    elif lower.startswith("done ") or lower.startswith("completed "):
        handle_done(db, chat_id, text)

    else:
        handle_nlp(db, chat_id, text)


# ── individual handlers ───────────────────────────────────────────────────────

def handle_start(db, chat_id, text: str):
    """
    /start <user_id>  — links this Telegram account to a Sage user.
    If no user_id is given, prompt the user to go to Settings.
    """
    parts = text.strip().split(maxsplit=1)

    if len(parts) < 2:
        send_message(
            chat_id,
            "👋 *Welcome to Sage!*\n\n"
            "To link your account, go to *Settings → Integrations* inside the Sage app "
            "and tap *Connect Telegram*. You'll be given a personal link to use here.",
        )
        return

    user_id_str = parts[1].strip()

    try:
        user = db.users.find_one({"_id": ObjectId(user_id_str)})
    except Exception:
        user = None

    if not user:
        send_message(
            chat_id,
            "❌ Couldn't find your Sage account. "
            "Please make sure you used the link from the Sage Settings page.",
        )
        return

    db.users.update_one(
        {"_id": ObjectId(user_id_str)},
        {"$set": {"telegram_chat_id": str(chat_id)}}
    )

    first_name = (user.get("name") or "there").split()[0]
    send_message(
        chat_id,
        f"✅ *Linked! Hey {first_name}, Sage is ready.*\n\n"
        "Here's what you can do:\n\n"
        "📋 /today — See today's tasks\n"
        "💸 /bills — Upcoming bills\n"
        "☀️ /briefing — Morning AI briefing\n"
        "🔥 /streak — Your productivity streak\n"
        "❓ /help — All commands & examples\n\n"
        "_You can also just type naturally — Sage understands plain English!_",
    )


def handle_today(db, chat_id):
    """Show today's tasks with an inline keyboard for bulk actions."""
    user = get_user_from_chat(db, chat_id)
    if not user:
        _send_link_prompt(chat_id)
        return

    user_id = str(user["_id"])
    send_typing(chat_id)

    tasks = get_todays_tasks(db, user_id)
    message = format_tasks_message(tasks)

    # Build inline keyboard only when there are pending tasks
    pending = [t for t in tasks if t.get("status") != "completed"]
    reply_markup = None
    if pending:
        reply_markup = {
            "inline_keyboard": [[
                {"text": "✅ Mark All Done",    "callback_data": f"mark_all_done_{user_id}"},
                {"text": "📊 Submit Progress",  "callback_data": f"submit_progress_{user_id}"},
            ]]
        }

    send_message(chat_id, message, reply_markup=reply_markup)


def handle_bills(db, chat_id):
    """Show upcoming expenses for the next 7 days."""
    user = get_user_from_chat(db, chat_id)
    if not user:
        _send_link_prompt(chat_id)
        return

    user_id = str(user["_id"])
    send_typing(chat_id)

    expenses = get_upcoming_expenses(db, user_id, days=7)
    send_message(chat_id, format_expenses_message(expenses))


def handle_briefing(db, chat_id):
    """Generate and send a full AI morning briefing."""
    user = get_user_from_chat(db, chat_id)
    if not user:
        _send_link_prompt(chat_id)
        return

    user_id = str(user["_id"])
    send_typing(chat_id)
    send_message(chat_id, "⏳ Generating your briefing... hold on")

    # Gather data
    tasks    = get_todays_tasks(db, user_id)
    expenses = get_upcoming_expenses(db, user_id, days=7)

    calendar_events    = []
    email_action_items = []

    access_token = user.get("google_access_token")
    if access_token:
        try:
            calendar_events = fetch_todays_events(access_token) or []
        except Exception as e:
            print(f"[TelegramHandler] calendar fetch error: {e}")

        try:
            raw_emails         = fetch_recent_emails(access_token) or []
            email_action_items = extract_action_items(raw_emails) or []
        except Exception as e:
            print(f"[TelegramHandler] gmail fetch error: {e}")

    user_name    = user.get("name", "there")
    briefing_text = generate_daily_briefing(
        user_name,
        tasks,
        expenses,
        email_action_items,
        calendar_events,
    ) or "_(Briefing unavailable — please try again later.)_"

    briefing_data = {
        "briefing": briefing_text,
        "summary": {
            "tasks_count":        len(tasks),
            "bills_count":        len(expenses),
            "bills_total":        sum(float(e.get("amount", 0)) for e in expenses),
            "action_items_count": len(email_action_items),
        },
    }

    send_message(chat_id, format_briefing_message(briefing_data, user_name))


def handle_streak(db, chat_id):
    """Show the user's current productivity streak."""
    user = get_user_from_chat(db, chat_id)
    if not user:
        _send_link_prompt(chat_id)
        return

    user_id = str(user["_id"])
    send_typing(chat_id)

    streak = get_streak(db, user_id)
    current  = streak.get("current_streak", 0)
    best     = streak.get("best_streak", 0)
    last_sub = streak.get("last_submitted_date") or "Never"

    # Fire emoji accumulator (capped at 5)
    if current > 0:
        fire_line = "🔥" * min(current, 5)
        if current > 5:
            fire_line += f" ×{current}"
    else:
        fire_line = "💤"

    # Motivational suffix
    if current == 0:
        motivation = "_Submit today's progress to start a streak!_"
    elif current < 3:
        motivation = "_Great start — keep the momentum going!_"
    elif current < 7:
        motivation = "_You're on a roll! Don't break the chain. 💪_"
    elif current < 14:
        motivation = "_Incredible consistency! You're building real habits. 🏆_"
    else:
        motivation = "_Legendary streak! You're an absolute productivity machine. 🌟_"

    message = (
        f"🔥 *Your Streak*\n\n"
        f"{fire_line}\n\n"
        f"*Current streak:* {current} day{'s' if current != 1 else ''}\n"
        f"*Best streak:*    {best} day{'s' if best != 1 else ''}\n"
        f"*Last submitted:* {last_sub}\n\n"
        f"{motivation}"
    )
    send_message(chat_id, message)


def handle_done(db, chat_id, text: str):
    """Mark a specific task as completed by name fragment."""
    user = get_user_from_chat(db, chat_id)
    if not user:
        return

    user_id = str(user["_id"])

    # Strip the command prefix
    lower = text.lower().strip()
    if lower.startswith("done "):
        task_name = text[5:].strip()
    else:  # "completed "
        task_name = text[10:].strip()

    tasks = get_todays_tasks(db, user_id)
    matched = next(
        (t for t in tasks if task_name.lower() in (t.get("title") or "").lower()),
        None,
    )

    if not matched:
        send_message(
            chat_id,
            f"🤔 Couldn't find a task matching *\"{task_name}\"* in today's list.\n\n"
            "_Use /today to see your current tasks._",
        )
        return

    update_task_status(db, matched["_id"], "completed")
    send_message(
        chat_id,
        f"✅ Marked *\"{matched['title']}\"* as complete!\n\n"
        "_Nice work — keep going!_",
    )


def handle_nlp(db, chat_id, text: str):
    """Forward anything unrecognised to the NLP parser."""
    user = get_user_from_chat(db, chat_id)
    if not user:
        _send_link_prompt(chat_id)
        return

    user_id = str(user["_id"])
    send_typing(chat_id)

    result = process_natural_language_input(db, user_id, text)

    if result.get("success"):
        base_msg  = result.get("message", "✅ Done!")
        # Append what was created, if available
        extra = ""
        if result.get("expense"):
            exp   = result["expense"]
            extra = f"\n\n💸 Added: *{exp.get('name')}* — ₹{float(exp.get('amount', 0)):,.0f}"
        elif result.get("task"):
            task  = result["task"]
            extra = f"\n\n📋 Added task: *{task.get('title')}*"
        send_message(chat_id, base_msg + extra)
    else:
        send_message(
            chat_id,
            f"😕 {result.get('message', 'Something went wrong.')}\n\n"
            "_Try something like: \"Add gym fee ₹1500 due Friday\" or /help for examples._",
        )


def handle_help(chat_id):
    """Send the full help / command reference."""
    send_message(
        chat_id,
        "🤖 *Sage Bot — Help*\n\n"
        "*Commands*\n"
        "/today — Today's tasks\n"
        "/bills — Upcoming bills (next 7 days)\n"
        "/briefing — AI morning briefing\n"
        "/streak — Your productivity streak\n"
        "/help — Show this message\n\n"
        "*Mark tasks done*\n"
        "`done <task name>` — e.g. `done gym`\n\n"
        "*Natural language examples*\n"
        "• _Add electricity bill ₹2000 due 25th April_\n"
        "• _Schedule dentist appointment tomorrow at 3pm_\n"
        "• _Remind me to submit report on Friday_\n"
        "• _Log Netflix subscription ₹499 monthly_\n"
        "• _Add task: call client at 5pm_",
    )


# ── callback query handler ────────────────────────────────────────────────────

def handle_callback(db, chat_id, data: str):
    """Handle inline keyboard button presses."""

    if data.startswith("mark_all_done_"):
        user_id = data[len("mark_all_done_"):]
        tasks   = get_todays_tasks(db, user_id)
        pending = [t for t in tasks if t.get("status") != "completed"]

        for task in pending:
            try:
                update_task_status(db, task["_id"], "completed")
            except Exception as e:
                print(f"[TelegramHandler] mark_all_done error: {e}")

        count = len(pending)
        send_message(
            chat_id,
            f"✅ Marked *{count} task{'s' if count != 1 else ''}* as complete!\n\n"
            "_Amazing work today! 🎉_",
        )

    elif data.startswith("submit_progress_"):
        user_id = data[len("submit_progress_"):]
        tasks   = get_todays_tasks(db, user_id)
        total     = len(tasks)
        completed = sum(1 for t in tasks if t.get("status") == "completed")

        streak = submit_daily_progress(db, user_id, total, completed, get_today_str())
        current = streak.get("current_streak", 0)

        send_message(
            chat_id,
            f"📊 *Progress submitted!*\n\n"
            f"Completed: {completed}/{total} tasks\n"
            f"🔥 Current streak: *{current} day{'s' if current != 1 else ''}*\n\n"
            "_Keep it up!_",
        )


# ── private helpers ───────────────────────────────────────────────────────────

def _send_link_prompt(chat_id):
    """Tell an unlinked user how to connect their Sage account."""
    send_message(
        chat_id,
        "🔗 *Your Telegram account isn't linked yet.*\n\n"
        "Go to *Settings → Integrations* inside Sage and tap *Connect Telegram* "
        "to get your personal link command.",
    )
