import { before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";

process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
let GET, PATCH, query, records;
before(async () => {
  globalThis.prisma = { payment: {
    findMany: async ({ where }) => {
      query = where;
      return records.filter(p => (!where.clientId || p.clientId === where.clientId) && (!where.status || p.status === where.status) && (!where.dueDate || (p.dueDate >= where.dueDate.gte && p.dueDate < where.dueDate.lt)));
    },
    groupBy: async () => [{ clientId: "a", _sum: { amount: records.filter(p => p.clientId === "a" && p.status === "PENDING").reduce((sum,p) => sum + p.amount, 0) } }],
    update: async ({where, data}) => { const p = records.find(p => p.id === where.id); Object.assign(p, data); return p; },
  }};
  ({ GET } = await import("../src/app/api/payments/route.ts"));
  ({ PATCH } = await import("../src/app/api/payments/[id]/route.ts"));
});
beforeEach(() => {
  records = [
    { id: "old", clientId: "a", amount: 100, dueDate: new Date("2025-01-15"), paymentDate: null, status: "PENDING" },
    { id: "current", clientId: "a", amount: 200, dueDate: new Date("2026-11-15"), paymentDate: null, status: "PENDING" },
    { id: "other", clientId: "b", amount: 300, dueDate: new Date("2026-11-15"), paymentDate: null, status: "PENDING" },
  ];
});
test("client history includes old debts and excludes other clients", async () => {
  const result = await GET(new NextRequest("https://app.test/api/payments?clientId=a&history=all"));
  const data = await result.json();
  assert.deepEqual(data.map(p => p.id), ["old", "current"]);
  assert.equal(data[0].clientBalance, 300);
  assert.equal(query.dueDate, undefined);
});
test("monthly filtering remains scoped to the client", async () => {
  const result = await GET(new NextRequest("https://app.test/api/payments?clientId=a&month=2026-11&status=PENDING"));
  assert.deepEqual((await result.json()).map(p => p.id), ["current"]);
});
test("all-history flag without a client keeps the monthly scope", async () => {
  await GET(new NextRequest("https://app.test/api/payments?history=all&month=2026-11"));
  assert.ok(query.dueDate);
});
test("confirming an existing charge updates the balance without inserting another payment", async () => {
  const response = await PATCH(new NextRequest("https://app.test/api/payments/old", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "PAID", paymentDate: "2026-11-09" }) }), {params: Promise.resolve({ id: "old" })});
  assert.equal(response.status, 200);
  assert.equal(records.length, 3);
  const result = await GET(new NextRequest("https://app.test/api/payments?clientId=a&history=all"));
  const data = await result.json();
  assert.equal(data[0].status, "PAID");
  assert.equal(data[0].paymentDate, "2026-11-09");
  assert.equal(data[0].clientBalance, 200);
  assert.equal(records[2].status, "PENDING");
});
