import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv  # noqa: E402
load_dotenv(Path(__file__).parent / '.env')

from core.config import settings  # noqa: E402
from core.database import init_db  # noqa: E402
from fastapi import FastAPI, Request  # noqa: E402
from routers.dashboard import router as dashboard_router  # noqa: E402
from routers.errors import router as errors_router  # noqa: E402
from starlette.middleware.base import BaseHTTPMiddleware  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Request logging middleware
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = datetime.now(timezone.utc)
        response = await call_next(request)
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.info(
            f"REQUEST | method={request.method} | "
            f"path={request.url.path} | status={response.status_code} | "
            f"duration={duration:.3f}s"
        )
        return response


# Create FastAPI app
app = FastAPI(
    title="JavaGuard AI Dashboard",
    description="AI-powered Java error analysis and monitoring dashboard",
    version="1.0.0",
)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# CORS
cors_origins = (
    settings.CORS_ORIGINS.split(',')
    if settings.CORS_ORIGINS != '*'
    else ['*']
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(errors_router)
app.include_router(dashboard_router)


@app.on_event("startup")
def on_startup():
    """Create DB tables on first run."""
    init_db()
    logger.info("Database tables initialised")
    if settings.INGESTION_API_KEY == "jg-default-key":
        logger.warning(
            "WARNING: Using default INGESTION_API_KEY. "
            "Set INGESTION_API_KEY env var before deploying to production."
        )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/")
async def root():
    """Root API endpoint."""
    return {
        "app": "JavaGuard AI Dashboard",
        "version": "1.0.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
