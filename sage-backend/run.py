import os
from app import create_app

# Allow OAuth over HTTP in local development only
# NEVER set this in production
if os.environ.get("FLASK_ENV", "development") == "development":
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

app = create_app()

if __name__ == "__main__":
    debug_mode = app.config.get("FLASK_ENV", "development") == "development"
    app.run(host="0.0.0.0", port=5000, debug=debug_mode)
