import logging
from supabase import create_client, Client
from .config import settings

logger = logging.getLogger(__name__)

_supabase_client: Client = None


def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set as environment variables in Railway."
            )
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase_client


class LazySupabase:
    """Proxy that creates the Supabase client only on first use."""
    def __getattr__(self, name):
        return getattr(get_supabase_client(), name)


supabase = LazySupabase()
