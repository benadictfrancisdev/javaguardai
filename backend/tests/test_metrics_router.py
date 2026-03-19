import pytest
from fastapi.testclient import TestClient
import sys
sys.path.insert(0, '/app/backend')

from main import app


class TestMetricsRouter:
    """Tests for metrics router endpoints."""

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
    def test_metrics(self):
        return {
            'id': 'test-metrics-123',
            'customer_id': 'test-customer-123',
            'heap_used_mb': 512,
            'heap_max_mb': 1024,
            'thread_count': 48,
            'gc_count': 100,
            'jvm_uptime_ms': 3600000,
            'timestamp': '2024-01-01T12:00:00Z',
            'created_at': '2024-01-01T12:00:00Z'
        }

    def test_post_metrics_invalid_api_key_returns_401(self):
        """Test that POST /api/metrics with invalid api_key returns 401."""
        client = TestClient(app)
        
        response = client.post('/api/metrics', json={
            'api_key': 'invalid_api_key',
            'heap_used_mb': 512,
            'heap_max_mb': 1024,
            'thread_count': 48,
            'gc_count': 100,
            'jvm_uptime_ms': 3600000
        })
        
        assert response.status_code == 401

    def test_post_metrics_requires_api_key(self):
        """Test that POST /api/metrics requires api_key field."""
        client = TestClient(app)
        
        response = client.post('/api/metrics', json={
            'heap_used_mb': 512,
            'heap_max_mb': 1024,
            'thread_count': 48
        })
        
        # Should return 422 for missing required field
        assert response.status_code == 422

    def test_get_metrics_latest_without_auth_returns_401(self):
        """Test that GET /api/metrics/latest without auth returns 401."""
        client = TestClient(app)
        response = client.get('/api/metrics/latest')
        assert response.status_code == 401

    def test_get_metrics_latest_with_invalid_auth_returns_401(self):
        """Test that GET /api/metrics/latest with invalid auth returns 401."""
        client = TestClient(app)
        response = client.get('/api/metrics/latest', headers={
            'Authorization': 'Bearer invalid_token'
        })
        assert response.status_code == 401

    def test_get_metrics_summary_without_auth_returns_401(self):
        """Test that GET /api/metrics/summary without auth returns 401."""
        client = TestClient(app)
        response = client.get('/api/metrics/summary')
        assert response.status_code == 401

    def test_metrics_endpoint_accepts_valid_payload_structure(self):
        """Test that POST /api/metrics validates payload structure."""
        client = TestClient(app)
        
        # Test with invalid payload (string instead of number)
        response = client.post('/api/metrics', json={
            'api_key': 'fg_test',
            'heap_used_mb': 'not_a_number',  # Invalid
            'heap_max_mb': 1024,
            'thread_count': 48
        })
        
        # Should return 422 for validation error
        assert response.status_code == 422
