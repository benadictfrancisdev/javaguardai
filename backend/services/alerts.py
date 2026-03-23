import httpx
import logging
from typing import Optional
from core.database import supabase
from core.config import settings

logger = logging.getLogger(__name__)


async def send_slack_alert(incident_id: str) -> bool:
    """
    Send a Slack alert for high-risk incidents.
    Only fires if risk_score > 50.
    
    Args:
        incident_id: The ID of the incident to alert on
        
    Returns:
        True if alert was sent successfully, False otherwise
    """
    if not settings.SLACK_WEBHOOK_URL:
        logger.info(f"Slack webhook not configured, skipping alert for incident {incident_id}")
        return False
    
    try:
        # Fetch incident with customer info
        result = supabase.table('incidents').select('*').eq('id', incident_id).single().execute()
        incident = result.data
        
        if not incident:
            logger.error(f"Incident {incident_id} not found")
            return False
        
        risk_score = incident.get('risk_score', 0)
        
        # Only alert if risk_score > 50
        if risk_score is None or risk_score <= 50:
            logger.info(f"Skipping Slack alert for incident {incident_id}: risk_score {risk_score} <= 50")
            return False
        
        # Fetch customer info
        customer_result = supabase.table('customers').select('company_name').eq('id', incident.get('customer_id')).single().execute()
        company_name = customer_result.data.get('company_name', 'Unknown') if customer_result.data else 'Unknown'
        
        # Get analysis data
        analysis = incident.get('analysis', {}) or {}
        exception_class = incident.get('exception_class', 'Unknown Exception')
        timestamp = incident.get('timestamp') or incident.get('created_at', 'Unknown')
        
        # Build Slack payload
        risk_emoji = "🔴" if risk_score >= 80 else "🟠" if risk_score >= 60 else "🟡"
        
        payload = {
            "text": f"{risk_emoji} HIGH RISK INCIDENT — {exception_class}",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": f"{risk_emoji} Risk Score: {risk_score} — {exception_class}",
                        "emoji": True
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Business Impact:*\n{analysis.get('business_impact', 'Analysis pending...')}"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Root Cause:*\n{analysis.get('root_cause', 'Analysis pending...')}"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Why:*\n{analysis.get('why', 'Details pending...')}"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Fix Steps:*\n{analysis.get('fix_steps', analysis.get('fix_suggestion', 'Analysis pending...'))}"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"📅 {timestamp} | 🏢 {company_name} | 🎫 {incident_id[:8]}..."
                        }
                    ]
                },
                {
                    "type": "divider"
                }
            ]
        }
        
        # Send to Slack
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.SLACK_WEBHOOK_URL,
                json=payload,
                timeout=10.0
            )
            
            if response.status_code == 200:
                logger.info(f"Slack alert sent successfully for incident {incident_id}")
                return True
            else:
                logger.error(f"Slack alert failed for incident {incident_id}: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"Failed to send Slack alert for incident {incident_id}: {e}")
        return False
