from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from core.database import supabase
from routers.auth import get_current_customer
from routers.incidents import validate_api_key

router = APIRouter(prefix="/metrics", tags=["metrics"])


class MetricsReport(BaseModel):
    api_key: str
    heap_used_mb: float
    heap_max_mb: float
    thread_count: int
    gc_count: int
    jvm_uptime_ms: int
    timestamp: str


class MetricsEntry(BaseModel):
    id: str
    customer_id: str
    heap_used_mb: float
    heap_max_mb: float
    thread_count: int
    gc_count: int
    jvm_uptime_ms: int
    timestamp: str
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


@router.post("")
async def report_metrics(data: MetricsReport):
    """
    Accept JVM metrics from monitored applications.
    Validates API key and stores metrics.
    """
    # Validate API key
    customer = validate_api_key(data.api_key)
    
    metrics_id = str(uuid.uuid4())
    
    metrics_data = {
        'id': metrics_id,
        'customer_id': customer['id'],
        'heap_used_mb': data.heap_used_mb,
        'heap_max_mb': data.heap_max_mb,
        'thread_count': data.thread_count,
        'gc_count': data.gc_count,
        'jvm_uptime_ms': data.jvm_uptime_ms,
        'timestamp': data.timestamp,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Store metrics
    result = supabase.table('metrics').insert(metrics_data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to store metrics")
    
    return {"received": True, "id": metrics_id}


@router.get("/latest", response_model=MetricsListResponse)
async def get_latest_metrics(
    limit: int = 60,
    customer: dict = Depends(get_current_customer)
):
    """Get the last N metrics entries for the authenticated customer."""
    result = supabase.table('metrics').select('*').eq(
        'customer_id', customer['id']
    ).order('created_at', desc=True).limit(limit).execute()
    
    metrics = []
    for row in result.data:
        metrics.append(MetricsEntry(
            id=row['id'],
            customer_id=row['customer_id'],
            heap_used_mb=row['heap_used_mb'],
            heap_max_mb=row['heap_max_mb'],
            thread_count=row['thread_count'],
            gc_count=row['gc_count'],
            jvm_uptime_ms=row['jvm_uptime_ms'],
            timestamp=row['timestamp'],
            created_at=row['created_at']
        ))
    
    # Reverse to get chronological order
    metrics.reverse()
    
    return MetricsListResponse(metrics=metrics, total=len(metrics))


@router.get("/summary", response_model=MetricsSummary)
async def get_metrics_summary(
    hours: int = 24,
    customer: dict = Depends(get_current_customer)
):
    """Get metrics summary for the last N hours."""
    result = supabase.table('metrics').select('*').eq(
        'customer_id', customer['id']
    ).order('created_at', desc=True).limit(1000).execute()
    
    if not result.data:
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
        if row['heap_max_mb'] > 0:
            heap_percent = (row['heap_used_mb'] / row['heap_max_mb']) * 100
            heap_percents.append(heap_percent)
        thread_counts.append(row['thread_count'])
        total_gc += row['gc_count']
    
    return MetricsSummary(
        avg_heap_percent=sum(heap_percents) / len(heap_percents) if heap_percents else 0,
        max_heap_percent=max(heap_percents) if heap_percents else 0,
        avg_thread_count=sum(thread_counts) / len(thread_counts) if thread_counts else 0,
        total_gc_count=total_gc,
        data_points=len(result.data)
    )
