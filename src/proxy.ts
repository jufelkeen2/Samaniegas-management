import { NextRequest, NextResponse } from "next/server";
import { hasValidSession, SESSION_COOKIE } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/login";
  const isAuthApi = pathname.startsWith("/api/auth/");
  if (isAuthApi) return NextResponse.next();

  const authenticated = await hasValidSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (isLogin) return authenticated ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  if (authenticated) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|icon-192.png|icon-512.png|logo.png).*)"],
};
