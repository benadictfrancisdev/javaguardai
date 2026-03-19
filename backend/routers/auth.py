from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
import secrets
from datetime import datetime, timezone
from core.database import supabase

router = APIRouter(prefix="/auth", tags=["auth"])


class CustomerCreate(BaseModel):
    email: EmailStr
    company_name: str
    password: str


class CustomerLogin(BaseModel):
    email: EmailStr
    password: str


class CustomerResponse(BaseModel):
    id: str
    email: str
    company_name: str
    api_key: str
    created_at: str


class ApiKeyResponse(BaseModel):
    api_key: str


def generate_api_key() -> str:
    """Generate a secure API key."""
    return f"fg_{secrets.token_urlsafe(32)}"


async def get_current_customer(authorization: Optional[str] = Header(None)):
    """Verify and return the current customer from API key or session."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Support both "Bearer <token>" and direct API key
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    # Check if it's an API key
    if token.startswith("fg_"):
        result = supabase.table('customers').select('*').eq('api_key', token).execute()
        if result.data:
            return result.data[0]
    
    # Check if it's a session token (customer ID for simplicity)
    result = supabase.table('customers').select('*').eq('id', token).execute()
    if result.data:
        return result.data[0]
    
    raise HTTPException(status_code=401, detail="Invalid authorization")


@router.post("/register", response_model=CustomerResponse)
async def register_customer(data: CustomerCreate):
    """Register a new customer and generate API key."""
    # Check if email exists
    existing = supabase.table('customers').select('id').eq('email', data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    customer_id = str(uuid.uuid4())
    api_key = generate_api_key()
    
    customer_data = {
        'id': customer_id,
        'email': data.email,
        'company_name': data.company_name,
        'password_hash': data.password,  # In production, hash this properly
        'api_key': api_key,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = supabase.table('customers').insert(customer_data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create customer")
    
    return CustomerResponse(
        id=customer_id,
        email=data.email,
        company_name=data.company_name,
        api_key=api_key,
        created_at=customer_data['created_at']
    )


@router.post("/login")
async def login_customer(data: CustomerLogin):
    """Login and return session token."""
    result = supabase.table('customers').select('*').eq('email', data.email).execute()
    
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    customer = result.data[0]
    
    # Simple password check (in production, use proper hashing)
    if customer['password_hash'] != data.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "token": customer['id'],
        "customer": {
            "id": customer['id'],
            "email": customer['email'],
            "company_name": customer['company_name'],
            "api_key": customer['api_key']
        }
    }


@router.get("/me", response_model=CustomerResponse)
async def get_current_user(customer: dict = Depends(get_current_customer)):
    """Get current authenticated customer."""
    return CustomerResponse(
        id=customer['id'],
        email=customer['email'],
        company_name=customer['company_name'],
        api_key=customer['api_key'],
        created_at=customer['created_at']
    )


@router.post("/regenerate-api-key", response_model=ApiKeyResponse)
async def regenerate_api_key(customer: dict = Depends(get_current_customer)):
    """Regenerate API key for the current customer."""
    new_api_key = generate_api_key()
    
    supabase.table('customers').update({
        'api_key': new_api_key
    }).eq('id', customer['id']).execute()
    
    return ApiKeyResponse(api_key=new_api_key)
