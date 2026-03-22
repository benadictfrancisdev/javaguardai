import re
import logging
from fastapi import FastAPI, Request
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from pathlib import Path
import sys
from datetime import datetime, timezone

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env')

from core.config import settings
from routers import auth, incidents, metrics, debug
import health

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Sentry
try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration
    
    def before_send(event, hint):
        """Strip sensitive data (emails, phone numbers) before sending to Sentry."""
        # Patterns to redact
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        phone_pattern = r'\+?[\d\s\-\(\)]{10,}'
        
        def redact_string(s):
            if isinstance(s, str):
                s = re.sub(email_pattern, '[EMAIL REDACTED]', s)
                s = re.sub(phone_pattern, '[PHONE REDACTED]', s)
            return s
        
        def redact_dict(d):
            if isinstance(d, dict):
                return {k: redact_dict(v) for k, v in d.items()}
            elif isinstance(d, list):
                return [redact_dict(i) for i in d]
            elif isinstance(d, str):
                return redact_string(d)
            return d
        
        if event:
            event = redact_dict(event)
        
        return event
    
    if settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            traces_sample_rate=0.1,  # 10% of requests traced
            integrations=[
                FastApiIntegration(),
                StarletteIntegration(),
            ],
            environment=settings.ENVIRONMENT,
            before_send=before_send,
        )
        logger.info(f"Sentry initialized for environment: {settings.ENVIRONMENT}")
    else:
        logger.info("Sentry DSN not configured, skipping initialization")
        
except ImportError:
    logger.warning("Sentry SDK not installed, error tracking disabled")
except Exception as e:
    logger.warning(f"Failed to initialize Sentry: {e}")


# Request logging middleware
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = datetime.now(timezone.utc)
        
        # Extract customer_id from auth header if present
        customer_id = "anonymous"
        auth_header = request.headers.get("authorization", "")
        if auth_header:
            token = auth_header.replace("Bearer ", "")
            if token.startswith("fg_"):
                customer_id = f"api_key:{token[:12]}..."
            else:
                customer_id = f"token:{token[:8]}..."
        
        response = await call_next(request)
        
        # Calculate duration
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        
        # Log request
        logger.info(
            f"REQUEST | customer={customer_id} | method={request.method} | "
            f"path={request.url.path} | status={response.status_code} | "
            f"duration={duration:.3f}s | timestamp={start_time.isoformat()}"
        )
        
        return response


# Create FastAPI app
app = FastAPI(
    title="FrameworkGuard AI",
    description="AI-powered production monitoring for Java applications",
    version="1.0.0"
)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# CORS — allow Vercel frontend + regex for all *.vercel.app preview URLs
cors_origins = settings.CORS_ORIGINS.split(',') if settings.CORS_ORIGINS != '*' else ['*']
if '*' not in cors_origins:
    cors_origins.extend(['http://localhost:3000', 'http://localhost:5173'])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r'https://.*\.vercel\.app',
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(debug.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/api")
async def root():
    """Root API endpoint."""
    return {
        "message": "FrameworkGuard AI API",
        "version": "1.0.0",
        "docs": "/docs"
    }


# Exception report endpoint at /api/exceptions (direct path for SDK compatibility)
@app.post("/api/exceptions")
async def report_exception_direct(data: dict, request: Request):
    """Direct exception reporting endpoint for SDK compatibility."""
    from routers.incidents import ExceptionReport, report_exception
    exception_data = ExceptionReport(**data)
    return await report_exception(exception_data, request)


# Metrics endpoint at /api/metrics (direct path for SDK compatibility)
@app.post("/api/metrics")
async def report_metrics_direct(data: dict, request: Request):
    """Direct metrics reporting endpoint for SDK compatibility."""
    from routers.metrics import MetricsReport, report_metrics
    metrics_data = MetricsReport(**data)
    return await report_metrics(metrics_data, request)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
