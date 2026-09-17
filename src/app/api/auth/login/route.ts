import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { badRequest } from "@/lib/api";
import { createSessionToken, SESSION_COOKIE, SESSION_DURATION_SECONDS } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  if (!username || !password) return badRequest("Ingresa tu usuario y contraseña.");

  const configuredUsername = process.env.AUTH_USERNAME;
  const passwordHash = process.env.AUTH_PASSWORD_HASH;
  if (!configuredUsername || !passwordHash) return badRequest("La autenticación no está configurada.", 503);

  const passwordMatches = await bcrypt.compare(password, passwordHash);
  if (username !== configuredUsername || !passwordMatches) return badRequest("Usuario o contraseña incorrectos.", 401);

  const response = NextResponse.json({ ok: true });
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  response.cookies.set(SESSION_COOKIE, await createSessionToken(configuredUsername), {
    httpOnly: true,
    secure: forwardedProtocol === "https" || request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
