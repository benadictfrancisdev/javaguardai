from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
import secrets
from datetime import datetime, timezone
from core.database import supabase
from core.auth import get_current_customer

router = APIRouter(prefix="/auth", tags=["auth"])


class CustomerRegister(BaseModel):
    email: EmailStr
    password: str
    company_name: str


class CustomerLogin(BaseModel):
    email: EmailStr
    password: str


class CustomerResponse(BaseModel):
    id: str
    email: str
    company_name: Optional[str] = None
    api_key: str
    created_at: str


class LoginResponse(BaseModel):
    token: str
    customer: CustomerResponse


def generate_api_key() -> str:
    """Generate a secure API key."""
    return f"fg_{secrets.token_hex(24)}"


@router.post("/register", response_model=LoginResponse)
async def register_customer(data: CustomerRegister):
    """
    Register a new customer.
    Creates entry in customers table and returns JWT-like token.
    """
    # Check if email exists
    existing = supabase.table('customers').select('id').eq('email', data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    customer_id = str(uuid.uuid4())
    api_key = generate_api_key()
    created_at = datetime.now(timezone.utc).isoformat()
    
    customer_data = {
        'id': customer_id,
        'email': data.email,
        'company_name': data.company_name,
        'password_hash': data.password,  # In production, hash with bcrypt
        'api_key': api_key,
        'created_at': created_at
    }
    
    result = supabase.table('customers').insert(customer_data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create customer")
    
    return LoginResponse(
        token=customer_id,
        customer=CustomerResponse(
            id=customer_id,
            email=data.email,
            company_name=data.company_name,
            api_key=api_key,
            created_at=created_at
        )
    )


@router.post("/login", response_model=LoginResponse)
async def login_customer(data: CustomerLogin):
    """
    Login customer with email and password.
    Returns token (customer ID) for subsequent requests.
    """
    result = supabase.table('customers').select('*').eq('email', data.email).execute()
    
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    customer = result.data[0]
    
    # Simple password check (in production, use bcrypt.verify)
    if customer.get('password_hash') != data.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return LoginResponse(
        token=customer['id'],
        customer=CustomerResponse(
            id=customer['id'],
            email=customer['email'],
            company_name=customer.get('company_name'),
            api_key=customer['api_key'],
            created_at=customer['created_at']
        )
    )


@router.get("/me", response_model=CustomerResponse)
async def get_current_user(customer: dict = Depends(get_current_customer)):
    """Get current authenticated customer profile."""
    return CustomerResponse(
        id=customer['id'],
        email=customer['email'],
        company_name=customer.get('company_name'),
        api_key=customer['api_key'],
        created_at=customer['created_at']
    )


@router.post("/regenerate-api-key")
async def regenerate_api_key(customer: dict = Depends(get_current_customer)):
    """Regenerate API key for the current customer."""
    new_api_key = generate_api_key()
    
    supabase.table('customers').update({
        'api_key': new_api_key
    }).eq('id', customer['id']).execute()
    
    return {"api_key": new_api_key}
