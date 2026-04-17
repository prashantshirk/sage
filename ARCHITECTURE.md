# Sage Architecture (Code-Verified)

## Table of Contents
- [1. Scope and Evidence](#1-scope-and-evidence)
- [2. System Overview](#2-system-overview)
- [3. High-Level Architecture Diagram](#3-high-level-architecture-diagram)
- [4. Directory / Module Map](#4-directory--module-map)
- [5. Component Interaction Matrix](#5-component-interaction-matrix)
- [6. Backend API Surface](#6-backend-api-surface)
- [7. Frontend Route/Page Map](#7-frontend-routepage-map)
- [8. End-to-End Request Lifecycle](#8-end-to-end-request-lifecycle)
- [9. OAuth/Auth and Session Lifecycle](#9-oauthauth-and-session-lifecycle)
- [10. AI/Agent Workflow](#10-aiagent-workflow)
- [11. Database Architecture](#11-database-architecture)
- [12. Error Handling, Logging, and Background Processing](#12-error-handling-logging-and-background-processing)
- [13. API Contract Summary (Major Shapes)](#13-api-contract-summary-major-shapes)
- [14. Configuration Matrix](#14-configuration-matrix)
- [15. Confirmed Gaps / Not Implemented](#15-confirmed-gaps--not-implemented)
- [16. Operational Notes and Constraints](#16-operational-notes-and-constraints)

---

## 1. Scope and Evidence

This document is based on repository code under:
- `frontend/` (Next.js app)
- `sage-backend/` (Flask API)

No behavior is documented unless visible in code.  
If a requested area is absent, it is explicitly marked **“Not implemented in current codebase.”**

---

## 2. System Overview

Sage is a two-tier web app:

1. **Frontend (Next.js, client-heavy pages)**  
   - Handles Google login initiation, stores JWT in `localStorage`, renders dashboard pages, and calls backend APIs.

2. **Backend (Flask + PyMongo + external APIs)**  
   - Provides OAuth, user/task/finance/streak/NLP endpoints.
   - Persists data in **MongoDB** collections (`users`, `tasks`, `expenses`, `streaks`).
   - Integrates with:
     - Google OAuth token endpoint + Google userinfo endpoint
     - Google Calendar API
     - Gmail API
     - Groq chat completions API
     - Google Gemini API

---

## 3. High-Level Architecture Diagram

```text
+------------------+            HTTPS             +---------------------------+
| Browser (Next.js)| ---------------------------> | Flask Backend (run.py)    |
| - app/* pages    | <--------------------------- | - Blueprints /auth,/api/* |
| - lib/api.ts     |   JSON + redirects + JWT     | - JWT auth middleware      |
+--------+---------+                               +-------------+-------------+
         |                                                       |
         | localStorage(sage_token)                              |
         |                                                       |
         |                                       +---------------+------------------+
         |                                       | MongoDB (PyMongo)               |
         |                                       | users / tasks / expenses /      |
         |                                       | streaks collections             |
         |                                       +---------------+------------------+
         |                                                       |
         |                                       +---------------+------------------+
         |                                       | External Services               |
         |                                       | - Google OAuth token/userinfo   |
         |                                       | - Google Calendar API           |
         |                                       | - Gmail API                     |
         |                                       | - Groq LLM API                 |
         |                                       | - Gemini API                    |
         |                                       +----------------------------------+
```

---

## 4. Directory / Module Map

## `frontend/`
- `app/page.tsx`: landing page, starts Google login (`/auth/google/login`).
- `app/auth/callback/page.tsx`: reads `token` query param, stores JWT, routes to dashboard.
- `app/dashboard/layout.tsx`: route guard via `localStorage` token + `/auth/me`; shell/navigation.
- `app/dashboard/page.tsx`: daily overview (briefing/tasks/expenses).
- `app/dashboard/command/page.tsx`: “Ask Sage” NLP + optional file/image upload.
- `app/dashboard/finance/page.tsx`: expense CRUD + summary.
- `app/dashboard/tasks/page.tsx`: task progress + streak submit/history.
- `app/dashboard/settings/page.tsx`: profile/settings updates + logout.
- `lib/api.ts`: all frontend-to-backend API calls and auth header injection.
- `lib/auth.ts`: token helpers in `localStorage`.

## `sage-backend/`
- `run.py`: app bootstrap, dev-mode `OAUTHLIB_INSECURE_TRANSPORT=1`.
- `app/__init__.py`: Flask app factory, CORS, Mongo init, blueprint registration, error handlers.
- `app/config.py`: env config for DB, OAuth, JWT, model names, frontend origin.
- `app/routes/*.py`: HTTP endpoints.
- `app/models/*.py`: DB operations per domain.
- `app/services/*.py`: Google, Groq, Gemini, NLP orchestration.
- `app/utils/auth_helpers.py`: JWT generation/validation and auth decorator.
- `app/utils/date_helpers.py`: natural date parsing and date utility checks.

---

## 5. Component Interaction Matrix

| Source | Target | Interface | Purpose |
|---|---|---|---|
| Frontend `lib/api.ts` | Flask routes | REST/JSON + Bearer JWT | App features (auth, tasks, finance, NLP, streak, briefing) |
| Flask auth routes | Google OAuth endpoints | HTTPS | Exchange code, fetch profile, refresh tokens |
| Flask services | Google Calendar API | Google client libs | Calendar read/create/delete and task sync |
| Flask services | Gmail API | Google client libs | Fetch recent emails and metadata |
| Flask services | Groq API | SDK (`groq`) | Parse text NLP + email action extraction |
| Flask services | Gemini API | `google.generativeai` | Daily briefing + image/PDF extraction |
| Flask models | MongoDB | PyMongo | CRUD for users/tasks/expenses/streaks |

---

## 6. Backend API Surface

Base: `http://localhost:5000` (default)

### 6.1 Core

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/health` | No | Health check `{status, app}` |

### 6.2 Auth (`/auth`)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/auth/google/login` | No | none | `{auth_url}` |
| GET | `/auth/callback` | No | query `code` | redirects to `{FRONTEND_URL}/auth/callback?token=<jwt>` |
| GET | `/auth/me` | Yes | Bearer JWT | user profile (tokens removed) |
| PATCH | `/auth/me` | Yes | `{notifications?, appearance?}` | updated user |
| POST | `/auth/logout` | Yes | none | `{message:"Logged out"}` (client clears token) |
| POST | `/auth/refresh-tokens` | Yes | none | `{success:true}` or error |

### 6.3 Tasks (`/api/tasks`)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/today` | Yes | none | `Task[]` |
| GET | `/upcoming?days=7` | Yes | query `days` | `{tomorrow:[], this_week:[], next_week:[]}` |
| POST | `/` | Yes | task payload | created task |
| PATCH | `/<task_id>/status` | Yes | `{status: completed\|pending\|overdue}` | `{success}` |
| DELETE | `/<task_id>` | Yes | none | `{success}` |
| POST | `/sync-calendar` | Yes | none | `{synced:<count>}` |

### 6.4 Finance (`/api/finance`)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/` | Yes | optional `category` | `{expenses, monthly_total, overdue_count, due_soon_count}` |
| POST | `/` | Yes | expense payload | created expense |
| PATCH | `/<expense_id>/pay` | Yes | none | `{success}` |
| PATCH | `/<expense_id>` | Yes | partial expense payload | updated expense or 404 |
| DELETE | `/<expense_id>` | Yes | none | `{success}` |
| GET | `/summary` | Yes | none | `{monthly_total, due_this_week, overdue_count, by_category}` |

### 6.5 NLP (`/api/nlp`)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/process` | Yes | `{input, image_base64?, mime_type?}` | `{success, action?, data?, message}` |
| GET | `/suggestions` | Yes | none | array of sample prompts |

### 6.6 Briefing (`/api/briefing`)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/daily` | **No** | optional `user_id` query | `{briefing, summary, action_items}` |
| GET | `/email-items` | **No** | `user_id` query expected | action items array |

### 6.7 Streak (`/api/streak`)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/` | Yes | none | `{current_streak, best_streak, ...}` |
| POST | `/submit` | Yes | `{tasks_total, tasks_completed}` | `{current_streak, best_streak, message}` |
| GET | `/history` | Yes | none | last 35-day history array |

---

## 7. Frontend Route/Page Map

| Route | File | Purpose | Backend APIs Called |
|---|---|---|---|
| `/` | `app/page.tsx` | Landing + start Google OAuth | `GET /auth/google/login` |
| `/auth/callback` | `app/auth/callback/page.tsx` | Save JWT from query string | none (reads URL, localStorage write) |
| `/dashboard` | `app/dashboard/page.tsx` | Briefing overview cards | `GET /api/briefing/daily`, `GET /api/tasks/today`, `GET /api/finance/` |
| `/dashboard/command` | `app/dashboard/command/page.tsx` | Ask Sage NLP + upload | `GET /api/nlp/suggestions`, `POST /api/nlp/process`, `GET tasks/finance` |
| `/dashboard/finance` | `app/dashboard/finance/page.tsx` | Expense management | finance GET/POST/PATCH/DELETE + summary |
| `/dashboard/tasks` | `app/dashboard/tasks/page.tsx` | Tasks + streak | tasks today/upcoming/status + streak GET/submit/history |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | Update settings | `/auth/me` GET/PATCH, `/auth/logout` |

`app/dashboard/layout.tsx` enforces client-side auth presence (`localStorage.sage_token`) and user fetch (`/auth/me`).

---

## 8. End-to-End Request Lifecycle

### 8.1 User Query Flow (Ask Sage)

```text
User enters text (+ optional file/image)
  -> Frontend `/dashboard/command` converts file to base64
  -> POST /api/nlp/process (Bearer JWT)
      -> require_auth validates JWT
      -> process_natural_language_input(...)
          -> if image: Gemini extract_data_from_image
          -> else: Groq extract_structured_data
          -> action switch:
              add_expense -> DB insert expense (+ optional task + optional calendar event)
              add_task/reminder -> DB insert task (+ optional calendar event)
              query -> fetch counts
      -> JSON result {success, action, data?, message}
  -> Frontend renders success/error card, refreshes task/expense lists
```

### 8.2 Standard Data Flow (Dashboard load)

```text
Page load /dashboard
  -> Promise.allSettled([
       GET /api/briefing/daily,
       GET /api/tasks/today,
       GET /api/finance/
     ])
  -> Backend route handlers -> model/service calls -> Mongo/external APIs
  -> JSON responses -> UI cards, lists, counters
```

---

## 9. OAuth/Auth and Session Lifecycle

### 9.1 OAuth Flow (implemented)

```text
Frontend click "Get Started"
  -> GET /auth/google/login
  <- auth_url (Google consent URL; no PKCE, no state parameter)
Browser redirects to Google
Google redirects to /auth/callback?code=...
  -> Backend exchanges code at https://oauth2.googleapis.com/token
  -> Backend fetches profile from https://www.googleapis.com/oauth2/v2/userinfo
  -> Upsert user in Mongo + store Google access/refresh tokens
  -> Backend creates JWT (HS256, exp from JWT_EXPIRY_HOURS)
  -> Redirect to frontend /auth/callback?token=<JWT>
Frontend stores token in localStorage and navigates /dashboard
```

### 9.2 JWT/session behavior
- JWT is stateless; validated on each protected endpoint by `require_auth`.
- Logout endpoint does **not** revoke token server-side; frontend removes local token.
- Token expiry enforced by JWT `exp` claim.

### 9.3 Auth/OAuth diagram

```text
+---------+       +----------+        +--------------------+        +---------+
| Browser | ----> | Backend  | -----> | Google OAuth Token | -----> | Google  |
|         | login | /auth/*  | code   | Endpoint           | token  | userinfo|
+----+----+       +----+-----+        +--------------------+        +----+----+
     ^                 |                                              |
     |                 v                                              |
     |        Mongo user create/update + Google tokens                |
     |                 |                                              |
     +------ redirect frontend ?token=<JWT> <-------------------------+
```

---

## 10. AI/Agent Workflow

## 10.1 Current orchestration logic (confirmed)

- **Text NLP path**: Groq (`groq_service.extract_structured_data`)
- **Image/PDF NLP path**: Gemini (`gemini_service.extract_data_from_image`)
- **Daily briefing path**: Gemini (`gemini_service.generate_daily_briefing`)
- **Email triage path**: Groq (`gmail_service.extract_action_items`)

No multi-model voting/ensemble; model choice is route/path-based.

### 10.2 AI invocation flow diagram

```text
Input to /api/nlp/process
   |
   +-- image_base64 present? -- yes --> Gemini document extraction
   |                                  -> parsed JSON action
   |
   +-- no -------------------------> Groq structured extraction
                                      -> parsed JSON action
                                             |
                                      action dispatcher
                                      (DB writes/reads + optional Google Calendar create)
                                             |
                                       response message (Groq templated helper)
```

### 10.3 Prompt construction (code templates)

1) **Groq structured parser** (`extract_structured_data`)  
- System prompt defines target JSON schema for:
  - `add_task`, `add_expense`, `add_reminder`, `query`, `other`
- Injects current date into prompt for relative date parsing.

2) **Gemini image extraction** (`extract_data_from_image`)  
- Sends:
  - Binary file part `{mime_type, data}` (decoded base64 bytes)
  - Prompt instructing return-only-JSON with `add_expense` or `add_task`.

3) **Gemini daily briefing** (`generate_daily_briefing`)  
- Single text prompt including:
  - user name, tasks, upcoming expenses, email action items, calendar events
  - style constraints (2–3 paragraphs, complete sentences, etc.)

4) **Groq email action extraction** (`gmail_service.extract_action_items`)  
- Prompt includes JSON dump of fetched emails and asks for actionable subset.

### 10.4 AI retries/fallbacks/streaming/output handling

- Retries: **Not implemented in current codebase** (no retry loop/backoff around LLM calls).
- Rate-limiting: Groq wrapper enforces minimum 5 seconds between calls (process-local).
- Fallbacks:
  - Daily briefing route falls back to static message if Gemini returns empty.
  - NLP parse failure returns structured failure JSON message.
- Streaming responses: **Not implemented in current codebase** (non-streaming request/response only).
- Output handling:
  - JSON fence stripping for model outputs wrapped in ```json fences.
  - `json.loads` parse with broad exception handling.

---

## 11. Database Architecture

## 11.1 Engine and connection lifecycle
- Engine: MongoDB via `pymongo`.
- Initialization: `app.__init__.py:init_mongo` from `MONGO_URI`.
- DB handle stored on `app.db` and accessed via `get_db()`.
- TLS CA configured using `certifi`.

## 11.2 Collections and effective schema

### `users`
- Core fields: `email`, `name`, `avatar`
- OAuth fields: `google_access_token`, `google_refresh_token`, `google_token_expiry`
- Preferences: `timezone`, `currency`, `briefing_time`, `notifications`, `appearance?`
- Timestamps: `created_at`, `updated_at`

### `tasks`
- `user_id` (string), `title`, `note`, `due_date`, `due_time`
- `category`, `status` (`pending|completed|overdue`)
- `source` (`manual|nlp|google_calendar`)
- `google_event_id`, `created_at`, optional `completed_at`

### `expenses`
- `user_id` (string), `name`, `amount`, `currency`, `due_date`
- `category`, `status` (`upcoming|due_soon|overdue|paid`)
- recurrence fields, notes, timestamps

### `streaks`
- `user_id`, `current_streak`, `best_streak`, `last_submitted_date`
- `history[]` with daily progress entries

## 11.3 Relations
- Logical relation via `user_id` string in tasks/expenses/streaks -> users `_id`.
- No explicit DB-level foreign key enforcement (Mongo model).

## 11.4 Migrations / initialization
- Automated migrations: **Not implemented in current codebase**.
- Collections are created implicitly on first write.

## 11.5 Key query/update patterns
- Task/expense status auto-updates via bulk `update_many` in request handlers.
- Monthly finance total via Mongo aggregation pipeline (`$match` + `$group`).
- Streak submission uses upsert and in-document history array update.

## 11.6 Transaction boundaries
- Multi-document ACID transactions: **Not implemented in current codebase**.
- Operations are independent inserts/updates per request.

### DB read/write flow diagram

```text
HTTP request (authenticated)
  -> route handler
     -> model function
        -> Mongo query/update/aggregate
     -> serialize_document(ObjectId/datetime -> string/isoformat)
  <- JSON response
```

---

## 12. Error Handling, Logging, and Background Processing

## 12.1 Error handling
- Global Flask handlers:
  - 404 -> `{"error":"Not found"}`
  - 500 -> `{"error":"Internal server error"}`
  - 401 -> `{"error":"Unauthorized"}`
- Route-level validation:
  - Missing auth header/token errors in `require_auth`
  - Input checks in NLP/auth routes
- Many service/model calls wrap broad exceptions and return defaults (`None`, `[]`, or 400 error).

## 12.2 Logging / observability
- Flask app logger writes to:
  - `sage_server.log`
  - stdout/stderr stream
- Service-level debug logs append to:
  - `groq_debug.log`
  - `gemini_debug.log`
  - `gmail_debug.log`
- No centralized tracing/metrics stack in code.

## 12.3 Background jobs / workers
- Dedicated queue/worker system: **Not implemented in current codebase**.
- All work is synchronous in request lifecycle (including AI and Google API calls).

---

## 13. API Contract Summary (Major Shapes)

### 13.1 NLP process request
```json
{
  "input": "Netflix is due tomorrow, ₹649",
  "image_base64": "optional-base64-without-data-prefix",
  "mime_type": "image/jpeg"
}
```

### 13.2 NLP process response
```json
{
  "success": true,
  "action": "add_expense",
  "data": { "_id": "...", "name": "Netflix", "amount": 649, "due_date": "..." },
  "message": "Got it! I've added Netflix..."
}
```

### 13.3 Daily briefing response
```json
{
  "briefing": "Good morning ...",
  "summary": {
    "tasks_count": 0,
    "events_count": 0,
    "bills_count": 0,
    "bills_total": 0,
    "action_items_count": 0
  },
  "action_items": []
}
```

### 13.4 Finance summary response
```json
{
  "monthly_total": 0,
  "due_this_week": { "count": 0, "amount": 0 },
  "overdue_count": 0,
  "by_category": { "bill": 0 }
}
```

---

## 14. Configuration Matrix

| Env Var | Used By | Purpose | Required |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | frontend `lib/api.ts` | Backend base URL | Yes (or defaults to localhost) |
| `MONGO_URI` | backend config/init | MongoDB connection | Yes for persistent app behavior |
| `GROQ_API_KEY` | `groq_service` | Groq API auth | Required for text NLP/email extraction |
| `GROQ_MODEL` | `groq_service` | Groq model name | Optional (default provided) |
| `GEMINI_API_KEY` | `gemini_service` | Gemini API auth | Required for briefing/image extraction |
| `GEMINI_MODEL` | `gemini_service` | Gemini model for `call_gemini` | Optional (default provided) |
| `GOOGLE_CLIENT_ID` | auth/google services | OAuth client ID | Required for OAuth/refresh/calendar |
| `GOOGLE_CLIENT_SECRET` | auth/google services | OAuth client secret | Required for OAuth/refresh/calendar |
| `GOOGLE_REDIRECT_URI` | auth route | OAuth callback URI | Required in Google console and backend |
| `JWT_SECRET_KEY` | auth helpers | JWT signing/verifying | Required for secure auth |
| `FRONTEND_URL` | CORS + OAuth redirect | allowed origin + callback target | Required for deployment correctness |
| `FLASK_ENV` | run/config | dev behavior (incl insecure transport toggle) | Optional |

---

## 15. Confirmed Gaps / Not Implemented

- Database migrations/versioning: **Not implemented in current codebase**
- Server-side token/session revocation/blacklist: **Not implemented in current codebase**
- OAuth PKCE + state validation: **Not implemented in current codebase**
- AI streaming responses: **Not implemented in current codebase**
- Async workers/queues/schedulers: **Not implemented in current codebase**
- Formal observability stack (metrics/tracing): **Not implemented in current codebase**

---

## 16. Operational Notes and Constraints

## 16.1 Security handling (code-confirmed)
- JWT read from `Authorization: Bearer ...`.
- Google access/refresh tokens stored in `users` collection.
- CORS origin constrained to `FRONTEND_URL`.
- Sensitive credentials loaded from env vars via `Config`.

## 16.2 Security risks/gaps (code-confirmed observations)
- OAuth start/callback flow is stateless and omits PKCE/state checks (explicit comment in code); increases CSRF/code-injection risk.
- `/api/briefing/daily` and `/api/briefing/email-items` are unauthenticated.
- JWT token persisted in `localStorage` (XSS exposure risk if frontend compromised).
- No file size/type validation before base64 upload to NLP endpoint.
- Debug logs may capture model outputs/email metadata to local files.

## 16.3 Confirmed vs inferred behavior

**Confirmed from code**
- All route paths/methods/auth decorators and model/service call chains listed above.
- MongoDB as primary runtime DB (via PyMongo in app factory and models).
- External service call targets and prompt templates in service modules.

**Inferred (minimal, from naming/UI text only)**
- UI label intent (e.g., “Delete Account”) is present, but destructive backend endpoint is not implemented.

