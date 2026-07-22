from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class GoogleLoginRequest(BaseModel):
    token: str

class LoginResponse(BaseModel):
    user_id: str
    username: str
    wallet_address: str

@router.post("/google", response_model=LoginResponse)
async def google_login(request: GoogleLoginRequest):
    # TODO: Verify Google token, create/get user, generate wallet
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.get("/me")
async def get_current_user():
    # TODO: Get current user from session/token
    raise HTTPException(status_code=501, detail="Not implemented yet")
