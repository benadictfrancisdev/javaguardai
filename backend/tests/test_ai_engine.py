import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.ai_engine import (
    analyse_error,
    get_cached_analysis,
    set_cached_analysis,
    _build_fallback,
)


def test_build_fallback():
    result = _build_fallback("java.lang.NullPointerException")
    assert "root_cause" in result
    assert "why" in result
    assert "fix_steps" in result
    assert "code_fix" in result
    assert result["code_fix"] == ""


def test_get_cached_analysis_no_redis():
    """When redis_client is None, should return None."""
    with patch("services.ai_engine.redis_client", None):
        assert get_cached_analysis("somehash") is None


def test_set_cached_analysis_no_redis():
    """When redis_client is None, should silently return."""
    with patch("services.ai_engine.redis_client", None):
        set_cached_analysis("somehash", {"root_cause": "test"})


def test_get_cached_analysis_hit():
    mock_redis = MagicMock()
    cached_data = {
        "root_cause": "NPE",
        "why": "null ref",
        "fix_steps": "1. Fix",
        "code_fix": "",
    }
    mock_redis.get.return_value = json.dumps(cached_data)

    with patch("services.ai_engine.redis_client", mock_redis):
        result = get_cached_analysis("abc123")
        assert result == cached_data


@pytest.mark.asyncio
async def test_analyse_error_cache_hit():
    cached = {
        "root_cause": "cached root cause",
        "why": "cached why",
        "fix_steps": "cached steps",
        "code_fix": "cached code",
    }
    with patch("services.ai_engine.get_cached_analysis", return_value=cached):
        result = await analyse_error("some error", "somehash")
        assert result == cached


@pytest.mark.asyncio
async def test_analyse_error_ai_call():
    ai_result = {
        "root_cause": "NPE in Service.java:42",
        "why": "Null reference",
        "fix_steps": "1. Add null check",
        "code_fix": "if (x != null) x.call();",
    }

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = json.dumps(ai_result)

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with (
        patch("services.ai_engine.get_cached_analysis", return_value=None),
        patch("services.ai_engine.ai_client", mock_client),
        patch("services.ai_engine.set_cached_analysis") as mock_cache_set,
    ):
        result = await analyse_error("java.lang.NPE at Service.java:42", "hash123")
        assert result["root_cause"] == "NPE in Service.java:42"
        mock_cache_set.assert_called_once()


@pytest.mark.asyncio
async def test_analyse_error_ai_unavailable():
    with (
        patch("services.ai_engine.get_cached_analysis", return_value=None),
        patch("services.ai_engine.ai_client", None),
        patch("services.ai_engine.set_cached_analysis"),
    ):
        result = await analyse_error("some error text", "hash456")
        assert "manual review" in result["root_cause"].lower() or "unavailable" in result["root_cause"].lower()
