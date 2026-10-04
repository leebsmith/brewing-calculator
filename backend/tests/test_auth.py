from unittest.mock import patch
import firebase_admin.auth
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db

def test_unauthenticated_request_fails(unauthenticated_client):
    """
    Verifies that requests without an Authorization header return 401 Unauthorized.
    """
    response = unauthenticated_client.get("/api/ping")
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing authentication credentials"

def test_invalid_bearer_token_fails(unauthenticated_client):
    """
    Verifies that requests with an invalid Bearer token return 401 Unauthorized.
    """
    with patch(
        "firebase_admin.auth.verify_id_token",
        side_effect=firebase_admin.auth.InvalidIdTokenError("Invalid token")
    ):
        response = unauthenticated_client.get(
            "/api/ping",
            headers={"Authorization": "Bearer invalid_or_expired_jwt"}
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid or expired authentication token"

def test_expired_bearer_token_fails(unauthenticated_client):
    """
    Verifies that expired Bearer tokens return 401 Unauthorized.
    """
    with patch(
        "firebase_admin.auth.verify_id_token",
        side_effect=firebase_admin.auth.ExpiredIdTokenError("Token expired", "cause")
    ):
        response = unauthenticated_client.get(
            "/api/ping",
            headers={"Authorization": "Bearer expired_jwt"}
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid or expired authentication token"

def test_token_missing_uid_fails(unauthenticated_client):
    """
    Verifies that a token payload lacking the mandatory 'uid' claim returns 401.
    """
    mock_claims = {
        "email": "no_uid@example.com",
        "name": "No Uid",
    }
    with patch("firebase_admin.auth.verify_id_token", return_value=mock_claims):
        response = unauthenticated_client.get(
            "/api/ping",
            headers={"Authorization": "Bearer token_without_uid"}
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid authentication token: missing uid"

def test_auth_infrastructure_failure_returns_500(unauthenticated_client):
    """
    Verifies that server/SDK infrastructure errors (like uninitialized Firebase app)
    return 500 Internal Server Error instead of 401 Unauthorized.
    """
    with patch(
        "firebase_admin.auth.verify_id_token",
        side_effect=ValueError("The default Firebase app does not exist.")
    ):
        response = unauthenticated_client.get(
            "/api/ping",
            headers={"Authorization": "Bearer any_token"}
        )
        assert response.status_code == 500
        assert response.json()["detail"] == "Authentication service unavailable"

def test_auth_connection_failure_returns_500(unauthenticated_client):
    """
    Verifies that unexpected transport/network connection failures return 500.
    """
    with patch(
        "firebase_admin.auth.verify_id_token",
        side_effect=ConnectionError("Failed to reach emulator")
    ):
        response = unauthenticated_client.get(
            "/api/ping",
            headers={"Authorization": "Bearer any_token"}
        )
        assert response.status_code == 500
        assert response.json()["detail"] == "Authentication service unavailable"

def test_valid_bearer_token_succeeds(unauthenticated_client):
    """
    Verifies that requests with a valid Bearer token are properly decoded
    and execute successfully.
    """
    mock_claims = {
        "uid": "verified_uid_456",
        "email": "alice@example.com",
        "name": "Alice Example",
        "picture": "https://example.com/alice.png"
    }
    with patch("firebase_admin.auth.verify_id_token", return_value=mock_claims):
        response = unauthenticated_client.get(
            "/api/ping?message=auth%20verified",
            headers={"Authorization": "Bearer valid_jwt_token"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "AUTH VERIFIED"
        assert data["user_id"] == "verified_uid_456"

def test_minimal_token_claims_succeeds(unauthenticated_client):
    """
    Verifies that anonymous or phone users lacking optional email/name/picture
    claims are accepted and deserialized cleanly without error.
    """
    mock_claims = {"uid": "anon_user_999"}
    with patch("firebase_admin.auth.verify_id_token", return_value=mock_claims):
        response = unauthenticated_client.get(
            "/api/ping?message=anon%20user",
            headers={"Authorization": "Bearer anon_jwt_token"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "ANON USER"
        assert data["user_id"] == "anon_user_999"

def test_fastapi_lifespan_initializes_firebase(mock_db):
    """
    Verifies that launching the FastAPI application through its lifespan
    executes init_firebase() automatically.
    """
    app.dependency_overrides[get_db] = lambda: mock_db
    with patch("app.main.init_firebase") as mock_init:
        with TestClient(app) as test_client:
            mock_init.assert_called_once()
            # Perform a request to ensure app is fully operational
            test_client.get("/api/ping")
    app.dependency_overrides.clear()
