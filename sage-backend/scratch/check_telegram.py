from app import create_app, get_db
from bson import ObjectId

app = create_app()
with app.app_context():
    db = get_db()
    user = db.users.find_one({"telegram_chat_id": {"$exists": True}})
    if user:
        print(f"User Found: {user.get('name')} (ID: {user['_id']})")
        print(f"Telegram Chat ID: {user.get('telegram_chat_id')}")
    else:
        print("No users found with a linked Telegram account.")
