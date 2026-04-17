import time
import requests
import traceback
from app import create_app, get_db
from app.services.telegram_handler import handle_update
from app.services.telegram_service import get_bot_token

def main():
    app = create_app()
    with app.app_context():
        token = get_bot_token()
        if not token:
            print("ERROR: TELEGRAM_BOT_TOKEN not found in config.")
            return

        base_url = f"https://api.telegram.org/bot{token}"
        
        # We must delete the webhook before getUpdates will work
        print("Deleting existing webhook...")
        requests.get(f"{base_url}/deleteWebhook")
        
        print("Bot is now polling for updates... (Press Ctrl+C to stop)")
        offset = None
        while True:
            try:
                params = {"timeout": 10, "allowed_updates": ["message", "callback_query"]}
                if offset is not None:
                    params["offset"] = offset
                    
                resp = requests.get(f"{base_url}/getUpdates", params=params, timeout=15)
                data = resp.json()
                
                if data.get("ok"):
                    for update in data.get("result", []):
                        print(f"[Telegram] Processing update ID: {update.get('update_id')}")
                        try:
                            handle_update(update)
                        except Exception as e:
                            print(f"[Telegram] Error processing update: {e}")
                            traceback.print_exc()
                        offset = update["update_id"] + 1
                else:
                    print(f"Telegram API Error: {data}")
            except requests.exceptions.RequestException as e:
                print(f"[Network Error] {e}")
                time.sleep(2)
            except Exception as e:
                print(f"[Error] {e}")
                time.sleep(2)

if __name__ == "__main__":
    main()
