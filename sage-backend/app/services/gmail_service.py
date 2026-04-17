import json
import google.oauth2.credentials
from googleapiclient.discovery import build
from . import groq_service
from datetime import datetime

def get_gmail_service(access_token):
    creds = google.oauth2.credentials.Credentials(access_token)
    return build('gmail', 'v1', credentials=creds)

def fetch_recent_emails(access_token, max_results=20):
    try:
        service = get_gmail_service(access_token)
        
        # Fetch last 7 days to catch fee/payment emails sent earlier in the week
        query = "newer_than:7d"
        results = service.users().messages().list(userId='me', q=query, maxResults=max_results).execute()
        messages = results.get('messages', [])
        
        print(f"Gmail: Fetched {len(messages)} potential messages.", flush=True)
        email_list = []
        for msg in messages:
            msg_id = msg['id']
            msg_detail = service.users().messages().get(userId='me', id=msg_id, format='metadata', metadataHeaders=['From', 'Subject', 'Date']).execute()
            
            headers = msg_detail.get('payload', {}).get('headers', [])
            subject = "No Subject"
            sender = "Unknown Sender"
            date = ""
            
            for header in headers:
                name = header.get('name', '').lower()
                if name == 'subject':
                    subject = header.get('value')
                elif name == 'from':
                    sender = header.get('value')
                elif name == 'date':
                    date = header.get('value')
                    
            sender_name = sender
            sender_email = ""
            if "<" in sender and ">" in sender:
                sender_name = sender.split("<")[0].strip()
                sender_email = sender.split("<")[1].split(">")[0].strip()
                
            email_list.append({
                'message_id': msg_id,
                'sender_name': sender_name,
                'sender_email': sender_email,
                'subject': subject,
                'date': date,
                'snippet': msg_detail.get('snippet', '')[:100]
            })
            safe_subject = subject.encode('ascii', 'replace').decode() if subject else "No Subject"
            safe_sender = sender_name.encode('ascii', 'replace').decode() if sender_name else "Unknown Sender"
            print(f"  - Subject: {safe_subject} (from {safe_sender})", flush=True)
            
        # Log fetch results to file
        with open("gmail_debug.log", "a", encoding="utf-8") as f:
            f.write(f"\n--- [{datetime.now()}] Gmail Fetch ({len(email_list)} emails) ---\n")
            for e in email_list:
                f.write(f"Subject: {e['subject']} | From: {e['sender_name']} | Snippet: {e['snippet']}\n")
                
        return email_list
    except Exception as e:
        print(f"Gmail Fetch Error: {e}", flush=True)
        return []

def extract_action_items(emails_list):
    if not emails_list:
        return []
        
    try:
        emails_json = json.dumps(emails_list, indent=2)
        system_prompt = f"""You are an email triage assistant. Given these emails, identify which ones need action.
Focus especially on:
- Payment requests, fee reminders, or invoices.
- Requests for information or meetings.
- Direct questions from people.

DO NOT skip emails that ask for money or fees. 
Return a JSON array of action items only. Skip marketing, newsletters, or generic automated system notifications (unless they are bills).
For each actionable email return: {{ "sender_name": "...", "subject": "...", "summary": "one line, what action needed", "urgency": "high|medium|low" }}
Emails: {emails_json}
Return only the JSON array."""

        response_text = groq_service.call_groq([], system_prompt, max_tokens=1000, temperature=0.1, purpose="Email Action Item Extraction")
        
        if not response_text:
            return []
            
        cleaned_text = response_text.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]
            
        items = json.loads(cleaned_text.strip())
        print(f"Gmail: Extracted {len(items)} action items.", flush=True)
        return items
    except Exception as e:
        print(f"Email Extraction Error: {e}", flush=True)
        return []
