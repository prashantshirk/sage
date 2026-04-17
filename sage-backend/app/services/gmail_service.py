from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import json
from app.services import groq_service

def get_gmail_service(access_token):
    creds = Credentials(token=access_token)
    return build('gmail', 'v1', credentials=creds, cache_discovery=False)

def fetch_recent_emails(access_token, max_results=20):
    try:
        service = get_gmail_service(access_token)
        
        query = "in:inbox -category:promotions -category:social newer_than:2d"
        results = service.users().messages().list(userId='me', q=query, maxResults=max_results).execute()
        messages = results.get('messages', [])
        
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
                'snippet': msg_detail.get('snippet', '')[:200]
            })
            
        return email_list
    except Exception as e:
        print(f"Gmail Fetch Error: {e}")
        return []

def extract_action_items(emails_list):
    if not emails_list:
        return []
        
    try:
        emails_json = json.dumps(emails_list, indent=2)
        system_prompt = f"""You are an email triage assistant. Given these emails, identify which ones need action.
Return a JSON array of action items only (skip newsletters, receipts, notifications).
For each actionable email return: {{ "sender_name": "...", "subject": "...", "summary": "one line, what action needed", "urgency": "high|medium|low" }}
Emails: {emails_json}
Return only the JSON array."""

        response_text = groq_service.call_groq([], system_prompt, max_tokens=1000, temperature=0.1)
        
        if not response_text:
            return []
            
        cleaned_text = response_text.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]
            
        return json.loads(cleaned_text.strip())
    except Exception as e:
        print(f"Email Extraction Error: {e}")
        return []
