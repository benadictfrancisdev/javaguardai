from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime, timezone, timedelta
import uuid
import logging
from core.database import supabase
from core.auth import get_current_customer, validate_api_key
from tasks.celery_app import analyse_incident_task

router = APIRouter(prefix="/incidents", tags=["incidents"])
logger = logging.getLogger(__name__)


class ExceptionReport(BaseModel):
    api_key: str
    exception_class: str
    message: str
    stack_trace: str
    heap_used_mb: float = 0
    thread_count: int = 0
    timestamp: Optional[str] = None


class IncidentResponse(BaseModel):
    incident_id: str
    status: str


class IncidentDetail(BaseModel):
    id: str
    customer_id: str
    exception_class: str
    message: str
    stack_trace: str
    heap_used_mb: float
    thread_count: int
    timestamp: Optional[str] = None
    risk_score: Optional[int] = None
    analysis: Optional[Any] = None
    status: str
    created_at: str
    resolved_at: Optional[str] = None


class IncidentListResponse(BaseModel):
    incidents: List[IncidentDetail]
    total: int


class IncidentStats(BaseModel):
    total_today: int
    total_week: int
    critical_count: int
    avg_risk_score: float
    hours_saved_estimate: float


def log_request(customer_id: str, endpoint: str, response_code: int):
    """Log every request with customer context for audit trail."""
    logger.info(f"REQUEST | customer_id={customer_id} | endpoint={endpoint} | status={response_code} | timestamp={datetime.now(timezone.utc).isoformat()}")


@router.post("/exceptions", response_model=IncidentResponse)
async def report_exception(data: ExceptionReport, request: Request):
    """
    Accept exception reports from monitored applications.
    Uses API key authentication (for SDK integration).
    """
    # Validate API key
    customer = validate_api_key(data.api_key)
    customer_id = customer['id']
    
    incident_id = str(uuid.uuid4())
    timestamp = data.timestamp or datetime.now(timezone.utc).isoformat()
    
    incident_data = {
        'id': incident_id,
        'customer_id': customer_id,  # SECURITY: Always set customer_id
        'exception_class': data.exception_class,
        'message': data.message,
        'stack_trace': data.stack_trace,
        'heap_used_mb': data.heap_used_mb,
        'thread_count': data.thread_count,
        'timestamp': timestamp,
        'status': 'received',
        'risk_score': None,
        'analysis': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = supabase.table('incidents').insert(incident_data).execute()
    
    if not result.data:
        log_request(customer_id, "POST /incidents/exceptions", 500)
        raise HTTPException(status_code=500, detail="Failed to store incident")
    
    # Queue for AI analysis
    analyse_incident_task.delay(incident_id)
    
    log_request(customer_id, "POST /incidents/exceptions", 200)
    return IncidentResponse(incident_id=incident_id, status="queued")


@router.get("", response_model=IncidentListResponse)
async def get_incidents(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    customer: dict = Depends(get_current_customer)
):
    """
    Get list of incidents for the authenticated customer.
    SECURITY: Always filters by customer_id - defense in depth.
    """
    customer_id = customer['id']
    
    # SECURITY: ALWAYS filter by customer_id - never query without it
    query = supabase.table('incidents').select('*').eq('customer_id', customer_id)
    
    if status and status != 'all':
        query = query.eq('status', status)
    
    result = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
    
    # Get total count - SECURITY: Also filtered by customer_id
    count_result = supabase.table('incidents').select('id', count='exact').eq('customer_id', customer_id).execute()
    total = count_result.count if count_result.count else len(result.data)
    
    incidents = []
    for row in result.data:
        # SECURITY: Double-check customer_id matches (defense in depth)
        if row.get('customer_id') != customer_id:
            logger.warning(f"SECURITY: Filtered out incident {row.get('id')} with mismatched customer_id")
            continue
            
        incidents.append(IncidentDetail(
            id=row['id'],
            customer_id=row['customer_id'],
            exception_class=row.get('exception_class', ''),
            message=row.get('message', ''),
            stack_trace=row.get('stack_trace', ''),
            heap_used_mb=row.get('heap_used_mb', 0),
            thread_count=row.get('thread_count', 0),
            timestamp=row.get('timestamp'),
            risk_score=row.get('risk_score'),
            analysis=row.get('analysis'),
            status=row.get('status', 'received'),
            created_at=row.get('created_at', ''),
            resolved_at=row.get('resolved_at')
        ))
    
    log_request(customer_id, "GET /incidents", 200)
    return IncidentListResponse(incidents=incidents, total=total)


@router.get("/stats", response_model=IncidentStats)
async def get_incident_stats(customer: dict = Depends(get_current_customer)):
    """
    Get incident statistics for the authenticated customer.
    SECURITY: Always filters by customer_id.
    """
    customer_id = customer['id']
    
    # Calculate date ranges
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    
    # Fetch all incidents for this customer (SECURITY: filtered by customer_id)
    result = supabase.table('incidents').select('*').eq('customer_id', customer_id).execute()
    all_incidents = result.data or []
    
    # Calculate stats
    total_today = 0
    total_week = 0
    critical_count = 0
    risk_scores = []
    
    for incident in all_incidents:
        # SECURITY: Verify customer_id matches
        if incident.get('customer_id') != customer_id:
            continue
            
        created_at = incident.get('created_at', '')
        if created_at:
            try:
                incident_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                if incident_time >= today_start:
                    total_today += 1
                if incident_time >= week_start:
                    total_week += 1
            except (ValueError, TypeError):
                pass
        
        risk_score = incident.get('risk_score')
        if risk_score is not None:
            risk_scores.append(risk_score)
            if risk_score >= 85:
                critical_count += 1
    
    avg_risk_score = sum(risk_scores) / len(risk_scores) if risk_scores else 0
    hours_saved_estimate = len(all_incidents) * 2  # 2 hours per incident
    
    log_request(customer_id, "GET /incidents/stats", 200)
    return IncidentStats(
        total_today=total_today,
        total_week=total_week,
        critical_count=critical_count,
        avg_risk_score=round(avg_risk_score, 1),
        hours_saved_estimate=hours_saved_estimate
    )


@router.get("/{incident_id}", response_model=IncidentDetail)
async def get_incident(incident_id: str, customer: dict = Depends(get_current_customer)):
    """
    Get a specific incident by ID.
    SECURITY: Always filters by customer_id.
    """
    customer_id = customer['id']
    
    # SECURITY: MUST include customer_id filter
    result = supabase.table('incidents').select('*').eq('id', incident_id).eq('customer_id', customer_id).execute()
    
    if not result.data:
        log_request(customer_id, f"GET /incidents/{incident_id}", 404)
        raise HTTPException(status_code=404, detail="Incident not found")
    
    row = result.data[0]
    
    # SECURITY: Verify customer_id matches (defense in depth)
    if row.get('customer_id') != customer_id:
        logger.warning(f"SECURITY: Blocked access to incident {incident_id} for customer {customer_id}")
        raise HTTPException(status_code=404, detail="Incident not found")
    
    log_request(customer_id, f"GET /incidents/{incident_id}", 200)
    return IncidentDetail(
        id=row['id'],
        customer_id=row['customer_id'],
        exception_class=row.get('exception_class', ''),
        message=row.get('message', ''),
        stack_trace=row.get('stack_trace', ''),
        heap_used_mb=row.get('heap_used_mb', 0),
        thread_count=row.get('thread_count', 0),
        timestamp=row.get('timestamp'),
        risk_score=row.get('risk_score'),
        analysis=row.get('analysis'),
        status=row.get('status', 'received'),
        created_at=row.get('created_at', ''),
        resolved_at=row.get('resolved_at')
    )


@router.patch("/{incident_id}/resolve")
async def resolve_incident(incident_id: str, customer: dict = Depends(get_current_customer)):
    """
    Mark an incident as resolved.
    SECURITY: Always filters by customer_id.
    """
    customer_id = customer['id']
    
    # SECURITY: Verify incident belongs to customer
    result = supabase.table('incidents').select('id').eq('id', incident_id).eq('customer_id', customer_id).execute()
    
    if not result.data:
        log_request(customer_id, f"PATCH /incidents/{incident_id}/resolve", 404)
        raise HTTPException(status_code=404, detail="Incident not found")
    
    supabase.table('incidents').update({
        'status': 'resolved',
        'resolved_at': datetime.now(timezone.utc).isoformat()
    }).eq('id', incident_id).eq('customer_id', customer_id).execute()  # SECURITY: Include customer_id in update
    
    log_request(customer_id, f"PATCH /incidents/{incident_id}/resolve", 200)
    return {"status": "resolved", "incident_id": incident_id}


@router.post("/{incident_id}/reanalyse")
async def reanalyse_incident(incident_id: str, customer: dict = Depends(get_current_customer)):
    """
    Re-trigger AI analysis for an incident.
    SECURITY: Always filters by customer_id.
    """
    customer_id = customer['id']
    
    # SECURITY: Verify incident belongs to customer
    result = supabase.table('incidents').select('id').eq('id', incident_id).eq('customer_id', customer_id).execute()
    
    if not result.data:
        log_request(customer_id, f"POST /incidents/{incident_id}/reanalyse", 404)
        raise HTTPException(status_code=404, detail="Incident not found")
    
    supabase.table('incidents').update({'status': 'received'}).eq('id', incident_id).eq('customer_id', customer_id).execute()
    analyse_incident_task.delay(incident_id)
    
    log_request(customer_id, f"POST /incidents/{incident_id}/reanalyse", 200)
    return {"status": "queued", "incident_id": incident_id}
