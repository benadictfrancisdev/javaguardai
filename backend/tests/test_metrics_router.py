from unittest.mock import AsyncMock, patch


VALID_HEADERS = {"X-API-Key": "test-api-key"}


def test_dashboard_empty(client):
    """Dashboard should return zeroes when no errors exist."""
    resp = client.get("/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_errors"] == 0
    assert data["errors_by_service"] == []
    assert data["recent_errors"] == []


@patch(
    "routers.errors.analyse_error",
    new_callable=AsyncMock,
    return_value={
        "root_cause": "test",
        "why": "test",
        "fix_steps": "test",
        "code_fix": "",
    },
)
def test_dashboard_with_errors(mock_ai, client):
    """Dashboard should reflect ingested errors."""
    # Ingest two errors for different services
    client.post(
        "/error",
        json={"error": "NPE at Service.java:1", "service": "svc-a"},
        headers=VALID_HEADERS,
    )
    client.post(
        "/error",
        json={"error": "OOM at Worker.java:5", "service": "svc-b"},
        headers=VALID_HEADERS,
    )

    resp = client.get("/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_errors"] == 2
    assert len(data["errors_by_service"]) == 2
    assert len(data["recent_errors"]) == 2
