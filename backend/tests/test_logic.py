def test_ping_endpoint_processes_message(client):
    """
    Verifies that the /ping endpoint correctly applies business logic 
    (uppercase conversion) and returns the mocked database ID.
    """
    response = client.get("/ping?message=hello%20pytest")
    
    assert response.status_code == 200
    
    data = response.json()
    assert data["message"] == "HELLO PYTEST"
    assert data["id"] == "mock_doc_id"
    assert "timestamp" in data
