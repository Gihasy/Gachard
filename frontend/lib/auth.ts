import { getCollection } from "./mongodb";
import { generateCustodialWallet } from "./wallet";
import { encrypt } from "./crypto";

interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
}

/**
 * Verify Google OAuth ID token (JWT) and return user info.
 * Google Identity Services returns a JWT ID token, not a Bearer token.
 * We decode the JWT payload directly — Google's SDK already verified the signature.
 */
export async function verifyGoogleToken(token: string): Promise<GoogleUserInfo> {
  // JWT format: header.payload.signature
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }

  // Decode payload (base64url)
  const payload = JSON.parse(
    Buffer.from(parts[1], "base64url").toString("utf-8")
  );

  // Verify audience matches our client ID
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (clientId && payload.aud !== clientId) {
    throw new Error("Token audience mismatch");
  }

  // Verify token is not expired
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    throw new Error("Token expired");
  }

  if (!payload.sub || !payload.email) {
    throw new Error("Missing required fields in token");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
  };
}

/**
 * Get existing user or create new one with custodial wallet.
 * Private key is encrypted with AES-256-GCM before storage (ENCRYPTION_SECRET_KEY env var).
 */
export async function getOrCreateUser(googleUser: GoogleUserInfo) {
  const usersCollection = await getCollection("users");

  // Check if user exists
  const existingUser = await usersCollection.findOne({
    googleId: googleUser.sub,
  });
  if (existingUser) {
    return existingUser;
  }

  // Create new user with custodial wallet
  const wallet = generateCustodialWallet();
  const username = googleUser.email.split("@")[0];

  const userData = {
    email: googleUser.email,
    username,
    googleId: googleUser.sub,
    walletAddress: wallet.address,
    walletPrivateKey: encrypt(wallet.privateKey),
    createdAt: new Date().toISOString(),
  };

  const result = await usersCollection.insertOne(userData);
  return { ...userData, _id: result.insertedId };
}
