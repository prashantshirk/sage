from datetime import datetime, timezone, timedelta
from flask import current_app
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

def get_calendar_service(access_token):
    creds = Credentials(token=access_token)
    return build('calendar', 'v3', credentials=creds, cache_discovery=False)

def fetch_todays_events(access_token, timezone_str="Asia/Kolkata"):
    try:
        service = get_calendar_service(access_token)
        
        import pytz
        tz = pytz.timezone(timezone_str)
        now = datetime.now(tz)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_today = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        timeMin = start_of_today.isoformat()
        timeMax = end_of_today.isoformat()
        
        events_result = service.events().list(
            calendarId='primary',
            timeMin=timeMin,
            timeMax=timeMax,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        simplified = []
        for event in events:
            start = event.get('start', {}).get('dateTime', event.get('start', {}).get('date'))
            end = event.get('end', {}).get('dateTime', event.get('end', {}).get('date'))
            
            simplified.append({
                'google_event_id': event.get('id'),
                'title': event.get('summary', 'No Title'),
                'start_time': start,
                'end_time': end,
                'description': event.get('description', '')
            })
            
        return simplified
    except Exception as e:
        print(f"Calendar Fetch Error: {e}")
        return []

def create_calendar_event(access_token, title, date_str, time_str=None, description="", duration_minutes=60):
    try:
        service = get_calendar_service(access_token)
        
        event = {
            'summary': title,
            'description': description,
        }
        
        if time_str:
            start_dt_str = f"{date_str}T{time_str}:00"
            start_dt = datetime.fromisoformat(start_dt_str)
            end_dt = start_dt + timedelta(minutes=duration_minutes)
            
            event['start'] = {
                'dateTime': start_dt.isoformat(),
                'timeZone': 'Asia/Kolkata',
            }
            event['end'] = {
                'dateTime': end_dt.isoformat(),
                'timeZone': 'Asia/Kolkata',
            }
        else:
            if 'T' in date_str:
                date_str = date_str.split('T')[0]
                
            event['start'] = {
                'date': date_str,
                'timeZone': 'Asia/Kolkata',
            }
            event['end'] = {
                'date': date_str,
                'timeZone': 'Asia/Kolkata',
            }
            
        created_event = service.events().insert(calendarId='primary', body=event).execute()
        return created_event.get('id')
    except Exception as e:
        print(f"Calendar Create Error: {e}")
        return None

def delete_calendar_event(access_token, event_id):
    try:
        service = get_calendar_service(access_token)
        service.events().delete(calendarId='primary', eventId=event_id).execute()
        return True
    except Exception as e:
        print(f"Calendar Delete Error: {e}")
        return False

# Retaining for backwards compatibility with tasks.py
def _credentials_from_dict(tokens: dict):
    return Credentials(
        token=tokens.get("token"),
        refresh_token=tokens.get("refresh_token"),
        token_uri=tokens.get("token_uri"),
        client_id=tokens.get("client_id"),
        client_secret=tokens.get("client_secret"),
        scopes=tokens.get("scopes") or current_app.config.get("GOOGLE_SCOPES", []),
    )

def get_calendar_events(tokens: dict, max_results: int = 10):
    if not tokens or not tokens.get("token"):
        return []

    creds = _credentials_from_dict(tokens)
    service = build("calendar", "v3", credentials=creds, cache_discovery=False)
    now = datetime.now(timezone.utc).isoformat()

    results = (
        service.events()
        .list(
            calendarId="primary",
            timeMin=now,
            maxResults=max_results,
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )
    return results.get("items", [])
