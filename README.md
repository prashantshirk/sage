# Sage — Personal Operations Agent

Sage is an AI-powered personal assistant that connects to your Google account, monitors your inbox and calendar, tracks bills and subscriptions, and delivers a daily briefing on what actually needs your attention. You can talk to it in plain English and it handles the rest.

Also ships with a **Telegram bot** for mobile access without needing a native app.

---

## What it does

- **Daily Briefing** — AI-generated summary of your tasks, upcoming bills, and email action items every morning
- **Ask Sage** — Type in plain English ("add Netflix bill due 25th") and it creates records, tasks, and calendar events automatically
- **Finance Tracker** — Live map of subscriptions, bills, and EMIs with overdue detection
- **Task Manager** — Syncs with Google Calendar, tracks status, marks overdue automatically
- **Email Intelligence** — Scans Gmail for things that need action and surfaces them
- **Streak Tracker** — Daily completion tracking
- **Telegram Bot** — Full Sage access over Telegram, no install needed

---

## Project Structure

```
sage/
├── frontend/                   # Next.js 14 App Router
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── auth/callback/      # OAuth redirect handler
│   │   └── dashboard/
│   │       ├── page.tsx        # Main dashboard
│   │       ├── command/        # Ask Sage NLP page
│   │       ├── finance/        # Expense tracker
│   │       ├── tasks/          # Task manager
│   │       └── settings/       # Profile and preferences
│   └── lib/
│       ├── api.ts              # Centralized API client
│       └── auth.ts             # JWT helpers
│
├── sage-backend/               # Flask REST API
│   ├── app/
│   │   ├── routes/             # auth, tasks, finance, briefing, nlp, streak
│   │   ├── models/             # user, task, expense, streak (PyMongo)
│   │   ├── services/
│   │   │   ├── groq_service.py     # LLM calls (briefing + NLP extraction)
│   │   │   ├── gmail_service.py    # Gmail API + email triage
│   │   │   ├── calendar_service.py # Google Calendar read/write
│   │   │   ├── nlp_parser.py       # Action router after LLM extraction
│   │   │   └── google_auth.py      # OAuth token refresh
│   │   ├── utils/
│   │   │   ├── auth_helpers.py     # JWT sign/verify
│   │   │   └── date_helpers.py
│   │   ├── config.py
│   │   └── __init__.py
│   └── run.py
│
└── telegram-bot/               # Telegram bot (Python)
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, TypeScript |
| Backend | Flask, Python |
| Database | MongoDB Atlas (PyMongo) |
| Auth | Google OAuth 2.0 + JWT (HS256) |
| AI | Groq API |
| Google APIs | Gmail, Google Calendar |
| Telegram | Telegram Bot API |

---

## How It Works

```
User (Web or Telegram)
        |
        v
  Google OAuth Login
        |
        v
  Flask Backend (JWT protected)
        |
   _____|______________________
  |            |               |
  v            v               v
MongoDB    Google APIs      Groq LLM
(tasks,    (Gmail +        (NLP parsing +
expenses,   Calendar)       briefing gen)
streaks)


Ask Sage flow:
  "Add Netflix 799 due 25th"
        |
        v
  Groq extracts structured JSON
        |
        v
  Backend creates expense + task + calendar event
        |
        v
  Confirmation returned to user


Daily Briefing flow:
  Tasks + Expenses + Gmail + Calendar
        |
        v
  Groq synthesizes everything
        |
        v
  Personalized briefing delivered (web + Telegram)
```

---

## Running it yourself

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB Atlas URI
- Google Cloud project with Gmail + Calendar APIs enabled
- Groq API key

### 1. Clone the repo

```bash
git clone https://github.com/your-username/sage.git
cd sage
```

### 2. Backend setup

```bash
cd sage-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in `sage-backend/`:

```env
MONGO_URI=your_mongodb_uri
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama3-70b-8192
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/callback
JWT_SECRET_KEY=any_random_secret
JWT_EXPIRY_HOURS=72
FRONTEND_URL=http://localhost:3000
FLASK_ENV=development
```

```bash
python run.py
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

```bash
npm run dev
```

### 4. Telegram bot setup

```bash
cd telegram-bot
pip install -r requirements.txt
```

Add your `TELEGRAM_BOT_TOKEN` and backend URL to the bot's `.env`, then:

```bash
python bot.py
```

---

## Known Issues and Limitations

**Google OAuth in Testing mode**
The app uses Gmail and Calendar APIs which require Google's formal app verification (takes 4-6 weeks). Until then, only pre-approved emails can log in. This is a Google Cloud policy, not a code issue. To get access, share your email and we'll add you as a test user instantly.

**Briefing endpoints are not JWT protected**
`/api/briefing/daily` and `/api/briefing/email-items` have no auth decorator. If no `user_id` is passed, the backend defaults to the first user in the database. This needs to be fixed before any public deployment.

**`PATCH /auth/me` ObjectId mismatch**
The route filters by `_id` using a raw string, but MongoDB stores `_id` as ObjectId. Updates to user settings may silently fail without conversion.

**Frontend suggestions shape mismatch**
The backend returns `string[]` from `/api/nlp/suggestions`, but the frontend reads `response.suggestions`. One side needs to be aligned.

**No background jobs**
There are no scheduled workers. The briefing is only generated on request, not pushed automatically. A proper cron or task queue (Celery, etc.) is needed for real push behavior.

**Gemini service exists but is not wired up**
`gemini_service.py` is implemented but not connected to any active route. Groq handles all LLM calls currently.

**LLM rate limiting is in-process only**
`groq_service.py` enforces a 5-second minimum between calls in memory. This breaks under multiple workers or concurrent users.

---

## Environment Variables Reference

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `GROQ_API_KEY` | Groq API auth |
| `GROQ_MODEL` | Model ID (e.g. llama3-70b-8192) |
| `GOOGLE_CLIENT_ID` | Google OAuth client |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL |
| `JWT_SECRET_KEY` | JWT signing secret |
| `JWT_EXPIRY_HOURS` | Token lifetime |
| `FRONTEND_URL` | CORS origin + post-login redirect |
| `NEXT_PUBLIC_API_URL` | Frontend API base URL |
| `FLASK_ENV` | Flask mode (development/production) |

---

*Built at summer hacks ITM SKILL UNI  by Team PAT*
*demo video link:-https://drive.google.com/file/d/1pUQrwDPQvOuSgE2CCZ-9_iteEDoWIjnd/view"

