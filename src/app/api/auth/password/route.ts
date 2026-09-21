import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { badRequest } from "@/lib/api";
import { createSessionToken, hasValidSession, SESSION_COOKIE, SESSION_DURATION_SECONDS } from "@/lib/auth";
import { getCredential } from "@/lib/credentials";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  // This route lives under /api/auth, which bypasses proxy authentication.
  // Always authorize here and reject cross-origin browser submissions.
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return badRequest("Solicitud no permitida.", 403);
  }
  if (!await hasValidSession(request.cookies.get(SESSION_COOKIE)?.value)) {
    return badRequest("Tu sesión expiró. Vuelve a iniciar sesión.", 401);
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.currentPassword !== "string" || typeof body.newPassword !== "string" || typeof body.confirmPassword !== "string") {
    return badRequest("Completa los tres campos de contraseña.");
  }
  const { currentPassword, newPassword, confirmPassword } = body;
  if (!currentPassword || currentPassword.length > 1024) return badRequest("Contraseña actual incorrecta.", 403);
  if (newPassword.length < 12 || new TextEncoder().encode(newPassword).length > 72) {
    return badRequest("Usa al menos 12 caracteres y un máximo de 72 bytes. Los acentos y emojis pueden ocupar más de un byte.");
  }
  if (newPassword !== confirmPassword) return badRequest("Las contraseñas nuevas no coinciden.");

  try {
    const credential = await getCredential();
    if (!await bcrypt.compare(currentPassword, credential.passwordHash)) return badRequest("Contraseña actual incorrecta.", 403);
    if (await bcrypt.compare(newPassword, credential.passwordHash)) return badRequest("Elige una contraseña diferente de la actual.");
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const sessionVersion = credential.sessionVersion + 1;
    // Prepare the replacement session before changing the stored credential.
    const token = await createSessionToken(credential.username, sessionVersion);
    if (credential.persisted) {
      const updated = await prisma.applicationCredential.updateMany({
        where: { username: credential.username, sessionVersion: credential.sessionVersion },
        data: { passwordHash, sessionVersion },
      });
      if (updated.count !== 1) return badRequest("La contraseña cambió en otra sesión. Vuelve a iniciar sesión.", 409);
    } else {
      // Unique username prevents two simultaneous bootstrap changes from winning.
      await prisma.applicationCredential.create({ data: { username: credential.username, passwordHash, sessionVersion } });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: request.headers.get("x-forwarded-proto") === "https" || request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return badRequest("La contraseña cambió en otra sesión. Vuelve a iniciar sesión.", 409);
    }
    return badRequest("No se pudo cambiar la contraseña. Intenta nuevamente.", 503);
  }
}
