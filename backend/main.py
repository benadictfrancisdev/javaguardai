from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import logging
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env')

from core.config import settings
from routers import auth, incidents, metrics

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="FrameworkGuard AI",
    description="AI-powered production monitoring for Java applications",
    version="1.0.0"
)

# CORS configuration
origins = settings.CORS_ORIGINS.split(',') if settings.CORS_ORIGINS != '*' else ['*']
if '*' not in origins:
    origins.extend(['http://localhost:3000', 'http://localhost:5173'])

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")


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
async def report_exception_direct(data: dict):
    """Direct exception reporting endpoint for SDK compatibility."""
    from routers.incidents import ExceptionReport, report_exception
    exception_data = ExceptionReport(**data)
    return await report_exception(exception_data)


# Metrics endpoint at /api/metrics (direct path for SDK compatibility)
@app.post("/api/metrics")
async def report_metrics_direct(data: dict):
    """Direct metrics reporting endpoint for SDK compatibility."""
    from routers.metrics import MetricsReport, report_metrics
    metrics_data = MetricsReport(**data)
    return await report_metrics(metrics_data)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
