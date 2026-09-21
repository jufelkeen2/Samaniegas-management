import { jwtVerify, SignJWT } from "jose";
import { getCredential } from "@/lib/credentials";

export const SESSION_COOKIE = "samaniegas_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 12;

function sessionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET debe contener al menos 32 caracteres");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(username: string, sessionVersion = 0) {
  return new SignJWT({ username, sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(sessionKey());
}

export async function hasValidSession(token?: string) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || payload.sub !== process.env.AUTH_USERNAME) return false;
    const credential = await getCredential();
    // Tokens issued before password changes were introduced belong to version zero.
    return (payload.sessionVersion ?? 0) === credential.sessionVersion;
  } catch {
    return false;
  }
}
