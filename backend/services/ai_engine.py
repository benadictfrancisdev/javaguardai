import json
import logging
import httpx
from typing import Optional
from core.database import supabase
from core.config import settings
from services.risk_scorer import enhance_risk_score
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Java production error analyst. Analyse the stack trace and return ONLY valid JSON:
{
  "risk_score": 0-100,
  "error_type": "string describing the error category",
  "root_cause": "string explaining the root cause",
  "fix_suggestion": "string with actionable fix steps",
  "business_impact": "string describing business impact",
  "confidence": "high|medium|low",
  "estimated_fix_minutes": number
}

Be precise and actionable. Focus on production-critical issues."""


async def send_slack_alert(incident_id: str) -> bool:
    """Send a Slack alert for high-risk incidents."""
    if not settings.SLACK_WEBHOOK_URL:
        logger.info(f"Slack webhook not configured, skipping alert for incident {incident_id}")
        return False
    
    try:
        # Fetch incident details
        result = supabase.table('incidents').select('*').eq('id', incident_id).single().execute()
        incident = result.data
        
        message = {
            "text": f":rotating_light: High Risk Incident Detected",
            "blocks": [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": "High Risk Incident Alert"}
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Exception:*\n{incident.get('exception_class', 'Unknown')}"},
                        {"type": "mrkdwn", "text": f"*Risk Score:*\n{incident.get('risk_score', 'N/A')}"},
                        {"type": "mrkdwn", "text": f"*Message:*\n{incident.get('message', 'No message')[:100]}"}
                    ]
                }
            ]
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(settings.SLACK_WEBHOOK_URL, json=message)
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Failed to send Slack alert: {e}")
        return False


async def analyse_incident(incident_id: str) -> dict:
    """
    Analyse an incident using Claude API.
    
    1. Fetches incident from Supabase
    2. Calls Claude with the stack trace
    3. Parses JSON response
    4. Updates incident with analysis
    5. Sends Slack alert if risk > 50
    """
    try:
        # Fetch incident
        result = supabase.table('incidents').select('*').eq('id', incident_id).single().execute()
        incident = result.data
        
        if not incident:
            logger.error(f"Incident {incident_id} not found")
            return {"error": "Incident not found"}
        
        # Prepare the analysis request
        analysis_request = f"""
Exception Class: {incident.get('exception_class', 'Unknown')}
Message: {incident.get('message', 'No message')}
Stack Trace:
{incident.get('stack_trace', 'No stack trace available')}

Heap Used: {incident.get('heap_used_mb', 'N/A')} MB
Thread Count: {incident.get('thread_count', 'N/A')}
Timestamp: {incident.get('timestamp', 'Unknown')}
"""
        
        # Call Claude API using emergentintegrations
        chat = LlmChat(
            api_key=settings.EMERGENT_LLM_KEY,
            session_id=f"incident-{incident_id}",
            system_message=SYSTEM_PROMPT
        ).with_model("anthropic", "claude-sonnet-4-20250514")
        
        user_message = UserMessage(text=analysis_request)
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        try:
            # Try to extract JSON from the response
            response_text = response.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            analysis = json.loads(response_text.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response: {e}")
            analysis = {
                "risk_score": 50,
                "error_type": "Parse Error",
                "root_cause": "Unable to parse AI response",
                "fix_suggestion": "Manual review required",
                "business_impact": "Unknown",
                "confidence": "low",
                "estimated_fix_minutes": 60
            }
        
        # Enhance risk score based on rules
        base_score = analysis.get('risk_score', 50)
        heap_used_mb = incident.get('heap_used_mb', 0)
        heap_max_mb = 1024  # Default max heap
        heap_percent = (heap_used_mb / heap_max_mb) * 100 if heap_max_mb > 0 else 0
        
        final_risk_score = enhance_risk_score(
            base_score, 
            incident.get('exception_class', ''),
            heap_percent
        )
        
        # Update incident with analysis
        update_data = {
            'risk_score': final_risk_score,
            'analysis': analysis,
            'status': 'analysed'
        }
        
        supabase.table('incidents').update(update_data).eq('id', incident_id).execute()
        
        # Send Slack alert if risk is high
        if final_risk_score > 50:
            await send_slack_alert(incident_id)
        
        return {
            "incident_id": incident_id,
            "risk_score": final_risk_score,
            "analysis": analysis,
            "status": "analysed"
        }
        
    except Exception as e:
        logger.error(f"Error analysing incident {incident_id}: {e}")
        # Update incident with error status
        supabase.table('incidents').update({
            'status': 'error',
            'analysis': {"error": str(e)}
        }).eq('id', incident_id).execute()
        return {"error": str(e)}
