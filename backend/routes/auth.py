from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.auth_service import verify_google_token, get_or_create_user

router = APIRouter()

class GoogleLoginRequest(BaseModel):
    token: str

class LoginResponse(BaseModel):
    user_id: str
    username: str
    wallet_address: str

@router.post("/google", response_model=LoginResponse)
async def google_login(request: GoogleLoginRequest):
    try:
        # Verify Google token
        google_user = await verify_google_token(request.token)
        
        # Get or create user with custodial wallet
        user = await get_or_create_user(google_user)
        
        return LoginResponse(
            user_id=str(user["_id"]),
            username=user["username"],
            wallet_address=user["wallet_address"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me")
async def get_current_user():
    # TODO: Implement session/token verification
    raise HTTPException(status_code=501, detail="Not implemented yet")
