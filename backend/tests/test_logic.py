def test_ping_endpoint_processes_message_and_attaches_user(client):
    """
    Verifies that the /api/ping endpoint correctly applies business logic 
    (uppercase conversion), attaches authenticated user_id, and returns the mocked database ID.
    """
    response = client.get("/api/ping?message=hello%20pytest")
    
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "HELLO PYTEST"
    assert data["id"] == "mock_doc_id"
    assert data["user_id"] == "mock_user_123"
    assert "timestamp" in data

def test_ping_endpoint_legacy_path_alias(client):
    """
    Verifies that the legacy /ping endpoint alias also works seamlessly.
    """
    response = client.get("/ping?message=alias%20test")
    
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "ALIAS TEST"
    assert data["user_id"] == "mock_user_123"


def test_fermentables_endpoint(client):
    """
    Verifies that /api/fermentables returns valid malts and sugars catalogs.
    """
    response = client.get("/api/fermentables")
    assert response.status_code == 200
    data = response.json()
    assert "malts" in data
    assert "sugars" in data
    assert len(data["malts"]) >= 100
    assert len(data["sugars"]) >= 15

