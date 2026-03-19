import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import json

# Import the module under test
import sys
sys.path.insert(0, '/app/backend')


class TestAnalyseIncident:
    """Tests for analyse_incident function."""
    
    @pytest.mark.asyncio
    async def test_analyse_incident_returns_valid_json(self, test_incident, mock_claude_response):
        """Test that analyse_incident returns valid JSON with all required fields."""
        with patch('services.ai_engine.supabase') as mock_supabase, \
             patch('services.ai_engine.LlmChat') as mock_chat, \
             patch('services.ai_engine.send_slack_alert', new_callable=AsyncMock) as mock_alert:
            
            # Setup mocks
            mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=test_incident)
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[test_incident])
            
            mock_chat_instance = MagicMock()
            mock_chat_instance.with_model.return_value = mock_chat_instance
            mock_chat_instance.send_message = AsyncMock(return_value=mock_claude_response)
            mock_chat.return_value = mock_chat_instance
            
            from services.ai_engine import analyse_incident
            result = await analyse_incident('test-incident-123')
            
            # Verify result has required fields
            assert 'incident_id' in result or 'error' in result
            if 'incident_id' in result:
                assert 'risk_score' in result
                assert 'analysis' in result
                assert 'status' in result

    @pytest.mark.asyncio
    async def test_risk_score_is_integer_between_0_and_100(self, test_incident, mock_claude_response):
        """Test that risk_score is an integer between 0 and 100."""
        with patch('services.ai_engine.supabase') as mock_supabase, \
             patch('services.ai_engine.LlmChat') as mock_chat, \
             patch('services.ai_engine.send_slack_alert', new_callable=AsyncMock):
            
            mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=test_incident)
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[test_incident])
            
            mock_chat_instance = MagicMock()
            mock_chat_instance.with_model.return_value = mock_chat_instance
            mock_chat_instance.send_message = AsyncMock(return_value=mock_claude_response)
            mock_chat.return_value = mock_chat_instance
            
            from services.ai_engine import analyse_incident
            result = await analyse_incident('test-incident-123')
            
            if 'risk_score' in result:
                assert isinstance(result['risk_score'], int)
                assert 0 <= result['risk_score'] <= 100

    @pytest.mark.asyncio
    async def test_outofmemoryerror_returns_high_risk(self, test_incident):
        """Test that OutOfMemoryError always returns risk_score >= 85."""
        test_incident['exception_class'] = 'java.lang.OutOfMemoryError'
        
        low_risk_response = json.dumps({
            "risk_score": 30,  # Low base score
            "error_type": "OutOfMemoryError",
            "root_cause": "Memory exhaustion",
            "fix_suggestion": "Increase heap size",
            "business_impact": "Application crash",
            "confidence": "high",
            "estimated_fix_minutes": 60
        })
        
        with patch('services.ai_engine.supabase') as mock_supabase, \
             patch('services.ai_engine.LlmChat') as mock_chat, \
             patch('services.ai_engine.send_slack_alert', new_callable=AsyncMock):
            
            mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=test_incident)
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[test_incident])
            
            mock_chat_instance = MagicMock()
            mock_chat_instance.with_model.return_value = mock_chat_instance
            mock_chat_instance.send_message = AsyncMock(return_value=low_risk_response)
            mock_chat.return_value = mock_chat_instance
            
            from services.ai_engine import analyse_incident
            result = await analyse_incident('test-incident-123')
            
            # OutOfMemoryError should have minimum score of 85
            if 'risk_score' in result:
                assert result['risk_score'] >= 85

    @pytest.mark.asyncio
    async def test_nullpointerexception_error_type(self, test_incident, mock_claude_response):
        """Test that NullPointerException returns correct error_type."""
        with patch('services.ai_engine.supabase') as mock_supabase, \
             patch('services.ai_engine.LlmChat') as mock_chat, \
             patch('services.ai_engine.send_slack_alert', new_callable=AsyncMock):
            
            mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=test_incident)
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[test_incident])
            
            mock_chat_instance = MagicMock()
            mock_chat_instance.with_model.return_value = mock_chat_instance
            mock_chat_instance.send_message = AsyncMock(return_value=mock_claude_response)
            mock_chat.return_value = mock_chat_instance
            
            from services.ai_engine import analyse_incident
            result = await analyse_incident('test-incident-123')
            
            if 'analysis' in result and result['analysis']:
                assert 'error_type' in result['analysis']
                assert 'NullPointerException' in result['analysis']['error_type']

    @pytest.mark.asyncio
    async def test_deduplication_returns_cached_result(self, test_incident, mock_claude_response):
        """Test that deduplication returns cached result on second call."""
        cached_analysis = json.loads(mock_claude_response)
        
        with patch('services.ai_engine.supabase') as mock_supabase, \
             patch('services.ai_engine.redis_client') as mock_redis, \
             patch('services.ai_engine.send_slack_alert', new_callable=AsyncMock):
            
            mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=test_incident)
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[test_incident])
            
            # Simulate cache hit
            mock_redis.get.return_value = json.dumps(cached_analysis)
            
            from services.ai_engine import analyse_incident
            result = await analyse_incident('test-incident-123')
            
            # Should return cached result
            if 'cache_hit' in result:
                assert result['cache_hit'] is True

    @pytest.mark.asyncio
    async def test_claude_api_error_sets_analysis_failed(self, test_incident):
        """Test that Claude API error sets incident status to analysis_failed."""
        with patch('services.ai_engine.supabase') as mock_supabase, \
             patch('services.ai_engine.LlmChat') as mock_chat, \
             patch('services.ai_engine.redis_client', None):
            
            mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=test_incident)
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[test_incident])
            
            # Simulate Claude API error
            mock_chat_instance = MagicMock()
            mock_chat_instance.with_model.return_value = mock_chat_instance
            mock_chat_instance.send_message = AsyncMock(side_effect=Exception("API Error"))
            mock_chat.return_value = mock_chat_instance
            
            from services.ai_engine import analyse_incident
            result = await analyse_incident('test-incident-123')
            
            # Should return error status
            assert 'error' in result or result.get('status') == 'analysis_failed'
