import { prisma } from "@/lib/prisma";

// Environment credentials bootstrap the account only until its first password change.
// A stored password always takes precedence, including after a redeployment.
export async function getCredential() {
  const username = process.env.AUTH_USERNAME;
  if (!username) throw new Error("AUTH_USERNAME no está configurado");
  const stored = await prisma.applicationCredential.findUnique({ where: { username } });
  if (stored) return { ...stored, persisted: true };
  const passwordHash = process.env.AUTH_PASSWORD_HASH;
  if (!passwordHash) throw new Error("AUTH_PASSWORD_HASH no está configurado");
  return { username, passwordHash, sessionVersion: 0, persisted: false };
}
