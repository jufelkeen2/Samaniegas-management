import { before, beforeEach, after, test, mock } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server.js";

// No production database or credentials are used by these tests.
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.AUTH_USERNAME = "test-admin";
process.env.SESSION_SECRET = "test-only-session-secret-at-least-32-characters";
const oldPassword = "Original-test-password-123";
const newPassword = "Replacement-test-password-456";
let prisma, auth, change, login, stored, oldToken;

before(async () => {
  process.env.AUTH_PASSWORD_HASH = await bcrypt.hash(oldPassword, 4);
  globalThis.prisma = {
    applicationCredential: {
      findUnique: async () => null,
      create: async () => null,
      updateMany: async () => ({ count: 0 }),
    },
    $disconnect: async () => {},
  };
  ({ prisma } = await import("../src/lib/prisma.ts"));
  auth = await import("../src/lib/auth.ts");
  ({ POST: change } = await import("../src/app/api/auth/password/route.ts"));
  ({ POST: login } = await import("../src/app/api/auth/login/route.ts"));
});

beforeEach(async () => {
  mock.restoreAll(); stored = null;
  mock.method(prisma.applicationCredential, "findUnique", async () => stored && { ...stored });
  mock.method(prisma.applicationCredential, "create", async ({ data }) => {
    if (stored) throw Object.assign(new Error("duplicate"), { code: "P2002" });
    stored = { ...data, updatedAt: new Date() }; return stored;
  });
  mock.method(prisma.applicationCredential, "updateMany", async ({ where, data }) => {
    if (!stored || stored.sessionVersion !== where.sessionVersion) return { count: 0 };
    stored = { ...stored, ...data }; return { count: 1 };
  });
  oldToken = await auth.createSessionToken("test-admin");
});

after(async () => { mock.restoreAll(); await prisma.$disconnect(); });

function request(body = {}, token = oldToken, origin = "https://app.example") {
  return new NextRequest("https://app.example/api/auth/password", {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...(token ? { cookie: `${auth.SESSION_COOKIE}=${token}` } : {}) },
    body: JSON.stringify({ currentPassword: oldPassword, newPassword, confirmPassword: newPassword, ...body }),
  });
}

async function signIn(password) {
  return login(new NextRequest("https://app.example/api/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "test-admin", password }),
  }));
}

test("rejects unauthenticated and cross-origin password changes", async () => {
  assert.equal((await change(request({}, ""))).status, 401);
  assert.equal((await change(request({}, oldToken, "https://attacker.example"))).status, 403);
  assert.equal(stored, null);
});

test("requires the current password, matching confirmation, and a strong new password", async () => {
  assert.equal((await change(request({ currentPassword: "wrong" }))).status, 403);
  assert.equal((await change(request({ confirmPassword: "different-password" }))).status, 400);
  assert.equal((await change(request({ newPassword: "short", confirmPassword: "short" }))).status, 400);
  assert.equal((await change(request({ newPassword: "é".repeat(40), confirmPassword: "é".repeat(40) }))).status, 400);
  assert.equal((await change(request({ newPassword: oldPassword, confirmPassword: oldPassword }))).status, 400);
  assert.equal(stored, null);
});

test("stores only bcrypt, replaces login password, and revokes previous sessions", async () => {
  assert.equal((await signIn(oldPassword)).status, 200);
  assert.equal(await auth.hasValidSession(oldToken), true);
  const response = await change(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.notEqual(stored.passwordHash, newPassword);
  assert.equal(await bcrypt.compare(newPassword, stored.passwordHash), true);
  assert.equal(await auth.hasValidSession(oldToken), false);
  assert.equal((await signIn(oldPassword)).status, 401);
  assert.equal((await signIn(newPassword)).status, 200);
  const cookie = response.cookies.get(auth.SESSION_COOKIE);
  assert.equal(await auth.hasValidSession(cookie.value), true);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(response.headers.get("set-cookie"), /Secure/i);
  assert.match(response.headers.get("set-cookie"), /SameSite=lax/i);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("subsequent changes persist and do not fall back to environment password", async () => {
  const first = await change(request());
  const token = first.cookies.get(auth.SESSION_COOKIE).value;
  const secondPassword = "Another-new-password-789";
  const second = await change(request({ currentPassword: newPassword, newPassword: secondPassword, confirmPassword: secondPassword }, token));
  assert.equal(second.status, 200);
  assert.equal(stored.sessionVersion, 2);
  assert.equal(await auth.hasValidSession(token), false);
  assert.equal((await signIn(oldPassword)).status, 401);
  assert.equal((await signIn(newPassword)).status, 401);
  assert.equal((await signIn(secondPassword)).status, 200);
});

test("rejects a concurrent password update without overwriting it", async () => {
  const first = await change(request());
  const token = first.cookies.get(auth.SESSION_COOKIE).value;
  const previousHash = stored.passwordHash;
  mock.method(prisma.applicationCredential, "updateMany", async () => ({ count: 0 }));
  const response = await change(request({ currentPassword: newPassword, newPassword: "Concurrent-password-789", confirmPassword: "Concurrent-password-789" }, token));
  assert.equal(response.status, 409);
  assert.equal(stored.passwordHash, previousHash);
});

test("database failure fails closed and login responds with JSON", async () => {
  mock.method(prisma.applicationCredential, "findUnique", async () => { throw new Error("private database detail"); });
  assert.equal(await auth.hasValidSession(oldToken), false);
  const response = await signIn(oldPassword);
  assert.equal(response.status, 503);
  assert.doesNotMatch(JSON.stringify(await response.json()), /private database detail/);
});
