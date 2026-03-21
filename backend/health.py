"""
FrameworkGuard AI - Health Check Module

Provides comprehensive health checks for all system dependencies.
Returns 503 if any critical service is unavailable.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])

VERSION = "1.0.0"


async def check_database() -> Dict[str, Any]:
    """Check Supabase database connection."""
    try:
        from core.database import supabase
        # Lightweight query to test connection
        result = supabase.table('customers').select('id').limit(1).execute()
        return {"status": "connected", "latency_ms": None}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {"status": "disconnected", "error": str(e)}


async def check_redis() -> Dict[str, Any]:
    """Check Redis connection."""
    try:
        import redis
        from core.config import settings
        
        if not settings.REDIS_URL:
            return {"status": "not_configured"}
        
        client = redis.from_url(settings.REDIS_URL, socket_timeout=2)
        client.ping()
        return {"status": "connected"}
    except Exception as e:
        logger.warning(f"Redis health check failed: {e}")
        return {"status": "disconnected", "error": str(e)}


async def check_claude_api() -> Dict[str, Any]:
    """Check Claude API availability (without making actual call)."""
    try:
        from core.config import settings
        
        if not settings.EMERGENT_LLM_KEY:
            return {"status": "not_configured"}
        
        # Just check if key is configured (actual API check would cost money)
        if settings.EMERGENT_LLM_KEY.startswith("sk-"):
            return {"status": "available", "key_configured": True}
        
        return {"status": "available", "key_configured": True}
    except Exception as e:
        logger.error(f"Claude API health check failed: {e}")
        return {"status": "unavailable", "error": str(e)}


async def check_slack() -> Dict[str, Any]:
    """Check Slack webhook configuration."""
    try:
        from core.config import settings
        
        if not settings.SLACK_WEBHOOK_URL:
            return {"status": "not_configured"}
        
        return {"status": "configured"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint — always returns 200 for Railway compatibility.
    Status of each service is reported in the response body.
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    db_status = await check_database()
    redis_status = await check_redis()
    claude_status = await check_claude_api()
    slack_status = await check_slack()

    critical_ok = db_status["status"] == "connected"
    all_ok = (
        critical_ok
        and redis_status["status"] in ["connected", "not_configured"]
        and claude_status["status"] in ["available", "not_configured"]
    )

    if not critical_ok:
        overall_status = "degraded"
    elif not all_ok:
        overall_status = "degraded"
    else:
        overall_status = "healthy"

    return {
        "status": overall_status,
        "database": db_status["status"],
        "redis": redis_status["status"],
        "claude_api": claude_status["status"],
        "slack": slack_status["status"],
        "version": VERSION,
        "timestamp": timestamp,
        "details": {
            "database": db_status,
            "redis": redis_status,
            "claude_api": claude_status,
            "slack": slack_status,
        },
    }


@router.get("/health/live")
async def liveness_probe() -> Dict[str, str]:
    """
    Kubernetes liveness probe.
    Returns 200 if the application is running.
    """
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness_probe(response: Response) -> Dict[str, Any]:
    """
    Kubernetes readiness probe.
    Returns 200 if the application is ready to accept traffic.
    """
    db_status = await check_database()
    
    if db_status["status"] != "connected":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "reason": "database_unavailable"}
    
    return {"status": "ready"}
