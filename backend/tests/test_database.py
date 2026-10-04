import os
from unittest.mock import patch, MagicMock
from app.database import init_firebase, get_db

def test_init_firebase_defaults(monkeypatch):
    """Verifies init_firebase configures default emulator variables when missing."""
    monkeypatch.delenv("FIREBASE_AUTH_EMULATOR_HOST", raising=False)
    monkeypatch.delenv("FIRESTORE_EMULATOR_HOST", raising=False)
    
    with patch("firebase_admin.initialize_app") as mock_init, \
         patch("firebase_admin._apps", new={}):
        init_firebase()
        assert os.getenv("FIREBASE_AUTH_EMULATOR_HOST") == "127.0.0.1:9099"
        assert os.getenv("FIRESTORE_EMULATOR_HOST") == "127.0.0.1:8080"
        mock_init.assert_called_once()

def test_get_db_invokes_init_firebase():
    """Verifies get_db ensures firebase is initialized and returns firestore client."""
    with patch("app.database.init_firebase") as mock_init, \
         patch("firebase_admin.firestore.client", return_value=MagicMock()) as mock_client:
        db = get_db()
        mock_init.assert_called()
        assert db is not None
