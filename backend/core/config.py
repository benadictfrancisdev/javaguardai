import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

class Settings:
    SUPABASE_URL: str = os.environ.get('SUPABASE_URL', '')
    SUPABASE_SERVICE_KEY: str = os.environ.get('SUPABASE_SERVICE_KEY', '')
    SUPABASE_ANON_KEY: str = os.environ.get('SUPABASE_ANON_KEY', '')
    EMERGENT_LLM_KEY: str = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-b9aD8Cc64589535389')
    EMERGENT_BASE_URL: str = os.environ.get('EMERGENT_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai')
    AI_MODEL: str = os.environ.get('AI_MODEL', 'gemini-2.0-flash')
    REDIS_URL: str = os.environ.get('REDIS_URL', 'redis://localhost:6379')
    SENTRY_DSN: str = os.environ.get('SENTRY_DSN', '')
    SLACK_WEBHOOK_URL: str = os.environ.get('SLACK_WEBHOOK_URL', '')
    CORS_ORIGINS: str = os.environ.get(
        'CORS_ORIGINS',
        'https://javaguardai.vercel.app,https://javaguardai-production.up.railway.app,http://localhost:3000,http://localhost:5173'
    )
    ENVIRONMENT: str = os.environ.get('ENV', 'development')

settings = Settings()
