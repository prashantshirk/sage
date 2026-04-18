"""
Backend integration test script for Sage.
Tests: auth routes, Gemini model validity, NLP text/audio processing, fallback logic.
Run from: sage-backend directory with the venv active.
"""
import sys
import os
import json
import base64
import time
import requests
import jwt
from datetime import datetime, timedelta, timezone

BASE_URL = "http://localhost:5000"
JWT_SECRET = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"

# ── Helpers ────────────────────────────────────────────────────────────────────

def make_token(user_id="test_user_001", email="test@sage.local"):
    """Generate a valid JWT for testing protected endpoints."""
    payload = {
        "user_id": user_id,
        "email": email,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def auth_headers():
    return {"Authorization": f"Bearer {make_token()}"}

def ok(label):
    print(f"  [OK] {label}")

def fail(label, detail=""):
    print(f"  [FAIL] {label}" + (f" -- {detail}" if detail else ""))

def section(title):
    print(f"\n" + "-"*60)
    print(f"  {title}")
    print("-"*60)

# ── Tests ──────────────────────────────────────────────────────────────────────

def test_server_alive():
    section("1. Server reachability")
    try:
        r = requests.get(f"{BASE_URL}/auth/google/login", timeout=5)
        ok(f"Server responded: HTTP {r.status_code}")
        return True
    except Exception as e:
        fail("Server not reachable", str(e))
        return False


def test_suggestions():
    section("2. NLP Suggestions (no auth needed? let's check)")
    try:
        r = requests.get(f"{BASE_URL}/api/nlp/suggestions", timeout=5)
        if r.status_code == 200:
            ok(f"Suggestions returned {len(r.json())} items")
        elif r.status_code == 401:
            # Try with auth
            r2 = requests.get(f"{BASE_URL}/api/nlp/suggestions", headers=auth_headers(), timeout=5)
            if r2.status_code == 200:
                ok(f"Suggestions (with auth) returned {len(r2.json())} items")
            else:
                fail(f"Suggestions with auth: HTTP {r2.status_code}", r2.text[:200])
        else:
            fail(f"HTTP {r.status_code}", r.text[:200])
    except Exception as e:
        fail("Request error", str(e))


def test_gemini_models():
    section("3. Gemini model availability check (direct SDK call)")
    try:
        sys.path.insert(0, os.path.abspath("."))
        from dotenv import load_dotenv
        load_dotenv()

        import google.generativeai as genai
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            fail("GEMINI_API_KEY not set")
            return

        genai.configure(api_key=api_key)

        models_to_test = [
            "gemini-3.1-flash-lite-preview",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash",          # known-good fallback
            "gemini-1.5-flash",           # known-good fallback
        ]

        for model_name in models_to_test:
            try:
                model = genai.GenerativeModel(model_name)
                r = model.generate_content(
                    "Reply with just the word: PONG",
                    request_options={"timeout": 30},
                )
                ok(f"{model_name} -> '{r.text.strip()[:40]}'")
            except Exception as e:
                fail(f"{model_name}", str(e)[:120])

    except Exception as e:
        fail("SDK import/config error", str(e))


def test_nlp_text():
    section("4. NLP /api/nlp/process — text input")
    payload = {"input": "Netflix bill due tomorrow ₹649"}
    try:
        r = requests.post(
            f"{BASE_URL}/api/nlp/process",
            json=payload,
            headers=auth_headers(),
            timeout=60,
        )
        if r.status_code == 200:
            data = r.json()
            if data.get("success"):
                ok(f"action={data.get('action')} | message={data.get('message','')[:60]}")
            else:
                fail(f"success=False", data.get("message", ""))
        else:
            fail(f"HTTP {r.status_code}", r.text[:300])
    except requests.exceptions.Timeout:
        fail("Request timed out after 60s")
    except Exception as e:
        fail("Request error", str(e))


def test_nlp_audio():
    section("5. NLP /api/nlp/process — audio (synthetic silent webm)")
    # Minimal valid webm header (won't actually be parseable audio — tests the
    # route, payload delivery, and Gemini error handling gracefully)
    tiny_webm = (
        b'\x1a\x45\xdf\xa3\x9f\x42\x86\x81\x01\x42\xf7\x81\x01\x42\xf2\x81\x04'
        b'\x42\xf3\x81\x08\x42\x82\x84webm\x42\x87\x81\x04\x42\x85\x81\x02'
    )
    audio_b64 = base64.b64encode(tiny_webm).decode()

    payload = {
        "audio_base64": audio_b64,
        "audio_mime_type": "audio/webm",
        "input": "add task: test reminder tomorrow",
    }
    try:
        start = time.time()
        r = requests.post(
            f"{BASE_URL}/api/nlp/process",
            json=payload,
            headers=auth_headers(),
            timeout=120,
        )
        elapsed = time.time() - start
        if r.status_code in (200, 400):
            data = r.json()
            ok(f"Route responded in {elapsed:.1f}s | success={data.get('success')} | msg={data.get('message','')[:80]}")
        elif r.status_code == 500:
            fail(f"HTTP 500 after {elapsed:.1f}s — worker crashed or timed out", r.text[:200])
        else:
            fail(f"HTTP {r.status_code} after {elapsed:.1f}s", r.text[:200])
    except requests.exceptions.Timeout:
        fail("Request timed out after 120s — gunicorn still killing worker")
    except Exception as e:
        fail("Request error", str(e))


def test_auth_me():
    section("6. /auth/me — token validation round-trip")
    try:
        r = requests.get(f"{BASE_URL}/auth/me", headers=auth_headers(), timeout=5)
        if r.status_code == 200:
            ok(f"Token accepted, user: {r.json()}")
        elif r.status_code == 404:
            ok(f"Token valid but user not in DB (expected for test token) — HTTP 404")
        else:
            fail(f"HTTP {r.status_code}", r.text[:200])
    except Exception as e:
        fail("Request error", str(e))


# ── Main ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  SAGE BACKEND TEST SUITE")
    print("="*60)

    alive = test_server_alive()
    if not alive:
        print("\nBackend is not running. Start it with: python run.py")
        sys.exit(1)

    test_auth_me()
    test_suggestions()
    test_gemini_models()   # Direct SDK — most informative
    test_nlp_text()
    test_nlp_audio()

    print("\n" + "="*60)
    print("  Test run complete.")
    print("="*60 + "\n")
