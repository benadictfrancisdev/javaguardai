from unittest.mock import AsyncMock, patch


VALID_HEADERS = {"X-API-Key": "test-api-key"}


def test_ingest_error_missing_api_key(client):
    resp = client.post("/error", json={"error": "NPE", "service": "svc"})
    assert resp.status_code == 422 or resp.status_code == 401


def test_ingest_error_invalid_api_key(client):
    resp = client.post(
        "/error",
        json={"error": "NPE", "service": "svc"},
        headers={"X-API-Key": "wrong-key"},
    )
    assert resp.status_code == 401


@patch(
    "routers.errors.analyse_error",
    new_callable=AsyncMock,
    return_value={
        "root_cause": "NullPointerException in Service.process()",
        "why": "Null reference passed to method",
        "fix_steps": "1. Add null check",
        "code_fix": "if (obj != null) { obj.process(); }",
    },
)
def test_ingest_error_success(mock_ai, client):
    payload = {
        "error": "java.lang.NullPointerException at com.example.Service.process(Service.java:42)",
        "service": "payment-service",
    }
    resp = client.post("/error", json=payload, headers=VALID_HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert data["duplicate"] is False
    assert data["analysis"]["root_cause"] != ""
    assert "hash" in data


@patch(
    "routers.errors.analyse_error",
    new_callable=AsyncMock,
    return_value={
        "root_cause": "NullPointerException",
        "why": "Null ref",
        "fix_steps": "1. Fix",
        "code_fix": "",
    },
)
def test_ingest_duplicate_error(mock_ai, client):
    payload = {
        "error": "java.lang.NullPointerException at com.example.Service.process(Service.java:42)",
        "service": "payment-service",
    }
    # First call
    resp1 = client.post("/error", json=payload, headers=VALID_HEADERS)
    assert resp1.status_code == 200
    assert resp1.json()["duplicate"] is False

    # Second call — same error text, should be duplicate
    resp2 = client.post("/error", json=payload, headers=VALID_HEADERS)
    assert resp2.status_code == 200
    assert resp2.json()["duplicate"] is True


def test_get_error_not_found(client):
    resp = client.get("/errors/99999")
    assert resp.status_code == 404


@patch(
    "routers.errors.analyse_error",
    new_callable=AsyncMock,
    return_value={
        "root_cause": "OOM",
        "why": "Heap exhausted",
        "fix_steps": "1. Increase heap",
        "code_fix": "",
    },
)
def test_get_error_by_id(mock_ai, client):
    # Create an error first
    payload = {
        "error": "java.lang.OutOfMemoryError: Java heap space",
        "service": "data-service",
    }
    create_resp = client.post("/error", json=payload, headers=VALID_HEADERS)
    error_id = create_resp.json()["id"]

    # Fetch it
    resp = client.get(f"/errors/{error_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == error_id
    assert data["service_name"] == "data-service"
    assert data["analysis"]["root_cause"] == "OOM"
