"""
app/routes/telegram.py
───────────────────────
Flask Blueprint that exposes three routes:

  POST /telegram/webhook       — Telegram push endpoint (must return 200 always)
  POST /telegram/set-webhook   — Register the webhook URL with Telegram
  GET  /telegram/status        — Check whether the bot token is configured
"""

import traceback
from flask import Blueprint, request, jsonify, current_app

from app.services.telegram_service import set_webhook
from app.services.telegram_handler import handle_update

telegram_bp = Blueprint("telegram", __name__)


# ── POST /telegram/webhook ────────────────────────────────────────────────────

@telegram_bp.route("/telegram/webhook", methods=["POST"])
def webhook():
    """
    Telegram pushes every update here.

    Security: Telegram sets the X-Telegram-Bot-Api-Secret-Token header to the
    value we configured in set_webhook. We reject requests that don't match —
    unless no secret has been configured (dev mode).

    IMPORTANT: We ALWAYS return {"ok": True} 200 even on errors, because if we
    return a non-200 Telegram will keep retrying the same update indefinitely.
    """
    # ── secret token verification ──────────────────────────────────────────
    expected_secret = current_app.config.get("TELEGRAM_WEBHOOK_SECRET", "")
    incoming_secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")

    if expected_secret and incoming_secret != expected_secret:
        current_app.logger.warning(
            "[Telegram] Webhook rejected — secret token mismatch"
        )
        return jsonify({"ok": False, "error": "Forbidden"}), 403

    # ── parse & dispatch ───────────────────────────────────────────────────
    update = request.get_json(silent=True) or {}

    try:
        handle_update(update)
    except Exception as e:
        # Log but never let the exception bubble up — Telegram must get 200
        current_app.logger.error(
            f"[Telegram] handle_update error: {e}\n{traceback.format_exc()}"
        )

    # Telegram requires this exact 200 response no matter what happened above
    return jsonify({"ok": True}), 200


# ── POST /telegram/set-webhook ────────────────────────────────────────────────

@telegram_bp.route("/telegram/set-webhook", methods=["POST"])
def register_webhook():
    """
    Register (or update) the webhook URL with Telegram.

    Body JSON: { "webhook_url": "https://yourdomain.com/telegram/webhook" }
    """
    data = request.get_json(silent=True) or {}
    webhook_url = data.get("webhook_url", "").strip()

    if not webhook_url:
        return jsonify({"ok": False, "error": "webhook_url is required"}), 400

    result = set_webhook(webhook_url)
    return jsonify(result), 200


# ── GET /telegram/status ──────────────────────────────────────────────────────

@telegram_bp.route("/telegram/status", methods=["GET"])
def status():
    """
    Quick health-check: is the bot token configured?
    Returns the first 10 characters of the token (safe to share).
    """
    token = current_app.config.get("TELEGRAM_BOT_TOKEN", "")
    configured = bool(token)

    return jsonify({
        "configured": configured,
        "token_preview": (token[:10] + "...") if configured else None,
    }), 200
