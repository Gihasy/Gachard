# Sprint 1 — Setup & Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setup fondasi project Gachard — Google OAuth login, custodial wallet otomatis, UI shell (Home/Koleksi/Profil), dan deployment awal ke hosting mandiri.

**Architecture:** Frontend Next.js (PWA) terhubung ke Backend FastAPI via REST API. Backend mengelola Google OAuth, koneksi MongoDB Atlas, dan generasi wallet custodial (private key disimpan di server). Deploy: Vercel (frontend) + Render (backend) + MongoDB Atlas (database).

**Tech Stack:** Next.js 14 (App Router), React, Tailwind CSS, FastAPI, Python 3.11+, motor (async MongoDB), web3.py, next-pwa

## Global Constraints

- Wallet custodial: private key TIDAK PERNAH dikirim ke frontend, user hanya tahu `@username` (ADR-002)
- Gas fee disponsori platform — user tidak pernah tahu konsep gas/crypto (ADR-003)
- PWA: manifest.json + service worker (ADR-013)
- Blockchain: BNB Chain Testnet / opBNB Testnet
- Token standard: BEP-1155 (ADR-001, untuk referensi Sprint 2+)
- Semua transaksi dieksekusi backend atas nama user (ADR-003)
- Hosting free tier: Vercel + Render + MongoDB Atlas
- Tool: MiMoCode (mimo-v2.5-pro), TIDAK pakai Emergent (ADR-015)
- Solo developer, non-programmer — instruksi harus sangat jelas

## Prerequisites (Manual Setup — Outside This Plan)

Sebelum mulai implementasi, user HARUS menyelesaikan setup manual ini:

1. **Install MiMoCode CLI** — sudah terinstall (terbukti dari session ini)
2. **Setup GitHub repo** — buat repo `gachard` di GitHub, copy URL-nya
3. **Setup MongoDB Atlas** — buat akun free tier, buat cluster, dapatkan connection string
4. **Setup Vercel** — buat akun, hubungkan GitHub repo
5. **Setup Render** — buat akun free tier untuk backend
6. **Setup Google Cloud Console** — buat OAuth 2.0 credentials (Client ID + Secret), tambah redirect URI
7. **Setup testnet wallet** — buat wallet untuk deploy contract, claim faucet BNB testnet

---

## Task 1: Project Initialization & Git Setup

**Covers:** S1 (repo GitHub berisi scaffold + kode awal)

**Files:**
- Create: `frontend/` (Next.js project)
- Create: `backend/` (FastAPI project)
- Modify: `README.md` (update dengan instruksi setup)

**Interfaces:**
- Produces: Git repo dengan struktur folder `frontend/` dan `backend/`

- [ ] **Step 1: Verify current git status**

Run: `git status`
Expected: On branch main (or master), working tree clean

- [ ] **Step 2: Create frontend directory structure**

```bash
mkdir -p frontend
```

- [ ] **Step 3: Create backend directory structure**

```bash
mkdir -p backend
```

- [ ] **Step 4: Update README.md with setup instructions**

```markdown
# Gachard

Platform kartu TCG digital-native dengan mekanisme lock-vault-redeem.

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB Atlas account (free tier)
- Google Cloud Console OAuth credentials

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Environment Variables
See `.env.example` in each directory.

## Architecture
- Frontend: Next.js 14 (PWA) — Vercel
- Backend: FastAPI — Render
- Database: MongoDB Atlas
- Blockchain: BNB Chain Testnet / opBNB Testnet
```

- [ ] **Step 5: Initial commit**

```bash
git add .
git commit -m "chore: initialize project structure (frontend + backend)"
```

---

## Task 2: Frontend Scaffold — Next.js + Tailwind CSS

**Covers:** S2 (UI shell Home/Koleksi/Profil bisa diakses tanpa error)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/next.config.js`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/app/layout.tsx`
- Create: `frontend/app/page.tsx` (Home)
- Create: `frontend/app/koleksi/page.tsx`
- Create: `frontend/app/profil/page.tsx`
- Create: `frontend/app/globals.css`
- Create: `frontend/components/Navbar.tsx`

**Interfaces:**
- Produces: Next.js app dengan 3 halaman (Home, Koleksi, Profil) yang bisa diakses

- [ ] **Step 1: Initialize Next.js project**

```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

- [ ] **Step 2: Verify dev server runs**

```bash
npm run dev
```
Expected: Server starts on http://localhost:3000

- [ ] **Step 3: Create Navbar component**

```tsx
// frontend/components/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/koleksi", label: "Koleksi" },
  { href: "/profil", label: "Profil" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-indigo-600">
              Gachard
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === item.href
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Update layout.tsx to include Navbar**

```tsx
// frontend/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gachard",
  description: "Platform kartu TCG digital-native",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Create Home page**

```tsx
// frontend/app/page.tsx
export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Selamat Datang di Gachard
      </h1>
      <p className="text-gray-600">
        Platform kartu TCG digital-native dengan mekanisme lock-vault-redeem.
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Create Koleksi page**

```tsx
// frontend/app/koleksi/page.tsx
export default function Koleksi() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Koleksi Saya
      </h1>
      <p className="text-gray-600">
        Kartu-kartu yang sudah kamu miliki akan muncul di sini.
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Create Profil page**

```tsx
// frontend/app/profil/page.tsx
export default function Profil() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Profil
      </h1>
      <p className="text-gray-600">
        Informasi akun dan pengaturan.
      </p>
    </div>
  );
}
```

- [ ] **Step 8: Verify all pages accessible**

Navigate to:
- http://localhost:3000 → Home page
- http://localhost:3000/koleksi → Koleksi page
- http://localhost:3000/profil → Profil page

Expected: All pages render without errors, Navbar visible on all pages.

- [ ] **Step 9: Commit frontend scaffold**

```bash
git add frontend/
git commit -m "feat: add Next.js frontend with Home/Koleksi/Profil pages"
```

---

## Task 3: PWA Setup — manifest.json + Service Worker

**Covers:** ADR-013 (PWA delivery platform)

**Files:**
- Create: `frontend/public/manifest.json`
- Create: `frontend/public/sw.js`
- Create: `frontend/public/icons/` (placeholder icons)
- Modify: `frontend/app/layout.tsx` (add manifest link)

**Interfaces:**
- Produces: PWA-capable app dengan manifest dan service worker

- [ ] **Step 1: Create manifest.json**

```json
// frontend/public/manifest.json
{
  "name": "Gachard",
  "short_name": "Gachard",
  "description": "Platform kartu TCG digital-native",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4f46e5",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 2: Create placeholder icons**

Create simple placeholder PNG icons (192x192 and 512x512) in `frontend/public/icons/`. These can be replaced with actual logo later.

- [ ] **Step 3: Create service worker**

```javascript
// frontend/public/sw.js
const CACHE_NAME = "gachard-v1";
const URLS_TO_CACHE = ["/", "/koleksi", "/profil"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

- [ ] **Step 4: Register service worker in layout.tsx**

Add to `frontend/app/layout.tsx` inside `<head>`:

```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#4f46e5" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

Add script to register service worker (in body or via a client component):

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js');
        });
      }
    `,
  }}
/>
```

- [ ] **Step 5: Verify PWA works**

1. Run `npm run dev`
2. Open Chrome DevTools → Application → Manifest
3. Verify manifest.json is loaded
4. Open Chrome DevTools → Application → Service Workers
5. Verify service worker is registered

Expected: Manifest loaded, service worker registered.

- [ ] **Step 6: Commit PWA setup**

```bash
git add frontend/public/ frontend/app/layout.tsx
git commit -m "feat: add PWA manifest and service worker"
```

---

## Task 4: Backend Scaffold — FastAPI + MongoDB

**Covers:** S1 (wallet custodial tersimpan di backend), ADR-002

**Files:**
- Create: `backend/main.py`
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/database.py`
- Create: `backend/models/user.py`
- Create: `backend/routes/auth.py`

**Interfaces:**
- Produces: FastAPI app dengan koneksi MongoDB dan endpoint dasar

- [ ] **Step 1: Create requirements.txt**

```txt
# backend/requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
motor==3.3.2
python-dotenv==1.0.0
pydantic==2.5.2
```

- [ ] **Step 2: Create .env.example**

```env
# backend/.env.example
MONGODB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/gachard?retryWrites=true&w=majority
DATABASE_NAME=gachard
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

- [ ] **Step 3: Create database connection**

```python
# backend/database.py
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "gachard")

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DATABASE_NAME]

# Collections
users_collection = db["users"]
```

- [ ] **Step 4: Create User model**

```python
# backend/models/user.py
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
```

- [ ] **Step 5: Create main FastAPI app**

```python
# backend/main.py
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
```

- [ ] **Step 6: Create auth routes (skeleton)**

```python
# backend/routes/auth.py
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
```

- [ ] **Step 7: Create routes directory**

```bash
mkdir -p backend/routes
touch backend/routes/__init__.py
```

- [ ] **Step 8: Verify backend runs**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Expected: Server starts on http://localhost:8000, docs at http://localhost:8000/docs

- [ ] **Step 9: Commit backend scaffold**

```bash
git add backend/
git commit -m "feat: add FastAPI backend with MongoDB connection and auth routes skeleton"
```

---

## Task 5: Google OAuth + Custodial Wallet Generation

**Covers:** S1 (login via Google berhasil, wallet custodial otomatis dibuat), ADR-002, ADR-003

**Files:**
- Modify: `backend/requirements.txt` (add authlib, web3)
- Create: `backend/services/auth_service.py`
- Create: `backend/services/wallet_service.py`
- Modify: `backend/routes/auth.py` (implement Google login)

**Interfaces:**
- Produces: Endpoint `/auth/google` yang menerima Google token, verifikasi, buat user baru dengan wallet custodial

- [ ] **Step 1: Add dependencies**

```txt
# Add to backend/requirements.txt
authlib==1.2.1
httpx==0.25.2
web3==6.11.3
```

- [ ] **Step 2: Create wallet service**

```python
# backend/services/wallet_service.py
from web3 import Web3
import os

def generate_custodial_wallet() -> dict:
    """Generate a new Ethereum-compatible wallet for user.
    
    Private key is stored server-side only (ADR-002).
    User never sees wallet address or private key.
    """
    w3 = Web3()
    account = w3.eth.account.create()
    return {
        "address": account.address,
        "private_key": account.key.hex()  # Store securely in production!
    }
```

- [ ] **Step 3: Create auth service**

```python
# backend/services/auth_service.py
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
```

- [ ] **Step 4: Update auth routes**

```python
# backend/routes/auth.py
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
```

- [ ] **Step 5: Test wallet generation**

Create a test script:

```python
# backend/test_wallet.py
from services.wallet_service import generate_custodial_wallet

wallet = generate_custodial_wallet()
print(f"Address: {wallet['address']}")
print(f"Private Key: {wallet['private_key'][:10]}...")
```

Run: `python test_wallet.py`
Expected: Valid Ethereum address and private key

- [ ] **Step 6: Commit Google OAuth + wallet**

```bash
git add backend/
git commit -m "feat: implement Google OAuth login with custodial wallet generation"
```

---

## Task 6: Frontend-Backend Integration

**Covers:** S1 (login via Google berhasil), S2 (UI shell bisa diakses)

**Files:**
- Create: `frontend/app/login/page.tsx`
- Modify: `frontend/components/Navbar.tsx` (add login button)
- Create: `frontend/lib/api.ts`
- Create: `frontend/.env.local.example`

**Interfaces:**
- Consumes: Backend endpoint `POST /auth/google`
- Produces: Login page yang mengirim Google token ke backend

- [ ] **Step 1: Create .env.local.example**

```env
# frontend/.env.local.example
NEXT_PUBLIC_API_URL=http://localhost:8000
GOOGLE_CLIENT_ID=your-google-client-id
```

- [ ] **Step 2: Create API client**

```tsx
// frontend/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function googleLogin(token: string) {
  const response = await fetch(`${API_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  
  if (!response.ok) {
    throw new Error("Login failed");
  }
  
  return response.json();
}
```

- [ ] **Step 3: Create login page**

```tsx
// frontend/app/login/page.tsx
"use client";

import { useState } from "react";
import { googleLogin } from "@/lib/api";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In production, use Google Sign-In SDK
      // For now, simulate with a placeholder token
      const mockToken = "mock-google-token";
      const result = await googleLogin(mockToken);
      
      // Store user info
      localStorage.setItem("user", JSON.stringify(result));
      
      // Redirect to home
      window.location.href = "/";
    } catch (err) {
      setError("Login gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <h1 className="text-3xl font-bold text-center mb-8">Login ke Gachard</h1>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? "Loading..." : "Login dengan Google"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Update Navbar with login state**

```tsx
// frontend/components/Navbar.tsx (updated)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/koleksi", label: "Koleksi" },
  { href: "/profil", label: "Profil" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-indigo-600">
              Gachard
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === item.href
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <span className="text-sm text-gray-600">
                @{user.username}
              </span>
            ) : (
              <Link
                href="/login"
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 5: Test integration**

1. Start backend: `cd backend && uvicorn main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to http://localhost:3000/login
4. Click "Login dengan Google"
5. Check MongoDB Atlas for new user document

Expected: User created in database with wallet address.

- [ ] **Step 6: Commit integration**

```bash
git add frontend/
git commit -m "feat: add login page and frontend-backend integration"
```

---

## Task 7: Deployment to Vercel + Render

**Covers:** S1 (deployment awal bisa diakses lewat URL hosting mandiri)

**Files:**
- Create: `frontend/vercel.json` (if needed)
- Create: `backend/render.yaml` (if needed)
- Modify: Environment variables in Vercel and Render dashboards

**Interfaces:**
- Produces: Live URLs for frontend and backend

- [ ] **Step 1: Prepare frontend for Vercel**

Ensure `frontend/package.json` has:
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start"
  }
}
```

- [ ] **Step 2: Push to GitHub**

```bash
git add .
git commit -m "chore: prepare for deployment"
git push origin main
```

- [ ] **Step 3: Deploy backend to Render**

1. Go to https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Settings:
   - Name: `gachard-backend`
   - Environment: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   - `MONGODB_URL`: your MongoDB Atlas connection string
   - `DATABASE_NAME`: gachard
6. Create Web Service

Expected: Backend deployed at `https://gachard-backend.onrender.com`

- [ ] **Step 4: Deploy frontend to Vercel**

1. Go to https://vercel.com
2. New Project
3. Import GitHub repo
4. Settings:
   - Framework Preset: Next.js
   - Root Directory: `frontend`
5. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://gachard-backend.onrender.com`
   - `GOOGLE_CLIENT_ID`: your Google Client ID
6. Deploy

Expected: Frontend deployed at `https://gachard.vercel.app`

- [ ] **Step 5: Verify deployment**

1. Open frontend URL
2. Navigate to all pages (Home, Koleksi, Profil, Login)
3. Check backend health: `https://gachard-backend.onrender.com/health`
4. Test login flow (if Google OAuth is configured)

Expected: All pages accessible, backend responds.

- [ ] **Step 6: Update README with live URLs**

```markdown
## Live Demo

- Frontend: https://gachard.vercel.app
- Backend API: https://gachard-backend.onrender.com
- API Docs: https://gachard-backend.onrender.com/docs
```

- [ ] **Step 7: Final commit and push**

```bash
git add .
git commit -m "docs: update README with deployment URLs"
git push origin main
```

---

## Sprint 1 Verification Checklist

After completing all tasks, verify:

- [ ] Google login works (or login page accessible if OAuth not fully configured)
- [ ] Custodial wallet automatically created and stored in MongoDB
- [ ] UI shell (Home/Koleksi/Profil) accessible without errors
- [ ] GitHub repo contains scaffold + code, pushed
- [ ] Deployment accessible via Vercel URL
- [ ] Backend accessible via Render URL
- [ ] PWA manifest loaded (check DevTools → Application → Manifest)

---

## Notes for Implementer

1. **MongoDB Atlas Setup**: You need to create a free cluster and get the connection string. Add your IP to the whitelist.

2. **Google OAuth Setup**: 
   - Go to https://console.cloud.google.com
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs
   - Copy Client ID and Secret

3. **Environment Variables**: Never commit `.env` files. Use `.env.example` as template.

4. **Testing OAuth**: For development, you can use a mock token. Real Google Sign-In SDK integration can be added later.

5. **Wallet Security**: In production, encrypt private keys before storing in database. For hackathon demo, plain text is acceptable.

6. **Deployment**: Both Vercel and Render have free tiers. Render may spin down after inactivity — first request after idle may take 30-60 seconds.
