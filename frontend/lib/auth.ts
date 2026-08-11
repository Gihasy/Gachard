import { getCollection, parseObjectId } from "./mongodb";
import { generateCustodialWallet } from "./wallet";
import { encrypt } from "./crypto";
import { OAuth2Client } from "google-auth-library";

interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verify Google OAuth ID token using google-auth-library.
 * Performs full cryptographic signature verification against Google's public keys.
 */
export async function verifyGoogleToken(token: string): Promise<GoogleUserInfo> {
  const ticket = await googleClient.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
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

/**
 * Emergent-managed Google auth: get existing user by email or create a new one
 * with a custodial wallet. Keyed on email so a returning user (from any Google
 * login path) is reused rather than duplicated.
 */
export async function getOrCreateUserByEmail(info: {
  email: string;
  name?: string;
  picture?: string;
  emergentId?: string;
}) {
  const usersCollection = await getCollection("users");

  const existing = await usersCollection.findOne({ email: info.email });
  if (existing) {
    const update: Record<string, unknown> = {};
    if (info.picture && existing.picture !== info.picture) update.picture = info.picture;
    if (info.name && !existing.name) update.name = info.name;
    if (info.emergentId && !existing.emergentId) update.emergentId = info.emergentId;
    if (Object.keys(update).length > 0) {
      await usersCollection.updateOne({ _id: existing._id }, { $set: update });
    }
    return existing;
  }

  const wallet = generateCustodialWallet();
  const username = info.email.split("@")[0];

  const userData = {
    email: info.email,
    username,
    name: info.name || null,
    picture: info.picture || null,
    emergentId: info.emergentId || null,
    googleId: info.emergentId ? `emergent-${info.emergentId}` : null,
    walletAddress: wallet.address,
    walletPrivateKey: encrypt(wallet.privateKey),
    createdAt: new Date().toISOString(),
  };

  const result = await usersCollection.insertOne(userData);
  return { ...userData, _id: result.insertedId };
}

/**
 * Persist a session token (from Emergent auth) with a 7-day expiry.
 */
export async function createSession(userId: string, sessionToken: string, expiresAt: Date) {
  const sessions = await getCollection("user_sessions");
  await sessions.insertOne({
    user_id: userId,
    session_token: sessionToken,
    expires_at: expiresAt,
    created_at: new Date(),
  });
}

/**
 * Resolve the user for a given session token, honoring expiry.
 */
export async function getUserBySessionToken(token: string) {
  const sessions = await getCollection("user_sessions");
  const session = await sessions.findOne({ session_token: token });
  if (!session) return null;

  let expiresAt = session.expires_at as Date | string | undefined;
  if (typeof expiresAt === "string") expiresAt = new Date(expiresAt);
  if (expiresAt instanceof Date && expiresAt.getTime() < Date.now()) return null;

  const usersCollection = await getCollection("users");
  try {
    return await usersCollection.findOne({ _id: parseObjectId(session.user_id) });
  } catch {
    return null;
  }
}

/**
 * Delete a session (logout).
 */
export async function deleteSession(token: string) {
  const sessions = await getCollection("user_sessions");
  await sessions.deleteOne({ session_token: token });
}
