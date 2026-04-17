from app import create_app, get_db

app = create_app()
with app.app_context():
    db = get_db()
    user = db.users.find_one()
    if user:
        print("access:", user.get("google_access_token") is not None)
        print("refresh:", user.get("google_refresh_token") is not None)
        print("expiry:", user.get("google_token_expiry"))
    else:
        print("No users")
