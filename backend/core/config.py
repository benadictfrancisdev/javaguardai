import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')


class Settings:
    DATABASE_URL: str = os.environ.get(
        'DATABASE_URL',
        'sqlite:///./javaguard.db'
    )
    EMERGENT_LLM_KEY: str = os.environ.get('EMERGENT_LLM_KEY', '')
    OPENAI_API_KEY: str = os.environ.get('OPENAI_API_KEY', '')
    OPENAI_BASE_URL: str = os.environ.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
    AI_MODEL: str = os.environ.get('AI_MODEL', 'gpt-4o-mini')
    REDIS_URL: str = os.environ.get('REDIS_URL', '')
    SENTRY_DSN: str = os.environ.get('SENTRY_DSN', '')
    INGESTION_API_KEY: str = os.environ.get('INGESTION_API_KEY', 'jg-default-key')
    CORS_ORIGINS: str = os.environ.get(
        'CORS_ORIGINS',
        'http://localhost:3000,http://localhost:5173'
    )
    ENVIRONMENT: str = os.environ.get('ENV', 'development')


settings = Settings()
