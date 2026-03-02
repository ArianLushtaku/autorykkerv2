import json
import os

class RequisitionStore:
    """
    A simple file-based store for mapping a user_id to a GoCardless requisition_id.
    This is for demonstration purposes and is not suitable for production.
    """
    def __init__(self, file_path='requisition_store.json'):
        self.file_path = file_path
        self._data = self._load()

    def _load(self):
        if not os.path.exists(self.file_path):
            return {}
        with open(self.file_path, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {}

    def _save(self):
        with open(self.file_path, 'w') as f:
            json.dump(self._data, f, indent=4)

    def save(self, user_id, requisition_id):
        """Saves a requisition_id for a given user_id."""
        self._data[user_id] = requisition_id
        self._save()

    def get(self, user_id):
        """Retrieves the requisition_id for a given user_id."""
        return self._data.get(user_id)

    def delete(self, user_id):
        """Deletes the requisition_id for a given user_id."""
        if user_id in self._data:
            del self._data[user_id]
            self._save()
