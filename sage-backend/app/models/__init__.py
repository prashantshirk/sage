from datetime import date, datetime
from bson import ObjectId

from app import get_db


def get_collection(name: str):
    db = get_db()
    if db is None:
        raise RuntimeError("MongoDB is not configured. Set MONGO_URI in .env.")
    return db[name]


def serialize_document(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, list):
        return [serialize_document(item) for item in value]
    if isinstance(value, dict):
        return {key: serialize_document(item) for key, item in value.items()}
    return value
