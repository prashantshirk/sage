"""
telegram_service.py
───────────────────
All communication with the Telegram Bot API.
Uses TELEGRAM_BOT_TOKEN from Flask's current_app.config.
"""

import json
import requests
from datetime import datetime, timezone
from flask import current_app

from app.utils.date_helpers import days_until


# ── helpers ──────────────────────────────────────────────────────────────────

def get_bot_token() -> str:
    """Return the Telegram Bot Token from Flask config."""
    return current_app.config.get("TELEGRAM_BOT_TOKEN", "")


def _api_url(method: str) -> str:
    """Build a full Telegram API URL for the given method."""
    return f"https://api.telegram.org/bot{get_bot_token()}/{method}"


# ── core API calls ────────────────────────────────────────────────────────────

def send_message(chat_id, text: str, parse_mode: str = "Markdown",
                 reply_markup: dict = None):
    """
    Send a text message to a Telegram chat.

    Args:
        chat_id:      Telegram chat / user ID.
        text:         Message body (supports Markdown).
        parse_mode:   "Markdown" (default) or "HTML".
        reply_markup: Optional dict (InlineKeyboardMarkup etc.) serialised to JSON.

    Returns:
        dict response from Telegram, or None on failure.
    """
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
    }
    if reply_markup is not None:
        payload["reply_markup"] = json.dumps(reply_markup)

    try:
        resp = requests.post(_api_url("sendMessage"), json=payload, timeout=10)
        return resp.json()
    except Exception as e:
        print(f"[TelegramService] send_message error: {e}")
        return None


def send_typing(chat_id):
    """
    Send a 'typing…' chat action indicator (silently fails on error).

    Args:
        chat_id: Telegram chat / user ID.
    """
    try:
        requests.post(
            _api_url("sendChatAction"),
            json={"chat_id": chat_id, "action": "typing"},
            timeout=5,
        )
    except Exception:
        pass  # Best-effort — never crash the caller


def set_webhook(webhook_url: str) -> dict:
    """
    Register a webhook URL with Telegram so it pushes updates to our server.

    Args:
        webhook_url: The public HTTPS URL Telegram will POST to.

    Returns:
        Telegram API response dict.
    """
    secret = current_app.config.get("TELEGRAM_WEBHOOK_SECRET", "")
    payload = {
        "url": webhook_url,
        "allowed_updates": ["message", "callback_query"],
        "drop_pending_updates": True,
        "secret_token": secret
    }
    resp = requests.post(_api_url("setWebhook"), json=payload, timeout=10)
    result = resp.json()
    print(f"[TelegramService] set_webhook -> {result}")
    return result


# ── message formatters ────────────────────────────────────────────────────────

# Category → emoji mapping used in format_tasks_message
_CAT_ICON: dict[str, str] = {
    "calendar":  "📅",
    "reminder":  "🔔",
    "bill":      "💸",
}
_DEFAULT_CAT_ICON = "📌"


def format_tasks_message(tasks: list) -> str:
    """
    Build a Markdown-formatted message listing today's tasks.

    Args:
        tasks: List of task dicts from MongoDB (already serialised).

    Returns:
        Formatted Markdown string ready to send via send_message().
    """
    if not tasks:
        return "✅ No tasks for today! You're all clear."

    lines = ["📋 *Today's Tasks*", ""]

    completed = 0
    for task in tasks:
        status     = task.get("status", "pending")
        title      = task.get("title", "Untitled")
        category   = task.get("category", "").lower()
        due_time   = task.get("due_time") or task.get("time")

        # Status checkbox
        if status == "completed":
            checkbox = "✅"
            completed += 1
        else:
            checkbox = "⬜"

        # Category icon
        cat_icon = _CAT_ICON.get(category, _DEFAULT_CAT_ICON)

        # Build the line
        line = f"{checkbox} {cat_icon} {title}"
        if due_time:
            line += f" _({due_time})_"

        lines.append(line)

    # Footer
    total = len(tasks)
    lines.append("")
    lines.append(f"_Progress: {completed}/{total} done_")

    return "\n".join(lines)


def format_expenses_message(expenses: list) -> str:
    """
    Build a Markdown-formatted message listing upcoming bills / expenses.

    Args:
        expenses: List of expense dicts from MongoDB (already serialised).

    Returns:
        Formatted Markdown string ready to send via send_message().
    """
    if not expenses:
        return "💰 No upcoming bills in the next 7 days."

    lines = ["💸 *Upcoming Bills*", ""]

    total_unpaid = 0.0

    for exp in expenses:
        name       = exp.get("name") or exp.get("title", "Unknown")
        amount     = float(exp.get("amount", 0))
        status     = (exp.get("status") or "upcoming").lower()
        raw_due    = exp.get("due_date")

        # Parse due_date — handle ISO string or datetime object
        due_dt = None
        if isinstance(raw_due, datetime):
            due_dt = raw_due
            if due_dt.tzinfo is None:
                due_dt = due_dt.replace(tzinfo=timezone.utc)
        elif isinstance(raw_due, str) and raw_due:
            try:
                from dateutil import parser as _dp
                due_dt = _dp.parse(raw_due)
                if due_dt.tzinfo is None:
                    due_dt = due_dt.replace(tzinfo=timezone.utc)
            except Exception:
                due_dt = None

        # Status icon
        if status == "paid":
            status_icon = "✅"
        elif status == "overdue":
            status_icon = "🔴"
        elif status == "due_soon":
            status_icon = "🟡"
        else:
            status_icon = "🟢"

        # Days-until label
        if due_dt:
            d = days_until(due_dt)
            if d == 0:
                due_label = "📍 *TODAY*"
            elif d == 1:
                due_label = "⚠️ Tomorrow"
            elif d < 0:
                due_label = f"🔴 {abs(d)}d overdue"
            else:
                due_label = f"in {d} days"
        else:
            due_label = ""

        # Accumulate unpaid total
        if status != "paid":
            total_unpaid += amount

        line = f"{status_icon} *{name}* — ₹{amount:,.0f}"
        if due_label:
            line += f" ({due_label})"
        lines.append(line)

    # Footer
    lines.append("")
    lines.append(f"_Total unpaid: ₹{total_unpaid:,.0f}_")

    return "\n".join(lines)


def format_briefing_message(briefing_data: dict, user_name: str) -> str:
    """
    Build a Markdown-formatted daily morning briefing message.

    Args:
        briefing_data: Dict with keys:
            - briefing (str): The AI-generated briefing text.
            - summary  (dict): tasks_count, bills_count, bills_total,
                               action_items_count.
        user_name: The user's full name (first word is used for greeting).

    Returns:
        Formatted Markdown string ready to send via send_message().
    """
    first_name = user_name.split()[0] if user_name else "there"
    briefing_text = briefing_data.get("briefing", "").strip()
    summary = briefing_data.get("summary", {})

    tasks_count       = summary.get("tasks_count", 0)
    bills_count       = summary.get("bills_count", 0)
    bills_total       = summary.get("bills_total", 0)
    action_items_count = summary.get("action_items_count", 0)

    divider = "─────────────────"

    lines = [
        f"☀️ *Good morning, {first_name}!*",
        "",
        briefing_text,
        "",
        divider,
        "",
        f"📋 *Tasks today:* {tasks_count}",
        f"💸 *Upcoming bills:* {bills_count}"
        + (f" _(₹{bills_total:,.0f} total)_" if bills_total else ""),
        f"📧 *Email action items:* {action_items_count}",
        "",
        "_Open Sage for full details_",
    ]

    return "\n".join(lines)
