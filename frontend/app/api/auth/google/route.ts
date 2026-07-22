import { NextResponse } from "next/server";

// Simple in-memory storage for demo (replace with database in production)
const users: Map<string, any> = new Map();

// Generate custodial wallet (simplified for demo)
function generateWallet() {
  // In production, use web3.py or similar
  // For demo, generate a random address
  const address = "0x" + Array.from({ length: 40 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  
  const privateKey = Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  
  return { address, privateKey };
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    
    // In production, verify token with Google API
    // For demo, simulate successful verification
    const mockGoogleUser = {
      sub: "mock-google-id-" + Date.now(),
      email: "demo@gachard.com",
      name: "Demo User"
    };
    
    // Check if user exists
    let user = users.get(mockGoogleUser.sub);
    
    if (!user) {
      // Create new user with custodial wallet
      const wallet = generateWallet();
      user = {
        id: mockGoogleUser.sub,
        email: mockGoogleUser.email,
        username: mockGoogleUser.email.split("@")[0],
        googleId: mockGoogleUser.sub,
        walletAddress: wallet.address,
        createdAt: new Date().toISOString()
      };
      users.set(mockGoogleUser.sub, user);
    }
    
    return NextResponse.json({
      user_id: user.id,
      username: user.username,
      wallet_address: user.walletAddress
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Login failed" },
      { status: 400 }
    );
  }
}
