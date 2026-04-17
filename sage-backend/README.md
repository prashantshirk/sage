## Setup Steps
1. Clone repo
2. cd sage-backend
3. python -m venv venv && source venv/bin/activate (or venv\Scripts\activate on Windows)
4. pip install -r requirements.txt
5. Copy .env.example to .env and fill in all values
6. python run.py

## Google Cloud Setup (Required)
- Go to console.cloud.google.com
- Create new project "Sage"
- Enable APIs: Gmail API, Google Calendar API
- Go to OAuth Consent Screen → External → fill app name "Sage"
- Add scopes: gmail.readonly, calendar, userinfo.email, userinfo.profile
- Create OAuth 2.0 Client ID (Web application type)
- Add authorized redirect URI: http://localhost:5000/auth/callback
- Copy Client ID and Secret to .env
