from datetime import datetime, timezone
from dateutil import parser

def parse_natural_date(text):
    if not text:
        return None
    try:
        dt = parser.parse(text, fuzzy=True)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None

def format_date_for_display(dt):
    if not dt:
        return ""
    return dt.strftime(f"%B {dt.day}, %Y")

def is_today(dt):
    if not dt:
        return False
    now = datetime.now(timezone.utc)
    return dt.date() == now.date()

def is_overdue(dt):
    if not dt:
        return False
    now = datetime.now(timezone.utc)
    return dt.date() < now.date()

def days_until(dt):
    if not dt:
        return 0
    now = datetime.now(timezone.utc)
    delta = dt.date() - now.date()
    return delta.days

def get_today_str():
    now = datetime.now(timezone.utc)
    return now.strftime("%Y-%m-%d")
