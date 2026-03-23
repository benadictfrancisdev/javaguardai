import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import json

# Test fixtures
@pytest.fixture
def test_customer():
    return {
        'id': 'test-customer-123',
        'email': 'test@example.com',
        'company_name': 'Test Corp',
        'api_key': 'fg_test_api_key_12345',
        'created_at': '2024-01-01T00:00:00Z'
    }

@pytest.fixture
def test_api_key():
    return 'fg_test_api_key_12345'

@pytest.fixture
def test_incident():
    return {
        'id': 'test-incident-123',
        'customer_id': 'test-customer-123',
        'exception_class': 'java.lang.NullPointerException',
        'message': 'Cannot invoke method on null object',
        'stack_trace': '''java.lang.NullPointerException: Cannot invoke method on null
    at com.example.service.UserService.processUser(UserService.java:42)
    at com.example.controller.UserController.getUser(UserController.java:58)''',
        'heap_used_mb': 512,
        'thread_count': 48,
        'timestamp': '2024-01-01T12:00:00Z',
        'status': 'received',
        'created_at': '2024-01-01T12:00:00Z'
    }

@pytest.fixture
def mock_claude_response():
    return json.dumps({
        "risk_score": 65,
        "error_type": "NullPointerException",
        "root_cause": "Null object reference in UserService",
        "why": "The UserService.processUser() method receives a null user object because the database query returned no results, but the calling code did not check for null before invoking the method.",
        "fix_steps": "1. Add null check in UserController.getUser() before calling processUser()\n2. Return 404 response if user is not found\n3. Add @NonNull annotation to processUser() parameter",
        "code_fix": "User user = userRepository.findById(userId);\nif (user == null) {\n    throw new UserNotFoundException(userId);\n}\nuserService.processUser(user);",
        "fix_suggestion": "Add null check before method call",
        "business_impact": "User requests may fail",
        "confidence": "high",
        "estimated_fix_minutes": 30
    })

@pytest.fixture
def test_metrics():
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

# Event loop fixture for async tests
@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

# Mock Supabase client
@pytest.fixture
def mock_supabase():
    with patch('core.database.supabase') as mock:
        yield mock

# Mock Redis client
@pytest.fixture
def mock_redis():
    with patch('services.ai_engine.redis_client') as mock:
        yield mock
