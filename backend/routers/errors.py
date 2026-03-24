import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.auth import verify_api_key
from core.database import get_db
from core.models import Error, Analysis
from services.ai_engine import analyse_error

router = APIRouter(tags=["errors"])
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ErrorIngest(BaseModel):
    error: str
    service: str = "unknown"


class AnalysisOut(BaseModel):
    root_cause: str
    why: str
    fix_steps: str
    code_fix: str


class ErrorOut(BaseModel):
    id: int
    error_text: str
    hash: str
    service_name: str
    created_at: datetime
    analysis: AnalysisOut | None = None

    class Config:
        from_attributes = True


class ErrorCreatedResponse(BaseModel):
    id: int
    hash: str
    duplicate: bool
    analysis: AnalysisOut


# ---------------------------------------------------------------------------
# POST /error  — ingest a Java error
# ---------------------------------------------------------------------------

@router.post("/error", response_model=ErrorCreatedResponse)
async def ingest_error(
    payload: ErrorIngest,
    _api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    """
    Accept a Java stack trace error.
    - Compute SHA-256 hash for deduplication.
    - If duplicate hash exists, return the existing analysis.
    - Otherwise store the error, run AI analysis, and persist it.
    """
    error_hash = Error.compute_hash(payload.error)

    # Check for existing error with same hash
    existing = db.query(Error).filter(Error.hash == error_hash).first()

    if existing and existing.analysis:
        logger.info(f"Duplicate error detected (hash={error_hash})")
        return ErrorCreatedResponse(
            id=existing.id,
            hash=existing.hash,
            duplicate=True,
            analysis=AnalysisOut(
                root_cause=existing.analysis.root_cause,
                why=existing.analysis.why,
                fix_steps=existing.analysis.fix_steps,
                code_fix=existing.analysis.code_fix,
            ),
        )

    # New error — persist it
    new_error = Error(
        error_text=payload.error,
        hash=error_hash,
        service_name=payload.service,
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_error)
    db.flush()  # get the id

    # Run AI analysis
    ai_result = await analyse_error(payload.error, error_hash)

    # Persist analysis
    new_analysis = Analysis(
        error_id=new_error.id,
        root_cause=ai_result.get("root_cause", ""),
        why=ai_result.get("why", ""),
        fix_steps=ai_result.get("fix_steps", ""),
        code_fix=ai_result.get("code_fix", ""),
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_analysis)
    db.commit()
    db.refresh(new_error)

    return ErrorCreatedResponse(
        id=new_error.id,
        hash=new_error.hash,
        duplicate=False,
        analysis=AnalysisOut(
            root_cause=new_analysis.root_cause,
            why=new_analysis.why,
            fix_steps=new_analysis.fix_steps,
            code_fix=new_analysis.code_fix,
        ),
    )


# ---------------------------------------------------------------------------
# GET /errors/{error_id}  — fetch a single error with its analysis
# ---------------------------------------------------------------------------

@router.get("/errors/{error_id}", response_model=ErrorOut)
def get_error(error_id: int, db: Session = Depends(get_db)):
    """Return a single error and its AI analysis."""
    error = db.query(Error).filter(Error.id == error_id).first()
    if not error:
        raise HTTPException(status_code=404, detail="Error not found")

    analysis_out = None
    if error.analysis:
        analysis_out = AnalysisOut(
            root_cause=error.analysis.root_cause,
            why=error.analysis.why,
            fix_steps=error.analysis.fix_steps,
            code_fix=error.analysis.code_fix,
        )

    return ErrorOut(
        id=error.id,
        error_text=error.error_text,
        hash=error.hash,
        service_name=error.service_name,
        created_at=error.created_at,
        analysis=analysis_out,
    )
