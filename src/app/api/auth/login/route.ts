import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { badRequest } from "@/lib/api";
import { createSessionToken, SESSION_COOKIE, SESSION_DURATION_SECONDS } from "@/lib/auth";
import { getCredential } from "@/lib/credentials";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    if (!username || !password) return badRequest("Ingresa tu usuario y contraseña.");

    if (password.length > 1024) return badRequest("Usuario o contraseña incorrectos.", 401);
    const credential = await getCredential();
    const configuredUsername = credential.username;
    const passwordHash = credential.passwordHash;

    const passwordMatches = await bcrypt.compare(password, passwordHash);
    if (username !== configuredUsername || !passwordMatches) return badRequest("Usuario o contraseña incorrectos.", 401);

    const response = NextResponse.json({ ok: true });
    const forwardedProtocol = request.headers.get("x-forwarded-proto");
    response.cookies.set(SESSION_COOKIE, await createSessionToken(configuredUsername, credential.sessionVersion), {
      httpOnly: true,
      secure: forwardedProtocol === "https" || request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return badRequest("No se pudo iniciar sesión. Comprueba la configuración y la conexión de la aplicación.", 503);
  }
}
