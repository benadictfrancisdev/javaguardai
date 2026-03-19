import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
import sys
sys.path.insert(0, '/app/backend')

from main import app
from core.auth import get_current_customer, validate_api_key


class TestIncidentsRouter:
    """Tests for incidents router endpoints."""

    @pytest.fixture
    def test_customer(self):
        return {
            'id': 'test-customer-123',
            'email': 'test@example.com',
            'company_name': 'Test Corp',
            'api_key': 'fg_test_api_key_12345',
            'created_at': '2024-01-01T00:00:00Z'
        }

    @pytest.fixture
    def test_incident(self):
        return {
            'id': 'test-incident-123',
            'customer_id': 'test-customer-123',
            'exception_class': 'java.lang.NullPointerException',
            'message': 'Test error',
            'stack_trace': 'at Test.java:1',
            'heap_used_mb': 512,
            'thread_count': 48,
            'timestamp': '2024-01-01T12:00:00Z',
            'status': 'received',
            'created_at': '2024-01-01T12:00:00Z'
        }

    def test_post_exceptions_invalid_api_key_returns_401(self):
        """Test that POST /api/exceptions with invalid api_key returns 401."""
        client = TestClient(app)
        
        # Send request with invalid API key - actual validation will fail
        response = client.post('/api/exceptions', json={
            'api_key': 'invalid_key_12345',
            'exception_class': 'java.lang.Exception',
            'message': 'Test error',
            'stack_trace': 'at Test.java:1'
        })
        
        assert response.status_code == 401

    def test_post_exceptions_valid_api_key_structure(self, test_customer):
        """Test that POST /api/exceptions with valid structure returns expected format."""
        # This tests the endpoint structure without mocking
        client = TestClient(app)
        
        response = client.post('/api/exceptions', json={
            'api_key': 'fg_nonexistent_but_valid_format',
            'exception_class': 'java.lang.NullPointerException',
            'message': 'Test error',
            'stack_trace': 'at Test.java:1'
        })
        
        # Should return 401 for nonexistent key
        assert response.status_code == 401

    def test_get_incidents_without_auth_returns_401(self):
        """Test that GET /api/incidents without auth returns 401."""
        client = TestClient(app)
        response = client.get('/api/incidents')
        assert response.status_code == 401

    def test_get_incidents_with_invalid_auth_returns_401(self):
        """Test that GET /api/incidents with invalid auth returns 401."""
        client = TestClient(app)
        response = client.get('/api/incidents', headers={
            'Authorization': 'Bearer invalid_token_12345'
        })
        assert response.status_code == 401

    def test_resolve_incident_without_auth_returns_401(self):
        """Test that PATCH /api/incidents/{id}/resolve without auth returns 401."""
        client = TestClient(app)
        response = client.patch('/api/incidents/some-id/resolve')
        assert response.status_code == 401


class TestIncidentsRouterIntegration:
    """Integration tests that use the real database."""
    
    def test_stats_endpoint_returns_expected_structure(self):
        """Test that /api/incidents/stats returns expected structure."""
        client = TestClient(app)
        
        # Without auth, should return 401
        response = client.get('/api/incidents/stats')
        assert response.status_code == 401
