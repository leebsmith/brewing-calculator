import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from app.main import app
from app.database import get_db
from app.auth import get_current_user
from app.schemas.models import AuthenticatedUser

@pytest.fixture
def mock_db():
    """Builds a mock Firestore client with a predictable document ID."""
    mock = MagicMock()
    # Mock the chain: db.collection("pings").document().id
    mock.collection.return_value.document.return_value.id = "mock_doc_id"
    return mock

@pytest.fixture
def mock_user():
    """Returns a mock AuthenticatedUser object for offline tests."""
    return AuthenticatedUser(
        uid="mock_user_123",
        email="user@example.com",
        name="Mock User",
        picture="https://example.com/avatar.png"
    )

@pytest.fixture
def client(mock_db, mock_user):
    """Yields an authenticated TestClient with both database and auth overridden, executing lifespan."""
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()

@pytest.fixture
def unauthenticated_client(mock_db):
    """Yields a TestClient with only database overridden, preserving real auth dependency and executing lifespan."""
    app.dependency_overrides[get_db] = lambda: mock_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()

