from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class User(BaseModel):
    email: EmailStr
    username: str
    google_id: str
    wallet_address: str
    created_at: datetime = datetime.now()

class UserInDB(User):
    id: Optional[str] = None
