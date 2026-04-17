from app import create_app, get_db
import json
from bson import ObjectId

class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if hasattr(o, "isoformat"):
            return o.isoformat()
        return super().default(o)

app = create_app()
with app.app_context():
    db = get_db()
    task = db.tasks.find_one({"title": {"$regex": "meeting", "$options": "i"}})
    print(json.dumps(task, cls=JSONEncoder, indent=2))
