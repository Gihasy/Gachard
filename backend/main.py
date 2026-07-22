from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Gachard API", version="0.1.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])

@app.get("/")
async def root():
    return {"message": "Gachard API is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}
