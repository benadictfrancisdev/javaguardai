"""
Diagnostic endpoint — shows config status WITHOUT exposing secrets.
Helps debug Railway deployment issues.
"""
from fastapi import APIRouter
from core.config import settings

router = APIRouter(prefix="/debug", tags=["debug"])


@router.get("/config")
async def config_status():
    """Shows which env vars are set (not their values). Safe to call publicly."""

    def is_set(val: str) -> bool:
        return bool(val and val.strip())

    # Test actual DB connection
    db_error = None
    try:
        from core.database import get_supabase_client
        client = get_supabase_client()
        client.table('customers').select('id').limit(1).execute()
        db_connected = True
    except RuntimeError as e:
        db_connected = False
        db_error = str(e)
    except Exception as e:
        db_connected = False
        db_error = f"Connection failed: {type(e).__name__}: {str(e)[:200]}"

    return {
        "env_vars": {
            "SUPABASE_URL": "✅ set" if is_set(settings.SUPABASE_URL) else "❌ MISSING",
            "SUPABASE_SERVICE_KEY": "✅ set" if is_set(settings.SUPABASE_SERVICE_KEY) else "❌ MISSING",
            "EMERGENT_LLM_KEY": "✅ set" if is_set(settings.EMERGENT_LLM_KEY) else "❌ MISSING",
            "CORS_ORIGINS": settings.CORS_ORIGINS,
        },
        "database": {
            "connected": db_connected,
            "error": db_error,
        },
        "auth_will_work": db_connected,
        "fix": None if db_connected else "Go to Railway → your service → Variables and add SUPABASE_URL and SUPABASE_SERVICE_KEY"
    }
