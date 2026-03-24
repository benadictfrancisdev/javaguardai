import logging
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.database import get_db
from core.models import Error

router = APIRouter(tags=["dashboard"])
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class AnalysisBrief(BaseModel):
    root_cause: str
    why: str
    fix_steps: str
    code_fix: str


class RecentError(BaseModel):
    id: int
    error_text: str
    hash: str
    service_name: str
    created_at: datetime
    analysis: AnalysisBrief | None = None

    class Config:
        from_attributes = True


class ServiceCount(BaseModel):
    service: str
    count: int


class DashboardResponse(BaseModel):
    total_errors: int
    errors_by_service: List[ServiceCount]
    recent_errors: List[RecentError]


# ---------------------------------------------------------------------------
# GET /dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    """
    Return dashboard summary:
    - total error count
    - errors grouped by service
    - 20 most recent errors (with analysis)
    """
    # Total count
    total_errors: int = db.query(func.count(Error.id)).scalar() or 0

    # Errors grouped by service
    service_rows = (
        db.query(Error.service_name, func.count(Error.id))
        .group_by(Error.service_name)
        .order_by(func.count(Error.id).desc())
        .all()
    )
    errors_by_service = [
        ServiceCount(service=row[0], count=row[1]) for row in service_rows
    ]

    # 20 most recent errors
    recent_rows = (
        db.query(Error)
        .order_by(Error.created_at.desc())
        .limit(20)
        .all()
    )
    recent_errors = []
    for err in recent_rows:
        analysis_out = None
        if err.analysis:
            analysis_out = AnalysisBrief(
                root_cause=err.analysis.root_cause,
                why=err.analysis.why,
                fix_steps=err.analysis.fix_steps,
                code_fix=err.analysis.code_fix,
            )
        recent_errors.append(
            RecentError(
                id=err.id,
                error_text=err.error_text,
                hash=err.hash,
                service_name=err.service_name,
                created_at=err.created_at,
                analysis=analysis_out,
            )
        )

    return DashboardResponse(
        total_errors=total_errors,
        errors_by_service=errors_by_service,
        recent_errors=recent_errors,
    )
