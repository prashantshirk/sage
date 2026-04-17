from flask import Flask, jsonify, current_app
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.uri_parser import parse_uri
import certifi

from .config import Config

mongo_client = None

def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    # Configure logging
    import logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[
            logging.FileHandler("sage_server.log"),
            logging.StreamHandler()
        ]
    )
    app.logger.info("Sage Backend Starting...")

    CORS(
        app,
        resources={r"/*": {"origins": [app.config["FRONTEND_URL"]]}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"]
    )

    init_mongo(app)
    register_blueprints(app)

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "app": "Sage Backend"}), 200

    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal server error"}), 500

    @app.errorhandler(401)
    def unauthorized_error(error):
        return jsonify({"error": "Unauthorized"}), 401

    return app


def init_mongo(app: Flask) -> None:
    global mongo_client

    mongo_uri = app.config.get("MONGO_URI")
    if not mongo_uri:
        app.db = None
        return

    mongo_client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
    parsed = parse_uri(mongo_uri)
    db_name = parsed.get("database") or "sage"
    app.db = mongo_client[db_name]


def get_db():
    return current_app.db


def register_blueprints(app: Flask) -> None:
    from .routes.auth import auth_bp
    from .routes.tasks import tasks_bp
    from .routes.finance import finance_bp
    from .routes.briefing import briefing_bp
    from .routes.nlp import nlp_bp
    from .routes.streak import streak_bp
    from .routes.search import search_bp
    from .routes.telegram import telegram_bp

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(tasks_bp, url_prefix="/api/tasks")
    app.register_blueprint(finance_bp, url_prefix="/api/finance")
    app.register_blueprint(briefing_bp, url_prefix="/api/briefing")
    app.register_blueprint(nlp_bp, url_prefix="/api/nlp")
    app.register_blueprint(streak_bp, url_prefix="/api/streak")
    app.register_blueprint(search_bp, url_prefix="/api/search")
    app.register_blueprint(telegram_bp)
