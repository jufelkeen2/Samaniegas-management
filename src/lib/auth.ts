import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "samaniegas_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 12;

function sessionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET debe contener al menos 32 caracteres");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(username: string) {
  return new SignJWT({ username })
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
    return typeof payload.sub === "string" && payload.sub === process.env.AUTH_USERNAME;
  } catch {
    return false;
  }
}
