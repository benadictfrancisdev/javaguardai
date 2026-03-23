import asyncio
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
from google import genai

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

AI_ANALYSIS_TIMEOUT = 5.0  # Maximum seconds to wait for AI response

# Configure Gemini AI client
try:
    gemini_client = genai.Client(api_key=settings.EMERGENT_LLM_KEY)
    logger.info("Gemini AI client configured")
except Exception as e:
    logger.warning(f"Gemini AI client configuration failed: {e}")
    gemini_client = None

SYSTEM_PROMPT = """You are a senior Java backend engineer with 10+ years experience.

Analyze the given Java error and return ONLY valid JSON with these fields:
{
  "risk_score": 0-100,
  "error_type": "string describing the error category",
  "root_cause": "specific one-line root cause (mention class, method if possible)",
  "why": "detailed explanation of why this error happened, including the chain of events",
  "fix_steps": "numbered step-by-step fix instructions (1. Do X  2. Do Y  3. Do Z)",
  "code_fix": "concrete Java code snippet that fixes the issue",
  "fix_suggestion": "short actionable fix summary",
  "business_impact": "string describing business impact",
  "confidence": "high|medium|low",
  "estimated_fix_minutes": number
}

Rules:
- Be specific (mention class, method if possible)
- No generic advice
- Only actionable solutions
- For code_fix, provide actual Java code that resolves the issue
- For fix_steps, use numbered steps"""

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
            logger.info(f"CACHE HIT — skipped Gemini call for key {dedup_key}")
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


def _build_fallback_analysis(exception_class: str, message: str, stack_trace: str) -> dict:
    """
    Build a structured fallback analysis from the original error data.
    Used when AI analysis fails (timeout, API error, parse error).
    Preserves the original error information instead of showing generic messages.
    """
    return {
        "risk_score": 50,
        "error_type": exception_class,
        "root_cause": f"{exception_class}: {message}" if message else exception_class,
        "why": f"AI analysis unavailable. Original error: {message}" if message else "AI analysis unavailable. Manual review required.",
        "fix_steps": f"1. Review the stack trace for {exception_class}\n2. Check the code at the location indicated in the trace\n3. Apply appropriate fix based on the exception type",
        "code_fix": "",
        "fix_suggestion": f"Review {exception_class} at the location shown in the stack trace",
        "business_impact": "Unknown - AI analysis was not available",
        "confidence": "low",
        "estimated_fix_minutes": 60,
        "fallback": True
    }


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
            # Cache miss - call Gemini
            logger.info(f"CACHE MISS — calling Gemini for incident {incident_id}")
            
            # Prepare the analysis request using the user's error data
            error_text = f"{exception_class}: {incident.get('message', 'No message')}\n{stack_trace or 'No stack trace available'}"
            analysis_request = f"""Analyze the following Java error:

{error_text}

Additional context:
- Heap Used: {incident.get('heap_used_mb', 'N/A')} MB
- Thread Count: {incident.get('thread_count', 'N/A')}
- Timestamp: {incident.get('timestamp', 'Unknown')}
"""
            
            try:
                # Call Gemini API via google-genai SDK with timeout
                loop = asyncio.get_event_loop()
                gemini_response = await asyncio.wait_for(
                    loop.run_in_executor(
                        None,
                        lambda: gemini_client.models.generate_content(
                            model=settings.GEMINI_MODEL,
                            contents=analysis_request,
                            config={
                                "system_instruction": SYSTEM_PROMPT,
                                "max_output_tokens": 1024,
                            }
                        )
                    ),
                    timeout=AI_ANALYSIS_TIMEOUT
                )
                response = gemini_response.text
                
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
                
                # Ensure new structured fields are present with defaults
                analysis.setdefault('root_cause', analysis.get('error_type', 'Unknown'))
                analysis.setdefault('why', analysis.get('root_cause', 'AI analysis did not provide details'))
                analysis.setdefault('fix_steps', analysis.get('fix_suggestion', 'Manual review required'))
                analysis.setdefault('code_fix', '')
                
                # Cache the result
                set_cached_analysis(customer_id, dedup_key, analysis)
                
            except asyncio.TimeoutError:
                logger.error(f"AI analysis timed out after {AI_ANALYSIS_TIMEOUT}s for incident {incident_id}")
                # Fallback: return structured analysis from original error data
                analysis = _build_fallback_analysis(
                    exception_class, incident.get('message', ''), stack_trace
                )
                base_score = analysis['risk_score']
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Gemini response: {e}")
                analysis = _build_fallback_analysis(
                    exception_class, incident.get('message', ''), stack_trace
                )
                base_score = analysis['risk_score']
                
            except Exception as e:
                logger.error(f"Gemini API error for incident {incident_id}: {e}")
                # Fallback: return structured analysis from original error data
                analysis = _build_fallback_analysis(
                    exception_class, incident.get('message', ''), stack_trace
                )
                base_score = analysis['risk_score']
        
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
        except Exception:
            pass
        return {"error": str(e), "status": "analysis_failed"}
