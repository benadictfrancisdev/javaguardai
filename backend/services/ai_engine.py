import asyncio
import json
import logging
from typing import Optional

import redis
from openai import AsyncOpenAI

from core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Redis client for caching analysis results
# ---------------------------------------------------------------------------
redis_client = None
try:
    if settings.REDIS_URL:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        redis_client.ping()
        logger.info("Redis connected for caching")
except Exception as e:
    logger.warning(f"Redis not available, caching disabled: {e}")
    redis_client = None

CACHE_TTL = 3600  # 1 hour

# ---------------------------------------------------------------------------
# OpenAI-compatible AI client
# ---------------------------------------------------------------------------
ai_client = None
try:
    if settings.OPENAI_API_KEY:
        ai_client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        )
        logger.info(f"AI client configured: {settings.OPENAI_BASE_URL}")
    else:
        logger.warning("No OPENAI_API_KEY set, AI analysis will use fallback")
except Exception as e:
    logger.warning(f"AI client configuration failed: {e}")
    ai_client = None

AI_ANALYSIS_TIMEOUT = 15.0

SYSTEM_PROMPT = """You are a senior Java backend engineer with 10+ years experience.

Analyze the given Java error and return ONLY valid JSON with these four fields:
{
  "root_cause": "specific one-line root cause (mention class/method if possible)",
  "why": "detailed explanation of why this error happened",
  "fix_steps": "numbered step-by-step fix instructions",
  "code_fix": "concrete Java code snippet that fixes the issue"
}

Rules:
- Be specific (mention class, method if possible)
- No generic advice — only actionable solutions
- For code_fix, provide actual Java code that resolves the issue
- For fix_steps, use numbered steps (1. … 2. … 3. …)"""


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def get_cached_analysis(error_hash: str) -> Optional[dict]:
    """Return cached analysis dict or None."""
    if not redis_client:
        return None
    try:
        cache_key = f"analysis:{error_hash}"
        cached = redis_client.get(cache_key)
        if cached:
            logger.info(f"CACHE HIT for hash {error_hash}")
            return json.loads(cached)
    except Exception as e:
        logger.warning(f"Redis get error: {e}")
    return None


def set_cached_analysis(error_hash: str, analysis: dict) -> None:
    """Store analysis in Redis."""
    if not redis_client:
        return
    try:
        cache_key = f"analysis:{error_hash}"
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(analysis))
        logger.info(f"Cached analysis for hash {error_hash}")
    except Exception as e:
        logger.warning(f"Redis set error: {e}")


def _build_fallback(error_text: str) -> dict:
    """Fallback analysis when AI is unavailable."""
    return {
        "root_cause": "AI analysis unavailable — manual review required",
        "why": f"Could not reach AI service. Original error: {error_text[:200]}",
        "fix_steps": (
            "1. Review the stack trace manually\n"
            "2. Identify the failing class and method\n"
            "3. Apply the appropriate fix"
        ),
        "code_fix": "",
    }


# ---------------------------------------------------------------------------
# Core analysis function
# ---------------------------------------------------------------------------

async def analyse_error(error_text: str, error_hash: str) -> dict:
    """
    Analyse a Java error trace using AI.

    1. Check Redis cache by hash
    2. If miss, call AI
    3. Cache the result
    4. Return structured dict with root_cause, why, fix_steps, code_fix
    """
    # 1 — cache check
    cached = get_cached_analysis(error_hash)
    if cached:
        return cached

    # 2 — call AI
    logger.info(f"CACHE MISS — calling AI for hash {error_hash}")

    prompt = f"Analyze the following Java error:\n\n{error_text}"

    try:
        if not ai_client:
            raise RuntimeError("AI client is not configured")

        ai_response = await asyncio.wait_for(
            ai_client.chat.completions.create(
                model=settings.AI_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=1024,
            ),
            timeout=AI_ANALYSIS_TIMEOUT,
        )
        raw = ai_response.choices[0].message.content.strip()

        # Strip markdown fences if present
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.startswith("```"):
            raw = raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]

        analysis = json.loads(raw.strip())

        # Ensure required keys exist
        for key in ("root_cause", "why", "fix_steps", "code_fix"):
            analysis.setdefault(key, "")

        # 3 — cache only successful AI results
        set_cached_analysis(error_hash, analysis)

    except asyncio.TimeoutError:
        logger.error("AI analysis timed out")
        analysis = _build_fallback(error_text)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response: {e}")
        analysis = _build_fallback(error_text)
    except Exception as e:
        logger.error(f"AI API error: {e}")
        analysis = _build_fallback(error_text)

    return analysis
