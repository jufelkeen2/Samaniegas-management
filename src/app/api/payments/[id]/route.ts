import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, toNumber } from "@/lib/api";
import { parseDate } from "@/lib/dates";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const status = body.status === "PAID" ? "PAID" : body.status === "PENDING" ? "PENDING" : undefined;
  const amount = body.amount !== undefined ? toNumber(body.amount) : undefined;
  if (amount !== undefined && !(amount > 0)) return badRequest("El monto debe ser mayor que cero.");
  const payment = await prisma.payment.update({ where: { id }, data: { ...(body.clientId ? { clientId: body.clientId } : {}), ...(amount ? { amount } : {}), ...(body.dueDate ? { dueDate: parseDate(body.dueDate)! } : {}), ...(status ? { status, paymentDate: status === "PAID" ? parseDate(body.paymentDate) ?? new Date() : null } : {}), ...(body.notes !== undefined ? { notes: body.notes.trim() } : {}) } });
  return NextResponse.json(payment);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.payment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
