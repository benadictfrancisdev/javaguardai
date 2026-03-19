import json
import hashlib
import logging
import re
from typing import Optional
import redis
from core.database import supabase
from core.config import settings
from services.risk_scorer import enhance_risk_score
from services.alerts import send_slack_alert
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

# Redis client for deduplication
redis_client = None
try:
    if settings.REDIS_URL:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        redis_client.ping()
        logger.info("Redis connected for deduplication")
except Exception as e:
    logger.warning(f"Redis not available, deduplication disabled: {e}")
    redis_client = None

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

DEDUP_TTL = 600  # 10 minutes cache


def compute_dedup_key(exception_class: str, stack_trace: str) -> str:
    """
    Compute a deduplication key from exception class and stack trace.
    Extracts file name and line number from the first stack trace line.
    """
    file_line = ""
    if stack_trace:
        lines = stack_trace.strip().split('\n')
        for line in lines:
            match = re.search(r'\(([^:]+):(\d+)\)', line)
            if match:
                file_line = f"{match.group(1)}:{match.group(2)}"
                break
    
    key_content = f"{exception_class}:{file_line}"
    return hashlib.sha256(key_content.encode()).hexdigest()[:16]


def get_cached_analysis(customer_id: str, dedup_key: str) -> Optional[dict]:
    """Check Redis cache for existing analysis."""
    if not redis_client:
        return None
    
    try:
        cache_key = f"dedup:{customer_id}:{dedup_key}"
        cached = redis_client.get(cache_key)
        if cached:
            logger.info(f"CACHE HIT — skipped Claude call for key {dedup_key}")
            return json.loads(cached)
    except Exception as e:
        logger.warning(f"Redis get error: {e}")
    
    return None


def set_cached_analysis(customer_id: str, dedup_key: str, analysis: dict) -> None:
    """Store analysis in Redis cache."""
    if not redis_client:
        return
    
    try:
        cache_key = f"dedup:{customer_id}:{dedup_key}"
        redis_client.setex(cache_key, DEDUP_TTL, json.dumps(analysis))
        logger.info(f"Cached analysis for key {dedup_key}")
    except Exception as e:
        logger.warning(f"Redis set error: {e}")


async def analyse_incident(incident_id: str) -> dict:
    """
    Analyse an incident using Claude API with deduplication.
    
    1. Fetches incident from Supabase
    2. Checks Redis cache for duplicate analysis
    3. If cache miss, calls Claude API
    4. Caches the result
    5. Updates incident with analysis
    6. Sends Slack alert if risk > 50
    """
    try:
        # Fetch incident
        result = supabase.table('incidents').select('*').eq('id', incident_id).single().execute()
        incident = result.data
        
        if not incident:
            logger.error(f"Incident {incident_id} not found")
            return {"error": "Incident not found"}
        
        customer_id = incident.get('customer_id')
        exception_class = incident.get('exception_class', 'Unknown')
        stack_trace = incident.get('stack_trace', '')
        
        # Compute dedup key
        dedup_key = compute_dedup_key(exception_class, stack_trace)
        
        # Check cache
        cached_analysis = get_cached_analysis(customer_id, dedup_key)
        
        if cached_analysis:
            # Use cached analysis
            analysis = cached_analysis
            base_score = analysis.get('risk_score', 50)
        else:
            # Cache miss - call Claude
            logger.info(f"CACHE MISS — calling Claude for incident {incident_id}")
            
            # Prepare the analysis request
            analysis_request = f"""
Exception Class: {exception_class}
Message: {incident.get('message', 'No message')}
Stack Trace:
{stack_trace or 'No stack trace available'}

Heap Used: {incident.get('heap_used_mb', 'N/A')} MB
Thread Count: {incident.get('thread_count', 'N/A')}
Timestamp: {incident.get('timestamp', 'Unknown')}
"""
            
            try:
                # Call Claude API using Emergent LLM key
                chat = LlmChat(
                    api_key=settings.EMERGENT_LLM_KEY,
                    session_id=f"incident-{incident_id}",
                    system_message=SYSTEM_PROMPT
                ).with_model("anthropic", "claude-sonnet-4-20250514")
                
                user_message = UserMessage(text=analysis_request)
                response = await chat.send_message(user_message)
                
                # Parse JSON response
                response_text = response.strip()
                if response_text.startswith('```json'):
                    response_text = response_text[7:]
                if response_text.startswith('```'):
                    response_text = response_text[3:]
                if response_text.endswith('```'):
                    response_text = response_text[:-3]
                
                analysis = json.loads(response_text.strip())
                base_score = analysis.get('risk_score', 50)
                
                # Cache the result
                set_cached_analysis(customer_id, dedup_key, analysis)
                
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
                base_score = 50
                
            except Exception as e:
                logger.error(f"Claude API error for incident {incident_id}: {e}")
                # Update incident with error status
                supabase.table('incidents').update({
                    'status': 'analysis_failed',
                    'analysis': {"error": str(e)}
                }).eq('id', incident_id).execute()
                return {"error": str(e), "status": "analysis_failed"}
        
        # Enhance risk score based on rules
        heap_used_mb = incident.get('heap_used_mb', 0)
        heap_max_mb = 1024  # Default max heap
        heap_percent = (heap_used_mb / heap_max_mb) * 100 if heap_max_mb > 0 else 0
        
        final_risk_score = enhance_risk_score(
            base_score, 
            exception_class,
            heap_percent,
            stack_trace
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
            "status": "analysed",
            "cache_hit": cached_analysis is not None
        }
        
    except Exception as e:
        logger.error(f"Error analysing incident {incident_id}: {e}")
        # Update incident with error status
        try:
            supabase.table('incidents').update({
                'status': 'analysis_failed',
                'analysis': {"error": str(e)}
            }).eq('id', incident_id).execute()
        except:
            pass
        return {"error": str(e), "status": "analysis_failed"}
