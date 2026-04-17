import os
import sqlite3
import json
import google.oauth2.credentials
import google.auth.transport.requests
from googleapiclient.discovery import build

def get_db():
    db_path = r"c:\Users\prashant shirke\Desktop\sage\sage-backend\sage.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def refresh_token(access_token, refresh_token):
    creds = google.oauth2.credentials.Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET")
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(google.auth.transport.requests.Request())
        return creds.token
    return access_token

def test_gmail_fetch():
    db = get_db()
    user = db.execute("SELECT * FROM users LIMIT 1").fetchone()
    if not user:
        print("No user found in DB")
        return

    from dotenv import load_dotenv
    load_dotenv(r"c:\Users\prashant shirke\Desktop\sage\sage-backend\.env")

    token = refresh_token(user['google_access_token'], user['google_refresh_token'])
    service = build('gmail', 'v1', credentials=google.oauth2.credentials.Credentials(token))

    # Test the BROAD query
    query = "newer_than:1d"
    print(f"Testing Gmail Query: {query}")
    
    results = service.users().messages().list(userId='me', q=query, maxResults=20).execute()
    messages = results.get('messages', [])
    
    print(f"Found {len(messages)} messages.")
    
    for msg in messages:
        m = service.users().messages().get(userId='me', id=msg['id'], format='metadata', metadataHeaders=['From', 'Subject']).execute()
        headers = m.get('payload', {}).get('headers', [])
        subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), "No Subject")
        sender = next((h['value'] for h in headers if h['name'].lower() == 'from'), "Unknown")
        print(f" - [{msg['id']}] {subject} (from {sender})")
        print(f"   Snippet: {m.get('snippet')[:100]}...")

test_gmail_fetch()
