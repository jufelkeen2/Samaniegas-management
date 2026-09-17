import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, toNumber } from "@/lib/api";
import { monthRange, parseDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { start, end } = monthRange(request.nextUrl.searchParams.get("month") ?? undefined);
  const status = request.nextUrl.searchParams.get("status") ?? "ALL";
  const payments = await prisma.payment.findMany({ where: { dueDate: { gte: start, lt: end }, ...(status === "PAID" || status === "PENDING" ? { status } : {}) }, include: { client: { select: { id: true, name: true, phone: true } } }, orderBy: [{ status: "asc" }, { dueDate: "asc" }] });
  const balances = await prisma.payment.groupBy({ by: ["clientId"], where: { status: "PENDING" }, _sum: { amount: true } });
  const balanceMap = new Map(balances.map((item) => [item.clientId, Number(item._sum.amount ?? 0)]));
  return NextResponse.json(payments.map((payment) => ({ ...payment, amount: Number(payment.amount), dueDate: payment.dueDate.toISOString().slice(0, 10), paymentDate: payment.paymentDate?.toISOString().slice(0, 10) ?? null, clientBalance: balanceMap.get(payment.clientId) ?? 0 })));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const amount = toNumber(body.amount);
  const dueDate = parseDate(body.dueDate);
  if (!body.clientId || !(amount > 0) || !dueDate) return badRequest("Cliente, monto y fecha de vencimiento son obligatorios.");
  const status = body.status === "PAID" ? "PAID" : "PENDING";
  const payment = await prisma.payment.create({ data: { clientId: body.clientId, amount, dueDate, status, paymentDate: status === "PAID" ? parseDate(body.paymentDate) ?? new Date() : null, notes: body.notes?.trim() ?? "" } });
  return NextResponse.json(payment, { status: 201 });
}
