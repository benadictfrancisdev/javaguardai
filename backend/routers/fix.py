import hashlib
import logging

from fastapi import APIRouter
from pydantic import BaseModel

from services.ai_engine import analyse_error

router = APIRouter(tags=["fix"])
logger = logging.getLogger(__name__)


class FixRequest(BaseModel):
    input: str


class FixResponse(BaseModel):
    root_cause: str
    why: str
    fix_steps: str
    code_fix: str


@router.post("/fix", response_model=FixResponse)
async def fix_error(payload: FixRequest):
    """
    Accept a Java error / stack trace / code snippet and return
    AI-generated root cause, explanation, fix steps, and corrected code.
    No authentication required — this is the primary developer-facing endpoint.
    """
    error_text = payload.input.strip()
    if not error_text:
        return FixResponse(
            root_cause="No input provided",
            why="The input field was empty.",
            fix_steps="1. Paste a Java error, stack trace, or code snippet\n2. Click Fix Error",
            code_fix="",
        )

    error_hash = hashlib.sha256(error_text.encode()).hexdigest()
    logger.info(f"Fix request received (hash={error_hash[:12]}...)")

    result = await analyse_error(error_text, error_hash)

    return FixResponse(
        root_cause=result.get("root_cause", ""),
        why=result.get("why", ""),
        fix_steps=result.get("fix_steps", ""),
        code_fix=result.get("code_fix", ""),
    )
