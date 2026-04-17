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

def create_calendar_event(tokens, title, date_str, time_str=None, description="", duration_minutes=60):
    try:
        if isinstance(tokens, str):
            # Backwards compatibility for raw access token
            creds = Credentials(token=tokens)
        else:
            creds = _credentials_from_dict(tokens)
            # Try to refresh if possible
            if creds.expired and creds.refresh_token:
                import google.auth.transport.requests
                creds.refresh(google.auth.transport.requests.Request())
        
        service = build('calendar', 'v3', credentials=creds, cache_discovery=False)
        
        event = {
            'summary': title,
            'description': description,
        }
        
        # Normalize date_str to string if it's a datetime object
        if isinstance(date_str, datetime):
            date_only_str = date_str.strftime("%Y-%m-%d")
        else:
            date_only_str = str(date_str)

        if time_str:
            # If date_only_str already has a time or T, clean it
            if ' ' in date_only_str:
                date_only_str = date_only_str.split(' ')[0]
            if 'T' in date_only_str:
                date_only_str = date_only_str.split('T')[0]
                
            start_dt_str = f"{date_only_str}T{time_str}:00"
            try:
                start_dt = datetime.fromisoformat(start_dt_str)
            except ValueError:
                # Fallback for other formats
                from dateutil import parser
                start_dt = parser.parse(start_dt_str)
                
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
            if ' ' in date_only_str:
                date_only_str = date_only_str.split(' ')[0]
            if 'T' in date_only_str:
                date_only_str = date_only_str.split('T')[0]
                
            event['start'] = {
                'date': date_only_str,
                'timeZone': 'Asia/Kolkata',
            }
            event['end'] = {
                'date': date_only_str,
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

def update_calendar_event(tokens, event_id, date_str, time_str=None, duration_minutes=60):
    try:
        if isinstance(tokens, str):
            creds = Credentials(token=tokens)
        else:
            creds = _credentials_from_dict(tokens)
            if creds.expired and creds.refresh_token:
                import google.auth.transport.requests
                creds.refresh(google.auth.transport.requests.Request())
        
        service = build('calendar', 'v3', credentials=creds, cache_discovery=False)
        
        event_patch = {}
        
        if isinstance(date_str, datetime):
            date_only_str = date_str.strftime("%Y-%m-%d")
        else:
            date_only_str = str(date_str)

        if time_str:
            if ' ' in date_only_str:
                date_only_str = date_only_str.split(' ')[0]
            if 'T' in date_only_str:
                date_only_str = date_only_str.split('T')[0]
                
            start_dt_str = f"{date_only_str}T{time_str}:00"
            try:
                start_dt = datetime.fromisoformat(start_dt_str)
            except ValueError:
                from dateutil import parser
                start_dt = parser.parse(start_dt_str)
                
            end_dt = start_dt + timedelta(minutes=duration_minutes)
            
            event_patch['start'] = {
                'dateTime': start_dt.isoformat(),
                'timeZone': 'Asia/Kolkata',
            }
            event_patch['end'] = {
                'dateTime': end_dt.isoformat(),
                'timeZone': 'Asia/Kolkata',
            }
        else:
            if ' ' in date_only_str:
                date_only_str = date_only_str.split(' ')[0]
            if 'T' in date_only_str:
                date_only_str = date_only_str.split('T')[0]
                
            event_patch['start'] = {
                'date': date_only_str,
                'timeZone': 'Asia/Kolkata',
            }
            event_patch['end'] = {
                'date': date_only_str,
                'timeZone': 'Asia/Kolkata',
            }
            
        updated_event = service.events().patch(calendarId='primary', eventId=event_id, body=event_patch).execute()
        return updated_event.get('id')
    except Exception as e:
        print(f"Calendar Update Error: {e}")
        return None
