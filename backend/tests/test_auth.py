from unittest.mock import patch

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
    with patch("firebase_admin.auth.verify_id_token", side_effect=Exception("Invalid token")):
        response = unauthenticated_client.get(
            "/api/ping",
            headers={"Authorization": "Bearer invalid_or_expired_jwt"}
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid or expired authentication token"

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
