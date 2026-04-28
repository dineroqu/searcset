"""
Auth Routes — JWT authentication untuk UI
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from jose import jwt
from pydantic import BaseModel
from config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Password default — user bisa ubah di settings
DEFAULT_PASSWORD = "polybot2024"


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Login dan dapatkan JWT token"""
    if request.password != DEFAULT_PASSWORD:
        raise HTTPException(status_code=401, detail="Password salah")

    token = jwt.encode(
        {
            "sub": "admin",
            "exp": datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRY_HOURS),
        },
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )

    return TokenResponse(access_token=token)


@router.get("/verify")
async def verify_token():
    """Verifikasi token masih valid"""
    return {"valid": True}
