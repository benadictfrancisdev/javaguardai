from fastapi import Header, HTTPException
from core.config import settings


def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """
    Validates the ingestion API key from the X-API-Key header.
    Raises 401 if the key is missing or does not match.
    """
    if not x_api_key or x_api_key != settings.INGESTION_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return x_api_key
