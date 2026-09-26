import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from app.main import app
from app.database import get_db

@pytest.fixture
def mock_db():
    """Builds a mock Firestore client with a predictable document ID."""
    mock = MagicMock()
    # Mock the chain: db.collection("pings").document().id
    mock.collection.return_value.document.return_value.id = "mock_doc_id"
    return mock

@pytest.fixture
def client(mock_db):
    """Yields a TestClient with the database dependency overridden."""
    # Swap the real get_db for our mock
    app.dependency_overrides[get_db] = lambda: mock_db
    
    yield TestClient(app)
    
    # Clean up overrides after the test completes
    app.dependency_overrides.clear()
