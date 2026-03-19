from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime, timezone
import uuid
from core.database import supabase
from routers.auth import get_current_customer
from tasks.celery_app import analyse_incident_task

router = APIRouter(prefix="/incidents", tags=["incidents"])


class ExceptionReport(BaseModel):
    api_key: str
    exception_class: str
    message: str
    stack_trace: str
    heap_used_mb: float
    thread_count: int
    timestamp: str


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
    timestamp: str
    risk_score: Optional[int] = None
    analysis: Optional[Any] = None
    status: str
    created_at: str


class IncidentListResponse(BaseModel):
    incidents: List[IncidentDetail]
    total: int


def validate_api_key(api_key: str) -> dict:
    """Validate API key and return customer data."""
    result = supabase.table('customers').select('*').eq('api_key', api_key).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return result.data[0]


@router.post("/exceptions", response_model=IncidentResponse)
async def report_exception(data: ExceptionReport):
    """
    Accept exception reports from monitored applications.
    Validates API key, stores incident, and queues for AI analysis.
    """
    # Validate API key
    customer = validate_api_key(data.api_key)
    
    incident_id = str(uuid.uuid4())
    
    incident_data = {
        'id': incident_id,
        'customer_id': customer['id'],
        'exception_class': data.exception_class,
        'message': data.message,
        'stack_trace': data.stack_trace,
        'heap_used_mb': data.heap_used_mb,
        'thread_count': data.thread_count,
        'timestamp': data.timestamp,
        'status': 'received',
        'risk_score': None,
        'analysis': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Store incident
    result = supabase.table('incidents').insert(incident_data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to store incident")
    
    # Queue for AI analysis (async background task)
    analyse_incident_task.delay(incident_id)
    
    return IncidentResponse(incident_id=incident_id, status="queued")


@router.get("", response_model=IncidentListResponse)
async def get_incidents(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    customer: dict = Depends(get_current_customer)
):
    """Get list of incidents for the authenticated customer."""
    query = supabase.table('incidents').select('*').eq('customer_id', customer['id'])
    
    if status:
        query = query.eq('status', status)
    
    # Order by created_at descending, with pagination
    result = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
    
    # Get total count
    count_result = supabase.table('incidents').select('id', count='exact').eq('customer_id', customer['id']).execute()
    total = count_result.count if count_result.count else len(result.data)
    
    incidents = []
    for row in result.data:
        incidents.append(IncidentDetail(
            id=row['id'],
            customer_id=row['customer_id'],
            exception_class=row['exception_class'],
            message=row['message'],
            stack_trace=row['stack_trace'],
            heap_used_mb=row['heap_used_mb'],
            thread_count=row['thread_count'],
            timestamp=row['timestamp'],
            risk_score=row.get('risk_score'),
            analysis=row.get('analysis'),
            status=row['status'],
            created_at=row['created_at']
        ))
    
    return IncidentListResponse(incidents=incidents, total=total)


@router.get("/{incident_id}", response_model=IncidentDetail)
async def get_incident(incident_id: str, customer: dict = Depends(get_current_customer)):
    """Get a specific incident by ID."""
    result = supabase.table('incidents').select('*').eq('id', incident_id).eq('customer_id', customer['id']).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    row = result.data[0]
    return IncidentDetail(
        id=row['id'],
        customer_id=row['customer_id'],
        exception_class=row['exception_class'],
        message=row['message'],
        stack_trace=row['stack_trace'],
        heap_used_mb=row['heap_used_mb'],
        thread_count=row['thread_count'],
        timestamp=row['timestamp'],
        risk_score=row.get('risk_score'),
        analysis=row.get('analysis'),
        status=row['status'],
        created_at=row['created_at']
    )


@router.patch("/{incident_id}/resolve")
async def resolve_incident(incident_id: str, customer: dict = Depends(get_current_customer)):
    """Mark an incident as resolved."""
    # Verify incident belongs to customer
    result = supabase.table('incidents').select('id').eq('id', incident_id).eq('customer_id', customer['id']).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Update status
    supabase.table('incidents').update({
        'status': 'resolved',
        'resolved_at': datetime.now(timezone.utc).isoformat()
    }).eq('id', incident_id).execute()
    
    return {"status": "resolved", "incident_id": incident_id}


@router.post("/{incident_id}/reanalyse")
async def reanalyse_incident(incident_id: str, customer: dict = Depends(get_current_customer)):
    """Re-trigger AI analysis for an incident."""
    # Verify incident belongs to customer
    result = supabase.table('incidents').select('id').eq('id', incident_id).eq('customer_id', customer['id']).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Update status and queue for reanalysis
    supabase.table('incidents').update({'status': 'received'}).eq('id', incident_id).execute()
    analyse_incident_task.delay(incident_id)
    
    return {"status": "queued", "incident_id": incident_id}
