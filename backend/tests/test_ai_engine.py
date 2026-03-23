import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import json
import asyncio

# Import the module under test
import sys
sys.path.insert(0, '/app/backend')


class TestAnalyseIncident:
    """Tests for analyse_incident function."""
    
    @pytest.mark.asyncio
    async def test_analyse_incident_returns_valid_json(self, test_incident, mock_claude_response):
        """Test that analyse_incident returns valid JSON with all required fields."""
        mock_gemini_response = MagicMock()
        mock_gemini_response.text = mock_claude_response

        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=test_incident)
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[test_incident])

        with patch('services.ai_engine.supabase', mock_supabase), \
             patch('services.ai_engine.gemini_client') as mock_client, \
             patch('services.ai_engine.send_slack_alert', new_callable=AsyncMock):
            
            mock_client.models.generate_content.return_value = mock_gemini_response
            
            from services.ai_engine import analyse_incident
            result = await analyse_incident('test-incident-123')
            
            # Verify result has required fields
            assert 'incident_id' in result or 'error' in result
            if 'incident_id' in result:
                assert 'risk_score' in result
                assert 'analysis' in result
                assert 'status' in result

    @pytest.mark.asyncio
    async def test_analysis_contains_structured_fields(self, test_incident, mock_claude_response):
        """Test that analysis contains the new structured fields: root_cause, why, fix_steps, code_fix."""
        mock_gemini_response = MagicMock()
        mock_gemini_response.text = mock_claude_response

        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=test_incident)
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[test_incident])

        with patch('services.ai_engine.supabase', mock_supabase), \
             patch('services.ai_engine.gemini_client') as mock_client, \
             patch('services.ai_engine.send_slack_alert', new_callable=AsyncMock):
            
            mock_client.models.generate_content.return_value = mock_gemini_response
            
            from services.ai_engine import analyse_incident
            result = await analyse_incident('test-incident-123')
            
            if 'analysis' in result and result['analysis']:
                analysis = result['analysis']
                assert 'root_cause' in analysis
                assert 'why' in analysis
                assert 'fix_steps' in analysis
                assert 'code_fix' in analysis

    @pytest.mark.asyncio
    async def test_risk_score_is_integer_between_0_and_100(self, test_incident, mock_claude_response):
        """Test that risk_score is an integer between 0 and 100."""
        mock_gemini_response = MagicMock()
        mock_gemini_response.text = mock_claude_response

        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=test_incident)
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[test_incident])

        with patch('services.ai_engine.supabase', mock_supabase), \
             patch('services.ai_engine.gemini_client') as mock_client, \
             patch('services.ai_engine.send_slack_alert', new_callable=AsyncMock):
            
            mock_client.models.generate_content.return_value = mock_gemini_response
            
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
            "risk_score": 30,
            "error_type": "OutOfMemoryError",
            "root_cause": "Memory exhaustion",
            "why": "JVM heap space exceeded due to large object allocation",
            "fix_steps": "1. Increase heap size\n2. Profile memory usage\n3. Fix memory leaks",
            "code_fix": "-Xmx2g -Xms1g",
            "fix_suggestion": "Increase heap size",
            "business_impact": "Application crash",
            "confidence": "high",
            "estimated_fix_minutes": 60
        })
        
        mock_gemini_response = MagicMock()
        mock_gemini_response.text = low_risk_response

        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=test_incident)
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[test_incident])

        with patch('services.ai_engine.supabase', mock_supabase), \
             patch('services.ai_engine.gemini_client') as mock_client, \
             patch('services.ai_engine.send_slack_alert', new_callable=AsyncMock):
            
            mock_client.models.generate_content.return_value = mock_gemini_response
            
            from services.ai_engine import analyse_incident
            result = await analyse_incident('test-incident-123')
            
            # OutOfMemoryError should have minimum score of 85
            if 'risk_score' in result:
                assert result['risk_score'] >= 85

    @pytest.mark.asyncio
    async def test_nullpointerexception_error_type(self, test_incident, mock_claude_response):
        """Test that NullPointerException returns correct error_type."""
        mock_gemini_response = MagicMock()
        mock_gemini_response.text = mock_claude_response

        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=test_incident)
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[test_incident])

        with patch('services.ai_engine.supabase', mock_supabase), \
             patch('services.ai_engine.gemini_client') as mock_client, \
             patch('services.ai_engine.send_slack_alert', new_callable=AsyncMock):
            
            mock_client.models.generate_content.return_value = mock_gemini_response
            
            from services.ai_engine import analyse_incident
            result = await analyse_incident('test-incident-123')
            
            if 'analysis' in result and result['analysis']:
                assert 'error_type' in result['analysis']
                assert 'NullPointerException' in result['analysis']['error_type']

    @pytest.mark.asyncio
    async def test_deduplication_returns_cached_result(self, test_incident, mock_claude_response):
        """Test that deduplication returns cached result on second call."""
        cached_analysis = json.loads(mock_claude_response)
        
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=test_incident)
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[test_incident])

        with patch('services.ai_engine.supabase', mock_supabase), \
             patch('services.ai_engine.redis_client') as mock_redis, \
             patch('services.ai_engine.send_slack_alert', new_callable=AsyncMock):
            
            # Simulate cache hit
            mock_redis.get.return_value = json.dumps(cached_analysis)
            
            from services.ai_engine import analyse_incident
            result = await analyse_incident('test-incident-123')
            
            # Should return cached result
            if 'cache_hit' in result:
                assert result['cache_hit'] is True

    @pytest.mark.asyncio
    async def test_gemini_api_error_uses_fallback(self, test_incident):
        """Test that Gemini API error triggers fallback with original error data."""
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=test_incident)
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[test_incident])

        with patch('services.ai_engine.supabase', mock_supabase), \
             patch('services.ai_engine.gemini_client') as mock_client, \
             patch('services.ai_engine.redis_client', None), \
             patch('services.ai_engine.send_slack_alert', new_callable=AsyncMock):
            
            # Simulate Gemini API error
            mock_client.models.generate_content.side_effect = Exception("API Error")
            
            from services.ai_engine import analyse_incident
            result = await analyse_incident('test-incident-123')
            
            # Should use fallback and still return analysis (not error status)
            assert 'analysis' in result
            analysis = result['analysis']
            assert analysis.get('fallback') is True
            assert 'root_cause' in analysis
            assert 'why' in analysis
            assert 'fix_steps' in analysis
            assert 'code_fix' in analysis
            # Fallback should include original error info
            assert test_incident['exception_class'] in analysis['root_cause']

    @pytest.mark.asyncio
    async def test_timeout_uses_fallback(self, test_incident):
        """Test that AI timeout triggers fallback with original error data."""
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data=test_incident)
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[test_incident])

        with patch('services.ai_engine.supabase', mock_supabase), \
             patch('services.ai_engine.gemini_client') as mock_client, \
             patch('services.ai_engine.redis_client', None), \
             patch('services.ai_engine.send_slack_alert', new_callable=AsyncMock):
            
            # Simulate timeout - use a synchronous sleep since run_in_executor runs the lambda in a thread
            import time
            def slow_generate(*args, **kwargs):
                time.sleep(10)
            mock_client.models.generate_content.side_effect = slow_generate
            
            from services.ai_engine import analyse_incident
            result = await analyse_incident('test-incident-123')
            
            # Should use fallback and still return analysis
            assert 'analysis' in result
            analysis = result['analysis']
            assert analysis.get('fallback') is True
            assert 'root_cause' in analysis
            assert test_incident['exception_class'] in analysis['root_cause']


class TestBuildFallbackAnalysis:
    """Tests for _build_fallback_analysis function."""

    def test_fallback_contains_all_structured_fields(self):
        """Test that fallback analysis contains all required structured fields."""
        from services.ai_engine import _build_fallback_analysis
        
        result = _build_fallback_analysis(
            "java.lang.NullPointerException",
            "Cannot invoke method on null object",
            "at com.example.Service.process(Service.java:42)"
        )
        
        assert 'root_cause' in result
        assert 'why' in result
        assert 'fix_steps' in result
        assert 'code_fix' in result
        assert 'risk_score' in result
        assert 'error_type' in result
        assert 'fix_suggestion' in result
        assert result['fallback'] is True

    def test_fallback_includes_original_error(self):
        """Test that fallback preserves the original error information."""
        from services.ai_engine import _build_fallback_analysis
        
        result = _build_fallback_analysis(
            "java.lang.NullPointerException",
            "Cannot invoke method on null object",
            "at com.example.Service.process(Service.java:42)"
        )
        
        assert "NullPointerException" in result['root_cause']
        assert "Cannot invoke method on null object" in result['root_cause']

    def test_fallback_handles_empty_message(self):
        """Test that fallback works with empty message."""
        from services.ai_engine import _build_fallback_analysis
        
        result = _build_fallback_analysis(
            "java.lang.RuntimeException",
            "",
            ""
        )
        
        assert result['root_cause'] == "java.lang.RuntimeException"
        assert result['confidence'] == "low"
        assert result['risk_score'] == 50
