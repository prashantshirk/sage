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
    tasks = list(db.tasks.find().sort('created_at', -1).limit(2))
    print(json.dumps(tasks, cls=JSONEncoder, indent=2))
