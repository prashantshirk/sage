import os
import json
import google.oauth2.credentials
import google.auth.transport.requests
from googleapiclient.discovery import build
from pymongo import MongoClient
import certifi
from dotenv import load_dotenv

load_dotenv(r"c:\Users\prashant shirke\Desktop\sage\sage-backend\.env")

def get_db():
    mongo_uri = os.getenv("MONGO_URI")
    client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
    db_name = "sage" # Default from init_mongo
    return client[db_name]

def refresh_token(access_token, refresh_token):
    creds = google.oauth2.credentials.Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET")
    )
    try:
        if creds.expired and creds.refresh_token:
            creds.refresh(google.auth.transport.requests.Request())
            return creds.token
    except:
        pass
    return access_token

def test_gmail_fetch():
    db = get_db()
    user = db.users.find_one()
    if not user:
        print("No user found in DB")
        return

    print(f"Testing for user: {user.get('email')}")

    token = refresh_token(user.get('google_access_token'), user.get('google_refresh_token'))
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

if __name__ == "__main__":
    test_gmail_fetch()
