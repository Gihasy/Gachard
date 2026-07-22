import { getCollection } from "./mongodb";
import { generateCustodialWallet } from "./wallet";
import { encrypt } from "./crypto";

interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
}

/**
 * Verify Google OAuth token and return user info.
 * Calls Google's userinfo endpoint with the Bearer token.
 */
export async function verifyGoogleToken(token: string): Promise<GoogleUserInfo> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error("Invalid Google token");
  }

  return response.json();
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
