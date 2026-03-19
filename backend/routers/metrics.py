from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging
from core.database import supabase
from core.auth import get_current_customer, validate_api_key

router = APIRouter(prefix="/metrics", tags=["metrics"])
logger = logging.getLogger(__name__)


class MetricsReport(BaseModel):
    api_key: str
    heap_used_mb: float
    heap_max_mb: float
    thread_count: int
    gc_count: int = 0
    jvm_uptime_ms: int = 0
    timestamp: Optional[str] = None


class MetricsEntry(BaseModel):
    id: str
    customer_id: str
    heap_used_mb: float
    heap_max_mb: float
    thread_count: int
    gc_count: int
    jvm_uptime_ms: int
    timestamp: Optional[str] = None
    created_at: str


class MetricsListResponse(BaseModel):
    metrics: List[MetricsEntry]
    total: int


class MetricsSummary(BaseModel):
    avg_heap_percent: float
    max_heap_percent: float
    avg_thread_count: float
    total_gc_count: int
    data_points: int


def log_request(customer_id: str, endpoint: str, response_code: int):
    """Log every request with customer context for audit trail."""
    logger.info(f"REQUEST | customer_id={customer_id} | endpoint={endpoint} | status={response_code} | timestamp={datetime.now(timezone.utc).isoformat()}")


@router.post("")
async def report_metrics(data: MetricsReport, request: Request):
    """
    Accept JVM metrics from monitored applications.
    Uses API key authentication (for SDK integration).
    """
    customer = validate_api_key(data.api_key)
    customer_id = customer['id']
    
    metrics_id = str(uuid.uuid4())
    timestamp = data.timestamp or datetime.now(timezone.utc).isoformat()
    
    # Calculate heap percentage for alerting
    heap_percent = (data.heap_used_mb / data.heap_max_mb * 100) if data.heap_max_mb > 0 else 0
    
    # Log high heap alert
    if heap_percent > 95:
        logger.warning(f"HIGH HEAP ALERT | customer_id={customer_id} | heap_percent={heap_percent:.1f}% | heap_used={data.heap_used_mb}MB")
    
    metrics_data = {
        'id': metrics_id,
        'customer_id': customer_id,  # SECURITY: Always set customer_id
        'heap_used_mb': data.heap_used_mb,
        'heap_max_mb': data.heap_max_mb,
        'thread_count': data.thread_count,
        'gc_count': data.gc_count,
        'jvm_uptime_ms': data.jvm_uptime_ms,
        'timestamp': timestamp,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = supabase.table('metrics').insert(metrics_data).execute()
    
    if not result.data:
        log_request(customer_id, "POST /metrics", 500)
        raise HTTPException(status_code=500, detail="Failed to store metrics")
    
    log_request(customer_id, "POST /metrics", 200)
    return {"received": True, "id": metrics_id}


@router.get("/latest", response_model=MetricsListResponse)
async def get_latest_metrics(
    limit: int = 60,
    customer: dict = Depends(get_current_customer)
):
    """
    Get the last N metrics entries for the authenticated customer.
    SECURITY: Always filters by customer_id - defense in depth.
    """
    customer_id = customer['id']
    
    # Cap limit at 60
    limit = min(limit, 60)
    
    # SECURITY: ALWAYS filter by customer_id - never query without it
    result = supabase.table('metrics').select('*').eq(
        'customer_id', customer_id
    ).order('created_at', desc=True).limit(limit).execute()
    
    metrics = []
    for row in result.data:
        # SECURITY: Double-check customer_id matches (defense in depth)
        if row.get('customer_id') != customer_id:
            logger.warning(f"SECURITY: Filtered out metric {row.get('id')} with mismatched customer_id")
            continue
            
        metrics.append(MetricsEntry(
            id=row['id'],
            customer_id=row['customer_id'],
            heap_used_mb=row.get('heap_used_mb', 0),
            heap_max_mb=row.get('heap_max_mb', 0),
            thread_count=row.get('thread_count', 0),
            gc_count=row.get('gc_count', 0),
            jvm_uptime_ms=row.get('jvm_uptime_ms', 0),
            timestamp=row.get('timestamp'),
            created_at=row.get('created_at', '')
        ))
    
    # Reverse to get chronological order
    metrics.reverse()
    
    log_request(customer_id, "GET /metrics/latest", 200)
    return MetricsListResponse(metrics=metrics, total=len(metrics))


@router.get("/summary", response_model=MetricsSummary)
async def get_metrics_summary(
    hours: int = 24,
    customer: dict = Depends(get_current_customer)
):
    """
    Get metrics summary for the last N hours.
    SECURITY: Always filters by customer_id.
    """
    customer_id = customer['id']
    
    # SECURITY: ALWAYS filter by customer_id
    result = supabase.table('metrics').select('*').eq(
        'customer_id', customer_id
    ).order('created_at', desc=True).limit(1000).execute()
    
    if not result.data:
        log_request(customer_id, "GET /metrics/summary", 200)
        return MetricsSummary(
            avg_heap_percent=0,
            max_heap_percent=0,
            avg_thread_count=0,
            total_gc_count=0,
            data_points=0
        )
    
    heap_percents = []
    thread_counts = []
    total_gc = 0
    
    for row in result.data:
        # SECURITY: Verify customer_id matches
        if row.get('customer_id') != customer_id:
            continue
            
        heap_max = row.get('heap_max_mb', 0)
        heap_used = row.get('heap_used_mb', 0)
        if heap_max > 0:
            heap_percent = (heap_used / heap_max) * 100
            heap_percents.append(heap_percent)
        thread_counts.append(row.get('thread_count', 0))
        total_gc += row.get('gc_count', 0)
    
    log_request(customer_id, "GET /metrics/summary", 200)
    return MetricsSummary(
        avg_heap_percent=sum(heap_percents) / len(heap_percents) if heap_percents else 0,
        max_heap_percent=max(heap_percents) if heap_percents else 0,
        avg_thread_count=sum(thread_counts) / len(thread_counts) if thread_counts else 0,
        total_gc_count=total_gc,
        data_points=len(result.data)
    )
