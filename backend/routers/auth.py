from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
import secrets
import bcrypt
from datetime import datetime, timezone
from core.database import supabase
from core.auth import get_current_customer
import logging

logger = logging.getLogger(__name__)

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
    return f"fg_{secrets.token_hex(24)}"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        # Fallback for plain-text passwords (legacy)
        return password == hashed


@router.post("/register", response_model=LoginResponse)
async def register_customer(data: CustomerRegister):
    try:
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
            'password_hash': hash_password(data.password),
            'api_key': api_key,
            'created_at': created_at
        }

        result = supabase.table('customers').insert(customer_data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create account. Please try again.")

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

    except HTTPException:
        raise
    except RuntimeError as e:
        logger.error(f"Database not configured: {e}")
        raise HTTPException(status_code=503, detail="Database not configured. Contact support.")
    except Exception as e:
        logger.error(f"Register error: {e}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/login", response_model=LoginResponse)
async def login_customer(data: CustomerLogin):
    try:
        result = supabase.table('customers').select('*').eq('email', data.email).execute()

        if not result.data:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        customer = result.data[0]

        if not verify_password(data.password, customer.get('password_hash', '')):
            raise HTTPException(status_code=401, detail="Invalid email or password")

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

    except HTTPException:
        raise
    except RuntimeError as e:
        logger.error(f"Database not configured: {e}")
        raise HTTPException(status_code=503, detail="Database not configured. Contact support.")
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@router.get("/me", response_model=CustomerResponse)
async def get_current_user(customer: dict = Depends(get_current_customer)):
    return CustomerResponse(
        id=customer['id'],
        email=customer['email'],
        company_name=customer.get('company_name'),
        api_key=customer['api_key'],
        created_at=customer['created_at']
    )


@router.post("/regenerate-api-key")
async def regenerate_api_key(customer: dict = Depends(get_current_customer)):
    new_api_key = generate_api_key()
    supabase.table('customers').update({'api_key': new_api_key}).eq('id', customer['id']).execute()
    return {"api_key": new_api_key}
