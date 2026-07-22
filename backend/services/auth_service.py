import httpx
from .wallet_service import generate_custodial_wallet
from database import users_collection
from models.user import User
from datetime import datetime

async def verify_google_token(token: str) -> dict:
    """Verify Google OAuth token and return user info."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code != 200:
            raise Exception("Invalid Google token")
        return response.json()

async def get_or_create_user(google_user: dict) -> dict:
    """Get existing user or create new one with custodial wallet."""
    google_id = google_user["sub"]
    email = google_user["email"]
    
    # Check if user exists
    existing_user = await users_collection.find_one({"google_id": google_id})
    if existing_user:
        return existing_user
    
    # Create new user with custodial wallet
    wallet = generate_custodial_wallet()
    
    # Generate username from email
    username = email.split("@")[0]
    
    user_data = {
        "email": email,
        "username": username,
        "google_id": google_id,
        "wallet_address": wallet["address"],
        "wallet_private_key": wallet["private_key"],  # Encrypted in production!
        "created_at": datetime.now()
    }
    
    result = await users_collection.insert_one(user_data)
    user_data["_id"] = result.inserted_id
    
    return user_data
