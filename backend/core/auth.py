from fastapi import Header, HTTPException, Depends
from typing import Optional
import jwt
from core.config import settings
from core.database import supabase

async def get_current_customer(authorization: Optional[str] = Header(None)):
    """
    Validates JWT token or API key from Authorization header.
    Returns customer object or raises 401 HTTPException.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Extract token from "Bearer <token>" format
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    # Check if it's an API key (starts with fg_)
    if token.startswith("fg_"):
        result = supabase.table('customers').select('*').eq('api_key', token).execute()
        if result.data:
            return result.data[0]
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Try to validate as customer ID (simple token)
    try:
        result = supabase.table('customers').select('*').eq('id', token).execute()
        if result.data:
            return result.data[0]
    except Exception:
        pass
    
    # Try JWT validation (Supabase Auth token)
    try:
        # Decode JWT without full verification for customer lookup
        # In production, verify with Supabase's JWT secret
        payload = jwt.decode(token, options={"verify_signature": False})
        
        # Get user email or sub from JWT
        user_email = payload.get('email')
        user_id = payload.get('sub')
        
        if user_email:
            result = supabase.table('customers').select('*').eq('email', user_email).execute()
            if result.data:
                return result.data[0]
        
        if user_id:
            result = supabase.table('customers').select('*').eq('id', user_id).execute()
            if result.data:
                return result.data[0]
                
    except jwt.exceptions.DecodeError:
        pass
    except Exception as e:
        pass
    
    raise HTTPException(status_code=401, detail="Invalid authorization token")


def validate_api_key(api_key: str) -> dict:
    """
    Validate API key and return customer data.
    Used for SDK/external API authentication.
    """
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required")
    
    result = supabase.table('customers').select('*').eq('api_key', api_key).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return result.data[0]
